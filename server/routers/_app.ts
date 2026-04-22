import { router } from "../trpc";
import { userRouter } from "./user.router";
import { profileRouter } from "./profile.router";
import { sessionRouter } from "./session.router";
import { eventRouter } from "./event.router";
import { eventRequestRouter } from "./event-request.router";
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
import { communicationRouter } from "./communication.router";
import { contactRouter } from "./contact.router";
import { timeEntryRouter } from "./time-entry.router";
import { billRouter } from "./bill.router";
import { categoryRouter } from "./category.router";
import { catalogRequirementRouter } from "./catalog-requirement.router";
import { userPreferenceRouter } from "./user-preference.router";
import { eventUpdateRequestRouter } from "./event-update-request.router";

/**
 * Main application router
 * All sub-routers are combined here
 */
export const appRouter = router({
  user: userRouter,
  profile: profileRouter,
  session: sessionRouter,
  event: eventRouter,
  eventRequest: eventRequestRouter,
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
  communication: communicationRouter,
  contacts: contactRouter,
  timeEntry: timeEntryRouter,
  bills: billRouter,
  category: categoryRouter,
  catalogRequirement: catalogRequirementRouter,
  userPreference: userPreferenceRouter,
  eventUpdateRequest: eventUpdateRequestRouter,
});

export type AppRouter = typeof appRouter;
