"use server";
import { getCurrentSession } from "@/lib/session";
import { saveProgram } from "./programs";
import { programFailure } from "./program-reply";

export async function saveProgramAction(raw: unknown, locale: "de" | "en") {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false as const, error: { code: "UNAUTHENTICATED" as const, message: locale === "de" ? "Bitte erneut anmelden." : "Please sign in again." } };
    return { ok: true as const, data: await saveProgram(session.user.id, raw) };
  } catch (error) { return programFailure(error, locale); }
}
