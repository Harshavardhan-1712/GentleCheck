import type { ReactNode } from 'react'

export default function StatCard({ icon, label, value, tone = '' }: { icon: ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className={`card stat ${tone}`}>
      <span className="stat-ic" aria-hidden>{icon}</span>
      <div><div className="muted">{label}</div><div className="stat-v">{value}</div></div>
    </div>
  )
}
