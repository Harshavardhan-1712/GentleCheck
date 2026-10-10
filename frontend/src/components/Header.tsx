import { HeartHandshake, Home, Languages, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import type { Lang, Role } from '../types'
import RoleSwitcher from './RoleSwitcher'

export default function Header({ role, setRole, setLang }: { role: Role; setRole: (r: Role) => void; setLang: (l: Lang) => void }) {
  const t = useT()
  const lang = useLang()
  return (
    <header className="header">
      <div className="container header-in">
        <div className="brand">
          <HeartHandshake size={34} aria-hidden />
          <div><strong>GentleCheck</strong><span>{t('tagline')}</span></div>
        </div>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end><Home size={20} aria-hidden /> {t('nav.home')}</NavLink>
          <NavLink to="/settings"><Settings size={20} aria-hidden /> {t('nav.settings')}</NavLink>
        </nav>
        <label className="lang">
          <Languages size={20} aria-hidden /><span className="sr">{t('lang')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t('lang')}>
            <option value="en">English</option>
            <option value="te">తెలుగు</option>
          </select>
        </label>
        <RoleSwitcher role={role} onChange={setRole} />
      </div>
    </header>
  )
}
