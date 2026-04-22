import { PrismaClient, MessageType, MessageStatus, Prisma } from "@prisma/client";
import { QueryCommunicationLogsInput, QueryPortalLogsInput } from "@/lib/schemas/communication.schema";

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

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
    async getConversations(type: MessageType, contactType?: 'STAFF' | 'CLIENT' | 'ALL') {
        const where: any = { type, isTrashed: false };

        if (contactType === 'STAFF') {
            const staff = await this.prisma.staff.findMany({
                select: { email: true, phone: true }
            });
            const staffIdentifiers = [...staff.map(s => s.email), ...staff.map(s => s.phone)].filter(Boolean);
            where.recipient = { in: staffIdentifiers };
        } else if (contactType === 'CLIENT') {
            const clients = await this.prisma.client.findMany({
                select: { email: true, cellPhone: true }
            });
            const clientIdentifiers = [...clients.map(c => c.email), ...clients.map(c => c.cellPhone)].filter(Boolean);
            where.recipient = { in: clientIdentifiers };
        }

        return await (this.prisma as any).communicationLog.findMany({
            where,
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

    /**
     * Get all admin team members (SUPER_ADMIN, ADMIN, MANAGER) for portal messaging
     */
    async getAdminTeam() {
        return await this.prisma.user.findMany({
            where: {
                role: { in: ADMIN_ROLES as any },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                profilePhoto: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get portal conversations – distinct admin team members this user has exchanged messages with
     */
    async getPortalConversations(
        currentUserId: string,
        currentUserEmail: string,
        currentUserPhone: string | null,
        type: MessageType,
    ) {
        const adminTeam = await this.prisma.user.findMany({
            where: { role: { in: ADMIN_ROLES as any } },
            select: { id: true, name: true, email: true, phone: true },
        });

        const adminEmails = adminTeam.map(u => u.email).filter(Boolean) as string[];
        const adminPhones = adminTeam.map(u => u.phone).filter(Boolean) as string[];
        const adminIds = adminTeam.map(u => u.id);

        const adminIdentifiers = type === 'EMAIL' ? adminEmails : adminPhones;
        const myIdentifier = type === 'EMAIL' ? currentUserEmail : currentUserPhone;

        if (adminIdentifiers.length === 0) return [];

        const outbound = await (this.prisma as any).communicationLog.findMany({
            where: { senderId: currentUserId, recipient: { in: adminIdentifiers }, type, isTrashed: false },
            orderBy: { createdAt: 'desc' },
            distinct: ['recipient'],
        });

        const inbound = myIdentifier
            ? await (this.prisma as any).communicationLog.findMany({
                where: { senderId: { in: adminIds }, recipient: myIdentifier, type, isTrashed: false },
                orderBy: { createdAt: 'desc' },
                distinct: ['senderId'],
                include: { sender: { select: { id: true, name: true, email: true, phone: true } } },
            })
            : [];

        const seen = new Set<string>();
        const conversations: any[] = [];

        for (const log of outbound) {
            if (!seen.has(log.recipient)) {
                seen.add(log.recipient);
                const admin = adminTeam.find(a =>
                    type === 'EMAIL' ? a.email === log.recipient : a.phone === log.recipient,
                );
                conversations.push({ ...log, adminName: admin?.name ?? log.recipient, adminId: admin?.id });
            }
        }

        for (const log of inbound) {
            const adminIdentifier = type === 'EMAIL' ? log.sender?.email : log.sender?.phone;
            if (adminIdentifier && !seen.has(adminIdentifier)) {
                seen.add(adminIdentifier);
                conversations.push({
                    ...log,
                    recipient: adminIdentifier,
                    adminName: log.sender?.name ?? adminIdentifier,
                    adminId: log.senderId,
                });
            }
        }

        conversations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return conversations;
    }

    /**
     * Get bidirectional chat history between current user and one admin team member
     */
    async getPortalChatHistory(
        currentUserId: string,
        currentUserEmail: string,
        currentUserPhone: string | null,
        recipient: string,
        type: MessageType,
    ) {
        const adminWhere = type === 'EMAIL' ? { email: recipient } : { phone: recipient };

        const admin = await this.prisma.user.findFirst({
            where: { ...adminWhere, role: { in: ADMIN_ROLES as any } },
            select: { id: true },
        });

        const myIdentifier = type === 'EMAIL'
            ? currentUserEmail
            : (currentUserPhone ?? currentUserEmail);

        const orClauses: any[] = [{ senderId: currentUserId, recipient, type, isTrashed: false }];
        if (admin) {
            orClauses.push({ senderId: admin.id, recipient: myIdentifier, type, isTrashed: false });
        }

        return await (this.prisma as any).communicationLog.findMany({
            where: { OR: orClauses },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true, email: true, profilePhoto: true } },
            },
        });
    }

    /**
     * Get portal logs scoped to current user's outbound messages
     */
    async getPortalLogs(currentUserId: string, query: QueryPortalLogsInput) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { senderId: currentUserId, isTrashed: query.showTrashed || false };

        if (query.type) where.type = query.type;
        if (query.status) where.status = query.status;
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
                include: { sender: { select: { name: true, email: true } } },
            }),
            (this.prisma as any).communicationLog.count({ where }),
        ]);

        return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async trashPortalLogs(ids: string[], currentUserId: string) {
        return await (this.prisma as any).communicationLog.updateMany({
            where: { id: { in: ids }, senderId: currentUserId },
            data: { isTrashed: true },
        });
    }

    async restorePortalLogs(ids: string[], currentUserId: string) {
        return await (this.prisma as any).communicationLog.updateMany({
            where: { id: { in: ids }, senderId: currentUserId },
            data: { isTrashed: false },
        });
    }

    async deletePortalLogsPermanently(ids: string[], currentUserId: string) {
        return await (this.prisma as any).communicationLog.deleteMany({
            where: { id: { in: ids }, senderId: currentUserId },
        });
    }
}
