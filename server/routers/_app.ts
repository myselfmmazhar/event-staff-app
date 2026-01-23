import { router } from "../trpc";
import { userRouter } from "./user.router";
import { profileRouter } from "./profile.router";
import { sessionRouter } from "./session.router";
import { eventRouter } from "./event.router";
import { eventTemplateRouter } from "./event-template.router";
import { clientRouter } from "./client.router";
import { staffRouter } from "./staff.router";
import { settingsRouter } from "./settings.router";
import { callTimeRouter } from "./call-time.router";
import { notificationRouter } from "./notification.router";
import { templateRouter } from "./template.router";

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
  staff: staffRouter,
  settings: settingsRouter,
  callTime: callTimeRouter,
  notification: notificationRouter,
  template: templateRouter,
});

export type AppRouter = typeof appRouter;

