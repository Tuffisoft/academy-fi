"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteUserAction } from "@/lib/actions/users.actions";
import { Button } from "@/components/ui/button";
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

export function DeleteUserButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const t = useTranslations("users");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteUserAction(userId);
        toast.success(t("deleteSuccess"));
        router.refresh();
      } catch {
        toast.error(t("deleteError"));
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">{t("deleteUser")}</span>
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle", { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleDelete}>
            {isPending ? t("deleting") : t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
