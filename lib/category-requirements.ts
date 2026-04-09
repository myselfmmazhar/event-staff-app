/**
 * Mirrors Prisma `CategoryRequirementType` without `@prisma/client` (safe for browser bundles).
 *
 * Top-level exports use string literals only — no cross-references between const initializers,
 * so webpack/Next can never evaluate `undefined.FILE_UPLOAD` during module init.
 */
export type CategoryRequirementType =
  | 'STANDARD'
  | 'ESIGNATURE'
  | 'FILE_UPLOAD'
  | 'DRIVER_LICENSE'
  | 'HEADSHOT'
  | 'RESUME';

/** Category types satisfied by at least one staff document upload */
export const DOCUMENT_REQUIREMENT_TYPES: CategoryRequirementType[] = [
  'FILE_UPLOAD',
  'DRIVER_LICENSE',
  'HEADSHOT',
  'RESUME',
];

export const CATEGORY_REQUIREMENT_LABELS: Record<CategoryRequirementType, string> = {
  STANDARD: 'Standard',
  ESIGNATURE: 'E-signature',
  FILE_UPLOAD: 'File upload',
  DRIVER_LICENSE: "Driver's license",
  HEADSHOT: 'Headshot (photo)',
  RESUME: 'Resume',
};

/** Dot-access convenience (same string values as Prisma enum) */
export const CATEGORY_REQUIREMENT_TYPE = {
  STANDARD: 'STANDARD',
  ESIGNATURE: 'ESIGNATURE',
  FILE_UPLOAD: 'FILE_UPLOAD',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
  HEADSHOT: 'HEADSHOT',
  RESUME: 'RESUME',
} as const;

export function requirementTypeNeedsDocuments(type: CategoryRequirementType): boolean {
  return DOCUMENT_REQUIREMENT_TYPES.includes(type);
}

export function requirementTypeNeedsEsignature(type: CategoryRequirementType): boolean {
  return type === 'ESIGNATURE';
}

export type CategoryRequirementRule = {
  requirementType: CategoryRequirementType;
  isRequired: boolean;
  categoryName: string;
};
