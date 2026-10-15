import React, { useState, useEffect, useCallback } from 'react';
import {
  NativeSelect,
  Button,
  Group,
  HStack,
  Table,
  Input,
  Text,
  Badge,
  InputGroup,
  ScrollArea,
  Alert,
  Stat,
  SimpleGrid,
  Field,
  Breadcrumb,
  VStack,
  Box,
  Icon,
  Card,
  Spinner,
  Heading,
} from '@chakra-ui/react';
import { FaFileWord, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import { Toaster, toaster } from './toaster';
import {
  trimestreDeMes,
  mesesDeTrimestre,
  fechasDelMes,
  diaDeLaSemana,
  parsearImporte,
  formatearImporte,
  calcularTotalesMes,
  hoyEnMadrid,
  esFuturo,
  MESES_ES,
  MESES_ES_MAYUSCULAS,
} from '../index';
import type { Mes } from '../index';
import type { DayEntry, MonthStatus, AuditEntry, Settings } from '../preload';
import './types';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDatabase,
  FiDownload,
  FiFolder,
  FiLock,
  FiTrendingDown,
  FiTrendingUp,
  FiUpload,
  FiX,
} from 'react-icons/fi';

type RegistroMap = Map<string, DayEntry>;

type Pantalla = 'mes' | 'trimestre' | 'historial' | 'ajustes';

interface CampoImporteProps {
  valor: string; // valor ya guardado y formateado
  onGuardar: (texto: string) => void;
}

const CampoImporte: React.FC<CampoImporteProps> = ({ valor, onGuardar }) => {
  const [texto, setTexto] = useState(valor);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!editando) setTexto(valor);
  }, [valor, editando]);

  const confirmar = () => {
    setEditando(false);
    if (texto.trim() !== valor.trim()) onGuardar(texto);
  };

  return (
    <InputGroup endElement="€">
      <Input
        size="sm"
        textAlign="end"
        inputMode="decimal"
        value={texto}
        placeholder="—"
        onFocus={(e) => {
          setEditando(true);
          e.currentTarget.select();
        }}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </InputGroup>
  );
};

interface FilaResumen {
  mes: number;
  ingresos: number;
  gastos: number;
  diasConIngreso: number;
  diasBizum: number;
  gastosCompletos: boolean;
}

interface ResumenTrimestreProps {
  año: number;
  trimestreInicial: number;
  electron: typeof window.electron | undefined;
}

