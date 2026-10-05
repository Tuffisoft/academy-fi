import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/lib/auth";

const f = createUploadthing();

const MAX_SIZE = "16MB";

export const ourFileRouter = {
  departmentDocument: f({
    pdf: { maxFileSize: MAX_SIZE, maxFileCount: 1 },
    text: { maxFileSize: MAX_SIZE, maxFileCount: 1 },
    image: { maxFileSize: MAX_SIZE, maxFileCount: 1 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: MAX_SIZE,
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: MAX_SIZE,
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      {
        maxFileSize: MAX_SIZE,
        maxFileCount: 1,
      },
  })
    // Any signed-in user (owner or intern) may upload
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    // The DB record is created by createDocumentAction once the client reports the result
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
