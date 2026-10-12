// src/main/index.ts — Proceso principal de Electron.
// Inicializa la ventana, la base de datos y gestiona el cierre de la app.

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { Packer } from 'docx';
import {
  initDb,
  closeDb,
  saveDayEntry,
  getMonthEntries,
  getMonthStatus,
  closeMonth,
  reopenMonth,
  setExpensesComplete,
  logAudit,
  getAuditLog,
  getUltimoCambio,
  getSettings,
  saveSettings,
  crearCopiaAutomatica,
  copiaAtrasada,
  exportarCopia,
  validarCopia,
  importarCopia,
} from './db';
import {
  generarWordMensual,
  generarWordTrimestral,
  generarExcelTrimestral,
  nombreArchivoMensual,
  nombreArchivoTrimestral,
  type RegistroDia,
  type EstadoMes,
} from './export';
import {
  fechasDelMes,
  formatearImporte,
  formatearDiaDocumento,
  calcularTotalesMes,
  esFuturo,
  mesesDeTrimestre,
  MESES_ES_MAYUSCULAS,
} from '../index';
import type { Mes, Trimestre } from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Instancia única (sección 4.8)
// ─────────────────────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Si se intenta abrir otra instancia, avisar y no abrir segunda ventana
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].show();
      windows[0].focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Creación de ventana
