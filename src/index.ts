// src/core/index.ts — Módulo de lógica pura: calendario, importes, estados y totales.
// Sin dependencias externas (sección 11: TypeScript puro, sin dependencias).
// Toda la lógica de negocio vive aquí y la usan por igual la pantalla y las exportaciones.

// ─────────────────────────────────────────────────────────────────────────────
// 1. Constantes y tipos
// ─────────────────────────────────────────────────────────────────────────────

export const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const MESES_ES_MAYUSCULAS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const;

export const DIAS_SEMANA_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

/** Mes en rango 1–12 */
export type Mes = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Trimestre 1–4 */
export type Trimestre = 1 | 2 | 3 | 4;

/** Fecha en formato AAAA-MM-DD (texto plano, sin hora) */
export type FechaStr = string;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Funciones de calendario (sección 4.1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el trimestre natural al que pertenece un mes (1–12).
 * T1 = meses 1–3, T2 = 4–6, T3 = 7–9, T4 = 10–12.
 */
export function trimestreDeMes(mes: number): Trimestre {
  if (mes < 1 || mes > 12) throw new Error(`Mes inválido: ${mes}`);
  if (mes <= 3) return 1;
  if (mes <= 6) return 2;
  if (mes <= 9) return 3;
  return 4;
}

/**
 * Devuelve los tres meses de un trimestre, en orden.
 * T1 → [1,2,3], T2 → [4,5,6], T3 → [7,8,9], T4 → [10,11,12].
 */
export function mesesDeTrimestre(trimestre: Trimestre): [Mes, Mes, Mes] {
  const base = (trimestre - 1) * 3 + 1;
  return [base as Mes, (base + 1) as Mes, (base + 2) as Mes];
}

/**
 * Días naturales de un mes. Usa Date.UTC para evitar problemas de zona horaria.
 * El día 0 del mes siguiente es el último día del mes actual.
 */
export function diasDelMes(year: number, mes: Mes): number {
  // new Date.UTC(year, mes, 0) → mes es 0-indexed en Date, así que mes (1-indexed)
  // pasado como "mes siguiente" da el último día del mes deseado.
  return new Date(Date.UTC(year, mes, 0)).getUTCDate();
}

/**
 * Genera todas las fechas de un mes como texto AAAA-MM-DD.
 * Nunca calcula a mano: usa Date.UTC.
 */
export function fechasDelMes(year: number, mes: Mes): FechaStr[] {
  const total = diasDelMes(year, mes);
  const fechas: FechaStr[] = [];
  for (let d = 1; d <= total; d++) {
    fechas.push(formatearFecha(year, mes, d));
  }
  return fechas;
}

/**
 * Formatea una fecha como AAAA-MM-DD usando Date.UTC.
 */
export function formatearFecha(year: number, mes: number, dia: number): FechaStr {
  const y = String(year).padStart(4, '0');
  const m = String(mes).padStart(2, '0');
  const d = String(dia).padStart(2, '0');
  // Verificación de consistencia con Date.UTC
  const dt = new Date(Date.UTC(year, mes - 1, dia));
  const check = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  if (check !== `${y}-${m}-${d}`) {
    throw new Error(`Fecha inconsistente: ${y}-${m}-${d} vs ${check}`);
  }
  return `${y}-${m}-${d}`;
}

/**
 * Parsea una fecha AAAA-MM-DD y devuelve { year, mes, dia }.
 * Usa Date.UTC para evitar zona horaria.
 */
export function parsearFecha(fecha: FechaStr): { year: number; mes: Mes; dia: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!match) throw new Error(`Formato de fecha inválido: ${fecha}`);
  const year = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10) as Mes;
  const dia = parseInt(match[3], 10);
  // Verificar que la fecha existe realmente
  const dt = new Date(Date.UTC(year, mes - 1, dia));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() + 1 !== mes || dt.getUTCDate() !== dia) {
    throw new Error(`Fecha inexistente: ${fecha}`);
  }
  return { year, mes, dia };
}

/**
 * Día de la semana en español desde una fecha AAAA-MM-DD.
 * No se guarda en base de datos: se deriva siempre de la fecha (sección 4.1).
 */
export function diaDeLaSemana(fecha: FechaStr): string {
  const { year, mes, dia } = parsearFecha(fecha);
  const dt = new Date(Date.UTC(year, mes - 1, dia));
  return DIAS_SEMANA_ES[dt.getUTCDay()];
}

