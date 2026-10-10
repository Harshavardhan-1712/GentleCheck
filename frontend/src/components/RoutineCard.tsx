import { Check, Clock, Footprints, GlassWater, Phone, Pill, Sprout, Utensils } from 'lucide-react'
import type { ReactNode } from 'react'
import { fmtTime, pick, useLang, useT } from '../i18n'
import type { Routine } from '../types'

const icons: Record<string, ReactNode> = { medication: <Pill />, meal: <Utensils />, hydration: <GlassWater />, movement: <Footprints />, call: <Phone />, custom: <Sprout /> }

export default function RoutineCard({ r, busy, onComplete, onSnooze }: { r: Routine; busy?: boolean; onComplete?: () => void; onSnooze?: () => void }) {
  const t = useT()
  const lang = useLang()
  const label = r.status === 'done' ? t('r.done') : r.status === 'snoozed' && r.snoozed_until ? t('r.snoozed', { t: fmtTime(lang, r.snoozed_until) }) : t('r.pending')
  return (
    <li className={`card routine ${r.status}`}>
      <span className="r-ic" aria-hidden>{icons[r.kind] ?? <Sprout />}</span>
      <div className="grow">
        <h3>{pick(lang, r)}</h3>
        <p className="muted"><Clock size={16} aria-hidden /> {r.scheduled} · <strong>{label}</strong></p>
        {r.detail && <p className="note"><em>{t('r.note')}:</em> {r.detail}</p>}
      </div>
      {onComplete && r.status !== 'done' && (
        <div className="actions">
          <button className="btn primary" disabled={busy} onClick={onComplete}><Check size={20} aria-hidden /> {t('btn.complete')}</button>
          <button className="btn" disabled={busy} onClick={onSnooze}>{t('btn.snooze')}</button>
        </div>
      )}
    </li>
  )
}
