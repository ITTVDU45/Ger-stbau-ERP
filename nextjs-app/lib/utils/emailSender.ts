/**
 * E-Mail-Versand-Service
 * 
 * Verwendet Nodemailer für den Versand von:
 * - Angeboten
 * - Rechnungen
 * - Mahnungen
 * - System-Benachrichtigungen
 */

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: {
    filename: string
    content: Buffer
    contentType: string
  }[]
}

export class EmailSender {
  /**
   * Sendet eine E-Mail
   */
  static async senden(options: EmailOptions): Promise<boolean> {
    // TODO: Implementierung mit Nodemailer
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: parseInt(process.env.SMTP_PORT || '587'),
    //   secure: process.env.SMTP_SECURE === 'true',
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASSWORD
    //   }
    // })

    console.log('E-Mail versenden an:', options.to)
    console.log('Betreff:', options.subject)
    
    // Platzhalter - gibt true zurück als ob erfolgreich versendet
    return true
  }

  /**
   * Sendet ein Angebot per E-Mail
   */
  static async sendeAngebot(
    empfaengerEmail: string,
    angebotsnummer: string,
    pdfBuffer: Buffer
  ): Promise<boolean> {
    return await this.senden({
      to: empfaengerEmail,
      subject: `Angebot ${angebotsnummer}`,
      html: `
        <p>Sehr geehrte Damen und Herren,</p>
        <p>anbei erhalten Sie unser Angebot <strong>${angebotsnummer}</strong>.</p>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüßen</p>
      `,
      attachments: [{
        filename: `Angebot-${angebotsnummer}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    })
  }

  /**
   * Sendet eine Rechnung per E-Mail
   */
  static async sendeRechnung(
    empfaengerEmail: string,
    rechnungsnummer: string,
    pdfBuffer: Buffer
  ): Promise<boolean> {
    return await this.senden({
      to: empfaengerEmail,
      subject: `Rechnung ${rechnungsnummer}`,
      html: `
        <p>Sehr geehrte Damen und Herren,</p>
        <p>anbei erhalten Sie die Rechnung <strong>${rechnungsnummer}</strong>.</p>
        <p>Bitte überweisen Sie den Betrag innerhalb der angegebenen Frist.</p>
        <p>Mit freundlichen Grüßen</p>
      `,
      attachments: [{
        filename: `Rechnung-${rechnungsnummer}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    })
  }

  /**
   * Sendet eine Mahnung per E-Mail
   */
  static async sendeMahnung(
    empfaengerEmail: string,
    rechnungsnummer: string,
    mahnstufe: number,
    pdfBuffer: Buffer
  ): Promise<boolean> {
    const mahnTexte = [
      'Zahlungserinnerung',
      '1. Mahnung',
      '2. Mahnung',
      '3. Mahnung (Letzte Mahnung)'
    ]

    return await this.senden({
      to: empfaengerEmail,
      subject: `${mahnTexte[mahnstufe] || 'Mahnung'} - Rechnung ${rechnungsnummer}`,
      html: `
        <p>Sehr geehrte Damen und Herren,</p>
        <p>leider konnten wir bisher keinen Zahlungseingang für die Rechnung <strong>${rechnungsnummer}</strong> verzeichnen.</p>
        <p>Bitte begleichen Sie den offenen Betrag umgehend.</p>
        <p>Mit freundlichen Grüßen</p>
      `,
      attachments: [{
        filename: `Mahnung-${rechnungsnummer}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    })
  }
}

