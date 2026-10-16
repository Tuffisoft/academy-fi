"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { LogOut, Pencil } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AvatarChangeDialog({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  const t = useTranslations("header");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isSaving, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing("profileImage");
  const isBusy = isUploading || isSaving;

  function handleOpenChange(nextOpen: boolean) {
    if (isBusy) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    startTransition(async () => {
      try {
        const uploaded = await startUpload([file]);
        const result = uploaded?.[0];
        if (!result) throw new Error("Profile image upload did not complete.");

        if (!result.serverData.oldImageDeleted) {
          toast.warning(t("profileImageCleanupError"));
        } else {
          toast.success(t("profileImageUpdated"));
        }

        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("profileImageUploadError"));
      } finally {
        setSelectedFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        aria-label={t("openProfileSettings")}
        title={t("openProfileSettings")}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar>
          <AvatarImage src={image ?? undefined} alt="" />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[18rem]">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("profileSettingsTitle")}</DialogTitle>
          <DialogDescription>{t("profileSettingsDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center px-6 pt-7 pb-6">
          <div className="relative">
            <Avatar size="lg" className="!size-24 text-xl">
              <AvatarImage src={image ?? undefined} alt="" />
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute -top-1 -right-1 rounded-full border shadow-sm"
              aria-label={t("profileImageLabel")}
              title={t("profileImageLabel")}
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <input
              ref={fileInputRef}
              id="profile-image"
              type="file"
              accept="image/*"
              disabled={isBusy}
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>
          <p className="mt-3 max-w-full truncate text-base font-medium">
            {name}
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {isBusy ? t("profileImageUploading") : selectedFileName || t("profileImageHelp")}
          </p>
        </div>
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start px-3"
            disabled={isBusy}
            onClick={handleSignOut}
          >
            <LogOut aria-hidden="true" />
            {tAuth("signOut")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
