# Démarrer BeautyBook et terminer la connexion

## Le prochain élément nécessaire

Les clés Supabase sont déjà enregistrées localement. Il manque la connexion PostgreSQL utilisée par le backend pour les réservations, les stocks et l’administration.

1. Dans le tableau de bord de votre projet Supabase, ouvrir **Connect**, puis **Session pooler**.
2. Copier la chaîne PostgreSQL proposée par ce panneau. Utiliser le mot de passe de la base et encoder les caractères réservés du mot de passe dans l’URL. Ne pas utiliser l’adresse /rest/v1/.
3. Renseigner **DATABASE_URL** dans beauty_book-main/beauty_book-main/backend/.env. Garder cette valeur dans le fichier local, sans la coller dans la conversation.
4. Depuis le dossier backend, lancer **npm run doctor**. Le diagnostic affiche les noms des éléments manquants, jamais les valeurs secrètes.

Documentation officielle : https://supabase.com/docs/guides/database/connecting-to-postgres

Le fichier .env est ignoré par Git. Les applications publiques reçoivent seulement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY. La clé service-role reste exclusivement côté serveur. Si un certificat est nécessaire, renseigner DATABASE_CA_CERT ; ne pas désactiver la vérification TLS en production.

## Les quatre applications locales

Depuis la racine thelast, utiliser un terminal par service :

| Dossier | Commande | Adresse |
| --- | --- | --- |
| beauty_book-main/beauty_book-main | npm run dev -- --host localhost --port 5173 --strictPort | http://localhost:5173/ |
| panneau-admin-temp | npm run dev -- --host localhost --port 5174 --strictPort | http://localhost:5174/ |
| apps/seller | npm run dev | http://localhost:5175/ |
| beauty_book-main/beauty_book-main/backend | npm run dev | http://127.0.0.1:3000 |
| beauty_book-main/beauty_book-main/backend | npm run worker | Traitements des événements, images et commerce |

Le worker nécessite la base migrée. /api/health indique que le processus répond ; /api/ready vérifie la connexion et les tables/colonnes requises. Un serveur lancé n’implique pas que les services métier sont prêts.

## Préparer la base avant toute migration

Aucune migration de cette remise en état n’a encore été appliquée à distance. Commencer par une sauvegarde restaurable et un environnement de préproduction. Le fichier docs/audit/remote-schema.json ne contient que des métadonnées publiques de schéma, sans les enregistrements métier ; il ne remplace pas l’inventaire des contraintes, fonctions, triggers, grants et policies.

Les migrations sont dans supabase/migrations à la racine thelast, dans cet ordre :

1. 202609170000_schema_alignment.sql
2. 202609170001_secure_backend.sql
3. 202609180001_payments.sql
4. 202609180002_data_ownership.sql
5. 202609180003_outbox.sql
6. 202609180004_commerce.sql
7. 202609190001_receptionist.sql
8. 202609190002_reviews_media.sql
9. 202609190003_image_jobs.sql

Examiner les données historiques avant application. Les buckets private-documents, private-images et ai-results sont privés. Le bucket uploads contient les médias publics. Les anciennes données doivent être inventoriées avant tout déplacement ou suppression.

Les administrateurs sont habilités explicitement dans bb_admin_memberships par un responsable autorisé ; aucune inscription publique ne donne ce rôle. ADMIN_REQUIRE_MFA reste activé. Créer des comptes de test distincts pour chaque profil après migration.

## Intégrations à configurer

- OpenAI : OPENAI_API_KEY ; paramètres texte, voix et images dans backend/.env.example. Les générations utilisent une file et des quotas, sans résultat de remplacement inventé.
- Stripe : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL et SELLER_APP_URL ; Connect pour les vendeurs, MARKETPLACE_COMMISSION_BPS selon les conditions réellement adoptées. Commencer en mode test. Une redirection ne valide jamais un paiement.
- Cartes enregistrées : interface en attente de service dédié ; VITE_STRIPE_PUBLIC_KEY est une clé publique facultative, jamais la clé secrète Stripe.
- Téléphone/réseaux sociaux : comptes officiels, secrets et autorisations fournisseur, URLs publiques HTTPS ; intégrations encore incomplètes.
- Google/Apple : activer/configurer les fournisseurs dans Supabase, les URLs autorisées et les retours mobiles, puis tester les comptes réels.
- Déploiement : API HTTPS, origines explicites, worker permanent, tâches de sauvegarde et surveillance. Les proxies Vercel doivent pointer vers le backend privé via leur configuration serveur.

Ne pas publier tant que les parcours et les fonctions restantes de REMEDIATION.md ne sont pas validés. Les textes légaux et informations commerciales historiques ne sont pas encore validés pour l’activité réelle.

## Vérification reproductible

Dans backend : npm test (concurrence limitée à deux fichiers pour éviter de saturer la mémoire).
Pour le modèle de colonnes distantes sous PowerShell : définir $env:BEAUTYBOOK_TEST_SCHEMA='remote', puis npm test. Cette variable ne sélectionne jamais une base distante : tous les tests restent isolés dans PGlite.

Dans chaque application web : npm run build.
À la racine : node scripts/audit-source.mjs. Un audit lexical ne remplace pas la revue des permissions et les tests de bout en bout.
