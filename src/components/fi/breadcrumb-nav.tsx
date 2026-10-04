import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

type Breadcrumb = {
  label: string;
  href?: string;
};

export function BreadcrumbNav({ items }: { items: Breadcrumb[] }) {
  return (
    <nav className="flex items-center gap-2 mb-6 text-sm">
      <Link href="/dashboard" className="text-primary hover:underline">
        Dashboard
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {item.href ? (
            <Link href={item.href} className="text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
