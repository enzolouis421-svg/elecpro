// Détail facture — aperçu, relances automatiques, marquer payée
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Edit, Trash2, Send, Download, CheckCircle,
  Clock, Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { formatDate, formatMontant, calculerTotaux, joursDepuis, getNiveauRelance, today } from '../../lib/utils'
import { generatePDF } from '../../lib/pdf'
import { genId } from '../../lib/storage'
import { sendEmail, templateEnvoiFacture, templateRelance, initEmailJS } from '../../lib/email'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import DocumentPreview from '../../components/documents/DocumentPreview'

// Messages de relance par niveau
function getMessageRelance(niveau, facture, client, entreprise, relances) {
  const clientNom = client ? `${client.prenom} ${client.nom}` : 'Madame/Monsieur'
  const montant = formatMontant(calculerTotaux(facture.lignes, facture.remise_type, facture.remise_valeur).total_ttc)
  const dateEcheance = formatDate(facture.date_echeance)
  const sig = `${entreprise?.nom || 'Notre entreprise'}\nTél : ${entreprise?.tel || ''}\n${entreprise?.email || ''}`

  if (niveau === 'j7') return {
    sujet: `Rappel règlement facture ${facture.numero} — ${entreprise?.nom}`,
    corps: `Bonjour ${clientNom},\n\nSauf erreur de notre part, nous n'avons pas encore reçu le règlement de notre facture n°${facture.numero} d'un montant de ${montant} TTC, dont l'échéance était fixée au ${dateEcheance}.\n\nPourriez-vous nous confirmer la bonne réception de ce document et nous indiquer la date de règlement prévue ?\n\nRestant à votre disposition,\n${sig}`,
  }
  if (niveau === 'j15') {
    const dateJ7 = relances.find(r => r.type === 'j7')?.date || dateEcheance
    return {
      sujet: `2ème rappel — Facture ${facture.numero} en attente de règlement`,
      corps: `Bonjour ${clientNom},\n\nNous vous avons adressé un premier rappel le ${formatDate(dateJ7)} concernant la facture n°${facture.numero} de ${montant} TTC. À ce jour, cette facture reste impayée.\n\nNous vous demandons de bien vouloir procéder au règlement dans les meilleurs délais. Sans nouvelles de votre part sous 5 jours, nous nous verrons contraints d'engager une procédure de recouvrement.\n\n${sig}`,
    }
  }
  if (niveau === 'j30') {
    const datesRelances = relances.map(r => formatDate(r.date)).join(', ')
    return {
      sujet: `MISE EN DEMEURE — Facture ${facture.numero} — ${montant}`,
      corps: `Monsieur/Madame ${clientNom},\n\nMalgré nos relances des ${datesRelances}, la facture n°${facture.numero} d'un montant de ${montant} TTC reste impayée.\n\nPar la présente, nous vous mettons en demeure de régler cette somme sous 8 jours. Passé ce délai, nous engagerons une procédure judiciaire de recouvrement, avec application des pénalités de retard légales (taux BCE + 10 points).\n\n${sig}`,
    }
  }
  if (niveau === 'j60') return {
    sujet: `DERNIER AVIS avant procédure judiciaire — Facture ${facture.numero}`,
    corps: `Monsieur/Madame ${clientNom},\n\nEn l'absence de règlement de la facture n°${facture.numero} (${montant} TTC), nous avons transmis votre dossier à notre service contentieux.\n\nPour éviter toute procédure judiciaire, vous pouvez encore régler sous 48h par virement sur notre compte.\n\n${sig}`,
  }
  return { sujet: '', corps: '' }
}

const LABELS_RELANCE = { j7: '+7 jours (aimable)', j15: '+15 jours (ferme)', j30: '+30 jours (mise en demeure)', j60: '+60 jours (dernier avis)' }

