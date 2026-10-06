type ExpressionValue = number | boolean;

const FUNCTIONS: Record<string, (...values: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  max: Math.max,
  min: Math.min,
  round: Math.round,
  sqrt: Math.sqrt,
  'Math.abs': Math.abs,
  'Math.ceil': Math.ceil,
  'Math.floor': Math.floor,
  'Math.max': Math.max,
  'Math.min': Math.min,
  'Math.round': Math.round,
  'Math.sqrt': Math.sqrt,
};

const TOKEN_PATTERN = /\s*(===|!==|==|!=|<=|>=|&&|\|\||[()+\-*/%,?:!<>]|(?:\d+\.\d*|\.\d+|\d+)|[A-Za-z_][A-Za-z0-9_.]*)\s*/gy;

function tokenize(expression: string): string[] {
  if (!expression.trim() || expression.length > 2_000) throw new Error('Invalid expression');
  const tokens: string[] = [];
  let cursor = 0;
  while (cursor < expression.length) {
    TOKEN_PATTERN.lastIndex = cursor;
    const match = TOKEN_PATTERN.exec(expression);
    if (!match || match.index !== cursor || !match[1]) throw new Error('Invalid token');
    tokens.push(match[1]);
    if (tokens.length > 512) throw new Error('Expression is too complex');
    cursor = TOKEN_PATTERN.lastIndex;
  }
  return tokens;
}

function numeric(value: ExpressionValue): number {
  return typeof value === 'boolean' ? (value ? 1 : 0) : value;
}

export function evaluateArithmeticExpression(expression: string): number | null {
  try {
    const tokens = tokenize(expression);
    let index = 0;
    const peek = () => tokens[index];
    const take = (token?: string) => {
      const current = tokens[index];
      if (current === undefined || (token !== undefined && current !== token)) throw new Error('Unexpected token');
      index += 1;
      return current;
    };

    const primary = (): ExpressionValue => {
      const token = take();
      if (token === '(') {
        const value = conditional();
        take(')');
        return value;
      }
      if (/^(?:\d+\.\d*|\.\d+|\d+)$/.test(token)) return Number(token);
      if (token === 'true' || token === 'false') return token === 'true';
      const fn = FUNCTIONS[token];
      if (!fn || peek() !== '(') throw new Error('Unknown identifier');
      take('(');
      const args: number[] = [];
      if (peek() !== ')') {
        do {
          args.push(numeric(conditional()));
          if (peek() !== ',') break;
          take(',');
        } while (true);
      }
      take(')');
      return fn(...args);
    };

    const unary = (): ExpressionValue => {
      if (peek() === '+') { take('+'); return numeric(unary()); }
      if (peek() === '-') { take('-'); return -numeric(unary()); }
      if (peek() === '!') { take('!'); return !Boolean(unary()); }
      return primary();
    };

    const multiply = (): ExpressionValue => {
      let value = numeric(unary());
      while (['*', '/', '%'].includes(peek() || '')) {
        const operator = take();
        const right = numeric(unary());
        if ((operator === '/' || operator === '%') && right === 0) throw new Error('Division by zero');
        value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
      }
      return value;
    };

    const add = (): ExpressionValue => {
      let value = numeric(multiply());
      while (peek() === '+' || peek() === '-') {
        const operator = take();
        const right = numeric(multiply());
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    };

    const compare = (): ExpressionValue => {
      let value: ExpressionValue = add();
      while (['<', '<=', '>', '>='].includes(peek() || '')) {
        const operator = take();
        const left = numeric(value);
        const right = numeric(add());
        value = operator === '<' ? left < right : operator === '<=' ? left <= right : operator === '>' ? left > right : left >= right;
      }
      return value;
    };

    const equality = (): ExpressionValue => {
      let value = compare();
      while (['==', '===', '!=', '!=='].includes(peek() || '')) {
        const operator = take();
        const right = compare();
        const equal = numeric(value) === numeric(right);
        value = operator === '==' || operator === '===' ? equal : !equal;
      }
      return value;
    };

    const and = (): ExpressionValue => {
      let value = equality();
      while (peek() === '&&') { take('&&'); value = Boolean(value) && Boolean(equality()); }
      return value;
    };

    const or = (): ExpressionValue => {
      let value = and();
      while (peek() === '||') { take('||'); value = Boolean(value) || Boolean(and()); }
      return value;
    };

    function conditional(): ExpressionValue {
      const condition = or();
      if (peek() !== '?') return condition;
      take('?');
      const whenTrue = conditional();
      take(':');
      const whenFalse = conditional();
      return Boolean(condition) ? whenTrue : whenFalse;
    }

    const result = numeric(conditional());
    if (index !== tokens.length || !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}
