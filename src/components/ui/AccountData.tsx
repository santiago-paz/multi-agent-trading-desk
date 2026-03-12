import React from 'react';
import { DatosPerfil, EstadoCuenta } from '@/lib/iol/types';

interface AccountDataProps {
  perfil: DatosPerfil | null;
  estadoCuenta: EstadoCuenta | null;
  cclRate: number;
  isLoading: boolean;
  onRefresh: () => void;
}

import { FONT, LABEL_ACCOUNT as LABEL, COL_HEADER, COL_HEADER_RIGHT, HR98 } from '@/lib/theme/win98';

/* ─── Component ──────────────────────────────────────────────────────────── */
export const AccountData: React.FC<AccountDataProps> = ({
  perfil,
  estadoCuenta,
  cclRate,
  isLoading,
  onRefresh,
}) => {
  return (
    <div
      style={{
        ...FONT,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#c0c0c0',
        overflow: 'hidden',
      }}
    >
      {/* ── Scrollable body ── */}
      <div
        className="win98-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          margin: 0,
          padding: '6px',
          background: '#c0c0c0',
        }}
      >
        {isLoading && !perfil && !estadoCuenta ? (
          <p style={{ ...FONT, margin: 0, padding: '4px' }}>
            Cargando datos de la cuenta...
          </p>
        ) : (
          <>
            {/* ─── Información del Titular ─── */}
            <fieldset>
              <legend>Información del Titular</legend>

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
              <legend>Estado del Portfolio</legend>

              {estadoCuenta ? (
                estadoCuenta.cuentas.map((cuenta, index) => {
                  const isPeso = cuenta.moneda === 'peso_Argentino';
                  const monedaLabel = 'U$D';
                  const divisor = isPeso ? cclRate : 1;
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
                          background: '#c0c0c0',
                          color: '#000000',
                        }}
                      />
                    </div>
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={{ ...LABEL, fontWeight: 'bold' }}>Disponible:</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.disponible ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{
                          ...FONT,
                          flex: 1,
                          cursor: 'default',
                          color: (cuenta.disponible ?? 0) >= 0 ? '#008000' : '#ff0000',
                          fontWeight: 'bold',
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
                      <label style={{ ...LABEL, fontWeight: 'bold' }}>Total:</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.total ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{
                          ...FONT,
                          flex: 1,
                          cursor: 'default',
                          fontWeight: 'bold',
                        }}
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
                        value={cuenta.estado ?? '-'}
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
                    <label style={{ ...LABEL, fontWeight: 'bold' }}>Total (USD):</label>
                    <input
                      type="text"
                      readOnly
                      value={`U$D ${((estadoCuenta.totalEnPesos ?? 0) / cclRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      style={{
                        ...FONT,
                        flex: 1,
                        cursor: 'default',
                        fontWeight: 'bold',
                        color: ((estadoCuenta.totalEnPesos ?? 0) / cclRate) >= 0 ? '#008000' : '#ff0000',
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
                            <th style={COL_HEADER}>Período</th>
                            <th style={COL_HEADER_RIGHT}>Operaciones</th>
                            <th style={COL_HEADER_RIGHT}>Volumen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estadoCuenta.estadisticas.map((est, i) => (
                            <tr
                              key={i}
                              style={{
                                backgroundColor: '#ffffff',
                                borderBottom: '1px solid #c0c0c0',
                              }}
                            >
                              <td style={{ padding: '1px 6px', borderRight: '1px solid #c0c0c0' }}>
                                {est.descripcion}
                              </td>
                              <td style={{ padding: '1px 6px', textAlign: 'right', borderRight: '1px solid #c0c0c0' }}>
                                {est.cantidad}
                              </td>
                              <td style={{ padding: '1px 6px', textAlign: 'right' }}>
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '2px 6px 4px',
          background: '#c0c0c0',
          borderTop: '1px solid #808080',
          flexShrink: 0,
        }}
      >
        <button onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* ── Status Bar ── */}
      <div className="status-bar" style={{ ...FONT, flexShrink: 0, margin: 0 }}>
        <p className="status-bar-field">Listo</p>
        <p className="status-bar-field">CCL: ${cclRate.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="status-bar-field">
          {isLoading ? 'Actualizando...' : perfil ? `Cta: ${perfil.numeroCuenta}` : 'Sin sesión'}
        </p>
      </div>
    </div>
  );
};
