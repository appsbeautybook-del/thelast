# BeautyBook Vendeur

Application autonome React + Capacitor, séparée du site client et du panneau administrateur. La même API contrôle l’identité du vendeur, son catalogue, les stocks, commandes, expéditions, réglages et l’accès Stripe Connect.

## Développement

Copier .env.example vers .env.local et renseigner les valeurs publiques Supabase. Sur le web local, laisser VITE_BACKEND_URL vide pour le proxy Vite vers le backend sur le port 3000.

- npm run dev : http://localhost:5175/
- npm run build : compilation web
- npm run cap:sync -- android : copie de la compilation dans le projet Android
- npm run cap:open:android : ouvre le projet Android

Le backend et ses migrations sont indispensables. Une simple session Supabase ne suffit pas : le compte doit avoir une boutique autorisée dans bb_seller_accounts. Les comptes non autorisés ne reçoivent pas de catalogue ni de commandes d’un autre vendeur.

## Android

Un APK de développement est disponible dans android/app/build/outputs/apk/debug/app-debug.apk. La compilation Gradle assembleDebug a réussi le 19 septembre 2026 avec le JDK d’Android Studio et le SDK Android locaux. L’APK n’est pas signé pour la distribution commerciale.

Pour utiliser l’application sur un téléphone, configurer VITE_BACKEND_URL avec l’adresse HTTPS du backend, reconstruire puis synchroniser. localhost sur le téléphone désigne le téléphone lui-même. Le build actuel sans URL HTTPS affiche une indisponibilité explicite pour les opérations serveur ; il n’est pas validé de bout en bout sur appareil.

## iOS et publication

Le projet ios est présent. Sa compilation, les certificats, les profils de provisioning et la publication nécessitent macOS/Xcode. Aucun build iOS n’est déclaré validé.

Avant distribution : tester connexion, reprise de session, retours Stripe, permissions, partage et navigation sur appareils ; configurer les icônes/écrans de lancement définitifs, signature release et comptes stores ; terminer la suppression de compte et les documents de confidentialité. Ne pas placer de clé service-role ou de secret fournisseur dans .env.local.

État complet du projet : ../../docs/REMEDIATION.md. Configuration commune : ../../docs/LOCAL_SETUP.md.
