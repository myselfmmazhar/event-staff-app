import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { randomInt } from "crypto";

const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

export class OtpService {
    constructor(private prisma: PrismaClient) {}

    private generateCode(): string {
        return randomInt(100000, 999999).toString();
    }

    async generateAndStore(userId: string): Promise<string> {
        const code = this.generateCode();
        const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await this.prisma.user.update({
            where: { id: userId },
            data: { otpCode: code, otpExpiresAt },
        });

        return code;
    }

    async verify(userId: string, code: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { otpCode: true, otpExpiresAt: true },
        });

        if (!user?.otpCode || !user.otpExpiresAt) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "No OTP found. Please request a new one." });
        }

        if (new Date() > user.otpExpiresAt) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "OTP has expired. Please request a new one." });
        }

        if (user.otpCode !== code) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid OTP. Please check and try again." });
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                otpCode: null,
                otpExpiresAt: null,
                emailVerified: true,
            },
        });
    }
}
