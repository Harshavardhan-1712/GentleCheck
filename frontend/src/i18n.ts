import { createContext, useContext } from 'react'
import type { Lang } from './types'
import { voiceEn, voiceTe } from './voiceStrings'

type Dict = Record<string, string>
const en: Dict = {
  tagline: 'Independence for them. Peace of mind for you.', 'nav.home': 'Home', 'nav.settings': 'Settings',
  'role.parent': 'Parent', 'role.family': 'Family', 'role.demo': 'Demo mode switch — not real login', lang: 'Language',
  'greet.m': 'Good morning', 'greet.a': 'Good afternoon', 'greet.e': 'Good evening',
  'checkin.btn': "I'm doing okay", 'checkin.done': 'Thank you! Your check-in was saved.', 'help.btn': 'I need help',
  'help.done': 'Help request sent (simulated). Your family contact will be told.', 'help.already': 'A help request is already open.',
  'last.checkin': 'Last check-in', 'none': 'No check-in yet', 'next.checkin': 'Next check-in due',
  'status.upcoming': 'On track', 'status.due': 'Waiting for check-in', 'status.overdue': 'Overdue — follow-up created', 'status.label': 'Check-in status',
  'routines.title': "Today's care routines", 'routines.empty': 'No routines to show yet.',
  'r.done': 'Done', 'r.pending': 'To do', 'r.snoozed': 'Snoozed until {t}', 'btn.complete': 'Mark done', 'btn.snooze': 'Snooze 30 min',
  'r.done.msg': 'Marked as done.', 'r.snooze.msg': 'Snoozed for 30 minutes.', 'r.note': 'Your note',
  'routine.add.title': 'Add a reminder', 'routine.name': 'Reminder name', 'routine.time': 'Time', 'routine.add.button': 'Add reminder', 'routine.added': 'Reminder added.',
  'med.note': 'Reminders repeat only what you entered. GentleCheck never suggests medicines or doses.',
  'share.title': 'What is shared', 'share.checkins': 'Check-ins', 'share.routines': 'Care routines', 'share.on': 'Shared with {name}',
  'share.off': 'Not shared', 'share.never': 'Never shared: location, health data, medication notes.',
  'family.title': 'Family view', 'family.hidden': 'The parent has turned off sharing of check-ins, so nothing about them is shown here.',
  'family.rhidden': 'Routine sharing is turned off.', 'family.caution': 'A missed check-in is not proof of an emergency. Please reach out gently.',
  'counts': '{d} done · {p} to do · {s} snoozed',
  'timeline.title': 'Recent activity', 'timeline.empty': 'Nothing here yet. Activity will appear after the first check-in.',
  checkin_done: 'Checked in: doing okay', routine_added: 'Added reminder: {title}', routine_done: 'Completed: {title}', routine_snoozed: 'Snoozed: {title}',
  followup_created: 'Check-in overdue — follow-up created', followup_resolved: 'Follow-up resolved by a later check-in', help_requested: 'Help requested',
  consent_checkins_on: 'Check-in sharing turned on', consent_checkins_off: 'Check-in sharing turned off',
  consent_routines_on: 'Routine sharing turned on', consent_routines_off: 'Routine sharing turned off',
  routine_sharing_on: 'Sharing of one routine turned on', routine_sharing_off: 'Sharing of one routine turned off', grace_changed: 'Grace period changed',
  'notify.title': 'Follow-up notifications', 'notify.sim': 'SIMULATION — no real SMS, email or call is sent.',
  'notify.overdue': 'To {name}: no check-in received yet. Please reach out gently.', 'notify.help': 'To {name}: your parent asked for help.',
  'notify.empty': 'No notifications.', 'notify.resolved': 'Resolved', 'notify.open': 'Open',
  'demo.title': 'Demo controls (simulated time)', 'demo.clock': 'Demo clock', 'demo.p1': '+1 hour', 'demo.p6': '+6 hours',
  'demo.overdue': 'Trigger overdue scenario', 'demo.grace': 'Grace period', 'demo.min': '{n} min', 'demo.advanced': 'Demo clock advanced.',
  'demo.escalated': 'Overdue: follow-up and simulated notification created.',
  'settings.title': 'Settings', 'consent.title': 'Family-sharing consent', 'consent.only': 'Only the parent can change sharing. Switch to Parent mode.',
  'consent.saved': 'Settings saved.', 'consent.each': 'Share each routine', 'reset.btn': 'Reset demo data',
  'reset.confirm': 'Reset all demo data? This cannot be undone.', 'reset.done': 'Demo data reset.', 'demo.fictional': 'All data is fictional demo data.',
  loading: 'Loading…', retry: 'Try again', 'err.network': 'Cannot reach the GentleCheck server. Is the backend running on port 8000?',
  'err.generic': 'Something went wrong. Please try again.', 'footer': 'Demo mode switch is not secure access control. Notifications are simulated.',
}
const te: Dict = {
  tagline: 'వారికి స్వతంత్రం. మీకు మనశ్శాంతి.', 'nav.home': 'హోమ్', 'nav.settings': 'సెట్టింగ్‌లు',
  'role.parent': 'తల్లిదండ్రులు', 'role.family': 'కుటుంబం', 'role.demo': 'డెమో మోడ్ స్విచ్ — నిజమైన లాగిన్ కాదు', lang: 'భాష',
  'greet.m': 'శుభోదయం', 'greet.a': 'శుభ మధ్యాహ్నం', 'greet.e': 'శుభ సాయంత్రం',
  'checkin.btn': 'నేను బాగానే ఉన్నాను', 'checkin.done': 'ధన్యవాదాలు! మీ చెక్-ఇన్ సేవ్ అయింది.', 'help.btn': 'నాకు సహాయం కావాలి',
  'help.done': 'సహాయ అభ్యర్థన పంపబడింది (అనుకరణ). మీ కుటుంబ సభ్యులకు తెలియజేయబడుతుంది.', 'help.already': 'సహాయ అభ్యర్థన ఇప్పటికే తెరిచి ఉంది.',
  'last.checkin': 'చివరి చెక్-ఇన్', 'none': 'ఇంకా చెక్-ఇన్ లేదు', 'next.checkin': 'తదుపరి చెక్-ఇన్ గడువు',
  'status.upcoming': 'సమయానికి ఉంది', 'status.due': 'చెక్-ఇన్ కోసం ఎదురుచూస్తున్నాం', 'status.overdue': 'ఆలస్యం — ఫాలో-అప్ సృష్టించబడింది', 'status.label': 'చెక్-ఇన్ స్థితి',
  'routines.title': 'ఈ రోజు సంరక్షణ పనులు', 'routines.empty': 'చూపించడానికి ఇంకా పనులు లేవు.',
  'r.done': 'పూర్తయింది', 'r.pending': 'చేయాలి', 'r.snoozed': '{t} వరకు వాయిదా', 'btn.complete': 'పూర్తయింది', 'btn.snooze': '30 నిమిషాలు వాయిదా',
  'r.done.msg': 'పూర్తయినట్లు గుర్తించబడింది.', 'r.snooze.msg': '30 నిమిషాలు వాయిదా వేయబడింది.', 'r.note': 'మీ గమనిక',
  'routine.add.title': 'రిమైండర్ జోడించండి', 'routine.name': 'రిమైండర్ పేరు', 'routine.time': 'సమయం', 'routine.add.button': 'రిమైండర్ జోడించండి', 'routine.added': 'రిమైండర్ జోడించబడింది.',
  'med.note': 'రిమైండర్లు మీరు నమోదు చేసినవే చెబుతాయి. GentleCheck మందులు లేదా మోతాదులను ఎప్పుడూ సూచించదు.',
  'share.title': 'ఏమి పంచబడుతుంది', 'share.checkins': 'చెక్-ఇన్‌లు', 'share.routines': 'సంరక్షణ పనులు', 'share.on': '{name} తో పంచబడింది',
  'share.off': 'పంచబడదు', 'share.never': 'ఎప్పటికీ పంచబడనివి: స్థానం, ఆరోగ్య సమాచారం, మందుల గమనికలు.',
  'family.title': 'కుటుంబ వీక్షణ', 'family.hidden': 'తల్లిదండ్రులు చెక్-ఇన్ పంచుకోవడం ఆపివేశారు, కాబట్టి వారి గురించి ఇక్కడ ఏమీ కనిపించదు.',
  'family.rhidden': 'పనుల పంచుకోవడం ఆపివేయబడింది.', 'family.caution': 'చెక్-ఇన్ మిస్ అవడం అత్యవసరానికి రుజువు కాదు. దయచేసి మెల్లగా ఆరా తీయండి.',
  'counts': '{d} పూర్తి · {p} చేయాలి · {s} వాయిదా',
  'timeline.title': 'ఇటీవలి కార్యకలాపాలు', 'timeline.empty': 'ఇక్కడ ఇంకా ఏమీ లేదు. మొదటి చెక్-ఇన్ తర్వాత కార్యకలాపాలు కనిపిస్తాయి.',
  checkin_done: 'చెక్-ఇన్: బాగానే ఉన్నారు', routine_added: 'రిమైండర్ జోడించారు: {title}', routine_done: 'పూర్తి చేశారు: {title}', routine_snoozed: 'వాయిదా వేశారు: {title}',
  followup_created: 'చెక్-ఇన్ ఆలస్యం — ఫాలో-అప్ సృష్టించబడింది', followup_resolved: 'తర్వాతి చెక్-ఇన్‌తో ఫాలో-అప్ పరిష్కరించబడింది', help_requested: 'సహాయం కోరారు',
  consent_checkins_on: 'చెక్-ఇన్ పంచుకోవడం ఆన్ చేయబడింది', consent_checkins_off: 'చెక్-ఇన్ పంచుకోవడం ఆఫ్ చేయబడింది',
  consent_routines_on: 'పనుల పంచుకోవడం ఆన్ చేయబడింది', consent_routines_off: 'పనుల పంచుకోవడం ఆఫ్ చేయబడింది',
  routine_sharing_on: 'ఒక పని పంచుకోవడం ఆన్ చేయబడింది', routine_sharing_off: 'ఒక పని పంచుకోవడం ఆఫ్ చేయబడింది', grace_changed: 'గ్రేస్ వ్యవధి మార్చబడింది',
  'notify.title': 'ఫాలో-అప్ నోటిఫికేషన్లు', 'notify.sim': 'అనుకరణ — నిజమైన SMS, ఇమెయిల్ లేదా కాల్ పంపబడదు.',
  'notify.overdue': '{name} కు: చెక్-ఇన్ ఇంకా రాలేదు. దయచేసి మెల్లగా ఆరా తీయండి.', 'notify.help': '{name} కు: మీ తల్లిదండ్రులు సహాయం కోరారు.',
  'notify.empty': 'నోటిఫికేషన్లు లేవు.', 'notify.resolved': 'పరిష్కరించబడింది', 'notify.open': 'తెరిచి ఉంది',
  'demo.title': 'డెమో నియంత్రణలు (అనుకరణ సమయం)', 'demo.clock': 'డెమో గడియారం', 'demo.p1': '+1 గంట', 'demo.p6': '+6 గంటలు',
  'demo.overdue': 'ఆలస్య పరిస్థితిని ప్రారంభించు', 'demo.grace': 'గ్రేస్ వ్యవధి', 'demo.min': '{n} నిమిషాలు', 'demo.advanced': 'డెమో గడియారం ముందుకు జరిగింది.',
  'demo.escalated': 'ఆలస్యం: ఫాలో-అప్, అనుకరణ నోటిఫికేషన్ సృష్టించబడ్డాయి.',
  'settings.title': 'సెట్టింగ్‌లు', 'consent.title': 'కుటుంబంతో పంచుకునే అనుమతి', 'consent.only': 'పంచుకోవడాన్ని తల్లిదండ్రులు మాత్రమే మార్చగలరు. తల్లిదండ్రుల మోడ్‌కు మారండి.',
  'consent.saved': 'సెట్టింగ్‌లు సేవ్ అయ్యాయి.', 'consent.each': 'ప్రతి పనిని పంచుకోండి', 'reset.btn': 'డెమో డేటా రీసెట్ చేయండి',
  'reset.confirm': 'మొత్తం డెమో డేటాను రీసెట్ చేయాలా? దీన్ని వెనక్కి తీసుకోలేరు.', 'reset.done': 'డెమో డేటా రీసెట్ అయింది.', 'demo.fictional': 'ఇక్కడి డేటా అంతా కల్పిత డెమో డేటా.',
  loading: 'లోడ్ అవుతోంది…', retry: 'మళ్లీ ప్రయత్నించండి', 'err.network': 'GentleCheck సర్వర్‌ను చేరుకోలేకపోయాం. బ్యాకెండ్ 8000 పోర్ట్‌లో నడుస్తోందా?',
  'err.generic': 'ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.', 'footer': 'డెమో మోడ్ స్విచ్ సురక్షిత యాక్సెస్ నియంత్రణ కాదు. నోటిఫికేషన్లు అనుకరణ మాత్రమే.',
}
const dicts: Record<Lang, Dict> = { en: { ...en, ...voiceEn }, te: { ...te, ...voiceTe } }

export const LangCtx = createContext<Lang>('en')
export const useLang = () => useContext(LangCtx)
export function translate(lang: Lang, key: string, vars: Record<string, string | number> = {}) {
  return (dicts[lang][key] ?? dicts.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}
export function useT() {
  const lang = useLang()
  return (key: string, vars: Record<string, string | number> = {}) => translate(lang, key, vars)
}
const locale = (l: Lang) => (l === 'te' ? 'te-IN' : 'en-IN')
export const fmtDateTime = (l: Lang, iso: string) => new Date(iso).toLocaleString(locale(l), { dateStyle: 'medium', timeStyle: 'short' })
export const fmtTime = (l: Lang, iso: string) => new Date(iso).toLocaleTimeString(locale(l), { timeStyle: 'short' })
export const fmtDate = (l: Lang, d: Date) => d.toLocaleDateString(locale(l), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const pick = (l: Lang, o: { title_en: string | null; title_te: string | null }) => (l === 'te' ? o.title_te : o.title_en) ?? ''
