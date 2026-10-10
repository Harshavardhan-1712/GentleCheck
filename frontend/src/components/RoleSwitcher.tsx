import { Info, User, Users } from 'lucide-react'
import { useT } from '../i18n'
import type { Role } from '../types'

export default function RoleSwitcher({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const t = useT()
  return (
    <div className="role-control">
      <div className="roles" role="group" aria-label={t('role.demo')} title={t('role.demo')}>
        <button className={role === 'parent' ? 'on' : ''} aria-pressed={role === 'parent'} onClick={() => onChange('parent')}><User size={18} aria-hidden /> {t('role.parent')}</button>
        <button className={role === 'family' ? 'on' : ''} aria-pressed={role === 'family'} onClick={() => onChange('family')}><Users size={18} aria-hidden /> {t('role.family')}</button>
      </div>
      <span className="demo-label"><Info size={14} aria-hidden /> {t('role.demo.notice')}</span>
    </div>
  )
}