// ─────────────────────────────────────────────────────────────────────────────

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Cargar la URL de desarrollo o el build de producción
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Al cerrar, hacer copia de seguridad automática
  mainWindow.on('closed', () => {
    closeDb();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC — Puente entre renderer y main
// ─────────────────────────────────────────────────────────────────────────────

function setupIpc(): void {
  // Inicializar DB al arrancar
  initDb();

  // Obtener registros de un mes
  ipcMain.handle('get-month-entries', (_event, year: number, month: number) => {
    return getMonthEntries(year, month);
  });

  // Guardar un día
  ipcMain.handle(
    'save-day',
    (
      _event,
      date: string,
      income_cents: number | null,
      bizum: boolean | null,
      expense_cents: number | null,
      field: string,
      oldValue: string | null
    ) => {
      saveDayEntry(date, income_cents, bizum, expense_cents);
      logAudit(date, field, oldValue, JSON.stringify({ income_cents, bizum, expense_cents }));
      return { success: true };
    }
  );

  // Obtener estado de un mes
  ipcMain.handle('get-month-status', (_event, year: number, month: number) => {
    return getMonthStatus(year, month);
  });

  // Cerrar mes
  ipcMain.handle('close-month', (_event, year: number, month: number) => {
    closeMonth(year, month);
    logAudit(`${year}-${month}`, 'close_month', null, 'closed');
    return { success: true };
  });

  // Reabrir mes
  ipcMain.handle('reopen-month', (_event, year: number, month: number) => {
    reopenMonth(year, month);
    logAudit(`${year}-${month}`, 'reopen_month', 'closed', 'open');
    return { success: true };
  });

  // Marcar gastos completos
  ipcMain.handle('set-expenses-complete', (_event, year: number, month: number, complete: boolean) => {
    setExpensesComplete(year, month, complete);
    logAudit(`${year}-${month}`, 'expenses_complete', String(!complete), String(complete));
    return { success: true };
  });

  // Obtener historial
  ipcMain.handle('get-audit-log', () => {
    return getAuditLog();
  });

  // Deshacer último cambio (sección 4.8)
  ipcMain.handle('undo-last', (_event, fecha: string) => {
    const cambio = getUltimoCambio();
    if (!cambio || cambio.entry_date !== fecha) {
      return { success: false, error: 'No hay cambios que deshacer en este día' };
    }
    if (cambio.old_value === null) return { success: false, error: 'No hay valor anterior' };

    const previo = JSON.parse(cambio.old_value);
    saveDayEntry(fecha, previo.income_cents ?? null, previo.bizum ?? null, previo.expense_cents ?? null);
    logAudit(fecha, 'undo', cambio.new_value, cambio.old_value);

    return { success: true, fecha, field: cambio.field, restored: previo };
  });

  // Obtener ajustes
  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  // Guardar ajustes
  ipcMain.handle('save-settings', (_event, settings: { business_name?: string; backup_folder?: string | null }) => {
    saveSettings(settings);
    return { success: true };
  });

  // Seleccionar carpeta de copias
  ipcMain.handle('select-backup-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Copia de seguridad automática al cerrar
  ipcMain.handle('create-auto-backup', () => {
    const result = crearCopiaAutomatica();
    return { success: true, path: result };
  });

  // Comprobar si la copia está atrasada
  ipcMain.handle('check-backup-stale', () => {
    return { stale: copiaAtrasada() };
  });

  // Exportar copia
  ipcMain.handle('export-backup', async (_event, destino: string) => {
    exportarCopia(destino);
    return { success: true };
  });

  // Validar copia antes de importar
  ipcMain.handle('validate-backup', (_event, ruta: string) => {
    return validarCopia(ruta);
  });

  // Importar copia
  ipcMain.handle('import-backup', (_event, ruta: string) => {
    importarCopia(ruta);
    return { success: true };
  });

  // Exportar copia con diálogo de guardar
  ipcMain.handle('export-backup-dialog', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Exportar copia de seguridad',
      defaultPath: `copia_trimestre_${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'Base de datos SQLite', extensions: ['sqlite', 'db'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };
    exportarCopia(result.filePath);
    return { success: true };
  });

  // Importar copia con diálogo de abrir
  ipcMain.handle('import-backup-dialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Importar copia de seguridad',
      filters: [{ name: 'Base de datos SQLite', extensions: ['sqlite', 'db'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { success: false };
    const ruta = result.filePaths[0];
    const validacion = validarCopia(ruta);
    if (!validacion.valido) {
      dialog.showErrorBox('Copia no válida', validacion.error || 'Error desconocido');
      return { success: false };
    }
    const respuesta = dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['Cancelar', 'Importar'],
      defaultId: 0,
      message: '¿Reemplazar los datos actuales por la copia?',
      detail: 'Se guardará una copia de seguridad de los datos actuales antes de importar.',
    });
    if (respuesta === 0) return { success: false };
    importarCopia(ruta);
    return { success: true };
  });

  // ── Exportaciones (sección 6) ──────────────────────────────────────────────

  // Exportar Word mensual
  ipcMain.handle('export-word-monthly', async (_event, year: number, mes: Mes) => {
    const settings = getSettings();
    const negocio = settings.business_name || 'Negocio';
    const nombre = nombreArchivoMensual(mes, year, negocio);
    const result = await dialog.showSaveDialog({
      title: 'Guardar Word mensual',
      defaultPath: nombre,
      filters: [{ name: 'Documento Word', extensions: ['docx'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };

    const entries = getMonthEntries(year, mes);
    const registros = new Map<string, RegistroDia>();
    for (const e of entries) {
      registros.set(e.date, { income_cents: e.income_cents, bizum: e.bizum, expense_cents: e.expense_cents });
    }
    const estado = getMonthStatus(year, mes);

    const fechas = fechasDelMes(year, mes);
    let gastosPendientes = 0;
    for (const f of fechas) {
      const reg = registros.get(f);
      if ((!reg || reg.expense_cents === null) && !esFuturo(f)) gastosPendientes++;
    }

    const doc = generarWordMensual(year, mes, registros, gastosPendientes, estado, negocio);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, path: result.filePath };
  });

  // Exportar Word trimestral
  ipcMain.handle('export-word-quarterly', async (_event, year: number, trimestre: Trimestre) => {
    const settings = getSettings();
    const negocio = settings.business_name || 'Negocio';
    const nombre = nombreArchivoTrimestral(trimestre, year, negocio);
    const result = await dialog.showSaveDialog({
      title: 'Guardar Word trimestral',
      defaultPath: nombre,
      filters: [{ name: 'Documento Word', extensions: ['docx'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };

    const meses = mesesDeTrimestre(trimestre);
    const registrosPorMes = new Map<Mes, Map<string, RegistroDia>>();
    const estadosPorMes = new Map<Mes, EstadoMes>();

    for (const mes of meses) {
      const entries = getMonthEntries(year, mes);
      const registros = new Map<string, RegistroDia>();
      for (const e of entries) {
        registros.set(e.date, { income_cents: e.income_cents, bizum: e.bizum, expense_cents: e.expense_cents });
      }
      registrosPorMes.set(mes, registros);
      estadosPorMes.set(mes, getMonthStatus(year, mes));
    }

    const doc = generarWordTrimestral(year, trimestre, meses, registrosPorMes, estadosPorMes, negocio);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, path: result.filePath };
  });

  // Exportar Excel trimestral
  ipcMain.handle('export-excel-quarterly', async (_event, year: number, trimestre: Trimestre) => {
    const result = await dialog.showSaveDialog({
      title: 'Guardar Excel trimestral',
      defaultPath: `Ingresos_Gastos_${year}_T${trimestre}.xlsx`,
      filters: [{ name: 'Hoja de cálculo', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };

    const meses = mesesDeTrimestre(trimestre);
    const registrosPorMes = new Map<Mes, Map<string, RegistroDia>>();
    for (const mes of meses) {
      const entries = getMonthEntries(year, mes);
      const registros = new Map<string, RegistroDia>();
      for (const e of entries) {
        registros.set(e.date, { income_cents: e.income_cents, bizum: e.bizum, expense_cents: e.expense_cents });
      }
      registrosPorMes.set(mes, registros);
    }

    const buffer = await generarExcelTrimestral(year, meses, registrosPorMes);
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, path: result.filePath };
  });

  // Exportar PDF mensual (sección 6.4) — usa printToPDF
  ipcMain.handle('export-pdf-monthly', async (_event, year: number, mes: Mes) => {
    const nombre = `Ingresos_Gastos_${MESES_ES_MAYUSCULAS[mes - 1]}_${year}.pdf`;
    const result = await dialog.showSaveDialog({
      title: 'Guardar PDF mensual',
      defaultPath: nombre,
      filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };

    const entries = getMonthEntries(year, mes);
    const registros = new Map<string, RegistroDia>();
    for (const e of entries) {
      registros.set(e.date, { income_cents: e.income_cents, bizum: e.bizum, expense_cents: e.expense_cents });
    }
    const estado = getMonthStatus(year, mes);

    const fechas = fechasDelMes(year, mes);
    let gastosPendientes = 0;
    for (const f of fechas) {
      const reg = registros.get(f);
      if ((!reg || reg.expense_cents === null) && !esFuturo(f)) gastosPendientes++;
    }

    const totales = calcularTotalesMes(year, mes, registros);
    const fechaGen = new Date().toLocaleDateString('es-ES');

    // Generar filas de la tabla
    const filasHtml = fechas
      .map((f: string) => {
        const reg = registros.get(f);
        const ingreso = reg?.income_cents != null ? formatearImporte(reg.income_cents) : '';
        const gasto = reg?.expense_cents != null ? formatearImporte(reg.expense_cents) : '';
        const bizum = reg?.bizum == null ? '' : reg.bizum ? 'SÍ' : 'NO';
        const clase = reg?.bizum === true ? ' class="bizum"' : '';
        return `<tr${clase}><td class="dia">${formatearDiaDocumento(f)}</td><td class="num">${ingreso}</td><td class="ctr">${bizum}</td><td class="num">${gasto}</td></tr>`;
      })
      .join('\n');

    const totalGastoTexto =
      gastosPendientes > 0
        ? `Parcial: ${formatearImporte(totales.totalGastos)}`
        : formatearImporte(totales.totalGastos);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; margin: 20mm; }
  h1 { text-align: center; font-size: 14pt; }
  table.cab { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 0; margin-bottom: 14px; }
  table.cab td { border: 0.5pt solid #333; height: 0.9cm; padding: 0 8px; vertical-align: middle; }
  table.cab td.etq { background-color: #FBE3D6; text-align: center; padding: 0; }
  table.cab td.cur { font-style: italic; }
  table.cab td.hueco { border: none; background: none; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 0.5pt solid #333; padding: 4px 6px; }
  th { background-color: #FBE3D6; font-weight: bold; text-align: center; }
  td.dia { background-color: #FBE3D6; font-weight: bold; }
  td.num { text-align: right; }
  td.ctr { text-align: center; }
  tr.total td { font-weight: bold; background-color: #FBE3D6; }
  .aviso { font-style: italic; font-size: 9pt; margin-top: 10px; }
  .footer { font-size: 8pt; margin-top: 20px; text-align: center; color: #555; }
  tr.bizum td:not(.dia) { background-color: #fff2cc; }
</style>
</head>
<body>
  <table class="cab">
    <colgroup>
      <col style="width: 9.6%">
      <col style="width: 52.9%">
      <col style="width: 4%">
      <col style="width: 8.9%">
      <col style="width: 24.6%">
    </colgroup>
    <tr>
      <td class="etq">Mes</td>
      <td>${MESES_ES_MAYUSCULAS[mes - 1]}</td>
      <td class="hueco"></td>
      <td class="etq cur">Año</td>
      <td>${year}</td>
    </tr>
  </table>
  <table>
    <thead>
      <tr>
        <th>Día</th>
        <th>Ingresos (€)</th>
        <th>¿Bizum?</th>
        <th>Gastos (€)</th>
      </tr>
    </thead>
    <tbody>
      ${filasHtml}
      <tr class="total">
        <td>TOTAL</td>
        <td class="num">${formatearImporte(totales.totalIngresos)}</td>
        <td class="ctr"></td>
        <td class="num"></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

    // Crear ventana oculta para renderizar el PDF
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: { offscreen: true },
    });
    try {
      await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const pdfData = await pdfWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });
      fs.writeFileSync(result.filePath, pdfData);
      return { success: true, path: result.filePath };
    } finally {
      pdfWin.destroy();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Ciclo de vida de la app
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupIpc();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
