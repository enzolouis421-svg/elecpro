// Carte réutilisable
import { motion } from 'framer-motion'

export default function Card({ children, className = '', onClick, hover = false, ...props }) {
  const Component = onClick || hover ? motion.div : 'div'
  const motionProps = (onClick || hover) ? {
    whileHover: { scale: 1.01, y: -2 },
    transition: { duration: 0.15 },
  } : {}

  return (
    <Component
      className={`bg-slate-800 rounded-2xl shadow-xl border border-slate-700 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  )
}
