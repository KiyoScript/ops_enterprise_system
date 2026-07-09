"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Back navigation for detail/form pages. Uses browser history when the user
 * navigated here from inside the app (preserves list filters/scroll), and
 * falls back to an explicit route when the page was opened directly.
 */
export function BackButton({
  fallbackHref,
  label,
}: {
  fallbackHref: string;
  label: string;
}) {
  const router = useRouter();

  const goBack = () => {
    const cameFromApp =
      typeof document !== "undefined" &&
      document.referrer.startsWith(window.location.origin) &&
      window.history.length > 1;
    if (cameFromApp) router.back();
    else router.push(fallbackHref);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goBack}
      className="-ml-2 w-fit text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon /> {label}
    </Button>
  );
}
