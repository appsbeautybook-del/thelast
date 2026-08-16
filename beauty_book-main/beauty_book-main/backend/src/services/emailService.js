import { Resend } from 'resend';
import nodemailer from 'nodemailer';

let resendClient = null;
let gmailTransporter = null;

function getResend() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

async function getGmailTransporter() {
  if (gmailTransporter) return gmailTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    pool: true,
    maxConnections: 1,
    rateDelta: 1000,
    rateLimit: 5,
  });
  console.log('[Email] Gmail SMTP ready');
  return gmailTransporter;
}

function buildEmailHtml(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #E8732A; font-size: 28px; margin: 0;">BeautyBook</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 16px; padding: 32px; text-align: center;">
        <h2 style="color: #111827; font-size: 22px; margin: 0 0 12px;">Vérifiez votre email</h2>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Voici votre code de vérification :</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E8732A; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0;">Ce code expire dans 10 minutes.</p>
      </div>
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">
        Si vous n'avez pas demandé ce code, ignorez cet email.
      </p>
    </div>
  `;
}

export async function sendOTPEmail(email, code) {
  const html = buildEmailHtml(code);
  const text = `Votre code de vérification est : ${code}. Ce code expire dans 10 minutes.`;
  const subject = 'Votre code de vérification BeautyBook';

  // Essayer Resend d'abord
  const resend = getResend();
  if (resend) {
    try {
      await resend.emails.send({
        from: 'BeautyBook <onboarding@resend.dev>',
        to: email,
        subject,
        text,
        html,
      });
      console.log('[Email] Sent via Resend to:', email);
      return { success: true };
    } catch (err) {
      console.warn('[Email] Resend failed:', err.message);
    }
  }

  // Fallback Gmail SMTP
  const gmail = await getGmailTransporter();
  if (gmail) {
    try {
      await gmail.sendMail({
        from: `"BeautyBook" <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        text,
        html,
      });
      console.log('[Email] Sent via Gmail SMTP to:', email);
      return { success: true };
    } catch (err) {
      console.error('[Email] Gmail SMTP error:', err.message);
    }
  }

  console.log('[Email] ==========================================');
  console.log('[Email] AUCUN SMTP — Code pour', email, ':', code);
  console.log('[Email] ==========================================');
  return { success: true, note: 'console_only' };
}

// ── Emails Reservation ────────────────────────────────────────────────────────

function buildReservationConfirmedHtml({ clientName, serviceName, date, time, proName }) {
  const formattedDate = date ? new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #E8732A; font-size: 28px; margin: 0;">BeautyBook</h1>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 32px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
        <h2 style="color: #166534; font-size: 20px; margin: 0 0 8px;">Réservation confirmée !</h2>
        <p style="color: #16a34a; font-size: 14px; margin: 0 0 20px;">${proName || "Le professionnel"} a confirmé votre rendez-vous.</p>
        <div style="background: white; border-radius: 12px; padding: 20px; text-align: left;">
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;"><strong>Service :</strong> ${serviceName || ""}</p>
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;"><strong>Date :</strong> ${formattedDate}</p>
          <p style="color: #374151; font-size: 14px; margin: 0;"><strong>Heure :</strong> ${time || ""}</p>
        </div>
      </div>
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">
        Consultez vos rendez-vous dans l'application BeautyBook.
      </p>
    </div>
  `;
}

function buildReservationCancelledHtml({ clientName, serviceName, date, proName, reason }) {
  const formattedDate = date ? new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #E8732A; font-size: 28px; margin: 0;">BeautyBook</h1>
      </div>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 32px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
        <h2 style="color: #991b1b; font-size: 20px; margin: 0 0 8px;">Réservation annulée</h2>
        <p style="color: #dc2626; font-size: 14px; margin: 0 0 20px;">${proName || "Le professionnel"} a annulé votre rendez-vous.</p>
        <div style="background: white; border-radius: 12px; padding: 20px; text-align: left;">
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;"><strong>Service :</strong> ${serviceName || ""}</p>
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;"><strong>Date :</strong> ${formattedDate}</p>
          ${reason ? `<p style="color: #374151; font-size: 14px; margin: 0;"><strong>Raison :</strong> ${reason}</p>` : ""}
        </div>
      </div>
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">
        Consultez vos rendez-vous dans l'application BeautyBook.
      </p>
    </div>
  `;
}

async function sendReservationEmail({ to, type, clientName, serviceName, date, time, proName, reason }) {
  const isConfirmed = type === "confirmed";
  const subject = isConfirmed
    ? `✅ Votre rendez-vous ${serviceName || ""} est confirmé`
    : `❌ Votre rendez-vous ${serviceName || ""} a été annulé`;
  const html = isConfirmed
    ? buildReservationConfirmedHtml({ clientName, serviceName, date, time, proName })
    : buildReservationCancelledHtml({ clientName, serviceName, date, proName, reason });
  const text = isConfirmed
    ? `Votre rendez-vous ${serviceName || ""} le ${date || ""} à ${time || ""} a été confirmé par ${proName || ""}.`
    : `Votre rendez-vous ${serviceName || ""} le ${date || ""} a été annulé par ${proName || ""}.`;

  const resend = getResend();
  if (resend) {
    try {
      await resend.emails.send({ from: 'BeautyBook <onboarding@resend.dev>', to, subject, text, html });
      console.log('[Email] Reservation email sent via Resend to:', to);
      return { success: true };
    } catch (err) {
      console.warn('[Email] Resend reservation email failed:', err.message);
    }
  }

  const gmail = await getGmailTransporter();
  if (gmail) {
    try {
      await gmail.sendMail({ from: `"BeautyBook" <${process.env.GMAIL_USER}>`, to, subject, text, html });
      console.log('[Email] Reservation email sent via Gmail to:', to);
      return { success: true };
    } catch (err) {
      console.error('[Email] Gmail reservation email error:', err.message);
    }
  }

  console.log('[Email] Reservation email (console only):', type, '->', to);
  return { success: true, note: 'console_only' };
}

export { sendReservationEmail };
