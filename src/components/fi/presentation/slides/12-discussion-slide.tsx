"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  SlideCard,
  slideHeading,
  slideSubheading,
} from "@/components/fi/presentation/slide-card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AutoReveal,
  ClickReveal,
  ClickSteps,
} from "@/components/fi/presentation/reveal";
import {
  getDiscussionNoteAction,
  saveDiscussionNoteAction,
} from "@/lib/actions/discussion-notes.actions";

const SAVE_DELAY_MS = 800;

export function DiscussionSlide() {
  const t = useTranslations("presentation.discussion");
  const prompts = t.raw("prompts") as string[];
  const totalSteps = prompts.length + 1;
  const [notes, setNotes] = useState("");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Loads the signed-in user's saved notes from the database.
  useEffect(() => {
    getDiscussionNoteAction().then(setNotes);
  }, []);

  const handleChange = (value: string) => {
    setNotes(value);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveDiscussionNoteAction(value);
    }, SAVE_DELAY_MS);
  };

  return (
    <SlideCard className="relative items-stretch justify-center overflow-hidden text-left">
      <ClickSteps
        className="relative flex w-full flex-1 flex-col gap-4"
        maxSteps={totalSteps}
      >
        <AutoReveal index={0}>
          <h2 className={slideHeading}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className={slideSubheading}>{t("subheading")}</p>
        </AutoReveal>
        <ul className="relative flex flex-col gap-2">
          {prompts.map((prompt, index) => (
            <ClickReveal at={index + 1} key={prompt}>
              <li className="text-xl">{prompt}</li>
            </ClickReveal>
          ))}
        </ul>
        <ClickReveal at={totalSteps}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discussion-notes">{t("notesLabel")}</Label>
            <Textarea
              id="discussion-notes"
              value={notes}
              onChange={(event) => handleChange(event.target.value)}
              onBlur={() => saveDiscussionNoteAction(notes)}
              placeholder={t("notesPlaceholder")}
              className="pointer-events-auto"
            />
          </div>
        </ClickReveal>
      </ClickSteps>
    </SlideCard>
  );
}
