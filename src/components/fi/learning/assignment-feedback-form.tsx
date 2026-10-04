"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { addMentorFeedbackAction } from "@/lib/actions/assignments.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AssignmentFeedbackForm({
  reflectionId,
}: {
  reflectionId: string;
}) {
  const t = useTranslations("planner");
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      try {
        await addMentorFeedbackAction(reflectionId, message);
        setMessage("");
        toast.success(t("feedbackSuccess"));
        router.refresh();
      } catch {
        toast.error(t("feedbackError"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={t("feedbackPlaceholder")}
      />
      <Button
        size="sm"
        className="self-start"
        disabled={isPending || message.trim().length === 0}
        onClick={handleSubmit}
      >
        {isPending ? t("saving") : t("addFeedback")}
      </Button>
    </div>
  );
}
