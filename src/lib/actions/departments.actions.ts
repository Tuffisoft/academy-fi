"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";

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
  await prisma.department.delete({ where: { id } });
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
    select: { createdById: true },
  });
  if (!resource) {
    throw new Error("Resource not found.");
  }
  // Owners can delete anything; interns only what they added
  if (user.role !== Role.OWNER && resource.createdById !== user.id) {
    throw new Error("Not authorized to delete this resource.");
  }

  await prisma.departmentResource.delete({ where: { id } });
}
