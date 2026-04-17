// État vide illustré — icône + message + CTA
import { motion } from 'framer-motion'
import Button from './Button'

export default function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
          className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mb-4"
        >
          <Icon size={28} className="text-slate-400" />
        </motion.div>
      )}
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 text-sm max-w-xs mb-6">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action}>{actionLabel}</Button>
      )}
    </motion.div>
  )
}
