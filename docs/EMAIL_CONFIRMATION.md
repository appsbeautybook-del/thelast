# Inscription et confirmation des comptes

Les applications vendeur et admin utilisent Supabase Auth directement. Une inscription crée une identité ordinaire ; elle n’attribue jamais de droits administrateur ni de boutique active. Après la confirmation, le vendeur demande l’activation de sa boutique. L’administrateur reçoit une habilitation dans `bb_admin_memberships` via le processus d’administration sécurisé existant.

## Configuration du projet Supabase hébergé

1. Dans Authentication → Providers → Email, activer l’inscription et la confirmation des adresses email.
2. Configurer un service SMTP personnel dans Authentication → Email. Le service intégré Supabase limite l’envoi aux adresses autorisées de l’équipe et ne permet pas une inscription publique fiable. Vérifier le domaine expéditeur chez le fournisseur d’email.
3. Dans Authentication → Email Templates → Confirm signup, remplacer le contenu par `supabase/templates/confirmation.html`. Sujet suggéré : « Votre code de confirmation BeautyBook ». Le code utilise `{{ .Token }}` et le lien utilise `{{ .ConfirmationURL }}`.
4. Dans Authentication → URL Configuration, autoriser les URL locales ci-dessous ainsi que les URL HTTPS exactes de production :
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5174/admin/login?auth=confirmed`
   - `http://localhost:5174/admin/login?auth=recovery`
   - `http://localhost:5175/?auth=confirmed`
   - `http://localhost:5175/?auth=recovery`
5. Le panneau admin et l’app vendeur utilisent PKCE : ouvrir le lien dans le navigateur qui a commencé l’inscription, ou saisir le code dans l’écran de confirmation. Les applications mobiles natives doivent utiliser leurs URL d’application enregistrées et les redirections autorisées correspondantes.

Une clé publique ou service_role permet les appels applicatifs mais ne permet pas de modifier la configuration SMTP et les modèles du projet hébergé. Ce fichier et le modèle sont préparés localement ; ils ne sont pas appliqués au projet distant automatiquement.

## Vérification réelle à effectuer après configuration

Créer un compte avec une boîte email accessible, saisir un mauvais code (la page doit rester ouverte), demander un nouveau code, saisir le code reçu puis vérifier la poursuite du parcours. Tester aussi le lien, le rechargement de la page de confirmation, une adresse déjà inscrite et la récupération de mot de passe. La confirmation admin doit rester distincte de l’attribution des droits : un compte ordinaire doit être refusé par `/api/admin/session`.

La base métier reste nécessaire : ajouter `DATABASE_URL` dans le `.env` du backend et appliquer les migrations documentées dans `LOCAL_SETUP.md` avant de tester les actions boutique et admin.

Références : https://supabase.com/docs/guides/auth/auth-email-templates et https://supabase.com/docs/guides/auth/auth-smtp
