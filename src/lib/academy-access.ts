import "server-only";
import { prisma } from "@/lib/prisma";

export class AcademyAccessError extends Error {
  constructor() {
    super("Academy access denied");
    this.name = "AcademyAccessError";
  }
}

// Only a server-authenticated user ID is accepted. Never authorize by session role.
export async function getAcademyIdentity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, banned: true },
  });
  if (!user || user.banned || (user.role !== "OWNER" && user.role !== "INTERN")) {
    throw new AcademyAccessError();
  }
  return { id: user.id, role: user.role };
}
