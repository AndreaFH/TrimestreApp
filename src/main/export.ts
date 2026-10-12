// src/main/export.ts — Exportación a Word, Excel y PDF (sección 6).
// Una sola fuente de verdad genera los tres formatos: lee los registros,
// calcula los totales con las reglas de src/core y rellena cada documento.

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  HeightRule,
  Footer,
  VerticalAlign,
  TableBorders,
} from 'docx';
import ExcelJS from 'exceljs';
import {
  fechasDelMes,
  formatearImporte,
  formatearDiaDocumento,
  formatearFechaExcel,
  calcularTotalesMes,
  esFuturo,
  MESES_ES,
  MESES_ES_MAYUSCULAS,
} from '../index';
import type { Mes, Trimestre } from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────────────────────────

export interface RegistroDia {
  income_cents: number | null;
  bizum: boolean | null;
  expense_cents: number | null;
}

export interface EstadoMes {
  closed_at: string | null;
  expenses_complete: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de la plantilla Word (sección 6.1)
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_SALMON = 'FBE3D6';
const COLOR_BIZUM = 'FFF2CC';
const COLOR_BORDE = '333333';
const ANCHO_TOTAL = 9638; // 17 cm en twips (1 cm ≈ 567 twips)
const ANCHOS_COL = [2608, 2495, 1701, 2835]; // Día 4.6, Ingresos 4.4, Bizum 3.0, Gastos 5.0 cm

const BORDE_FINO = {
  style: BorderStyle.SINGLE,
  size: 4, // 0.5 pt
  color: COLOR_BORDE,
};

const BORDES = {
  top: BORDE_FINO,
  bottom: BORDE_FINO,
  left: BORDE_FINO,
  right: BORDE_FINO,
};

// ─────────────────────────────────────────────────────────────────────────────
// Validaciones previas a exportar (sección 6.6)
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidacionExport {
  bloquea: boolean;
  avisos: string[];
  error?: string;
}

export function validarExportacion(
  year: number,
  mes: Mes,
  registros: Map<string, RegistroDia>,
  estado: EstadoMes,
): ValidacionExport {
  const avisos: string[] = [];
  const fechas = fechasDelMes(year, mes);
  let bloquea = false;
  let error: string | undefined;

  let gastosPendientes = 0;
  let diasPasadosSinIngreso = 0;
  let importesInvalidos = 0;

  for (const fecha of fechas) {
    const reg = registros.get(fecha);
    const futuro = esFuturo(fecha);

    // Gastos pendientes
    if (!reg || reg.expense_cents === null) {
      if (!futuro) gastosPendientes++;
    }

    // Días pasados sin ingreso registrado
    if (!reg || reg.income_cents === null) {
      if (!futuro) diasPasadosSinIngreso++;
    }

    // Importes fuera de rango
    if (reg) {
      if (reg.income_cents !== null && (reg.income_cents < 0 || reg.income_cents > 99_999_999)) {
        importesInvalidos++;
      }
      if (reg.expense_cents !== null && (reg.expense_cents < 0 || reg.expense_cents > 99_999_999)) {
        importesInvalidos++;
      }
    }
  }

  if (gastosPendientes > 0) {
    avisos.push(`Gastos pendientes de completar en ${gastosPendientes} días`);
  }
  if (diasPasadosSinIngreso > 0) {
    avisos.push(`${diasPasadosSinIngreso} días pasados sin ingreso registrado`);
  }
  if (!estado.closed_at) {
    avisos.push('Mes sin cerrar');
  }

  if (importesInvalidos > 0) {
    bloquea = true;
    error = `Hay ${importesInvalidos} importes no válidos o fuera de rango`;
  }

  return { bloquea, avisos, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Word mensual (sección 6.1)
// ─────────────────────────────────────────────────────────────────────────────

function crearTablaMensual(
  year: number,
  mes: Mes,
  registros: Map<string, RegistroDia>,
): Table {
  const fechas = fechasDelMes(year, mes);
  const totales = calcularTotalesMes(year, mes, registros);

  // Cabecera repite en cada página
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        borders: BORDES,
        shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
        width: { size: ANCHOS_COL[0], type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Día', bold: true })],
          }),
        ],
      }),
      new TableCell({
        borders: BORDES,
        width: { size: ANCHOS_COL[1], type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Ingresos (€)' })],
          }),
        ],
      }),
      new TableCell({
        borders: BORDES,
        width: { size: ANCHOS_COL[2], type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '¿Bizum?' })],
          }),
        ],
      }),
      new TableCell({
        borders: BORDES,
        width: { size: ANCHOS_COL[3], type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Gastos (€)' })],
          }),
        ],
      }),
    ],
  });

  // Filas de datos
  const filas = fechas.map((fecha: string) => {
    const reg = registros.get(fecha);
    const ingreso = reg?.income_cents != null ? formatearImporte(reg.income_cents) : '';
    const gasto = reg?.expense_cents != null ? formatearImporte(reg.expense_cents) : '';
    const bizum = reg?.bizum == null ? '' : reg.bizum ? 'SÍ' : 'NO';
    const esBizum = reg?.bizum === true;
  
    // Fila Bizum: todo en amarillo. Resto: solo la celda Día en salmón, como antes
    const fondoDia = { type: ShadingType.CLEAR, fill: COLOR_SALMON };
    const fondoResto = esBizum ? { type: ShadingType.CLEAR, fill: COLOR_BIZUM } : undefined;
  
    return new TableRow({
      height: { value: 369, rule: HeightRule.ATLEAST }, // 0.65 cm
      cantSplit: true,
      children: [
        new TableCell({
          borders: BORDES,
          shading: fondoDia,
          children: [
            new Paragraph({
              children: [new TextRun({ text: formatearDiaDocumento(fecha), bold: true, size: 20, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          borders: BORDES,
          shading: fondoResto,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: ingreso, size: 20, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          borders: BORDES,
          shading: fondoResto,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: bizum, size: 20, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          borders: BORDES,
          shading: fondoResto,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: gasto, size: 20, font: 'Arial' })],
            }),
          ],
        }),
      ],
    });
  });

  // Fila TOTAL (4 celdas: Día, Ingresos, Bizum, Gastos) - Bizum y Gastos vacíos
  const totalRow = new TableRow({
    children: [
      new TableCell({
        borders: BORDES,
        shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'TOTAL', bold: true, size: 20, font: 'Arial' })],
          }),
        ],
      }),
      new TableCell({
        borders: BORDES,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: formatearImporte(totales.totalIngresos), bold: true, size: 20, font: 'Arial' })],
          }),
        ],
      }),
      new TableCell({
        borders: BORDES,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '', bold: false, size: 20, font: 'Arial' })],
          }),
        ],
      }),
      new TableCell({
        borders: BORDES,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: '', bold: false, size: 20, font: 'Arial' })],
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: ANCHO_TOTAL, type: WidthType.DXA },
    rows: [headerRow, ...filas, totalRow],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportar Word mensual
