import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  trimestreDeMes,
  mesesDeTrimestre,
  diasDelMes,
  fechasDelMes,
  formatearFecha,
  parsearFecha,
  diaDeLaSemana,
  hoyEnMadrid,
  esFuturo,
  esPasadoOHoy,
  añosPermitidos,
  parsearImporte,
  formatearImporte,
  estadoIngresos,
  estadoGastos,
  bizumDerivado,
  calcularTotalesMes,
  calcularTotalesTrimestre,
  formatearDiaDocumento,
  formatearFechaExcel,
  MAX_CENTIMOS,
} from '../src/index';

// ─────────────────────────────────────────────────────────────────────────────
// C1: Cuatro trimestres
// ─────────────────────────────────────────────────────────────────────────────

test('C1: T1 = ene-feb-mar', () => {
  assert.equal(trimestreDeMes(1), 1);
  assert.equal(trimestreDeMes(2), 1);
  assert.equal(trimestreDeMes(3), 1);
  assert.deepEqual(mesesDeTrimestre(1), [1, 2, 3]);
});

test('C1: T2 = abr-may-jun', () => {
  assert.equal(trimestreDeMes(4), 2);
  assert.equal(trimestreDeMes(5), 2);
  assert.equal(trimestreDeMes(6), 2);
  assert.deepEqual(mesesDeTrimestre(2), [4, 5, 6]);
});

test('C1: T3 = jul-ago-sep', () => {
  assert.equal(trimestreDeMes(7), 3);
  assert.equal(trimestreDeMes(8), 3);
  assert.equal(trimestreDeMes(9), 3);
  assert.deepEqual(mesesDeTrimestre(3), [7, 8, 9]);
});

test('C1: T4 = oct-nov-dic', () => {
  assert.equal(trimestreDeMes(10), 4);
  assert.equal(trimestreDeMes(11), 4);
  assert.equal(trimestreDeMes(12), 4);
  assert.deepEqual(mesesDeTrimestre(4), [10, 11, 12]);
});

test('C1: mes inválido lanza error', () => {
  assert.throws(() => trimestreDeMes(0));
  assert.throws(() => trimestreDeMes(13));
});

// ─────────────────────────────────────────────────────────────────────────────
// C2: Días por mes en 2027
// ─────────────────────────────────────────────────────────────────────────────

test('C2: Enero 31, febrero 28, marzo 31, abril 30', () => {
  assert.equal(diasDelMes(2027, 1), 31);
  assert.equal(diasDelMes(2027, 2), 28);
  assert.equal(diasDelMes(2027, 3), 31);
  assert.equal(diasDelMes(2027, 4), 30);
});

test('C2: ninguna fila 29, 30 o 31 donde no existe', () => {
  const feb = fechasDelMes(2027, 2);
  assert.equal(feb.length, 28);
  assert.ok(!feb.includes('2027-02-29'));
  assert.ok(!feb.includes('2027-02-30'));
  assert.ok(!feb.includes('2027-02-31'));

  const abr = fechasDelMes(2027, 4);
  assert.equal(abr.length, 30);
  assert.ok(!abr.includes('2027-04-31'));
});

