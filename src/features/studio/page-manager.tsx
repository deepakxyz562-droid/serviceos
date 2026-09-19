'use client';

/**
 * Fieseros Universal Studio - Page Manager (Bottom Bar)
 * Multi-page navigation dock allowing page switching, page additions, and permissions.
 */

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Lock,
  Trash2,
  Settings,
  FileText,
  Calendar,
  Bot,
  Shield,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StudioPage } from '@/lib/studio/schema/project';
import { createStudioNode } from '@/lib/studio/engine/tree-engine';

interface PageManagerProps {
  pages: StudioPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: (page: StudioPage) => void;
  onDeletePage?: (pageId: string) => void;
}

export function StudioPageManager({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
}: PageManagerProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'blank' | 'form' | 'booking' | 'ai' | 'portal'>('blank');

  const handleCreatePage = () => {
    if (!newPageName.trim()) return;
    const ts = Date.now().toString(36);
    const slug = newPageName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    let rootNode = createStudioNode('container', {
      name: `${newPageName} Container`,
      children: [
        createStudioNode('heading', { props: { title: newPageName, htmlTag: 'h2' } }),
      ],
    });

    if (selectedTemplate === 'booking') {
      rootNode.children?.push(createStudioNode('booking_calendar', {}));
    } else if (selectedTemplate === 'ai') {
      rootNode.children?.push(createStudioNode('ai_chat_concierge', {}));
    } else if (selectedTemplate === 'portal') {
      rootNode.children?.push(createStudioNode('service_passport', {}));
      rootNode.children?.push(createStudioNode('data_table', {}));
    }

    const newPage: StudioPage = {
      id: `page_${ts}`,
      name: newPageName,
      slug,
      layoutType: 'standard',
      rootNode,
    };

    onAddPage(newPage);
    setNewPageName('');
    setAddModalOpen(false);
  };

  return (
    <>
      <div className="h-10 border-t border-border/80 bg-background px-3 flex items-center justify-between shrink-0 select-none z-20">
        {/* Left: Pages Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {pages.map((page) => {
            const isActive = page.id === activePageId;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectPage(page.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30 shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <span>{page.name}</span>
                {page.requiresAuth && <Lock className="size-3 text-amber-500" />}
              </button>
            );
          })}

          {/* Add Page Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="h-7 gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add Page</span>
          </Button>
        </div>

        {/* Right: Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
            {pages.length} Pages
          </Badge>
        </div>
      </div>

      {/* Add Page Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add New App Page</DialogTitle>
            <DialogDescription className="text-xs">
              Choose a page template and enter a name for your new screen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Page Title</label>
              <Input
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g. Services, Book Appointment, Customer Portal"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold">Page Template</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'blank', label: 'Blank Page', icon: FileText },
                  { id: 'booking', label: 'Booking Calendar', icon: Calendar },
                  { id: 'ai', label: 'AI Assistant', icon: Bot },
                  { id: 'portal', label: 'Customer Portal', icon: Shield },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      selectedTemplate === tpl.id
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border/60 hover:bg-muted/40'
                    }`}
                  >
                    <tpl.icon className="size-4" />
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreatePage}
                disabled={!newPageName.trim()}
                className="bg-primary text-primary-foreground font-bold"
              >
                Create Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
