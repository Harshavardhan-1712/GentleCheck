import { Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import { fmtDateTime, pick, translate, useLang } from '../i18n'
import type { Lang, Routine } from '../types'
import { cancelSpeech, createRecognizer, recognitionSupported, speak, TimeoutError, withTimeout } from '../voiceAssistant'
import type { Recognizer, VoiceError } from '../voiceAssistant'
import { matchIntent, matchLanguage, matchRoutine, normalize, pickChoice } from '../voiceCommands'
import type { Match } from '../voiceCommands'

type Status = 'ready' | 'listening' | 'processing' | 'speaking' | 'error'
type Action = 'complete' | 'snooze'
type Pending = { kind: 'choose'; action: Action; ids: number[] } | { kind: 'language' }
interface Msg { id: number; who: 'you' | 'asst'; text: string }
interface HelpStatus { open: boolean; ts: string | null; name: string }

const ERR_KEY: Record<VoiceError, string> = {
  permission: 'v.err.perm', nomic: 'v.err.nomic', nospeech: 'v.err.nospeech', lang: 'v.err.lang', network: 'v.err.net', generic: 'v.err.generic',
}

export default function VoiceAssistant({ setLang, onChanged }: { setLang: (l: Lang) => void; onChanged: () => Promise<unknown> }) {
  const lang = useLang()
  const langRef = useRef(lang)
  langRef.current = lang
  const tt = (k: string, v?: Record<string, string | number>) => translate(langRef.current, k, v)

  const [status, setStatusState] = useState<Status>('ready')
  const statusRef = useRef<Status>('ready')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [heard, setHeard] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const [noVoice, setNoVoice] = useState(false)
  const [helpStatus, setHelpStatus] = useState<HelpStatus | null>(null)
  const [input, setInput] = useState('')
  const [muted, setMuted] = useState(() => localStorage.getItem('gc_voice_muted') === '1')
  const mutedRef = useRef(muted)
  const alive = useRef(true)
  const busy = useRef(false)
  const rec = useRef<Recognizer | null>(null)
  const pending = useRef<Pending | null>(null)
  const lastReply = useRef('')
  const lastHandled = useRef({ text: '', at: 0 })
  const langChangeMsg = useRef(false)
  const msgId = useRef(0)
  const logRef = useRef<HTMLOListElement>(null)
  const srOk = recognitionSupported()

  const setSt = (s: Status) => { statusRef.current = s; if (alive.current) setStatusState(s) }
  const addMsg = (who: Msg['who'], text: string) => { if (alive.current) setMsgs((m) => [...m.slice(-19), { id: ++msgId.current, who, text }]) }

  const say = async (text: string, record = true) => {
    if (record) { addMsg('asst', text); lastReply.current = text }
    if (mutedRef.current) { setSt('ready'); return }
    setSt('speaking')
    const res = await speak(text, langRef.current, () => setSt('ready'))
    if (!alive.current) return
    if (res === 'spoken') setNoVoice(false)
    else { setNoVoice(true); setSt('ready') }
  }

  const showError = (text: string, again?: () => void) => {
    if (alive.current) { setError(text); setRetry(again ? () => again : null) }
    void say(text)
  }

  const run = async (fn: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setSt('processing'); setError(''); setRetry(null)
    try { await fn() }
    catch (e) {
      const key = e instanceof TimeoutError ? 'v.err.timeout' : e instanceof ApiError || e instanceof Error ? 'v.err.api' : 'v.err.generic'
      showError(tt(key), () => { void run(fn) })
    } finally {
      busy.current = false
      if (statusRef.current === 'processing') setSt('ready')
    }
  }

  const title = (r: Routine) => pick(langRef.current, r)
  const list = (rs: Routine[]) => rs.map((r, i) => tt('v.which.item', { n: i + 1, title: title(r) })).join('; ')

  const apply = async (action: Action, r: Routine) => {
    pending.current = null
    if (r.status === 'done') { await say(tt('v.already', { title: title(r) })); return }
    if (action === 'complete') await withTimeout(api.complete(r.id))
    else await withTimeout(api.snooze(r.id, 30))
    await onChanged() // only after the server confirmed
    await say(tt(action === 'complete' ? 'v.complete.ok' : 'v.snooze.ok', { title: title(r) }))
  }

  const askWhich = async (action: Action, options: Routine[]) => {
    pending.current = { kind: 'choose', action, ids: options.map((r) => r.id) }
    await say(tt('v.which', { list: list(options) }))
  }

  const doRoutine = (action: Action, text: string, choiceIds?: number[]) => run(async () => {
    const all = await withTimeout(api.routines('parent'))
    if (!all.length) { await say(tt('routines.empty')); return }
    const open = all.filter((r) => r.status !== 'done')
    let m: Match
    if (choiceIds) {
      const cands = all.filter((r) => choiceIds.includes(r.id))
      m = pickChoice(text, cands)
      if (m.kind !== 'one') { await askWhich(action, cands.filter((r) => r.status !== 'done')); return }
    } else m = matchRoutine(text, all)
    if (m.kind === 'one') { await apply(action, m.routine); return }
    const options = (m.kind === 'many' ? m.routines : open).filter((r) => r.status !== 'done')
    if (!options.length) { await say(tt('v.alldone')); return }
    await askWhich(action, options) // ambiguous or unnamed: ask instead of guessing
  })

  const doToday = () => run(async () => {
    const all = await withTimeout(api.routines('parent'))
    if (!all.length) { await say(tt('routines.empty')); return }
    const open = all.filter((r) => r.status !== 'done')
    if (!open.length) { await say(tt('v.alldone')); return }
    const items = open.map((r) => tt('v.today.item', { title: title(r), time: r.scheduled }) + (r.kind === 'medication' && r.detail && langRef.current === 'en' ? ` (${tt('v.today.note', { note: r.detail })})` : ''))
    const done = all.length - open.length
    await say(tt('v.today.some', { n: open.length, list: items.join('; ') }) + (done ? ' ' + tt('v.today.done', { d: done }) : ''))
  })

  const doCheckin = () => run(async () => {
    await withTimeout(api.checkin())
    await onChanged()
    await say(tt('v.checkin.ok'))
  })

  const doHelp = () => run(async () => {
    const r = await withTimeout(api.help())
    await onChanged()
    try { // show the real backend status next to the spoken confirmation
      const d = await withTimeout(api.dashboard('parent'))
      const n = d.notifications.find((x) => x.kind === 'help')
      if (alive.current) setHelpStatus({ open: d.help_open, ts: n?.ts ?? null, name: d.consent.contact_name })
      await say(r.created ? tt('v.help.ok', { name: d.consent.contact_name }) : tt('v.help.already'))
    } catch { await say(r.created ? tt('v.help.ok', { name: '' }) : tt('v.help.already')) }
  })

  const applyLang = (target: Lang) => {
    pending.current = null
    if (target === langRef.current) { void say(translate(target, 'v.lang.done')); return }
    langChangeMsg.current = true // spoken by the language effect once the new language is active
    setLang(target)
  }

  const dispatch = async (text: string) => {
    const intent = matchIntent(text)
    const p = pending.current
    if (p?.kind === 'language') {
      const target = matchLanguage(text)
      if (target) { applyLang(target); return }
      if (intent === 'unknown') { await say(tt('v.lang.ask')); return }
    }
    if (p?.kind === 'choose' && intent === 'unknown') { await doRoutine(p.action, text, p.ids); return }
    pending.current = null
    switch (intent) {
      case 'stop': cancelSpeech(); setSt('ready'); addMsg('asst', tt('v.stopped')); return
      case 'repeat': await say(lastReply.current || tt('v.repeat.none'), !lastReply.current); return
      case 'instructions': await say(tt('v.help.list')); return
      case 'language': {
        const target = matchLanguage(text)
        if (target) applyLang(target)
        else { pending.current = { kind: 'language' }; await say(tt('v.lang.ask')) }
        return
      }
      case 'help': await doHelp(); return
      case 'checkin': await doCheckin(); return
      case 'complete': await doRoutine('complete', text); return
      case 'snooze': await doRoutine('snooze', text); return
      case 'today': await doToday(); return
      default: await say(tt('v.unknown'))
    }
  }

  const handle = async (raw: string) => {
    const text = raw.trim()
    if (!text || busy.current) return
    const n = normalize(text); const now = Date.now()
    if (n === lastHandled.current.text && now - lastHandled.current.at < 1500) return // duplicate recognizer/event
    lastHandled.current = { text: n, at: now }
    addMsg('you', text); setHeard(text); setError(''); setRetry(null)
    cancelSpeech()
    await dispatch(text)
  }

  const onMic = () => {
    if (statusRef.current === 'listening') { rec.current?.abort(); rec.current = null; setSt('ready'); return }
    if (busy.current) return
    cancelSpeech(); setError(''); setRetry(null); setHeard('')
    const r = createRecognizer(langRef.current, {
      onStart: () => setSt('listening'),
      onInterim: (t) => alive.current && setHeard(t),
      onFinal: (t) => { rec.current = null; setSt('processing'); void handle(t).finally(() => { if (statusRef.current === 'processing') setSt('ready') }) },
      onError: (e) => { rec.current = null; setSt('ready'); showError(tt(ERR_KEY[e])) },
      onEnd: () => { rec.current = null; if (statusRef.current === 'listening') setSt('ready') },
    })
    if (!r) { setError(tt('v.nosr')); return }
    rec.current = r
    try { r.start() } catch { rec.current = null; setSt('ready'); showError(tt('v.err.generic')) }
  }

  const stopSpeaking = () => { cancelSpeech(); if (statusRef.current === 'speaking') setSt('ready') }
  const toggleMute = () => {
    const next = !mutedRef.current
    mutedRef.current = next; setMuted(next); localStorage.setItem('gc_voice_muted', next ? '1' : '0')
    if (next) { stopSpeaking(); addMsg('asst', tt('v.muted')) }
  }

  // Language switched (by selector or voice): stop everything in flight, then confirm if the change came from voice.
  useEffect(() => {
    cancelSpeech(); rec.current?.abort(); rec.current = null; pending.current = null
    if (statusRef.current !== 'processing') setSt('ready')
    if (langChangeMsg.current) { langChangeMsg.current = false; void say(translate(lang, 'v.lang.done')) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; rec.current?.abort(); rec.current = null; cancelSpeech() }
  }, [])

  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])

  const shown: Status = status === 'ready' && error ? 'error' : status
  const listening = status === 'listening'

  return (
    <details className="card voice" onToggle={(e) => {
        if (!e.currentTarget.open) {
          rec.current?.abort()
          rec.current = null
          pending.current = null
          stopSpeaking()
          if (statusRef.current === 'listening') setSt('ready')
        }
      }}>
      <summary className="voice-top">
        <h2 id="vt"><Mic size={22} aria-hidden /> {tt('v.title')}</h2>
        <span className={`vstate ${shown}`} role="status" aria-live="polite">{tt('v.s.' + shown)}</span>
      </summary>
      <div className="voice-body">
      <button className={`btn big primary mic ${listening ? 'live' : ''}`} aria-pressed={listening} disabled={!srOk || status === 'processing'} onClick={onMic}>
        {listening ? <MicOff size={30} aria-hidden /> : <Mic size={30} aria-hidden />} {listening ? tt('v.mic.stop') : tt('v.mic')}
      </button>
      <div className="actions">
        <button className="btn" onClick={stopSpeaking} disabled={status !== 'speaking'}><Square size={18} aria-hidden /> {tt('v.stop')}</button>
        <button className="btn" onClick={toggleMute} aria-pressed={muted}>{muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />} {muted ? tt('v.unmute') : tt('v.mute')}</button>
      </div>
      {!srOk && <p className="info small">{tt('v.nosr')}</p>}
      {lang === 'te' && <p className="muted small">{tt('v.tehint')}</p>}
      {noVoice && !muted && <p className="muted small" role="status">{tt('v.notts')}</p>}
      {heard && <p className="heard" aria-live="polite"><strong>{tt('v.heard')}:</strong> “{heard}”</p>}
      {error && (
        <div className="verr" role="alert"><span>{error}</span>{retry && <button className="btn" onClick={retry}>{tt('retry')}</button>}</div>
      )}
      {helpStatus && (
        <p className="hstat" role="status">{tt('v.hs', { state: tt(helpStatus.open ? 'v.hs.open' : 'v.hs.resolved'), name: helpStatus.name })}{helpStatus.ts ? ` (${fmtDateTime(lang, helpStatus.ts)})` : ''}</p>
      )}
      <h3 className="sr">{tt('v.transcript')}</h3>
      <ol className="vlog" ref={logRef} role="log" aria-label={tt('v.transcript')}>
        {msgs.length === 0 && <li className="muted">{tt('v.empty')}</li>}
        {msgs.map((m) => <li key={m.id} className={`msg ${m.who}`}><strong>{tt(m.who === 'you' ? 'v.you' : 'v.asst')}:</strong> {m.text}</li>)}
      </ol>
      <form className="vform" onSubmit={(e) => { e.preventDefault(); const v = input; setInput(''); void handle(v) }}>
        <label className="sr" htmlFor="vinput">{tt('v.type')}</label>
        <input id="vinput" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={tt('v.placeholder')} autoComplete="off" />
        <button className="btn primary" type="submit" disabled={!input.trim() || status === 'processing'}>{tt('v.send')}</button>
      </form>
      <details><summary>{tt('v.how')}</summary><p>{tt('v.help.list')}</p></details>
      <p className="muted small">{tt('v.priv')}</p>
      </div>
    </details>
  )
}
