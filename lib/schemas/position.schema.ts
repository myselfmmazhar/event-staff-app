import { z } from "zod";

/**
 * Position Schema - Validation for staff positions
 */
export const PositionSchema = {
    /**
     * Create a new position
     */
    create: z.object({
        name: z
            .string()
            .min(1, "Position name is required")
            .max(100, "Position name must be 100 characters or less")
            .transform((val) => val.trim()),
        description: z
            .string()
            .max(500, "Description must be 500 characters or less")
            .transform((val) => val?.trim())
            .optional()
            .nullable(),
    }),

    /**
     * Update an existing position
     */
    update: z.object({
        id: z.string().uuid("Invalid position ID"),
        name: z
            .string()
            .min(1, "Position name is required")
            .max(100, "Position name must be 100 characters or less")
            .transform((val) => val.trim())
            .optional(),
        description: z
            .string()
            .max(500, "Description must be 500 characters or less")
            .transform((val) => val?.trim())
            .optional()
            .nullable(),
        isActive: z.boolean().optional(),
    }),

    /**
     * Position ID parameter
     */
    id: z.object({
        id: z.string().uuid("Invalid position ID"),
    }),

    /**
     * Toggle position active status
     */
    toggleActive: z.object({
        id: z.string().uuid("Invalid position ID"),
        isActive: z.boolean(),
    }),
};

// Export types
export type CreatePositionInput = z.infer<typeof PositionSchema.create>;
export type UpdatePositionInput = z.infer<typeof PositionSchema.update>;
export type PositionIdInput = z.infer<typeof PositionSchema.id>;
export type TogglePositionActiveInput = z.infer<typeof PositionSchema.toggleActive>;
