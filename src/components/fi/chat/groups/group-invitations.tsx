"use client";

import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GroupInvitation } from "@/lib/chat/types/chat.types";

export function GroupInvitations({
  invitations,
  loading,
  pending,
  onRespond,
  onRefresh,
}: {
  invitations: GroupInvitation[];
  loading: boolean;
  pending: boolean;
  onRespond: (id: string, accept: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <section aria-label="Gruppeneinladungen" className="mb-3 border-b pb-3">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xs font-semibold text-muted-foreground">
          Einladungen {invitations.length > 0 && `(${invitations.length})`}
        </h2>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={pending || loading}
          title="Einladungen aktualisieren"
          aria-label="Einladungen aktualisieren"
          onClick={() => void onRefresh()}
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>
      {loading && (
        <p role="status" className="px-2 py-2 text-xs text-muted-foreground">
          Einladungen werden geladen …
        </p>
      )}
      {!loading && !invitations.length && (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          Keine offenen Einladungen.
        </p>
      )}
      {invitations.map((invitation) => (
        <div
          key={invitation.conversationId}
          className="flex min-w-0 items-center gap-2 px-2 py-2"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {invitation.name}
          </span>
          <Button
            type="button"
            size="icon-sm"
            disabled={pending}
            title="Einladung annehmen"
            aria-label={`Einladung zu ${invitation.name} annehmen`}
            onClick={() => void onRespond(invitation.conversationId, true)}
          >
            <Check aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={pending}
            title="Einladung ablehnen"
            aria-label={`Einladung zu ${invitation.name} ablehnen`}
            onClick={() => void onRespond(invitation.conversationId, false)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
    </section>
  );
}
