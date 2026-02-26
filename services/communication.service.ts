import { PrismaClient, MessageType, MessageStatus, Prisma } from "@prisma/client";
import { QueryCommunicationLogsInput } from "@/lib/schemas/communication.schema";

export class CommunicationService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Log a communication message
     */
    async logMessage(data: {
        type: MessageType;
        recipient: string;
        subject?: string;
        content: string;
        status: MessageStatus;
        error?: string;
        senderId: string;
        fileLinks?: { name: string; url: string; size?: number; type?: string }[];
    }) {
        return await (this.prisma as any).communicationLog.create({
            data: {
                type: data.type,
                recipient: data.recipient,
                subject: data.subject,
                content: data.content,
                status: data.status,
                error: data.error,
                senderId: data.senderId,
                fileLinks: data.fileLinks ? JSON.parse(JSON.stringify(data.fileLinks)) : undefined,
            },
        });
    }

    /**
     * Get communication logs with pagination and filters
     */
    async getLogs(query: QueryCommunicationLogsInput) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {
            isTrashed: query.showTrashed || false
        };

        if (query.type) {
            where.type = query.type;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.search) {
            where.OR = [
                { recipient: { contains: query.search, mode: 'insensitive' } } as any,
                { subject: { contains: query.search, mode: 'insensitive' } } as any,
                { content: { contains: query.search, mode: 'insensitive' } } as any,
            ];
        }

        const [logs, total] = await Promise.all([
            (this.prisma as any).communicationLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    sender: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            (this.prisma as any).communicationLog.count({ where }),
        ]);

        return {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get distinct conversation recipients (for Messaging list)
     */
    async getConversations(type: MessageType) {
        return await (this.prisma as any).communicationLog.findMany({
            where: { type, isTrashed: false },
            orderBy: { createdAt: 'desc' },
            distinct: ['recipient'],
            include: {
                sender: {
                    select: {
                        name: true,
                    }
                }
            }
        });
    }

    async getChatHistory(recipient: string, type: MessageType) {
        return await (this.prisma as any).communicationLog.findMany({
            where: {
                recipient,
                isTrashed: false,
                type
            },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: {
                        name: true,
                        email: true,
                        profilePhoto: true
                    }
                }
            }
        });
    }

    /**
     * Move logs to trash
     */
    async trashLogs(ids: string[]) {
        return await (this.prisma as any).communicationLog.updateMany({
            where: { id: { in: ids } },
            data: { isTrashed: true }
        });
    }

    /**
     * Restore logs from trash
     */
    async restoreLogs(ids: string[]) {
        return await (this.prisma as any).communicationLog.updateMany({
            where: { id: { in: ids } },
            data: { isTrashed: false }
        });
    }

    /**
     * Permanently delete logs
     */
    async deleteLogsPermanently(ids: string[]) {
        return await (this.prisma as any).communicationLog.deleteMany({
            where: { id: { in: ids } }
        });
    }
}
