import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Cloud,
  PenLine,
  Smartphone,
  Search,
  Camera,
} from 'lucide-react';
import type { CategoryRequirementType } from '@/lib/category-requirements';
import { CATEGORY_REQUIREMENT_TYPE } from '@/lib/category-requirements';

export const REQ_TEMPLATE_IDS = ['w9', 'upload', 'esign', 'idv', 'bg', 'headshot'] as const;

export type ReqTemplateId = (typeof REQ_TEMPLATE_IDS)[number];

const REQ_TEMPLATE_ID_SET = new Set<string>(REQ_TEMPLATE_IDS);

export function isReqTemplateId(value: string): value is ReqTemplateId {
  return REQ_TEMPLATE_ID_SET.has(value);
}

export function normalizeReqTemplateIds(ids: string[] | undefined | null): ReqTemplateId[] {
  if (!ids?.length) return [];
  const out: ReqTemplateId[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!isReqTemplateId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export const REQ_TEMPLATE_CARDS: {
  id: ReqTemplateId;
  title: string;
  badge: 'Standard' | 'Smart';
  description: string;
  footer: string;
  Icon: LucideIcon;
}[] = [
  {
    id: 'w9',
    title: 'Tax form - W-9',
    badge: 'Standard',
    description: 'Contractor tax requirement with acknowledgement and signature.',
    footer: 'Included for contractor',
    Icon: FileText,
  },
  {
    id: 'upload',
    title: 'File upload',
    badge: 'Standard',
    description: 'Upload certifications, insurance, IDs, or supporting documents.',
    footer: 'Add supporting docs',
    Icon: Cloud,
  },
  {
    id: 'esign',
    title: 'E-signature',
    badge: 'Standard',
    description: 'Signature-only requirement for policies, agreements, or acknowledgements.',
    footer: 'Signature required',
    Icon: PenLine,
  },
  {
    id: 'idv',
    title: 'ID verification',
    badge: 'Smart',
    description: 'Identity or document verification based on role and compliance need.',
    footer: 'Optional requirement',
    Icon: Smartphone,
  },
  {
    id: 'bg',
    title: 'Background check',
    badge: 'Smart',
    description: 'Use when the role, client, venue, or market requires it.',
    footer: 'Optional requirement',
    Icon: Search,
  },
  {
    id: 'headshot',
    title: 'Headshot / profile photo',
    badge: 'Smart',
    description: 'Useful for promotional talent, models, and client-facing roles.',
    footer: 'Optional requirement',
    Icon: Camera,
  },
];

/** Legacy categories (no template ids) infer cards from the old single-type field. */
export function legacyTemplatesFromRequirementType(type: CategoryRequirementType): ReqTemplateId[] {
  switch (type) {
    case CATEGORY_REQUIREMENT_TYPE.ESIGNATURE:
      return ['esign'];
    case CATEGORY_REQUIREMENT_TYPE.FILE_UPLOAD:
      return ['upload'];
    case CATEGORY_REQUIREMENT_TYPE.DRIVER_LICENSE:
      return ['idv'];
    case CATEGORY_REQUIREMENT_TYPE.HEADSHOT:
      return ['headshot'];
    case CATEGORY_REQUIREMENT_TYPE.RESUME:
      return ['upload'];
    case CATEGORY_REQUIREMENT_TYPE.STANDARD:
    default:
      return [];
  }
}

export function templatesFromCategoryRow(category: {
  requirementTemplateIds: string[];
  requirementType: CategoryRequirementType;
}): ReqTemplateId[] {
  const normalized = normalizeReqTemplateIds(category.requirementTemplateIds);
  if (normalized.length > 0) return normalized;
  return legacyTemplatesFromRequirementType(category.requirementType);
}

/**
 * Maps selected cards to the legacy `requirementType` column (used for enforcement + table labels).
 */
export function deriveRequirementTypeFromTemplateIds(ids: readonly ReqTemplateId[]): CategoryRequirementType {
  if (ids.includes('idv')) return CATEGORY_REQUIREMENT_TYPE.DRIVER_LICENSE;
  if (ids.includes('headshot')) return CATEGORY_REQUIREMENT_TYPE.HEADSHOT;
  if (ids.includes('upload')) return CATEGORY_REQUIREMENT_TYPE.FILE_UPLOAD;
  if (ids.includes('esign')) return CATEGORY_REQUIREMENT_TYPE.ESIGNATURE;
  return CATEGORY_REQUIREMENT_TYPE.STANDARD;
}

export function formatRequirementTemplatesShort(ids: readonly ReqTemplateId[]): string {
  if (ids.length === 0) return '—';
  const labels = ids.map((id) => REQ_TEMPLATE_CARDS.find((c) => c.id === id)?.title ?? id);
  return labels.join(', ');
}

/** Minimal category fields needed to merge onboarding templates from assigned services. */
export type ServiceCategoryTemplatesInput = {
  requirementTemplateIds: string[];
  requirementType: CategoryRequirementType;
};

export type ServiceForReqMerge = {
  id: string;
  category?: ServiceCategoryTemplatesInput | null;
};

/**
 * Union of requirement cards from all selected services’ categories.
 * Defaults to W-9 when no category contributes templates (matches prior onboarding default).
 */
export function computeRequirementTemplatesFromServices(
  serviceIds: readonly string[],
  services: readonly ServiceForReqMerge[]
): Set<ReqTemplateId> {
  const merged = new Set<ReqTemplateId>();
  for (const sid of serviceIds) {
    const svc = services.find((s) => s.id === sid);
    if (!svc?.category) continue;
    for (const t of templatesFromCategoryRow(svc.category)) {
      merged.add(t);
    }
  }
  if (merged.size === 0) {
    merged.add('w9');
  }
  return merged;
}
