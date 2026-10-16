"use client";

import { useState, type FormEvent } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FriendContact } from "@/lib/chat/types/friends.types";

export function CreateGroupDialog({
  contacts,
  pending,
  error,
  onCreate,
}: {
  contacts: FriendContact[];
  pending: boolean;
  error: string | null;
  onCreate: (name: string, contactIds: string[]) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || name.trim().length < 2) return;
    if (await onCreate(name, selected)) {
      setOpen(false);
      setName("");
      setSelected([]);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Gruppe erstellen"
            aria-label="Gruppe erstellen"
          />
        }
      >
        <Plus aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Gruppe</DialogTitle>
          <DialogDescription>
            {selected.length} Kontakte ausgewählt
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-group-name" className="text-sm font-medium">
              Gruppenname
            </label>
            <Input
              id="new-group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
              disabled={pending}
            />
          </div>
          <fieldset disabled={pending} className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Kontakte einladen
            </legend>
            <div className="max-h-56 overflow-y-auto divide-y rounded-lg border">
              {contacts.map((contact) => (
                <label
                  key={contact.userId}
                  className="flex min-w-0 items-center gap-3 px-3 py-3"
                >
                  <Checkbox
                    checked={selected.includes(contact.userId)}
                    disabled={
                      pending ||
                      (!selected.includes(contact.userId) &&
                        selected.length >= 49)
                    }
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked
                          ? [...current, contact.userId]
                          : current.filter((id) => id !== contact.userId),
                      )
                    }
                  />
                  <span className="min-w-0 truncate">{contact.name}</span>
                </label>
              ))}
              {!contacts.length && (
                <p className="p-3 text-sm text-muted-foreground">
                  Keine bestätigten Kontakte.
                </p>
              )}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              <Users aria-hidden="true" />{" "}
              {pending ? "Wird erstellt …" : "Gruppe erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
