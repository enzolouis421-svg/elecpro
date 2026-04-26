// Planning & Agenda — calendrier mensuel + semaine + interventions multi-jours + iCal
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Clock, HardHat, Save, Trash2, Download,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, isWithinInterval,
  parseISO, addMonths, subMonths, addWeeks, subWeeks,
  startOfWeek as soW, endOfWeek as eoW,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { genId } from '../../lib/storage'
import PageTransition from '../../components/layout/PageTransition'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

// Couleurs disponibles pour les interventions
const COULEURS = [
  { id: 'amber', label: 'Ambre', bg: 'bg-amber-500', text: 'text-black', hex: '#F59E0B' },
  { id: 'blue', label: 'Bleu', bg: 'bg-blue-500', text: 'text-white', hex: '#3B82F6' },
  { id: 'emerald', label: 'Vert', bg: 'bg-emerald-500', text: 'text-white', hex: '#10B981' },
  { id: 'red', label: 'Rouge', bg: 'bg-red-500', text: 'text-white', hex: '#EF4444' },
  { id: 'purple', label: 'Violet', bg: 'bg-purple-500', text: 'text-white', hex: '#8B5CF6' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500', text: 'text-white', hex: '#F97316' },
]

// Couleurs par statut chantier
const CHANTIER_COLORS = {
  preparation: { bg: 'bg-blue-600/80', text: 'text-white' },
  en_cours: { bg: 'bg-amber-500/90', text: 'text-black' },
  pause: { bg: 'bg-orange-500/80', text: 'text-white' },
  termine: { bg: 'bg-emerald-600/80', text: 'text-white' },
}

function getColor(couleurId) {
  return COULEURS.find(c => c.id === couleurId) || COULEURS[0]
}

export default function Planning() {
  const navigate = useNavigate()
  const { interventions, chantiers, clients, addIntervention, updateIntervention, deleteIntervention } = useApp()

  const [vue, setVue] = useState('mois') // 'mois' | 'semaine'
  const [dateCourante, setDateCourante] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(null) // { type: 'intervention'|'chantier', data }
  const [jourSelectionne, setJourSelectionne] = useState(null)
  const [form, setForm] = useState({
    titre: '', date_debut: '', date_fin: '', heure_debut: '08:00', heure_fin: '17:00',
    couleur: 'amber', chantier_id: '', notes: '', toute_journee: true,
  })
  const [editId, setEditId] = useState(null)

  // ── JOURS DU CALENDRIER ──────────────────────────────
  const joursMois = useMemo(() => {
    const debut = startOfWeek(startOfMonth(dateCourante), { weekStartsOn: 1 })
    const fin = endOfWeek(endOfMonth(dateCourante), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: debut, end: fin })
  }, [dateCourante])

  const joursSemaine = useMemo(() => {
    const debut = soW(dateCourante, { weekStartsOn: 1 })
    const fin = eoW(dateCourante, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: debut, end: fin })
  }, [dateCourante])

  // ── ÉVÉNEMENTS PAR JOUR (multi-jours) ───────────────
  function getEventsJour(jour) {
    const events = []

    // Interventions
    for (const inv of interventions) {
      if (!inv.date_debut) continue
      try {
        const debut = parseISO(inv.date_debut)
        const fin = inv.date_fin ? parseISO(inv.date_fin) : debut
        if (isWithinInterval(jour, { start: debut, end: fin }) || isSameDay(jour, debut) || isSameDay(jour, fin)) {
          events.push({
            type: 'intervention', data: inv, id: inv.id,
            isFirst: isSameDay(jour, debut),
            isLast: isSameDay(jour, fin),
            isMiddle: !isSameDay(jour, debut) && !isSameDay(jour, fin),
          })
        }
      } catch { /* ignore */ }
    }

    // Chantiers — s'affichent sur toute la plage date_debut → date_fin
    for (const ch of chantiers) {
      if (!ch.date_debut) continue
      try {
        const debut = parseISO(ch.date_debut)
        const fin = ch.date_fin ? parseISO(ch.date_fin) : debut
        if (isWithinInterval(jour, { start: debut, end: fin }) || isSameDay(jour, debut) || isSameDay(jour, fin)) {
          events.push({
            type: 'chantier', data: ch, id: ch.id,
            isFirst: isSameDay(jour, debut),
            isLast: isSameDay(jour, fin),
            isMiddle: !isSameDay(jour, debut) && !isSameDay(jour, fin),
          })
        }
      } catch { /* ignore */ }
    }

    return events
  }

  // ── EXPORT iCal ─────────────────────────────────────
  function exportICal() {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ElecPro//Planning//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ElecPro Planning',
      'X-WR-TIMEZONE:Europe/Paris',
    ]

    // Interventions
    for (const inv of interventions) {
      if (!inv.date_debut) continue
      const uid = `inv-${inv.id}@elecpro`
      const dtstart = inv.toute_journee
        ? `DTSTART;VALUE=DATE:${inv.date_debut.replace(/-/g, '')}`
        : `DTSTART;TZID=Europe/Paris:${inv.date_debut.replace(/-/g, '')}T${(inv.heure_debut || '08:00').replace(':', '')}00`
      const dtend = inv.toute_journee
        ? `DTEND;VALUE=DATE:${(inv.date_fin || inv.date_debut).replace(/-/g, '')}`
        : `DTEND;TZID=Europe/Paris:${(inv.date_fin || inv.date_debut).replace(/-/g, '')}T${(inv.heure_fin || '17:00').replace(':', '')}00`
      lines.push('BEGIN:VEVENT', `UID:${uid}`, dtstart, dtend, `SUMMARY:${inv.titre}`)
      if (inv.notes) lines.push(`DESCRIPTION:${inv.notes.replace(/\n/g, '\\n')}`)
      lines.push('END:VEVENT')
    }

    // Chantiers
    for (const ch of chantiers) {
      if (!ch.date_debut) continue
      const client = clients.find(c => c.id === ch.client_id)
      const uid = `ch-${ch.id}@elecpro`
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${ch.date_debut.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${(ch.date_fin || ch.date_debut).replace(/-/g, '')}`,
        `SUMMARY:🔧 ${ch.nom}`,
        `DESCRIPTION:Client: ${client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '?'}\\nStatut: ${ch.statut}`,
        'END:VEVENT',
      )
    }

    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `elecpro-planning-${format(new Date(), 'yyyy-MM')}.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Planning exporté en iCal ✅')
  }

  // ── NAVIGATION ───────────────────────────────────────
  function precedent() {
    setDateCourante(prev =>
      vue === 'mois' ? subMonths(prev, 1) : subWeeks(prev, 1)
    )
  }
  function suivant() {
    setDateCourante(prev =>
      vue === 'mois' ? addMonths(prev, 1) : addWeeks(prev, 1)
    )
  }
  function aujourdhui() {
    setDateCourante(new Date())
  }

  // ── OUVRIR MODAL CRÉATION ────────────────────────────
  function ouvrirCreation(jour) {
    const dateStr = format(jour, 'yyyy-MM-dd')
    setEditId(null)
    setForm({
      titre: '', date_debut: dateStr, date_fin: dateStr,
      heure_debut: '08:00', heure_fin: '17:00',
      couleur: 'amber', chantier_id: '', notes: '', toute_journee: true,
    })
    setJourSelectionne(jour)
    setShowModal(true)
  }

  function ouvrirEdition(intervention) {
    setEditId(intervention.id)
    setForm({
      titre: intervention.titre || '',
      date_debut: intervention.date_debut || '',
      date_fin: intervention.date_fin || intervention.date_debut || '',
      heure_debut: intervention.heure_debut || '08:00',
      heure_fin: intervention.heure_fin || '17:00',
      couleur: intervention.couleur || 'amber',
      chantier_id: intervention.chantier_id || '',
      notes: intervention.notes || '',
      toute_journee: intervention.toute_journee !== false,
    })
    setShowDetail(null)
    setShowModal(true)
  }

  // ── SAUVEGARDER ──────────────────────────────────────
  function handleSauvegarder() {
    if (!form.titre.trim()) { toast.error('Titre requis'); return }
    if (!form.date_debut) { toast.error('Date requise'); return }

    const data = { ...form }
    if (editId) {
      updateIntervention(editId, data)
      toast.success('Intervention mise à jour')
    } else {
      addIntervention(data)
      toast.success('Intervention ajoutée')
    }
    setShowModal(false)
  }

  // ── SUPPRIMER ────────────────────────────────────────
  function handleSupprimer(id) {
    deleteIntervention(id)
    setShowDetail(null)
    toast.success('Intervention supprimée')
  }

  // ── LABEL PÉRIODE ────────────────────────────────────
  const labelPeriode = vue === 'mois'
    ? format(dateCourante, 'MMMM yyyy', { locale: fr })
    : `Semaine du ${format(soW(dateCourante, { weekStartsOn: 1 }), 'd MMM', { locale: fr })} au ${format(eoW(dateCourante, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}`

  const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Planning</h1>
            <p className="text-slate-400 text-sm mt-1 capitalize">{labelPeriode}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Toggle vue */}
            <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1">
              {['mois', 'semaine'].map(v => (
                <button
                  key={v}
                  onClick={() => setVue(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    vue === v ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl">
              <button onClick={precedent} className="p-2 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={aujourdhui} className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors border-x border-slate-700">
                Aujourd'hui
              </button>
              <button onClick={suivant} className="p-2 text-slate-400 hover:text-white transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            <Button size="sm" variant="secondary" onClick={exportICal}>
              <Download size={15} /> iCal
            </Button>
            <Button size="sm" onClick={() => ouvrirCreation(new Date())}>
              <Plus size={15} /> Intervention
            </Button>
          </div>
        </div>

        {/* Légende */}
        <div className="flex gap-4 mb-4 flex-wrap text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" /> Chantier en cours
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-600" /> En préparation
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-500" /> Intervention perso
          </span>
        </div>

        {/* ── VUE MOIS ── */}
        {vue === 'mois' && (
          <motion.div
            key="mois"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
          >
            {/* Header jours */}
            <div className="grid grid-cols-7 border-b border-slate-700">
              {JOURS_SEMAINE.map(j => (
                <div key={j} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {j}
                </div>
              ))}
            </div>

            {/* Grille */}
            <div className="grid grid-cols-7">
              {joursMois.map((jour, idx) => {
                const events = getEventsJour(jour)
                const estMoisCourant = isSameMonth(jour, dateCourante)
                const estAujourdhui = isToday(jour)
                const maxVisible = 2

                return (
                  <div
                    key={idx}
                    onClick={() => ouvrirCreation(jour)}
                    className={`min-h-[90px] p-1.5 border-b border-r border-slate-700/50 cursor-pointer transition-colors group
                      ${estMoisCourant ? 'hover:bg-slate-700/30' : 'opacity-40'}
                      ${idx % 7 === 6 ? 'border-r-0' : ''}
                    `}
                  >
                    {/* Numéro du jour */}
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                        ${estAujourdhui ? 'bg-amber-500 text-black' : estMoisCourant ? 'text-slate-300' : 'text-slate-600'}
                      `}>
                        {format(jour, 'd')}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={10} className="text-slate-500" />
                      </span>
                    </div>

                    {/* Événements (avec barre continue pour multi-jours) */}
                    <div className="space-y-0.5">
                      {events.slice(0, maxVisible).map(ev => {
                        if (ev.type === 'chantier') {
                          const col = CHANTIER_COLORS[ev.data.statut] || CHANTIER_COLORS.en_cours
                          // Barre continue multi-jours : pas de bordure au milieu
                          const radius = ev.isFirst && ev.isLast ? 'rounded-md' :
                            ev.isFirst ? 'rounded-l-md rounded-r-none' :
                            ev.isLast ? 'rounded-r-md rounded-l-none' : 'rounded-none'
                          return (
                            <div
                              key={ev.id}
                              onClick={e => { e.stopPropagation(); setShowDetail({ type: 'chantier', data: ev.data }) }}
                              className={`text-xs py-0.5 font-medium cursor-pointer ${col.bg} ${col.text} ${radius} flex items-center gap-1 overflow-hidden`}
                              style={{ paddingLeft: ev.isFirst ? '6px' : '2px', paddingRight: ev.isLast ? '6px' : '0px' }}
                            >
                              {ev.isFirst && <HardHat size={9} className="flex-shrink-0" />}
                              {ev.isFirst && <span className="truncate">{ev.data.nom}</span>}
                              {!ev.isFirst && <span className="w-full" />}
                            </div>
                          )
                        }
                        const col = getColor(ev.data.couleur)
                        const radius = ev.isFirst && ev.isLast ? 'rounded-md' :
                          ev.isFirst ? 'rounded-l-md rounded-r-none' :
                          ev.isLast ? 'rounded-r-md rounded-l-none' : 'rounded-none'
                        return (
                          <div
                            key={ev.id}
                            onClick={e => { e.stopPropagation(); setShowDetail({ type: 'intervention', data: ev.data }) }}
                            className={`text-xs py-0.5 font-medium cursor-pointer ${col.bg} ${col.text} ${radius} overflow-hidden`}
                            style={{ paddingLeft: ev.isFirst ? '6px' : '2px', paddingRight: ev.isLast ? '6px' : '0px' }}
                          >
                            {ev.isFirst && (
                              !ev.data.toute_journee && ev.data.heure_debut
                                ? `${ev.data.heure_debut} ${ev.data.titre}`
                                : ev.data.titre
                            )}
                            {!ev.isFirst && <span className="w-full block">&nbsp;</span>}
                          </div>
                        )
                      })}
                      {events.length > maxVisible && (
                        <div className="text-xs text-slate-400 px-1">
                          +{events.length - maxVisible} autre{events.length - maxVisible > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── VUE SEMAINE ── */}
        {vue === 'semaine' && (
          <motion.div
            key="semaine"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
          >
            <div className="grid grid-cols-7">
              {joursSemaine.map((jour, idx) => {
                const events = getEventsJour(jour)
                const estAujourdhui = isToday(jour)
                return (
                  <div
                    key={idx}
                    className={`border-r border-slate-700 last:border-r-0 ${idx % 7 >= 5 ? 'bg-slate-800/50' : ''}`}
                  >
                    {/* En-tête colonne */}
                    <div
                      onClick={() => ouvrirCreation(jour)}
                      className="py-3 text-center border-b border-slate-700 cursor-pointer hover:bg-slate-700/30 transition-colors"
                    >
                      <p className="text-xs text-slate-400 uppercase">{JOURS_SEMAINE[idx]}</p>
                      <p className={`text-lg font-bold mt-0.5 w-9 h-9 flex items-center justify-center rounded-full mx-auto
                        ${estAujourdhui ? 'bg-amber-500 text-black' : 'text-white'}`}>
                        {format(jour, 'd')}
                      </p>
                    </div>

                    {/* Événements colonne */}
                    <div className="p-1.5 min-h-[200px] space-y-1">
                      {events.map(ev => {
                        if (ev.type === 'chantier') {
                          const col = CHANTIER_COLORS[ev.data.statut] || CHANTIER_COLORS.en_cours
                          const client = clients.find(c => c.id === ev.data.client_id)
                          return (
                            <div
                              key={ev.id}
                              onClick={() => setShowDetail({ type: 'chantier', data: ev.data })}
                              className={`rounded-lg p-2 cursor-pointer ${col.bg} ${col.text}`}
                            >
                              <p className="text-xs font-semibold truncate flex items-center gap-1">
                                <HardHat size={10} /> {ev.data.nom}
                              </p>
                              {client && <p className="text-xs opacity-80 truncate mt-0.5">{client.prenom} {client.nom}</p>}
                            </div>
                          )
                        }
                        const col = getColor(ev.data.couleur)
                        return (
                          <div
                            key={ev.id}
                            onClick={() => setShowDetail({ type: 'intervention', data: ev.data })}
                            className={`rounded-lg p-2 cursor-pointer ${col.bg} ${col.text}`}
                          >
                            <p className="text-xs font-semibold truncate">{ev.data.titre}</p>
                            {!ev.data.toute_journee && (
                              <p className="text-xs opacity-80 flex items-center gap-0.5 mt-0.5">
                                <Clock size={9} /> {ev.data.heure_debut} – {ev.data.heure_fin}
                              </p>
                            )}
                          </div>
                        )
                      })}
                      {events.length === 0 && (
                        <div
                          onClick={() => ouvrirCreation(jour)}
                          className="h-full min-h-[180px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Plus size={16} className="text-slate-600" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── LISTE DES PROCHAINES INTERVENTIONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-slate-800 rounded-2xl border border-slate-700 p-5"
        >
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-amber-400" />
            Prochaines interventions (30 jours)
          </h2>
          {(() => {
            const now = new Date()
            const dans30j = new Date(now.getTime() + 30 * 86400000)
            const prochaines = interventions
              .filter(i => {
                try {
                  const d = parseISO(i.date_debut)
                  return d >= now && d <= dans30j
                } catch { return false }
              })
              .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))

            if (prochaines.length === 0) {
              return (
                <p className="text-slate-400 text-sm">
                  Aucune intervention planifiée dans les 30 prochains jours.{' '}
                  <button onClick={() => ouvrirCreation(new Date())} className="text-amber-400 hover:underline">
                    En ajouter une
                  </button>
                </p>
              )
            }

            return (
              <div className="space-y-2">
                {prochaines.map(inv => {
                  const col = getColor(inv.couleur)
                  const chantier = chantiers.find(c => c.id === inv.chantier_id)
                  return (
                    <div
                      key={inv.id}
                      onClick={() => setShowDetail({ type: 'intervention', data: inv })}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700 cursor-pointer transition-colors group"
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${col.bg}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors">{inv.titre}</p>
                        {chantier && <p className="text-slate-500 text-xs">{chantier.nom}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-300 text-sm font-medium">
                          {format(parseISO(inv.date_debut), 'EEEE d MMM', { locale: fr })}
                        </p>
                        {!inv.toute_journee && (
                          <p className="text-slate-500 text-xs">{inv.heure_debut} – {inv.heure_fin}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </motion.div>

        {/* ── MODAL CRÉATION / ÉDITION ── */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editId ? "Modifier l'intervention" : "Nouvelle intervention"}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 block mb-1">Titre *</label>
              <input
                value={form.titre}
                onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                placeholder="Ex : Pose tableau électrique"
                autoFocus
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
              />
            </div>

            {/* Chantier associé */}
            <div>
              <label className="text-sm text-slate-300 block mb-1">Chantier associé (optionnel)</label>
              <select
                value={form.chantier_id}
                onChange={e => setForm(f => ({ ...f, chantier_id: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">— Aucun —</option>
                {chantiers.map(c => {
                  const client = clients.find(cl => cl.id === c.client_id)
                  return (
                    <option key={c.id} value={c.id}>
                      {c.nom}{client ? ` — ${client.prenom} ${client.nom}` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-300 block mb-1">Date début</label>
                <input
                  type="date"
                  value={form.date_debut}
                  onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Date fin</label>
                <input
                  type="date"
                  value={form.date_fin}
                  onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Toute la journée / heures */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, toute_journee: !f.toute_journee }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.toute_journee ? 'bg-amber-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.toute_journee ? 'left-6' : 'left-0.5'}`} />
                </button>
                <span className="text-sm text-slate-300">Toute la journée</span>
              </label>
            </div>

            {!form.toute_journee && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300 block mb-1">Heure début</label>
                  <input
                    type="time"
                    value={form.heure_debut}
                    onChange={e => setForm(f => ({ ...f, heure_debut: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-1">Heure fin</label>
                  <input
                    type="time"
                    value={form.heure_fin}
                    onChange={e => setForm(f => ({ ...f, heure_fin: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Couleur */}
            <div>
              <label className="text-sm text-slate-300 block mb-2">Couleur</label>
              <div className="flex gap-2">
                {COULEURS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, couleur: c.id }))}
                    className={`w-8 h-8 rounded-xl ${c.bg} transition-transform ${form.couleur === c.id ? 'scale-125 ring-2 ring-white' : ''}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-slate-300 block mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Notes, adresse, matériel nécessaire..."
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button className="flex-1" onClick={handleSauvegarder}>
              <Save size={15} /> {editId ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>
        </Modal>

        {/* ── MODAL DÉTAIL INTERVENTION ── */}
        <Modal
          isOpen={!!showDetail}
          onClose={() => setShowDetail(null)}
          title={showDetail?.type === 'chantier' ? 'Chantier' : 'Intervention'}
          size="sm"
        >
          {showDetail && (
            <div>
              {showDetail.type === 'intervention' && (() => {
                const inv = showDetail.data
                const col = getColor(inv.couleur)
                const chantier = chantiers.find(c => c.id === inv.chantier_id)
                return (
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${col.bg} ${col.text} font-semibold`}>
                      {inv.titre}
                    </div>
                    {chantier && (
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <HardHat size={14} className="text-slate-500" />
                        {chantier.nom}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Calendar size={14} className="text-slate-500" />
                      {format(parseISO(inv.date_debut), 'EEEE d MMMM yyyy', { locale: fr })}
                      {inv.date_fin && inv.date_fin !== inv.date_debut && (
                        <span className="text-slate-500"> → {format(parseISO(inv.date_fin), 'd MMM', { locale: fr })}</span>
                      )}
                    </div>
                    {!inv.toute_journee && (
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Clock size={14} className="text-slate-500" />
                        {inv.heure_debut} – {inv.heure_fin}
                      </div>
                    )}
                    {inv.notes && (
                      <p className="text-slate-400 text-sm bg-slate-700/50 rounded-xl p-3">{inv.notes}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => ouvrirEdition(inv)}>
                        Modifier
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleSupprimer(inv.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )
              })()}

              {showDetail.type === 'chantier' && (() => {
                const ch = showDetail.data
                const client = clients.find(c => c.id === ch.client_id)
                return (
                  <div className="space-y-3">
                    <p className="text-white font-bold text-lg">{ch.nom}</p>
                    {client && <p className="text-amber-400 text-sm">{client.prenom} {client.nom}</p>}
                    {ch.adresse && <p className="text-slate-300 text-sm">{ch.adresse}, {ch.cp} {ch.ville}</p>}
                    {ch.description && <p className="text-slate-400 text-sm">{ch.description}</p>}
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => { setShowDetail(null); navigate(`/chantiers/${ch.id}`) }}
                    >
                      Ouvrir le chantier
                    </Button>
                  </div>
                )
              })()}
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  )
}
