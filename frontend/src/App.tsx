import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import FamilyDashboard from './pages/FamilyDashboard'
import ParentDashboard from './pages/ParentDashboard'
import SettingsPage from './pages/SettingsPage'
import { LangCtx, useT } from './i18n'
import type { Lang, Role } from './types'

function Footer() {
  const t = useT()
  return <footer className="footer">{t('footer')} {t('demo.fictional')}</footer>
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('gc_lang') === 'te' ? 'te' : 'en'))
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('gc_role') === 'family' ? 'family' : 'parent'))
  useEffect(() => { localStorage.setItem('gc_lang', lang); document.documentElement.lang = lang }, [lang])
  useEffect(() => { localStorage.setItem('gc_role', role) }, [role])
  return (
    <LangCtx.Provider value={lang}>
      <a href="#main" className="skip">Skip to content</a>
      <Header role={role} setRole={setRole} setLang={setLang} />
      <main id="main" className="container">
        <Routes>
          <Route path="/" element={role === 'parent' ? <ParentDashboard setLang={setLang} /> : <FamilyDashboard />} />
          <Route path="/settings" element={<SettingsPage key={role} role={role} setLang={setLang} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </LangCtx.Provider>
  )
}
