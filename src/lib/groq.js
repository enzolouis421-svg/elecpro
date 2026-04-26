// Groq API — assistant IA contextuel avec actions directes
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function callGroq(messages, apiKey, modele = 'llama-3.3-70b-versatile') {
  if (!apiKey) throw new Error('Clé API Groq non configurée')

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modele,
      messages,
      max_tokens: 1024,
      temperature: 0.6,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erreur Groq ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// ── CONTEXTE COMPLET ──────────────────────────────────────
export function buildContext({
  clients = [], devis = [], factures = [], chantiers = [], kpis = {},
  interventions = [], tresorerie = null,
}) {
  const lines = []
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })
  lines.push(`Date aujourd'hui : ${today}`)

  // KPIs
  if (kpis) {
    lines.push(`\nKPIs du mois : CA encaissé ${kpis.ca_mois || 0}€ | ${kpis.devis_attente || 0} devis en attente (${kpis.montant_attente || 0}€) | ${kpis.impayes || 0}€ impayés | taux conversion ${kpis.taux_conversion || 0}%`)
  }

  // Clients
  if (clients.length) {
    lines.push(`\nCLIENTS (${clients.length}) :`)
    clients.slice(0, 25).forEach(c => {
      const nom = c.societe || [c.prenom, c.nom].filter(Boolean).join(' ')
      lines.push(`  id:${c.id} | ${nom}${c.email ? ` | ${c.email}` : ''}${c.telephone ? ` | ${c.telephone}` : ''}${c.ville ? ` | ${c.ville}` : ''}`)
    })
  }

  // Chantiers
  if (chantiers.length) {
    lines.push(`\nCHANTIERS (${chantiers.length}) :`)
    chantiers.slice(0, 10).forEach(c => {
      const client = clients.find(cl => cl.id === c.client_id)
      const nom = client ? (client.societe || [client.prenom, client.nom].filter(Boolean).join(' ')) : '?'
      lines.push(`  id:${c.id} | ${c.nom} | ${c.statut} | client: ${nom}${c.date_debut ? ` | début: ${c.date_debut}` : ''}`)
    })
  }

  // Devis
  if (devis.length) {
    lines.push(`\nDEVIS (${devis.length} total) :`)
    devis.slice(0, 10).forEach(d => {
      const client = clients.find(c => c.id === d.client_id)
      const nom = client ? (client.societe || [client.prenom, client.nom].filter(Boolean).join(' ')) : '?'
      lines.push(`  id:${d.id} | ${d.numero} | ${nom} | ${d.statut} | "${d.objet || ''}"`)
    })
  }

  // Factures
  if (factures.length) {
    lines.push(`\nFACTURES (${factures.length} total) :`)
    factures.slice(0, 10).forEach(f => {
      const client = clients.find(c => c.id === f.client_id)
      const nom = client ? (client.societe || [client.prenom, client.nom].filter(Boolean).join(' ')) : '?'
      lines.push(`  id:${f.id} | ${f.numero} | ${nom} | ${f.statut}${f.date_echeance ? ` | échéance: ${f.date_echeance}` : ''}`)
    })
  }

  // Interventions planning
  if (interventions.length) {
    lines.push(`\nPLANNING (${interventions.length} interventions) :`)
    const prochaines = interventions
      .filter(i => i.date_debut && new Date(i.date_debut) >= new Date())
      .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))
      .slice(0, 8)
    prochaines.forEach(i => {
      const ch = chantiers.find(c => c.id === i.chantier_id)
      lines.push(`  "${i.titre}" | ${i.date_debut}${i.toute_journee ? '' : ` ${i.heure_debut}-${i.heure_fin}`}${ch ? ` | chantier: ${ch.nom}` : ''}`)
    })
  }

  // Trésorerie
  if (tresorerie) {
    const solde = parseFloat(tresorerie.solde) || 0
    const charges = (tresorerie.charges || []).filter(c => c.actif)
    const totalChargesMois = charges
      .filter(c => c.frequence === 'mensuel')
      .reduce((s, c) => s + (parseFloat(c.montant) || 0), 0)
    const facturesAttente = factures
      .filter(f => f.statut === 'envoyee' || f.statut === 'en_retard')
      .length

    lines.push(`\nTRÉSORERIE :`)
    lines.push(`  Solde actuel : ${solde}€`)
    lines.push(`  Charges fixes mensuelles : ${totalChargesMois}€`)
    lines.push(`  Factures en attente d'encaissement : ${facturesAttente}`)

    if (tresorerie.fiscal) {
      const regime = tresorerie.fiscal.regime || 'micro_bic'
      lines.push(`  Régime fiscal : ${regime}`)
    }
  }

  return lines.join('\n') || 'Aucune donnée disponible.'
}

