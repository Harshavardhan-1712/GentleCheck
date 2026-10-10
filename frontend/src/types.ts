export type Lang = 'en' | 'te'
export type Role = 'parent' | 'family'
export interface Consent { share_checkins: boolean; share_routines: boolean; grace_minutes: number; contact_name: string; updated_at: string }
export interface Routine { id: number; kind: string; title_en: string; title_te: string; scheduled: string; status: 'pending' | 'done' | 'snoozed'; snoozed_until: string | null; share: boolean; detail?: string | null }
export interface Notice { id: number; kind: 'overdue' | 'help'; ts: string; resolved_at: string | null; simulated: true; contact: string }
export interface Dashboard {
  role: Role; now: string; demo_offset_minutes: number; consent: Consent; checkins_shared: boolean; routines_shared: boolean
  last_checkin: string | null; due_at: string | null; status: 'upcoming' | 'due' | 'overdue' | null; help_open: boolean
  routine_counts: { done: number; pending: number; snoozed: number }; notifications: Notice[]
}
export interface TimelineItem { id: number; ts: string; category: string; code: string; title_en: string | null; title_te: string | null }
export interface CheckinResult { id: number; ts: string; resolved_followup: boolean }
export interface ConsentUpdate { share_checkins?: boolean; share_routines?: boolean; grace_minutes?: number }
export interface AdvanceResult { demo_offset_minutes: number; advanced_minutes: number; escalation_created: boolean }
