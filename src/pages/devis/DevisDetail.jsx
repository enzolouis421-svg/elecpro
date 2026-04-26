// Détail devis — aperçu, signature, envoi email, conversion en facture
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Edit, Trash2, Send, Download, CheckCircle, XCircle,
  FileText, PenLine, Receipt, X, User, Building2, Link, RefreshCw, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import SignatureCanvas from 'react-signature-canvas'
import { useApp } from '../../context/AppContext'
import { formatDate, formatMontant, calculerTotaux, today } from '../../lib/utils'
import { generatePDF } from '../../lib/pdf'
import { sendEmail, templateEnvoiDevis, initEmailJS } from '../../lib/email'
import {
  isSupabaseConfigured,
  sbCreateSignToken, sbGetPendingSignature, sbMarkTokenApplied, sbGetUser,
} from '../../lib/supabase'
import {
  createLocalSignToken, getLocalSignTokenByDevisId,
  getPendingLocalSignature, markLocalTokenApplied,
} from '../../lib/storage'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import DocumentPreview from '../../components/documents/DocumentPreview'

export default function DevisDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { devis: allDevis, clients, chantiers, updateDevis, deleteDevis, devisToFacture, settings } = useApp()
  const [showDelete, setShowDelete] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [sigTab, setSigTab] = useState('client')
  const [signataireClient, setSignataireClient] = useState('')
  const [signataireEntreprise, setSignataireEntreprise] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [signToken, setSignToken] = useState(null)
  const [checkingRemote, setCheckingRemote] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const sigClientRef = useRef(null)
  const sigEntrepriseRef = useRef(null)

  const devis = allDevis.find(d => d.id === id)

  // Récupérer le token existant au montage
  useEffect(() => {
    if (!devis) return
    if (isSupabaseConfigured) return // Supabase : pas de cache local pour le token
    const existing = getLocalSignTokenByDevisId(devis.id)
    if (existing) setSignToken(existing.token)
  }, [devis?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Vérifier si une signature distante est en attente
  const checkRemoteSignature = useCallback(async () => {
    if (!devis) return
    setCheckingRemote(true)
    try {
      let pending = null
      if (isSupabaseConfigured) {
        pending = await sbGetPendingSignature(devis.id)
      } else {
        pending = getPendingLocalSignature(devis.id)
      }
      if (pending) {
        updateDevis(devis.id, {
          signature_client: pending.signature_data,
          statut: 'accepte',
          date_signature: pending.signature_data?.date || today(),
        })
        if (isSupabaseConfigured) {
          await sbMarkTokenApplied(pending.token)
        } else {
          markLocalTokenApplied(pending.token)
        }
        setSignToken(null)
        toast.success(`✍️ Signature de ${pending.signataire} appliquée !`)
      } else {
        toast('Aucune signature reçue pour l\'instant.', { icon: '⏳' })
      }
    } catch {
      toast.error('Erreur lors de la vérification')
    } finally {
      setCheckingRemote(false)
    }
  }, [devis, updateDevis])

  if (!devis) {
    return (
      <div className="p-6 text-center text-slate-400">
        Devis introuvable. <button onClick={() => navigate('/devis')} className="text-amber-400 underline">Retour</button>
      </div>
    )
  }

  const client = clients.find(c => c.id === devis.client_id)
  const chantier = chantiers.find(c => c.id === devis.chantier_id)
  const totaux = calculerTotaux(devis.lignes, devis.remise_type, devis.remise_valeur, devis.acompte_type, devis.acompte_valeur)

  // ── PDF ─────────────────────────────────────────────────
  async function handleTelechargerPDF() {
    setGeneratingPDF(true)
    try {
      await generatePDF('devis-pdf-preview', `${devis.numero}.pdf`)
      toast.success('PDF téléchargé !')
    } catch (e) {
      toast.error('Erreur lors de la génération PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  // ── GÉNÉRATION TOKEN SIGNATURE ───────────────────────────
  async function genererSignToken() {
    const devisSnapshot = {
      devis,
      client: client || null,
    }
    const settingsSnapshot = {
      entreprise: settings?.entreprise || {},
      facturation: settings?.facturation || {},
      paiement: settings?.paiement || {},
    }
    try {
      let tok
      if (isSupabaseConfigured) {
        const user = await sbGetUser()
        tok = await sbCreateSignToken({
          devisId: devis.id,
          userId: user?.id,
          devisData: devisSnapshot,
          settingsData: settingsSnapshot,
        })
      } else {
        tok = createLocalSignToken(devis.id, devisSnapshot, settingsSnapshot)
      }
      setSignToken(tok)
      return tok
    } catch (err) {
      console.warn('Token signature non généré :', err.message)
      return null
    }
  }

  // ── ENVOI EMAIL ──────────────────────────────────────────
  async function handleEnvoyerEmail() {
    if (!client?.email) { toast.error('Pas d\'email pour ce client'); return }
    setSendingEmail(true)
    try {
      // Générer le token de signature
      const tok = await genererSignToken()

      const emailjsCfg = settings?.emailjs
      const { subject, message } = templateEnvoiDevis({
        devis, client, entreprise: settings?.entreprise, signToken: tok,
      })

      if (!emailjsCfg?.public_key || !emailjsCfg?.service_id || !emailjsCfg?.template_id) {
        // Fallback mailto
        window.open(`mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`)
        updateDevis(id, { statut: 'envoye', date_envoi: today() })
        if (tok) {
          setShowLinkModal(true)
          toast('Email ouvert dans votre client mail. Le lien de signature est prêt.', { icon: '📧' })
        } else {
          toast('Email ouvert dans votre client mail.', { icon: '📧' })
        }
        return
      }

      initEmailJS(emailjsCfg.public_key)
      await sendEmail({
        serviceId: emailjsCfg.service_id,
        templateId: emailjsCfg.template_id,
        toEmail: client.email,
        toName: client.societe || `${client.prenom} ${client.nom}`,
        fromName: settings?.entreprise?.nom || 'ElecPro',
        replyTo: settings?.entreprise?.email,
        subject,
        message,
      })
      updateDevis(id, { statut: 'envoye', date_envoi: today() })
      toast.success(`Devis envoyé à ${client.email}${tok ? ' avec lien de signature' : ''}`)
    } catch (err) {
      toast.error(`Erreur envoi : ${err.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  // ── SIGNATURE ────────────────────────────────────────────
  function handleSauvegarderSignature() {
    const updates = {}
    const clientCanvas = sigClientRef.current
    const entrepriseCanvas = sigEntrepriseRef.current

    const clientSigned = clientCanvas && !clientCanvas.isEmpty()
    const entrepriseSigned = entrepriseCanvas && !entrepriseCanvas.isEmpty()

    if (!clientSigned && !entrepriseSigned) {
      toast.error('Signez au moins un des deux cadres')
      return
    }
    if (clientSigned) {
      updates.signature_client = {
        type: 'electronique',
        data: clientCanvas.toDataURL('image/png'),
        signataire: signataireClient,
        date: today(),
      }
      updates.statut = 'accepte'
      updates.date_signature = today()
    }
    if (entrepriseSigned) {
      updates.signature_entreprise = {
        type: 'electronique',
        data: entrepriseCanvas.toDataURL('image/png'),
        signataire: signataireEntreprise,
        date: today(),
      }
    }
    updateDevis(id, updates)
    setShowSignature(false)
    toast.success('Signature(s) enregistrée(s) !')
  }

  function handleSupprimerSignatureClient() {
    updateDevis(id, { signature_client: null, signature: null })
    toast.success('Signature client supprimée')
  }

  function handleSupprimerSignatureEntreprise() {
    updateDevis(id, { signature_entreprise: null })
    toast.success('Signature entreprise supprimée')
  }

  // ── CONVERSION FACTURE ───────────────────────────────────
  async function handleConvertirFacture() {
    const f = await devisToFacture(id)
    if (f) {
      await updateDevis(id, { statut: 'accepte' })
      toast.success('Facture créée depuis ce devis')
      navigate(`/factures/${f.id}`)
    }
  }

  // ── CHANGEMENT STATUT ────────────────────────────────────
  function changerStatut(statut) {
    updateDevis(id, { statut })
    toast.success(`Statut mis à jour : ${statut}`)
  }

  function handleDelete() {
    deleteDevis(id)
    toast.success('Devis supprimé')
    navigate('/devis')
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-6xl mx-auto pb-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/devis')} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{devis.numero}</h1>
                <Badge statut={devis.statut} type="devis" />
              </div>
              <p className="text-slate-400 text-sm">{devis.objet || 'Sans objet'}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => setShowSignature(true)}>
              <PenLine size={14} /> {(devis.signature_client || devis.signature || devis.signature_entreprise) ? 'Signatures' : 'Signer'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleEnvoyerEmail} loading={sendingEmail}>
              <Send size={14} /> Envoyer
            </Button>
            {signToken && devis.statut !== 'accepte' && (
              <Button variant="secondary" size="sm" onClick={() => setShowLinkModal(true)}>
                <Link size={14} /> Lien signature
              </Button>
            )}
            {signToken && devis.statut !== 'accepte' && (
              <Button variant="secondary" size="sm" onClick={checkRemoteSignature} loading={checkingRemote}>
                <RefreshCw size={14} /> Vérifier
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleTelechargerPDF} loading={generatingPDF}>
              <Download size={14} /> PDF
            </Button>
            {devis.statut === 'accepte' && (
              <Button size="sm" onClick={handleConvertirFacture}>
                <Receipt size={14} /> Facturer
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate(`/devis/${id}/modifier`)}>
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
            {/* Infos */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5 text-sm space-y-2"
            >
              <h2 className="text-white font-semibold mb-3">Informations</h2>
              <div className="flex justify-between">
                <span className="text-slate-400">Client</span>
                <button onClick={() => navigate(`/clients/${devis.client_id}`)} className="text-amber-400 hover:underline text-right max-w-[60%] truncate">
                  {client ? (client.societe || `${client.prenom} ${client.nom}`) : '—'}
                </button>
              </div>
              {chantier && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Chantier</span>
                  <button onClick={() => navigate(`/chantiers/${devis.chantier_id}`)} className="text-amber-400 hover:underline text-right max-w-[60%] truncate">
                    {chantier.nom}
                  </button>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Émis le</span>
                <span className="text-white">{formatDate(devis.date_emission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valide jusqu'au</span>
                <span className="text-white">{formatDate(devis.date_validite)}</span>
              </div>
              {devis.date_envoi && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Envoyé le</span>
                  <span className="text-white">{formatDate(devis.date_envoi)}</span>
                </div>
              )}
              {signToken && devis.statut !== 'accepte' && (
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Link size={11} className="text-blue-400 shrink-0" />
                      <span className="text-blue-400 text-xs">Lien de signature envoyé</span>
                    </div>
                    <button
                      onClick={checkRemoteSignature}
                      disabled={checkingRemote}
                      className="text-slate-500 hover:text-amber-400 transition-colors"
                      title="Vérifier si signé"
                    >
                      <RefreshCw size={12} className={checkingRemote ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              )}
              {(devis.signature_client || devis.signature) && (
                <div className="pt-2 border-t border-slate-700 space-y-1.5">
                  <p className="text-slate-400 text-xs font-medium">Signatures</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={11} className="text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 text-xs truncate">
                        Client · {(devis.signature_client || devis.signature)?.signataire || '—'} · {formatDate((devis.signature_client || devis.signature)?.date)}
                      </span>
                    </div>
                    <button onClick={handleSupprimerSignatureClient} className="text-slate-500 hover:text-red-400 transition-colors shrink-0" title="Supprimer">
                      <X size={13} />
                    </button>
                  </div>
                  {devis.signature_entreprise && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 size={11} className="text-amber-400 shrink-0" />
                        <span className="text-amber-400 text-xs truncate">
                          Entreprise · {devis.signature_entreprise.signataire || '—'} · {formatDate(devis.signature_entreprise.date)}
                        </span>
                      </div>
                      <button onClick={handleSupprimerSignatureEntreprise} className="text-slate-500 hover:text-red-400 transition-colors shrink-0" title="Supprimer">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Récap financier */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5 text-sm space-y-2"
            >
              <h2 className="text-white font-semibold mb-3">Montants</h2>
              <div className="flex justify-between text-slate-300">
                <span>HT</span><span>{formatMontant(totaux.sous_total_ht)}</span>
              </div>
              {totaux.montant_remise > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Remise</span><span>- {formatMontant(totaux.montant_remise)}</span>
                </div>
              )}
              {Object.entries(totaux.tva_detail).map(([taux, d]) => (
                <div key={taux} className="flex justify-between text-slate-400 text-xs">
                  <span>TVA {taux}%</span><span>{formatMontant(d.montant)}</span>
                </div>
              ))}
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-700">
                <span>Total TTC</span>
                <span className="text-amber-400 text-lg">{formatMontant(totaux.total_ttc)}</span>
              </div>
              {totaux.montant_acompte > 0 && (
                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Net à régler</span><span>{formatMontant(totaux.net_a_regler)}</span>
                </div>
              )}
            </motion.div>

            {/* Actions statut */}
            {devis.statut !== 'accepte' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
              >
                <h2 className="text-white font-semibold mb-3 text-sm">Changer le statut</h2>
                <div className="space-y-2">
                  {devis.statut !== 'accepte' && (
                    <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => changerStatut('accepte')}>
                      <CheckCircle size={14} className="text-emerald-400" /> Marquer accepté
                    </Button>
                  )}
                  {devis.statut !== 'refuse' && (
                    <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => changerStatut('refuse')}>
                      <XCircle size={14} className="text-red-400" /> Marquer refusé
                    </Button>
                  )}
                  {devis.statut !== 'expire' && (
                    <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => changerStatut('expire')}>
                      <FileText size={14} className="text-orange-400" /> Marquer expiré
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Aperçu document */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-white rounded-2xl overflow-auto"
            style={{ maxHeight: '80vh' }}
          >
            <DocumentPreview doc={devis} type="devis" id="devis-pdf-preview" />
          </motion.div>
        </div>

        {/* Modal lien de signature distante */}
        <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Lien de signature à distance">
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Partagez ce lien avec votre client pour qu'il signe le devis depuis son téléphone ou ordinateur.
            </p>
            <div className="bg-slate-900 border border-slate-600 rounded-xl p-3">
              <p className="text-amber-400 text-xs font-mono break-all select-all">
                {window.location.origin}/signer/{signToken}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/signer/${signToken}`)
                  toast.success('Lien copié !')
                }}
              >
                Copier le lien
              </Button>
              <Button
                className="flex-1"
                onClick={() => window.open(`${window.location.origin}/signer/${signToken}`, '_blank')}
              >
                <ExternalLink size={14} /> Ouvrir
              </Button>
            </div>
            <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300 space-y-1">
              <p>✓ Lien valable 30 jours</p>
              <p>✓ Usage unique — invalide après signature</p>
              <p>✓ Cliquez <strong>Vérifier</strong> pour récupérer la signature une fois le client a signé</p>
              {!isSupabaseConfigured && (
                <p className="text-red-300 mt-2">⚠️ Sans Supabase, ce lien ne fonctionne que sur cet appareil (test local uniquement).</p>
              )}
            </div>
          </div>
        </Modal>

        {/* Modal signature */}
        <Modal isOpen={showSignature} onClose={() => setShowSignature(false)} title="Signature électronique" size="lg">
          <p className="text-slate-400 text-xs mb-4">
            Signez dans les cadres ci-dessous. Les cases apparaissent vides sur le document imprimé pour une signature manuscrite.
          </p>

          {/* Onglets client / entreprise */}
          <div className="flex gap-2 mb-5">
            {[
              { id: 'client', label: 'Signature client', icon: User },
              { id: 'entreprise', label: 'Signature entreprise', icon: Building2 },
            ].map(({ id: tid, label, icon: Icon }) => (
              <button
                key={tid}
                onClick={() => setSigTab(tid)}
                className={`flex items-center gap-2 flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  sigTab === tid ? 'bg-amber-500 text-black border-amber-500' : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Panneau CLIENT — toujours monté, affiché/masqué via CSS pour éviter le partage de canvas */}
          <div style={{ display: sigTab === 'client' ? 'block' : 'none' }}>
            <div className="mb-3">
              <label className="text-xs text-slate-400 block mb-1">Nom du signataire</label>
              <input
                value={signataireClient}
                onChange={e => setSignataireClient(e.target.value)}
                placeholder={client ? (client.societe || `${client.prenom} ${client.nom}`) : 'Nom du client'}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
              />
            </div>
            {(devis.signature_client || devis.signature) ? (
              <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={(devis.signature_client || devis.signature).data} alt="sig" className="h-10 bg-white rounded p-1" />
                  <div>
                    <p className="text-emerald-400 text-xs font-medium">Signature enregistrée</p>
                    <p className="text-slate-400 text-xs">{(devis.signature_client || devis.signature).signataire} · {formatDate((devis.signature_client || devis.signature).date)}</p>
                  </div>
                </div>
                <button onClick={handleSupprimerSignatureClient} className="text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ) : null}
            <p className="text-slate-400 text-xs mb-2">Nouvelle signature :</p>
            <div className="border-2 border-dashed border-slate-600 rounded-xl overflow-hidden bg-white">
              <SignatureCanvas ref={sigClientRef} penColor="#1e293b" canvasProps={{ width: 500, height: 160, className: 'w-full' }} />
            </div>
            <button onClick={() => sigClientRef.current?.clear()} className="text-slate-500 text-xs hover:text-white mt-1.5 transition-colors">
              Effacer
            </button>
          </div>

          {/* Panneau ENTREPRISE — toujours monté, affiché/masqué via CSS */}
          <div style={{ display: sigTab === 'entreprise' ? 'block' : 'none' }}>
            <div className="mb-3">
              <label className="text-xs text-slate-400 block mb-1">Nom du signataire</label>
              <input
                value={signataireEntreprise}
                onChange={e => setSignataireEntreprise(e.target.value)}
                placeholder={settings?.entreprise?.nom || "Nom de l'entreprise"}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
              />
            </div>
            {devis.signature_entreprise ? (
              <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={devis.signature_entreprise.data} alt="sig" className="h-10 bg-white rounded p-1" />
                  <div>
                    <p className="text-amber-400 text-xs font-medium">Signature enregistrée</p>
                    <p className="text-slate-400 text-xs">{devis.signature_entreprise.signataire} · {formatDate(devis.signature_entreprise.date)}</p>
                  </div>
                </div>
                <button onClick={handleSupprimerSignatureEntreprise} className="text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ) : null}
            <p className="text-slate-400 text-xs mb-2">Nouvelle signature :</p>
            <div className="border-2 border-dashed border-slate-600 rounded-xl overflow-hidden bg-white">
              <SignatureCanvas ref={sigEntrepriseRef} penColor="#1e293b" canvasProps={{ width: 500, height: 160, className: 'w-full' }} />
            </div>
            <button onClick={() => sigEntrepriseRef.current?.clear()} className="text-slate-500 text-xs hover:text-white mt-1.5 transition-colors">
              Effacer
            </button>
          </div>

          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowSignature(false)}>Annuler</Button>
            <Button className="flex-1" onClick={handleSauvegarderSignature}>
              <CheckCircle size={16} /> Enregistrer
            </Button>
          </div>
        </Modal>

        {/* Modal suppression */}
        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Supprimer ce devis">
          <p className="text-slate-300 mb-6">Êtes-vous sûr de vouloir supprimer le devis <strong>{devis.numero}</strong> ?</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  )
}
