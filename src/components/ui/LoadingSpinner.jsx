// Spinner de chargement
import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        className={`${sizes[size]} border-2 border-slate-700 border-t-amber-500 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  )
}
