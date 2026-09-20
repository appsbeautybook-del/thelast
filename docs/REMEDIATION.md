# BeautyBook — état réel de la remise en état

Dernière vérification : 19 septembre 2026. Le cahier des charges complet reste ouvert. Une compilation ou un test isolé ne valide pas un parcours en production.

## Ce qui est accessible

- Application principale : http://localhost:5173/ — accueil, catalogue et formulaires chargés dans le navigateur.
- Administration indépendante : http://localhost:5174/ — connexion dédiée, habilitations serveur et double authentification.
- Vendeur indépendant : http://localhost:5175/ — application React/Capacitor distincte.
- API : http://127.0.0.1:3000 — refuse les opérations non configurées.
- APK Android de développement : apps/seller/android/app/build/outputs/apk/debug/app-debug.apk, compilé le 19 septembre. Ce n’est pas une version signée pour le Play Store.

## Blocages vérifiés

La configuration Supabase publique et la clé serveur sont présentes dans les fichiers locaux ignorés par Git. L’accès aux métadonnées REST et Storage a été vérifié en lecture seule. DATABASE_URL manque toujours. Aucune des nouvelles migrations n’a été appliquée au projet distant. Aucun enregistrement client distant n’a été créé ou supprimé pendant ces contrôles.

OpenAI, Stripe/webhooks, Twilio et Meta ne sont pas configurés. La clé service-role communiquée dans la conversation doit être remplacée avant une mise en production. Ne pas ajouter cette clé à une variable VITE_ ou à une application mobile.

## Travail implémenté et preuves locales

| Domaine | État du code et contrôles | Travail restant avant validation réelle |
| --- | --- | --- |
| Backend indépendant | Authentification Supabase, contrôle des habilitations/MFA, API par ressource, journal d’audit, états de santé et diagnostic de configuration | Connexion PostgreSQL, sauvegarde, audit des contraintes/policies réelles, migration de préproduction et hébergement HTTPS |
| Administration | Interfaces indépendantes : demandes professionnelles, boutiques, comptes/habilitations, catalogue, réservations, commandes et traitements | Essais avec des comptes distincts et audit de chaque écran historique ; suspension et suppression définitive encore à terminer |
| Vendeur | Catalogue, stock, commandes, expédition, réglages, demandes d’accès, Stripe Connect ; autorisations par propriétaire testées | Comptes/boutiques réels, validation des commandes et paiements fournisseurs, connexion mobile HTTPS |
| Android / iOS vendeur | Bundle web et synchronisation Capacitor réussis ; APK debug Android compilé ; projet iOS présent | Essai sur appareils, liens de retour auth/paiement, signatures de distribution, Xcode/macOS et comptes stores |
| Connexion / inscription | Ancien client privilégié supprimé du frontend ; OTP utilise la session renvoyée par Supabase ; aucun mot de passe dans les brouillons ; erreurs de sauvegarde visibles ; rôle professionnel préservé ; callbacks auth sans appel bloquant sous verrou | Emails/OTP réels, récupération du mot de passe, OAuth Google/Apple, redirects/deep links et reprise de session sur appareils |
| Accueil / navigation | Chargement réel vérifié ; un seul arbre de routes pour visiteurs et comptes ; conditions accessibles avant connexion ; vraie page introuvable ; retour Stripe vers /rendez-vous ; boutons accessibles et adaptés | Vérification complète de tous les parcours/écrans ; textes légaux historiques et coordonnées commerciales à valider |
| Cache / confidentialité | Suppression du cache de développement obsolète ; API, réponses authentifiées et médias privés exclus du cache ; icône locale BeautyBook | Test de mise à jour hors ligne sur appareils et distribution réelle |
| Maria / voix | Responses, synthèse et transcription côté serveur ; propositions et confirmations contrôlées de réservation/actions | Clé fournisseur, essais voix/image réels, quotas, évaluation des réponses et profils |
| Images / essayage | File persistante avec idempotence/quota, images de référence, stockage privé, historique propre à chaque utilisateur, état incertain sans nouvel appel payant automatique ; recherche limitée aux vrais produits | Fournisseur et buckets migrés, génération réelle, rétention et suppression des médias de comptes fermés ; favoris avec URL expirante à revoir |
| Réservations | Prix/durée/options serveur, horaires/pauses/congés, verrou de capacité, idempotence, transitions et paiements vérifiés | Scénarios intercanaux réels, fuseaux des professionnels, concurrence réseau et calendriers externes |
| Commerce | Stock réservé, prix serveur, expédition par boutique, checkout hébergé, événements signés, reversements/remboursements et rapprochement | Paramétrage Stripe Connect/commission, vendeurs vérifiés et achats/remboursements en mode test du fournisseur |
| Avis | Réservation terminée requise, participants vérifiés, unicité, critères validés, réponse du professionnel et moyennes recalculées côté base | Migration réelle et essais client/pro dans les écrans |
| Supabase / RLS / Storage | Migrations additives ; compatibilité avec les noms/types de colonnes distants ; droits de propriété, secrets sociaux et médias privés protégés dans les tests | Les métadonnées REST ne décrivent pas toutes les contraintes, fonctions, triggers ou policies réelles : audit PostgreSQL obligatoire avant application |
| Notifications / réceptionniste | File d’événements et moteur professionnel avec disponibilités, prospects et transmission | Téléphone, widget public, réseaux sociaux officiels, notifications push/email réellement reçues et consentement |
| Suppression / export des comptes | Anciennes suppressions privilégiées et faux succès neutralisés dans le frontend public | Inventaire des données/objets historiques, archivage/anonymisation, suppression Auth/Storage et tests de bout en bout |
| Autres écrans historiques | Inventaire commencé ; aucun succès fournisseur ne doit être fabriqué | Fidélité, abonnements, BeautyPay, cartes enregistrées, live/vidéo, immobilier et écrans secondaires à valider/corriger intégralement |

