"use client";
import { useAppStore, type Tab } from "@/features/quote-flow/store/app";
import { Home as HomeIcon, FileText, Receipt, Users, Settings } from "lucide-react";

const tabs: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "quotes", label: "Quotes", Icon: FileText },
  { id: "invoices", label: "Invoices", Icon: Receipt },
  { id: "customers", label: "Customers", Icon: Users },
  { id: "settings", label: "Settings", Icon: Settings },
];

export function BottomNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-2 pt-2">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition ${
                active ? "text-emerald-600" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] font-medium ${active ? "text-emerald-600" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