test('C2: todos los meses generan fechas correctas', () => {
  const esperados: Record<number, number> = {
    1: 31,
    2: 28,
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
  };
  for (let m = 1; m <= 12; m++) {
    assert.equal(diasDelMes(2027, m as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12), esperados[m]);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// C3: Febrero bisiesto
// ─────────────────────────────────────────────────────────────────────────────

test('C3: Febrero 2028 tiene 29 días', () => {
  assert.equal(diasDelMes(2028, 2), 29);
});

test('C3: Febrero 2027 tiene 28 días', () => {
  assert.equal(diasDelMes(2027, 2), 28);
});

test('C3: Febrero 2100 tiene 28 días (divisible entre 100 pero no entre 400)', () => {
  assert.equal(diasDelMes(2100, 2), 28);
});

test('C3: Febrero 2000 tiene 29 días (divisible entre 400)', () => {
  assert.equal(diasDelMes(2000, 2), 29);
});

// ─────────────────────────────────────────────────────────────────────────────
// C4: Días de la semana
// ─────────────────────────────────────────────────────────────────────────────

test('C4: 01/01/2027 = viernes', () => {
  assert.equal(diaDeLaSemana('2027-01-01'), 'viernes');
});

test('C4: 01/02/2027 = lunes', () => {
  assert.equal(diaDeLaSemana('2027-02-01'), 'lunes');
});

test('C4: 29/02/2028 = martes', () => {
  assert.equal(diaDeLaSemana('2028-02-29'), 'martes');
});

// ─────────────────────────────────────────────────────────────────────────────
// Pruebas adicionales de utilidades de calendario
// ─────────────────────────────────────────────────────────────────────────────

test('formatearFecha funciona correctamente', () => {
  assert.equal(formatearFecha(2027, 1, 1), '2027-01-01');
  assert.equal(formatearFecha(2027, 12, 31), '2027-12-31');
  assert.equal(formatearFecha(2028, 2, 29), '2028-02-29');
});

test('parsearFecha funciona correctamente', () => {
  assert.deepEqual(parsearFecha('2027-01-01'), { year: 2027, mes: 1, dia: 1 });
  assert.deepEqual(parsearFecha('2028-02-29'), { year: 2028, mes: 2, dia: 29 });
});

test('parsear fecha inexistente lanza error', () => {
  assert.throws(() => parsearFecha('2027-02-29'));
  assert.throws(() => parsearFecha('2027-13-01'));
});

test('parsear formato inválido lanza error', () => {
  assert.throws(() => parsearFecha('01-01-2027'));
  assert.throws(() => parsearFecha('2027/01/01'));
});

test('hoyEnMadrid devuelve una fecha válida', () => {
  const hoy = hoyEnMadrid();
  assert.match(hoy, /^\d{4}-\d{2}-\d{2}$/);
  assert.doesNotThrow(() => parsearFecha(hoy));
});

test('esFuturo y esPasadoOHoy funcionan', () => {
  const hoy = hoyEnMadrid();
  assert.equal(esPasadoOHoy(hoy), true);
  assert.equal(esFuturo(hoy), false);
});

test('añosPermitidos incluye desde el año de alta hasta actual+1', () => {
  const años = añosPermitidos(2020);
  const añoActual = parseInt(hoyEnMadrid().slice(0, 4), 10);
  assert.equal(años[0], 2020);
  assert.equal(años[años.length - 1], añoActual + 1);
  assert.ok(años.includes(añoActual));
});

// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de importes (C12, C13)
// ─────────────────────────────────────────────────────────────────────────────

test('C12: Importes inválidos rechazados', () => {
  assert.throws(() => parsearImporte('abc'));
  assert.throws(() => parsearImporte('12,345'));
  assert.throws(() => parsearImporte('1,2,3'));
  assert.throws(() => parsearImporte('-5'));
});

test('C12: Importes válidos aceptados', () => {
  assert.equal(parsearImporte('250'), 25000);
  assert.equal(parsearImporte('250,5'), 25050);
  assert.equal(parsearImporte('250,50'), 25050);
  assert.equal(parsearImporte('250.50'), 25050);
});

test('C12: vacío devuelve null', () => {
  assert.equal(parsearImporte(''), null);
  assert.equal(parsearImporte('   '), null);
});

test('C13: Importe límite', () => {
  assert.equal(parsearImporte('999999,99'), MAX_CENTIMOS);
  assert.throws(() => parsearImporte('1000000,00'));
});

test('formatearImporte formatea correctamente', () => {
  assert.equal(formatearImporte(25000), '250,00 €');
  assert.equal(formatearImporte(123450), '1.234,50 €');
  assert.equal(formatearImporte(0), '0,00 €');
  assert.equal(formatearImporte(99999999), '999.999,99 €');
});

// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de estados (C7, C8, C10, C14)
// ─────────────────────────────────────────────────────────────────────────────

test('C7/C8/C10/C14: Estados', () => {
  assert.equal(estadoIngresos(null), 'pendiente');
  assert.equal(estadoIngresos(0), 'confirmado_cero');
  assert.equal(estadoIngresos(25000), 'con_importe');

  assert.equal(estadoGastos(null), 'pendiente');
  assert.equal(estadoGastos(0), 'confirmado_cero');
  assert.equal(estadoGastos(25000), 'con_importe');
});

test('C14: Bizum con ingresos a cero pasa a NO', () => {
  assert.equal(bizumDerivado(null, null), null);
  assert.equal(bizumDerivado(null, true), null);
  assert.equal(bizumDerivado(0, null), false);
  assert.equal(bizumDerivado(0, true), false);
  assert.equal(bizumDerivado(25000, null), false);
  assert.equal(bizumDerivado(25000, true), true);
  assert.equal(bizumDerivado(25000, false), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de totales (C5, C6, C9, C11)
// ─────────────────────────────────────────────────────────────────────────────

test('C5: Ingreso con Bizum suma total y días con Bizum', () => {
  const registros = new Map();
  registros.set('2027-01-01', { income_cents: 25000, bizum: true, expense_cents: null });
  const totales = calcularTotalesMes(2027, 1, registros);
  assert.equal(totales.totalIngresos, 25000);
  assert.equal(totales.diasConBizum, 1);
});

test('C6: Ingreso sin Bizum suma total pero no días con Bizum', () => {
  const registros = new Map();
  registros.set('2027-01-01', { income_cents: 18000, bizum: false, expense_cents: null });
  const totales = calcularTotalesMes(2027, 1, registros);
  assert.equal(totales.totalIngresos, 18000);
  assert.equal(totales.diasConBizum, 0);
});

test('C8: Día pendiente no suma y cuenta como pendiente', () => {
  const registros = new Map();
  const totales = calcularTotalesMes(2026, 10, registros);
  assert.equal(totales.totalIngresos, 0);
  assert.ok(totales.diasIngresosPendientes > 0);
});

test('C9: Gastos pendientes se cuentan', () => {
  const registros = new Map();
  registros.set('2026-10-01', { income_cents: 25000, bizum: false, expense_cents: null });
  const totales = calcularTotalesMes(2026, 10, registros);
  assert.ok(totales.diasGastosPendientes > 0);
});

test('C11: Totales con tres días suman correctamente', () => {
  const registros = new Map();
  registros.set('2027-01-01', { income_cents: 25000, bizum: false, expense_cents: null });
  registros.set('2027-01-02', { income_cents: 18000, bizum: false, expense_cents: null });
  registros.set('2027-01-03', { income_cents: 32000, bizum: false, expense_cents: null });
  const totales = calcularTotalesMes(2027, 1, registros);
  assert.equal(totales.totalIngresos, 75000);
});

test('Totales trimestrales suman tres meses', () => {
  const registros = new Map();
  registros.set('2027-01-01', { income_cents: 10000, bizum: false, expense_cents: null });
  registros.set('2027-02-01', { income_cents: 20000, bizum: false, expense_cents: null });
  registros.set('2027-03-01', { income_cents: 30000, bizum: false, expense_cents: null });
  const gastosCompletos = new Map();
  gastosCompletos.set(1, true);
  gastosCompletos.set(2, true);
  gastosCompletos.set(3, true);
  const totales = calcularTotalesTrimestre(2027, 1, registros, gastosCompletos);
  assert.equal(totales.totalIngresos, 60000);
  assert.equal(totales.gastosCompletos, true);
});

test('Totales trimestrales con mes incompleto', () => {
  const registros = new Map();
  registros.set('2027-01-01', { income_cents: 10000, bizum: false, expense_cents: null });
  const gastosCompletos = new Map();
  gastosCompletos.set(1, true);
  gastosCompletos.set(2, false);
  gastosCompletos.set(3, true);
  const totales = calcularTotalesTrimestre(2027, 1, registros, gastosCompletos);
  assert.equal(totales.gastosCompletos, false);
  assert.equal(totales.mesesIncompletos.length, 1);
  assert.equal(totales.mesesIncompletos[0].mes, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de formato para documentos
// ─────────────────────────────────────────────────────────────────────────────

test('formatearDiaDocumento formatea correctamente', () => {
  assert.equal(formatearDiaDocumento('2027-01-01'), '01 — viernes');
  assert.equal(formatearDiaDocumento('2027-02-01'), '01 — lunes');
});

test('formatearFechaExcel formatea correctamente', () => {
  assert.equal(formatearFechaExcel('2027-01-01'), '01/01/2027 — viernes');
});
