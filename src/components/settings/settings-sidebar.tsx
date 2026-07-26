'use client';

/**
 * SettingsSidebar — left navigation for the 14 Business Owner settings
 * sections.
 *
 * Desktop (lg+): sticky left column with grouped sections.
 * Mobile (<lg): hidden by default; a "Section: X" button at the top
 *   opens a Sheet drawer with the same grouped list.
 *
 * Each section button shows: icon + label + (small) "Soon" badge if the
 * section is still a placeholder. The active section is highlighted with
 * the emerald accent used throughout the settings UI.
 */

import { useState } from 'react';
import { Menu, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSettingsIcon } from '@/components/settings/settings-icons';
import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from '@/components/settings/settings-config';

interface SettingsSidebarProps {
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
}

export function SettingsSidebar({ activeSectionId, onSelect }: SettingsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const businessSections = SETTINGS_SECTIONS.filter((s) => s.category === 'business');
  const activeSection = SETTINGS_SECTIONS.find((s) => s.id === activeSectionId);

  const handleSelect = (id: string) => {
    onSelect(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ─── Mobile: Sheet trigger ─────────────────────────────────────── */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between gap-2 h-11">
              <span className="flex items-center gap-2 min-w-0">
                <Menu className="size-4 shrink-0" />
                <span className="truncate">
                  {activeSection ? activeSection.label : 'Select section'}
                </span>
              </span>
              {activeSection?.comingSoon && (
                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                  Soon
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Building2 className="size-4 text-emerald-600" />
                  Settings
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-65px)]">
              <SidebarList
                sections={businessSections}
                activeSectionId={activeSectionId}
                onSelect={handleSelect}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {/* ─── Desktop: sticky aside ─────────────────────────────────────── */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-6">
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="size-4 text-emerald-600" />
                Business Settings
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                14 sections
              </p>
            </div>
            <ScrollArea className="h-[calc(100vh-180px)] min-h-[400px]">
              <SidebarList
                sections={businessSections}
                activeSectionId={activeSectionId}
                onSelect={handleSelect}
              />
            </ScrollArea>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Internal: section list (shared between desktop + mobile) ──────────────

interface SidebarListProps {
  sections: SettingsSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
}

function SidebarList({ sections, activeSectionId, onSelect }: SidebarListProps) {
  // Group sections into logical buckets so the list is scannable.
  // Buckets are derived from the section's position in the spec, not from
  // a separate `group` field — keeps the config simple.
  const groups: Array<{ label: string; sections: SettingsSection[] }> = [
    {
      label: 'Business',
      sections: sections.filter((s) =>
        ['company', 'marketplace', 'crm', 'jobs-scheduling', 'finance'].includes(s.id),
      ),
    },
    {
      label: 'People',
      sections: sections.filter((s) =>
        ['team', 'customers', 'communication'].includes(s.id),
      ),
    },
    {
      label: 'Platform',
      sections: sections.filter((s) =>
        ['ai', 'integrations', 'automations'].includes(s.id),
      ),
    },
    {
      label: 'Admin',
      sections: sections.filter((s) =>
        ['security', 'developer', 'billing'].includes(s.id),
      ),
    },
  ];

  return (
    <nav className="p-2 space-y-4" aria-label="Settings sections">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.sections.map((section) => {
              const Icon = getSettingsIcon(section.icon);
              const isActive = section.id === activeSectionId;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(section.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span className="flex-1 truncate">{section.label}</span>
                    {section.comingSoon && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${
                          isActive
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        Soon
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
