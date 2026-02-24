import { PrismaClient } from '@prisma/client';

export async function sendMessage(
    prisma: PrismaClient,
    to: string,
    content: string,
    configId?: string
) {
    // 1. Get Messaging configuration
    let config;
    if (configId) {
        config = await prisma.messagingConfiguration.findUnique({
            where: { id: configId },
        });
    } else {
        config = await prisma.messagingConfiguration.findFirst({
            where: { isDefault: true },
        });

        if (!config) {
            config = await prisma.messagingConfiguration.findFirst();
        }
    }

    if (!config) {
        throw new Error('No Messaging configuration found');
    }

    // 2. Send message based on provider (Currently only BIRD supported)
    if (config.provider === 'BIRD') {
        const response = await fetch('https://api.bird.com/v2/messages', {
            method: 'POST',
            headers: {
                'Authorization': `AccessKey ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                receiver: {
                    contacts: [{ identifierValue: to }]
                },
                body: {
                    type: 'text',
                    text: { text: content }
                },
                channelId: config.channelId,
                workspaceId: config.workspaceId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Bird API Error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        return await response.json();
    }

    throw new Error(`Provider ${config.provider} not supported`);
}
