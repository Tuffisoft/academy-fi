"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { deleteResourceAction } from "@/lib/actions/departments.actions";
import { Button } from "@/components/ui/button";

export function DeleteResourceButton({ resourceId }: { resourceId: string }) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteResourceAction(resourceId);
        router.refresh();
      } catch {
        toast.error(t("resourceDeleteError"));
      }
    });
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-6 text-muted-foreground hover:text-red-600"
      onClick={handleDelete}
      disabled={isPending}
    >
      <X className="h-3 w-3" />
      <span className="sr-only">{t("deleteResource")}</span>
    </Button>
  );
}