## Tests et limites

- 86 tests réussis sur le schéma local isolé.
- 86 tests réussis sur le schéma reconstruit à partir des noms/types de colonnes distants, après réduction de la concurrence à deux fichiers. Une première exécution simultanée avait dépassé la mémoire disponible.
- Tests de sécurité, transactions, Stripe simulé, stocks, remboursements, avis, images, sessions/OTP, isolation Storage malgré une ancienne policy permissive, cache et proxy HTTP.
- Les fournisseurs externes sont simulés uniquement dans les tests. Aucune génération IA ni transaction Stripe réelle n’a été effectuée.
- PGlite exécute les requêtes/migrations localement ; le modèle distant ne reproduit pas toutes les contraintes et fonctions du projet. Ces résultats ne prouvent pas la compatibilité de production.
- Build principal, admin, vendeur et Android debug réussis. Le bundle principal conserve des morceaux volumineux ; optimisation encore nécessaire.
- Contrôles navigateur : accueil, connexion/validation vide, inscription et documents accessibles aux visiteurs. Les parcours authentifiés client/pro/vendeur/admin ne sont pas déclarés validés.
- Audit lexical : aucune clé privilégiée incorporée ni correspondance de faux résultat IA dans les sources scannées. Les autres correspondances historiques (policies permissives, SQL et démonstrations) restent des éléments à examiner, pas une certification de sécurité.

## Ordre de reprise

1. Renseigner DATABASE_URL localement selon LOCAL_SETUP.md, puis relancer le diagnostic.
2. Sauvegarder et auditer la base réelle ; appliquer les migrations en préproduction et créer explicitement les habilitations de test.
3. Tester les flux client, professionnel, vendeur et administrateur avec des comptes distincts.
4. Configurer les fournisseurs et terminer les fonctions encore listées comme incomplètes.
5. Valider appareils, performances, données personnelles, documents légaux, signatures et exigences des stores.

Les scripts historiques FIX_* ne doivent pas être exécutés en masse. Le serveur ne migre jamais automatiquement la base et n’accorde pas de droits administrateurs à partir de profiles.role ou des métadonnées utilisateur.
