const nodemailer = require('nodemailer');

const getEnv = (key) => (process.env[key] || '').trim();

const postJson = async (url, headers, body) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        const text = await response.text();
        let data = {};

        try {
            data = text ? JSON.parse(text) : {};
        } catch (err) {
            data = { raw: text };
        }

        if (!response.ok) {
            const message = data.message || data.error || data.errors?.[0]?.message || text || response.statusText;
            throw new Error(`${response.status} ${message}`);
        }

        return data;
    } finally {
        clearTimeout(timeout);
    }
};

const getDefaultFrom = () => {
    let configuredFrom = getEnv('EMAIL_FROM');
    if (configuredFrom && !configuredFrom.includes('onboarding@resend.dev')) return configuredFrom;

    let smtpUser = getEnv('SMTP_USER');
    if (smtpUser && !smtpUser.includes('onboarding@resend.dev')) return `"FreelanceFlow" <${smtpUser}>`;

    return '"FreelanceFlow" <velr012006@gmail.com>';
};

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
        from: getDefaultFrom()
    };
};

const sendWithBrevo = async (options) => {
    const apiKey = getEnv('BREVO_API_KEY');
    if (!apiKey) return null;

    const fromAddress = parseEmailAddress(getDefaultFrom());

    const data = await postJson(
        'https://api.brevo.com/v3/smtp/email',
        {
            'api-key': apiKey,
            'accept': 'application/json'
        },
        {
            sender: {
                name: fromAddress.name || 'FreelanceFlow',
                email: fromAddress.email
            },
            to: [{ email: options.to }],
            subject: options.subject,
            textContent: options.text || '',
            htmlContent: options.html || options.text || ''
        }
    );

    console.log(`Email sent with Brevo to ${options.to} | Id: ${data.messageId || 'unknown'}`);
    return { provider: 'brevo', messageId: data.messageId || null };
};

const sendWithResend = async (options) => {
    const apiKey = getEnv('RESEND_API_KEY');
    if (!apiKey) return null;

    const data = await postJson(
        'https://api.resend.com/emails',
        { Authorization: `Bearer ${apiKey}` },
        {
            from: getDefaultFrom(),
            to: [options.to],
            subject: options.subject,
            text: options.text,
            html: options.html
        }
    );

    console.log(`Email sent with Resend to ${options.to} | Id: ${data.id || 'unknown'}`);
    return { provider: 'resend', messageId: data.id || null };
};

const sendWithSendGrid = async (options) => {
    const apiKey = getEnv('SENDGRID_API_KEY');
    if (!apiKey) return null;

    await postJson(
        'https://api.sendgrid.com/v3/mail/send',
        { Authorization: `Bearer ${apiKey}` },
        {
            personalizations: [{ to: [{ email: options.to }] }],
            from: parseEmailAddress(getDefaultFrom()),
            subject: options.subject,
            content: [
                { type: 'text/plain', value: options.text || '' },
                { type: 'text/html', value: options.html || options.text || '' }
            ]
        }
    );

    console.log(`Email sent with SendGrid to ${options.to}`);
    return { provider: 'sendgrid', messageId: null };
};

const parseEmailAddress = (value) => {
    const match = value.match(/^(.*)<(.+)>$/);
    if (!match) return { email: value };

    const name = match[1].replace(/"/g, '').trim();
    const email = match[2].trim();

    return name ? { email, name } : { email };
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
        const providerResult = await sendWithBrevo(options) || await sendWithResend(options) || await sendWithSendGrid(options);

        if (providerResult) {
            return { previewUrl, ...providerResult };
        }

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
        return { previewUrl, error: error.message };
        console.log('─────────────────────────────────────────────────────\n');
    }

    return { previewUrl };
};

module.exports = sendEmail;
