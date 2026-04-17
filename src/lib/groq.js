const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function callGroq(messages, apiKey, modele = 'llama-3.1-8b-instant') {
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
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erreur Groq ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// Construit le contexte de l'app à partir des données réelles
export function buildContext({ clients = [], devis = [], factures = [], chantiers = [], kpis = {} }) {
  const lines = []

  if (kpis) {
    lines.push(`KPIs du mois : CA ${kpis.ca_mois || 0}€ | ${kpis.devis_attente || 0} devis en attente (${kpis.montant_attente || 0}€) | ${kpis.impayes || 0}€ impayés | conversion ${kpis.taux_conversion || 0}%`)
  }

  if (clients.length) {
    lines.push(`\nCLIENTS (${clients.length}) :`)
    clients.slice(0, 20).forEach(c => {
      const nom = c.societe || [c.prenom, c.nom].filter(Boolean).join(' ')
      lines.push(`  id:${c.id} | ${nom}${c.email ? ` | ${c.email}` : ''}${c.telephone ? ` | ${c.telephone}` : ''}`)
    })
  }

  if (devis.length) {
    lines.push(`\nDEVIS (${devis.length} total) :`)
    devis.slice(0, 10).forEach(d => {
      const client = clients.find(c => c.id === d.client_id)
      const nom = client ? (client.societe || [client.prenom, client.nom].filter(Boolean).join(' ')) : '?'
      lines.push(`  ${d.numero} | ${nom} | ${d.statut} | "${d.objet || ''}"`)
    })
  }

  if (factures.length) {
    lines.push(`\nFACTURES (${factures.length} total) :`)
    factures.slice(0, 10).forEach(f => {
      const client = clients.find(c => c.id === f.client_id)
      const nom = client ? (client.societe || [client.prenom, client.nom].filter(Boolean).join(' ')) : '?'
      lines.push(`  ${f.numero} | ${nom} | ${f.statut} | "${f.objet || ''}"`)
    })
  }

  if (chantiers.length) {
    lines.push(`\nCHANTIERS (${chantiers.length}) :`)
    chantiers.slice(0, 8).forEach(c => {
      lines.push(`  ${c.nom} | ${c.statut}`)
    })
  }

  return lines.join('\n') || 'Aucune donnée disponible.'
}

// Construit le prompt système enrichi avec contexte + capacités d'action
export function buildSystemPrompt(pathname, context) {
  const pagePrompts = {
    '/dashboard': "Tu es conseiller de gestion expert pour un électricien artisan français.",
    '/devis': "Tu es expert en chiffrage électricité. Tu connais les normes NF C 15-100 et les prix du marché français 2025.",
    '/factures': "Tu es assistant de recouvrement pour un électricien artisan. Tu connais les délais légaux français.",
    '/clients': "Tu analyses les profils clients et suggères des opportunités commerciales.",
    '/chantiers': "Tu aides à planifier et suivre les chantiers électriques.",
  }

  const basePrompt = Object.entries(pagePrompts).find(([k]) => pathname.startsWith(k))?.[1]
    || "Tu es l'assistant d'ElecPro, app de gestion pour électriciens artisans français."

  return `${basePrompt}

DONNÉES ACTUELLES DE L'APP :
${context}

CAPACITÉS D'ACTION :
Quand l'utilisateur te demande de créer ou préparer un devis, facture, client ou chantier, inclus à la fin de ta réponse un bloc JSON entre les marqueurs [[ACTION]] et [[/ACTION]] (sans espaces ni retours à la ligne autour du JSON).

FORMAT EXACT :
[[ACTION]]{"label":"Créer le devis","route":"/devis/nouveau","prefill":{"client_id":"ID_EXACT","objet":"Objet","lignes":[{"description":"Prestation","quantite":1,"unite":"forfait","prix_ht":500,"tva":10}]}}[[/ACTION]]

ROUTES DISPONIBLES :
- /devis/nouveau → prefill: client_id (id exact ci-dessus), objet, lignes[{description, quantite, unite, prix_ht, tva}]
- /factures/nouveau → prefill: client_id, objet, lignes[...]
- /clients/nouveau → prefill: nom, prenom, societe, email, telephone, adresse, type("particulier"|"professionnel")
- /chantiers/nouveau → prefill: nom, client_id, adresse, description, statut

RÈGLES :
- Utilise uniquement les IDs clients listés ci-dessus, jamais inventés
- N'inclus un bloc ACTION que si l'utilisateur demande explicitement de créer/préparer quelque chose
- Réponds en français, concis et pratique
- Pour les analyses, sois direct avec des conseils actionnables`
}

// Parse le bloc [[ACTION]] d'une réponse IA
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

// Utilisé par le Dashboard pour les conseils IA automatiques
export function promptConseilsDashboard(data) {
  return `Tu es un conseiller comptable expert pour un électricien artisan français.
Données actuelles :
- CA du mois : ${data.ca_mois}€
- Devis en attente : ${data.devis_attente} (${data.montant_attente}€)
- Impayés : ${data.impayes}€
- Taux de conversion : ${data.taux_conversion}%

Donne 3 conseils concrets et actionnables pour cette semaine. Sois direct, pratique, pas de jargon.
Format : 3 bullet points courts (max 2 lignes chacun), commençant par un verbe d'action.`
}

// Prompt analyse d'activité
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
