import { z } from "zod";
import { MessageType, MessageStatus } from "@prisma/client";

export const queryCommunicationLogsSchema = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(20).optional(),
    type: z.nativeEnum(MessageType).optional(),
    status: z.nativeEnum(MessageStatus).optional(),
    search: z.string().optional(),
    showTrashed: z.boolean().default(false).optional(),
});

export type QueryCommunicationLogsInput = z.infer<typeof queryCommunicationLogsSchema>;
