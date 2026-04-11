import { z } from "zod";

/**
 * Terminology term validation
 * - Min 2 characters, Max 20 characters
 * - Only letters, numbers, spaces, and hyphens allowed
 * - Cannot be only whitespace
 */
const terminologyTermSchema = z
    .string()
    .min(2, "Term must be at least 2 characters")
    .max(20, "Term must be 20 characters or less")
    .regex(
        /^[a-zA-Z0-9\s-]+$/,
        "Term can only contain letters, numbers, spaces, and hyphens"
    )
    .refine(
        (val) => val.trim().length >= 2,
        { message: "Term cannot be only whitespace" }
    )
    .transform((val) => val.trim());

/**
 * Update Terminology Input Schema
 * Used for updating organization terminology settings
 */
export const updateTerminologySchema = z.object({
    staffTermSingular: terminologyTermSchema,
    staffTermPlural: terminologyTermSchema,
    eventTermSingular: terminologyTermSchema,
    eventTermPlural: terminologyTermSchema,
    roleTermSingular: terminologyTermSchema,
    roleTermPlural: terminologyTermSchema,
});

/**
 * Type inference for UpdateTerminologyInput
 */
export type UpdateTerminologyInput = z.infer<typeof updateTerminologySchema>;

/**
 * Preset Selection Schema (for quick preset application)
 */
export const presetSelectionSchema = z.object({
    presetKey: z.enum([
        "default",
        "talentEvents",
        "staffTasks",
        "talentProjects",
        "crewJobs",
    ]),
});

export type PresetSelectionInput = z.infer<typeof presetSelectionSchema>;
