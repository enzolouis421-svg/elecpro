// Transition de page : fadeIn + slideUp
import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
}

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="flex-1 min-h-0"
    >
      {children}
    </motion.div>
  )
}
