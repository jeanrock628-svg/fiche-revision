# Fiche de révision — v1

Application web : chaque élève crée un compte, colle son cours, fixe sa note
visée et la date de son examen. Le cours est découpé en petites notions ;
chaque session de révision choisit les notions à travailler (celles en retard
de révision en priorité, puis les nouvelles) et génère des exercices adaptés
au niveau atteint sur chacune. Un système de répétition espacée fait revenir
régulièrement les notions déjà vues pour ne pas les oublier.

## 1. Mettre le code sur GitHub

1. Sur github.com, clique sur le bouton "+" en haut à droite puis "New repository".
2. Donne-lui un nom (ex. `fiche-revision`), laisse-le en "Public" ou "Private", ne coche aucune case, clique "Create repository".
3. Sur la page qui suit, GitHub te propose une commande "upload an existing file" — utilise-la pour glisser-déposer tout le contenu de ce dossier (sauf le fichier `.env.local.example`, garde-le pour toi si tu préfères, il ne contient pas de vraie clé de toute façon).

## 2. Créer la base de données Supabase

1. Dans ton projet Supabase, va dans l'onglet "SQL Editor" (menu de gauche).
2. Clique "New query", colle tout le contenu du fichier `supabase/schema.sql`, puis "Run".
3. Va dans "Project Settings" > "API" : tu y trouveras `Project URL` et la clé `anon public` — garde cette page ouverte, tu en as besoin à l'étape suivante.
4. Dans "Authentication" > "Providers", vérifie que "Email" est activé (c'est le cas par défaut). Dans "Authentication" > "Settings", tu peux désactiver la confirmation par email pour tester plus vite (à réactiver avant l'ouverture publique).

## 3. Déployer sur Vercel

1. Sur vercel.com, clique "Add New" > "Project", choisis le dépôt GitHub que tu viens de créer.
2. Avant de cliquer "Deploy", ouvre la section "Environment Variables" et ajoute ces trois variables :
   - `NEXT_PUBLIC_SUPABASE_URL` → l'URL de ton projet Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la clé "anon public" de Supabase
   - `ANTHROPIC_API_KEY` → ta clé API Anthropic
3. Clique "Deploy". Après une à deux minutes, Vercel te donne une URL publique (`xxx.vercel.app`) : c'est ton site, accessible à tous, gratuitement.

## 4. Tester

1. Ouvre l'URL Vercel, crée un compte avec un email et un mot de passe.
2. Ajoute un cours (colle un texte de cours d'au moins quelques lignes).
3. Attends la fin de l'analyse, puis lance une session de révision.

## Limites connues de cette v1 (à améliorer ensuite)

- Un seul cours actif à la fois par élève (en ajouter un nouveau remplace l'ancien dans le tableau de bord, l'historique reste en base).
- Le cours se colle en texte uniquement pour l'instant (pas encore d'import PDF).
- Le calcul du "temps restant" affiche les jours restants mais ne recalcule pas encore le rythme de sessions nécessaire pour être prêt à temps.
- Pas encore d'alerte si la note visée semble irréaliste vu le temps disponible.

## Nouvelles fonctionnalités (v2) — étapes de configuration

### 1. Mettre à jour la base de données
Si ta base Supabase existe déjà, exécute le contenu de `supabase/migration_v2.sql` dans le SQL Editor (en plus de `schema.sql` déjà fait). Il ajoute l'historique de progression, l'anti-abus, et rend la suppression de compte possible.

### 2. Ajouter la clé service (nécessaire pour la suppression de compte et les rappels)
Dans Supabase : Project Settings > API > section "Project API keys", copie la clé **service_role** (pas la clé anon !). Sur Vercel, ajoute une variable `SUPABASE_SERVICE_ROLE_KEY` avec cette valeur. **Ne la partage jamais, elle donne un accès total à la base.**

### 3. Vérification d'email obligatoire
Dans Supabase : Authentication > Settings, active "Confirm email" si ce n'est pas déjà fait. Les nouveaux inscrits devront cliquer un lien reçu par email avant de pouvoir se connecter.

### 4. Rappels automatiques par email (optionnel)
Pour activer l'envoi d'emails de rappel :
1. Crée un compte gratuit sur resend.com, récupère une clé API.
2. Ajoute sur Vercel : `RESEND_API_KEY` (ta clé), et `CRON_SECRET` (une phrase aléatoire de ton choix, sert juste à protéger l'endpoint).
3. En mode gratuit/test, Resend n'autorise l'envoi qu'à l'adresse email avec laquelle tu t'es inscrit, tant que tu n'as pas vérifié un nom de domaine. Suffisant pour tester, à améliorer avant une vraie ouverture publique.
4. Le cron Vercel (`vercel.json`) déclenche l'envoi chaque jour à 7h. Si tu ne configures pas Resend, cette fonctionnalité reste silencieusement inactive (pas d'erreur).

### 5. Import PDF
Fonctionne automatiquement après un nouveau déploiement, aucune configuration supplémentaire (la dépendance `pdf-parse` s'installe toute seule). Ne fonctionne que sur des PDF contenant du vrai texte, pas des scans/photos sans OCR.

### 6. Anti-abus
Une minute minimum entre deux analyses de cours, quelques secondes entre deux sessions, par élève — pour éviter qu'un usage abusif ne consomme tout le quota gratuit de l'API IA.
