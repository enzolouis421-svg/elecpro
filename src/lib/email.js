// Service d'envoi d'email via EmailJS (sans serveur)
import emailjs from '@emailjs/browser'

// Initialise EmailJS avec la clé publique
export function initEmailJS(publicKey) {
  if (!publicKey) return
  emailjs.init({ publicKey })
}

// Envoie un email via EmailJS
// Nécessite un template EmailJS avec les variables : to_email, to_name, from_name, reply_to, subject, message
export async function sendEmail({ serviceId, templateId, toEmail, toName, fromName, replyTo, subject, message }) {
  if (!serviceId || !templateId) {
    throw new Error('EmailJS non configuré. Renseignez Service ID et Template ID dans Paramètres → Compte.')
  }
  if (!toEmail) {
    throw new Error('Adresse email du destinataire manquante.')
  }

  const params = {
    to_email: toEmail,
    to_name: toName || '',
    from_name: fromName || 'ElecPro',
    reply_to: replyTo || fromName,
    subject,
    message,
  }

  const result = await emailjs.send(serviceId, templateId, params)
  return result
}

// ── TEMPLATES D'EMAILS ────────────────────────────────────

export function templateEnvoiDevis({ devis, client, entreprise }) {
  const clientNom = client?.societe || `${client?.prenom || ''} ${client?.nom || ''}`.trim() || 'Client'
  const montant = devis?.total_ttc ? `${devis.total_ttc.toLocaleString('fr-FR')}€ TTC` : ''

  return {
    subject: `Devis ${devis.numero}${devis.objet ? ` — ${devis.objet}` : ''}`,
    message: `Bonjour ${clientNom},

Veuillez trouver ci-joint notre devis n°${devis.numero}${devis.objet ? ` pour : ${devis.objet}` : ''}.
${montant ? `\nMontant total : ${montant}` : ''}
${devis.date_validite ? `Ce devis est valable jusqu'au ${devis.date_validite}.` : ''}

Pour l'accepter, merci de nous retourner ce devis signé avec la mention "Bon pour accord".

N'hésitez pas à nous contacter pour toute question.

Cordialement,
${entreprise?.nom || ''}
${entreprise?.tel ? `Tél : ${entreprise.tel}` : ''}
${entreprise?.email || ''}`,
  }
}

export function templateEnvoiFacture({ facture, client, entreprise }) {
  const clientNom = client?.societe || `${client?.prenom || ''} ${client?.nom || ''}`.trim() || 'Client'

  return {
    subject: `Facture ${facture.numero}${facture.objet ? ` — ${facture.objet}` : ''}`,
    message: `Bonjour ${clientNom},

Veuillez trouver ci-joint notre facture n°${facture.numero}${facture.objet ? ` pour : ${facture.objet}` : ''}.
${facture.date_echeance ? `\nElle est à régler avant le ${facture.date_echeance}.` : ''}

Modes de paiement acceptés : ${entreprise?.paiement ? 'virement bancaire, chèque' : 'à convenir'}.

Merci pour votre confiance.

Cordialement,
${entreprise?.nom || ''}
${entreprise?.tel ? `Tél : ${entreprise.tel}` : ''}
${entreprise?.email || ''}`,
  }
}

export function templateRelance({ facture, client, entreprise, niveau, relancesPrecedentes }) {
  const clientNom = client?.societe || `${client?.prenom || ''} ${client?.nom || ''}`.trim() || 'Client'
  const montant = `${(facture.total_ttc || 0).toLocaleString('fr-FR')}€ TTC`
  const sig = `${entreprise?.nom || ''}\n${entreprise?.tel ? `Tél : ${entreprise.tel}` : ''}\n${entreprise?.email || ''}`

  const templates = {
    j7: {
      subject: `Rappel facture ${facture.numero} — Règlement en attente`,
      message: `Bonjour ${clientNom},

Sauf erreur de notre part, la facture n°${facture.numero} d'un montant de ${montant} est arrivée à échéance.

Pourriez-vous nous confirmer la bonne réception de cette facture et nous indiquer la date prévisionnelle de règlement ?

Dans l'attente de votre retour, nous restons disponibles pour tout renseignement.

Cordialement,
${sig}`,
    },
    j30: {
      subject: `1ère relance — Facture ${facture.numero} impayée`,
      message: `Bonjour ${clientNom},

Malgré notre rappel du ${relancesPrecedentes?.[0]?.date || 'récemment'}, nous n'avons pas reçu le règlement de la facture n°${facture.numero} d'un montant de ${montant}.

Nous vous demandons de bien vouloir procéder au règlement de cette somme dans les meilleurs délais.

Passé ce délai, des pénalités de retard seront appliquées conformément à nos conditions générales.

Cordialement,
${sig}`,
    },
    j60: {
      subject: `2ème relance — Facture ${facture.numero} — Mise en demeure`,
      message: `Bonjour ${clientNom},

Malgré nos relances répétées, la facture n°${facture.numero} d'un montant de ${montant} TTC reste impayée à ce jour.

Par la présente, nous vous mettons en demeure de régler cette somme sous 8 jours ouvrés.

À défaut de règlement dans ce délai, nous nous verrons contraints d'engager une procédure de recouvrement judiciaire, avec application des pénalités de retard légales (taux BCE + 10 points) et des frais de recouvrement.

Cordialement,
${sig}`,
    },
  }

  return templates[niveau] || templates.j7
}
