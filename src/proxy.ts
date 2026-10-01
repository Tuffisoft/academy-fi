import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export const proxy = createMiddleware(routing);

export const config = {
  // Match all routes except static assets, Next.js internals, and API routes
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
