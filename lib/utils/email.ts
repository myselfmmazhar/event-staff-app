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
    // Mailgun-only resolver. Other providers (SMTP, Resend) are intentionally not supported here.
    let config: any = null;

    if (configId) {
        config = await prisma.messagingConfiguration.findUnique({
            where: { id: configId }
        });
        if (config && config.provider !== 'MAILGUN') {
            throw new Error(`Configuration ${configId} is not a Mailgun provider; only Mailgun is supported.`);
        }
    }

    if (!config) {
        config = await prisma.messagingConfiguration.findFirst({
            where: { provider: 'MAILGUN', isDefault: true }
        });
    }

    if (!config) {
        config = await prisma.messagingConfiguration.findFirst({
            where: { provider: 'MAILGUN' }
        });
    }

    if (!config) {
        throw new Error('No Mailgun configuration found. Add one in Settings → Communication.');
    }

    const domain = config.workspaceId; // workspaceId is used to store the Mailgun domain
    if (!domain) {
        throw new Error('Mailgun configuration is missing the domain (workspaceId).');
    }
    if (!config.apiKey) {
        throw new Error('Mailgun configuration is missing the API key.');
    }

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
