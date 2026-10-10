// Thin, feature-detected wrappers around the Web Speech API. No audio or transcripts are stored or sent by this app.
import type { Lang } from './types'

interface SRAlt { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlt }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SR {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  onstart: (() => void) | null; onresult: ((e: SREvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type SRCtor = new () => SR

export const RECOG_LANG: Record<Lang, string> = { en: 'en-IN', te: 'te-IN' }
export type VoiceError = 'permission' | 'nomic' | 'nospeech' | 'lang' | 'network' | 'generic'

function recognitionCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
export const recognitionSupported = () => recognitionCtor() !== null

export class TimeoutError extends Error {}
export function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new TimeoutError('timeout')), ms)
    p.then((v) => { clearTimeout(id); resolve(v) }, (e) => { clearTimeout(id); reject(e) })
  })
}

export interface RecognizerHandlers {
  onStart(): void; onInterim(text: string): void; onFinal(text: string): void; onError(e: VoiceError): void; onEnd(): void
}
export interface Recognizer { start(): void; abort(): void }

const ERR_MAP: Record<string, VoiceError> = {
  'not-allowed': 'permission', 'service-not-allowed': 'permission', 'audio-capture': 'nomic', 'no-speech': 'nospeech',
  'language-not-supported': 'lang', network: 'network',
}

/** One-shot recognizer (never continuous). Stops itself after `timeoutMs`. Returns null if unsupported. */
export function createRecognizer(lang: Lang, h: RecognizerHandlers, timeoutMs = 10000): Recognizer | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null
  const r = new Ctor()
  r.lang = RECOG_LANG[lang]; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1
  let timer: ReturnType<typeof setTimeout> | undefined
  let gotFinal = false
  let errored = false
  r.onstart = () => { h.onStart(); timer = setTimeout(() => { try { r.stop() } catch { /* already stopped */ } }, timeoutMs) }
  r.onresult = (e) => {
    let interim = ''; let fin = ''
    for (let i = e.resultIndex; i < e.results.length; i++) { const res = e.results[i]; if (res.isFinal) fin += res[0].transcript; else interim += res[0].transcript }
    if (interim) h.onInterim(interim)
    if (fin.trim() && !gotFinal) { gotFinal = true; h.onFinal(fin.trim()) }
  }
  r.onerror = (e) => { if (e.error === 'aborted') return; errored = true; h.onError(ERR_MAP[e.error] ?? 'generic') }
  r.onend = () => { if (timer) clearTimeout(timer); if (!gotFinal && !errored) h.onError('nospeech'); h.onEnd() }
  return {
    start: () => r.start(),
    abort: () => { if (timer) clearTimeout(timer); r.onstart = r.onresult = r.onerror = r.onend = null; try { r.abort() } catch { /* ignore */ } },
  }
}

// ---------- speech synthesis ----------
export const synthSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
let seq = 0

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const have = window.speechSynthesis.getVoices()
  if (have.length) return Promise.resolve(have)
  return new Promise((resolve) => {
    const done = () => { window.speechSynthesis.removeEventListener('voiceschanged', done); resolve(window.speechSynthesis.getVoices()) }
    window.speechSynthesis.addEventListener('voiceschanged', done)
    setTimeout(done, 1500)
  })
}
const norm = (l: string) => l.toLowerCase().replace('_', '-')
async function findVoice(lang: Lang) {
  const voices = await loadVoices()
  const want = RECOG_LANG[lang].toLowerCase()
  return voices.find((v) => norm(v.lang) === want) ?? voices.find((v) => norm(v.lang).startsWith(lang))
}

export function cancelSpeech() {
  seq++ // invalidates callbacks of any in-flight utterance
  if (synthSupported()) window.speechSynthesis.cancel()
}

/** Cancels current speech, then speaks. Resolves 'novoice' if the browser has no voice for the language. */
export async function speak(text: string, lang: Lang, onEnd: () => void): Promise<'spoken' | 'novoice' | 'unsupported'> {
  if (!synthSupported()) return 'unsupported'
  cancelSpeech()
  const id = seq
  const voice = await findVoice(lang)
  if (id !== seq) return 'spoken' // superseded or cancelled while voices loaded
  if (!voice) return 'novoice'
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice; u.lang = voice.lang; u.rate = 0.9
  const finish = () => { if (id === seq) onEnd() }
  u.onend = finish; u.onerror = finish
  window.speechSynthesis.speak(u)
  return 'spoken'
}
