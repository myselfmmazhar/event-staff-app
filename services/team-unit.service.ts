import { PrismaClient } from '@prisma/client';
import { CreateTeamUnitInput, UpdateTeamUnitInput } from '@/lib/schemas/team-unit.schema';
import { nanoid } from 'nanoid';

const ACTIVITY_INCLUDE = {
    performer: { select: { id: true, firstName: true, lastName: true, name: true } },
} as const;

export class TeamUnitService {
    constructor(private prisma: PrismaClient) {}

    async create(input: CreateTeamUnitInput, staffId: string, userId: string) {
        const unit = await this.prisma.teamUnit.create({
            data: {
                unitId: `TU-${nanoid(8).toUpperCase()}`,
                unitName: input.unitName,
                primaryContact: input.primaryContact,
                serviceId: input.serviceId ?? null,
                status: input.status,
                availability: input.availability,
                capacityNotes: input.capacityNotes,
                internalNotes: input.internalNotes,
                staffId,
                createdBy: userId,
            },
            include: { service: { select: { id: true, title: true } } },
        });

        await this.prisma.teamUnitActivity.create({
            data: { teamUnitId: unit.id, action: 'CREATED', performedBy: userId },
        });

        return unit;
    }

    async findAllForStaff(staffId: string) {
        return this.prisma.teamUnit.findMany({
            where: { staffId },
            include: { service: { select: { id: true, title: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, staffId: string) {
        return this.prisma.teamUnit.findFirst({
            where: { id, staffId },
            include: { service: { select: { id: true, title: true } } },
        });
    }

    async update(id: string, input: Omit<UpdateTeamUnitInput, 'id'>, staffId: string, userId: string) {
        const existing = await this.prisma.teamUnit.findFirstOrThrow({ where: { id, staffId } });

        const unit = await this.prisma.teamUnit.update({
            where: { id },
            data: {
                ...(input.unitName !== undefined && { unitName: input.unitName }),
                ...(input.primaryContact !== undefined && { primaryContact: input.primaryContact }),
                ...('serviceId' in input && { serviceId: input.serviceId ?? null }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.availability !== undefined && { availability: input.availability }),
                ...(input.capacityNotes !== undefined && { capacityNotes: input.capacityNotes }),
                ...(input.internalNotes !== undefined && { internalNotes: input.internalNotes }),
            },
            include: { service: { select: { id: true, title: true } } },
        });

        const action = this.resolveAction(existing.status, input.status);
        await this.prisma.teamUnitActivity.create({
            data: { teamUnitId: unit.id, action, performedBy: userId },
        });

        return unit;
    }

    async remove(id: string, staffId: string) {
        await this.prisma.teamUnit.findFirstOrThrow({ where: { id, staffId } });
        return this.prisma.teamUnit.delete({ where: { id } });
    }

    async getHistory(id: string, staffId: string) {
        await this.prisma.teamUnit.findFirstOrThrow({ where: { id, staffId } });
        return this.prisma.teamUnitActivity.findMany({
            where: { teamUnitId: id },
            include: ACTIVITY_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
    }

    private resolveAction(prevStatus: string, nextStatus?: string): string {
        if (!nextStatus || prevStatus === nextStatus) return 'UPDATED';
        if (nextStatus === 'ARCHIVED') return 'ARCHIVED';
        if (nextStatus === 'ACTIVE' && prevStatus === 'ARCHIVED') return 'UNARCHIVED';
        if (nextStatus === 'ACTIVE') return 'ACTIVATED';
        if (nextStatus === 'PENDING_REVIEW') return 'SUBMITTED';
        return 'UPDATED';
    }
}
