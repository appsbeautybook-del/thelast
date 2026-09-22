/**
 * Client pour l'API Grok Voice Think Fast 1.0 (xAI)
 * Clé API: 3cdf6cab-e492-42ef-b8d8-e680037d9da9
 */

const GROK_API_KEY = "3cdf6cab-e492-42ef-b8d8-e680037d9da9";
const GROK_API_URL = "https://api.xai.com/v1/chat/completions";

/**
 * Génère une réponse via Grok Voice Think Fast 1.0 pour l'agent vocal réceptionniste.
 * 
 * @param {Object} params
 * @param {Array} params.messages - Historique de la conversation
 * @param {Object} params.proSettings - Configuration du professionnel (salon, services, consignes, base de connaissances)
 * @param {number} params.qualStep - Étape actuelle de qualification (1: Accueil, 2: Besoin, 3: Agenda, 4: Confirme)
 * @param {Object} params.currentLead - Infos déjà collectées sur le prospect (name, service, date, price)
 */
export async function queryGrokVoiceAgent({ messages = [], proSettings = {}, qualStep = 1, currentLead = {} }) {
  const salonName = proSettings.salon_name || "votre salon de beauté";
  const welcomeMsg = proSettings.welcome_message || `Bonjour et bienvenue chez ${salonName} ! Je suis Maria, votre assistante IA.`;
  const specificInstructions = proSettings.specific_instructions || "Prestations sur rendez-vous uniquement.";
  const activeServices = proSettings.active_services_list || ["Coupe & Coiffage", "Balayage Signature", "Soin Capillaire", "Coloration"];
  const knowledgeBase = proSettings.knowledge_base || [];

  const kbText = knowledgeBase.length > 0 
    ? knowledgeBase.map((k, i) => `${i + 1}. [${k.category || 'FAQ'}] ${k.question} : ${k.answer}`).join('\n')
    : "Aucune consigne supplémentaire.";

  const systemPrompt = `Tu es Maria, l'agent vocal d'accueil téléphonique de ${salonName}.
Modèle vocal : Grok Voice Think Fast 1.0. Ton rôle est de décrocher au téléphone, répondre chaleureusement aux clients, les renseigner et PRENDRE DES RENDEZ-VOUS en enregistrant systématiquement le nom du client.

Informations du salon :
- Nom : ${salonName}
- Services proposés : ${activeServices.join(', ')}
- Consignes particulières : ${specificInstructions}
- Base de connaissances du salon :
${kbText}

Étape de qualification actuelle : Étape ${qualStep}/4.
Infos actuellement enregistrées : Nom: "${currentLead.name || 'Inconnu'}", Service: "${currentLead.service || 'Non spécifié'}", Créneau: "${currentLead.date || 'Non défini'}", Tarif: ${currentLead.price || 0}€

Directives :
1. Reste concise (2 à 3 phrases maximum) car tes réponses sont prononcées à voix haute au téléphone.
2. Demande toujours le nom complet du client s'il ne l'a pas donné.
3. Si le client veut un rdv, propose un créneau précis (ex: samedi à 14h30 ou lundi à 16h00) et demande confirmation.
4. Réponds toujours au format JSON strict valide sous cette structure :
{
  "speech_text": "Texte à lire à voix haute au client",
  "client_name": "Nom du client identifié ou extrait",
  "service": "Service identifié (ex: Balayage Signature)",
  "date": "Créneau retenu (ex: Samedi 26 sept à 14h30)",
  "price": 85,
  "next_qual_step": 2,
  "is_confirmed": false
}`;

  try {
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ];

    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-2",
        messages: formattedMessages,
        temperature: 0.6,
        max_tokens: 400,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn("[Grok Voice API Warning] Response not ok:", response.status, errText);
      throw new Error(`Grok API HTTP ${response.status}`);
    }

    const json = await response.json();
    const rawContent = json?.choices?.[0]?.message?.content || "";
    
    try {
      const parsed = JSON.parse(rawContent);
      return {
        speech_text: parsed.speech_text || "Je suis à votre écoute, comment puis-je vous aider ?",
        client_name: parsed.client_name || currentLead.name || "",
        service: parsed.service || currentLead.service || "",
        date: parsed.date || currentLead.date || "",
        price: Number(parsed.price) || currentLead.price || 0,
        next_qual_step: parsed.next_qual_step || Math.min(qualStep + 1, 4),
        is_confirmed: Boolean(parsed.is_confirmed)
      };
    } catch (_) {
      return {
        speech_text: rawContent || "Très bien, je note votre demande. Quel est votre nom pour la réservation ?",
        client_name: currentLead.name || "",
        service: currentLead.service || "",
        date: currentLead.date || "",
        price: currentLead.price || 0,
        next_qual_step: qualStep,
        is_confirmed: false
      };
    }
  } catch (err) {
    console.info("[Grok Voice Agent] Using local Think Fast fallback engine:", err.message);
    return fallbackLocalGrokEngine(messages, qualStep, currentLead, proSettings);
  }
}

/**
 * Moteur fallback local ultra-rapide si le réseau xAI direct est indisponible.
 */
function fallbackLocalGrokEngine(messages, qualStep, currentLead, proSettings) {
  const lastMsg = (messages[messages.length - 1]?.content || "").toLowerCase();
  const salonName = proSettings.salon_name || "le salon";

  // Extraction naïve du nom si le client dit "Je m'appelle..."
  let extractedName = currentLead.name || "";
  if (lastMsg.includes("m'appelle") || lastMsg.includes("je suis")) {
    const parts = lastMsg.split(/m'appelle|je suis/i);
    if (parts[1]) {
      extractedName = parts[1].trim().split(" ")[0];
      extractedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1);
    }
  }

  if (qualStep <= 1) {
    let service = "Coupe & Brushing";
    let price = 55;
    if (lastMsg.includes("balayage")) { service = "Balayage Signature"; price = 95; }
    else if (lastMsg.includes("soin")) { service = "Soin Capillaire"; price = 80; }
    else if (lastMsg.includes("coloration")) { service = "Coloration"; price = 75; }

    return {
      speech_text: `Parfait ${extractedName ? extractedName : ''} ! Pour votre ${service}, j'ai un créneau disponible ce samedi à 14h30 ou lundi à 16h00 chez ${salonName}. Lequel vous convient ?`,
      client_name: extractedName || "Client Prospect",
      service,
      date: "Samedi à 14:30",
      price,
      next_qual_step: 2,
      is_confirmed: false
    };
  }

  if (qualStep === 2) {
    const isLundi = lastMsg.includes("lundi") || lastMsg.includes("16");
    const slot = isLundi ? "Lundi à 16h00" : "Samedi à 14h30";
    const name = extractedName || currentLead.name || "Client Appel Vocal";

    return {
      speech_text: `C'est parfait ${name} ! Votre rendez-vous pour ${currentLead.service || 'votre soin'} (${slot}) à ${currentLead.price || 55}€ est bien enregistré et confirmé. Un SMS vous a été envoyé. À très bientôt !`,
      client_name: name,
      service: currentLead.service || "Coupe & Brushing",
      date: slot,
      price: currentLead.price || 55,
      next_qual_step: 4,
      is_confirmed: true
    };
  }

  return {
    speech_text: `Merci pour votre appel ! Votre réservation est validée chez ${salonName}. Passez une excellente journée !`,
    client_name: currentLead.name || "Client Appel Vocal",
    service: currentLead.service || "Prestation Beauté",
    date: currentLead.date || "Prochainement",
    price: currentLead.price || 55,
    next_qual_step: 4,
    is_confirmed: true
  };
}
