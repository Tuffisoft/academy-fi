"use server";

import { UTApi } from "uploadthing/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";

const utapi = new UTApi();

// Best effort: a failed cleanup only leaves an orphaned file, never a broken record
async function deleteHostedFiles(keys: string[]) {
  if (keys.length === 0) return;
  try {
    await utapi.deleteFiles(keys);
  } catch (error) {
    console.error("Failed to delete hosted files", error);
  }
}

type DepartmentInput = {
  nameEN: string;
  nameDE: string;
  description?: string;
};

export async function createDepartmentAction(input: DepartmentInput) {
  await requireRole(Role.OWNER);

  const count = await prisma.department.count();
  await prisma.department.create({
    data: {
      name: input.nameEN,
      nameEN: input.nameEN,
      nameDE: input.nameDE,
      description: input.description || null,
      order: count,
    },
  });
}

export async function deleteDepartmentAction(id: string) {
  await requireRole(Role.OWNER);

  // Resources cascade-delete, so grab their hosted files first
  const files = await prisma.departmentResource.findMany({
    where: { departmentId: id, fileKey: { not: null } },
    select: { fileKey: true },
  });
  await prisma.department.delete({ where: { id } });
  await deleteHostedFiles(files.flatMap((f) => (f.fileKey ? [f.fileKey] : [])));
}

type ResourceInput = {
  title: string;
  url: string;
  note?: string;
};

export async function createResourceAction(
  departmentId: string,
  input: ResourceInput,
) {
  const user = await requireUser();

  // Only web links; blocks javascript: URLs now that interns can submit them
  const parsed = new URL(input.url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid URL.");
  }
  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const count = await prisma.departmentResource.count({
    where: { departmentId },
  });
  await prisma.departmentResource.create({
    data: {
      departmentId,
      title,
      url: parsed.toString(),
      note: input.note || null,
      order: count,
      createdById: user.id,
    },
  });
}

export async function deleteResourceAction(id: string) {
  const user = await requireUser();

  const resource = await prisma.departmentResource.findUnique({
    where: { id },
    select: { createdById: true, fileKey: true },
  });
  if (!resource) {
    throw new Error("Resource not found.");
  }
  // Owners can delete anything; interns only what they added
  if (user.role !== Role.OWNER && resource.createdById !== user.id) {
    throw new Error("Not authorized to delete this resource.");
  }

  await prisma.departmentResource.delete({ where: { id } });
  if (resource.fileKey) {
    await deleteHostedFiles([resource.fileKey]);
  }
}

type DocumentInput = {
  title: string;
  note?: string;
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
};

export async function createDocumentAction(
  departmentId: string,
  input: DocumentInput,
) {
  const user = await requireUser();

  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  // The client reports the upload result, so only accept real UploadThing URLs
  // whose path matches the key; otherwise the key could target someone else's file on delete.
  const parsed = new URL(input.fileUrl);
  const isUploadThingHost =
    parsed.hostname === "utfs.io" || parsed.hostname.endsWith(".ufs.sh");
  if (
    parsed.protocol !== "https:" ||
    !isUploadThingHost ||
    parsed.pathname !== `/f/${input.fileKey}`
  ) {
    throw new Error("Invalid file.");
  }

  const count = await prisma.departmentResource.count({
    where: { departmentId },
  });
  await prisma.departmentResource.create({
    data: {
      departmentId,
      title,
      url: parsed.toString(),
      note: input.note?.trim() || null,
      order: count,
      createdById: user.id,
      fileKey: input.fileKey,
      fileName: input.fileName,
      fileSize: input.fileSize,
    },
  });
}
