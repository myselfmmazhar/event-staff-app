import { PrismaClient } from '@prisma/client';

export async function sendMessage(
    prisma: PrismaClient,
    to: string,
    content: string,
    configId?: string
) {
    // 1. Get Messaging configuration
    let config;
    console.log('[sendMessage] configId:', configId);

    if (configId) {
        config = await (prisma as any).messagingConfiguration.findUnique({
            where: { id: configId },
        });
        console.log('[sendMessage] found by configId:', !!config);
    } else {
        config = await (prisma as any).messagingConfiguration.findFirst({
            where: { isDefault: true },
        });
        console.log('[sendMessage] found default:', !!config);

        if (!config) {
            config = await (prisma as any).messagingConfiguration.findFirst();
            console.log('[sendMessage] found first available:', !!config);
        }
    }

    if (!config) {
        const allConfigs = await (prisma as any).messagingConfiguration.findMany();
        console.log('[sendMessage] Total configs in DB:', allConfigs.length);
        throw new Error(`No Messaging configuration found for ID "${configId || 'default'}". (Total configs in DB: ${allConfigs.length})`);
    }

    // 2. Send message based on provider (Currently only BIRD supported)
    if (config.provider === 'BIRD') {
        const workspaceId = config.workspaceId as string | undefined;
        const channelId = config.channelId as string | undefined;

        if (!workspaceId || !channelId) {
            throw new Error(
                'Messaging configuration is missing Bird workspaceId/channelId. Please update your Messaging (Bird) settings.'
            );
        }

        const endpoint = `https://api.bird.com/workspaces/${encodeURIComponent(workspaceId)}/channels/${encodeURIComponent(channelId)}/messages`;

        const response = await fetch(endpoint, {
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
                }
            }),
        });

        if (!response.ok) {
            const raw = await response.text().catch(() => '');
            let parsed: unknown = undefined;
            try {
                parsed = raw ? JSON.parse(raw) : undefined;
            } catch {
                // ignore
            }

            throw new Error(
                `Bird API Error: ${response.status} ${parsed ? JSON.stringify(parsed) : raw || '(no response body)'}`
            );
        }

        return await response.json();
    }

    throw new Error(`Provider ${config.provider} not supported`);
}