export default function FactureDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { factures, clients, chantiers, updateFacture, deleteFacture, settings } = useApp()
  const [showDelete, setShowDelete] = useState(false)
  const [showPaiement, setShowPaiement] = useState(false)
  const [paiement, setPaiement] = useState({ date: today(), moyen: 'virement', reference: '' })
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const facture = factures.find(f => f.id === id)
  if (!facture) {
    return (
      <div className="p-6 text-center text-slate-400">
        Facture introuvable. <button onClick={() => navigate('/factures')} className="text-amber-400 underline">Retour</button>
      </div>
    )
  }

  const client = clients.find(c => c.id === facture.client_id)
  const chantier = chantiers.find(c => c.id === facture.chantier_id)
  const totaux = calculerTotaux(facture.lignes, facture.remise_type, facture.remise_valeur)
  const jours = facture.date_echeance ? joursDepuis(facture.date_echeance) : 0
  const niveauRelance = getNiveauRelance(jours)

  async function handleTelechargerPDF() {
    setGeneratingPDF(true)
    try {
      await generatePDF('facture-pdf-preview', `${facture.numero}.pdf`)
      toast.success('PDF téléchargé !')
    } catch {
      toast.error('Erreur génération PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  async function envoyerViaEmailJS({ toEmail, subject, message, onSuccess }) {
    const emailjsCfg = settings?.emailjs
    if (!emailjsCfg?.public_key || !emailjsCfg?.service_id || !emailjsCfg?.template_id) {
      window.open(`mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`)
      toast('Email ouvert dans votre client mail. Configurez EmailJS dans Paramètres → IA pour l\'envoi automatique.', { icon: '📧' })
      onSuccess?.()
      return
    }
    initEmailJS(emailjsCfg.public_key)
    await sendEmail({
      serviceId: emailjsCfg.service_id,
      templateId: emailjsCfg.template_id,
      toEmail,
      toName: client?.societe || `${client?.prenom} ${client?.nom}`,
      fromName: settings?.entreprise?.nom || 'ElecPro',
      replyTo: settings?.entreprise?.email,
      subject,
      message,
    })
    onSuccess?.()
  }

  async function handleEnvoyerEmail() {
    if (!client?.email) { toast.error('Pas d\'email pour ce client'); return }
    setSendingEmail(true)
    try {
      const { subject, message } = templateEnvoiFacture({ facture, client, entreprise: settings?.entreprise })
      await envoyerViaEmailJS({
        toEmail: client.email, subject, message,
        onSuccess: () => {
          updateFacture(id, { statut: 'envoyee', date_envoi: today() })
          toast.success(`Facture envoyée à ${client.email}`)
        },
      })
    } catch (err) {
      toast.error(`Erreur envoi : ${err.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleEnvoyerRelance() {
    if (!niveauRelance) { toast('Aucune relance nécessaire pour l\'instant'); return }
    if (!client?.email) {
      const msg = getMessageRelance(niveauRelance, facture, client, settings?.entreprise, facture.relances || [])
      navigator.clipboard?.writeText(`Objet : ${msg.sujet}\n\n${msg.corps}`)
      toast.success('Message copié dans le presse-papier (pas d\'email client)')
      return
    }
    setSendingEmail(true)
    try {
      const { subject, message } = templateRelance({
        facture, client, entreprise: settings?.entreprise,
        niveau: niveauRelance,
        relancesPrecedentes: facture.relances,
      })
      const nouvellesRelances = [...(facture.relances || []), { id: genId(), type: niveauRelance, date: today(), envoyee: true }]
      await envoyerViaEmailJS({
        toEmail: client.email, subject, message,
        onSuccess: () => {
          updateFacture(id, { relances: nouvellesRelances })
          toast.success(`Relance envoyée à ${client.email}`)
        },
      })
    } catch (err) {
      toast.error(`Erreur relance : ${err.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  function handleMarquerPayee() {
    updateFacture(id, { statut: 'payee', paiement })
    setShowPaiement(false)
    toast.success('Facture marquée comme payée !')
  }

  function handleDelete() {
    deleteFacture(id)
    toast.success('Facture supprimée')
    navigate('/factures')
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-6xl mx-auto pb-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/factures')} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{facture.numero}</h1>
                <Badge statut={facture.statut} type="facture" />
                {facture.statut === 'en_retard' && (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-xs text-red-400 font-medium"
                  >
                    {jours} j de retard
                  </motion.span>
                )}
              </div>
              <p className="text-slate-400 text-sm">{facture.objet || 'Sans objet'}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {facture.statut === 'en_retard' && niveauRelance && (
              <Button variant="danger" size="sm" onClick={handleEnvoyerRelance} loading={sendingEmail}>
                <Mail size={14} /> Relance {LABELS_RELANCE[niveauRelance]?.split(' ')[0]}
              </Button>
            )}
            {facture.statut !== 'payee' && (
              <Button size="sm" onClick={() => setShowPaiement(true)}>
                <CheckCircle size={14} /> Payée
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleEnvoyerEmail} loading={sendingEmail}>
              <Send size={14} /> Envoyer
            </Button>
            <Button variant="secondary" size="sm" onClick={handleTelechargerPDF} loading={generatingPDF}>
              <Download size={14} /> PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/factures/${id}/modifier`)}>
              <Edit size={14} />
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Infos + récap */}
          <div className="lg:col-span-1 space-y-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5 text-sm space-y-2">
              <h2 className="text-white font-semibold mb-3">Informations</h2>
              <div className="flex justify-between">
                <span className="text-slate-400">Client</span>
                <button onClick={() => navigate(`/clients/${facture.client_id}`)} className="text-amber-400 hover:underline text-right max-w-[60%] truncate">
                  {client ? (client.societe || `${client.prenom} ${client.nom}`) : '—'}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Émise le</span>
                <span className="text-white">{formatDate(facture.date_emission)}</span>
              </div>
              <div className="flex justify-between">
                <span className={facture.statut === 'en_retard' ? 'text-red-400' : 'text-slate-400'}>Échéance</span>
                <span className={facture.statut === 'en_retard' ? 'text-red-300 font-medium' : 'text-white'}>
                  {formatDate(facture.date_echeance)}
                </span>
              </div>
              {facture.paiement && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-emerald-400 font-medium text-xs mb-1">✓ Payée</p>
                  <p className="text-slate-400 text-xs">Le {formatDate(facture.paiement.date)}</p>
                  <p className="text-slate-400 text-xs capitalize">{facture.paiement.moyen}</p>
                  {facture.paiement.reference && <p className="text-slate-400 text-xs">Réf : {facture.paiement.reference}</p>}
                </div>
              )}
            </motion.div>

            {/* Montants */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5 text-sm space-y-2">
              <h2 className="text-white font-semibold mb-3">Montants</h2>
              <div className="flex justify-between text-slate-300"><span>HT</span><span>{formatMontant(totaux.sous_total_ht)}</span></div>
              {Object.entries(totaux.tva_detail).map(([t, d]) => (
                <div key={t} className="flex justify-between text-slate-400 text-xs"><span>TVA {t}%</span><span>{formatMontant(d.montant)}</span></div>
              ))}
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-700">
                <span>Total TTC</span><span className="text-amber-400 text-lg">{formatMontant(totaux.total_ttc)}</span>
              </div>
              {facture.acompte_verse > 0 && (
                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Net à régler</span>
                  <span>{formatMontant(Math.max(0, totaux.total_ttc - facture.acompte_verse))}</span>
                </div>
              )}
            </motion.div>

            {/* Historique relances */}
            {facture.relances?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
                <h2 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" /> Historique relances
                </h2>
                <div className="space-y-2">
                  {facture.relances.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{LABELS_RELANCE[r.type]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{formatDate(r.date)}</span>
                        {r.envoyee && <span className="text-emerald-400">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Aperçu document */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-white rounded-2xl overflow-auto" style={{ maxHeight: '80vh' }}>
            <DocumentPreview doc={facture} type="facture" id="facture-pdf-preview" />
          </motion.div>
        </div>

        {/* Modal paiement */}
        <Modal isOpen={showPaiement} onClose={() => setShowPaiement(false)} title="Enregistrer le paiement">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 block mb-1">Date du paiement</label>
              <input type="date" value={paiement.date} onChange={e => setPaiement(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Moyen de paiement</label>
              <select value={paiement.moyen} onChange={e => setPaiement(p => ({ ...p, moyen: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="cb">Carte bancaire</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Référence (optionnel)</label>
              <input value={paiement.reference} onChange={e => setPaiement(p => ({ ...p, reference: e.target.value }))}
                placeholder="N° de virement, chèque..."
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowPaiement(false)}>Annuler</Button>
            <Button className="flex-1" onClick={handleMarquerPayee}>
              <CheckCircle size={16} /> Confirmer le paiement
            </Button>
          </div>
        </Modal>

        {/* Modal suppression */}
        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Supprimer cette facture">
          <p className="text-slate-300 mb-6">Êtes-vous sûr de vouloir supprimer la facture <strong>{facture.numero}</strong> ?</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  )
}
