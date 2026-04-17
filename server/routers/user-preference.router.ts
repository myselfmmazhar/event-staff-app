import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

const DEFAULT_FINANCE_TAB_ORDER = ["bills", "estimates", "invoices"];
const DEFAULT_CATALOG_TAB_ORDER = ["categories", "services", "products", "locations"];

export const userPreferenceRouter = router({
  getTabOrders: protectedProcedure.query(async ({ ctx }) => {
    const pref = await ctx.prisma.userPreference.findUnique({
      where: { userId: ctx.userId! },
      select: { financeTabOrder: true, catalogTabOrder: true },
    });

    return {
      financeTabOrder:
        pref?.financeTabOrder?.length ? pref.financeTabOrder : DEFAULT_FINANCE_TAB_ORDER,
      catalogTabOrder:
        pref?.catalogTabOrder?.length ? pref.catalogTabOrder : DEFAULT_CATALOG_TAB_ORDER,
    };
  }),

  saveFinanceTabOrder: protectedProcedure
    .input(z.object({ order: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userPreference.upsert({
        where: { userId: ctx.userId! },
        create: { userId: ctx.userId!, financeTabOrder: input.order },
        update: { financeTabOrder: input.order },
      });
      return { success: true };
    }),

  saveCatalogTabOrder: protectedProcedure
    .input(z.object({ order: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userPreference.upsert({
        where: { userId: ctx.userId! },
        create: { userId: ctx.userId!, catalogTabOrder: input.order },
        update: { catalogTabOrder: input.order },
      });
      return { success: true };
    }),
});
