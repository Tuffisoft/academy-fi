"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requirePlatformOwner } from "@/lib/session";

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "INTERN";
  locale: "en" | "de";
};

export async function createUserAction(input: CreateUserInput) {
  await requirePlatformOwner();

  await auth.api.createUser({
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      data: { locale: input.locale },
    },
  });

  try {
    await auth.api.requestPasswordReset({
      body: { email: input.email, redirectTo: "/reset-password" },
    });
  } catch (error) {
    // User creation already succeeded; a failed invite email shouldn't fail the request
    console.error("Failed to send welcome email", error);
  }
}

export async function deleteUserAction(userId: string) {
  const currentUser = await requirePlatformOwner();

  if (userId === currentUser.id) {
    throw new Error("You cannot delete your own account.");
  }

  // removeUser requires an authoritative session, unlike createUser
  await auth.api.removeUser({
    body: { userId },
    headers: await headers(),
  });
}

export async function setUserPasswordAction(
  userId: string,
  newPassword: string,
) {
  await requirePlatformOwner();

  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: await headers(),
  });
}
