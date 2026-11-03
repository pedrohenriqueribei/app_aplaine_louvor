export type FinancialType = 'income' | 'expense';

export type IncomeCategory =
  | 'dizimo'
  | 'oferta'
  | 'oferta_missoes'
  | 'oferta_especial'
  | 'evento'
  | 'campanha'
  | 'outro';

export type ExpenseCategory =
  | 'despesa_departamento'
  | 'manutencao_templo'
  | 'utilidades' // Luz, Água, Internet
  | 'aluguel'
  | 'equipamentos'
  | 'material_didatico'
  | 'acao_social'
  | 'alimentacao_evento'
  | 'combustivel_transporte'
  | 'honorario_prebenda'
  | 'impostos_taxas'
  | 'outro';

export type PaymentMethod =
  | 'pix'
  | 'dinheiro'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia'
  | 'boleto';

export interface DepartmentBudgetOption {
  id: string;
  name: string;
  iconKey?: string;
  color?: string;
}

export interface FinancialRecord {
  id: string;
  churchId: string;
  type: FinancialType;
  category: IncomeCategory | ExpenseCategory | string;
  categoryLabel?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: PaymentMethod;
  status: 'confirmed' | 'pending';

  // For Incomes (Dízimos & Ofertas)
  contributorName?: string;
  contributorMemberId?: string;
  isAnonymous?: boolean;
  serviceId?: string;
  serviceName?: string;

  // For Expenses (Controle por Departamento)
  departmentId?: string; // e.g. 'louvor', 'multimidia', 'danca', 'patrimonio', 'biblico', 'acolhimento', 'secretaria', 'geral'
  departmentName?: string;
  supplier?: string; // Fornecedor / Favorecido
  invoiceNumber?: string; // Número do recibo ou nota fiscal
  dueDate?: string; // Data de vencimento

  // Metadata
  receiptNumber?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalDizimos: number;
  totalOfertas: number;
  totalOtherIncome: number;
  totalPendingExpense: number;
  expensesByDepartment: Record<string, {
    departmentId: string;
    departmentName: string;
    total: number;
    count: number;
    percentage: number;
  }>;
}

export const STANDARD_CHURCH_DEPARTMENTS: DepartmentBudgetOption[] = [
  { id: 'louvor', name: 'Ministério de Louvor', iconKey: 'mic', color: 'blue' },
  { id: 'multimidia', name: 'Ministério de Multimídia', iconKey: 'monitor', color: 'purple' },
  { id: 'danca', name: 'Ministério de Dança', iconKey: 'ballerina', color: 'rose' },
  { id: 'patrimonio', name: 'Patrimônio & Zeladoria', iconKey: 'building', color: 'cyan' },
  { id: 'biblico', name: 'Ministério Bíblico & EBD', iconKey: 'book', color: 'indigo' },
  { id: 'acolhimento', name: 'Acolhimento & Recepção', iconKey: 'heart', color: 'teal' },
  { id: 'intercessao', name: 'Intercessão & Oração', iconKey: 'flame', color: 'violet' },
  { id: 'evangelismo', name: 'Evangelismo & Missões', iconKey: 'globe', color: 'orange' },
  { id: 'secretaria', name: 'Secretaria & Administração', iconKey: 'briefcase', color: 'slate' },
  { id: 'geral', name: 'Administração Geral & Templo', iconKey: 'building', color: 'emerald' },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro (Espécie)',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência Bancária',
  boleto: 'Boleto Bancário',
};

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  dizimo: 'Dízimo',
  oferta: 'Oferta de Culto',
  oferta_missoes: 'Oferta Missionária',
  oferta_especial: 'Oferta Especial / Alçados',
  evento: 'Inscrição de Evento / Retiro',
  campanha: 'Campanha Específica',
  outro: 'Outras Entradas',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  despesa_departamento: 'Despesa Ministerial',
  manutencao_templo: 'Manutenção Predial & Reparos',
  utilidades: 'Contas de Consumo (Luz, Água, Internet)',
  aluguel: 'Aluguel do Imóvel',
  equipamentos: 'Aquisição de Equipamentos & Instrumentos',
  material_didatico: 'Material Didático & Revistas EBD',
  acao_social: 'Ação Social & Cestas Básicas',
  alimentacao_evento: 'Alimentação / Cantina / Lanches',
  combustivel_transporte: 'Transporte & Combustível',
  honorario_prebenda: 'Prebenda Pastoral / Ministrantes',
  impostos_taxas: 'Taxas & Encargos Bancários',
  outro: 'Outras Despesas',
};
