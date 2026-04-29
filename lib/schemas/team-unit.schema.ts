import { z } from 'zod';

export const TEAM_UNIT_STATUS = ['ACTIVE', 'PENDING_REVIEW', 'ARCHIVED'] as const;
export const TEAM_UNIT_AVAILABILITY = ['AVAILABLE', 'LIMITED', 'NOT_AVAILABLE'] as const;

const create = z.object({
    unitName: z.string().min(1, 'Unit name is required'),
    primaryContact: z.string().optional(),
    serviceId: z.string().uuid().optional().nullable(),
    status: z.enum(TEAM_UNIT_STATUS).default('ACTIVE'),
    availability: z.enum(TEAM_UNIT_AVAILABILITY).default('AVAILABLE'),
    capacityNotes: z.string().optional(),
    internalNotes: z.string().optional(),
});

const update = create.partial().extend({
    id: z.string().uuid(),
});

const id = z.object({ id: z.string().uuid() });

export const TeamUnitSchema = { create, update, id };
export type CreateTeamUnitInput = z.infer<typeof create>;
export type CreateTeamUnitFormValues = z.output<typeof create>;
export type UpdateTeamUnitInput = z.infer<typeof update>;
