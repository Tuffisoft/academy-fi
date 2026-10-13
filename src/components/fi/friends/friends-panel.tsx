"use client";

import { useState, type FormEvent } from "react";
import {
  Check,
  MessageCircle,
  RefreshCw,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  cancelFriendRequestAction,
  removeContactAction,
  respondToFriendRequestAction,
  searchUsersAction,
  sendFriendRequestAction,
} from "@/lib/actions/friend.actions";
import { Button } from "@/components/ui/button";
import { FriendAvatar } from "./friend-avatar";
import type {
  FriendContact,
  FriendsResult,
  FriendsSnapshot,
  UserSearchResult,
} from "@/lib/types/friends.types";

type FriendsPanelProps = {
  snapshot: FriendsSnapshot;
  refreshError: string | null;
  onSnapshotChange: (snapshot: FriendsSnapshot) => void;
  onRefresh: () => Promise<void>;
  onStartChat: (userId: string) => Promise<void>;
  chatPending: boolean;
};

type FriendsTab = "friends" | "requests" | "search";

export function FriendsPanel({
  snapshot,
  refreshError,
  onSnapshotChange,
  onRefresh,
  onStartChat,
  chatPending,
}: FriendsPanelProps) {
  const [tab, setTab] = useState<FriendsTab>("friends");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function runAction(
    action: () => Promise<FriendsResult<FriendsSnapshot>>,
    successMessage: string,
  ) {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSnapshotChange(result.data);
      setNotice(successMessage);
    } catch {
      setError("Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setPending(false);
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const result = await searchUsersAction(query);
      if (result.ok) {
        setResults(result.data);
        setSearched(true);
      } else setError(result.error);
    } catch {
      setError("Die Suche ist momentan nicht erreichbar.");
    } finally {
      setPending(false);
    }
  }

  function relationshipFor(user: UserSearchResult) {
    if (snapshot.friends.some((contact) => contact.userId === user.id))
      return "friends";
    if (snapshot.incoming.some((contact) => contact.userId === user.id))
      return "incoming";
    if (snapshot.outgoing.some((contact) => contact.userId === user.id))
      return "outgoing";
    return "none";
  }

  const tabs = [
    { id: "friends", label: `Kontakte (${snapshot.friends.length})` },
    { id: "requests", label: `Anfragen (${snapshot.incoming.length})` },
    { id: "search", label: "Freunde hinzufügen" },
  ] as const;

  return (
    <section
      aria-label="Kontakte verwalten"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-3 sm:px-5 sm:py-4">
        <h1 className="flex items-center gap-2 font-semibold">
          <Users className="size-5" aria-hidden="true" /> Kontakte
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Kontaktliste aktualisieren"
          onClick={() => void onRefresh()}
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>

      <div
        role="group"
        aria-label="Kontaktansicht"
        className="flex shrink-0 flex-wrap gap-2 border-b p-3 sm:p-4"
      >
        {tabs.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? "secondary" : "ghost"}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setNotice(null);
              setError(null);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <div
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-3 sm:p-6"
        aria-busy={pending}
      >
        {(error || refreshError) && (
          <p role="alert" className="text-sm text-destructive">
            {error || refreshError}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
        )}

        {tab === "friends" && (
          <div className="space-y-2">
            {snapshot.friends.length === 0 && (
              <EmptyState text="Noch keine Kontakte. Suche nach einem Namen und sende eine Freundschaftsanfrage." />
            )}
            {snapshot.friends.map((friend) => (
              <ContactRow key={friend.id} contact={friend} detail="Befreundet">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || chatPending}
                  aria-label={`Chat mit ${friend.name} öffnen`}
                  onClick={() => void onStartChat(friend.userId)}
                >
                  <MessageCircle aria-hidden="true" /> Nachricht
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  aria-label={`Kontakt ${friend.name} entfernen`}
                  onClick={() =>
                    void runAction(
                      () => removeContactAction(friend.id),
                      "Kontakt entfernt.",
                    )
                  }
                >
                  <UserMinus aria-hidden="true" />
                  Entfernen
                </Button>
              </ContactRow>
            ))}
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Erhaltene Anfragen</h2>
              {snapshot.incoming.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Keine offenen Anfragen.
                </p>
              )}
              {snapshot.incoming.map((request) => (
                <ContactRow
                  key={request.id}
                  contact={request}
                  detail="Möchte mit dir befreundet sein"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      aria-label={`Anfrage von ${request.name} annehmen`}
                      onClick={() =>
                        void runAction(
                          () =>
                            respondToFriendRequestAction(request.id, "accept"),
                          "Freundschaftsanfrage angenommen.",
                        )
                      }
                    >
                      <Check aria-hidden="true" />
                      Annehmen
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      aria-label={`Anfrage von ${request.name} ablehnen`}
                      className="hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        void runAction(
                          () =>
                            respondToFriendRequestAction(request.id, "decline"),
                          "Freundschaftsanfrage abgelehnt.",
                        )
                      }
                    >
                      <X aria-hidden="true" />
                      Ablehnen
                    </Button>
                  </div>
                </ContactRow>
              ))}
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Gesendete Anfragen</h2>
              {snapshot.outgoing.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Keine gesendeten Anfragen.
                </p>
              )}
              {snapshot.outgoing.map((request) => (
                <ContactRow
                  key={request.id}
                  contact={request}
                  detail="Wartet auf Bestätigung"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      void runAction(
                        () => cancelFriendRequestAction(request.id),
                        "Freundschaftsanfrage zurückgezogen.",
                      )
                    }
                  >
                    Zurückziehen
                  </Button>
                </ContactRow>
              ))}
            </div>
          </div>
        )}

        {tab === "search" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold">Freunde hinzufügen</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Suche nach dem Namen eines Nutzers. Dein eigenes Konto wird
                nicht angezeigt.
              </p>
            </div>
            <form onSubmit={search} className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <label htmlFor="friend-search" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="friend-search"
                  disabled={pending}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearched(false);
                    setResults([]);
                  }}
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder="Mindestens 2 Zeichen …"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:text-sm"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={pending || query.trim().length < 2}
              >
                <Search aria-hidden="true" /> Suchen
              </Button>
            </form>
            <div className="space-y-2">
              {searched && results.length === 0 && (
                <EmptyState text="Keine Nutzer mit diesem Namen gefunden." />
              )}
              {results.map((user) => {
                const relationship = relationshipFor(user);
                return (
                  <ContactRow
                    key={user.id}
                    contact={{ id: user.id, userId: user.id, name: user.name }}
                    detail={
                      relationship === "friends"
                        ? "Bereits befreundet"
                        : relationship === "incoming"
                          ? "Anfrage erhalten – siehe Anfragen"
                          : relationship === "outgoing"
                            ? "Anfrage gesendet"
                            : "Nutzer gefunden"
                    }
                  >
                    {relationship === "none" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          void runAction(
                            () => sendFriendRequestAction(user.id),
                            "Freundschaftsanfrage gesendet.",
                          )
                        }
                      >
                        <UserPlus aria-hidden="true" />
                        <span className="hidden sm:inline">Anfrage senden</span>
                        <span className="sr-only sm:hidden">
                          Anfrage an {user.name} senden
                        </span>
                      </Button>
                    )}
                  </ContactRow>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ContactRow({
  contact,
  detail,
  children,
}: {
  contact: FriendContact;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background/30 px-3 py-3 sm:px-4">
      <FriendAvatar name={contact.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{contact.name}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
