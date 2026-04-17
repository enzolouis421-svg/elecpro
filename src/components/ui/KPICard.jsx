// Carte KPI avec animation count-up
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

function useCountUp(target, duration = 1200, started = false) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!started) return
    const start = performance.now()
    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setValue(target * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, started])

  return value
}

export default function KPICard({ title, value, icon: Icon, color = 'amber', format = 'currency', subtitle, pulse = false }) {
  const [started, setStarted] = useState(false)
  const numVal = parseFloat(value) || 0
  const animated = useCountUp(numVal, 1000, started)

  const colorMap = {
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400', border: 'border-amber-500/20' },
    green: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', border: 'border-blue-500/20' },
    red: { bg: 'bg-red-500/10', icon: 'text-red-400', border: 'border-red-500/20' },
  }
  const c = colorMap[color] || colorMap.amber

  function formatValue(v) {
    if (format === 'currency') {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    }
    if (format === 'percent') return `${Math.round(v)} %`
    return Math.round(v).toLocaleString('fr-FR')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      onViewportEnter={() => setStarted(true)}
      className={`bg-slate-800 rounded-2xl shadow-xl border ${c.border} p-5 cursor-default`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center relative`}>
          {pulse && (
            <motion.div
              className={`absolute inset-0 rounded-xl ${c.bg}`}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
          <Icon size={18} className={`${c.icon} relative z-10`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{formatValue(animated)}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </motion.div>
  )
}
