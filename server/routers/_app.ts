import { router } from "../trpc";
import { userRouter } from "./user.router";
import { profileRouter } from "./profile.router";
import { sessionRouter } from "./session.router";
import { eventRouter } from "./event.router";
import { clientRouter } from "./client.router";
import { staffRouter } from "./staff.router";
import { settingsRouter } from "./settings.router";

/**
 * Main application router
 * All sub-routers are combined here
 */
export const appRouter = router({
  user: userRouter,
  profile: profileRouter,
  session: sessionRouter,
  event: eventRouter,
  clients: clientRouter,
  staff: staffRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;

