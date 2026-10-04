import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

// Shared typography so text sizing stays consistent across all slides.
export const slideHeading = "text-6xl font-semibold";
export const slideSubheading = "text-3xl text-muted-foreground";
export const slideBody = "text-2xl";

export function SlideCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card>
      <CardContent
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center",
          className,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
