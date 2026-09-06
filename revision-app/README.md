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
