import { BellRing } from 'lucide-react'
import { fmtDateTime, useLang, useT } from '../i18n'
import type { Notice } from '../types'

export default function NotificationPanel({ items }: { items: Notice[] }) {
  const t = useT()
  const lang = useLang()
  return (
    <section className="card" aria-labelledby="np">
      <h2 id="np"><BellRing size={22} aria-hidden /> {t('notify.title')}</h2>
      <p className="sim">{t('notify.sim')}</p>
      {!items.length && <p className="muted">{t('notify.empty')}</p>}
      <ul className="plain">
        {items.map((n) => (
          <li key={n.id} className={`notice ${n.resolved_at ? 'res' : ''}`}>
            <span className="badge">{t('notify.sim').split(' — ')[0]}</span>
            <p>{t(n.kind === 'help' ? 'notify.help' : 'notify.overdue', { name: n.contact })}</p>
            <span className="muted small">{fmtDateTime(lang, n.ts)} · {n.resolved_at ? t('notify.resolved') : t('notify.open')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
