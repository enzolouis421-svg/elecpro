// Modal réutilisable avec animation Framer Motion
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideClose = false,
}) {
  // Fermeture sur Échap
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Contenu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
          >
            {/* Header */}
            {(title || !hideClose) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
                {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="ml-auto text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Corps scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