const ResumenTrimestre: React.FC<ResumenTrimestreProps> = ({ año, trimestreInicial, electron }) => {
  const [trimestre, setTrimestre] = useState(trimestreInicial);
  const [filas, setFilas] = useState<FilaResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      if (!electron) return;
      setCargando(true);
      const meses = mesesDeTrimestre(trimestre as 1 | 2 | 3 | 4);

      const resultado: FilaResumen[] = await Promise.all(
        meses.map(async (mes) => {
          const entries: DayEntry[] = await electron.getMonthEntries(año, mes);
          const st = await electron.getMonthStatus(año, mes);
          const mapa = new Map<string, DayEntry>();
          for (const e of entries) mapa.set(e.date, e);
          const t = calcularTotalesMes(año, mes, mapa);

          return {
            mes,
            ingresos: t.totalIngresos,
            gastos: t.totalGastos,
            diasConIngreso: entries.filter((e) => e.income_cents != null && e.income_cents > 0).length,
            diasBizum: t.diasConBizum,
            gastosCompletos: st.expenses_complete,
          };
        })
      );

      if (!cancelado) {
        setFilas(resultado);
        setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [año, trimestre, electron]);

  const totalIngresos = filas.reduce((acc, f) => acc + f.ingresos, 0);
  const totalGastos = filas.reduce((acc, f) => acc + f.gastos, 0);
  const incompletos = filas.filter((f) => !f.gastosCompletos);
  const balanceDefinitivo = filas.length > 0 && incompletos.length === 0;

  return (
    <section>
      <VStack align="stretch" gap={6}>
        {/* Cabecera con título y selector de trimestre */}
        <HStack justify="space-between" align="center" wrap="wrap" gap={4}>
          <HStack gap={2}>
            <Icon color="colorPalette.solid" fontSize="xl">
              <FiCalendar />
            </Icon>
            <Text fontSize="2xl" fontWeight="bold" letterSpacing="tight">
              Resumen del trimestre · {año}
            </Text>
          </HStack>

          <NativeSelect.Root width="160px" size="sm">
            <NativeSelect.Field
              value={trimestre}
              onChange={(e) => setTrimestre(parseInt(e.currentTarget.value, 10))}
              fontWeight="medium"
            >
              <option value={1}>T1 (ene-mar)</option>
              <option value={2}>T2 (abr-jun)</option>
              <option value={3}>T3 (jul-sep)</option>
              <option value={4}>T4 (oct-dic)</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>

        {cargando ? (
          <Box p={8} textAlign="center" borderWidth="1px" borderRadius="xl" bg="bg.subtle">
            <HStack justify="center" gap={3}>
              <Spinner size="sm" />
              <Text color="fg.muted" fontWeight="medium">
                Cargando datos del trimestre...
              </Text>
            </HStack>
          </Box>
        ) : (
          <>
            {/* Tarjetas de Estadísticas (Stats) */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
              {/* Ingresos */}
              <Card.Root p={4} borderWidth="1px" borderRadius="xl" shadow="xs">
                <Stat.Root>
                  <HStack justify="space-between" align="center" mb={1}>
                    <Stat.Label fontSize="sm" color="fg.muted" fontWeight="medium">
                      Ingresos Totales
                    </Stat.Label>
                    <Icon color="green.500" fontSize="lg">
                      <FiTrendingUp />
                    </Icon>
                  </HStack>
                  <Stat.ValueText fontSize="2xl" fontWeight="bold" color="green.600">
                    {formatearImporte(totalIngresos)}
                  </Stat.ValueText>
                </Stat.Root>
              </Card.Root>

              {/* Gastos */}
              <Card.Root p={4} borderWidth="1px" borderRadius="xl" shadow="xs">
                <Stat.Root>
                  <HStack justify="space-between" align="center" mb={1}>
                    <Stat.Label fontSize="sm" color="fg.muted" fontWeight="medium">
                      Gastos Totales
                    </Stat.Label>
                    <Icon color="red.500" fontSize="lg">
                      <FiTrendingDown />
                    </Icon>
                  </HStack>
                  <Stat.ValueText fontSize="2xl" fontWeight="bold" color="red.600">
                    {formatearImporte(totalGastos)}
                  </Stat.ValueText>
                </Stat.Root>
              </Card.Root>

              {/* Balance */}
              <Card.Root p={4} borderWidth="1px" borderRadius="xl" shadow="xs">
                <Stat.Root>
                  <HStack justify="space-between" align="center" mb={1}>
                    <Stat.Label fontSize="sm" color="fg.muted" fontWeight="medium">
                      Balance
                    </Stat.Label>
                    <Badge variant="subtle" colorPalette={balanceDefinitivo ? 'green' : 'orange'} size="sm">
                      {balanceDefinitivo ? 'Definitivo' : 'Provisional'}
                    </Badge>
                  </HStack>
                  <Stat.ValueText
                    fontSize="2xl"
                    fontWeight="bold"
                    color={totalIngresos - totalGastos >= 0 ? 'blue.600' : 'red.600'}
                  >
                    {formatearImporte(totalIngresos - totalGastos)}
                  </Stat.ValueText>
                </Stat.Root>
              </Card.Root>
            </SimpleGrid>

            {/* Aviso si el balance es provisional */}
            {!balanceDefinitivo && (
              <Box
                p={3}
                px={4}
                bg="orange.50"
                _dark={{ bg: 'orange.950', borderColor: 'orange.800' }}
                borderWidth="1px"
                borderColor="orange.200"
                borderRadius="lg"
              >
                <HStack gap={2} align="center">
                  <Icon color="orange.600">
                    <FiAlertTriangle />
                  </Icon>
                  <Text fontSize="sm" color="orange.800" _dark={{ color: 'orange.200' }}>
                    <strong>Gastos pendientes de completar en:</strong>{' '}
                    {incompletos.map((f) => MESES_ES[f.mes - 1]).join(', ')}
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Tabla del Desglose Mensual */}
            <Box borderWidth="1px" borderRadius="xl" overflow="hidden" shadow="sm">
              <Table.Root size="sm" variant="outline" interactive striped>
                <Table.Header bg="bg.subtle">
                  <Table.Row>
                    <Table.ColumnHeader fontWeight="bold">Mes</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end" fontWeight="bold">
                      Ingresos
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end" fontWeight="bold">
                      Gastos
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center" fontWeight="bold">
                      Días con ingreso
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center" fontWeight="bold">
                      Días Bizum
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center" fontWeight="bold">
                      Estado Gastos
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filas.map((f) => (
                    <Table.Row key={f.mes}>
                      <Table.Cell fontWeight="medium">{MESES_ES[f.mes - 1]}</Table.Cell>
                      <Table.Cell textAlign="end" fontWeight="medium" color="green.600">
                        {formatearImporte(f.ingresos)}
                      </Table.Cell>
                      <Table.Cell textAlign="end" fontWeight="medium" color="red.600">
                        {formatearImporte(f.gastos)}
                      </Table.Cell>
                      <Table.Cell textAlign="center">{f.diasConIngreso}</Table.Cell>
                      <Table.Cell textAlign="center">{f.diasBizum}</Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette={f.gastosCompletos ? 'green' : 'orange'} variant="subtle" size="sm">
                          {f.gastosCompletos ? 'Completo' : 'Pendiente'}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
                <Table.Footer bg="bg.subtle">
                  <Table.Row fontWeight="bold">
                    <Table.Cell>TOTAL TRIMESTRE</Table.Cell>
                    <Table.Cell textAlign="end" color="green.600" fontSize="sm">
                      {formatearImporte(totalIngresos)}
                    </Table.Cell>
                    <Table.Cell textAlign="end" color="red.600" fontSize="sm">
                      {formatearImporte(totalGastos)}
                    </Table.Cell>
                    <Table.Cell textAlign="center">{filas.reduce((a, f) => a + f.diasConIngreso, 0)}</Table.Cell>
                    <Table.Cell textAlign="center">{filas.reduce((a, f) => a + f.diasBizum, 0)}</Table.Cell>
                    <Table.Cell />
                  </Table.Row>
                </Table.Footer>
              </Table.Root>
            </Box>
          </>
        )}
      </VStack>
    </section>
  );
};

const App: React.FC = () => {
  const hoy = hoyEnMadrid();
  const añoActual = parseInt(hoy.slice(0, 4), 10);
  const mesActual = parseInt(hoy.slice(5, 7), 10);

  const [año, setAño] = useState<number>(añoActual);
  const [, setTrimestre] = useState<number>(trimestreDeMes(mesActual));
  const [registros, setRegistros] = useState<RegistroMap>(new Map());
  const [status, setStatus] = useState<MonthStatus>({ closed_at: null, expenses_complete: false });
  const [mesActualVista, setMesActualVista] = useState<number>(mesActual);
  const setMensaje = (texto: string, tipo: 'success' | 'error' | 'info' = 'success') => {
    if (!texto) return; // los setMensaje('') antiguos se ignoran
    toaster.create({
      description: texto,
      type: tipo,
      duration: tipo === 'error' ? 5000 : 3000,
    });
  };
  const [pantalla, setPantalla] = useState<Pantalla>('mes');
  const [historial, setHistorial] = useState<AuditEntry[]>([]);
  const [ajustes, setAjustes] = useState<Settings | null>(null);
  const [copiaAtrasada, setCopiaAtrasada] = useState(false);

  // Helper para acceder a window.electron de forma segura
  const electron = window.electron;
  const electronDisponible = !!electron;

  if (!electronDisponible) {
    console.error('[renderer] window.electron no está disponible. El script de preload no se cargó correctamente.');
  }

  const cargarDatos = useCallback(
    async (year: number, month: number) => {
      if (electron) {
        const entries: DayEntry[] = await electron.getMonthEntries(year, month);
        const st = await electron.getMonthStatus(year, month);
        const map = new Map<string, DayEntry>();
        for (const e of entries) map.set(e.date, e);
        setRegistros(map);
        setStatus(st);
      } else {
        setMensaje('Error: API de electron no disponible', 'error');
      }
    },
    [electron]
  );

  useEffect(() => {
    if (electron && año && mesActualVista) {
      cargarDatos(año, mesActualVista);
    }
  }, [año, mesActualVista, cargarDatos, electron]);

  useEffect(() => {
    if (electron) {
      if (pantalla === 'historial') {
        electron.getAuditLog().then(setHistorial);
      } else if (pantalla === 'ajustes') {
        electron.getSettings().then(setAjustes);
      }
    }
  }, [pantalla, electron]);

  useEffect(() => {
    if (electron) {
      electron.checkBackupStale().then((r) => setCopiaAtrasada(r.stale));
    }
  }, [electron]);

  const totales = calcularTotalesMes(
    año,
    mesActualVista as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
    registros
  );

  const cambiarMes = (mes: number) => {
    setMesActualVista(mes);
    setTrimestre(trimestreDeMes(mes));
  };

  const cambiarAño = (y: number) => {
    setAño(y);
  };

  const actualizarRegistro = (fecha: string, entry: DayEntry) => {
    setRegistros((prev) => {
      const next = new Map(prev);
      next.set(fecha, entry);
      return next;
    });
  };

  const refrescarEntrada = async (fecha: string) => {
    if (!electron) return;
    const entries: DayEntry[] = await electron.getMonthEntries(año, mesActualVista);
    const entry = entries.find((e: DayEntry) => e.date === fecha);
    if (entry) actualizarRegistro(fecha, entry);
  };

  const guardarIngreso = async (fecha: string, valor: string) => {
    if (!electron) {
      setMensaje('Error: API de electron no disponible. Reinicia la aplicación.', 'error');
      return;
    }
    try {
      const centimos = parsearImporte(valor);
      const old = registros.get(fecha) ?? null;
      let newBizum = old?.bizum ?? null;
      if (centimos === null) newBizum = null;
      else if (centimos === 0) newBizum = false;
      else if (old?.bizum === null || old?.bizum === undefined) newBizum = false;

      await electron.saveDay(
        fecha,
        centimos,
        newBizum,
        old?.expense_cents ?? null,
        'income_cents',
        old?.income_cents != null ? String(old.income_cents) : null
      );
      await refrescarEntrada(fecha);
      setMensaje('Guardado');
      setTimeout(() => setMensaje(''), 2000);
    } catch (e: unknown) {
      setMensaje(e instanceof Error ? e.message : 'Error', 'error');
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const guardarGasto = async (fecha: string, valor: string) => {
    if (!electron) {
      setMensaje('Error: API de electron no disponible. Reinicia la aplicación.', 'error');
      return;
    }
    try {
      const centimos = parsearImporte(valor);
      const old = registros.get(fecha) ?? null;

      await electron.saveDay(
        fecha,
        old?.income_cents ?? null,
        old?.bizum ?? null,
        centimos,
        'expense_cents',
        old?.expense_cents != null ? String(old.expense_cents) : null
      );
      await refrescarEntrada(fecha);

      if (status.expenses_complete) {
        await electron.setExpensesComplete(año, mesActualVista, false);
        setStatus((prev) => ({ ...prev, expenses_complete: false }));
      }

      setMensaje('Guardado');
      setTimeout(() => setMensaje(''), 2000);
    } catch (e: unknown) {
      setMensaje(e instanceof Error ? e.message : 'Error', 'error');
      setTimeout(() => setMensaje(''), 2000);
    }
  };

  const fechas = fechasDelMes(año, mesActualVista as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12);
  const diasPendientes = fechas.filter((f) => {
    const reg = registros.get(f);
    if (!reg || reg.income_cents === null) return !esFuturo(f);
    return false;
  }).length;

  const diasGastosPendientes = fechas.filter((f) => {
    const reg = registros.get(f);
    if (!reg || reg.expense_cents === null) return !esFuturo(f);
    return false;
  }).length;

  return (
    <div className="app">
      <header style={{ gap: '16px', padding: '24px 30px' }}>
        <div className="header-left" style={{ flex: 1 }}>
          <div className="selector-group" style={{ gap: '12px', marginBottom: '24px' }}>
            <NativeSelect.Root width="120px">
              <NativeSelect.Field value={año} onChange={(e) => cambiarAño(parseInt(e.currentTarget.value, 10))}>
                {Array.from({ length: 10 }, (_, i) => añoActual - 5 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <NativeSelect.Root width="160px">
              <NativeSelect.Field
                value={mesActualVista}
                onChange={(e) => {
                  const nuevoMes = parseInt(e.currentTarget.value, 10);
                  setMesActualVista(nuevoMes);
                  cambiarMes(nuevoMes);
                }}
              >
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </div>
        </div>
        <div className="header-right" style={{ gap: '16px', alignItems: 'center' }}>
          <HStack gap="2">
            <Button variant={pantalla === 'mes' ? 'solid' : 'outline'} onClick={() => setPantalla('mes')}>
              Mes
            </Button>
            <Button variant={pantalla === 'trimestre' ? 'solid' : 'outline'} onClick={() => setPantalla('trimestre')}>
              Trimestre
            </Button>
            <Button variant={pantalla === 'historial' ? 'solid' : 'outline'} onClick={() => setPantalla('historial')}>
              Historial
            </Button>
            <Button variant={pantalla === 'ajustes' ? 'solid' : 'outline'} onClick={() => setPantalla('ajustes')}>
              Copias y ajustes
            </Button>
          </HStack>
          <Toaster />
        </div>
      </header>

      <main className="main">
        {copiaAtrasada && (
          <p className="aviso-banner">
            <span className="icono-advertencia" aria-hidden="true">
              ⚠
            </span>
            <span className="texto">
              La copia de seguridad está atrasada (más de 7 días). Ve a «Copias y ajustes» para crear una.
            </span>
          </p>
        )}

        {pantalla === 'historial' && (
          <section>
            <VStack align="stretch" gap={6}>
              {/* Cabecera de la sección */}
              <HStack justify="space-between" align="center">
                <HStack gap={2}>
                  <Icon color="colorPalette.solid" fontSize="xl">
                    <FiClock />
                  </Icon>
                  <Text fontSize="2xl" fontWeight="bold" letterSpacing="tight">
                    Historial de cambios
                  </Text>
                </HStack>
                {historial.length > 0 && (
                  <Badge variant="subtle" size="md">
                    {historial.length} {historial.length === 1 ? 'registro' : 'registros'}
                  </Badge>
                )}
              </HStack>

              {/* Condicional: Sin registros vs Tabla con registros */}
              {historial.length === 0 ? (
                <Box p={8} borderWidth="1px" borderRadius="xl" borderStyle="dashed" bg="bg.subtle" textAlign="center">
                  <VStack gap={2}>
                    <Icon fontSize="3xl" color="fg.muted">
                      <FiClock />
                    </Icon>
                    <Text fontWeight="medium" fontSize="md">
                      No hay cambios registrados
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Cualquier modificación que realices aparecerá reflejada aquí.
                    </Text>
                  </VStack>
                </Box>
              ) : (
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden" shadow="sm">
                  <Table.Root variant="outline" interactive striped size="sm">
                    <Table.Header bg="bg.subtle">
                      <Table.Row>
                        <Table.ColumnHeader fontWeight="bold">Fecha Registro</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="bold">Campo</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="bold">Valor Anterior</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="bold">Valor Nuevo</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="bold">Realizado En</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {historial.map((h) => (
                        <Table.Row key={h.id}>
                          <Table.Cell fontWeight="medium">{h.entry_date}</Table.Cell>
                          <Table.Cell>
                            <Badge variant="outline" colorPalette="blue" size="sm">
                              {h.field}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {h.old_value ? (
                              <Badge variant="subtle" colorPalette="red" size="sm">
                                {h.old_value}
                              </Badge>
                            ) : (
                              <Text color="fg.muted" fontSize="xs">
                                —
                              </Text>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            {h.new_value ? (
                              <Badge variant="subtle" colorPalette="green" size="sm">
                                {h.new_value}
                              </Badge>
                            ) : (
                              <Text color="fg.muted" fontSize="xs">
                                —
                              </Text>
                            )}
                          </Table.Cell>
                          <Table.Cell color="fg.muted" fontSize="xs">
                            {h.at}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )}
            </VStack>
          </section>
        )}

        {pantalla === 'trimestre' && (
          <ResumenTrimestre año={año} trimestreInicial={trimestreDeMes(mesActualVista)} electron={electron} />
        )}

        {pantalla === 'ajustes' && ajustes && (
          <section>
            <VStack align="stretch" gap={6}>
              {/* Título de la sección */}
              <Text fontSize="2xl" fontWeight="bold" letterSpacing="tight">
                Copias y ajustes
              </Text>

              {/* Nombre del negocio */}
              <Field.Root required>
                <Field.Label>
                  Nombre del negocio: <Field.RequiredIndicator />
                </Field.Label>
                <Input
                  type="text"
                  defaultValue={ajustes.business_name}
                  onBlur={async (e) => {
                    await window.electron.saveSettings({ business_name: e.target.value });
                    setMensaje('Guardado');
                    setTimeout(() => setMensaje(''), 2000);
                  }}
                />
              </Field.Root>

              {/* Sección de Copia de Seguridad */}
              <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.subtle" shadow="sm">
                <VStack align="stretch" gap={3}>
                  <Text fontWeight="medium" fontSize="sm" color="fg.muted">
                    Ubicación de la Copia de Seguridad:
                  </Text>

                  {/* Breadcrumb optimizado con icono */}
                  <Breadcrumb.Root>
                    <Breadcrumb.List>
                      <Breadcrumb.Item>
                        <Breadcrumb.Link href="#">
                          <FiFolder style={{ display: 'inline', marginRight: '6px' }} />
                          Raíz
                        </Breadcrumb.Link>
                      </Breadcrumb.Item>
                      <Breadcrumb.Separator />

                      {ajustes.backup_folder ? (
                        ajustes.backup_folder
                          .split('/')
                          .filter(Boolean)
                          .map((folder, index, arr) => {
                            const isLast = index === arr.length - 1;
                            return (
                              <React.Fragment key={index}>
                                <Breadcrumb.Item>
                                  <Breadcrumb.Link href="#">{folder}</Breadcrumb.Link>
                                </Breadcrumb.Item>
                                {!isLast && <Breadcrumb.Separator />}
                              </React.Fragment>
                            );
                          })
                      ) : (
                        <Breadcrumb.Item>
                          <Breadcrumb.Link color="fg.subtle">Sin carpeta asignada</Breadcrumb.Link>
                        </Breadcrumb.Item>
                      )}
                    </Breadcrumb.List>
                  </Breadcrumb.Root>

                  {/* Botón para cambiar carpeta */}
                  <Button
                    size="sm"
                    variant="surface"
                    alignSelf="flex-start"
                    mt={2}
                    onClick={async () => {
                      const folder = await window.electron.selectBackupFolder();
                      if (folder) {
                        await window.electron.saveSettings({ backup_folder: folder });
                        setAjustes({ ...ajustes, backup_folder: folder });
                      }
                    }}
                  >
                    <FiFolder /> Elegir carpeta
                  </Button>
                </VStack>
              </Box>

              {/* Botones de acciones de respaldo */}
              <VStack align="stretch" gap={3}>
                <Button
                  variant="solid"
                  colorScheme="primary"
                  onClick={async () => {
                    const result = await window.electron.createAutoBackup();
                    setMensaje(result.path ? `Copia creada: ${result.path}` : 'Sin carpeta de copias');
                    setTimeout(() => setMensaje(''), 4000);
                  }}
                >
                  <FiDatabase /> Crear copia ahora
                </Button>

                {/* Grupo horizontal para Exportar e Importar */}
                <HStack gap={3} width="full">
                  <Button
                    flex={1}
                    variant="outline"
                    onClick={async () => {
                      const result = await window.electron.exportBackupDialog();
                      if (result.success) setMensaje('Copia exportada');
                    }}
                  >
                    <FiDownload /> Exportar copia
                  </Button>

                  <Button
                    flex={1}
                    variant="outline"
                    onClick={async () => {
                      const result = await window.electron.importBackupDialog();
                      if (result.success) {
                        await cargarDatos(año, mesActualVista);
                        window.electron.getSettings().then(setAjustes);
                        window.electron.checkBackupStale().then((r) => setCopiaAtrasada(r.stale));
                        setMensaje('Copia importada');
                      }
                    }}
                  >
                    <FiUpload /> Importar copia
                  </Button>
                </HStack>
              </VStack>
            </VStack>
          </section>
        )}

        {pantalla === 'mes' && (
          <VStack align="stretch" gap={6}>
            {/* Encabezado del Mes */}
            <HStack justify="space-between" align="center" wrap="wrap" gap={3} pb={3} borderBottomWidth="1px">
              <HStack gap={3} align="center">
                <Heading size="2xl" fontWeight="bold" letterSpacing="tight">
                  {MESES_ES_MAYUSCULAS[mesActualVista - 1]} {año}
                </Heading>

                {status.closed_at && (
                  <Badge colorPalette="gray" variant="solid" size="md">
                    <FiLock style={{ marginRight: '4px' }} /> Cerrado
                  </Badge>
                )}

                {diasPendientes > 0 && (
                  <Badge colorPalette="orange" variant="subtle" size="md">
                    ● {diasPendientes} días pendientes
                  </Badge>
                )}
              </HStack>
            </HStack>

            {/* Tarjeta Contenedora Principal */}
            <Card.Root p={{ base: 4, md: 6 }} borderRadius="xl" shadow="sm" bg="bg.panel">
              <VStack align="stretch" gap={6}>
                {/* Tabla Scrollable */}
                <ScrollArea.Root height="65vh" borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <ScrollArea.Viewport>
                    <ScrollArea.Content>
                      <Table.Root size="sm" stickyHeader interactive striped>
                        <Table.Header bg="bg.subtle">
                          <Table.Row>
                            <Table.ColumnHeader fontWeight="bold">Día</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end" fontWeight="bold">
                              Ingresos (€)
                            </Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="center" fontWeight="bold">
                              ¿Bizum?
                            </Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end" fontWeight="bold">
                              Gastos (€)
                            </Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>

                        <Table.Body>
                          {fechas.map((fecha) => {
                            const reg = registros.get(fecha);
                            const futuro = esFuturo(fecha);
                            const cerrado = !!status.closed_at;
                            const ingresoValor =
                              reg?.income_cents != null ? formatearImporte(reg.income_cents).replace(' €', '') : '';
                            const gastoValor =
                              reg?.expense_cents != null ? formatearImporte(reg.expense_cents).replace(' €', '') : '';

                            return (
                              <Table.Row
                                key={futuro ? `${fecha}-futuro` : fecha}
                                opacity={futuro ? 0.4 : 1}
                                _hover={{ bg: futuro ? 'transparent' : 'bg.subtle' }}
                              >
                                {/* Fecha */}
                                <Table.Cell fontWeight="medium" color="fg.muted">
                                  {fecha.slice(8, 10)} — {diaDeLaSemana(fecha)}
                                </Table.Cell>

                                {/* Columna Ingresos */}
                                <Table.Cell textAlign="end">
                                  {cerrado ? (
                                    <Text fontWeight="medium">
                                      {reg?.income_cents != null ? formatearImporte(reg.income_cents) : '—'}
                                    </Text>
                                  ) : (
                                    <InputGroup endElement="€">
                                      <CampoImporte valor={ingresoValor} onGuardar={(t) => guardarIngreso(fecha, t)} />
                                    </InputGroup>
                                  )}
                                </Table.Cell>

                                {/* Columna Bizum */}
                                <Table.Cell textAlign="center">
                                  {cerrado ? (
                                    <Text fontSize="xs" fontWeight="bold">
                                      {reg?.bizum == null ? '—' : reg.bizum ? 'SÍ' : 'NO'}
                                    </Text>
                                  ) : (
                                    <Button
                                      size="xs"
                                      minW="64px"
                                      variant={reg?.bizum === true ? 'solid' : 'outline'}
                                      colorPalette={reg?.bizum === true ? 'green' : 'gray'}
                                      disabled={reg?.income_cents == null || reg.income_cents === 0}
                                      onClick={async () => {
                                        if (!electron) {
                                          setMensaje(
                                            'Error: API de electron no disponible. Reinicia la aplicación.',
                                            'error'
                                          );
                                          return;
                                        }
                                        const newBizum = !(reg?.bizum === true);
                                        await electron.saveDay(
                                          fecha,
                                          reg?.income_cents ?? null,
                                          newBizum,
                                          reg?.expense_cents ?? null,
                                          'bizum',
                                          reg?.bizum != null ? String(reg.bizum) : null
                                        );
                                        await refrescarEntrada(fecha);
                                      }}
                                    >
                                      {reg?.bizum == null ? (
                                        '—'
                                      ) : reg.bizum ? (
                                        <HStack gap={1} align="center">
                                          <FiCheck /> SÍ
                                        </HStack>
                                      ) : (
                                        <HStack gap={1} align="center">
                                          <FiX /> NO
                                        </HStack>
                                      )}
                                    </Button>
                                  )}
                                </Table.Cell>

                                {/* Columna Gastos */}
                                <Table.Cell textAlign="end">
                                  {cerrado ? (
                                    <Text fontWeight="medium">
                                      {reg?.expense_cents != null ? formatearImporte(reg.expense_cents) : '—'}
                                    </Text>
                                  ) : (
                                    <Input
                                      size="sm"
                                      textAlign="end"
                                      inputMode="decimal"
                                      value={gastoValor}
                                      placeholder="—"
                                      onChange={(e) => guardarGasto(fecha, e.target.value)}
                                      onBlur={(e) => {
                                        if (e.target.value) guardarGasto(fecha, e.target.value);
                                      }}
                                    />
                                  )}
                                </Table.Cell>
                              </Table.Row>
                            );
                          })}
                        </Table.Body>

                        {/* Footer Totales */}
                        <Table.Footer bg="bg.subtle">
                          <Table.Row fontWeight="bold">
                            <Table.Cell>TOTAL</Table.Cell>
                            <Table.Cell textAlign="end" color="green.600" fontSize="sm">
                              {formatearImporte(totales.totalIngresos)}
                            </Table.Cell>
                            <Table.Cell textAlign="center" fontSize="xs">
                              {totales.diasConBizum} días
                            </Table.Cell>
                            <Table.Cell textAlign="end" fontSize="sm">
                              {diasGastosPendientes > 0 ? (
                                <Text as="span" color="orange.600">
                                  Parcial: {formatearImporte(totales.totalGastos)}
                                </Text>
                              ) : (
                                <Text as="span" color="red.600">
                                  {formatearImporte(totales.totalGastos)}
                                </Text>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        </Table.Footer>
                      </Table.Root>
                    </ScrollArea.Content>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar>
                    <ScrollArea.Thumb />
                  </ScrollArea.Scrollbar>
                  <ScrollArea.Corner />
                </ScrollArea.Root>

                {/* Alerta de días pendientes */}
                {diasPendientes > 0 && (
                  <Alert.Root status="warning" variant="subtle" borderRadius="lg">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title fontWeight="semibold">
                        {diasPendientes}{' '}
                        {diasPendientes === 1 ? 'día con ingreso pendiente' : 'días con ingresos pendientes'}
                      </Alert.Title>
                    </Alert.Content>
                  </Alert.Root>
                )}

                {/* Sección de Exportación */}
                <HStack justify="space-between" align="center" wrap="wrap" gap={4} pt={2}>
                  <HStack gap={2} align="center">
                    <Icon color="fg.muted">
                      <FiDownload />
                    </Icon>
                    <Text fontWeight="semibold" fontSize="sm">
                      Exportar Informes:
                    </Text>
                  </HStack>

                  <HStack gap={3} wrap="wrap">
                    {/* Exportaciones Mensuales */}
                    <Group attached>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="blue"
                        onClick={async () => {
                          const r = await window.electron.exportWordMonthly(año, mesActualVista as Mes);
                          setMensaje(
                            r.success ? `Word guardado: ${r.path}` : 'Cancelado',
                            r.success ? 'success' : 'info'
                          );
                        }}
                      >
                        <FaFileWord /> Word mensual
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="red"
                        onClick={async () => {
                          const r = await window.electron.exportPdfMonthly(año, mesActualVista as Mes);
                          setMensaje(
                            r.success ? `PDF guardado: ${r.path}` : 'Cancelado',
                            r.success ? 'success' : 'info'
                          );
                        }}
                      >
                        <FaFilePdf /> PDF mensual
                      </Button>
                    </Group>

                    {/* Exportaciones Trimestrales */}
                    <Group attached>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="blue"
                        onClick={async () => {
                          const tri = trimestreDeMes(mesActualVista);
                          const r = await window.electron.exportWordQuarterly(año, tri);
                          setMensaje(
                            r.success ? `Word T${tri} guardado: ${r.path}` : 'Cancelado',
                            r.success ? 'success' : 'info'
                          );
                        }}
                      >
                        <FaFileWord /> Word trimestral
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="green"
                        onClick={async () => {
                          const tri = trimestreDeMes(mesActualVista);
                          const r = await window.electron.exportExcelQuarterly(año, tri);
                          setMensaje(
                            r.success ? `Excel T${tri} guardado: ${r.path}` : 'Cancelado',
                            r.success ? 'success' : 'info'
                          );
                        }}
                      >
                        <FaFileExcel /> Excel trimestral
                      </Button>
                    </Group>
                  </HStack>
                </HStack>
              </VStack>
            </Card.Root>
          </VStack>
        )}
      </main>
    </div>
  );
};

export default App;
