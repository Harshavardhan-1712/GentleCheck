import test from 'node:test'
import assert from 'node:assert/strict'
import { matchIntent, matchRoutine, pickChoice, matchLanguage } from '../src/voiceCommands.ts'

const R = (id, kind, status = 'pending') => ({ id, kind, status, title_en: kind, title_te: kind, scheduled: '08:00', snoozed_until: null, share: true })
const routines = [R(1, 'custom'), R(2, 'meal'), R(3, 'medication'), R(4, 'hydration'), R(5, 'movement'), R(6, 'call')]

test('English intents', () => {
  const cases = { "I'm doing okay.": 'checkin', 'Check in': 'checkin', 'What should I do today?': 'today', 'Read my reminders': 'today',
    'Mark my meal reminder complete': 'complete', 'Remind me later': 'snooze', 'I need help': 'help', 'Stop speaking': 'stop', 'Repeat that': 'repeat',
    'Change language': 'language', 'What can I say?': 'instructions', 'blah': 'unknown', 'meal': 'unknown' }
  for (const [t, i] of Object.entries(cases)) assert.equal(matchIntent(t), i, t)
})
test('Telugu intents', () => {
  const cases = { 'నేను బాగానే ఉన్నాను': 'checkin', 'ఈ రోజు నేను ఏం చేయాలి': 'today', 'నా రిమైండర్లు చదవండి': 'today', 'భోజనం పూర్తయింది': 'complete',
    'తర్వాత గుర్తు చేయండి': 'snooze', 'నాకు సహాయం కావాలి': 'help', 'ఆపండి': 'stop', 'మళ్లీ చెప్పండి': 'repeat', 'భాష మార్చండి': 'language', 'నేను ఏమి చెప్పగలను': 'instructions' }
  for (const [t, i] of Object.entries(cases)) assert.equal(matchIntent(t), i, t)
})
test('routine matching is unambiguous or asks', () => {
  assert.equal(matchRoutine('mark my meal reminder complete', routines).routine.id, 2)
  assert.equal(matchRoutine('water the tulsi plant done', routines).routine.id, 1)
  assert.equal(matchRoutine('drink water done', routines).routine.id, 4)
  assert.equal(matchRoutine('భోజనం పూర్తయింది', routines).routine.id, 2)
  assert.equal(matchRoutine('call my family and walk', routines).kind, 'many')
  assert.equal(matchRoutine('done', routines).kind, 'none')
})
test('choices and language', () => {
  const c = [routines[1], routines[2]]
  assert.equal(pickChoice('2', c).routine.id, 3)
  assert.equal(pickChoice('the first one', c).routine.id, 2)
  assert.equal(pickChoice('రెండు', c).routine.id, 3)
  assert.equal(pickChoice('medicine', c).routine.id, 3)
  assert.equal(matchLanguage('Telugu please'), 'te')
  assert.equal(matchLanguage('ఇంగ్లీష్'), 'en')
})