// ── PROMPT SYSTÈME PAR PAGE ───────────────────────────────
const PAGE_PROMPTS = {
  '/': "Tu es un conseiller de gestion expert pour un électricien artisan français. Tu analyses les KPIs, les tendances et donnes des conseils actionnables.",
  '/dashboard': "Tu es un conseiller de gestion expert pour un électricien artisan français. Tu analyses les KPIs, les tendances et donnes des conseils actionnables.",
  '/devis': "Tu es expert en chiffrage électricité. Tu connais les normes NF C 15-100, les prix du marché français 2025 et les règles de facturation artisan.",
  '/factures': "Tu es assistant de recouvrement pour un électricien artisan. Tu connais les délais légaux de paiement B2B (60 jours), les procédures de relance et les pénalités légales.",
  '/clients': "Tu analyses les profils clients pour un électricien artisan, tu détectes les opportunités de fidélisation et de montée en gamme.",
  '/chantiers': "Tu es expert en organisation de chantiers électriques. Tu connais les étapes de mise en œuvre, la NF C 15-100 et les normes de sécurité.",
  '/planning': "Tu gères le planning d'un électricien artisan. Tu peux créer des interventions directement dans le calendrier. Quand l'utilisateur demande de planifier quelque chose, utilise l'action CREATE_INTERVENTION.",
  '/tresorerie': "Tu es expert en gestion de trésorerie pour artisans. Tu analyses les flux, anticipes les tensions et donnes des conseils pour optimiser la trésorerie.",
  '/fiscal': "Tu es conseiller fiscal spécialisé micro-entrepreneur et TPE. Tu connais les taux URSSAF 2025, les tranches IR, les seuils TVA et les régimes d'imposition.",
  '/comptabilite': "Tu aides un électricien artisan à préparer ses exports comptables. Tu connais les obligations légales françaises (TVA, IS, IR) et les besoins des experts-comptables.",
  '/parametres': "Tu aides à configurer ElecPro de façon optimale pour un électricien artisan français.",
}

export function buildSystemPrompt(pathname, context) {
  const basePrompt = Object.entries(PAGE_PROMPTS).find(([k]) => pathname === k || (k !== '/' && pathname.startsWith(k)))?.[1]
    || "Tu es l'assistant d'ElecPro, application de gestion pour électriciens artisans français."

  return `${basePrompt}

DONNÉES ACTUELLES DE L'APP :
${context}

CAPACITÉS D'ACTION :
Quand l'utilisateur demande de créer ou préparer quelque chose, inclus UN SEUL bloc JSON à la fin de ta réponse entre les marqueurs [[ACTION]] et [[/ACTION]] (sur une seule ligne, sans espace autour).

TYPES D'ACTIONS DISPONIBLES :

1. Créer un devis :
[[ACTION]]{"type":"navigate","label":"Créer le devis","route":"/devis/nouveau","prefill":{"client_id":"ID_EXACT","objet":"Objet","lignes":[{"description":"Prestation","quantite":1,"unite":"forfait","prix_ht":500,"tva":10}]}}[[/ACTION]]

2. Créer une facture :
[[ACTION]]{"type":"navigate","label":"Créer la facture","route":"/factures/nouveau","prefill":{"client_id":"ID_EXACT","objet":"Objet","lignes":[...]}}[[/ACTION]]

3. Créer un client :
[[ACTION]]{"type":"navigate","label":"Créer le client","route":"/clients/nouveau","prefill":{"nom":"Dupont","prenom":"Jean","email":"","telephone":"","type":"particulier"}}[[/ACTION]]

4. Créer un chantier :
[[ACTION]]{"type":"navigate","label":"Créer le chantier","route":"/chantiers/nouveau","prefill":{"nom":"Nom du chantier","client_id":"ID_EXACT","adresse":"","description":"","statut":"preparation"}}[[/ACTION]]

5. Créer une intervention DIRECTEMENT dans le planning (sans passer par un formulaire) :
[[ACTION]]{"type":"intervention","label":"Ajouter au planning","titre":"Titre de l'intervention","date_debut":"YYYY-MM-DD","date_fin":"YYYY-MM-DD","heure_debut":"08:00","heure_fin":"17:00","toute_journee":false,"couleur":"amber","chantier_id":"","notes":""}[[/ACTION]]

6. Naviguer vers une page :
[[ACTION]]{"type":"navigate","label":"Voir la trésorerie","route":"/tresorerie"}[[/ACTION]]

RÈGLES IMPORTANTES :
- Utilise UNIQUEMENT les IDs clients/chantiers listés ci-dessus, jamais inventés
- Pour les dates, utilise le format YYYY-MM-DD (ex: 2026-04-25)
- Si l'utilisateur dit "vendredi", "lundi prochain", etc., calcule la date réelle à partir d'aujourd'hui
- N'inclus un bloc ACTION que si l'utilisateur demande EXPLICITEMENT de créer/planifier quelque chose
- Pour CREATE_INTERVENTION : utilise toute_journee:true si pas d'heure précisée
- Réponds en français, sois concis et pratique
- Pour les analyses, donne des chiffres précis issus des données ci-dessus`
}

