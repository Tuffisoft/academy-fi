type SignInError = {
  code?: string;
  status?: number;
};

export function getSignInErrorMessage(error: SignInError): string {
  if (error.status === 429) {
    return "Zu viele Versuche. Bitte warte kurz und versuche es erneut.";
  }

  if (error.code === "INVALID_ORIGIN" || error.code === "INVALID_URL") {
    return "Die Anmeldung ist für diese Website-Adresse nicht freigegeben.";
  }

  if (error.status && error.status >= 500) {
    return "Die Anmeldung ist momentan nicht erreichbar. Bitte versuche es später erneut.";
  }

  if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return "Anmeldung fehlgeschlagen. Bitte prüfe deine E-Mail-Adresse und dein Passwort.";
  }

  return "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.";
}