// ─────────────────────────────────────────────────────────────────────────────

const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const SIN_BORDES = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE };

const celdaEtiqueta = (texto: string, ancho: number, cursiva = false) =>
  new TableCell({
    borders: BORDES,
    shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: ancho, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: texto, italics: cursiva, size: 20, font: 'Arial' })],
      }),
    ],
  });

const celdaValor = (texto: string, ancho: number) =>
  new TableCell({
    borders: BORDES,
    verticalAlign: VerticalAlign.CENTER,
    width: { size: ancho, type: WidthType.DXA },
    children: [
      new Paragraph({
        indent: { left: 113 },
        children: [new TextRun({ text: texto, size: 20, font: 'Arial' })],
      }),
    ],
  });

const celdaHueco = (ancho: number) =>
  new TableCell({
    borders: SIN_BORDES,
    width: { size: ancho, type: WidthType.DXA },
    children: [new Paragraph({})],
  });

export function generarWordMensual(
  year: number,
  mes: Mes,
  registros: Map<string, RegistroDia>,
  gastosPendientes: number,
  _estado: EstadoMes,
  businessName: string
): Document {
  const fechaGen = new Date().toLocaleDateString('es-ES');

  // Cabecera con dos recuadros: Mes (10.5 cm) y Año (5.5 cm)
  // Mes (etiqueta 1.6 cm + valor 9 cm) · hueco 0.7 cm · Año (etiqueta 1.5 cm + valor 4.2 cm)
const ANCHOS_CAB = [925, 5096, 387, 858, 2372]; // suman 9638

const headerTable = new Table({
  width: { size: ANCHO_TOTAL, type: WidthType.DXA },
  columnWidths: ANCHOS_CAB,
  borders: TableBorders.NONE,
  rows: [
    new TableRow({
      height: { value: 600, rule: HeightRule.ATLEAST },
      children: [
        celdaEtiqueta('Mes', ANCHOS_CAB[0]),
        celdaValor(MESES_ES_MAYUSCULAS[mes - 1], ANCHOS_CAB[1]),
        celdaHueco(ANCHOS_CAB[2]),
        celdaEtiqueta('Año', ANCHOS_CAB[3], true),
        celdaValor(String(year), ANCHOS_CAB[4]),
      ],
    }),
  ],
});

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }, // 2 cm
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: businessName, size: 16, font: 'Arial' })],
              }),
            ],
          }),
        },
        children: [
          headerTable,
          new Paragraph({ text: '' }),
          crearTablaMensual(year, mes, registros),
          new Paragraph({
            children: [],
          }),
        ],
      },
    ],
  });

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nombres de archivo (sección 6.2)
// ─────────────────────────────────────────────────────────────────────────────

