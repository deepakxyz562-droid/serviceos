'use client';

import { FolderOpen, Plus, Search, FileText, Upload, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function DocumentCenterView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <FolderOpen className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Document Center</h2>
            <p className="text-sm text-muted-foreground">Store and manage business documents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Upload className="size-4 mr-1.5" /> Upload</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" /> New Folder</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FileText className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Documents</p>
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
                <p className="text-xs text-muted-foreground">Folders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Upload className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Uploads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Download className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Downloads</p>
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
            <Input placeholder="Search documents..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Placeholder */}
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FolderOpen className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">Document Center</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Upload, organize, and share business documents securely. Create folders,
              manage permissions, and keep all your important files in one central location.
            </p>
            <div className="flex gap-2">
              <Button variant="outline"><Upload className="size-4 mr-1.5" /> Upload Files</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" /> New Folder</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
