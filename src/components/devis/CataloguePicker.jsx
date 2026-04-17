// Panneau catalogue glissant — sélection rapide de prestations pour devis/factures
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, Tag } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatMontant } from '../../lib/utils'

export default function CataloguePicker({ open, onClose, onAjouter }) {
  const { prestations } = useApp()
  const [search, setSearch] = useState('')
  const [categorie, setCategorie] = useState('tous')

  const actives = prestations.filter(p => p.actif !== false)

  const categories = useMemo(() => (
    ['tous', ...new Set(actives.map(p => p.categorie).filter(Boolean).sort())]
  ), [actives])

  const filtered = useMemo(() => actives.filter(p => {
    const matchSearch = !search || p.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = categorie === 'tous' || p.categorie === categorie
    return matchSearch && matchCat
  }), [actives, search, categorie])

  // Grouper par catégorie si "tous"
  const grouped = useMemo(() => {
    if (categorie !== 'tous') return { [categorie]: filtered }
    return filtered.reduce((acc, p) => {
      const cat = p.categorie || 'Divers'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(p)
      return acc
    }, {})
  }, [filtered, categorie])

  function handleAjouter(p) {
    onAjouter(p)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Panel glissant */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">Catalogue</h2>
                <p className="text-slate-500 text-xs mt-0.5">{actives.length} prestations disponibles</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Recherche */}
            <div className="px-3 py-2 border-b border-slate-700 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCategorie('tous') }}
                  placeholder="Rechercher une prestation…"
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl text-white text-sm pl-8 pr-3 py-2 focus:border-amber-500 focus:outline-none placeholder-slate-500"
                />
              </div>
            </div>

            {/* Onglets catégories */}
            {!search && (
              <div className="flex gap-1 px-3 py-2 border-b border-slate-700 overflow-x-auto flex-shrink-0 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategorie(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      categorie === cat
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat === 'tous' ? 'Toutes' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Liste */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Aucune prestation trouvée
                </div>
              ) : (
                Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    {categorie === 'tous' && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <Tag size={11} className="text-amber-500" />
                        <p className="text-amber-500 text-xs font-semibold uppercase tracking-wide">{cat}</p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {items.map(p => (
                        <motion.div
                          key={p.id}
                          whileHover={{ x: 2 }}
                          className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-amber-500/40 rounded-xl px-3 py-2.5 group transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm leading-snug truncate group-hover:text-amber-300 transition-colors">
                              {p.description}
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              <span className="text-amber-400 font-semibold">{formatMontant(p.prix_ht)}</span>
                              {' '}HT / {p.unite}
                              <span className="text-slate-600 ml-2">TVA {p.tva}%</span>
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleAjouter(p)}
                            className="w-7 h-7 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center justify-center text-black flex-shrink-0 transition-colors"
                          >
                            <Plus size={14} />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-3 border-t border-slate-700 flex-shrink-0">
              <p className="text-slate-600 text-xs text-center">
                Cliquez sur <span className="text-amber-500">+</span> pour ajouter une prestation au document
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
