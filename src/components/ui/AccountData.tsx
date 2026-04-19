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
import { usePortfolioT } from '@/lib/i18n';

/* ─── Component ──────────────────────────────────────────────────────────── */
export const AccountData: React.FC<AccountDataProps> = ({
  perfil,
  estadoCuenta,
  isLoading,
  onRefresh,
}) => {
  const t = usePortfolioT();
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
            {t('account.loading')}
          </p>
        ) : (
          <>
            {/* ─── Información del Titular ─── */}
            <fieldset>
              <legend>{t('account.holderTitle')}</legend>

              {perfil ? (
                <>
                  <div className="field-row" style={{ marginBottom: '2px' }}>
                    <label style={LABEL}>{t('account.name')}</label>
                    <input
                      type="text"
                      readOnly
                      value={`${perfil.nombre} ${perfil.apellido}`}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                  <div className="field-row" style={{ marginBottom: '2px' }}>
                    <label style={LABEL}>{t('account.accountNumber')}</label>
                    <input
                      type="text"
                      readOnly
                      value={String(perfil.numeroCuenta)}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                  <div className="field-row" style={{ marginBottom: '2px' }}>
                    <label style={LABEL}>{t('account.email')}</label>
                    <input
                      type="text"
                      readOnly
                      value={perfil.email}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                  <div className="field-row">
                    <label style={LABEL}>{t('account.investorProfile')}</label>
                    <input
                      type="text"
                      readOnly
                      value={perfil.perfilInversor}
                      style={{ ...FONT, flex: 1, cursor: 'default' }}
                    />
                  </div>
                </>
              ) : (
                <p style={{ ...FONT, margin: 0 }}>{t('account.profileError')}</p>
              )}
            </fieldset>

            {/* ─── Estado del Portfolio ─── */}
            <fieldset style={{ marginTop: '6px' }}>
              <legend>{t('account.stateTitle')}</legend>

              {estadoCuenta ? (
                estadoCuenta.cuentas.map((cuenta, index) => {
                  const isPeso = cuenta.moneda === 'peso_Argentino';
                  const monedaLabel = isPeso ? 'AR$' : 'U$D';
                  const divisor = 1; // Mostramos la moneda original de la cuenta
                  const saldoInmediato = cuenta.saldos?.find(s => s.liquidacion === 'inmediato');
                  const saldo24 = cuenta.saldos?.find(s => s.liquidacion === 'hrs24');
                  const saldo48 = cuenta.saldos?.find(s => s.liquidacion === 'hrs48');
                  return (
                  <React.Fragment key={index}>
                    {index > 0 && <hr style={HR98} />}
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={LABEL}>{t('account.accountLabel')}</label>
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
                      <label style={LABEL}>{t('account.available')}</label>
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
                      <label style={LABEL}>{t('account.committed')}</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.comprometido ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{
                          ...FONT,
                          flex: 1,
                          cursor: 'default',
                          color: (cuenta.comprometido ?? 0) > 0 ? COLOR_NEGATIVE : 'inherit',
                        }}
                      />
                    </div>
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={LABEL}>{t('account.securitiesValued')}</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.titulosValorizados ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{ ...FONT, flex: 1, cursor: 'default' }}
                      />
                    </div>
                    <div className="field-row" style={{ marginBottom: '2px' }}>
                      <label style={LABEL}>{t('account.total')}</label>
                      <input
                        type="text"
                        readOnly
                        value={`${monedaLabel} ${((cuenta.total ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        style={{ ...FONT, flex: 1, cursor: 'default' }}
                      />
                    </div>
                    {saldoInmediato && (
                      <div className="field-row" style={{ marginBottom: '2px' }}>
                        <label style={LABEL}>{t('account.immediate')}</label>
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
                        <label style={LABEL}>{t('account.24h')}</label>
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
                        <label style={LABEL}>{t('account.48h')}</label>
                        <input
                          type="text"
                          readOnly
                          value={`${monedaLabel} ${((saldo48.disponible ?? 0) / divisor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          style={{ ...FONT, flex: 1, cursor: 'default' }}
                        />
                      </div>
                    )}
                    <div className="field-row" style={{ marginTop: '2px' }}>
                      <label style={LABEL}>{t('account.status')}</label>
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
                <p style={{ ...FONT, margin: 0 }}>{t('account.stateError')}</p>
              )}
            </fieldset>

            {/* ─── Total en Pesos + Estadísticas ─── */}
            <fieldset style={{ marginTop: '6px' }}>
              <legend>{t('account.summaryTitle')}</legend>

              {estadoCuenta ? (
                <>
                  <div className="field-row" style={{ marginBottom: '4px' }}>
                    <label style={LABEL}>{t('account.totalUSD')}</label>
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
                            <th style={{ ...COL_HEADER, position: 'sticky', top: 0, zIndex: 1 }}>{t('col.period')}</th>
                            <th style={{ ...COL_HEADER_RIGHT, position: 'sticky', top: 0, zIndex: 1 }}>{t('col.operations')}</th>
                            <th style={{ ...COL_HEADER_RIGHT, position: 'sticky', top: 0, zIndex: 1 }}>{t('col.volume')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estadoCuenta.estadisticas.map((est, i) => (
                            <tr
                              key={i}
                              style={{
                                backgroundColor: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
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
                <p style={{ ...FONT, margin: 0 }}>{t('account.noData')}</p>
              )}
            </fieldset>
          </>
        )}
      </div>

      {/* ── Botón Actualizar ── */}
      <div style={REFRESH_FOOTER}>
        <button onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? t('footer.updating') : t('footer.update')}
        </button>
      </div>

      {/* ── Status Bar ── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">{t('account.ready')}</p>
        <p className="status-bar-field">MEP: ${mepRate.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="status-bar-field">
          {isLoading ? t('footer.updating') : perfil ? `${t('account.accountPrefix')} ${perfil.numeroCuenta}` : t('account.noSession')}
        </p>
      </div>
    </div>
  );
};
