import type { FinanceCategory, FinanceTransaction, TransactionType } from './types'

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  alimentação: [
    'restaurante',
    'ifood',
    'comida',
    'almoço',
    'jantar',
    'mercado',
    'super',
    'padaria',
    'lanche',
    'café',
  ],
  transporte: [
    'uber',
    '99',
    'gasolina',
    'combustivel',
    'metrô',
    'onibus',
    'estacionamento',
    'pedagio',
  ],
  moradia: ['aluguel', 'luz', 'agua', 'internet', 'condominio', 'gas'],
  lazer: ['cinema', 'netflix', 'spotify', 'show', 'viagem', 'hotel', 'bar'],
  saúde: ['farmacia', 'droga', 'medico', 'hospital', 'dentista'],
  educação: ['curso', 'escola', 'livro', 'faculdade', 'mensalidade'],
}

const INCOME_KEYWORDS: Record<string, string[]> = {
  salário: ['salario', 'pagamento', 'vencimento', 'folha'],
  freelance: ['freelance', 'projeto', 'extra'],
  investimento: ['dividendo', 'juros', 'rendimento', 'fii'],
  venda: ['venda', 'recebido', 'pix'],
}

function suggestByKeywords(
  description: string,
  transactionType: TransactionType,
): { categoryName: string; confidence: number } {
  const map =
    transactionType === 'income' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS
  for (const [cat, keys] of Object.entries(map)) {
    if (keys.some((k) => description.includes(k))) {
      return { categoryName: cat, confidence: 0.75 }
    }
  }
  return { categoryName: 'Despesas gerais', confidence: 0.2 }
}

export function suggestCategoryId(
  description: string,
  transactionType: TransactionType,
  transactions: FinanceTransaction[],
  categories: FinanceCategory[],
): { categoryId?: string; categoryName: string; confidence: number } {
  const desc = normalizeText(description)
  if (!desc) {
    return { categoryName: 'geral', confidence: 0 }
  }

  const sameType = transactions.filter((tx) => tx.type === transactionType)
  const exact = sameType.filter(
    (tx) => normalizeText(tx.description) === desc && tx.categoryId,
  )
  if (exact.length) {
    const counts = new Map<string, number>()
    for (const tx of exact) {
      if (tx.categoryId) counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1)
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    if (best) {
      const cat = categories.find((c) => c.id === best)
      return { categoryId: best, categoryName: cat?.name ?? 'geral', confidence: 0.95 }
    }
  }

  const { categoryName, confidence } = suggestByKeywords(desc, transactionType)
  const match = categories.find(
    (c) => normalizeText(c.name) === normalizeText(categoryName),
  )
  if (match) return { categoryId: match.id, categoryName: match.name, confidence }
  const fallback = categories.find((c) =>
    transactionType === 'income' ? c.kind === 'income' : c.kind === 'expense',
  )
  return {
    categoryId: fallback?.id,
    categoryName: fallback?.name ?? categoryName,
    confidence,
  }
}
