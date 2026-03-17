import React from 'react';
import { DatosPerfil, EstadoCuenta } from '@/lib/iol/types';

import { useMepStore } from '@/lib/store/mep-store';

interface AccountDataProps {
  perfil: DatosPerfil | null;
  estadoCuenta: EstadoCuenta | null;
  isLoading: boolean;
  onRefresh: () => void;
}

import {
  FONT, LABEL_ACCOUNT as LABEL, COL_HEADER, COL_HEADER_RIGHT, HR98,
  CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, REFRESH_FOOTER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE,
} from '@/lib/theme/win98';

/* ─── Component ──────────────────────────────────────────────────────────── */
export const AccountData: React.FC<AccountDataProps> = ({
  perfil,
  estadoCuenta,
  isLoading,
  onRefresh,
}) => {
  const { mepRate, fetchMepRate } = useMepStore();
  
  const handleRefresh = () => {
    onRefresh();
    fetchMepRate();
  };
  return (
    <div style={WINDOW_CONTAINER}>
      {/* ── Scrollable body ── */}
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>
        {isLoading && !perfil && !estadoCuenta ? (
          <p style={{ ...FONT, margin: 0, padding: '4px' }}>
            Cargando datos de la cuenta...
          </p>
        ) : (
          <>
            {/* ─── Información del Titular ─── */}
            <fieldset>
              <legend>Información del titular</legend>

              {perfil ? (
                <>
                  <div className="field-row" style={{ marginBottom: '2px' }}>
                    <label style={LABEL}>Nombre:</label>
                    <input
                      type="text"
                      readOnly
                      value={`${perfil.nombre} ${perfil.apellido}`}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                  <div className="field-row" style={{ marginBottom: '2px' }}>
                    <label style={LABEL}>Nro. Cuenta:</label>
                    <input
                      type="text"
                      readOnly
                      value={String(perfil.numeroCuenta)}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                  <div className="field-row" style={{ marginBottom: '2px' }}>
                    <label style={LABEL}>Email:</label>
                    <input
                      type="text"
                      readOnly
                      value={perfil.email}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                  <div className="field-row">
                    <label style={LABEL}>Perfil:</label>
                    <input
                      type="text"
                      readOnly
                      value={perfil.perfilInversor}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                </>
              ) : (
                <p style={{ ...FONT, margin: 0 }}>No se pudo cargar el perfil.</p>
              )}
            </fieldset>

            {/* ─── Estado del Portfolio ─── */}
            <fieldset style={{ marginTop: '6px' }}>
              <legend>Estado del portfolio</legend>

              {estadoCuenta ? (
                estadoCuenta.cuentas.map((cuenta, index) => {
                  const isPeso = cuenta.moneda === 'peso_Argentino';
                  const monedaLabel = 'U$D';
                  const divisor = isPeso ? mepRate : 1;
                  const saldoInmediato = cuenta.saldos?.find(s => s.liquidacion === 'inmediato');
                  const saldo24 = cuenta.saldos?.find(s => s.liquidacion === 'hrs24');
                  const saldo48 = cuenta.saldos?.find(s => s.liquidacion === 'hrs48');
                  return (
                  <React.Fragment key={index}>
                    {index > 0 && <hr style={HR98} />}
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={LABEL}>Cuenta:</label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={`${cuenta.tipo} #${cuenta.numero}`}
                        style={{
                          ...FONT,
                          flex: 1,
                          cursor: 'default',
                          background: 'var(--btn-face, #c0c0c0)',
                        }}
                      />
                    </div>
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={LABEL}>Disponible:</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.disponible ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{
                          ...FONT,
                          flex: 1,
                          cursor: 'default',
                          color: (cuenta.disponible ?? 0) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                        }}
                      />
                    </div>
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={LABEL}>Títulos Valor.:</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.titulosValorizados ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{ ...FONT, flex: 1, cursor: 'default' }}
                      />
                    </div>
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={LABEL}>Total:</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.total ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{ ...FONT, flex: 1, cursor: 'default' }}
                      />
                    </div>
                    {saldoInmediato && (
                      <div className="field-row" style={{ marginBottom: '2px' }}>
                        <label style={LABEL}>CI (T+0):</label>
                        <input
                          type="text"
                          readOnly
                          value={`${monedaLabel} ${((saldoInmediato.disponible ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          style={{ ...FONT, flex: 1, cursor: 'default' }}
                        />
                      </div>
                    )}
                    {saldo24 && (
                      <div className="field-row" style={{ marginBottom: '2px' }}>
                        <label style={LABEL}>24hs (T+1):</label>
                        <input
                          type="text"
                          readOnly
                          value={`${monedaLabel} ${((saldo24.disponible ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          style={{ ...FONT, flex: 1, cursor: 'default' }}
                        />
                      </div>
                    )}
                    {saldo48 && (
                      <div className="field-row">
                        <label style={LABEL}>48hs (T+2):</label>
                        <input
                          type="text"
                          readOnly
                          value={`${monedaLabel} ${((saldo48.disponible ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          style={{ ...FONT, flex: 1, cursor: 'default' }}
                        />
                      </div>
                    )}
                    <div className="field-row" style={{ marginTop: '2px' }}>
                      <label style={LABEL}>Estado:</label>
                      <input
                        type="text"
                        readOnly
                        value={cuenta.estado ?? '—'}
                        style={{ ...FONT, flex: 1, cursor: 'default' }}
                      />
                    </div>
                  </React.Fragment>
                  );
                })
              ) : (
                <p style={{ ...FONT, margin: 0 }}>No se pudo cargar el estado de cuenta.</p>
              )}
            </fieldset>

            {/* ─── Total en Pesos + Estadísticas ─── */}
            <fieldset style={{ marginTop: '6px' }}>
              <legend>Resumen</legend>

              {estadoCuenta ? (
                <>
                  <div className="field-row" style={{ marginBottom: '4px' }}>
                    <label style={LABEL}>Total (USD):</label>
                    <input
                      type="text"
                      readOnly
                      value={`U$D ${((estadoCuenta.totalEnPesos ?? 0) / mepRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      style={{
                        ...FONT,
                        flex: 1,
                        cursor: 'default',
                        color: ((estadoCuenta.totalEnPesos ?? 0) / mepRate) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                      }}
                    />
                  </div>
                  {estadoCuenta.estadisticas?.length ? (
                    <div
                      className="sunken-panel win98-scrollbar"
                      style={{ overflow: 'auto', maxHeight: '120px', padding: 0 }}
                    >
                      <table
                        style={{
                          ...FONT,
                          width: '100%',
                          borderCollapse: 'collapse',
                          borderSpacing: 0,
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={{ ...COL_HEADER, position: 'sticky', top: 0, zIndex: 1 }}>Período</th>
                            <th style={{ ...COL_HEADER_RIGHT, position: 'sticky', top: 0, zIndex: 1 }}>Operaciones</th>
                            <th style={{ ...COL_HEADER_RIGHT, position: 'sticky', top: 0, zIndex: 1 }}>Volumen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estadoCuenta.estadisticas.map((est, i) => (
                            <tr
                              key={i}
                              style={{
                                backgroundColor: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                                borderBottom: '1px solid #c0c0c0',
                              }}
                            >
                              <td style={CELL}>{est.descripcion}</td>
                              <td style={CELL_RIGHT}>{est.cantidad}</td>
                              <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>
                                {est.volumen.toLocaleString('es-AR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ ...FONT, margin: 0 }}>Sin datos.</p>
              )}
            </fieldset>
          </>
        )}
      </div>

      {/* ── Botón Actualizar ── */}
      <div style={REFRESH_FOOTER}>
        <button onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* ── Status Bar ── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">Listo</p>
        <p className="status-bar-field">MEP: ${mepRate.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="status-bar-field">
          {isLoading ? 'Actualizando...' : perfil ? `Cta: ${perfil.numeroCuenta}` : 'Sin sesión'}
        </p>
      </div>
    </div>
  );
};