export function nombreArchivoMensual(mes: Mes, year: number, _negocio: string): string {
  const mesNombre = MESES_ES_MAYUSCULAS[mes - 1];
  return `Ingresos_Gastos_${mesNombre}_${year}.docx`;
}

export function nombreArchivoTrimestral(trimestre: Trimestre, year: number, _negocio: string): string {
  return `Ingresos_Gastos_${year}_T${trimestre}.docx`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Word trimestral (sección 6.2)
// ─────────────────────────────────────────────────────────────────────────────

export function generarWordTrimestral(
  year: number,
  trimestre: Trimestre,
  meses: Mes[],
  registrosPorMes: Map<Mes, Map<string, RegistroDia>>,
  estadosPorMes: Map<Mes, EstadoMes>,
  businessName: string
): Document {
  const fechaGen = new Date().toLocaleDateString('es-ES');

  // Portada
  const portada: Paragraph[] = [
    new Paragraph({ text: businessName, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `Ingresos y gastos — T${trimestre} ${year}`, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `Generado el ${fechaGen}`, alignment: AlignmentType.CENTER }),
  ];

  // Tablas de los tres meses (cada uno en sección nueva)
  const secciones = meses.map((mes) => {
    const registros = registrosPorMes.get(mes) ?? new Map();
    const fechas = fechasDelMes(year, mes);
    let gastosPendientes = 0;
    for (const f of fechas) {
      const reg = registros.get(f);
      if ((!reg || reg.expense_cents === null) && !esFuturo(f)) gastosPendientes++;
    }

    return {
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: [
        new Paragraph({ text: `${MESES_ES_MAYUSCULAS[mes - 1]} ${year}`, alignment: AlignmentType.CENTER }),
        crearTablaMensual(year, mes, registros),
      ],
    };
  });

  // Resumen trimestral
  const filasResumen = meses.map((mes) => {
    const registros = registrosPorMes.get(mes) ?? new Map();
    const totales = calcularTotalesMes(year, mes, registros);
    const fechas = fechasDelMes(year, mes);
    let diasConIngreso = 0;
    for (const f of fechas) {
      const reg = registros.get(f);
      if (reg && reg.income_cents != null) diasConIngreso++;
    }
    return new TableRow({
      children: [
        new TableCell({ borders: BORDES, children: [new Paragraph({ text: MESES_ES_MAYUSCULAS[mes - 1] })] }),
        new TableCell({ borders: BORDES, children: [new Paragraph({ text: formatearImporte(totales.totalIngresos) })] }),
        new TableCell({ borders: BORDES, children: [new Paragraph({ text: formatearImporte(totales.totalGastos) })] }),
        new TableCell({ borders: BORDES, children: [new Paragraph({ text: String(diasConIngreso) })] }),
        new TableCell({ borders: BORDES, children: [new Paragraph({ text: String(totales.diasConBizum) })] }),
        new TableCell({
          borders: BORDES,
          children: [new Paragraph({ text: estadosPorMes.get(mes)?.expenses_complete ? 'Completo' : 'Pendiente' })],
        }),
      ],
    });
  });

  // Balance
  const todosCompletos = meses.every((m) => estadosPorMes.get(m)?.expenses_complete === true);
  const totalIngr = meses.reduce(
    (acc, m) => acc + calcularTotalesMes(year, m, registrosPorMes.get(m) ?? new Map()).totalIngresos,
    0
  );
  const totalGast = meses.reduce(
    (acc, m) => acc + calcularTotalesMes(year, m, registrosPorMes.get(m) ?? new Map()).totalGastos,
    0
  );
  const balanceTexto = todosCompletos
    ? `Balance: ${formatearImporte(totalIngr - totalGast)}`
    : `Balance provisional: ${formatearImporte(totalIngr - totalGast)} — meses incompletos: ${meses
        .filter((m) => !estadosPorMes.get(m)?.expenses_complete)
        .map((m) => MESES_ES[m - 1])
        .join(', ')}`;

  return new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: portada,
      },
      ...secciones,
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: [
          new Paragraph({ text: `Resumen T${trimestre} ${year}`, alignment: AlignmentType.CENTER }),
          new Table({
            width: { size: ANCHO_TOTAL, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: BORDES,
                    shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
                    children: [new Paragraph({ text: 'Mes' })],
                  }),
                  new TableCell({
                    borders: BORDES,
                    shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
                    children: [new Paragraph({ text: 'Ingresos' })],
                  }),
                  new TableCell({
                    borders: BORDES,
                    shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
                    children: [new Paragraph({ text: 'Gastos' })],
                  }),
                  new TableCell({
                    borders: BORDES,
                    shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
                    children: [new Paragraph({ text: 'Días ingreso' })],
                  }),
                  new TableCell({
                    borders: BORDES,
                    shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
                    children: [new Paragraph({ text: 'Días Bizum' })],
                  }),
                  new TableCell({
                    borders: BORDES,
                    shading: { type: ShadingType.CLEAR, fill: COLOR_SALMON },
                    children: [new Paragraph({ text: 'Estado' })],
                  }),
                ],
              }),
              ...filasResumen,
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: balanceTexto }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Documento informativo, no sustituye a los libros registro ni a las declaraciones fiscales.',
                size: 16,
                font: 'Arial',
              }),
              new TextRun({ text: ` — Generado el ${fechaGen}`, size: 16, font: 'Arial' }),
            ],
          }),
        ],
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel (sección 6.3)
// ─────────────────────────────────────────────────────────────────────────────

