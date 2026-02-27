import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

export async function sendEmail(
    prisma: PrismaClient,
    to: string,
    subject: string,
    content: string,
    configId?: string,
    attachments?: { filename: string; path: string }[]
) {
    // 1. Get configuration
    let config: any = null;
    let isMailgun = false;

    if (configId) {
        config = await prisma.smtpConfiguration.findUnique({
            where: { id: configId },
        });

        if (!config) {
            const msgConfig = await prisma.messagingConfiguration.findUnique({
                where: { id: configId }
            });
            if (msgConfig && msgConfig.provider === 'MAILGUN') {
                config = msgConfig;
                isMailgun = true;
            }
        }
    } else {
        config = await prisma.smtpConfiguration.findFirst({
            where: { isDefault: true },
        });

        if (!config) {
            config = await prisma.smtpConfiguration.findFirst();
        }
    }

    if (!config) {
        throw new Error('No SMTP or Mailgun configuration found');
    }

    // 2. Mailgun API Flow
    if (isMailgun) {
        const domain = config.workspaceId; // workspaceId is used to store domain
        const apiKey = config.apiKey;
        const b64 = Buffer.from(`api:${apiKey}`).toString('base64');

        const formData = new FormData();
        formData.append('from', `Postmaster <postmaster@${domain}>`);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('html', content);
        formData.append('text', content.replace(/<[^>]*>?/gm, ''));

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                const fileBuf = fs.readFileSync(att.path);
                const blob = new Blob([fileBuf]);
                formData.append('attachment', blob, att.filename);
            }
        }

        const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${b64}`
            },
            body: formData
        });

        if (!response.ok) {
            const errData = await response.text();
            throw new Error(`Mailgun Error: ${errData}`);
        }

        return await response.json();
    }

    // 3. SMTP Create transporter
    const isGmail = config.host.includes('gmail.com') || config.host.includes('googlemail.com');

    const transporter = nodemailer.createTransport({
        service: isGmail ? 'gmail' : undefined,
        host: isGmail ? undefined : config.host,
        port: isGmail ? undefined : config.port,
        secure: config.security === 'SSL', // true for 465/SSL, false for 587/TLS or NONE
        auth: {
            user: config.user,
            pass: config.pass.trim(), // Ensure no whitespace
        },
        tls: {
            // Do not fail on invalid certs if using TLS/STARTTLS
            rejectUnauthorized: config.security !== 'NONE',
            // For port 587, some servers require minVersion: 'TLSv1.2'
            minVersion: 'TLSv1.2'
        },
        // Force STARTTLS if on port 587 and not using SSL
        requireTLS: config.port === 587 && config.security !== 'SSL',
        family: 4 // Force IPv4 to avoid ENETUNREACH on IPv6
    } as any);

    // 3. Send mail
    const info = await transporter.sendMail({
        from: config.from || config.user,
        to,
        subject,
        html: content,
        text: content.replace(/<[^>]*>?/gm, ''),
        attachments,
    });

    return info;
}
