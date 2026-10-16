"use client";

import { useEffect } from "react";

export function useUnreadTabTitle(unreadCount: number) {
  useEffect(() => {
    let baseTitle = document.title;
    let renderedTitle = baseTitle;

    function updateTitle() {
      // Preserve title changes made by Next.js, including streamed metadata.
      if (document.title !== renderedTitle) baseTitle = document.title;

      const inactive =
        document.visibilityState !== "visible" || !document.hasFocus();
      renderedTitle =
        inactive && unreadCount > 0
          ? `(${unreadCount}) ${baseTitle}`
          : baseTitle;

      if (document.title !== renderedTitle) document.title = renderedTitle;
    }

    const observer = new MutationObserver(updateTitle);
    observer.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    window.addEventListener("focus", updateTitle);
    window.addEventListener("blur", updateTitle);
    document.addEventListener("visibilitychange", updateTitle);
    updateTitle();

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", updateTitle);
      window.removeEventListener("blur", updateTitle);
      document.removeEventListener("visibilitychange", updateTitle);
      if (document.title === renderedTitle) document.title = baseTitle;
    };
  }, [unreadCount]);
}
