export interface FormulaContext {
  attribute: Record<string, number>
  groessenklasse: number
}

export interface FormulaResult {
  value: number | null
  display: string
}

const ATTRIBUTE_ALIASES: Record<string, string> = {
  GE: 'GEW',
  MU: 'MUT',
  KL: 'KLU',
  IN: 'INT',
  CH: 'CHA',
  HH: 'HIN',
  KO: 'KON',
  KK: 'KRA',
}

type Token =
  | { t: 'num'; v: number }
  | { t: 'ident'; name: string }
  | { t: 'die'; count: number; sides: number }
  | { t: 'op'; op: string }
  | { t: 'lp' }
  | { t: 'rp' }

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const re = /(\d+)\s*[dD]\s*(\d+)|\d+|[A-Za-zÄÖÜäöü]+|[+\-*/()]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input)) !== null) {
    const raw = m[0]
    if (m[1] !== undefined) {
      tokens.push({ t: 'die', count: parseInt(m[1], 10), sides: parseInt(m[2], 10) })
    } else if (/^\d+$/.test(raw)) {
      tokens.push({ t: 'num', v: parseInt(raw, 10) })
    } else if (/^[A-Za-zÄÖÜäöü]/.test(raw)) {
      tokens.push({ t: 'ident', name: raw.toUpperCase() })
    } else if (raw === '(') {
      tokens.push({ t: 'lp' })
    } else if (raw === ')') {
      tokens.push({ t: 'rp' })
    } else {
      tokens.push({ t: 'op', op: raw })
    }
  }
  return tokens
}

type Node =
  | { t: 'num'; v: number }
  | { t: 'ident'; name: string }
  | { t: 'die'; count: number; sides: number }
  | { t: 'bin'; op: string; l: Node; r: Node }

function parse(tokens: Token[]): Node | null {
  let i = 0
  const peek = (): Token | undefined => tokens[i]
  const next = (): Token | undefined => tokens[i++]

  function parseFactor(): Node | null {
    const tok = peek()
    if (!tok) return null
    if (tok.t === 'num') {
      next()
      return { t: 'num', v: tok.v }
    }
    if (tok.t === 'die') {
      next()
      return { t: 'die', count: tok.count, sides: tok.sides }
    }
    if (tok.t === 'ident') {
      next()
      return { t: 'ident', name: tok.name }
    }
    if (tok.t === 'lp') {
      next()
      const inner = parseExpr()
      if (inner === null || peek()?.t !== 'rp') return null
      next()
      return inner
    }
    return null
  }

  function parseTerm(): Node | null {
    let left = parseFactor()
    if (left === null) return null
    for (;;) {
      const tok = peek()
      if (tok?.t === 'op' && (tok.op === '*' || tok.op === '/')) {
        next()
        const right = parseFactor()
        if (right === null) return null
        left = { t: 'bin', op: tok.op, l: left, r: right }
      } else {
        return left
      }
    }
  }

  function parseExpr(): Node | null {
    let left = parseTerm()
    if (left === null) return null
    for (;;) {
      const tok = peek()
      if (tok?.t === 'op' && (tok.op === '+' || tok.op === '-')) {
        next()
        const right = parseTerm()
        if (right === null) return null
        left = { t: 'bin', op: tok.op, l: left, r: right }
      } else {
        return left
      }
    }
  }

  const ast = parseExpr()
  if (ast === null || peek() !== undefined) return null
  return ast
}

function resolveIdent(name: string, ctx: FormulaContext): number | null {
  if (name === 'GK') return ctx.groessenklasse
  const key = ATTRIBUTE_ALIASES[name] ?? name
  const value = ctx.attribute[key]
  return typeof value === 'number' ? value : null
}

function containsDie(node: Node): boolean {
  if (node.t === 'die') return true
  if (node.t === 'bin') return containsDie(node.l) || containsDie(node.r)
  return false
}

function evalNode(
  node: Node,
  ctx: FormulaContext,
  dieValue: (d: { count: number; sides: number }) => number,
): number | null {
  switch (node.t) {
    case 'num':
      return node.v
    case 'ident':
      return resolveIdent(node.name, ctx)
    case 'die':
      return dieValue({ count: node.count, sides: node.sides })
    case 'bin': {
      const l = evalNode(node.l, ctx, dieValue)
      const r = evalNode(node.r, ctx, dieValue)
      if (l === null || r === null) return null
      switch (node.op) {
        case '+':
          return l + r
        case '-':
          return l - r
        case '*':
          return l * r
        case '/':
          return r === 0 ? null : l / r
      }
      return null
    }
  }
}

function collectDieTexts(node: Node, out: string[]): void {
  if (node.t === 'die') {
    out.push(`${node.count}d${node.sides}`)
  } else if (node.t === 'bin') {
    collectDieTexts(node.l, out)
    collectDieTexts(node.r, out)
  }
}

export function evaluateFormula(formula: string, ctx: FormulaContext): FormulaResult {
  const ast = parse(tokenize(formula))
  if (ast === null) return { value: null, display: '—' }

  if (!containsDie(ast)) {
    const value = evalNode(ast, ctx, () => 0)
    return value === null ? { value: null, display: '—' } : { value, display: String(value) }
  }

  const base = evalNode(ast, ctx, () => 0)
  const withMax = evalNode(ast, ctx, (d) => d.count * d.sides)
  if (base === null || withMax === null) return { value: null, display: '—' }

  const delta = withMax - base
  const dieTexts: string[] = []
  collectDieTexts(ast, dieTexts)

  if (dieTexts.length === 1 && delta !== 0) {
    return { value: base, display: `${base} ${delta > 0 ? '+' : '−'} ${dieTexts[0]}` }
  }
  return { value: base, display: `${base} + ${dieTexts.join(' + ')}` }
}
