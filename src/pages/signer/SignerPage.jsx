// Page publique de signature à distance — accessible sans login
// Route : /signer/:token
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle, AlertCircle, Zap, PenLine, RotateCcw, Loader } from 'lucide-react'
import { formatDate, formatMontant, calculerTotaux } from '../../lib/utils'
import { isSupabaseConfigured, sbGetSignToken, sbApplyRemoteSignature } from '../../lib/supabase'
import { getLocalSignToken, applyLocalRemoteSignature } from '../../lib/storage'

// ── Composant affichage document simplifié (sans useApp) ─────────
function DevisView({ devis, client, entreprise, facturation }) {
  const totaux = calculerTotaux(devis.lignes, devis.remise_type, devis.remise_valeur, devis.acompte_type, devis.acompte_valeur)
  const couleur = facturation?.couleur_document || '#F59E0B'
  const clientNom = client?.societe || `${client?.prenom || ''} ${client?.nom || ''}`.trim()

  const lignesAffichees = (devis.lignes || []).filter(l => l.type !== 'titre' && l.type !== 'commentaire' && l.description)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* En-tête */}
      <div style={{ borderTop: `4px solid ${couleur}` }} className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            {entreprise?.logo_base64 && (
              <img src={entreprise.logo_base64} alt="Logo" className="h-14 object-contain mb-3" />
            )}
            <p className="font-bold text-gray-900 text-sm">{entreprise?.nom}</p>
            {entreprise?.forme_juridique && <p className="text-gray-500 text-xs">{entreprise.forme_juridique}</p>}
            <p className="text-gray-500 text-xs">{entreprise?.adresse}</p>
            <p className="text-gray-500 text-xs">{entreprise?.cp} {entreprise?.ville}</p>
            {entreprise?.tel && <p className="text-gray-500 text-xs">Tél : {entreprise.tel}</p>}
            {entreprise?.siret && <p className="text-gray-500 text-xs">SIRET : {entreprise.siret}</p>}
          </div>
          <div className="text-right">
            <div
              className="inline-block px-4 py-2 rounded-lg text-white font-bold text-sm mb-3"
              style={{ background: couleur }}
            >
              DEVIS N° {devis.numero}
            </div>
            <p className="text-gray-500 text-xs">Émis le {formatDate(devis.date_emission)}</p>
            {devis.date_validite && (
              <p className="text-gray-500 text-xs">Valide jusqu'au {formatDate(devis.date_validite)}</p>
            )}
          </div>
        </div>

        {/* Client */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Destinataire</p>
          <p className="font-bold text-gray-900">{clientNom}</p>
          {client?.adresse && <p className="text-gray-600">{client.adresse}</p>}
          {(client?.cp || client?.ville) && <p className="text-gray-600">{client?.cp} {client?.ville}</p>}
          {client?.email && <p className="text-gray-600">{client.email}</p>}
        </div>

        {devis.objet && (
          <p className="mt-4 text-gray-700 font-medium text-sm">
            <span className="text-gray-400">Objet : </span>{devis.objet}
          </p>
        )}
      </div>

      {/* Lignes */}
      <div className="px-6 pb-4">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: `2px solid ${couleur}` }}>
              <th className="text-left py-2 text-gray-500 font-medium">Description</th>
              <th className="text-right py-2 text-gray-500 font-medium w-16">Qté</th>
              <th className="text-right py-2 text-gray-500 font-medium w-20">P.U. HT</th>
              <th className="text-right py-2 text-gray-500 font-medium w-20">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(devis.lignes || []).map((ligne, i) => {
              if (ligne.type === 'titre') {
                return (
                  <tr key={i}>
                    <td colSpan={4} className="py-2 font-bold text-gray-800 text-sm border-b border-gray-100">
                      {ligne.description}
                    </td>
                  </tr>
                )
              }
              if (ligne.type === 'commentaire') {
                return (
                  <tr key={i}>
                    <td colSpan={4} className="py-1 text-gray-500 italic">{ligne.description}</td>
                  </tr>
                )
              }
              const total = (parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix_ht) || 0)
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 text-gray-800">{ligne.description}</td>
                  <td className="py-2 text-right text-gray-600">{ligne.quantite} {ligne.unite}</td>
                  <td className="py-2 text-right text-gray-600">{formatMontant(ligne.prix_ht)}</td>
                  <td className="py-2 text-right text-gray-800 font-medium">{formatMontant(total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-4 flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Total HT</span>
              <span>{formatMontant(totaux.sous_total_ht)}</span>
            </div>
            {totaux.montant_remise > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Remise</span>
                <span>-{formatMontant(totaux.montant_remise)}</span>
              </div>
            )}
            {Object.entries(totaux.tva_detail).map(([taux, d]) => d.montant > 0 && (
              <div key={taux} className="flex justify-between text-gray-500 text-xs">
                <span>TVA {taux}%</span>
                <span>{formatMontant(d.montant)}</span>
              </div>
            ))}
            <div
              className="flex justify-between font-bold text-base pt-2 border-t-2"
              style={{ borderColor: couleur }}
            >
              <span>Total TTC</span>
              <span style={{ color: couleur }}>{formatMontant(totaux.total_ttc)}</span>
            </div>
            {totaux.montant_acompte > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Net à régler</span>
                <span>{formatMontant(totaux.net_a_regler)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────
export default function SignerPage() {
  const { token } = useParams()
  const sigRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [tokenData, setTokenData] = useState(null)
  const [error, setError] = useState(null)
  const [signataire, setSignataire] = useState('')
  const [bonPourAccord, setBonPourAccord] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [signed, setSigned] = useState(false)

  // Charger le token au montage
  useEffect(() => {
    async function loadToken() {
      setLoading(true)
      try {
        let data = null
        if (isSupabaseConfigured) {
          data = await sbGetSignToken(token)
        } else {
          data = getLocalSignToken(token)
          // Vérifier l'expiration en local
          if (data && new Date(data.expires_at) < new Date()) {
            data = null
          }
          // Déjà appliqué
          if (data?.applied) data = null
        }
        if (!data) {
          setError('Ce lien de signature est invalide, expiré ou déjà utilisé.')
        } else {
          setTokenData(data)
          // Pré-remplir le nom du signataire
          const client = data.devis_data?.client
          if (client) {
            setSignataire(client.societe || `${client.prenom || ''} ${client.nom || ''}`.trim())
          }
        }
      } catch {
        setError('Erreur lors du chargement du devis. Vérifiez votre connexion.')
      } finally {
        setLoading(false)
      }
    }
    loadToken()
  }, [token])

  async function handleSigner() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert('Veuillez apposer votre signature dans le cadre.')
      return
    }
    if (!bonPourAccord) {
      alert('Veuillez cocher "Bon pour accord" pour valider.')
      return
    }
    if (!signataire.trim()) {
      alert('Veuillez saisir votre nom.')
      return
    }

    setSubmitting(true)
    try {
      const signatureData = {
        type: 'electronique_distance',
        data: sigRef.current.toDataURL('image/png'),
        signataire: signataire.trim(),
        date: new Date().toISOString().slice(0, 10),
        ip_hint: 'distance',
      }

      if (isSupabaseConfigured) {
        await sbApplyRemoteSignature(token, signatureData, signataire.trim())
      } else {
        applyLocalRemoteSignature(token, signatureData, signataire.trim())
      }
      setSigned(true)
    } catch (err) {
      alert(`Erreur lors de la soumission : ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Rendu ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chargement du devis…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-gray-900 font-bold text-lg mb-2">Lien invalide</h1>
          <p className="text-gray-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-4">Contactez l'entreprise pour obtenir un nouveau lien.</p>
        </div>
      </div>
    )
  }

  if (signed) {
    const ent = tokenData?.settings_data?.entreprise
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Devis signé !</h1>
          <p className="text-gray-600 text-sm mb-1">
            Votre signature a bien été enregistrée le {new Date().toLocaleDateString('fr-FR')}.
          </p>
          <p className="text-gray-500 text-sm">
            {ent?.nom} a été notifié et vous recontactera prochainement.
          </p>
          {ent?.email && (
            <p className="text-gray-400 text-xs mt-4">{ent.email}</p>
          )}
          <div className="mt-6 p-3 bg-gray-50 rounded-xl text-xs text-gray-400">
            Vous pouvez fermer cette page.
          </div>
        </div>
      </div>
    )
  }

  const { devis_data, settings_data } = tokenData
  const { devis, client } = devis_data
  const { entreprise, facturation, paiement } = settings_data

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Bandeau intro */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-amber-900 font-semibold text-sm">Signature électronique demandée</p>
            <p className="text-amber-700 text-xs">
              {entreprise?.nom} vous invite à signer le devis {devis?.numero} en ligne.
            </p>
          </div>
        </div>

        {/* Aperçu du devis */}
        <DevisView
          devis={devis}
          client={client}
          entreprise={entreprise}
          facturation={facturation}
          paiement={paiement}
        />

        {/* Zone de signature */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-gray-900 font-bold text-base mb-1 flex items-center gap-2">
            <PenLine size={18} className="text-amber-500" />
            Votre signature
          </h2>
          <p className="text-gray-500 text-xs mb-5">
            Signez ci-dessous pour accepter ce devis. Cette signature électronique a valeur contractuelle.
          </p>

          {/* Nom */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 font-medium block mb-1.5">Nom du signataire *</label>
            <input
              value={signataire}
              onChange={e => setSignataire(e.target.value)}
              placeholder="Votre nom complet"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          {/* Canvas signature */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-gray-600 font-medium">Signature *</label>
              <button
                onClick={() => sigRef.current?.clear()}
                className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={11} /> Effacer
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 cursor-crosshair hover:border-amber-400 transition-colors">
              <SignatureCanvas
                ref={sigRef}
                penColor="#1e293b"
                backgroundColor="rgb(249,250,251)"
                canvasProps={{ height: 160, className: 'w-full touch-none' }}
              />
            </div>
            <p className="text-gray-400 text-xs mt-1">Signez avec votre doigt ou votre souris</p>
          </div>

          {/* Bon pour accord */}
          <label className="flex items-start gap-3 cursor-pointer mb-6 p-4 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors">
            <input
              type="checkbox"
              checked={bonPourAccord}
              onChange={e => setBonPourAccord(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
            />
            <span className="text-gray-700 text-sm">
              <strong>Bon pour accord</strong> — J'accepte le devis n°{devis?.numero} de{' '}
              {entreprise?.nom} pour un montant de{' '}
              <strong className="text-amber-600">
                {formatMontant(
                  calculerTotaux(devis?.lignes, devis?.remise_type, devis?.remise_valeur).total_ttc
                )}
                {' '}TTC
              </strong>.
            </span>
          </label>

          {/* Bouton valider */}
          <button
            onClick={handleSigner}
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {submitting
              ? <><Loader size={16} className="animate-spin" /> Enregistrement…</>
              : <><CheckCircle size={16} /> Valider ma signature — Bon pour accord</>
            }
          </button>

          <p className="text-gray-400 text-xs text-center mt-3">
            Votre signature est horodatée et envoyée de façon sécurisée.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          Propulsé par ElecPro · {entreprise?.nom}
        </p>
      </div>
    </div>
  )
}
