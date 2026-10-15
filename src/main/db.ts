// src/main/db.ts — Acceso a SQLite solo desde el proceso principal (sección 7.2).
// Esquema: day_entries, month_status, audit_log, settings.

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database.Database | null = null;

/** Ruta de la base de datos en la carpeta de datos del usuario */
export function getDbPath(): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'trimestre.db');
}

/** Inicializa la base de datos con esquema WAL y migraciones */
export function initDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrar(db);

  return db;
}

/** Crea las tablas si no existen y aplica migraciones */
function migrar(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS day_entries (
      date TEXT PRIMARY KEY,
      income_cents INTEGER,
      bizum INTEGER,
      expense_cents INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS month_status (
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      closed_at TEXT,
      expenses_complete INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year, month)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT NOT NULL DEFAULT '',
      backup_folder TEXT,
      schema_version INTEGER NOT NULL DEFAULT 1
    );

    INSERT OR IGNORE INTO settings (id, business_name, backup_folder, schema_version)
    VALUES (1, '', NULL, 1);
  `);
}

/** Obtiene la instancia de la base de datos (inicializa si es necesario) */
export function getDb(): Database.Database {
  if (!db) return initDb();
  return db;
}

/** Cierra la base de seguridad */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones de acceso a datos
// ─────────────────────────────────────────────────────────────────────────────

/** Guarda o actualiza un registro diario */
export function saveDayEntry(
  date: string,
  income_cents: number | null,
  bizum: boolean | null,
  expense_cents: number | null
): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO day_entries (date, income_cents, bizum, expense_cents, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET
      income_cents = excluded.income_cents,
      bizum = excluded.bizum,
      expense_cents = excluded.expense_cents,
      updated_at = datetime('now')
  `);
  stmt.run(date, income_cents, bizum === null ? null : bizum ? 1 : 0, expense_cents);
}

/** Lee un registro diario por fecha */
export function getDayEntry(date: string): {
  date: string;
  income_cents: number | null;
  bizum: boolean | null;
  expense_cents: number | null;
} | null {
  const database = getDb();
  const row = database
    .prepare('SELECT date, income_cents, bizum, expense_cents FROM day_entries WHERE date = ?')
    .get(date) as any;

  if (!row) return null;

  return {
    date: row.date,
    income_cents: row.income_cents,
    bizum: row.bizum === null ? null : row.bizum === 1,
    expense_cents: row.expense_cents,
  };
}

/** Lee todos los registros de un mes */
export function getMonthEntries(
  year: number,
  month: number
): Array<{
  date: string;
  income_cents: number | null;
  bizum: boolean | null;
  expense_cents: number | null;
}> {
  const database = getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = database
    .prepare('SELECT date, income_cents, bizum, expense_cents FROM day_entries WHERE date LIKE ?')
    .all(`${prefix}-%`) as any[];

  return rows.map((row) => ({
    date: row.date,
    income_cents: row.income_cents,
    bizum: row.bizum === null ? null : row.bizum === 1,
    expense_cents: row.expense_cents,
  }));
}

/** Obtiene el estado de un mes */
export function getMonthStatus(
  year: number,
  month: number
): {
  closed_at: string | null;
  expenses_complete: boolean;
} {
  const database = getDb();
  const row = database
    .prepare('SELECT closed_at, expenses_complete FROM month_status WHERE year = ? AND month = ?')
    .get(year, month) as any;

  if (!row) {
    return { closed_at: null, expenses_complete: false };
  }

  return {
    closed_at: row.closed_at,
    expenses_complete: row.expenses_complete === 1,
  };
}

/** Cierra un mes */
export function closeMonth(year: number, month: number): void {
  const database = getDb();
  database
    .prepare(
      `
      INSERT INTO month_status (year, month, closed_at, expenses_complete)
      VALUES (?, ?, datetime('now'), 0)
      ON CONFLICT(year, month) DO UPDATE SET closed_at = datetime('now')
    `
    )
    .run(year, month);
}

/** Reabre un mes */
export function reopenMonth(year: number, month: number): void {
  const database = getDb();
  database.prepare('UPDATE month_status SET closed_at = NULL WHERE year = ? AND month = ?').run(year, month);
}

/** Marca gastos completos */
export function setExpensesComplete(year: number, month: number, complete: boolean): void {
  const database = getDb();
  database
    .prepare('UPDATE month_status SET expenses_complete = ? WHERE year = ? AND month = ?')
    .run(complete ? 1 : 0, year, month);
}

/** Registra en el historial */
export function logAudit(entryDate: string, field: string, oldValue: string | null, newValue: string | null): void {
  const database = getDb();
  database
    .prepare('INSERT INTO audit_log (entry_date, field, old_value, new_value) VALUES (?, ?, ?, ?)')
    .run(entryDate, field, oldValue, newValue);
}

/** Obtiene el historial de cambios */
export function getAuditLog(): Array<{
  id: number;
  entry_date: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  at: string;
}> {
  const database = getDb();
  return database.prepare('SELECT * FROM audit_log ORDER BY id DESC').all() as any[];
}

