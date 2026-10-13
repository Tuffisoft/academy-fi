"use client";

import { authClient } from "@/lib/auth-client";

export function signInAction(email: string, password: string) {
  return authClient.signIn.email({ email, password });
}

export function signOutAction() {
  return authClient.signOut();
}

export function resetPasswordAction(newPassword: string, token: string) {
  return authClient.resetPassword({ newPassword, token });
}
