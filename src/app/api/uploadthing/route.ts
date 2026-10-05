import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";

// Reads UPLOADTHING_TOKEN from the environment
export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
