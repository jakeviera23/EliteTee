import { useEffect } from "react";

/** Set document title and meta description for public marketing/legal pages. */
export function usePageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? null;
    if (meta) {
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription != null) {
        meta.setAttribute("content", previousDescription);
      }
    };
  }, [title, description]);
}
