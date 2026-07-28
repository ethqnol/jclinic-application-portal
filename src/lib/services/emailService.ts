import { connect } from 'cloudflare:sockets';

export class EmailService {
  private static async sendRawEmail(
    gmailAppPassword: string,
    recipientEmail: string,
    subject: string,
    textContent: string,
    originDomain: string
  ) {
    if (!gmailAppPassword || !recipientEmail) return;

    const senderEmail = 'mitjclinic.camp.rec.letters@gmail.com';
    const cleanPassword = gmailAppPassword.replace(/\s+/g, '');
    const messageId = `<msg.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@${originDomain}>`;
    const dateStr = new Date().toUTCString();

    const mimeMessage = [
      `Date: ${dateStr}`,
      `From: "MIT Jameel Clinic Bootcamp" <${senderEmail}>`,
      `Reply-To: "MIT Jameel Clinic Info" <jclinic-info@mit.edu>`,
      `To: <${recipientEmail}>`,
      `Message-ID: ${messageId}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      `X-Auto-Response-Suppress: All`,
      `Auto-Submitted: auto-generated`,
      ``,
      textContent.trim(),
      ``
    ].join('\r\n');

    try {
      const socket = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on' });
      const reader = socket.readable.getReader();
      const writer = socket.writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      async function readResponse(): Promise<string> {
        const { value, done } = await reader.read();
        if (done) return '';
        return decoder.decode(value);
      }

      async function sendCmd(cmd: string): Promise<string> {
        await writer.write(encoder.encode(cmd + '\r\n'));
        return await readResponse();
      }

      await readResponse(); // Banner
      await sendCmd('EHLO jclinic.mit.edu');
      await sendCmd('AUTH LOGIN');
      await sendCmd(btoa(senderEmail));
      await sendCmd(btoa(cleanPassword));
      await sendCmd(`MAIL FROM:<${senderEmail}>`);
      await sendCmd(`RCPT TO:<${recipientEmail}>`);
      await sendCmd('DATA');
      await sendCmd(mimeMessage + '\r\n.');
      await sendCmd('QUIT');

      await writer.close();
      await reader.cancel();

      console.log(`Successfully delivered email to ${recipientEmail}`);
    } catch (err) {
      console.error(`Email dispatch error to ${recipientEmail}:`, err);
    }
  }

  static async sendRecommendationRequest(
    gmailAppPassword: string,
    params: {
      recommenderName: string;
      recommenderEmail: string;
      applicantName: string;
      token: string;
      pin: string;
      origin: string;
    }
  ) {
    const portalUrl = `${params.origin}/recommend/${params.token}`;
    const domain = (params.origin.replace(/^https?:\/\//, '') || 'mit.edu').split(':')[0];

    const textContent = `
Dear ${params.recommenderName},

${params.applicantName} is applying to the MIT Jameel Clinic Summer Bootcamp and has requested a recommendation letter from you.

You may submit your letter directly on the admissions portal using the link and verification code below:

Verification Code: ${params.pin}
Portal Link: ${portalUrl}

If you prefer, you may also email a PDF copy of your letter directly to jclinic-info@mit.edu with ${params.applicantName} in the subject line.

Thank you for your time and for supporting ${params.applicantName}'s application to MIT.

Sincerely,
MIT Jameel Clinic Admissions Committee
Massachusetts Institute of Technology
jclinic-info@mit.edu
`;

    await this.sendRawEmail(
      gmailAppPassword,
      params.recommenderEmail,
      `Recommendation Request for ${params.applicantName} - MIT Jameel Clinic`,
      textContent,
      domain
    );
  }

  static async sendApplicationConfirmation(
    gmailAppPassword: string,
    params: {
      applicantName: string;
      studentEmail: string;
      parentEmail?: string;
      parentName?: string;
      recommenderName: string;
      recommenderEmail: string;
      origin: string;
    }
  ) {
    const domain = (params.origin.replace(/^https?:\/\//, '') || 'mit.edu').split(':')[0];

    const confirmationText = `
Dear ${params.applicantName}${params.parentName ? ' and ' + params.parentName : ''},

Congratulations! Your application for the MIT Jameel Clinic Summer Bootcamp has been successfully submitted and received by our admissions committee.

Application Summary:
- Applicant: ${params.applicantName}
- Status: Application Submitted & Under Review
- Listed Recommender: ${params.recommenderName} (${params.recommenderEmail})

Next Steps:
1. Recommendation Letter: An automated request has been emailed to ${params.recommenderName}. If your recommender prefers, they may also email a PDF copy of their recommendation letter directly to jclinic-info@mit.edu with your full name in the subject line.
2. Admissions Review: The committee will review all submitted materials and notify applicants regarding decisions.

Thank you for applying to the MIT Jameel Clinic Summer Bootcamp!

Sincerely,
MIT Jameel Clinic Admissions Committee
Massachusetts Institute of Technology
jclinic-info@mit.edu
`;

    const subject = `Application Submitted - MIT Jameel Clinic Summer Bootcamp`;

    // Send confirmation to Student
    if (params.studentEmail) {
      await this.sendRawEmail(gmailAppPassword, params.studentEmail, subject, confirmationText, domain);
    }

    // Send confirmation to Parent if provided
    if (params.parentEmail && params.parentEmail.toLowerCase().trim() !== params.studentEmail.toLowerCase().trim()) {
      await this.sendRawEmail(gmailAppPassword, params.parentEmail, subject, confirmationText, domain);
    }
  }
}
