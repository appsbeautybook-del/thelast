import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Eye,
  Database,
  Trash2,
  Download,
  Lock,
  Users,
  Globe,
  Mail,
  Clock,
  UserCheck,
} from "lucide-react";
import { useThemeBg } from "@/hooks/useTheme";

const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
  </div>
);

export default function PolitiqueConfidentialite() {
  const navigate = useNavigate();
  const themeBg = useThemeBg();

  return (
    <div className={`min-h-screen ${themeBg}`}>
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            Politique de Confidentialité
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <SectionCard icon={Shield} title="Introduction">
          <p>
            Chez BeautyBook, la protection de vos données personnelles est une
            priorité absolue. Nous nous engageons à collecter, traiter et
            conserver vos informations dans le respect total du Règlement
            Général sur la Protection des Données (RGPD - Règlement UE
            2016/679) et de la législation française applicable.
          </p>
          <p>
            La présente politique de confidentialité décrit de manière claire et
            transparente quelles données nous collectons, pourquoi nous les
            collectons, comment nous les utilisons et quels sont vos droits.
          </p>
          <p className="text-sm text-gray-400">
            Dernière mise à jour : Août 2026
          </p>
        </SectionCard>

        <SectionCard icon={Database} title="Données collectées">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Données d'identification :</strong> nom, prénom, adresse
                email, photo de profil
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Données de localisation :</strong> uniquement si vous
                l'autorisez activement
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Historique :</strong> réservations et commandes passées
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Données de paiement :</strong> traitées exclusivement
                par Stripe, jamais stockées par BeautyBook
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Photos IA :</strong> uploadées pour le filtre AI,
                automatiquement supprimées après traitement
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Données de navigation :</strong> pages visitées,
                interactions, appareil utilisé
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Eye} title="Finalités du traitement">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>Gestion des comptes utilisateurs</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>Mise en relation clients-professionnels</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>Traitement des réservations et paiements</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                Envoi de notifications (réservation, rappels, promotions si
                accepté)
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                Amélioration du service (données analytiques anonymisées)
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                Personnalisation de l'expérience (styles, routines beauté)
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={UserCheck} title="Base légale">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">
                Exécution du contrat
              </p>
              <p className="text-sm">
                Inscription, gestion des réservations, traitement des commandes
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Consentement</p>
              <p className="text-sm">
                Notifications marketing, géolocalisation, cookies analytiques
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Intérêt légitime</p>
              <p className="text-sm">
                Sécurité de la plateforme, prévention de la fraude,
                débogage
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Clock} title="Durée de conservation">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Compte actif :</strong> données conservées pendant toute
                la durée d'utilisation du service
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Compte supprimé :</strong> anonymisation complète sous
                30 jours
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Données de navigation :</strong> 3 ans maximum
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Cookies :</strong> 13 mois maximum
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Download} title="Vos droits (Art. 15-22 RGPD)">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">Droit d'accès</p>
              <p className="text-sm">
                Exporter l'ensemble de vos données personnelles
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Droit de rectification
              </p>
              <p className="text-sm">
                Modifier ou corriger vos informations personnelles
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Droit à l'effacement
              </p>
              <p className="text-sm">
                Supprimer votre compte et toutes vos données
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Droit à la portabilité
              </p>
              <p className="text-sm">
                Recevoir vos données dans un format standard et lisible
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Droit d'opposition
              </p>
              <p className="text-sm">
                Vous opposer à tout moment au traitement de vos données
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Droit à la limitation
              </p>
              <p className="text-sm">
                Suspendre temporairement le traitement de vos données
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm font-medium text-gray-900">
              Pour exercer vos droits :
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Envoyez un email à{" "}
              <span className="text-primary font-medium">
                dpo@beautybook.fr
              </span>{" "}
              ou rendez-vous dans{" "}
              <span className="font-medium">Confidentialité {">"} Mes données</span>.
            </p>
          </div>
        </SectionCard>

        <SectionCard icon={Users} title="Partage des données">
          <div className="space-y-2">
            <p>
              <strong>Aucune vente de données</strong> — BeautyBook ne vend
              jamais vos données personnelles à des tiers.
            </p>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Professionnels :</strong> vos données de contact et de
                réservation sont partagées uniquement avec le professionnel
                concerné par votre rendez-vous
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Sous-traitants :</strong> nos prestataires ont signé un
                accord de traitement des données (DPA) : Supabase (hébergement),
                Stripe (paiements), Vercel (déploiement), Resend (emails)
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Globe} title="Transferts hors UE">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">Supabase (USA)</p>
              <p className="text-sm">
                Clauses contractuelles types (CCT) conformes au RGPD
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Vercel (USA)</p>
              <p className="text-sm">
                Conformité au Data Privacy Framework UE-USA
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Stripe (USA/UE)</p>
              <p className="text-sm">
                Conformité au Data Privacy Framework
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Lock} title="Sécurité">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                Chiffrement <strong>HTTPS/TLS</strong> en transit sur toutes les
                communications
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                Chiffrement <strong>au repos</strong> dans la base PostgreSQL
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Row Level Security (RLS)</strong> activée sur toutes les
                tables de la base de données
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p>
                <strong>Authentification forte</strong> via JWT (Supabase Auth)
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Mail} title="Contact">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">
                Délégué à la Protection des Données (DPO)
              </p>
              <p className="text-sm">
                Email :{" "}
                <span className="text-primary font-medium">
                  dpo@beautybook.fr
                </span>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Autorité de contrôle
              </p>
              <p className="text-sm">
                CNIL — Commission Nationale de l'Informatique et des Libertés
              </p>
              <p className="text-sm">
                Site web :{" "}
                <span className="text-primary">www.cnil.fr</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Réclamation</p>
              <p className="text-sm">
                Si vous estimez que le traitement de vos données n'est pas
                conforme au RGPD, vous avez le droit de déposer une plainte
                auprès de la CNIL.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
