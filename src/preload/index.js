"use strict";
// src/preload/index.ts — Puente seguro entre renderer y main (sección 11).
// La interfaz nunca accede a la base de datos ni al disco directamente.
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// ─────────────────────────────────────────────────────────────────────────────
// API expuesta a la interfaz
// ─────────────────────────────────────────────────────────────────────────────
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Registros diarios
    getMonthEntries: (year, month) => electron_1.ipcRenderer.invoke('get-month-entries', year, month),
    saveDay: (date, income_cents, bizum, expense_cents, field, oldValue) => electron_1.ipcRenderer.invoke('save-day', date, income_cents, bizum, expense_cents, field, oldValue),
    // Estado del mes
    getMonthStatus: (year, month) => electron_1.ipcRenderer.invoke('get-month-status', year, month),
    closeMonth: (year, month) => electron_1.ipcRenderer.invoke('close-month', year, month),
    reopenMonth: (year, month) => electron_1.ipcRenderer.invoke('reopen-month', year, month),
    setExpensesComplete: (year, month, complete) => electron_1.ipcRenderer.invoke('set-expenses-complete', year, month, complete),
    // Historial
    getAuditLog: () => electron_1.ipcRenderer.invoke('get-audit-log'),
    // Deshacer último cambio
    undoLast: (fecha) => electron_1.ipcRenderer.invoke('undo-last', fecha),
    // Ajustes
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('save-settings', settings),
    selectBackupFolder: () => electron_1.ipcRenderer.invoke('select-backup-folder'),
    // Copias de seguridad
    createAutoBackup: () => electron_1.ipcRenderer.invoke('create-auto-backup'),
    checkBackupStale: () => electron_1.ipcRenderer.invoke('check-backup-stale'),
    exportBackup: (destino) => electron_1.ipcRenderer.invoke('export-backup', destino),
    validateBackup: (ruta) => electron_1.ipcRenderer.invoke('validate-backup', ruta),
    importBackup: (ruta) => electron_1.ipcRenderer.invoke('import-backup', ruta),
    exportBackupDialog: () => electron_1.ipcRenderer.invoke('export-backup-dialog'),
    importBackupDialog: () => electron_1.ipcRenderer.invoke('import-backup-dialog'),
    // Exportaciones (sección 6)
    exportWordMonthly: (year, mes) => electron_1.ipcRenderer.invoke('export-word-monthly', year, mes),
    exportWordQuarterly: (year, trimestre) => electron_1.ipcRenderer.invoke('export-word-quarterly', year, trimestre),
    exportExcelQuarterly: (year, trimestre) => electron_1.ipcRenderer.invoke('export-excel-quarterly', year, trimestre),
    exportPdfMonthly: (year, mes) => electron_1.ipcRenderer.invoke('export-pdf-monthly', year, mes),
});
