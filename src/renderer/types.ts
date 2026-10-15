// src/renderer/types.ts — Declaraciones de tipos para window.electron

import type { DayEntry, MonthStatus, AuditEntry, Settings } from '../preload';

export {};

declare global {
  interface Window {
    electron: {
      getMonthEntries: (year: number, month: number) => Promise<DayEntry[]>;
      saveDay: (
        date: string,
        income_cents: number | null,
        bizum: boolean | null,
        expense_cents: number | null,
        field: string,
        oldValue: string | null
      ) => Promise<{ success: boolean }>;
      getMonthStatus: (year: number, month: number) => Promise<MonthStatus>;
      closeMonth: (year: number, month: number) => Promise<{ success: boolean }>;
      reopenMonth: (year: number, month: number) => Promise<{ success: boolean }>;
      setExpensesComplete: (year: number, month: number, complete: boolean) => Promise<{ success: boolean }>;
      getAuditLog: () => Promise<AuditEntry[]>;
      undoLast: (fecha: string) => Promise<{ success: boolean; error?: string; restored?: unknown }>;
      getSettings: () => Promise<Settings>;
      saveSettings: (settings: {
        business_name?: string;
        backup_folder?: string | null;
      }) => Promise<{ success: boolean }>;
      selectBackupFolder: () => Promise<string | null>;

      // Copias de seguridad
      createAutoBackup: () => Promise<{ success: boolean; path: string | null }>;
      checkBackupStale: () => Promise<{ stale: boolean }>;
      exportBackup: (destino: string) => Promise<{ success: boolean }>;
      validateBackup: (ruta: string) => Promise<{ valido: boolean; error?: string }>;
      importBackup: (ruta: string) => Promise<{ success: boolean }>;
      exportBackupDialog: () => Promise<{ success: boolean }>;
      importBackupDialog: () => Promise<{ success: boolean }>;

      // Exportaciones
      exportWordMonthly: (year: number, mes: number) => Promise<{ success: boolean; path?: string }>;
      exportWordQuarterly: (year: number, trimestre: number) => Promise<{ success: boolean; path?: string }>;
      exportExcelQuarterly: (year: number, trimestre: number) => Promise<{ success: boolean; path?: string }>;
      exportPdfMonthly: (year: number, mes: number) => Promise<{ success: boolean; path?: string }>;
    };
  }
}
