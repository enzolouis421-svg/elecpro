// Bibliothèque de prestations pré-chargées pour électricien
export const PRESTATIONS = [
  { id: 1, categorie: 'Tableau électrique', description: 'Fourniture et pose tableau électrique 1 rangée 13 modules avec disjoncteur principal 60A et 8 disjoncteurs divisionnaires', unite: 'forfait', prix_ht: 350, tva: 10 },
  { id: 2, categorie: 'Tableau électrique', description: 'Mise aux normes tableau électrique existant (ajout différentiels 30mA, vérification câblage)', unite: 'forfait', prix_ht: 280, tva: 10 },
  { id: 3, categorie: 'Prises & Interrupteurs', description: 'Fourniture et pose prise de courant 16A encastrée avec boîte', unite: 'u', prix_ht: 45, tva: 10 },
  { id: 4, categorie: 'Prises & Interrupteurs', description: 'Fourniture et pose interrupteur va-et-vient encastré', unite: 'u', prix_ht: 38, tva: 10 },
  { id: 5, categorie: 'Prises & Interrupteurs', description: 'Fourniture et pose prise RJ45 cat 6 encastrée', unite: 'u', prix_ht: 55, tva: 10 },
  { id: 6, categorie: 'Éclairage', description: 'Fourniture et pose point lumineux encastré LED 10W', unite: 'u', prix_ht: 65, tva: 10 },
  { id: 7, categorie: 'Éclairage', description: 'Fourniture et pose applique murale avec alimentation', unite: 'u', prix_ht: 55, tva: 10 },
  { id: 8, categorie: 'Éclairage', description: 'Installation variateur d\'éclairage LED', unite: 'u', prix_ht: 85, tva: 10 },
  { id: 9, categorie: 'Câblage', description: 'Passage de câble électrique sous goulotte (prix au mètre linéaire)', unite: 'm', prix_ht: 18, tva: 10 },
  { id: 10, categorie: 'Câblage', description: 'Passage de câble électrique en encastré avec saignée et rebouchage', unite: 'm', prix_ht: 35, tva: 10 },
  { id: 11, categorie: 'Chauffage', description: 'Fourniture et pose radiateur électrique à inertie 1500W avec thermostat programmable', unite: 'u', prix_ht: 420, tva: 10 },
  { id: 12, categorie: 'Chauffage', description: 'Fourniture et pose plancher chauffant électrique (prix au m²)', unite: 'm²', prix_ht: 85, tva: 10 },
  { id: 13, categorie: 'Sécurité', description: 'Fourniture et pose détecteur de fumée NF interconnectable', unite: 'u', prix_ht: 45, tva: 10 },
  { id: 14, categorie: 'Sécurité', description: 'Fourniture et pose alarme intrusion 4 zones avec centrale et sirène', unite: 'forfait', prix_ht: 850, tva: 20 },
  { id: 15, categorie: 'Sécurité', description: 'Installation caméra de surveillance intérieure HD avec alimentation', unite: 'u', prix_ht: 180, tva: 20 },
  { id: 16, categorie: 'Domotique', description: 'Installation volet roulant électrique avec télécommande', unite: 'u', prix_ht: 220, tva: 10 },
  { id: 17, categorie: 'Domotique', description: 'Fourniture et pose thermostat connecté (Nest/Netatmo)', unite: 'u', prix_ht: 195, tva: 10 },
  { id: 18, categorie: 'Extérieur', description: 'Fourniture et pose borne de recharge véhicule électrique 7,4kW (Wallbox)', unite: 'u', prix_ht: 650, tva: 20 },
  { id: 19, categorie: 'Extérieur', description: 'Fourniture et pose éclairage extérieur avec détecteur de mouvement', unite: 'u', prix_ht: 95, tva: 10 },
  { id: 20, categorie: 'Extérieur', description: 'Installation prise extérieure IP44 avec protection différentielle', unite: 'u', prix_ht: 120, tva: 10 },
  { id: 21, categorie: "Main d'œuvre", description: "Main d'œuvre électricien qualifié", unite: 'h', prix_ht: 55, tva: 20 },
  { id: 22, categorie: "Main d'œuvre", description: 'Déplacement et frais de chantier', unite: 'forfait', prix_ht: 40, tva: 20 },
  { id: 23, categorie: 'Conformité', description: 'Vérification et certification installation électrique (rapport CONSUEL)', unite: 'forfait', prix_ht: 180, tva: 20 },
  { id: 24, categorie: 'Conformité', description: 'Mise aux normes installation électrique complète (diagnostic + travaux)', unite: 'forfait', prix_ht: 1200, tva: 10 },
  { id: 25, categorie: 'Divers', description: 'Fournitures et petites fournitures électriques (câbles, dominos, fixations)', unite: 'forfait', prix_ht: 35, tva: 20 },
]

// Catégories uniques pour filtrage
export const CATEGORIES = [...new Set(PRESTATIONS.map(p => p.categorie))]
