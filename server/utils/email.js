const nodemailer = require('nodemailer');

const getEnv = (key) => (process.env[key] || '').trim();

const getSmtpConfig = () => {
    const host = getEnv('SMTP_HOST');
    const user = getEnv('SMTP_USER');
    const rawPass = getEnv('SMTP_PASS');

    if (!host || !user || !rawPass) {
        return null;
    }

    const port = parseInt(getEnv('SMTP_PORT') || '587', 10);
    const isGmail = host.toLowerCase().includes('gmail.com');
    const pass = isGmail ? rawPass.replace(/\s+/g, '') : rawPass;

    return {
        host,
        port,
        secure: getEnv('SMTP_SECURE') ? getEnv('SMTP_SECURE') === 'true' : port === 465,
        auth: { user, pass },
        from: getEnv('EMAIL_FROM') || `"FreelanceFlow" <${user}>`
    };
};

/**
 * sendEmail - Sends an email via SMTP or Ethereal (dev/test).
 *
 * Returns an object: { previewUrl }
 * - previewUrl is set when Ethereal is used (null for real SMTP sends).
 */
const sendEmail = async (options) => {
    let previewUrl = null;

    try {
        const smtpConfig = getSmtpConfig();

        if (smtpConfig) {
            // ─── Production: use configured SMTP ───────────────────────────
            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.secure,
                auth: smtpConfig.auth
            });

            const info = await transporter.sendMail({
                from: smtpConfig.from,
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