/**
 * Día de la semana en español desde un objeto Date (UTC).
 */
export function diaDeLaSemanaDeDate(dt: Date): string {
  return DIAS_SEMANA_ES[dt.getUTCDay()];
}

/**
 * "Hoy" en Europe/Madrid, como fecha AAAA-MM-DD.
 * Se calcula en la zona horaria de Madrid para que coincida con el calendario del usuario.
 */
export function hoyEnMadrid(): FechaStr {
  // Europe/Madrid: UTC+1 en invierno, UTC+2 en verano.
  // Para obtener la fecha local de Madrid sin librería de zonas horarias,
  // usamos Intl.DateTimeFormat que sí conoce las zonas horarias.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

/**
 * Determina si una fecha es futura respecto a hoy (en Europe/Madrid).
 * Los días futuros no cuentan como pendiente (sección 4.2).
 */
export function esFuturo(fecha: FechaStr): boolean {
  return fecha > hoyEnMadrid();
}

/**
 * Determina si una fecha es de hoy o pasada.
 */
export function esPasadoOHoy(fecha: FechaStr): boolean {
  return fecha <= hoyEnMadrid();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Años permitidos (sección 4.1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Años permitidos: del año de alta del negocio hasta el año actual más 1.
 */
export function añosPermitidos(añoAlta: number): number[] {
  const añoActual = parseInt(hoyEnMadrid().slice(0, 4), 10);
  const años: number[] = [];
  for (let y = añoAlta; y <= añoActual + 1; y++) {
    años.push(y);
  }
  return años;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Importes (sección 4.3)
// ─────────────────────────────────────────────────────────────────────────────

/** Máximo importe en céntimos: 99.999.999 (999.999,99 €) */
export const MAX_CENTIMOS = 99_999_999;

/** Mínimo importe en céntimos: 0 */
export const MIN_CENTIMOS = 0;

/**
 * Parsea un importe introducido por el usuario y lo convierte a céntimos enteros.
 * Acepta: «250», «250,5», «250,50», «250.50».
 * Rechaza: texto, más de dos decimales, varias comas, negativos, fuera de rango.
 * Devuelve null si la cadena está vacía (pendiente).
 */
export function parsearImporte(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') return null;

  // Rechazar si contiene caracteres no permitidos (dígitos, coma, punto, espacio)
  if (!/^[\d.,\s]+$/.test(limpio)) {
    throw new Error(`Importe no válido: «${texto}». Usa números, por ejemplo 250,50`);
  }

  // No permitir varias comas
  const comas = (limpio.match(/,/g) || []).length;
  if (comas > 1) {
    throw new Error(`Importe no válido: «${texto}». No se permiten varias comas.`);
  }

  // Normalizar: quitar espacios, reemplazar punto por coma si hay coma,
  // o interpretar punto como separador decimal si no hay coma.
  let normalizado = limpio.replace(/\s/g, '');

  if (comas === 1) {
    // Hay coma: el punto si existe es separador de millares (se quita)
    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
  } else {
    // No hay coma: puede haber punto como decimal o no
    const puntos = (normalizado.match(/\./g) || []).length;
    if (puntos > 1) {
      // Varios puntos: podrían ser separadores de millares estilo español
      // «1.234.567» → quitar puntos
      normalizado = normalizado.replace(/\./g, '');
    }
    // Un solo punto: se respeta como decimal
  }

  const valor = Number(normalizado);
  if (Number.isNaN(valor)) {
    throw new Error(`Importe no válido: «${texto}». Usa números, por ejemplo 250,50`);
  }

  // Verificar que no tiene más de 2 decimales
  const partes = normalizado.split('.');
  if (partes.length === 2 && partes[1].length > 2) {
    throw new Error(`Importe no válido: «${texto}». Máximo dos decimales.`);
  }

  // Redondear a céntimos para evitar errores de coma flotante
  const centimos = Math.round(valor * 100);

  if (centimos < MIN_CENTIMOS) {
    throw new Error(`Importe no válido: «${texto}». Los importes no pueden ser negativos.`);
  }

  if (centimos > MAX_CENTIMOS) {
    throw new Error(`Importe no válido: «${texto}». El máximo es 999.999,99 €.`);
  }

  return centimos;
}

/**
 * Formatea un número de euros como texto con millares (punto) y 2 decimales (coma).
 * Implementación manual para no depender del locale del sistema.
 */
function formatearEuros(euros: number): string {
  const esNegativo = euros < 0;
  const abs = Math.floor(Math.abs(euros));
  const str = String(abs);
  // Separador de millares con punto (es-ES)
  let resultado = '';
  const len = str.length;
  for (let i = 0; i < len; i++) {
    if (i > 0 && (len - i) % 3 === 0) {
      resultado += '.';
    }
    resultado += str[i];
  }
  return (esNegativo ? '-' : '') + resultado;
}

/**
 * Formatea céntimos como importe en español (es-ES): «1.234,50 €».
 * Punto de millares, coma decimal.
 */
export function formatearImporte(centimos: number): string {
  const euros = Math.floor(Math.abs(centimos) / 100);
  const cent = Math.abs(centimos) % 100;
  const signo = centimos < 0 ? '-' : '';
  const centStr = String(cent).padStart(2, '0');
  return `${signo}${formatearEuros(euros)},${centStr} €`;
}

/**
 * Formatea céntimos como importe sin símbolo de moneda (para Excel).
 */
export function formatearImporteSinSimbolo(centimos: number): string {
  const euros = Math.floor(Math.abs(centimos) / 100);
  const cent = Math.abs(centimos) % 100;
  const signo = centimos < 0 ? '-' : '';
  const centStr = String(cent).padStart(2, '0');
  return `${signo}${formatearEuros(euros)},${centStr}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Estados de cada día (sección 4.2)
// ─────────────────────────────────────────────────────────────────────────────

/** Un día con ingresos guardado */
export interface DiaIngresos {
  /** Fecha AAAA-MM-DD */
  fecha: FechaStr;
  /** Céntinos o null (pendiente) */
  income_cents: number | null;
  /** true = SÍ, false = NO, null = sin marcar (solo cuando income_cents es null) */
  bizum: boolean | null;
}

/** Un día con gastos guardado */
export interface DiaGastos {
  /** Fecha AAAA-MM-DD */
  fecha: FechaStr;
  /** Céntinos o null (pendiente) */
  expense_cents: number | null;
}

/** Estado derivado de una celda de ingresos */
export type EstadoIngresos = 'pendiente' | 'confirmado_cero' | 'con_importe';

/** Estado derivado de una celda de gastos */
export type EstadoGastos = 'pendiente' | 'confirmado_cero' | 'con_importe';

/**
 * Deriva el estado de ingresos de un día a partir del valor guardado.
 * Nulo = pendiente, 0 = confirmado a cero, >0 = con importe.
 */
export function estadoIngresos(income_cents: number | null): EstadoIngresos {
  if (income_cents === null) return 'pendiente';
  if (income_cents === 0) return 'confirmado_cero';
  return 'con_importe';
}

/**
 * Deriva el estado de gastos de un día.
 */
export function estadoGastos(expense_cents: number | null): EstadoGastos {
  if (expense_cents === null) return 'pendiente';
  if (expense_cents === 0) return 'confirmado_cero';
  return 'con_importe';
}

/**
 * Deriva el valor de Bizum a partir de los ingresos:
 * - Si income_cents es null → bizum es null (sin marcar)
 * - Si income_cents es 0 → bizum es false (NO, forzado)
 * - Si income_cents > 0 → bizum puede ser true o false (lo que marque el usuario)
 */
export function bizumDerivado(income_cents: number | null, bizum_marcado: boolean | null): boolean | null {
  if (income_cents === null) return null;
  if (income_cents === 0) return false;
  // Si hay importe y no se marcó nada, por defecto NO
  return bizum_marcado === null ? false : bizum_marcado;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Totales (sección 4.5) — única función de cálculo
// ─────────────────────────────────────────────────────────────────────────────

/** Totales de un mes calculados desde los registros diarios */
export interface TotalesMes {
  year: number;
  mes: Mes;
  /** Suma de ingresos con importe (los pendientes suman 0) */
  totalIngresos: number;
  /** Suma de gastos con importe (los pendientes suman 0) */
  totalGastos: number;
  /** Número de días con Bizum = SÍ */
  diasConBizum: number;
  /** Días con ingresos pendientes (excluidos futuros) */
  diasIngresosPendientes: number;
  /** Días con gastos pendientes (excluidos futuros) */
  diasGastosPendientes: number;
  /** Días con gastos confirmados (0 o importe) */
  diasGastosCompletos: number;
  /** Total de días del mes */
  totalDias: number;
}

/** Totales de un trimestre (suma de tres meses) */
export interface TotalesTrimestre {
  year: number;
  trimestre: Trimestre;
  totalIngresos: number;
  totalGastos: number;
  diasConBizum: number;
  /** true si los tres meses tienen gastos completos */
  gastosCompletos: boolean;
  /** Meses que tienen gastos pendientes */
  mesesIncompletos: Array<{ mes: Mes; mesEs: string }>;
}

/**
 * Calcula los totales de un mes desde los registros diarios.
 * Esta es la ÚNICA función de cálculo; la usan la pantalla y las tres exportaciones.
 */
export function calcularTotalesMes(
  year: number,
  mes: Mes,
  registros: Map<FechaStr, { income_cents: number | null; bizum: boolean | null; expense_cents: number | null }>
): TotalesMes {
  const fechas = fechasDelMes(year, mes);
  const totalDias = fechas.length;

  let totalIngresos = 0;
  let totalGastos = 0;
  let diasConBizum = 0;
  let diasIngresosPendientes = 0;
  let diasGastosPendientes = 0;
  let diasGastosCompletos = 0;

  for (const fecha of fechas) {
    const reg = registros.get(fecha);
    const futuro = esFuturo(fecha);

    if (reg) {
      // Ingresos
      if (reg.income_cents !== null) {
        totalIngresos += reg.income_cents;
        if (reg.income_cents > 0 && reg.bizum === true) {
          diasConBizum++;
        }
      } else if (!futuro) {
        diasIngresosPendientes++;
      }

      // Gastos
      if (reg.expense_cents !== null) {
        totalGastos += reg.expense_cents;
        diasGastosCompletos++;
      } else if (!futuro) {
        diasGastosPendientes++;
      }
    } else {
      // Sin fila en BD: día pendiente (si no es futuro)
      if (!futuro) {
        diasIngresosPendientes++;
        diasGastosPendientes++;
      }
    }
  }

  return {
    year,
    mes,
    totalIngresos,
    totalGastos,
    diasConBizum,
    diasIngresosPendientes,
    diasGastosPendientes,
    diasGastosCompletos,
    totalDias,
  };
}

/**
 * Calcula los totales de un trimestre sumando los tres meses.
 * Nunca suma cifras ya redondeadas ni guardadas.
 */
export function calcularTotalesTrimestre(
  year: number,
  trimestre: Trimestre,
  registros: Map<FechaStr, { income_cents: number | null; bizum: boolean | null; expense_cents: number | null }>,
  gastosCompletosPorMes: Map<Mes, boolean>
): TotalesTrimestre {
  const meses = mesesDeTrimestre(trimestre);
  const totalesMeses = meses.map((mes) => calcularTotalesMes(year, mes, registros));

  const totalIngresos = totalesMeses.reduce((acc, t) => acc + t.totalIngresos, 0);
  const totalGastos = totalesMeses.reduce((acc, t) => acc + t.totalGastos, 0);
  const diasConBizum = totalesMeses.reduce((acc, t) => acc + t.diasConBizum, 0);

  // Los gastos del trimestre son completos solo si los tres meses lo son
  const gastosCompletos = meses.every((mes) => gastosCompletosPorMes.get(mes) === true);

  const mesesIncompletos = meses
    .filter((mes) => !gastosCompletosPorMes.get(mes))
    .map((mes) => ({
      mes,
      mesEs: MESES_ES[mes - 1],
    }));

  return {
    year,
    trimestre,
    totalIngresos,
    totalGastos,
    diasConBizum,
    gastosCompletos,
    mesesIncompletos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Utilidades de formato para documentos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formatea una fila de día para documentos: «Viernes 1».
 */
export function formatearDiaDocumento(fecha: FechaStr): string {
  const { dia } = parsearFecha(fecha);
  const diaStr = String(dia);
  const semana = diaDeLaSemana(fecha);
  return `${semana} ${diaStr}`;
}

/**
 * Formatea una fecha para Excel: «01/01/2027 — viernes».
 */
export function formatearFechaExcel(fecha: FechaStr): string {
  const { year, mes, dia } = parsearFecha(fecha);
  const semana = diaDeLaSemana(fecha);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${year} — ${semana}`;
}
