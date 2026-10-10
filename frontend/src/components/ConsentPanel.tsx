import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useT } from '../i18n'
import type { Consent } from '../types'

export default function ConsentPanel({ consent }: { consent: Consent }) {
  const t = useT()
  const row = (label: string, on: boolean) => (
    <li className={on ? 'yes' : 'no'}>{on ? <Eye size={20} aria-hidden /> : <EyeOff size={20} aria-hidden />}
      <strong>{label}</strong>: {on ? t('share.on', { name: consent.contact_name }) : t('share.off')}</li>
  )
  return (
    <section className="card" aria-labelledby="cp">
      <h2 id="cp"><ShieldCheck size={22} aria-hidden /> {t('share.title')}</h2>
      <ul className="plain">{row(t('share.checkins'), consent.share_checkins)}{row(t('share.routines'), consent.share_routines)}</ul>
      <p className="muted small">{t('share.never')}</p>
    </section>
  )
}
