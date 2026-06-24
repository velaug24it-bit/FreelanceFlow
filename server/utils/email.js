const nodemailer = require('nodemailer');

/**
 * sendEmail - Sends an email via SMTP or Ethereal (dev/test).
 *
 * Returns an object: { previewUrl }
 * - previewUrl is set when Ethereal is used (null for real SMTP sends).
 */
const sendEmail = async (options) => {
    let previewUrl = null;

    try {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            // ─── Production: use configured SMTP ───────────────────────────
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const info = await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"FreelanceFlow" <noreply@freelanceflow.com>',
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html
            });

            console.log(`📨 Email sent successfully to ${options.to} | MessageId: ${info.messageId}`);
        } else {
            // ─── Development: use Ethereal auto-account ─────────────────────
            // Creates a free disposable test account on the fly.
            const testAccount = await nodemailer.createTestAccount();

            const transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });

            const info = await transporter.sendMail({
                from: '"FreelanceFlow" <noreply@freelanceflow.com>',
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html
            });

            previewUrl = nodemailer.getTestMessageUrl(info);

            console.log('\n✉️  [DEV MODE – ETHEREAL EMAIL] ✉️');
            console.log(`   To:      ${options.to}`);
            console.log(`   Subject: ${options.subject}`);
            console.log(`   🔗 Preview URL (open in browser): ${previewUrl}`);
            console.log('─────────────────────────────────────────────────────\n');
        }
    } catch (error) {
        // Fallback: log to console so nothing is completely lost.
        console.error('❌ Error sending email:', error.message);
        console.log('\n✉️  [EMAIL ERROR – CONSOLE FALLBACK] ✉️');
        console.log(`   To:      ${options.to}`);
        console.log(`   Subject: ${options.subject}`);
        console.log('─────────────────────────────────────────────────────');
        console.log(options.text);
        console.log('─────────────────────────────────────────────────────\n');
    }

    return { previewUrl };
};

module.exports = sendEmail;
