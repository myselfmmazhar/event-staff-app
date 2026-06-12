import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getShiftReminderService } from '@/services/shift-reminder.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily cron — sweeps upcoming call times and sends both the 48-hour and
 * 2-hour shift reminders that are due. Invoked by the Vercel cron defined in
 * vercel.json (or any external scheduler) with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await getShiftReminderService(prisma).runDailySweep();
        console.log(
            `Shift reminder sweep: ${result.sent48h} x 48h, ${result.sent2h} x 2h (${result.checked} invitations checked)`
        );
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error('Shift reminder cron failed:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
