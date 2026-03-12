import React from 'react';
import { DatosPerfil, EstadoCuenta } from '@/lib/iol/types';

interface AccountDataProps {
  perfil: DatosPerfil | null;
  estadoCuenta: EstadoCuenta | null;
  isLoading: boolean;
  onRefresh: () => void;
}

/* ─── Inline style constants ─────────────────────────────────────────────── */
const WIN98: React.CSSProperties = {
  fontFamily: '"MS Sans Serif", "Tahoma", Arial, sans-serif',
  fontSize: '11px',
  WebkitFontSmoothing: 'none',
  // @ts-ignore – non-standard but works in most browsers
  MozOsxFontSmoothing: 'grayscale',
  fontSmooth: 'never',
  textShadow: 'none',
};

const LABEL: React.CSSProperties = {
  width: '100px',
  flexShrink: 0,
  textAlign: 'right',
  marginRight: '6px',
  whiteSpace: 'nowrap',
};

const INPUT_READONLY: React.CSSProperties = {
  flex: 1,
  ...WIN98,
  background: '#ffffff',
  cursor: 'default',
};

const INPUT_STATIC: React.CSSProperties = {
  flex: 1,
  ...WIN98,
  background: '#c0c0c0',
  border: 'none',
  cursor: 'default',
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export const AccountData: React.FC<AccountDataProps> = ({
  perfil,
  estadoCuenta,
  isLoading,
  onRefresh,
}) => {
  return (
    <div
      style={{
        ...WIN98,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#c0c0c0',
        overflow: 'hidden',
      }}
    >
      {/* ── Scrollable body ── */}
      <div
        className="window-body"
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
          <p style={{ ...WIN98, margin: 0, padding: '4px', fontStyle: 'italic' }}>
            Cargando datos de la cuenta...
          </p>
        ) : (
          <>
            {/* ─── Información del Titular ─── */}
            <fieldset style={{ marginBottom: '6px', padding: '4px 8px 6px' }}>
              <legend style={WIN98}>Información del Titular</legend>

              {perfil ? (
                <>
                  <div className="field-row" style={{ marginBottom: '3px' }}>
                    <label style={{ ...WIN98, ...LABEL }}>Nombre:</label>
                    <input type="text" readOnly value={`${perfil.nombre} ${perfil.apellido}`} style={INPUT_READONLY} />
                  </div>
                  <div className="field-row" style={{ marginBottom: '3px' }}>
                    <label style={{ ...WIN98, ...LABEL }}>Nro. Cuenta:</label>
                    <input type="text" readOnly value={String(perfil.numeroCuenta)} style={INPUT_READONLY} />
                  </div>
                  <div className="field-row" style={{ marginBottom: '3px' }}>
                    <label style={{ ...WIN98, ...LABEL }}>Email:</label>
                    <input type="text" readOnly value={perfil.email} style={INPUT_READONLY} />
                  </div>
                  <div className="field-row">
                    <label style={{ ...WIN98, ...LABEL }}>Perfil:</label>
                    <input type="text" readOnly value={perfil.perfilInversor} style={INPUT_READONLY} />
                  </div>
                </>
              ) : (
                <p style={{ ...WIN98, margin: 0, fontStyle: 'italic' }}>No se pudo cargar el perfil.</p>
              )}
            </fieldset>

            {/* ─── Estado del Portfolio ─── */}
            <fieldset style={{ marginBottom: '6px', padding: '4px 8px 6px' }}>
              <legend style={WIN98}>Estado del Portfolio</legend>

              {estadoCuenta ? (
                estadoCuenta.cuentas.map((cuenta, index) => (
                  <div key={index} style={{ marginBottom: index < estadoCuenta.cuentas.length - 1 ? '6px' : 0 }}>
                    <div className="field-row" style={{ marginBottom: '3px' }}>
                      <label style={{ ...WIN98, ...LABEL }}>Cuenta:</label>
                      <input
                        type="text"
                        readOnly
                        value={`${cuenta.tipo.toUpperCase()} #${cuenta.numero}`}
                        style={INPUT_STATIC}
                      />
                    </div>
                    <div className="field-row" style={{ marginBottom: '3px' }}>
                      <label style={{ ...WIN98, ...LABEL }}>Saldo Disp.:</label>
                      <input
                        type="text"
                        readOnly
                        value={`$${cuenta.saldoDisponible.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                        style={{
                          ...INPUT_READONLY,
                          color: cuenta.saldoDisponible >= 0 ? '#008000' : '#FF0000',
                          fontWeight: 'bold',
                        }}
                      />
                    </div>
                    <div className="field-row">
                      <label style={{ ...WIN98, ...LABEL }}>Saldo Liquid.:</label>
                      <input
                        type="text"
                        readOnly
                        value={`$${cuenta.saldoAliquidar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                        style={INPUT_READONLY}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ ...WIN98, margin: 0, fontStyle: 'italic' }}>No se pudo cargar el estado de cuenta.</p>
              )}
            </fieldset>

            {/* ─── Últimos Movimientos ─── */}
            <fieldset style={{ padding: '4px 8px 6px' }}>
              <legend style={WIN98}>Últimos Movimientos</legend>

              {estadoCuenta?.movimientos?.length ? (
                <div className="sunken-panel" style={{ overflow: 'auto', maxHeight: '180px', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', ...WIN98 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '1px 4px', borderRight: '1px solid #808080', fontWeight: 'normal' }}>Fecha</th>
                        <th style={{ textAlign: 'left', padding: '1px 4px', borderRight: '1px solid #808080', fontWeight: 'normal' }}>Tipo</th>
                        <th style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 'normal' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody style={{ backgroundColor: '#ffffff' }}>
                      {estadoCuenta.movimientos.map((mov, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #d0d0d0' }}>
                          <td style={{ padding: '1px 4px', borderRight: '1px solid #d0d0d0', whiteSpace: 'nowrap' }}>
                            {new Date(mov.fecha).toLocaleDateString('es-AR')}
                          </td>
                          <td style={{ padding: '1px 4px', borderRight: '1px solid #d0d0d0' }}>
                            {mov.tipoOperacion}
                          </td>
                          <td style={{
                            padding: '1px 4px',
                            textAlign: 'right',
                            color: mov.monto >= 0 ? '#008000' : '#FF0000',
                          }}>
                            ${mov.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ ...WIN98, margin: 0, fontStyle: 'italic' }}>No hay movimientos recientes.</p>
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
          padding: '4px 6px',
          background: '#c0c0c0',
          borderTop: '1px solid #808080',
          flexShrink: 0,
        }}
      >
        <button onClick={onRefresh} disabled={isLoading} style={WIN98}>
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* ── Status Bar ── */}
      <div
        className="status-bar"
        style={{ ...WIN98, flexShrink: 0, margin: 0 }}
      >
        <p className="status-bar-field">Listo</p>
        <p className="status-bar-field">Servidor: api.invertironline.com</p>
        <p className="status-bar-field">
          {isLoading ? 'Actualizando...' : perfil ? `Cta: ${perfil.numeroCuenta}` : 'Sin sesión'}
        </p>
      </div>
    </div>
  );
};
