'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface MathCaptchaValue {
  question: string;
  answer: number | null;
  provided: string;
  solved: boolean;
  solvedAt?: string;
}

interface Puzzle { a: number; b: number; op: '+' | '-' | '×'; answer: number }

function makePuzzle(difficulty: 'easy' | 'medium' | 'hard'): Puzzle {
  const max = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 20 : 50;
  const opPool: Array<'+' | '-' | '×'> = difficulty === 'easy' ? ['+', '-'] : difficulty === 'medium' ? ['+', '-', '×'] : ['+', '-', '×'];
  const op = opPool[Math.floor(Math.random() * opPool.length)];
  let a = Math.floor(Math.random() * max) + 1;
  let b = Math.floor(Math.random() * max) + 1;
  if (op === '-' && b > a) [a, b] = [b, a];
  if (op === '×' && difficulty !== 'hard') { a = Math.min(a, 9); b = Math.min(b, 9); }
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  return { a, b, op, answer };
}

export function MathCaptcha({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Math captcha');
  const difficulty = str(config.difficulty, 'easy') as 'easy' | 'medium' | 'hard';
  const regenerateOnFail = bool(config.regenerateOnFail, true);

  const v: MathCaptchaValue = value && typeof value === 'object' ? (value as MathCaptchaValue) : { question: '', answer: null, provided: '', solved: false };

  const [puzzle, setPuzzle] = useState<Puzzle>(() => makePuzzle(difficulty));
  const [provided, setProvided] = useState(v.provided || '');

  const question = `${puzzle.a} ${puzzle.op} ${puzzle.b}`;

  // Regenerate puzzle + reset provided + emit structured value to the form.
  const regenerate = () => {
    const next = makePuzzle(difficulty);
    setPuzzle(next);
    setProvided('');
    onChange({
      question: `${next.a} ${next.op} ${next.b}`,
      answer: next.answer,
      provided: '',
      solved: false,
      solvedAt: undefined,
    });
  };

  // On first render, sync the form state with our locally-generated puzzle.
  // Subsequent renders reuse the question already stored in form state.
  React.useEffect(() => {
    if (!v.question) {
      onChange({ question, answer: puzzle.answer, provided: '', solved: false });
    }
  }, []);

  const check = () => {
    if (disabled || !provided) return;
    const num_ = Number(provided);
    const solved = Number.isFinite(num_) && num_ === puzzle.answer;
    const patch: MathCaptchaValue = {
      question,
      answer: puzzle.answer,
      provided,
      solved,
      solvedAt: solved ? new Date().toISOString() : undefined,
    };
    onChange(patch);
    if (!solved && regenerateOnFail) {
      setTimeout(() => {
        regenerate();
      }, 800);
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Calculator className="size-3.5" /> Solve to verify
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={disabled}
            onClick={regenerate}
            aria-label="New puzzle"
          >
            <RefreshCw className="size-3" />
          </Button>
        </div>
        <p className="text-center font-mono text-lg font-bold py-1">{question} = ?</p>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9-]*"
          value={provided}
          onChange={(e) => setProvided(e.target.value.replace(/[^0-9-]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          disabled={disabled}
          aria-label={`${ariaLabel} answer`}
          placeholder="Your answer"
          className="text-center font-mono text-sm"
        />
        <Button type="button" size="sm" disabled={disabled || !provided} onClick={check} className="text-xs gap-1.5">
          <CheckCircle2 className="size-3.5" /> Verify
        </Button>
      </div>

      {v.solved === true && provided && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">Correct — you're human.</span>
        </div>
      )}
      {v.solved === false && provided && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 p-1.5 flex items-center gap-1.5">
          <AlertCircle className="size-3.5 text-red-600" />
          <span className="text-[11px] text-red-700 dark:text-red-400 font-semibold">Incorrect — try again.</span>
        </div>
      )}

      <Badge variant="outline" className="text-[9px] gap-1">
        <Calculator className="size-2.5" />
        {difficulty} difficulty
      </Badge>
    </div>
  );
}

export default MathCaptcha;
