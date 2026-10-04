"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteDepartmentAction } from "@/lib/actions/departments.actions";
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

export function DeleteDepartmentButton({
  departmentId,
  name,
}: {
  departmentId: string;
  name: string;
}) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteDepartmentAction(departmentId);
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
            <span className="sr-only">{t("deleteDepartment")}</span>
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
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? t("deleting") : t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
