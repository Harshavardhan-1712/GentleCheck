import { CalendarClock, CheckCircle2, ListChecks, Siren } from 'lucide-react'
import { useState } from 'react'
import { api, useApi } from '../api'
import ConsentPanel from '../components/ConsentPanel'
import NotificationPanel from '../components/NotificationPanel'
import RoutineCard from '../components/RoutineCard'
import StatCard from '../components/StatCard'
import { ErrorBox, errKey, Loading, Toast } from '../components/State'
import Timeline from '../components/Timeline'
import { fmtDateTime, useLang, useT } from '../i18n'

const GRACES = [1, 5, 15, 30, 60, 120]

export default function FamilyDashboard() {
  const t = useT()
  const lang = useLang()
  const dash = useApi(() => api.dashboard('family'), [])
  const tl = useApi(() => api.timeline('family'), [])
  const rs = useApi(() => api.routines('family'), [])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [routineTitle, setRoutineTitle] = useState('')
  const [routineTime, setRoutineTime] = useState('')
  const reloadAll = () => Promise.all([dash.reload(), tl.reload(), rs.reload()])

  const run = async (fn: () => Promise<unknown>, ok: (r: any) => string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setBusy(true)
    try { const r = await fn(); setMsg({ ok: true, text: ok(r) }); await reloadAll(); return true }
    catch (e) { setMsg({ ok: false, text: t(errKey(e)) }); return false }
    finally { setBusy(false) }
  }

  const err = dash.error ?? tl.error ?? rs.error
  if (err) return <ErrorBox error={err} onRetry={() => void reloadAll()} />
  if (!dash.data || !tl.data || !rs.data) return <Loading />
  const d = dash.data
  const grace = d.consent.grace_minutes
  const tone = d.status === 'overdue' ? 'warn' : ''
  const opts = GRACES.includes(grace) ? GRACES : [...GRACES, grace].sort((a, b) => a - b)

  return (
    <div className="stack">
      <h1>{t('family.title')}</h1>
      <p className="muted">{t('family.caution')}</p>
      {!d.checkins_shared && <p className="card info" role="status">{t('family.hidden')}</p>}
      {d.checkins_shared && (
        <div className="grid3">
          <StatCard icon={<CheckCircle2 />} label={t('last.checkin')} value={d.last_checkin ? fmtDateTime(lang, d.last_checkin) : t('none')} />
          <StatCard icon={<CalendarClock />} label={t('next.checkin')} value={d.due_at ? fmtDateTime(lang, d.due_at) : '—'} />
          <StatCard icon={<Siren />} tone={tone} label={t('status.label')} value={d.status ? t('status.' + d.status) : '—'} />
        </div>
      )}
      <Toast msg={msg} />
      <NotificationPanel items={d.notifications} />
      <section aria-labelledby="fr">
        <h2 id="fr"><ListChecks size={22} aria-hidden /> {t('routines.title')}</h2>
        {!d.consent.share_routines ? <p className="card muted center">{t('family.rhidden')}</p>
          : <>
            {rs.data.length === 0 ? <p className="card muted center">{t('routines.empty')}</p> : (
              <>
                <p className="muted">{t('counts', { d: d.routine_counts.done, p: d.routine_counts.pending, s: d.routine_counts.snoozed })}</p>
                <ul className="plain stack">{rs.data.map((r) => <RoutineCard key={r.id} r={r} />)}</ul>
              </>
            )}
            <form className="card routine-form" onSubmit={(e) => {
              e.preventDefault()
              void run(() => api.addRoutine({ title: routineTitle, scheduled: routineTime }), () => t('routine.added'))
                .then((saved) => { if (saved) { setRoutineTitle(''); setRoutineTime('') } })
            }}>
              <h3>{t('routine.add.title')}</h3>
              <label className="field">{t('routine.name')}
                <input required maxLength={120} value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} />
              </label>
              <label className="field">{t('routine.time')}
                <input required type="time" value={routineTime} onChange={(e) => setRoutineTime(e.target.value)} />
              </label>
              <button className="btn primary" type="submit" disabled={busy || !routineTitle.trim() || !routineTime}>{t('routine.add.button')}</button>
            </form>
          </>}
      </section>
      <section aria-labelledby="ft"><h2 id="ft">{t('timeline.title')}</h2><Timeline items={tl.data} /></section>
      <ConsentPanel consent={d.consent} />
      <section className="card demo" aria-labelledby="dm">
        <h2 id="dm">{t('demo.title')}</h2>
        <p className="muted">{t('demo.clock')}: <strong>{fmtDateTime(lang, d.now)}</strong> (+{d.demo_offset_minutes} min)</p>
        <div className="actions wrap">
          <button className="btn" disabled={busy} onClick={() => run(() => api.advance({ minutes: 60 }), () => t('demo.advanced'))}>{t('demo.p1')}</button>
          <button className="btn" disabled={busy} onClick={() => run(() => api.advance({ minutes: 360 }), () => t('demo.advanced'))}>{t('demo.p6')}</button>
          <button className="btn primary" disabled={busy} onClick={() => run(() => api.advance({ to_overdue: true }), (r) => t(r.escalation_created ? 'demo.escalated' : 'demo.advanced'))}>{t('demo.overdue')}</button>
        </div>
        <label className="field">{t('demo.grace')}
          <select value={grace} disabled={busy} onChange={(e) => run(() => api.putConsent({ grace_minutes: Number(e.target.value) }), () => t('consent.saved'))}>
            {opts.map((g) => <option key={g} value={g}>{t('demo.min', { n: g })}</option>)}
          </select>
        </label>
      </section>
    </div>
  )
}
