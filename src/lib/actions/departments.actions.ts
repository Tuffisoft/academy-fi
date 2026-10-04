"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
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
  await requireRole(Role.OWNER);

  const count = await prisma.departmentResource.count({
    where: { departmentId },
  });
  await prisma.departmentResource.create({
    data: {
      departmentId,
      title: input.title,
      url: input.url,
      note: input.note || null,
      order: count,
    },
  });
}

export async function deleteResourceAction(id: string) {
  await requireRole(Role.OWNER);
  await prisma.departmentResource.delete({ where: { id } });
}
