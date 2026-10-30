import de from "@/messages/de.json";
import en from "@/messages/en.json";
import { ProgramError } from "./programs";
import { OrganizationAccessError } from "./organizations";

export type ProgramFailureCode = ProgramError["code"] | "UNAUTHENTICATED" | "UNAVAILABLE";
export type ProgramReply<T> = { ok: true; data: T } | { ok: false; error: { code: ProgramFailureCode; message: string } };
export function programFailure(error: unknown, locale: string): ProgramReply<never> {
  const code: ProgramFailureCode = error instanceof ProgramError ? error.code : error instanceof OrganizationAccessError ? "FORBIDDEN" : "UNAVAILABLE";
  return { ok: false, error: { code, message: (locale === "de" ? de : en).stempelfi.programEditor.errors[code] } };
}
