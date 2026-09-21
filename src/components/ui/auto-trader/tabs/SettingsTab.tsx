import React from 'react';
import { FONT, LABEL, COLOR_SECONDARY } from '@/lib/theme/win98';
import { fmtARS } from '../utils';
import { AI_MODELS, type AIModelId } from '../market-hours';
import { PAGE } from '../components/Page';
import { useAutoTraderT } from '@/lib/i18n';

interface SettingsTabProps {
  dailyLimit: number;
  setDailyLimit: (val: number) => void;
  effectiveMep: number;
  modelName: AIModelId;
  setModelName: (val: AIModelId) => void;
  commissionRate: number;
  /** True while an analysis runs: the settings it started with must not change under it. */
  disabled: boolean;
}

/** Label left of its control, right-aligned in a fixed column so the controls share one left edge. */
const ROW_LABEL: React.CSSProperties = { ...LABEL, width: 110 };
const PARAGRAPH: React.CSSProperties = { ...FONT, margin: '8px 0 0', maxWidth: 520, lineHeight: '14px' };

export function SettingsTab({
  dailyLimit,
  setDailyLimit,
  effectiveMep,
  modelName,
  setModelName,
  commissionRate,
  disabled,
}: SettingsTabProps) {
  const t = useAutoTraderT();
  const model = AI_MODELS.find(m => m.id === modelName);

  return (
    <div style={PAGE}>
      <fieldset style={{ margin: 0, flexShrink: 0 }}>
        <legend>{t('settings.cap.title')}</legend>
        <div className="field-row">
          <label htmlFor="at-daily-cap" style={ROW_LABEL}>{t('settings.cap.label')}</label>
          <input
            id="at-daily-cap"
            name="dailyCap"
            type="number"
            autoComplete="off"
            min={0}
            step={1000}
            value={dailyLimit}
            onChange={e => setDailyLimit(Math.max(0, Number(e.target.value)))}
            style={{ ...FONT, width: 110 }}
            disabled={disabled}
          />
          <span style={FONT}>ARS</span>
          <span style={{ ...FONT, color: COLOR_SECONDARY }}>
            {t('usdApprox', { amount: `$${fmtARS(dailyLimit / effectiveMep)}` })}
          </span>
        </div>
        <p style={PARAGRAPH}>{t('settings.cap.explain')}</p>
      </fieldset>

      <fieldset style={{ margin: 0, flexShrink: 0 }}>
        <legend>{t('settings.model.title')}</legend>
        <div className="field-row">
          <label htmlFor="at-model" style={ROW_LABEL}>{t('settings.model.label')}</label>
          <select
            id="at-model"
            value={modelName}
            onChange={e => setModelName(e.target.value as AIModelId)}
            style={{ ...FONT, width: 200 }}
            disabled={disabled}
          >
            {AI_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        {model && <p style={{ ...PARAGRAPH, color: COLOR_SECONDARY }}>{t(model.descriptionKey)}</p>}
      </fieldset>

      <fieldset style={{ margin: 0, flexShrink: 0 }}>
        <legend>{t('settings.broker.title')}</legend>
        <div className="field-row">
          <span style={ROW_LABEL}>{t('settings.broker.commission')}</span>
          <span style={FONT}>{t('settings.broker.commissionValue', { rate: (commissionRate * 100).toFixed(1) })}</span>
        </div>
      </fieldset>
    </div>
  );
}
