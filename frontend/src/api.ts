import { useCallback, useEffect, useState } from 'react'
import type { AdvanceResult, CheckinResult, Consent, ConsentUpdate, Dashboard, Role, Routine, TimelineItem } from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function req<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError('network', 0)
  }
  if (!r.ok) throw new ApiError('http', r.status)
  if (r.status === 204) return undefined as T
  return r.json() as Promise<T>
}

export const api = {
  dashboard: (role: Role) => req<Dashboard>(`/api/dashboard?role=${role}`),
  routines: (role: Role) => req<Routine[]>(`/api/routines?role=${role}`),
  addRoutine: (body: { title: string; scheduled: string }) => req<Routine>('/api/routines', 'POST', body),
  updateRoutine: (id: number, body: { title: string; scheduled: string }) => req<Routine>(`/api/routines/${id}`, 'PATCH', body),
  deleteRoutine: (id: number) => req<void>(`/api/routines/${id}`, 'DELETE'),
  timeline: (role: Role) => req<TimelineItem[]>(`/api/timeline?role=${role}`),
  consent: () => req<Consent>('/api/consent'),
  putConsent: (b: ConsentUpdate) => req<Consent>('/api/consent', 'PUT', b),
  shareRoutine: (id: number, share: boolean) => req<Routine>(`/api/routines/${id}/sharing`, 'PUT', { share }),
  checkin: () => req<CheckinResult>('/api/checkins', 'POST'),
  complete: (id: number) => req<Routine>(`/api/routines/${id}/complete`, 'POST'),
  snooze: (id: number, minutes = 30) => req<Routine>(`/api/routines/${id}/snooze`, 'POST', { minutes }),
  help: () => req<{ created: boolean }>('/api/help', 'POST'),
  advance: (b: { minutes?: number; to_overdue?: boolean }) => req<AdvanceResult>('/api/demo/advance-time', 'POST', b),
  reset: () => req<Dashboard>('/api/demo/reset', 'POST'),
}

export function useApi<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    try { setData(await fn()); setError(null) } catch (e) { setError(e as ApiError) } finally { setLoading(false) }
  }, deps)
  useEffect(() => { setLoading(true); void reload() }, [reload])
  return { data, error, loading, reload }
}
