// Aperçu document — rendu HTML haute fidélité avant PDF
import { useApp } from '../../context/AppContext'
import { formatDate, calculerTotaux, formatMontant } from '../../lib/utils'

export default function DocumentPreview({ doc, type = 'devis', id = 'doc-preview' }) {
  const { clients, chantiers, settings } = useApp()
  if (!doc || !settings) return null

  const client = clients.find(c => c.id === doc.client_id)
  const chantier = chantiers.find(c => c.id === doc.chantier_id)
  const ent = settings.entreprise
  const fact = settings.facturation
  const paie = settings.paiement

  const couleur = fact.couleur_document || '#F59E0B'
  const totaux = calculerTotaux(doc.lignes, doc.remise_type, doc.remise_valeur, doc.acompte_type, doc.acompte_valeur)

  const isFacture = type === 'facture'
  const titre = isFacture ? `FACTURE N° ${doc.numero}` : `DEVIS N° ${doc.numero}`

  return (
    <div
      id={id}
      style={{
        fontFamily: 'Arial, sans-serif',
        background: '#fff',
        color: '#1a1a1a',
        width: '210mm',
        minHeight: '297mm',
        padding: '12mm 15mm',
        fontSize: '9pt',
        lineHeight: 1.5,
        boxSizing: 'border-box',
      }}
    >
      {/* En-tête entreprise */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
        <div>
          {ent.logo_base64 && (
            <img src={ent.logo_base64} alt="Logo" style={{ maxHeight: '20mm', maxWidth: '50mm', marginBottom: '4mm', objectFit: 'contain' }} />
          )}
          <div style={{ fontSize: '8pt', color: '#555', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 'bold', fontSize: '9pt', color: '#1a1a1a' }}>{ent.nom}</div>
            {ent.forme_juridique && <div>{ent.forme_juridique}</div>}
            <div>{ent.adresse}</div>
            <div>{ent.cp} {ent.ville}</div>
            <div>Tél : {ent.tel}</div>
            <div>{ent.email}</div>
            {ent.site && <div>{ent.site}</div>}
          </div>
        </div>

        {/* Bloc titre document */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            background: couleur,
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '12pt',
            marginBottom: '6px',
            display: 'inline-block',
          }}>
            {titre}
          </div>
          <div style={{ color: '#555', fontSize: '8pt', lineHeight: 1.8 }}>
            <div>Date : <strong>{formatDate(doc.date_emission)}</strong></div>
            {!isFacture && <div>Validité : <strong>{formatDate(doc.date_validite)}</strong></div>}
            {isFacture && <div>Échéance : <strong>{formatDate(doc.date_echeance)}</strong></div>}
          </div>
        </div>
      </div>

      {/* Émetteur / Client */}
      <div style={{ display: 'flex', gap: '6mm', marginBottom: '6mm' }}>
        <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4mm', fontSize: '8pt' }}>
          <div style={{ fontWeight: 'bold', color: couleur, marginBottom: '3px', fontSize: '8pt', textTransform: 'uppercase' }}>Émetteur</div>
          <div style={{ fontWeight: 'bold' }}>{ent.nom}</div>
          <div>{ent.adresse}</div>
          <div>{ent.cp} {ent.ville}</div>
          <div>SIRET : {ent.siret}</div>
          {ent.tva_intra && <div>TVA : {ent.tva_intra}</div>}
        </div>
        <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4mm', fontSize: '8pt' }}>
          <div style={{ fontWeight: 'bold', color: couleur, marginBottom: '3px', fontSize: '8pt', textTransform: 'uppercase' }}>Client</div>
          {client ? (
            <>
              <div style={{ fontWeight: 'bold' }}>{client.societe || `${client.prenom} ${client.nom}`}</div>
              {client.societe && <div>{client.prenom} {client.nom}</div>}
              <div>{client.adresse}</div>
              <div>{client.cp} {client.ville}</div>
              {client.siret && <div>SIRET : {client.siret}</div>}
            </>
          ) : (
            <div style={{ color: '#999' }}>Client non renseigné</div>
          )}
        </div>
      </div>

      {/* Objet */}
      {(doc.objet || chantier) && (
        <div style={{ marginBottom: '4mm', padding: '3mm 4mm', background: '#f8f8f8', borderRadius: '4px', fontSize: '8pt' }}>
          {doc.objet && <div><strong>Objet :</strong> {doc.objet}</div>}
          {chantier && <div><strong>Chantier :</strong> {chantier.nom} — {chantier.adresse}, {chantier.cp} {chantier.ville}</div>}
        </div>
      )}

      {/* Tableau des lignes */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '4mm' }}>
        <thead>
          <tr style={{ background: couleur, color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>Description</th>
            <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 600, width: '30px' }}>Qté</th>
            <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 600, width: '40px' }}>Unité</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, width: '60px' }}>PU HT</th>
            <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 600, width: '35px' }}>TVA</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, width: '65px' }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {(doc.lignes || []).map((ligne, idx) => {
            if (ligne.type === 'titre') {
              return (
                <tr key={idx} style={{ background: '#f0f0f0' }}>
                  <td colSpan={6} style={{ padding: '5px 6px', fontWeight: 'bold', fontSize: '8.5pt' }}>
                    {ligne.description}
                  </td>
                </tr>
              )
            }
            if (ligne.type === 'commentaire') {
              return (
                <tr key={idx}>
                  <td colSpan={6} style={{ padding: '3px 6px', color: '#777', fontStyle: 'italic', fontSize: '7.5pt' }}>
                    {ligne.description}
                  </td>
                </tr>
              )
            }
            const ht = (parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix_ht) || 0)
            return (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '4px 6px' }}>{ligne.description}</td>
                <td style={{ textAlign: 'center', padding: '4px 6px' }}>{ligne.quantite}</td>
                <td style={{ textAlign: 'center', padding: '4px 6px', color: '#555' }}>{ligne.unite}</td>
                <td style={{ textAlign: 'right', padding: '4px 6px' }}>{formatMontant(ligne.prix_ht)}</td>
                <td style={{ textAlign: 'center', padding: '4px 6px', color: '#555' }}>{ligne.tva} %</td>
                <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>{formatMontant(ht)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5mm' }}>
        <table style={{ width: '65mm', fontSize: '8.5pt', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2px 0', color: '#555' }}>Sous-total HT</td>
              <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatMontant(totaux.sous_total_ht)}</td>
            </tr>
            {totaux.montant_remise > 0 && (
              <tr>
                <td style={{ padding: '2px 0', color: '#555' }}>Remise</td>
                <td style={{ textAlign: 'right', color: '#e53e3e' }}>- {formatMontant(totaux.montant_remise)}</td>
              </tr>
            )}
            {Object.entries(totaux.tva_detail).map(([taux, d]) => (
              <tr key={taux}>
                <td style={{ padding: '2px 0', color: '#555' }}>TVA {taux} %</td>
                <td style={{ textAlign: 'right' }}>{formatMontant(d.montant)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #1a1a1a' }}>
              <td style={{ padding: '4px 0 2px', fontWeight: 'bold', fontSize: '10pt' }}>TOTAL TTC</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10pt' }}>{formatMontant(totaux.total_ttc)}</td>
            </tr>
            {totaux.montant_acompte > 0 && (
              <tr>
                <td style={{ padding: '2px 0', color: '#555' }}>Acompte</td>
                <td style={{ textAlign: 'right' }}>- {formatMontant(totaux.montant_acompte)}</td>
              </tr>
            )}
            {isFacture && doc.acompte_verse > 0 && (
              <tr>
                <td style={{ padding: '2px 0', color: '#555' }}>Acompte versé</td>
                <td style={{ textAlign: 'right' }}>- {formatMontant(doc.acompte_verse)}</td>
              </tr>
            )}
            {(totaux.montant_acompte > 0 || (isFacture && doc.acompte_verse > 0)) && (
              <tr style={{ borderTop: '1px solid #ccc' }}>
                <td style={{ padding: '3px 0', fontWeight: 'bold', color: couleur }}>NET À RÉGLER</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: couleur }}>{formatMontant(totaux.net_a_regler)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Conditions & paiement */}
      <div style={{ fontSize: '7.5pt', color: '#555', marginBottom: '5mm', borderTop: '1px solid #eee', paddingTop: '4mm' }}>
        {doc.delai_execution && <div style={{ marginBottom: '2px' }}><strong>Délai d'exécution :</strong> {doc.delai_execution}</div>}
        {doc.conditions_paiement && <div style={{ marginBottom: '2px' }}><strong>Conditions de paiement :</strong> {doc.conditions_paiement}</div>}
        {isFacture && paie.iban && (
          <div style={{ marginTop: '3px' }}>
            <strong>Paiement par virement :</strong> IBAN : {paie.iban} — BIC : {paie.bic} ({paie.banque})
          </div>
        )}
      </div>

      {/* Zone signature */}
      {!isFacture && (
        <div style={{ marginBottom: '5mm', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
          {/* Bandeau */}
          <div style={{
            background: couleur,
            color: '#fff',
            padding: '3px 6px',
            fontSize: '7.5pt',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
          }}>
            BON POUR ACCORD — À retourner signé
          </div>

          <div style={{ display: 'flex', gap: '0', borderTop: 'none' }}>
            {/* Bloc client */}
            <div style={{ flex: 1, padding: '4mm', borderRight: '1px solid #ddd' }}>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#333', marginBottom: '2mm' }}>
                Signature du client
              </div>
              <div style={{ fontSize: '7pt', color: '#666', marginBottom: '4mm' }}>
                Précédée de la mention manuscrite <em style={{ fontStyle: 'italic' }}>"Lu et approuvé"</em>
              </div>

              {(doc.signature_client || doc.signature)?.data ? (
                <div>
                  <img
                    src={(doc.signature_client || doc.signature).data}
                    alt="Signature"
                    style={{ maxHeight: '22mm', maxWidth: '70mm', border: '1px solid #eee', display: 'block', marginBottom: '2mm' }}
                  />
                  <div style={{ fontSize: '6.5pt', color: '#666' }}>
                    Signé par <strong>{(doc.signature_client || doc.signature).signataire}</strong> le {formatDate((doc.signature_client || doc.signature).date)}
                  </div>
                </div>
              ) : (
                <>
                  {/* Espace "Lu et approuvé" */}
                  <div style={{
                    height: '8mm',
                    borderBottom: '1px solid #ccc',
                    marginBottom: '3mm',
                    position: 'relative',
                  }}>
                    <span style={{ position: 'absolute', bottom: '2px', left: 0, fontSize: '6.5pt', color: '#bbb' }}>
                      Lu et approuvé :
                    </span>
                  </div>
                  {/* Espace signature */}
                  <div style={{
                    height: '22mm',
                    border: '1px dashed #ccc',
                    borderRadius: '3px',
                    marginBottom: '3mm',
                    position: 'relative',
                  }}>
                    <span style={{ position: 'absolute', bottom: '3px', right: '6px', fontSize: '6pt', color: '#ddd' }}>
                      Signature
                    </span>
                  </div>
                  {/* Ligne date */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4mm' }}>
                    <span style={{ fontSize: '6.5pt', color: '#555', whiteSpace: 'nowrap' }}>Fait à :</span>
                    <div style={{ flex: 1, borderBottom: '1px solid #ccc', height: '5mm' }} />
                    <span style={{ fontSize: '6.5pt', color: '#555', whiteSpace: 'nowrap' }}>Le :</span>
                    <div style={{ flex: 1, borderBottom: '1px solid #ccc', height: '5mm' }} />
                  </div>
                </>
              )}
            </div>

            {/* Bloc entreprise */}
            <div style={{ flex: 1, padding: '4mm' }}>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#333', marginBottom: '2mm' }}>
                Signature de l'entreprise
              </div>
              <div style={{ fontSize: '7pt', color: '#666', marginBottom: '4mm' }}>
                {ent.nom}
              </div>
              {doc.signature_entreprise?.data ? (
                <>
                  <img
                    src={doc.signature_entreprise.data}
                    alt="Signature entreprise"
                    style={{ maxHeight: '22mm', maxWidth: '70mm', border: '1px solid #eee', display: 'block', marginBottom: '2mm' }}
                  />
                  <div style={{ fontSize: '6.5pt', color: '#666' }}>
                    Signé par <strong>{doc.signature_entreprise.signataire}</strong> le {formatDate(doc.signature_entreprise.date)}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ height: '8mm', borderBottom: '1px solid #ccc', marginBottom: '3mm' }} />
                  <div style={{
                    height: '22mm',
                    border: '1px dashed #ccc',
                    borderRadius: '3px',
                    marginBottom: '3mm',
                    position: 'relative',
                  }}>
                    {ent.logo_base64 && (
                      <img
                        src={ent.logo_base64}
                        alt="Tampon"
                        style={{ position: 'absolute', bottom: '3px', right: '3px', maxHeight: '12mm', maxWidth: '30mm', opacity: 0.3, objectFit: 'contain' }}
                      />
                    )}
                    <span style={{ position: 'absolute', bottom: '3px', right: '6px', fontSize: '6pt', color: '#ddd' }}>
                      Signature + cachet
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4mm' }}>
                    <span style={{ fontSize: '6.5pt', color: '#555', whiteSpace: 'nowrap' }}>Fait à :</span>
                    <div style={{ flex: 1, borderBottom: '1px solid #ccc', height: '5mm' }} />
                    <span style={{ fontSize: '6.5pt', color: '#555', whiteSpace: 'nowrap' }}>Le :</span>
                    <div style={{ flex: 1, borderBottom: '1px solid #ccc', height: '5mm' }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mentions légales */}
      <div style={{ fontSize: '6.5pt', color: '#999', borderTop: '1px solid #eee', paddingTop: '3mm', lineHeight: 1.5 }}>
        {ent.siret && <span>SIRET : {ent.siret} — </span>}
        {ent.tva_intra && <span>TVA : {ent.tva_intra} — </span>}
        {ent.assurance && <span>Assurance : {ent.assurance} — </span>}
        {doc.mentions_legales || fact.mentions_legales}
      </div>
    </div>
  )
}
