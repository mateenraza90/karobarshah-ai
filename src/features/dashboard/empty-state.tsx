import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-ledger/10">
          <Icon className="size-6 text-ledger" aria-hidden="true" />
        </div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