// ── SUGGESTIONS RAPIDES PAR PAGE ──────────────────────────
export const QUICK_SUGGESTIONS = {
  '/': [
    'Analyse mon activité ce mois-ci',
    'Quels sont mes devis urgents ?',
    'Comment améliorer mon taux de conversion ?',
  ],
  '/dashboard': [
    'Analyse mon activité ce mois-ci',
    'Quels sont mes devis urgents ?',
    'Comment améliorer mon taux de conversion ?',
  ],
  '/planning': [
    'Quelles sont mes prochaines interventions ?',
    'Ajoute une intervention demain matin à 8h',
    'Mon planning est-il chargé cette semaine ?',
  ],
  '/tresorerie': [
    'Résume ma situation de trésorerie',
    'Est-ce que mon solde va passer en négatif ?',
    'Quelles charges puis-je réduire ?',
  ],
  '/fiscal': [
    'Combien dois-je provisionner ce mois-ci ?',
    'Suis-je proche du plafond TVA ?',
    'Quel est mon net estimé cette année ?',
  ],
  '/devis': [
    'Prépare un devis installation tableau',
    'Quel prix pour une mise aux normes ?',
    'Comment relancer un devis sans réponse ?',
  ],
  '/factures': [
    'Quelles factures sont en retard ?',
    'Rédige un message de relance poli',
    'Quel est mon total d\'impayés ?',
  ],
  '/clients': [
    'Quels clients n\'ont pas eu de devis récemment ?',
    'Analyse mon portefeuille clients',
    'Comment fidéliser mes meilleurs clients ?',
  ],
  '/chantiers': [
    'Quels chantiers sont en cours ?',
    'Comment organiser mon chantier cette semaine ?',
    'Checklist mise en service tableau électrique',
  ],
  '/comptabilite': [
    'Que dois-je exporter pour mon comptable ?',
    'Rappelle-moi mes obligations TVA',
    'Résume mon CA de l\'année',
  ],
}

export function getQuickSuggestions(pathname) {
  const key = Object.keys(QUICK_SUGGESTIONS).find(k =>
    pathname === k || (k !== '/' && pathname.startsWith(k))
  )
  return QUICK_SUGGESTIONS[key] || QUICK_SUGGESTIONS['/']
}

// ── PARSE ACTION ──────────────────────────────────────────
export function parseAction(text) {
  const match = text.match(/\[\[ACTION\]\]([\s\S]*?)\[\[\/ACTION\]\]/)
  if (!match) return { text: text.trim(), action: null }
  try {
    const action = JSON.parse(match[1].trim())
    const cleanText = text.replace(/\[\[ACTION\]\][\s\S]*?\[\[\/ACTION\]\]/, '').trim()
    return { text: cleanText, action }
  } catch {
    return { text: text.trim(), action: null }
  }
}

// ── PROMPTS SPÉCIALISÉS ───────────────────────────────────
export function promptConseilsDashboard(data) {
  return `Tu es un conseiller de gestion expert pour un électricien artisan français.
Données actuelles :
- CA du mois : ${data.ca_mois}€
- Devis en attente : ${data.devis_attente} (${data.montant_attente}€)
- Impayés : ${data.impayes}€
- Taux de conversion : ${data.taux_conversion}%

Donne 3 conseils concrets et actionnables pour cette semaine. Sois direct, pratique, pas de jargon.
Format : 3 bullet points courts (max 2 lignes chacun), commençant par un verbe d'action.`
}

export function promptAnalyseActivite(kpis, clients, devis, factures) {
  return `Analyse mon activité et donne-moi 3 conseils concrets pour cette semaine :
- CA du mois : ${kpis.ca_mois || 0}€
- Devis en attente : ${kpis.devis_attente || 0} (${kpis.montant_attente || 0}€)
- Impayés : ${kpis.impayes || 0}€ (${kpis.factures_retard || 0} factures)
- Taux de conversion : ${kpis.taux_conversion || 0}%
- Total clients : ${clients.length}
- Total devis : ${devis.length}
- Total factures : ${factures.length}

Sois direct, pratique, maximum 3 bullet points avec un verbe d'action.`
}
