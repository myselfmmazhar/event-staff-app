import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { TeamUnitSchema } from '@/lib/schemas/team-unit.schema';
import { TeamUnitService } from '@/services/team-unit.service';

async function resolveStaffId(prisma: any, userId: string): Promise<string> {
    const staff = await prisma.staff.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!staff) {
        throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Staff profile not found for this user.',
        });
    }
    return staff.id;
}

export const teamUnitRouter = router({
    create: protectedProcedure
        .input(TeamUnitSchema.create)
        .mutation(async ({ ctx, input }) => {
            const staffId = await resolveStaffId(ctx.prisma, ctx.userId!);
            const service = new TeamUnitService(ctx.prisma);
            return service.create(input, staffId, ctx.userId!);
        }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
        const staffId = await resolveStaffId(ctx.prisma, ctx.userId!);
        const service = new TeamUnitService(ctx.prisma);
        return service.findAllForStaff(staffId);
    }),

    getById: protectedProcedure
        .input(TeamUnitSchema.id)
        .query(async ({ ctx, input }) => {
            const staffId = await resolveStaffId(ctx.prisma, ctx.userId!);
            const service = new TeamUnitService(ctx.prisma);
            return service.findOne(input.id, staffId);
        }),

    update: protectedProcedure
        .input(TeamUnitSchema.update)
        .mutation(async ({ ctx, input }) => {
            const staffId = await resolveStaffId(ctx.prisma, ctx.userId!);
            const { id, ...data } = input;
            const service = new TeamUnitService(ctx.prisma);
            return service.update(id, data, staffId, ctx.userId!);
        }),

    delete: protectedProcedure
        .input(TeamUnitSchema.id)
        .mutation(async ({ ctx, input }) => {
            const staffId = await resolveStaffId(ctx.prisma, ctx.userId!);
            const service = new TeamUnitService(ctx.prisma);
            return service.remove(input.id, staffId);
        }),

    getHistory: protectedProcedure
        .input(TeamUnitSchema.id)
        .query(async ({ ctx, input }) => {
            const staffId = await resolveStaffId(ctx.prisma, ctx.userId!);
            const service = new TeamUnitService(ctx.prisma);
            return service.getHistory(input.id, staffId);
        }),
});
