import { AlertCircle, Loader2 } from 'lucide-react'
import { ApiError } from '../api'
import { useT } from '../i18n'

export function errKey(e: unknown) { return e instanceof ApiError && e.status === 0 ? 'err.network' : 'err.generic' }

export function Loading() {
  const t = useT()
  return <p className="muted center" role="status"><Loader2 className="spin" size={20} aria-hidden /> {t('loading')}</p>
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT()
  return (
    <div className="card err" role="alert">
      <AlertCircle size={24} aria-hidden /><p>{t(errKey(error))}</p>
      <button className="btn" onClick={onRetry}>{t('retry')}</button>
    </div>
  )
}

export function Toast({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return <div className={`toast ${msg.ok ? 'ok' : 'bad'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>
}
