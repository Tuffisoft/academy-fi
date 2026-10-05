"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { createDocumentAction } from "@/lib/actions/departments.actions";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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

export function UploadDocumentDialog({
  departmentId,
}: {
  departmentId: string;
}) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, startTransition] = useTransition();
  const { startUpload, isUploading } = useUploadThing("departmentDocument");

  const isBusy = isUploading || isSaving;

  function handleSubmit(formData: FormData) {
    if (!file) {
      toast.error(t("documentFileRequired"));
      return;
    }
    const title = ((formData.get("title") as string) || file.name).trim();
    const note = formData.get("note") as string;

    startTransition(async () => {
      try {
        const uploaded = await startUpload([file]);
        const result = uploaded?.[0];
        if (!result) throw new Error("Upload failed");

        await createDocumentAction(departmentId, {
          title,
          note,
          fileUrl: result.ufsUrl,
          fileKey: result.key,
          fileName: result.name,
          fileSize: result.size,
        });
        toast.success(t("documentUploadSuccess"));
        setOpen(false);
        setFile(null);
        router.refresh();
      } catch {
        toast.error(t("documentUploadError"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Upload className="h-4 w-4" />
            {t("uploadDocument")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("documentUploadTitle")}</DialogTitle>
          <DialogDescription>{t("documentUploadDescription")}</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="document-file">
                {t("documentFile")}
              </FieldLabel>
              <Input
                id="document-file"
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-muted-foreground text-xs">
                {t("documentFileHelp")}
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="document-title">
                {t("resourceTitle")}
              </FieldLabel>
              <Input
                id="document-title"
                name="title"
                placeholder={file?.name ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="document-note">
                {t("resourceNote")}
              </FieldLabel>
              <Input id="document-note" name="note" />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isBusy || !file}>
              {isBusy ? t("uploading") : t("upload")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
