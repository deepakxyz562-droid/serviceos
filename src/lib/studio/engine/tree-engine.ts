/**
 * Fieseros Universal Studio - Tree Engine
 * High-performance immutable AST node operations for adding, updating,
 * moving, duplicating, and deleting Elementor containers and widgets.
 */

import { StudioNode, StudioWidgetType } from '../schema/node';
import { WIDGET_MANIFESTS } from '../schema/widget';

export function createStudioNode(
  widgetType: StudioWidgetType,
  overrides?: Partial<StudioNode>
): StudioNode {
  const manifest = WIDGET_MANIFESTS[widgetType] || WIDGET_MANIFESTS.container;
  const timestamp = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const id = overrides?.id || `${widgetType}_${timestamp}`;

  return {
    id,
    name: overrides?.name || manifest.name,
    nodeType: manifest.isContainer ? 'container' : 'widget',
    widgetType,
    category: manifest.category,
    parentId: overrides?.parentId || null,
    children: manifest.isContainer ? overrides?.children || [] : undefined,
    props: { ...manifest.defaultProps, ...(overrides?.props || {}) },
    style: { ...(manifest.defaultStyle || {}), ...(overrides?.style || {}) },
    advanced: overrides?.advanced || {},
  };
}

export function findNodeById(root: StudioNode, targetId: string): StudioNode | null {
  if (!root) return null;
  if (root.id === targetId) return root;
  if (root.children && root.children.length > 0) {
    for (const child of root.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function findParentNode(root: StudioNode, targetId: string): StudioNode | null {
  if (!root || !root.children) return null;
  for (const child of root.children) {
    if (child.id === targetId) return root;
    const foundInChild = findParentNode(child, targetId);
    if (foundInChild) return foundInChild;
  }
  return null;
}

export function getNodePath(root: StudioNode, targetId: string, currentPath: StudioNode[] = []): StudioNode[] | null {
  if (!root) return null;
  const path = [...currentPath, root];
  if (root.id === targetId) return path;
  if (root.children) {
    for (const child of root.children) {
      const res = getNodePath(child, targetId, path);
      if (res) return res;
    }
  }
  return null;
}

export function updateNodeInTree(
  root: StudioNode,
  targetId: string,
  updater: (node: StudioNode) => StudioNode
): StudioNode {
  if (root.id === targetId) {
    return updater(root);
  }
  if (!root.children || root.children.length === 0) {
    return root;
  }
  return {
    ...root,
    children: root.children.map((child) => updateNodeInTree(child, targetId, updater)),
  };
}

export function updateNodeProps(root: StudioNode, targetId: string, propsUpdate: Record<string, any>): StudioNode {
  return updateNodeInTree(root, targetId, (node) => ({
    ...node,
    props: { ...node.props, ...propsUpdate },
  }));
}

export function updateNodeStyle(root: StudioNode, targetId: string, styleUpdate: Record<string, any>): StudioNode {
  return updateNodeInTree(root, targetId, (node) => ({
    ...node,
    style: { ...node.style, ...styleUpdate },
  }));
}

export function updateNodeAdvanced(root: StudioNode, targetId: string, advancedUpdate: Record<string, any>): StudioNode {
  return updateNodeInTree(root, targetId, (node) => ({
    ...node,
    advanced: { ...(node.advanced || {}), ...advancedUpdate },
  }));
}

export function insertNodeIntoTree(
  root: StudioNode,
  targetParentId: string,
  newNode: StudioNode,
  index?: number
): StudioNode {
  if (root.id === targetParentId) {
    const currentChildren = root.children || [];
    const updatedChildren =
      index !== undefined && index >= 0 && index <= currentChildren.length
        ? [...currentChildren.slice(0, index), { ...newNode, parentId: targetParentId }, ...currentChildren.slice(index)]
        : [...currentChildren, { ...newNode, parentId: targetParentId }];
    return {
      ...root,
      children: updatedChildren,
    };
  }
  if (!root.children || root.children.length === 0) {
    return root;
  }
  return {
    ...root,
    children: root.children.map((child) => insertNodeIntoTree(child, targetParentId, newNode, index)),
  };
}

export function deleteNodeFromTree(root: StudioNode, targetId: string): StudioNode {
  if (!root.children) return root;
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== targetId)
      .map((child) => deleteNodeFromTree(child, targetId)),
  };
}

export function duplicateNodeInTree(root: StudioNode, targetId: string): { updatedRoot: StudioNode; newId: string | null } {
  let createdId: string | null = null;

  const cloneWithNewIds = (node: StudioNode): StudioNode => {
    const newId = `${node.widgetType}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    if (!createdId) createdId = newId;
    return {
      ...node,
      id: newId,
      name: `${node.name} (Copy)`,
      children: node.children ? node.children.map(cloneWithNewIds) : undefined,
    };
  };

  const processChildren = (children: StudioNode[]): StudioNode[] => {
    const result: StudioNode[] = [];
    for (const child of children) {
      result.push(
        child.children ? { ...child, children: processChildren(child.children) } : child
      );
      if (child.id === targetId) {
        result.push(cloneWithNewIds(child));
      }
    }
    return result;
  };

  if (!root.children) return { updatedRoot: root, newId: null };

  const updatedRoot = {
    ...root,
    children: processChildren(root.children),
  };

  return { updatedRoot, newId: createdId };
}

export function moveNodeInTree(
  root: StudioNode,
  draggedId: string,
  targetParentId: string,
  targetIndex?: number
): StudioNode {
  const nodeToMove = findNodeById(root, draggedId);
  if (!nodeToMove) return root;

  // 1. Remove node from previous location
  const treeWithoutNode = deleteNodeFromTree(root, draggedId);

  // 2. Insert into new parent at specified index
  return insertNodeIntoTree(treeWithoutNode, targetParentId, nodeToMove, targetIndex);
}