export async function generarExcelTrimestral(
  year: number,
  meses: Mes[],
  registrosPorMes: Map<Mes, Map<string, RegistroDia>>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const mes of meses) {
    const registros = registrosPorMes.get(mes) ?? new Map();
    const sheet = workbook.addWorksheet(`${MESES_ES[mes - 1]} ${year}`);
    const fechas = fechasDelMes(year, mes);

    // Cabecera
    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 22 },
      { header: 'Día', key: 'dia', width: 20 },
      { header: 'Ingresos (€)', key: 'ingresos', width: 16 },
      { header: '¿Bizum?', key: 'bizum', width: 10 },
      { header: 'Gastos (€)', key: 'gastos', width: 16 },
    ];

    // Fila de cabecera con formato
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SALMON } };
      cell.font = { bold: true };
    });

    // Filas de datos
    let filaNum = 2;
    for (const fecha of fechas) {
      const reg = registros.get(fecha);
      const [a, m, d] = fecha.split('-');
      sheet.getCell(`A${filaNum}`).value = new Date(Date.UTC(parseInt(a), parseInt(m) - 1, parseInt(d)));
      sheet.getCell(`A${filaNum}`).numFmt = 'dd/mm/yyyy';
      sheet.getCell(`B${filaNum}`).value = formatearFechaExcel(fecha);

      if (reg?.income_cents != null) {
        const cell = sheet.getCell(`C${filaNum}`);
        cell.value = reg.income_cents / 100;
        cell.numFmt = '#.##0,00 €';
      }
      if (reg?.bizum != null) {
        sheet.getCell(`D${filaNum}`).value = reg.bizum ? 'SÍ' : 'NO';
      }
      if (reg?.expense_cents != null) {
        const cell = sheet.getCell(`E${filaNum}`);
        cell.value = reg.expense_cents / 100;
        cell.numFmt = '#.##0,00 €';
      }
      if (reg?.bizum === true) {
        for (let col = 1; col <= 5; col++) {
          sheet.getCell(filaNum, col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' },
          };
        }
      }
      filaNum++;
    }

    // Fila TOTAL con fórmulas SUMA
    const totalRow = sheet.getRow(filaNum);
    totalRow.getCell(1).value = 'TOTAL';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(3).value = { formula: `SUM(C2:C${filaNum - 1})`, result: 0 };
    totalRow.getCell(3).numFmt = '#.##0,00 €';
    totalRow.getCell(3).font = { bold: true };
    totalRow.getCell(5).value = { formula: `SUM(E2:E${filaNum - 1})`, result: 0 };
    totalRow.getCell(5).numFmt = '#.##0,00 €';
    totalRow.getCell(5).font = { bold: true };

    // Congelar fila de cabecera
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}