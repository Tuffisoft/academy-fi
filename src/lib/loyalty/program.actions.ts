"use server";
import { getCurrentSession } from "@/lib/session";
import { changeProgramLifecycle, ProgramError, saveProgram } from "./programs";
import { programFailure } from "./program-reply";
import { programLocale } from "./program-input";

export async function saveProgramAction(raw: unknown, locale: "de" | "en") {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false as const, error: { code: "UNAUTHENTICATED" as const, message: locale === "de" ? "Bitte erneut anmelden." : "Please sign in again." } };
    return { ok: true as const, data: await saveProgram(session.user.id, raw) };
  } catch (error) { return programFailure(error, locale); }
}

export async function changeProgramLifecycleAction(raw: unknown, locale: "de" | "en") {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false as const, error: { code: "UNAUTHENTICATED" as const, message: locale === "de" ? "Bitte erneut anmelden." : "Please sign in again." } };
    if (!programLocale.safeParse(locale).success) throw new ProgramError("INVALID_INPUT");
    return { ok: true as const, data: await changeProgramLifecycle(session.user.id, raw) };
  } catch (error) { return programFailure(error, locale); }
}
