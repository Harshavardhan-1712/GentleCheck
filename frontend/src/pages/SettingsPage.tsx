import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { api, useApi } from '../api'
import { ErrorBox, errKey, Loading, Toast } from '../components/State'
import { pick, useLang, useT } from '../i18n'
import type { Lang, Role } from '../types'

const GRACES = [1, 5, 15, 30, 60, 120]

export default function SettingsPage({ role, setLang }: { role: Role; setLang: (l: Lang) => void }) {
  const t = useT()
  const lang = useLang()
  const consent = useApi(api.consent, [])
  const rs = useApi(() => api.routines('parent'), [])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await fn(); setMsg({ ok: true, text: ok }); await Promise.all([consent.reload(), rs.reload()]) }
    catch (e) { setMsg({ ok: false, text: t(errKey(e)) }) }
    finally { setBusy(false) }
  }
  if (consent.error || rs.error) return <ErrorBox error={consent.error ?? rs.error} onRetry={() => { void consent.reload(); void rs.reload() }} />
  if (!consent.data || !rs.data) return <Loading />
  const c = consent.data
  const isParent = role === 'parent'
  const opts = GRACES.includes(c.grace_minutes) ? GRACES : [...GRACES, c.grace_minutes].sort((a, b) => a - b)

  return (
    <div className="stack">
      <h1>{t('settings.title')}</h1>
      <Toast msg={msg} />
      <section className="card">
        <h2>{t('lang')}</h2>
        <div className="actions">
          <button className={`btn ${lang === 'en' ? 'primary' : ''}`} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button className={`btn ${lang === 'te' ? 'primary' : ''}`} aria-pressed={lang === 'te'} onClick={() => setLang('te')}>తెలుగు</button>
        </div>
      </section>
      <section className="card">
        <h2>{t('consent.title')}</h2>
        {!isParent && <p className="info">{t('consent.only')}</p>}
        <label className="check"><input type="checkbox" disabled={!isParent || busy} checked={c.share_checkins}
          onChange={(e) => run(() => api.putConsent({ share_checkins: e.target.checked }), t('consent.saved'))} /> {t('share.checkins')}</label>
        <label className="check"><input type="checkbox" disabled={!isParent || busy} checked={c.share_routines}
          onChange={(e) => run(() => api.putConsent({ share_routines: e.target.checked }), t('consent.saved'))} /> {t('share.routines')}</label>
        {isParent && c.share_routines && (
          <fieldset><legend>{t('consent.each')}</legend>
            {rs.data.map((r) => (
              <label key={r.id} className="check"><input type="checkbox" disabled={busy} checked={r.share}
                onChange={(e) => run(() => api.shareRoutine(r.id, e.target.checked), t('consent.saved'))} /> {pick(lang, r)}</label>
            ))}
          </fieldset>
        )}
        <label className="field">{t('demo.grace')}
          <select value={c.grace_minutes} disabled={busy} onChange={(e) => run(() => api.putConsent({ grace_minutes: Number(e.target.value) }), t('consent.saved'))}>
            {opts.map((g) => <option key={g} value={g}>{t('demo.min', { n: g })}</option>)}
          </select>
        </label>
      </section>
      <section className="card">
        <h2>{t('demo.title')}</h2>
        <button className="btn danger" disabled={busy} onClick={() => { if (window.confirm(t('reset.confirm'))) void run(api.reset, t('reset.done')) }}>
          <RotateCcw size={20} aria-hidden /> {t('reset.btn')}
        </button>
      </section>
    </div>
  )
}
