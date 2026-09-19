/**
 * Fieseros Universal Studio - History Engine
 * Time-travel Undo/Redo stack manager with snapshot diffing and keyboard shortcuts.
 */

import { StudioProject } from '../schema/project';

export interface HistorySnapshot {
  timestamp: number;
  description: string;
  project: StudioProject;
}

export class StudioHistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxHistory: number = 50;

  constructor(initialProject?: StudioProject) {
    if (initialProject) {
      this.pushSnapshot(initialProject, 'Initial State');
    }
  }

  public pushSnapshot(project: StudioProject, description: string = 'Edit'): void {
    // Deep clone snapshot
    const snapshot: HistorySnapshot = {
      timestamp: Date.now(),
      description,
      project: JSON.parse(JSON.stringify(project)),
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // Clear redo stack on new user action
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(currentProject: StudioProject): StudioProject | null {
    if (!this.canUndo()) return null;

    const currentSnapshot = this.undoStack.pop();
    if (currentSnapshot) {
      this.redoStack.push(currentSnapshot);
    }

    const previousSnapshot = this.undoStack[this.undoStack.length - 1];
    return previousSnapshot ? JSON.parse(JSON.stringify(previousSnapshot.project)) : null;
  }

  public redo(): StudioProject | null {
    if (!this.canRedo()) return null;

    const nextSnapshot = this.redoStack.pop();
    if (!nextSnapshot) return null;

    this.undoStack.push(nextSnapshot);
    return JSON.parse(JSON.stringify(nextSnapshot.project));
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
