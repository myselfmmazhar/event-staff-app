import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

export async function sendEmail(
    prisma: PrismaClient,
    to: string,
    subject: string,
    content: string,
    configId?: string
) {
    // 1. Get SMTP configuration
    let config;
    if (configId) {
        config = await prisma.smtpConfiguration.findUnique({
            where: { id: configId },
        });
    } else {
        config = await prisma.smtpConfiguration.findFirst({
            where: { isDefault: true },
        });

        if (!config) {
            config = await prisma.smtpConfiguration.findFirst();
        }
    }

    if (!config) {
        throw new Error('No SMTP configuration found');
    }

    // 2. Create transporter
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
        requireTLS: config.port === 587 && config.security !== 'SSL'
    } as any);

    // 3. Send mail
    const info = await transporter.sendMail({
        from: config.from || config.user,
        to,
        subject,
        html: content,
        text: content.replace(/<[^>]*>?/gm, ''),
    });

    return info;
}
