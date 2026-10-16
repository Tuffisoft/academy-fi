"use client";

import { useState, type FormEvent } from "react";
import { Crown, LogOut, Save, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionMenu } from "@/components/fi/action-menu";
import {
  changeGroupRoleAction,
  inviteGroupContactsAction,
  removeGroupMemberAction,
  renameGroupAction,
} from "@/lib/chat/actions/group.actions";
import type { ChatResult, GroupDetails } from "@/lib/chat/types/chat.types";
import type { FriendContact } from "@/lib/chat/types/friends.types";

export function GroupManager({
  conversationId,
  group,
  userId,
  contacts,
  pending,
  error,
  open,
  onOpenChange,
  onRun,
  onLeave,
}: {
  conversationId: string;
  group: GroupDetails;
  userId: string;
  contacts: FriendContact[];
  pending: boolean;
  error: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (action: () => Promise<ChatResult<null>>) => Promise<unknown>;
  onLeave: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [selected, setSelected] = useState<string[]>([]);
  const available = contacts.filter(
    (contact) =>
      !group.members.some((member) => member.userId === contact.userId),
  );
  const selectedAvailable = selected.filter((id) =>
    available.some((contact) => contact.userId === id),
  );
  const activeMembers = group.members.filter(
    (member) => member.status === "ACTIVE",
  );
  const admins = activeMembers.filter(
    (member) => member.role === "ADMIN",
  ).length;

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!selectedAvailable.length || pending) return;
    if (
      await onRun(() =>
        inviteGroupContactsAction(conversationId, selectedAvailable),
      )
    )
      setSelected([]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 wrap-anywhere">{group.name}</DialogTitle>
          <DialogDescription>
            {activeMembers.length} Mitglieder
          </DialogDescription>
        </DialogHeader>
        {group.canManage && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!pending && name.trim().length >= 2)
                void onRun(() => renameGroupAction(conversationId, name));
            }}
            className="space-y-2"
          >
            <label htmlFor="group-name" className="text-sm font-medium">
              Gruppenname
            </label>
            <div className="flex gap-2">
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
                disabled={pending}
              />
              <Button
                type="submit"
                size="icon"
                variant="outline"
                disabled={
                  pending ||
                  name.trim().length < 2 ||
                  name.trim() === group.name
                }
                aria-label="Gruppennamen speichern"
                title="Gruppennamen speichern"
              >
                <Save aria-hidden="true" />
              </Button>
            </div>
          </form>
        )}
        <div className="divide-y border-y">
          {group.members.map((member) => (
            <div
              key={member.userId}
              className="flex min-w-0 items-center gap-3 py-3"
            >
              {member.role === "ADMIN" && (
                <Crown
                  className="size-4 shrink-0 text-primary"
                  aria-label="Gruppenadmin"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.name}
                  {member.userId === userId && " (Du)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.status === "INVITED"
                    ? "Eingeladen"
                    : member.role === "ADMIN"
                      ? "Admin"
                      : "Mitglied"}
                </p>
              </div>
              {group.canManage && !pending && member.userId !== userId && (
                <ActionMenu
                  label={`Aktionen für ${member.name}`}
                  actions={[
                    ...(member.status === "ACTIVE" &&
                    (member.role !== "ADMIN" || admins > 1)
                      ? [
                          {
                            label:
                              member.role === "ADMIN"
                                ? "Adminrechte entziehen"
                                : "Zum Admin ernennen",
                            icon: Crown,
                            onClick: () =>
                              void onRun(() =>
                                changeGroupRoleAction(
                                  conversationId,
                                  member.userId,
                                  member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                ),
                              ),
                          },
                        ]
                      : []),
                    {
                      label:
                        member.status === "INVITED"
                          ? "Einladung zurückziehen"
                          : "Mitglied entfernen",
                      icon: UserMinus,
                      destructive: true,
                      onClick: () =>
                        void onRun(() =>
                          removeGroupMemberAction(
                            conversationId,
                            member.userId,
                          ),
                        ),
                    },
                  ]}
                />
              )}
            </div>
          ))}
        </div>
        {group.canManage &&
          available.length > 0 &&
          group.members.length < 50 && (
            <form
              onSubmit={(event) => void invite(event)}
              className="space-y-3"
            >
              <fieldset disabled={pending}>
                <legend className="mb-2 text-sm font-medium">
                  Kontakte einladen
                </legend>
                <div className="max-h-40 divide-y overflow-y-auto">
                  {available.map((contact) => (
                    <label
                      key={contact.userId}
                      className="flex min-w-0 items-center gap-3 py-2"
                    >
                      <Checkbox
                        checked={selectedAvailable.includes(contact.userId)}
                        disabled={
                          pending ||
                          (!selectedAvailable.includes(contact.userId) &&
                            selectedAvailable.length >=
                              50 - group.members.length)
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
                </div>
              </fieldset>
              <Button
                type="submit"
                size="sm"
                disabled={pending || !selectedAvailable.length}
              >
                <UserPlus aria-hidden="true" /> Einladen (
                {selectedAvailable.length})
              </Button>
            </form>
          )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="border-t pt-3">
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={pending}
            onClick={onLeave}
          >
            <LogOut aria-hidden="true" /> Gruppe verlassen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
