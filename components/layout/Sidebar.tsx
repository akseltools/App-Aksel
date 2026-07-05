/**
 * components/layout/Sidebar.tsx
 * Main navigation sidebar.
 * - Role-aware: admin-only items are hidden for representatives
 * - Active route highlighted in red
 * - Collapsible on mobile (icon-only)
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Store,
  Calculator,
  ShoppingCart,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Navigation item definition ───────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean; // Hide from representatives if true
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Estoque",
    href: "/dashboard/inventory",
    icon: Package,
  },
  {
    label: "Movimentações",
    href: "/dashboard/movements",
    icon: ArrowLeftRight,
  },
  {
    label: "Consignação",
    href: "/dashboard/consignment",
    icon: Store,
  },
  {
    label: "Fechamento",
    href: "/dashboard/closing",
    icon: Calculator,
    adminOnly: true, // Financial closing: admin only
  },
  {
    label: "Vendas",
    href: "/dashboard/sales",
    icon: ShoppingCart,
  },
  {
    label: "Usuários",
    href: "/dashboard/users",
    icon: Users,
    adminOnly: true, // PIN management: admin only
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface SidebarProps {
  userRole: "admin" | "representative";
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Filter nav items based on role
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#111111] border-r border-[#1f1f1f]",
        "transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex items-center border-b border-[#1f1f1f] shrink-0",
          collapsed ? "justify-center px-2 py-4" : "px-4 py-4"
        )}
      >
        {!collapsed && (
          <Image
            src="/logo.png"
            alt="Aksel Tools"
            width={140}
            height={44}
            priority
            className="object-contain"
          />
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-aksel-600 rounded-md flex items-center justify-center font-bold text-white text-sm">
            A
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        aria-label="Navegação principal"
        className="flex-1 py-4 px-2 space-y-1 overflow-y-auto"
      >
        {visibleItems.map((item) => {
          // Exact match for dashboard, prefix match for sub-routes
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "flex items-center rounded-md text-sm font-medium",
                "transition-all duration-150 ease-out cursor-pointer",
                "min-h-[44px]", // WCAG touch target
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "text-aksel-400 bg-aksel-950/50 border-l-2 border-l-aksel-500"
                  : "text-zinc-500 hover:text-white hover:bg-[#1a1a1a]"
              )}
            >
              <Icon
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  collapsed ? "h-5 w-5" : "h-4 w-4",
                  isActive ? "text-aksel-500" : "text-zinc-500"
                )}
                aria-hidden="true"
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle button */}
      <div className="border-t border-[#1f1f1f] p-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "flex items-center justify-center w-full rounded-md",
            "min-h-[44px] text-zinc-500 hover:text-white hover:bg-[#1a1a1a]",
            "transition-all duration-150"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          {!collapsed && (
            <span className="ml-2 text-xs font-medium">Recolher</span>
          )}
        </button>
      </div>
    </aside>
  );
}
