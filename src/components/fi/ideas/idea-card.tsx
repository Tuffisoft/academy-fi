"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import {
  addIdeaNoteAction,
  deleteIdeaAction,
  deleteIdeaNoteAction,
} from "@/lib/actions/ideas.actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  authorId: string | null;
  createdAt: Date;
  author: { name: string } | null;
  notes: Array<{
    id: string;
    content: string;
    authorId: string | null;
    createdAt: Date;
    author: { name: string } | null;
  }>;
};

export function IdeaCard({
  idea,
  userId,
  isOwner,
}: {
  idea: Idea;
  userId: string;
  isOwner: boolean;
}) {
  const t = useTranslations("ideas");
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  const canDeleteIdea = isOwner || idea.authorId === userId;
  const formatDate = (date: Date) =>
    format.dateTime(date, { dateStyle: "medium" });

  function handleAddNote() {
    const content = note.trim();
    if (!content) return;

    startTransition(async () => {
      try {
        await addIdeaNoteAction(idea.id, content);
        setNote("");
        router.refresh();
      } catch {
        toast.error(t("noteAddError"));
      }
    });
  }

  function handleDeleteNote(noteId: string) {
    startTransition(async () => {
      try {
        await deleteIdeaNoteAction(noteId);
        router.refresh();
      } catch {
        toast.error(t("noteDeleteError"));
      }
    });
  }

  function handleDeleteIdea() {
    startTransition(async () => {
      try {
        await deleteIdeaAction(idea.id);
        toast.success(t("deleteSuccess"));
        router.refresh();
      } catch {
        toast.error(t("deleteError"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{idea.title}</CardTitle>
        <CardDescription>
          {t("byAuthor", { name: idea.author?.name ?? t("formerMember") })} •{" "}
          {formatDate(idea.createdAt)}
        </CardDescription>
        {/* Delete: owner or the idea's author */}
        {canDeleteIdea && (
          <CardAction>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t("deleteIdea")}</span>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("deleteTitle", { title: idea.title })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteIdea}
                    disabled={isPending}
                  >
                    {t("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {idea.description && (
          <p className="whitespace-pre-wrap text-sm">{idea.description}</p>
        )}

        {/* Notes thread */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {t("notesTitle", { count: idea.notes.length })}
          </h3>
          {idea.notes.length === 0 && (
            <p className="text-muted-foreground text-sm">{t("noNotes")}</p>
          )}
          {idea.notes.map((n) => (
            <div
              key={n.id}
              className="bg-muted/50 flex items-start justify-between gap-2 rounded-lg p-3"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {n.author?.name ?? t("formerMember")} •{" "}
                  {formatDate(n.createdAt)}
                </p>
              </div>
              {(isOwner || n.authorId === userId) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground size-6 shrink-0 hover:text-red-600"
                  onClick={() => handleDeleteNote(n.id)}
                  disabled={isPending}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">{t("deleteNote")}</span>
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add note */}
        <div className="flex flex-col gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            className="min-h-16 text-sm"
          />
          <Button
            size="sm"
            className="self-start"
            onClick={handleAddNote}
            disabled={isPending || !note.trim()}
          >
            {t("addNote")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
