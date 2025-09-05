// components/portal/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid, LineChart, Layers, GitBranch, FileSpreadsheet, Settings, CreditCard, ChevronDown, ChevronRight
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

const MAIN: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" />, exact: true },
  { href: "/app/waterfall", label: "Waterfall", icon: <LineChart className="h-4 w-4" /> },
  { href: "/app/consistency", label: "Consistency", icon: <Layers className="h-4 w-4" /> },
  { href: "/app/parallel", label: "Paralleldruk", icon: <GitBranch className="h-4 w-4" /> },
  { href: "/templates", label: "Templates", icon: <FileSpreadsheet className="h-4 w-4" /> },
];

const ADMIN: NavItem[] = [
  { href: "/billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/portal", label: "Instellingen", icon: <Settings className="h-4 w-4" /> },
];

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const Item = ({ item }: { item: NavItem }) => {
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border
          ${active ? "bg-sky-50 text-sky-700 border-sky-200" : "hover:bg-gray-50 border-transparent"}`}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  if (mobile) {
    return (
      <div className="p-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <span className="font-medium">Menu</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {open && (
          <div className="mt-2 grid gap-1">
            {MAIN.map((i) => <Item key={i.href} item={i} />)}
            <div className="h-2" />
            {ADMIN.map((i) => <Item key={i.href} item={i} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 px-2">Navigatie</div>
      <div className="grid gap-1">
        {MAIN.map((i) => <Item key={i.href} item={i} />)}
      </div>

      <div className="text-xs uppercase tracking-wide text-gray-500 px-2 mt-4">Beheer</div>
