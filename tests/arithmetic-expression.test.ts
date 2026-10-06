import { describe, expect, it } from 'vitest';
import { evaluateArithmeticExpression } from '@/lib/arithmetic-expression';

describe('evaluateArithmeticExpression', () => {
  it('evaluates arithmetic with standard precedence', () => {
    expect(evaluateArithmeticExpression('2 + 3 * (4 - 1)')).toBe(11);
  });

  it('supports approved math functions and ternaries', () => {
    expect(evaluateArithmeticExpression('max(10, 4 * 3) + Math.round(2.4)')).toBe(14);
    expect(evaluateArithmeticExpression('5 >= 3 ? 25 : 10')).toBe(25);
  });

  it('rejects executable JavaScript and unsafe complexity', () => {
    expect(evaluateArithmeticExpression('globalThis.process.exit()')).toBeNull();
    expect(evaluateArithmeticExpression('1 / 0')).toBeNull();
    expect(evaluateArithmeticExpression('1 + '.repeat(600) + '1')).toBeNull();
  });
});
