'use client';

import { BookMarked, Plus, Search, FileText, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function KnowledgeBaseView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <BookMarked className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">Create and manage help articles and documentation</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" /> New Article</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FileText className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Articles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FolderOpen className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BookMarked className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search knowledge base articles..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Placeholder */}
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <BookMarked className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">Knowledge Base</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Build a comprehensive knowledge base with articles, FAQs, and guides.
              Help your team and customers find answers quickly with organized documentation.
            </p>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" /> Create Article</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