/** Obtiene el último cambio registrado (para Deshacer, sección 4.8) */
export function getUltimoCambio(): {
  id: number;
  entry_date: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  at: string;
} | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').get() as any;
  return row ?? null;
}

/** Obtiene ajustes */
export function getSettings(): {
  business_name: string;
  backup_folder: string | null;
  schema_version: number;
} {
  const database = getDb();
  const row = database.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
  return {
    business_name: row.business_name,
    backup_folder: row.backup_folder,
    schema_version: row.schema_version,
  };
}

/** Guarda ajustes */
export function saveSettings(settings: { business_name?: string; backup_folder?: string | null }): void {
  const database = getDb();
  if (settings.business_name !== undefined) {
    database.prepare('UPDATE settings SET business_name = ? WHERE id = 1').run(settings.business_name);
  }
  if (settings.backup_folder !== undefined) {
    database.prepare('UPDATE settings SET backup_folder = ? WHERE id = 1').run(settings.backup_folder);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Copias de seguridad (sección 7.4)
// ─────────────────────────────────────────────────────────────────────────────

/** Crea una copia de seguridad automática en la carpeta elegida */
export function crearCopiaAutomatica(): string | null {
  const settings = getSettings();
  if (!settings.backup_folder) return null;

  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = `trimestre_backup_${fecha}.sqlite`;
  const destino = path.join(settings.backup_folder, nombre);

  // Copia en caliente usando SQLite
  getDb().backup(destino);

  // Limitar a las últimas 30 copias
  limitarCopias(settings.backup_folder, 30);

  return destino;
}

/** Conserva solo las N copias más recientes en la carpeta */
function limitarCopias(carpeta: string, max: number): void {
  if (!fs.existsSync(carpeta)) return;

  const archivos = fs
    .readdirSync(carpeta)
    .filter((f) => f.startsWith('trimestre_backup_') && f.endsWith('.sqlite'))
    .sort()
    .reverse();

  if (archivos.length > max) {
    for (let i = max; i < archivos.length; i++) {
      fs.unlinkSync(path.join(carpeta, archivos[i]));
    }
  }
}

/** Exporta una copia de seguridad a una ruta elegida por el usuario */
export function exportarCopia(destino: string): void {
  const dbPath = getDbPath();
  fs.copyFileSync(dbPath, destino);
}

/** Comprueba si la copia de seguridad está atrasada (más de 7 días) */
export function copiaAtrasada(): boolean {
  const settings = getSettings();
  if (!settings.backup_folder || !fs.existsSync(settings.backup_folder)) return false;

  const archivos = fs
    .readdirSync(settings.backup_folder)
    .filter((f) => f.startsWith('trimestre_backup_') && f.endsWith('.sqlite'));

  if (archivos.length === 0) return true; // Nunca hubo copia

  // Buscar la más reciente por fecha en el nombre
  const masReciente = archivos.sort().reverse()[0];
  const match = masReciente.match(/trimestre_backup_(\d{4}-\d{2}-\d{2})/);
  if (!match) return true;

  const fechaCopia = new Date(match[1]);
  const hoy = new Date();
  const dias = (hoy.getTime() - fechaCopia.getTime()) / (1000 * 60 * 60 * 24);
  return dias > 7;
}

/** Valida un fichero de copia antes de importar */
export function validarCopia(ruta: string): { valido: boolean; error?: string } {
  if (!fs.existsSync(ruta)) {
    return { valido: false, error: 'El fichero no existe' };
  }

  // Comprobar extensión
  if (!ruta.endsWith('.sqlite') && !ruta.endsWith('.db')) {
    return { valido: false, error: 'El fichero no es una base de datos SQLite' };
  }

  // Intentar abrir como SQLite
  let testDb: Database.Database | null = null;
  try {
    testDb = new Database(ruta, { readonly: true });
    const row = testDb.prepare('SELECT schema_version FROM settings WHERE id = 1').get() as any;
    if (!row) {
      return { valido: false, error: 'La copia no tiene el esquema esperado' };
    }
  } catch (e: any) {
    return { valido: false, error: `Fichero corrupto: ${e.message}` };
  } finally {
    if (testDb) testDb.close();
  }

  return { valido: true };
}

/** Importa una copia de seguridad (con copia previa de seguridad) */
export function importarCopia(ruta: string): void {
  // Validar primero
  const validacion = validarCopia(ruta);
  if (!validacion.valido) {
    throw new Error(validacion.error || 'Copia no válida');
  }

  // Hacer copia de seguridad de los datos actuales antes de importar
  const dbPath = getDbPath();
  const fecha = new Date().toISOString().slice(0, 10);
  const backupPrevio = path.join(path.dirname(dbPath), `trimestre_previo_${fecha}.sqlite`);
  fs.copyFileSync(dbPath, backupPrevio);

  // Cerrar conexión actual, copiar fichero y reabrir
  if (db) {
    db.close();
    db = null;
  }

  fs.copyFileSync(ruta, dbPath);
  initDb();
}
