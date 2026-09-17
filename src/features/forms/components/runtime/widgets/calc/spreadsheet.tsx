'use client';

import React, { useMemo } from 'react';
import { Table, Sigma, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '../widget-props';

type Cell = string | number;
type Grid = Cell[][];

function parseNumber(v: Cell): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function applyFormula(raw: string, grid: Grid, row: number, col: number): number {
  const expr = raw.toUpperCase().trim();
  const operandCells = grid[row]?.filter((_, i) => i !== col) || [];
  const columnCells = grid.map((r) => r[col]).filter((_, i) => i !== row);
  if (expr === 'SUM' || expr === '=SUM') return operandCells.reduce((s, c) => s + parseNumber(c), 0);
  if (expr === 'AVG' || expr === '=AVG' || expr === 'AVERAGE')
    return operandCells.length ? operandCells.reduce((s, c) => s + parseNumber(c), 0) / operandCells.length : 0;
  if (expr === 'PRODUCT')
    return operandCells.reduce((p, c) => p * parseNumber(c), 1);
  if (expr === 'MIN') return Math.min(...operandCells.map(parseNumber));
  if (expr === 'MAX') return Math.max(...operandCells.map(parseNumber));
  if (expr === 'COUNT') return operandCells.length;
  if (expr === 'COLSUM' || expr === 'CSUM') return columnCells.reduce((s, c) => s + parseNumber(c), 0);
  if (expr === 'COLAVG' || expr === 'CAVG')
    return columnCells.length ? columnCells.reduce((s, c) => s + parseNumber(c), 0) / columnCells.length : 0;
  return parseNumber(raw);
}

function isFormula(v: Cell): boolean {
  return typeof v === 'string' && v.toUpperCase().match(/^(=?(SUM|AVG|AVERAGE|PRODUCT|MIN|MAX|COUNT|COLSUM|CSUM|COLAVG|CAVG))$/) !== null;
}

export function Spreadsheet({ value, onChange, config, disabled, field }: WidgetProps) {
  const rows = Number(config.rows) || 4;
  const cols = Number(config.cols) || 4;

  const grid: Grid = useMemo(() => {
    if (Array.isArray(value) && value.length) {
      const g = (value as Grid).map((r) => (Array.isArray(r) ? r : []));
      while (g.length < rows) g.push(Array.from({ length: cols }, () => ''));
      return g.map((r) => {
        const copy = [...r];
        while (copy.length < cols) copy.push('');
        return copy;
      });
    }
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
  }, [value, rows, cols]);

  function setCell(r: number, c: number, v: string) {
    const next = grid.map((row) => [...row]);
    next[r][c] = v;
    onChange(next);
  }

  function addRow() {
    onChange([...grid, Array.from({ length: cols }, () => '')]);
  }

  function removeRow(r: number) {
    if (grid.length <= 1) return;
    onChange(grid.filter((_, i) => i !== r));
  }

  const colLabel = (i: number) => String.fromCharCode(65 + i);

  return (
    <div className="space-y-2" aria-label={String(field?.['label'] ?? 'Spreadsheet')}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Table className="size-3.5" /> Supports SUM, AVG, PRODUCT, MIN, MAX, COUNT, COLSUM, COLAVG
      </div>
      <div className="border border-border/70 rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-8 px-1 py-1 text-[10px] font-bold text-muted-foreground">#</th>
              {Array.from({ length: cols }).map((_, c) => (
                <th key={c} className="px-1 py-1 text-[10px] font-bold text-muted-foreground text-center">
                  {colLabel(c)}
                </th>
              ))}
              {!disabled && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r} className="border-t border-border/40">
                <td className="px-1 py-1 text-[10px] text-muted-foreground text-center">{r + 1}</td>
                {Array.from({ length: cols }).map((_, c) => {
                  const cell = row[c] ?? '';
                  const display = isFormula(cell) ? applyFormula(String(cell), grid, r, c).toFixed(2) : String(cell);
                  return (
                    <td key={c} className="p-0.5">
                      <Input
                        value={display}
                        disabled={disabled}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        className="h-8 text-xs px-1.5 font-mono"
                        aria-label={`Cell ${colLabel(c)}${r + 1}`}
                      />
                    </td>
                  );
                })}
                {!disabled && (
                  <td className="px-1">
                    {grid.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(r)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> Add Row
        </Button>
      )}
    </div>
  );
}

export default Spreadsheet;
