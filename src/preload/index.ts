// src/preload/index.ts — Puente seguro entre renderer y main (sección 11).
// La interfaz nunca accede a la base de datos ni al disco directamente.

import { contextBridge, ipcRenderer } from 'electron';

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de tipos expuestos a la interfaz
// ─────────────────────────────────────────────────────────────────────────────

export interface DayEntry {
  date: string;
  income_cents: number | null;
  bizum: boolean | null;
  expense_cents: number | null;
}

export interface MonthStatus {
  closed_at: string | null;
  expenses_complete: boolean;
}

export interface AuditEntry {
  id: number;
  entry_date: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  at: string;
}

export interface Settings {
  business_name: string;
  backup_folder: string | null;
  schema_version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API expuesta a la interfaz
// ─────────────────────────────────────────────────────────────────────────────

// Log para diagnosticar si el preload se ejecuta
console.log('[preload] Iniciando script de preload...');

try {
  contextBridge.exposeInMainWorld('electron', {
  // Registros diarios
  getMonthEntries: (year: number, month: number): Promise<DayEntry[]> =>
    ipcRenderer.invoke('get-month-entries', year, month),

  saveDay: (
    date: string,
    income_cents: number | null,
    bizum: boolean | null,
    expense_cents: number | null,
    field: string,
    oldValue: string | null
  ): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-day', date, income_cents, bizum, expense_cents, field, oldValue),

  // Estado del mes
  getMonthStatus: (year: number, month: number): Promise<MonthStatus> =>
    ipcRenderer.invoke('get-month-status', year, month),

  closeMonth: (year: number, month: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('close-month', year, month),

  reopenMonth: (year: number, month: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reopen-month', year, month),

  setExpensesComplete: (year: number, month: number, complete: boolean): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('set-expenses-complete', year, month, complete),

  // Historial
  getAuditLog: (): Promise<AuditEntry[]> => ipcRenderer.invoke('get-audit-log'),

  // Deshacer último cambio
  undoLast: (fecha: string) => ipcRenderer.invoke('undo-last', fecha),

  // Ajustes
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: { business_name?: string; backup_folder?: string | null }): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-settings', settings),

  selectBackupFolder: (): Promise<string | null> => ipcRenderer.invoke('select-backup-folder'),

  // Copias de seguridad
  createAutoBackup: (): Promise<{ success: boolean; path: string | null }> => ipcRenderer.invoke('create-auto-backup'),
  checkBackupStale: (): Promise<{ stale: boolean }> => ipcRenderer.invoke('check-backup-stale'),
  exportBackup: (destino: string): Promise<{ success: boolean }> => ipcRenderer.invoke('export-backup', destino),
  validateBackup: (ruta: string) => ipcRenderer.invoke('validate-backup', ruta),
  importBackup: (ruta: string): Promise<{ success: boolean }> => ipcRenderer.invoke('import-backup', ruta),
  exportBackupDialog: (): Promise<{ success: boolean }> => ipcRenderer.invoke('export-backup-dialog'),
  importBackupDialog: (): Promise<{ success: boolean }> => ipcRenderer.invoke('import-backup-dialog'),

  // Exportaciones (sección 6)
  exportWordMonthly: (year: number, mes: number): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('export-word-monthly', year, mes),
  exportWordQuarterly: (year: number, trimestre: number): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('export-word-quarterly', year, trimestre),
  exportExcelQuarterly: (year: number, trimestre: number): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('export-excel-quarterly', year, trimestre),
  exportPdfMonthly: (year: number, mes: number): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('export-pdf-monthly', year, mes),
  });

  console.log('[preload] API electron expuesta correctamente');
} catch (error) {
  console.error('[preload] Error al exponer API electron:', error);
}
