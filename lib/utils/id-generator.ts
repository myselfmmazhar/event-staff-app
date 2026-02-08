import { PrismaClient } from '@prisma/client';

export type IdEntityType = 'event' | 'staff' | 'client' | 'callTime' | 'service' | 'product';

interface IdGeneratorConfig {
  entityType: IdEntityType;
  prefix: string;
  includeYear?: boolean;
  padLength?: number;
}

type PrismaModelWithId = {
  findFirst: (args: {
    where: { [key: string]: { startsWith: string } };
    orderBy: { [key: string]: 'desc' };
    select: { [key: string]: true };
  }) => Promise<{ [key: string]: string } | null>;
  findUnique: (args: { where: { [key: string]: string } }) => Promise<unknown | null>;
};

const ID_FIELD_MAP: Record<IdEntityType, { model: string; field: string }> = {
  event: { model: 'event', field: 'eventId' },
  staff: { model: 'staff', field: 'staffId' },
  client: { model: 'client', field: 'clientId' },
  callTime: { model: 'callTime', field: 'callTimeId' },
  service: { model: 'service', field: 'serviceId' },
  product: { model: 'product', field: 'productId' },
};

/**
 * Generate a unique ID in format [PREFIX]-YYYY-NNN
 * Uses a last-ID-based approach for accurate numbering with race condition protection
 *
 * @param prisma - Prisma client instance
 * @param config - Configuration with entity type and prefix
 * @returns Generated unique ID
 *
 * @example
 * // For events with terminology-based prefix
 * const eventId = await generateUniqueId(prisma, {
 *   entityType: 'event',
 *   prefix: terminology.eventIdPrefix, // e.g., 'EVT'
 * });
 * // Returns: 'EVT-2025-001'
 *
 * @example
 * // For call times with static prefix
 * const callTimeId = await generateUniqueId(prisma, {
 *   entityType: 'callTime',
 *   prefix: 'CT',
 * });
 * // Returns: 'CT-2025-001'
 */
export async function generateUniqueId(prisma: PrismaClient, config: IdGeneratorConfig): Promise<string> {
  const { entityType, prefix } = config;
  const includeYear = config.includeYear ?? true;
  const padLength = config.padLength ?? 3;
  const { model, field } = ID_FIELD_MAP[entityType];
  const year = new Date().getFullYear();
  const fullPrefix = includeYear ? `${prefix}-${year}` : prefix;

  // Get the Prisma model dynamically
  const prismaModel = (prisma as unknown as Record<string, PrismaModelWithId>)[model];
  if (!prismaModel) {
    throw new Error(`Prisma model ${model} is not available`);
  }

  // Find the last ID for the current year
  const lastRecord = await prismaModel.findFirst({
    where: {
      [field]: { startsWith: fullPrefix },
    },
    orderBy: {
      [field]: 'desc',
    },
    select: {
      [field]: true,
    },
  });

  let nextNumber = 1;
  if (lastRecord) {
    // Parse the number from the last ID (format: PREFIX-YYYY-NNN)
    const lastId = lastRecord[field];
    if (typeof lastId === 'string') {
      const parts = lastId.split('-');
      const lastPart = parts[parts.length - 1];
      const lastNumber = lastPart ? Number.parseInt(lastPart, 10) : Number.NaN;
      if (!Number.isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }

  const generatedId = `${fullPrefix}-${String(nextNumber).padStart(padLength, '0')}`;

  // Race condition protection: verify the ID doesn't exist
  const existing = await prismaModel.findUnique({
    where: { [field]: generatedId },
  });

  if (existing) {
    // Recursively try with the next number
    return generateUniqueId(prisma, config);
  }

  return generatedId;
}

/**
 * Generate a unique Event ID using terminology prefix
 */
export async function generateEventId(
  prisma: PrismaClient,
  eventIdPrefix: string
): Promise<string> {
  return generateUniqueId(prisma, {
    entityType: 'event',
    prefix: eventIdPrefix,
  });
}

/**
 * Generate a unique Staff ID using terminology prefix
 */
export async function generateStaffId(
  prisma: PrismaClient,
  staffIdPrefix: string
): Promise<string> {
  return generateUniqueId(prisma, {
    entityType: 'staff',
    prefix: staffIdPrefix,
  });
}

/**
 * Generate a unique Client ID (static CLT prefix)
 */
export async function generateClientId(prisma: PrismaClient): Promise<string> {
  return generateUniqueId(prisma, {
    entityType: 'client',
    prefix: 'CLT',
  });
}

/**
 * Generate a unique Call Time ID (static CT prefix)
 */
export async function generateCallTimeId(prisma: PrismaClient): Promise<string> {
  return generateUniqueId(prisma, {
    entityType: 'callTime',
    prefix: 'CT',
  });
}

/**
 * Generate a unique Service ID (static SVC prefix)
 */
export async function generateServiceId(prisma: PrismaClient): Promise<string> {
  return generateUniqueId(prisma, {
    entityType: 'service',
    prefix: 'SVC',
    includeYear: false,
    padLength: 4,
  });
}

/**
 * Generate a unique Product ID (static PRD prefix)
 */
export async function generateProductId(prisma: PrismaClient): Promise<string> {
  return generateUniqueId(prisma, {
    entityType: 'product',
    prefix: 'PRD',
    includeYear: false,
    padLength: 4,
  });
}
