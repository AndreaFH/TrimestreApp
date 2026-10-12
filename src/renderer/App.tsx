import React, { useState, useEffect, useCallback } from 'react';
import { NativeSelect, Button, HStack, Table, Input, Text, Badge, InputGroup, ScrollArea } from '@chakra-ui/react';
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

type RegistroMap = Map<string, DayEntry>;

type Pantalla = 'mes' | 'historial' | 'ajustes';

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

const App: React.FC = () => {
  const hoy = hoyEnMadrid();
  const añoActual = parseInt(hoy.slice(0, 4), 10);
  const mesActual = parseInt(hoy.slice(5, 7), 10);

  const [año, setAño] = useState<number>(añoActual);
  const [trimestre, setTrimestre] = useState<number>(trimestreDeMes(mesActual));
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

  const cargarDatos = useCallback(async (year: number, month: number) => {
    if (window.electron) {
      const entries: DayEntry[] = await window.electron.getMonthEntries(year, month);
      const st = await window.electron.getMonthStatus(year, month);
      const map = new Map<string, DayEntry>();
      for (const e of entries) map.set(e.date, e);
      setRegistros(map);
      setStatus(st);
    }
  }, []);

  useEffect(() => {
    if (window.electron && año && mesActualVista) {
      cargarDatos(año, mesActualVista);
    }
  }, [año, mesActualVista, cargarDatos]);

  useEffect(() => {
    if (window.electron) {
      if (pantalla === 'historial') {
        window.electron.getAuditLog().then(setHistorial);
      } else if (pantalla === 'ajustes') {
        window.electron.getSettings().then(setAjustes);
      }
    }
  }, [pantalla]);

  useEffect(() => {
    if (window.electron) {
      window.electron.checkBackupStale().then((r) => setCopiaAtrasada(r.stale));
    }
  }, []);

  const totales = calcularTotalesMes(
    año,
    mesActualVista as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
    registros
  );

  const cambiarMes = (mes: number) => {
    setMesActualVista(mes);
    setTrimestre(trimestreDeMes(mes));
  };

  const cambiarTrimestre = (t: number) => {
    setTrimestre(t);
    setMesActualVista(mesesDeTrimestre(t as 1 | 2 | 3 | 4)[0]);
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
    const entries: DayEntry[] = await window.electron.getMonthEntries(año, mesActualVista);
    const entry = entries.find((e: DayEntry) => e.date === fecha);
    if (entry) actualizarRegistro(fecha, entry);
  };

  const guardarIngreso = async (fecha: string, valor: string) => {
    try {
      const centimos = parsearImporte(valor);
      const old = registros.get(fecha) ?? null;
      let newBizum = old?.bizum ?? null;
      if (centimos === null) newBizum = null;
      else if (centimos === 0) newBizum = false;
      else if (old?.bizum === null || old?.bizum === undefined) newBizum = false;

      await window.electron.saveDay(
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
      setMensaje(e instanceof Error ? e.message : 'Error');
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const guardarGasto = async (fecha: string, valor: string) => {
    try {
      const centimos = parsearImporte(valor);
      const old = registros.get(fecha) ?? null;

      await window.electron.saveDay(
        fecha,
        old?.income_cents ?? null,
        old?.bizum ?? null,
        centimos,
        'expense_cents',
        old?.expense_cents != null ? String(old.expense_cents) : null
      );
      await refrescarEntrada(fecha);

      if (status.expenses_complete) {
        await window.electron.setExpensesComplete(año, mesActualVista, false);
        setStatus((prev) => ({ ...prev, expenses_complete: false }));
      }

      setMensaje('Guardado');
      setTimeout(() => setMensaje(''), 2000);
    } catch (e: unknown) {
      setMensaje(e instanceof Error ? e.message : 'Error');
      setTimeout(() => setMensaje(''), 2000);
    }
  };

  const sinIngresos = async (fecha: string) => {
    const old = registros.get(fecha) ?? null;
    await window.electron.saveDay(
      fecha,
      0,
      false,
      old?.expense_cents ?? null,
      'income_cents',
      old?.income_cents != null ? String(old.income_cents) : null
    );
    await refrescarEntrada(fecha);
    setMensaje('Guardado');
    setTimeout(() => setMensaje(''), 2000);
  };

  const cerrarMes = async () => {
    if (confirm('¿Cerrar este mes? No se podrá editar hasta reabrirlo.')) {
      await window.electron.closeMonth(año, mesActualVista);
      setStatus((prev) => ({ ...prev, closed_at: new Date().toISOString() }));
    }
  };

  const reabrirMes = async () => {
    if (confirm('¿Reabrir este mes? Se anotará en el historial.')) {
      await window.electron.reopenMonth(año, mesActualVista);
      setStatus((prev) => ({ ...prev, closed_at: null }));
    }
  };

  const marcarGastosCompletos = async () => {
    if (confirm('¿Confirmar que no falta ningún gasto?')) {
      await window.electron.setExpensesComplete(año, mesActualVista, true);
      setStatus((prev) => ({ ...prev, expenses_complete: true }));
    }
  };

  const deshacerUltimo = async (fecha: string) => {
    const result = await window.electron.undoLast(fecha);
    if (result.success) {
      await refrescarEntrada(fecha);
      setMensaje('Deshaciendo...');
      setTimeout(() => setMensaje(''), 2000);
    } else {
      setMensaje(result.error || 'No hay nada que deshacer');
      setTimeout(() => setMensaje(''), 3000);
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

  const meses = mesesDeTrimestre(trimestre as 1 | 2 | 3 | 4);

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
            <Button onClick={() => setPantalla('mes')}>Mes</Button>
            <Button onClick={() => setPantalla('historial')}>Historial</Button>
            <Button variant="outline" onClick={() => setPantalla('ajustes')}>
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
            <h2>Historial de cambios</h2>
            {historial.length === 0 ? (
              <p>No hay cambios registrados.</p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Campo</th>
                      <th>Valor anterior</th>
                      <th>Valor nuevo</th>
                      <th>Hecho en</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.id}>
                        <td>{h.entry_date}</td>
                        <td>{h.field}</td>
                        <td>{h.old_value ?? '—'}</td>
                        <td>{h.new_value ?? '—'}</td>
                        <td>{h.at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {pantalla === 'ajustes' && ajustes && (
          <section>
            <h2>Copias y ajustes</h2>
            <label>Nombre del negocio:</label>
            <input
              type="text"
              className="input-importe"
              defaultValue={ajustes.business_name}
              onBlur={async (e) => {
                await window.electron.saveSettings({ business_name: e.target.value });
                setMensaje('Guardado');
                setTimeout(() => setMensaje(''), 2000);
              }}
            />
            <br />
            <br />
            <label>Carpeta de copias: {ajustes.backup_folder || 'Sin carpeta'}</label>
            <button
              className="accion-btn secundario"
              onClick={async () => {
                const folder = await window.electron.selectBackupFolder();
                if (folder) {
                  await window.electron.saveSettings({ backup_folder: folder });
                  setAjustes({ ...ajustes, backup_folder: folder });
                }
              }}
            >
              Elegir carpeta
            </button>
            <br />
            <br />
            <button
              className="accion-btn secundario"
              onClick={async () => {
                const result = await window.electron.createAutoBackup();
                setMensaje(result.path ? `Copia creada: ${result.path}` : 'Sin carpeta de copias');
                setTimeout(() => setMensaje(''), 4000);
              }}
            >
              Crear copia ahora
            </button>
            <br />
            <br />
            <button
              className="accion-btn secundario"
              onClick={async () => {
                const result = await window.electron.exportBackupDialog();
                if (result) {
                  setMensaje('Copia exportada');
                  setTimeout(() => setMensaje(''), 2000);
                }
              }}
            >
              Exportar copia
            </button>
            <button
              className="accion-btn secundario"
              onClick={async () => {
                const result = await window.electron.importBackupDialog();
                if (result) {
                  setMensaje('Copia importada');
                  setTimeout(() => setMensaje(''), 2000);
                  window.electron.getSettings().then(setAjustes);
                }
              }}
            >
              Importar copia
            </button>
          </section>
        )}

        {pantalla === 'mes' && (
          <>
            <h2
              className="mes-titulo"
              style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #EDF2F7' }}
            >
              {MESES_ES_MAYUSCULAS[mesActualVista - 1]} {año}
              {diasPendientes > 0 && (
                <Badge colorPalette="orange" variant="subtle" size="md" ml="2">
                  ● {diasPendientes} días pendientes
                </Badge>
              )}
              {status.closed_at && (
                <span className="status-pill cerrado" style={{ fontSize: '12px', marginLeft: '8px' }}>
                  🔒 Cerrado
                </span>
              )}
            </h2>

            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <ScrollArea.Root height="70vh" borderWidth="1px" rounded="md">
                <ScrollArea.Viewport>
                  <ScrollArea.Content>
                    <Table.Root size="sm" stickyHeader>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Día</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Ingresos (€)</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">¿Bizum?</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Gastos (€)</Table.ColumnHeader>
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
                            <Table.Row key={futuro ? `${fecha}-futuro` : fecha} opacity={futuro ? 0.5 : 1}>
                              <Table.Cell fontWeight="medium" color="fg.muted">
                                {fecha.slice(8, 10)} — {diaDeLaSemana(fecha)}
                              </Table.Cell>

                              <Table.Cell textAlign="end">
                                {cerrado ? (
                                  <Text>{reg?.income_cents != null ? formatearImporte(reg.income_cents) : '—'}</Text>
                                ) : (
                                  <InputGroup endElement="€">
                                    <CampoImporte valor={ingresoValor} onGuardar={(t) => guardarIngreso(fecha, t)} />
                                  </InputGroup>
                                )}
                              </Table.Cell>

                              <Table.Cell textAlign="center">
                                {cerrado ? (
                                  <Text>{reg?.bizum == null ? '—' : reg.bizum ? 'SÍ' : 'NO'}</Text>
                                ) : (
                                  <Button
                                    size="xs"
                                    minW="60px"
                                    variant={reg?.bizum === true ? 'solid' : 'outline'}
                                    disabled={reg?.income_cents == null || reg.income_cents === 0}
                                    onClick={async () => {
                                      const newBizum = !(reg?.bizum === true);
                                      await window.electron.saveDay(
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
                                    {reg?.bizum == null ? '—' : reg.bizum ? 'SÍ' : 'NO'}
                                  </Button>
                                )}
                              </Table.Cell>

                              <Table.Cell textAlign="end">
                                {cerrado ? (
                                  <Text>{reg?.expense_cents != null ? formatearImporte(reg.expense_cents) : '—'}</Text>
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

                      <Table.Footer>
                        <Table.Row bg="bg.muted" fontWeight="bold">
                          <Table.Cell>TOTAL</Table.Cell>
                          <Table.Cell textAlign="end">{formatearImporte(totales.totalIngresos)}</Table.Cell>
                          <Table.Cell textAlign="center">{totales.diasConBizum} días</Table.Cell>
                          <Table.Cell textAlign="end">
                            {diasGastosPendientes > 0 ? (
                              <Text as="span" color="orange.600">
                                Parcial: {formatearImporte(totales.totalGastos)}
                              </Text>
                            ) : (
                              formatearImporte(totales.totalGastos)
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

              <div
                className="acciones"
                style={{ marginTop: '24px', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
              >
                {!status.closed_at && (
                  <>
                    <button
                      className="accion-btn secundario"
                      onClick={() => {
                        const fecha = hoyEnMadrid();
                        sinIngresos(fecha);
                      }}
                    >
                      Sin ingresos
                    </button>
                    {diasGastosPendientes === 0 && !status.expenses_complete && (
                      <button className="accion-btn secundario" onClick={marcarGastosCompletos}>
                        Marcar gastos completos
                      </button>
                    )}
                    {diasPendientes === 0 && (
                      <button className="accion-btn primario" onClick={cerrarMes}>
                        Cerrar mes
                      </button>
                    )}
                  </>
                )}
                {status.closed_at && (
                  <button className="accion-btn secundario" onClick={reabrirMes}>
                    Reabrir mes
                  </button>
                )}
                <button className="accion-btn secundario" onClick={() => deshacerUltimo(hoy)}>
                  Deshacer último
                </button>
              </div>

              {diasPendientes > 0 && (
                <p
                  className="aviso-banner"
                  style={{
                    margin: '16px 0',
                    padding: '12px 16px',
                    background: '#FFF7F3',
                    border: '1px solid #F6E4E0',
                    borderRadius: '8px',
                    color: '#2D3748',
                  }}
                >
                  ● {diasPendientes} días con ingresos pendientes
                </p>
              )}
              {diasGastosPendientes > 0 && (
                <p
                  className="aviso-banner"
                  style={{
                    margin: '16px 0',
                    padding: '12px 16px',
                    background: '#FFF7F3',
                    border: '1px solid #F6E4E0',
                    borderRadius: '8px',
                    color: '#2D3748',
                  }}
                >
                  ● {diasGastosPendientes} días con gastos pendientes
                </p>
              )}
              {status.closed_at && (
                <p
                  className="aviso-banner cerrado"
                  style={{
                    margin: '16px 0',
                    padding: '12px 16px',
                    background: '#EDF2F1',
                    border: '1px solid #CBD3E0',
                    borderRadius: '8px',
                    color: '#2D3748',
                  }}
                >
                  Mes cerrado — {new Date(status.closed_at).toLocaleDateString('es-ES')}
                </p>
              )}

              <div
                className="acciones"
                style={{ marginTop: '24px', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
              >
                <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Exportar:</span>
                <button
                  className="accion-btn secundario"
                  onClick={async () => {
                    const r = await window.electron.exportWordMonthly(año, mesActualVista as Mes);
                    setMensaje(r.success ? `Word guardado: ${r.path}` : 'Cancelado');
                    setTimeout(() => setMensaje(''), 3000);
                  }}
                >
                  Word mensual
                </button>
                <button
                  className="accion-btn secundario"
                  onClick={async () => {
                    const r = await window.electron.exportPdfMonthly(año, mesActualVista as Mes);
                    setMensaje(r.success ? `PDF guardado: ${r.path}` : 'Cancelado');
                    setTimeout(() => setMensaje(''), 3000);
                  }}
                >
                  PDF mensual
                </button>
                <button
                  className="accion-btn secundario"
                  onClick={async () => {
                    const tri = trimestreDeMes(mesActualVista);
                    const r = await window.electron.exportWordQuarterly(año, tri);
                    setMensaje(r.success ? `Word T${tri} guardado: ${r.path}` : 'Cancelado');
                    setTimeout(() => setMensaje(''), 3000);
                  }}
                >
                  Word trimestral
                </button>
                <button
                  className="accion-btn secundario"
                  onClick={async () => {
                    const tri = trimestreDeMes(mesActualVista);
                    const r = await window.electron.exportExcelQuarterly(año, tri);
                    setMensaje(r.success ? `Excel T${tri} guardado: ${r.path}` : 'Cancelado');
                    setTimeout(() => setMensaje(''), 3000);
                  }}
                >
                  Excel trimestral
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
