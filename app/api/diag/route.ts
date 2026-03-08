
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET() {
    try {
        const messagingConfigs = await (prisma as any).messagingConfiguration.findMany();
        const smtpConfigs = await prisma.smtpConfiguration.findMany();

        return NextResponse.json({
            messagingConfigsCount: messagingConfigs.length,
            messagingConfigs: messagingConfigs.map((c: any) => ({
                id: c.id,
                name: c.name,
                isDefault: c.isDefault,
                provider: c.provider,
                hasApiKey: !!c.apiKey,
                hasWorkspaceId: !!c.workspaceId,
                hasChannelId: !!c.channelId,
                workspaceIdPreview: c.workspaceId ? c.workspaceId.substring(0, 4) + '...' : null,
                channelIdPreview: c.channelId ? c.channelId.substring(0, 4) + '...' : null
            })),
            smtpConfigsCount: smtpConfigs.length,
            smtpConfigs: smtpConfigs.map((c: any) => ({
                id: c.id,
                name: c.name,
                isDefault: c.isDefault
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
