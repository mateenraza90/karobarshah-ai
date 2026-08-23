"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

export function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { close } = useSidebar();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={close}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-ledger-foreground/10 text-ledger-foreground"
          : "text-ledger-foreground/70 hover:bg-ledger-foreground/5 hover:text-ledger-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {isActive && <StatusDot tone="active" />}
      {item.status === "planned" && (
        <Badge variant="neutral" className="bg-ledger-foreground/10 text-ledger-foreground/75">
          Soon
        </Badge>
      )}
    </Link>
  );
}
