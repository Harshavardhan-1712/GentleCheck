// Deterministic, dependency-free intent matching for English and Telugu (no AI services).
import type { Lang, Routine } from './types'

export type Intent = 'checkin' | 'today' | 'complete' | 'snooze' | 'help' | 'stop' | 'repeat' | 'language' | 'instructions' | 'unknown'

export const normalize = (s: string) =>
  s.normalize('NFC').toLowerCase().replace(/['’`]/g, '').replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

// English phrases match on word boundaries; Telugu phrases match as substrings (suffixes vary).
function has(norm: string, phrases: string[]) {
  const padded = ` ${norm} `
  return phrases.some((p) => (/[a-z]/.test(p) ? padded.includes(` ${p} `) : norm.includes(p)))
}

const RULES: [Intent, string[]][] = [
  ['stop', ['stop', 'quiet', 'silence', 'enough', 'ఆపండి', 'ఆపు', 'ఆపేయండి']],
  ['repeat', ['repeat', 'say that again', 'say again', 'again', 'pardon', 'what did you say', 'మళ్లీ చెప్ప', 'మళ్ళీ చెప్ప', 'మరోసారి']],
  ['instructions', ['what can i say', 'what can you do', 'voice help', 'commands', 'instructions', 'ఏమి చెప్పగలను', 'ఏం చెప్పగలను', 'ఏమి చెప్పాలి', 'ఏం చెప్పాలి', 'సూచనలు']],
  ['language', ['change language', 'switch language', 'language', 'english', 'telugu', 'భాష', 'తెలుగు', 'ఇంగ్లీష్', 'ఇంగ్లిష్']],
  ['help', ['i need help', 'need help', 'help me', 'help', 'సహాయం', 'హెల్ప్']],
  ['checkin', ['doing okay', 'doing ok', 'im okay', 'im ok', 'im fine', 'im good', 'i am okay', 'i am ok', 'i am fine', 'i am good', 'check in', 'checkin',
    'బాగానే ఉన్నాను', 'బాగానే ఉన్నా', 'బాగున్నాను', 'చెక్ ఇన్', 'చెకిన్']],
  ['complete', ['complete', 'completed', 'done', 'finished', 'finish', 'mark', 'పూర్త', 'అయిపోయింది']],
  ['snooze', ['remind me later', 'remind me', 'later', 'snooze', 'not now', 'postpone', 'delay', 'తర్వాత', 'వాయిదా', 'గుర్తు చేయ', 'గుర్తుచేయ']],
  ['today', ['what should i do', 'what do i have', 'read my reminders', 'read reminders', 'my reminders', 'reminders', 'today', 'whats next',
    'ఏం చేయాలి', 'ఏమి చేయాలి', 'రిమైండర్', 'చదవండి', 'చదువు', 'ఈ రోజు', 'ఈరోజు']],
]

export function matchIntent(raw: string): Intent {
  const n = normalize(raw)
  if (!n) return 'unknown'
  for (const [intent, phrases] of RULES) if (has(n, phrases)) return intent
  return 'unknown'
}

export function matchLanguage(raw: string): Lang | null {
  const n = normalize(raw)
  if (has(n, ['telugu', 'తెలుగు'])) return 'te'
  if (has(n, ['english', 'ఇంగ్లీష్', 'ఇంగ్లిష్'])) return 'en'
  return null
}

const KEYWORDS: Record<string, string[]> = {
  medication: ['medication', 'medicine', 'medicines', 'tablet', 'tablets', 'pill', 'pills', 'మందు', 'మాత్ర', 'టాబ్లెట్'],
  meal: ['meal', 'breakfast', 'lunch', 'dinner', 'food', 'eat', 'భోజనం', 'అల్పాహారం', 'తిండి', 'తినండి', 'టిఫిన్'],
  hydration: ['water', 'drink', 'glass', 'hydration', 'నీళ్లు', 'నీళ్ళు', 'నీరు', 'తాగ'],
  movement: ['walk', 'walking', 'movement', 'exercise', 'garden', 'నడక', 'తోట'],
  call: ['call', 'phone', 'family', 'ఫోన్', 'కుటుంబం'],
  custom: ['plant', 'plants', 'tulsi', 'తులసి', 'మొక్క'],
}

export type Match = { kind: 'none' } | { kind: 'one'; routine: Routine } | { kind: 'many'; routines: Routine[] }

// A routine is ignored when one of its "unless" words is present (e.g. "water the tulsi plant" is not the hydration routine).
const UNLESS: Record<string, string[]> = { hydration: ['plant', 'plants', 'tulsi', 'తులసి', 'మొక్క'] }

/** Safe rule: exactly one routine with any keyword hit = match; several = ambiguous (caller must ask). */
function bestByKeywords(norm: string, routines: Routine[]): Match {
  const hits = routines.filter((r) => !has(norm, UNLESS[r.kind] ?? []) && (KEYWORDS[r.kind] ?? []).some((k) => has(norm, [k])))
  if (!hits.length) return { kind: 'none' }
  return hits.length === 1 ? { kind: 'one', routine: hits[0] } : { kind: 'many', routines: hits }
}

export const matchRoutine = (raw: string, routines: Routine[]): Match => bestByKeywords(normalize(raw), routines)

const ORDINALS: [string, number][] = [
  ['first', 1], ['one', 1], ['second', 2], ['two', 2], ['third', 3], ['three', 3], ['fourth', 4], ['four', 4], ['fifth', 5], ['five', 5], ['sixth', 6], ['six', 6],
  ['మొదటి', 1], ['ఒకటి', 1], ['రెండు', 2], ['రెండవ', 2], ['మూడు', 3], ['మూడవ', 3], ['నాలుగు', 4], ['ఐదు', 5], ['ఆరు', 6],
]

/** Resolve an answer to "Which one?" among the offered candidates (number first, then name). */
export function pickChoice(raw: string, candidates: Routine[]): Match {
  const n = normalize(raw)
  const tokens = n.split(' ')
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) { const i = Number(tok) - 1; if (candidates[i]) return { kind: 'one', routine: candidates[i] } }
  }
  for (const [w, num] of ORDINALS) {
    const hit = /[a-z]/.test(w) ? tokens.includes(w) : tokens.some((t) => t.startsWith(w))
    if (hit && candidates[num - 1]) return { kind: 'one', routine: candidates[num - 1] }
  }
  return bestByKeywords(n, candidates)
}
