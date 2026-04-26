-- ================================================================
-- ELECPRO — Schéma Supabase complet
-- À exécuter dans : Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- Activer l'extension UUID (déjà activée par défaut sur Supabase)
-- create extension if not exists "uuid-ossp";

-- ── CLIENTS ──────────────────────────────────────────────────────
create table if not exists clients (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text,
  prenom text,
  societe text,
  email text,
  telephone text,
  adresse text,
  cp text,
  ville text,
  type text default 'particulier',
  notes text,
  created_at timestamptz default now()
);
alter table clients enable row level security;
create policy "clients_own" on clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── CHANTIERS ────────────────────────────────────────────────────
create table if not exists chantiers (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text not null,
  client_id text references clients(id) on delete set null,
  adresse text,
  cp text,
  ville text,
  description text,
  statut text default 'preparation',
  date_debut text,
  date_fin text,
  budget_ht numeric default 0,
  etapes jsonb default '[]',
  notes jsonb default '[]',
  photos jsonb default '[]',
  created_at timestamptz default now()
);
alter table chantiers enable row level security;
create policy "chantiers_own" on chantiers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── DEVIS ────────────────────────────────────────────────────────
create table if not exists devis (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  numero text not null,
  client_id text references clients(id) on delete set null,
  chantier_id text references chantiers(id) on delete set null,
  statut text default 'brouillon',
  objet text,
  date_emission text,
  date_validite text,
  lignes jsonb default '[]',
  remise_type text,
  remise_valeur numeric default 0,
  acompte_type text,
  acompte_valeur numeric default 0,
  signature jsonb,
  notes_bas text,
  created_at timestamptz default now()
);
alter table devis enable row level security;
create policy "devis_own" on devis for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── FACTURES ─────────────────────────────────────────────────────
create table if not exists factures (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  numero text not null,
  client_id text references clients(id) on delete set null,
  chantier_id text references chantiers(id) on delete set null,
  devis_id text references devis(id) on delete set null,
  statut text default 'brouillon',
  objet text,
  date_emission text,
  date_echeance text,
  lignes jsonb default '[]',
  remise_type text,
  remise_valeur numeric default 0,
  acompte_verse numeric default 0,
  paiement jsonb,
  relances jsonb default '[]',
  notes_bas text,
  created_at timestamptz default now()
);
alter table factures enable row level security;
create policy "factures_own" on factures for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── PRESTATIONS ──────────────────────────────────────────────────
create table if not exists prestations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  categorie text,
  description text not null,
  unite text default 'forfait',
  prix_ht numeric default 0,
  tva numeric default 10,
  actif boolean default true,
  created_at timestamptz default now()
);
alter table prestations enable row level security;
create policy "prestations_own" on prestations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── INTERVENTIONS (planning) ──────────────────────────────────────
create table if not exists interventions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  titre text not null,
  chantier_id text references chantiers(id) on delete set null,
  date_debut text not null,
  date_fin text,
  heure_debut text default '08:00',
  heure_fin text default '17:00',
  toute_journee boolean default true,
  couleur text default 'amber',
  notes text,
  created_at timestamptz default now()
);
alter table interventions enable row level security;
create policy "interventions_own" on interventions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── TRÉSORERIE ────────────────────────────────────────────────────
-- Une seule ligne par utilisateur
create table if not exists tresorerie (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  solde numeric default 0,
  date_solde timestamptz,
  charges jsonb default '[]',
  fiscal jsonb default '{}',
  updated_at timestamptz default now()
);
alter table tresorerie enable row level security;
create policy "tresorerie_own" on tresorerie for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── SETTINGS ─────────────────────────────────────────────────────
create table if not exists settings (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}'
);
alter table settings enable row level security;
create policy "settings_own" on settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── TOKENS SIGNATURE À DISTANCE ──────────────────────────────────
-- Table publique : accessible sans auth par le client (via token secret)
create table if not exists public.devis_tokens (
  id           uuid primary key default gen_random_uuid(),
  token        text unique not null,
  devis_id     text not null,
  user_id      uuid references auth.users(id) on delete cascade,
  devis_data   jsonb not null,         -- snapshot devis + client
  settings_data jsonb not null,        -- snapshot entreprise + facturation
  expires_at   timestamptz not null default (now() + interval '30 days'),
  applied      boolean not null default false,  -- true = signature récupérée par l'électricien
  signature_data jsonb,                -- {type, data (base64), signataire, date}
  signataire   text,
  signed_at    timestamptz,
  created_at   timestamptz default now()
);

alter table public.devis_tokens enable row level security;

-- L'électricien peut créer/lire/modifier ses propres tokens
create policy "owner_tokens" on public.devis_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lecture publique par token (pour la page de signature client)
-- Sécurité : le token est un secret de 64 caractères hex (256 bits d'entropie)
create policy "public_read_token" on public.devis_tokens
  for select using (true);

-- Mise à jour publique : uniquement pour ajouter la signature (token non appliqué + non expiré)
create policy "public_sign_token" on public.devis_tokens
  for update using (applied = false and expires_at > now())
  with check (applied = false);

-- ── INDEX pour les performances ───────────────────────────────────
create index if not exists idx_clients_user on clients(user_id);
create index if not exists idx_chantiers_user on chantiers(user_id);
create index if not exists idx_devis_user on devis(user_id);
create index if not exists idx_factures_user on factures(user_id);
create index if not exists idx_prestations_user on prestations(user_id);
create index if not exists idx_interventions_user on interventions(user_id);
create index if not exists idx_interventions_date on interventions(date_debut);
create index if not exists idx_tresorerie_user on tresorerie(user_id);
create index if not exists idx_settings_user on settings(user_id);
create index if not exists idx_devis_tokens_token on devis_tokens(token);
create index if not exists idx_devis_tokens_devis on devis_tokens(devis_id);

-- ================================================================
-- MIGRATION : Si vous aviez déjà des données sans user_id
-- Décommentez et adaptez si nécessaire :
-- update clients set user_id = 'VOTRE-USER-UUID' where user_id is null;
-- ================================================================
