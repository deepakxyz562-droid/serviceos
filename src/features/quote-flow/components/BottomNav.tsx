"use client";
import { useAppStore, type Tab } from "@/features/quote-flow/store/app";
import { LayoutDashboard, ShoppingBag, Receipt, Users, MoreHorizontal } from "lucide-react";

interface NavItem {
  id: Tab;
  label: string;
  Icon: typeof Receipt;
}

const navTabs: NavItem[] = [
  { id: "home", label: "Today", Icon: LayoutDashboard },
  { id: "items", label: "Orders", Icon: ShoppingBag },
  { id: "invoices", label: "Billing", Icon: Receipt },
  { id: "customers", label: "Customers", Icon: Users },
  { id: "settings", label: "More", Icon: MoreHorizontal },
];

export function BottomNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-around px-2 pb-2 pt-2">
        {navTabs.map(({ id, label, Icon }) => {
          const active =
            activeTab === id ||
            (id === "home" && activeTab === "home") ||
            (id === "items" && activeTab === "items") ||
            (id === "invoices" && (activeTab === "invoices" || activeTab === "quotes" || activeTab === "estimates")) ||
            (id === "customers" && (activeTab === "customers" || activeTab === "clients")) ||
            (id === "settings" && (activeTab === "settings" || activeTab === "more"));

          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 transition ${
                active ? "text-blue-600" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  active ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight ${
                  active ? "text-blue-600 font-bold" : "text-stone-500"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
