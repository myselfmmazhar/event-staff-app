import { router } from "../trpc";
import { userRouter } from "./user.router";
import { profileRouter } from "./profile.router";
import { sessionRouter } from "./session.router";
import { eventRouter } from "./event.router";
import { eventTemplateRouter } from "./event-template.router";
import { clientRouter } from "./client.router";
import { clientLocationRouter } from "./client-location.router";
import { staffRouter } from "./staff.router";
import { staffTaxDetailsRouter } from "./staff-tax-details.router";
import { settingsRouter } from "./settings.router";
import { callTimeRouter } from "./call-time.router";
import { notificationRouter } from "./notification.router";
import { templateRouter } from "./template.router";
import { serviceRouter } from "./service.router";
import { productRouter } from "./product.router";
import { eventAttachmentRouter } from "./event-attachment.router";
import { invoiceRouter } from "./invoice.router";
import { estimateRouter } from "./estimate.router";

/**
 * Main application router
 * All sub-routers are combined here
 */
export const appRouter = router({
  user: userRouter,
  profile: profileRouter,
  session: sessionRouter,
  event: eventRouter,
  eventTemplate: eventTemplateRouter,
  clients: clientRouter,
  clientLocation: clientLocationRouter,
  staff: staffRouter,
  staffTaxDetails: staffTaxDetailsRouter,
  settings: settingsRouter,
  callTime: callTimeRouter,
  notification: notificationRouter,
  template: templateRouter,
  service: serviceRouter,
  product: productRouter,
  eventAttachment: eventAttachmentRouter,
  invoices: invoiceRouter,
  estimates: estimateRouter,
});

export type AppRouter = typeof appRouter;
