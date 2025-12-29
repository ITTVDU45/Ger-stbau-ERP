const nodemailer = require('nodemailer')
import { debug } from '@/lib/utils/debug'

// Email-Konfiguration aus Environment-Variablen
// Unterstützt beide Formate: EMAIL_* und SMTP_*
const SMTP_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.office365.com'
const SMTP_PORT = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@rechtly.de'
const SMTP_PASSWORD = process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || ''
const SMTP_SECURE = process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true'
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Rechtly'
const SMTP_FROM_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'noreply@rechtly.de'

// Transporter erstellen
const createTransporter = (): any | null => {
  // Falls keine SMTP-Konfiguration vorhanden, simuliere Email
  if (!SMTP_PASSWORD) {
    debug.warn('[EmailService] Keine SMTP-Konfiguration gefunden. Emails werden nur simuliert.')
    return null
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE || SMTP_PORT === 465, // true für SSL/Port 465, false für TLS/Port 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false // Akzeptiere selbstsignierte Zertifikate (für Development)
    }
  })
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Email versenden
 * @param options Email-Optionen
 * @returns Promise mit Erfolg/Fehler
 */
export async function sendEmail(options: EmailOptions): Promise<{ erfolg: boolean; nachricht?: string }> {
  try {
    const transporter = createTransporter()

    // Falls kein Transporter (keine Konfiguration), nur simulieren
    if (!transporter) {
      debug.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL (SIMULATION - Keine SMTP-Konfiguration)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Von: ${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>
An: ${options.to}
Betreff: ${options.subject}

${options.text || 'HTML-Inhalt vorhanden'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `)
      return { erfolg: true, nachricht: 'Email simuliert (keine SMTP-Konfiguration)' }
    }

    // Echte Email versenden
    const info = await transporter.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    debug.log(`[EmailService] Email erfolgreich versendet an ${options.to}. Message ID: ${info.messageId}`)
    
    return { 
      erfolg: true, 
      nachricht: `Email erfolgreich versendet. Message ID: ${info.messageId}` 
    }
  } catch (error: any) {
    debug.error('[EmailService] Fehler beim Email-Versand:', error)
    return { 
      erfolg: false, 
      nachricht: error.message || 'Fehler beim Email-Versand' 
    }
  }
}

/**
 * Verifizierungs-Email senden
 */
export async function sendVerificationEmail(
  to: string,
  vorname: string,
  nachname: string,
  verifizierungsLink: string
): Promise<{ erfolg: boolean; nachricht?: string }> {
  const subject = 'Account-Verifizierung erforderlich - Rechtly'
  
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account-Verifizierung</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1b3a4b 0%, #2d5a6e 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Rechtly</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Gutachter-Plattform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1b3a4b; margin: 0 0 20px 0; font-size: 24px;">Account-Verifizierung</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hallo ${vorname} ${nachname},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Ihr Gutachter-Account bei Rechtly benötigt eine Verifizierung. 
                Bitte klicken Sie auf den folgenden Button, um Ihren Account zu bestätigen:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifizierungsLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #a3e635 0%, #84cc16 100%); 
                              color: #1b3a4b; padding: 16px 40px; text-decoration: none; border-radius: 8px; 
                              font-weight: 600; font-size: 16px;">
                      Account jetzt verifizieren
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                ${verifizierungsLink}
              </p>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>⏰ Wichtig:</strong> Dieser Link ist 7 Tage gültig. Nach Ablauf müssen Sie einen neuen Verifizierungslink anfordern.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Falls Sie diese Email nicht angefordert haben, können Sie sie ignorieren.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                Mit freundlichen Grüßen<br>
                <strong>Ihr Rechtly-Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                Diese Email wurde automatisch generiert. Bitte antworten Sie nicht auf diese Email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
Hallo ${vorname} ${nachname},

Ihr Gutachter-Account bei Rechtly benötigt eine Verifizierung.
Bitte klicken Sie auf folgenden Link, um Ihren Account zu bestätigen:

${verifizierungsLink}

Dieser Link ist 7 Tage gültig.

Falls Sie diese Email nicht angefordert haben, können Sie sie ignorieren.

Mit freundlichen Grüßen
Ihr Rechtly-Team
  `

  return sendEmail({ to, subject, html, text })
}

/**
 * Aktivierungs-Email senden (für neue Nutzer-Einladung)
 */
export async function sendActivationEmail(
  to: string,
  vorname: string,
  nachname: string,
  gutachterNummer: string,
  firma: string | undefined,
  aktivierungsLink: string
): Promise<{ erfolg: boolean; nachricht?: string }> {
  const subject = 'Einladung zur Rechtly Gutachter-Plattform'
  
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei Rechtly</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #a3e635 0%, #84cc16 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #1b3a4b; margin: 0; font-size: 28px; font-weight: 600;">Willkommen bei Rechtly!</h1>
              <p style="color: rgba(27, 58, 75, 0.8); margin: 10px 0 0 0; font-size: 16px;">Ihre Gutachter-Plattform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1b3a4b; margin: 0 0 20px 0; font-size: 24px;">Sie wurden eingeladen!</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hallo ${vorname} ${nachname},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Sie wurden zur Rechtly Gutachter-Plattform eingeladen! Wir freuen uns, Sie in unserem Team begrüßen zu dürfen.
              </p>

              <!-- Account-Daten Box -->
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #1b3a4b; margin: 0 0 15px 0; font-size: 18px;">Ihre Zugangsdaten:</h3>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;"><strong>Name:</strong></td>
                    <td style="color: #374151; font-size: 14px;">${vorname} ${nachname}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;"><strong>E-Mail:</strong></td>
                    <td style="color: #374151; font-size: 14px;">${to}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;"><strong>Gutachter-Nr.:</strong></td>
                    <td style="color: #374151; font-size: 14px; font-weight: 600;">${gutachterNummer}</td>
                  </tr>
                  ${firma ? `
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;"><strong>Firma:</strong></td>
                    <td style="color: #374151; font-size: 14px;">${firma}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Klicken Sie auf den folgenden Button, um Ihren Account zu aktivieren:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${aktivierungsLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #a3e635 0%, #84cc16 100%); 
                              color: #1b3a4b; padding: 16px 40px; text-decoration: none; border-radius: 8px; 
                              font-weight: 600; font-size: 16px;">
                      Account jetzt aktivieren
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                ${aktivierungsLink}
              </p>

              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>ℹ️ Hinweis:</strong> Nach der Aktivierung können Sie sich einloggen und alle Funktionen der Plattform nutzen. Dieser Link ist 30 Tage gültig.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Bei Fragen wenden Sie sich bitte an unseren Support.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                Mit freundlichen Grüßen<br>
                <strong>Ihr Rechtly-Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                Diese Email wurde automatisch generiert. Bitte antworten Sie nicht auf diese Email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
Hallo ${vorname} ${nachname},

Sie wurden zur Rechtly Gutachter-Plattform eingeladen!

Ihre Zugangsdaten:
• Name: ${vorname} ${nachname}
• E-Mail: ${to}
• Gutachter-Nummer: ${gutachterNummer}
${firma ? `• Firma: ${firma}` : ''}

Klicken Sie auf folgenden Link, um Ihren Account zu aktivieren:

${aktivierungsLink}

Nach der Aktivierung können Sie sich einloggen und alle Funktionen nutzen.
Dieser Link ist 30 Tage gültig.

Bei Fragen wenden Sie sich bitte an den Support.

Mit freundlichen Grüßen
Ihr Rechtly-Team
  `

  return sendEmail({ to, subject, html, text })
}

/**
 * Einladungs-Email für Auth-System senden
 */
export async function sendInviteEmail(
  to: string,
  firstName: string,
  inviteLink: string
): Promise<void> {
  const subject = 'Einladung zum Gerüstbau ERP System'
  
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Gerüstbau ERP</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Willkommen im Team</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px;">Willkommen, ${firstName}!</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Sie wurden zum Gerüstbau ERP System eingeladen.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bitte klicken Sie auf den folgenden Link, um Ihr Passwort zu setzen und Ihr Konto zu aktivieren:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
                              color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; 
                              font-weight: 600; font-size: 16px;">
                      Passwort festlegen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                ${inviteLink}
              </p>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>⏰ Wichtig:</strong> Dieser Link ist 48 Stunden gültig. Falls Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                Mit freundlichen Grüßen<br>
                <strong>Ihr Gerüstbau ERP Team</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
Willkommen, ${firstName}!

Sie wurden zum Gerüstbau ERP System eingeladen.

Bitte verwenden Sie den folgenden Link, um Ihr Passwort zu setzen:
${inviteLink}

Dieser Link ist 48 Stunden gültig.

Falls Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.

Mit freundlichen Grüßen
Ihr Gerüstbau ERP Team
  `

  const result = await sendEmail({ to, subject, html, text })
  
  if (!result.erfolg) {
    throw new Error(`Failed to send invite email: ${result.nachricht}`)
  }
}

