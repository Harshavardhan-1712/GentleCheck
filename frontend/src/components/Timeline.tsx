import { Bell, CheckCircle2, HandHelping, ListChecks, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { fmtDateTime, pick, useLang, useT } from '../i18n'
import type { TimelineItem } from '../types'

const icons: Record<string, ReactNode> = { checkin: <CheckCircle2 />, routine: <ListChecks />, followup: <Bell />, help: <HandHelping />, consent: <ShieldCheck /> }

export default function Timeline({ items }: { items: TimelineItem[] }) {
  const t = useT()
  const lang = useLang()
  if (!items.length) return <p className="card muted center">{t('timeline.empty')}</p>
  return (
    <ol className="timeline">
      {items.map((e) => (
        <li key={e.id} className={`tl ${e.category}`}>
          <span className="tl-ic" aria-hidden>{icons[e.category]}</span>
          <div><div>{t(e.code, { title: pick(lang, e) })}</div><div className="muted small">{fmtDateTime(lang, e.ts)}</div></div>
        </li>
      ))}
    </ol>
  )
}
