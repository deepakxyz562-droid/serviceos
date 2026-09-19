'use client';

/**
 * Fieseros Universal Studio - Studio Shell
 * The complete 3-Panel Elementor Studio Engine hosting Elements, Canvas,
 * Inspector, Structure Navigator, Multi-Page Dock, and AI Copilot.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SquareDashed,
  Layers,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Palette,
  Sparkles,
  LayoutTemplate,
  ChevronDown,
  Eye,
  Save,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

import { StudioProject, StudioPage } from '@/lib/studio/schema/project';
import { StudioNode, StudioWidgetType } from '@/lib/studio/schema/node';
import {
  createStudioNode,
  insertNodeIntoTree,
  deleteNodeFromTree,
  duplicateNodeInTree,
  updateNodeProps,
  updateNodeStyle,
  updateNodeAdvanced,
  findNodeById,
} from '@/lib/studio/engine/tree-engine';
import { StudioHistoryManager } from '@/lib/studio/engine/history-engine';
import { LAYOUT_PRESETS } from '@/lib/studio/templates/layout-presets';

import { ElementsPanel } from './elements-panel';
import { StudioCanvas } from './canvas';
import { StudioInspector } from './inspector';
import { StudioNavigator } from './navigator';
import { StudioPageManager } from './page-manager';
import { StudioGlobalStylesModal } from './global-styles';
import { StudioAICopilot } from './ai-copilot';

interface StudioShellProps {
  initialProject: StudioProject;
  onSave?: (project: StudioProject) => void;
  onProjectChange?: (project: StudioProject) => void;
  brandColor?: string;
}

export function StudioShell({
  initialProject,
  onSave,
  onProjectChange,
  brandColor = '#059669',
}: StudioShellProps) {
  const [project, setProject] = useState<StudioProject>(initialProject);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showElementsPanel, setShowElementsPanel] = useState(true);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showGlobalStyles, setShowGlobalStyles] = useState(false);

  // History Manager for Undo/Redo
  const historyManager = useMemo(() => new StudioHistoryManager(initialProject), []);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update undo/redo availability
  const refreshHistoryStatus = useCallback(() => {
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());
  }, [historyManager]);

  const updateProjectWithHistory = useCallback(
    (newProject: StudioProject, description: string = 'Edit') => {
      setProject(newProject);
      historyManager.pushSnapshot(newProject, description);
      refreshHistoryStatus();
      if (onProjectChange) onProjectChange(newProject);
    },
    [historyManager, refreshHistoryStatus, onProjectChange]
  );

  const handleUndo = () => {
    const prev = historyManager.undo(project);
    if (prev) {
      setProject(prev);
      refreshHistoryStatus();
      if (onProjectChange) onProjectChange(prev);
      toast.info('Undo applied');
    }
  };

  const handleRedo = () => {
    const next = historyManager.redo();
    if (next) {
      setProject(next);
      refreshHistoryStatus();
      if (onProjectChange) onProjectChange(next);
      toast.info('Redo applied');
    }
  };

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project]);

  // Active page & Root Node
  const activePage = useMemo(
    () => project.pages.find((p) => p.id === project.activePageId) || project.pages[0],
    [project]
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !activePage) return null;
    return findNodeById(activePage.rootNode, selectedNodeId);
  }, [activePage, selectedNodeId]);

  // ── Node Actions ──
  const handleAddWidget = (widgetType: StudioWidgetType) => {
    const newNode = createStudioNode(widgetType);
    const targetParentId = selectedNode?.nodeType === 'container' ? selectedNode.id : activePage.rootNode.id;

    const updatedRoot = insertNodeIntoTree(activePage.rootNode, targetParentId, newNode);
    const updatedProject: StudioProject = {
      ...project,
      pages: project.pages.map((p) => (p.id === activePage.id ? { ...p, rootNode: updatedRoot } : p)),
    };

    updateProjectWithHistory(updatedProject, `Added ${newNode.name}`);
    setSelectedNodeId(newNode.id);
    toast.success(`Added ${newNode.name}`);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === activePage.rootNode.id) {
      toast.error('Cannot delete root container');
      return;
    }
    const updatedRoot = deleteNodeFromTree(activePage.rootNode, nodeId);
    const updatedProject: StudioProject = {
      ...project,
      pages: project.pages.map((p) => (p.id === activePage.id ? { ...p, rootNode: updatedRoot } : p)),
    };
    updateProjectWithHistory(updatedProject, 'Deleted Element');
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDuplicateNode = (nodeId: string) => {
    const { updatedRoot, newId } = duplicateNodeInTree(activePage.rootNode, nodeId);
    const updatedProject: StudioProject = {
      ...project,
      pages: project.pages.map((p) => (p.id === activePage.id ? { ...p, rootNode: updatedRoot } : p)),
    };
    updateProjectWithHistory(updatedProject, 'Duplicated Element');
    if (newId) setSelectedNodeId(newId);
    toast.success('Duplicated element');
  };

  const handleUpdateProps = (propsUpdate: Record<string, any>) => {
    if (!selectedNodeId) return;
    const updatedRoot = updateNodeProps(activePage.rootNode, selectedNodeId, propsUpdate);
    const updatedProject: StudioProject = {
      ...project,
      pages: project.pages.map((p) => (p.id === activePage.id ? { ...p, rootNode: updatedRoot } : p)),
    };
    updateProjectWithHistory(updatedProject, 'Updated Props');
  };

  const handleUpdateStyle = (styleUpdate: Record<string, any>) => {
    if (!selectedNodeId) return;
    const updatedRoot = updateNodeStyle(activePage.rootNode, selectedNodeId, styleUpdate);
    const updatedProject: StudioProject = {
      ...project,
      pages: project.pages.map((p) => (p.id === activePage.id ? { ...p, rootNode: updatedRoot } : p)),
    };
    updateProjectWithHistory(updatedProject, 'Updated Style');
  };

  const handleUpdateAdvanced = (advancedUpdate: Record<string, any>) => {
    if (!selectedNodeId) return;
    const updatedRoot = updateNodeAdvanced(activePage.rootNode, selectedNodeId, advancedUpdate);
    const updatedProject: StudioProject = {
      ...project,
      pages: project.pages.map((p) => (p.id === activePage.id ? { ...p, rootNode: updatedRoot } : p)),
    };
    updateProjectWithHistory(updatedProject, 'Updated Advanced');
  };

  // Layout Presets Loader
  const handleApplyPreset = (presetId: string) => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newRoot = preset.createTree(project.name, project.globalTheme.primaryColor);
    const updatedProject: StudioProject = {
      ...project,
      pages: project.pages.map((p) => (p.id === activePage.id ? { ...p, rootNode: newRoot } : p)),
    };
    updateProjectWithHistory(updatedProject, `Applied ${preset.name}`);
    toast.success(`Loaded "${preset.name}" preset!`);
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-background select-none relative">
      {/* ─── 1. ELEMENTOR SUB-BAR (Add Element, Navigator, Undo/Redo, Responsive, Presets, AI) ─── */}
      <div className="h-11 border-b border-border/80 bg-background px-3 flex items-center justify-between shrink-0 z-30">
        {/* Left Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={showElementsPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowElementsPanel((v) => !v)}
            className="h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer"
          >
            <SquareDashed className="size-3.5" />
            <span>+ Add Element</span>
          </Button>

          <Button
            type="button"
            variant={showNavigator ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowNavigator((v) => !v)}
            className="h-8 gap-1.5 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Layers className="size-3.5" />
            <span>Navigator</span>
          </Button>

          {/* Undo / Redo */}
          <div className="flex items-center border border-border/80 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1.5 hover:bg-muted disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1.5 hover:bg-muted disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-l border-border/80"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Responsive Viewport Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              viewport === 'desktop'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="size-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              viewport === 'tablet'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tablet className="size-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              viewport === 'mobile'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="size-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Right Actions: Layout Presets & Global Theme */}
        <div className="flex items-center gap-1.5">
          {/* Layout Presets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-semibold rounded-xl cursor-pointer">
                <LayoutTemplate className="size-3.5 text-primary" />
                <span>Layout Presets</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1">
              {LAYOUT_PRESETS.map((lp) => (
                <DropdownMenuItem
                  key={lp.id}
                  onClick={() => handleApplyPreset(lp.id)}
                  className="flex flex-col items-start gap-0.5 p-2 rounded-lg cursor-pointer"
                >
                  <span className="text-xs font-bold text-foreground">{lp.name}</span>
                  <span className="text-[10px] text-muted-foreground">{lp.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Global Styles */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowGlobalStyles(true)}
            className="h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer"
          >
            <Palette className="size-3.5 text-primary" />
            <span>Site Styles</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. MAIN 3-PANEL WORKSPACE (Elements Panel | Canvas | Inspector) ─── */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full">
        {/* Left: Elements Panel */}
        {showElementsPanel && (
          <ElementsPanel
            onAddWidget={handleAddWidget}
            onClose={() => setShowElementsPanel(false)}
          />
        )}

        {/* Center: Interactive Visual Canvas */}
        <StudioCanvas
          rootNode={activePage.rootNode}
          selectedNodeId={selectedNodeId}
          viewport={viewport}
          onSelectNode={setSelectedNodeId}
          onDeleteNode={handleDeleteNode}
          onDuplicateNode={handleDuplicateNode}
          onAddChildNode={(parentId) => {
            setSelectedNodeId(parentId);
            setShowElementsPanel(true);
          }}
          brandColor={project.globalTheme.primaryColor}
        />

        {/* Right: Contextual Inspector */}
        <StudioInspector
          selectedNode={selectedNode}
          onUpdateProps={handleUpdateProps}
          onUpdateStyle={handleUpdateStyle}
          onUpdateAdvanced={handleUpdateAdvanced}
          onDeleteNode={() => selectedNodeId && handleDeleteNode(selectedNodeId)}
          onDuplicateNode={() => selectedNodeId && handleDuplicateNode(selectedNodeId)}
          brandColor={project.globalTheme.primaryColor}
        />

        {/* Floating Structure Navigator (Draggable / Toggleable) */}
        {showNavigator && (
          <div className="absolute top-4 left-84 z-40">
            <StudioNavigator
              rootNode={activePage.rootNode}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onDeleteNode={handleDeleteNode}
              onDuplicateNode={handleDuplicateNode}
              onToggleVisibility={(nodeId) => {
                const node = findNodeById(activePage.rootNode, nodeId);
                if (node) {
                  handleUpdateAdvanced({ isHidden: !node.advanced?.isHidden });
                }
              }}
              onToggleLock={(nodeId) => {
                const node = findNodeById(activePage.rootNode, nodeId);
                if (node) {
                  handleUpdateAdvanced({ isLocked: !node.advanced?.isLocked });
                }
              }}
              onClose={() => setShowNavigator(false)}
            />
          </div>
        )}
      </div>

      {/* ─── 3. BOTTOM MULTI-PAGE MANAGER DOCK ─── */}
      <StudioPageManager
        pages={project.pages}
        activePageId={project.activePageId}
        onSelectPage={(pageId) => {
          setProject((prev) => ({ ...prev, activePageId: pageId }));
          setSelectedNodeId(null);
        }}
        onAddPage={(newPage) => {
          const updatedProject: StudioProject = {
            ...project,
            pages: [...project.pages, newPage],
            activePageId: newPage.id,
          };
          updateProjectWithHistory(updatedProject, `Created page ${newPage.name}`);
        }}
      />

      {/* ─── 4. FLOATING AI COPILOT ─── */}
      <StudioAICopilot
        project={project}
        onApplyMutation={(mutated, desc) => {
          updateProjectWithHistory(mutated, desc);
        }}
      />

      {/* Global Styles Modal */}
      <StudioGlobalStylesModal
        open={showGlobalStyles}
        onOpenChange={setShowGlobalStyles}
        globalTheme={project.globalTheme}
        onUpdateGlobalTheme={(updates) => {
          const updatedProject: StudioProject = {
            ...project,
            globalTheme: { ...project.globalTheme, ...updates },
          };
          updateProjectWithHistory(updatedProject, 'Updated Global Theme');
        }}
      />
    </div>
  );
}
