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
        // Fallback to environment variables
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            config = {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
                from: process.env.EMAIL_FROM || 'noreply@example.com',
                security: process.env.SMTP_SECURE === 'true' ? 'SSL' : 'TLS'
            };
        } else if (process.env.RESEND_API_KEY) {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
            const { data, error } = await resend.emails.send({
                from,
                to,
                subject,
                html: content,
                attachments: attachments?.map(a => ({ filename: a.filename, path: a.path }))
            });

            if (error) throw new Error(`Resend Error: ${error.message}`);
            return data;
        } else {
            throw new Error('No SMTP or Mailgun configuration found in database OR environment variables');
        }
    }

    // 2. Mailgun API Flow
    if (isMailgun) {
        const domain = config.workspaceId; // workspaceId is used to store domain
        const apiKey = config.apiKey;
        const b64 = Buffer.from(`api:${apiKey}`).toString('base64');

        const formData = new FormData();
        const fromAddress = config.from || `Postmaster <postmaster@${domain}>`;
        formData.append('from', fromAddress);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('html', content);
        formData.append('text', content.replace(/<[^>]*>?/gm, ''));

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                let fileBuf: Buffer;
                if (att.path.startsWith('http')) {
                    const res = await fetch(att.path);
                    if (!res.ok) throw new Error(`Failed to fetch attachment from ${att.path}`);
                    fileBuf = Buffer.from(await res.arrayBuffer());
                } else {
                    fileBuf = fs.readFileSync(att.path);
                }
                const blob = new Blob([new Uint8Array(fileBuf)]);
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

    // Prepare attachments for Nodemailer (handle URLs)
    const nodemailerAttachments = attachments ? await Promise.all(attachments.map(async a => {
        if (a.path.startsWith('http')) {
            return { filename: a.filename, path: a.path }; // Nodemailer supports URLs directly
        }
        return { filename: a.filename, path: a.path };
    })) : undefined;

    // 3. Send mail
    const info = await transporter.sendMail({
        from: config.from || config.user,
        to,
        subject,
        html: content,
        text: content.replace(/<[^>]*>?/gm, ''),
        attachments: nodemailerAttachments,
    });

    return info;
}
