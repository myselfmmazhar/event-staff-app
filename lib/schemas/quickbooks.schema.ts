import { z } from "zod";

export const QuickBooksSchema = {
  syncOne: z.object({
    id: z.string().min(1, "ID is required"),
  }),
};
