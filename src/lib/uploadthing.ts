import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi, UploadThingError } from "uploadthing/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcademyAccessError, getAcademyIdentity } from "@/lib/academy-access";

const f = createUploadthing();
const utapi = new UTApi();

const MAX_SIZE = "16MB";

async function authorizeUpload(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw new UploadThingError("Unauthorized");
  try {
    await getAcademyIdentity(session.user.id);
  } catch (error) {
    if (!(error instanceof AcademyAccessError)) throw error;
    throw new UploadThingError("Forbidden");
  }
  return { userId: session.user.id };
}

function getUploadThingFileKey(image: string | null) {
  if (!image) return null;

  try {
    const url = new URL(image);
    const isUploadThingHost =
      url.hostname === "utfs.io" || url.hostname.endsWith(".ufs.sh");
    const match = url.pathname.match(/^\/f\/([^/]+)$/);

    if (url.protocol !== "https:" || !isUploadThingHost || !match) {
      return null;
    }

    return match[1];
  } catch {
    return null;
  }
}

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
    // Current internal Academy users only, regardless of a cached session role.
    .middleware(async ({ req }) => {
      return authorizeUpload(req);
    })
    // The DB record is created by createDocumentAction once the client reports the result
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),
  profileImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      return authorizeUpload(req);
    })
    .onUploadComplete(async ({ file, metadata }) => {
      await getAcademyIdentity(metadata.userId);
      const user = await prisma.user.findUnique({
        where: { id: metadata.userId },
        select: { image: true },
      });
      if (!user) throw new UploadThingError("User not found");

      try {
        await prisma.user.update({
          where: { id: metadata.userId },
          data: { image: file.ufsUrl },
        });
      } catch (error) {
        try {
          await utapi.deleteFiles(file.key);
        } catch (cleanupError) {
          console.error("Failed to clean up an unassociated profile image", cleanupError);
        }
        throw error;
      }

      let oldImageDeleted = true;
      const oldFileKey = getUploadThingFileKey(user.image);
      if (oldFileKey && oldFileKey !== file.key) {
        try {
          const deletion = await utapi.deleteFiles(oldFileKey);
          oldImageDeleted = deletion.success;
          if (!deletion.success) {
            console.error("UploadThing could not delete the previous profile image", {
              key: oldFileKey,
            });
          }
        } catch (error) {
          oldImageDeleted = false;
          console.error("Failed to delete the previous profile image", error);
        }
      }

      return { oldImageDeleted };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
