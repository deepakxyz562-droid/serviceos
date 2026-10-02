/**
 * Shared Template Theme definitions for web and mobile.
 * Resolves template IDs (catalog composite IDs or short native names) to colors and styles.
 */

export interface TemplateTheme {
  id: string;
  name: string;
  accent: string;
  lightAccent: string;
  gridBorderColor: string;
}

export function getTemplateTheme(templateId?: string | null, fallback = "classic-corporate-blue"): TemplateTheme {
  const cleanId = (templateId || fallback).includes(":")
    ? templateId!.split(":").pop()!
    : (templateId || fallback);

  const map: Record<string, TemplateTheme> = {
    "classic-corporate-blue": {
      id: "classic-corporate-blue",
      name: "Corporate Blue",
      accent: "#2563eb",
      lightAccent: "#eff6ff",
      gridBorderColor: "#cbd5e1",
    },
    modern: {
      id: "modern",
      name: "Modern",
      accent: "#2563eb",
      lightAccent: "#eff6ff",
      gridBorderColor: "#cbd5e1",
    },
    "soft-emerald-wave": {
      id: "soft-emerald-wave",
      name: "Emerald Wave",
      accent: "#059669",
      lightAccent: "#ecfdf5",
      gridBorderColor: "#a7f3d0",
    },
    "geometric-bold-green": {
      id: "geometric-bold-green",
      name: "Bold Green",
      accent: "#10b981",
      lightAccent: "#ecfdf5",
      gridBorderColor: "#6ee7b7",
    },
    "slate-geometric": {
      id: "slate-geometric",
      name: "Slate Corporate",
      accent: "#1e293b",
      lightAccent: "#f1f5f9",
      gridBorderColor: "#94a3b8",
    },
    "minimal-clean": {
      id: "minimal-clean",
      name: "Minimal Clean",
      accent: "#18181b",
      lightAccent: "#f4f4f5",
      gridBorderColor: "#e4e4e7",
    },
    simple: {
      id: "simple",
      name: "Simple",
      accent: "#374151",
      lightAccent: "#f3f4f6",
      gridBorderColor: "#d1d5db",
    },
    "mesh-polygonal": {
      id: "mesh-polygonal",
      name: "Polygonal Mesh",
      accent: "#7c3aed",
      lightAccent: "#f5f3ff",
      gridBorderColor: "#ddd6fe",
    },
    creative: {
      id: "creative",
      name: "Creative",
      accent: "#9333ea",
      lightAccent: "#faf5ff",
      gridBorderColor: "#e9d5ff",
    },
    "golden-luxury": {
      id: "golden-luxury",
      name: "Golden Luxury",
      accent: "#d97706",
      lightAccent: "#fffbeb",
      gridBorderColor: "#fde68a",
    },
    professional: {
      id: "professional",
      name: "Professional",
      accent: "#1e40af",
      lightAccent: "#eff6ff",
      gridBorderColor: "#bfdbfe",
    },
    corporate: {
      id: "corporate",
      name: "Corporate",
      accent: "#0284c7",
      lightAccent: "#f0f9ff",
      gridBorderColor: "#bae6fd",
    },
    editorial: {
      id: "editorial",
      name: "Editorial",
      accent: "#b45309",
      lightAccent: "#fffbeb",
      gridBorderColor: "#fde68a",
    },
    classic: {
      id: "classic",
      name: "Classic",
      accent: "#1d4ed8",
      lightAccent: "#eff6ff",
      gridBorderColor: "#bfdbfe",
    },
    international: {
      id: "international",
      name: "International",
      accent: "#059669",
      lightAccent: "#ecfdf5",
      gridBorderColor: "#a7f3d0",
    },
    bold: {
      id: "bold",
      name: "Bold",
      accent: "#dc2626",
      lightAccent: "#fef2f2",
      gridBorderColor: "#fecaca",
    },
  };

  return map[cleanId] || map[fallback] || map["classic-corporate-blue"];
}
