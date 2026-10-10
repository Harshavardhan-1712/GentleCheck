import { CheckCircle2, LifeBuoy } from 'lucide-react'
import { useState } from 'react'
import { api, useApi } from '../api'
import ConsentPanel from '../components/ConsentPanel'
import RoutineCard from '../components/RoutineCard'
import { ErrorBox, errKey, Loading, Toast } from '../components/State'
import VoiceAssistant from '../components/VoiceAssistant'
import { fmtDate, fmtDateTime, useLang, useT } from '../i18n'
import type { Lang } from '../types'

export default function ParentDashboard({ setLang }: { setLang: (l: Lang) => void }) {
  const t = useT()
  const lang = useLang()
  const dash = useApi(() => api.dashboard('parent'), [])
  const rs = useApi(() => api.routines('parent'), [])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async <T,>(fn: () => Promise<T>, ok: (r: T) => string) => {
    setBusy(true)
    try { const r = await fn(); setMsg({ ok: true, text: ok(r) }); await Promise.all([dash.reload(), rs.reload()]) }
    catch (e) { setMsg({ ok: false, text: t(errKey(e)) }) }
    finally { setBusy(false) }
  }

  if (dash.error || rs.error) return <ErrorBox error={dash.error ?? rs.error} onRetry={() => { void dash.reload(); void rs.reload() }} />
  if (!dash.data || !rs.data) return <Loading />
  const d = dash.data
  const h = new Date().getHours()
  const greet = t(h < 12 ? 'greet.m' : h < 17 ? 'greet.a' : 'greet.e')

  return (
    <div className="stack">
      <section className="hero">
        <h1>{greet} 👋</h1>
        <p>{fmtDate(lang, new Date())}</p>
        <button className="btn big primary" disabled={busy} onClick={() => run(api.checkin, () => t('checkin.done'))}>
          <CheckCircle2 size={32} aria-hidden /> {t('checkin.btn')}
        </button>
        <p className="last"><strong>{t('last.checkin')}:</strong> {d.last_checkin ? fmtDateTime(lang, d.last_checkin) : t('none')}</p>
      </section>
      <Toast msg={msg} />
      <section aria-labelledby="rt">
        <h2 id="rt">{t('routines.title')}</h2>
        <p className="muted small">{t('med.note')}</p>
        {rs.data.length === 0 ? <p className="card muted center">{t('routines.empty')}</p> : (
          <ul className="plain stack">
            {rs.data.map((r) => (
              <RoutineCard key={r.id} r={r} busy={busy}
                onComplete={() => run(() => api.complete(r.id), () => t('r.done.msg'))}
                onSnooze={() => run(() => api.snooze(r.id, 30), () => t('r.snooze.msg'))} />
            ))}
          </ul>
        )}
      </section>
      <button className="btn big danger" disabled={busy} onClick={() => run(api.help, (r) => t(r.created ? 'help.done' : 'help.already'))}>
        <LifeBuoy size={32} aria-hidden /> {t('help.btn')}
      </button>
      <ConsentPanel consent={d.consent} />
      <VoiceAssistant setLang={setLang} onChanged={() => Promise.all([dash.reload(), rs.reload()])} />
    </div>
  )
}
