import { prisma } from "@/lib/server/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const configs = await (prisma as any).messagingConfiguration.findMany();
        const smtp = await (prisma as any).smtpConfiguration.findMany();
        const env = {
            NODE_ENV: process.env.NODE_ENV,
            HAS_DB_URL: !!process.env.DATABASE_URL,
        };

        return NextResponse.json({
            messaging: configs,
            smtp: smtp,
            env: env
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
