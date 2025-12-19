export interface MemberSavings {
  id: string;
  memberId: string;
  memberName: string;
  operationalSavings: number;
  loanFundSavings: number;
  total: number;
  lastUpdated: Date;
}

export interface SavingsFilter {
  minAmount: number;
  maxAmount: number;
  savingsType: 'all' | 'operational' | 'loan-fund';
}

export interface LoanFromMember {
  id: string;
  lenderName: string;
  amount: number;
  date: Date;
  dueDate: Date;
  status: 'lunas' | 'belum' | 'sebagian';
  interestRate?: number;
  notes?: string;
}

export interface LoanToMember {
  id: string;
  borrowerId: string;
  borrowerName: string;
  loanAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingAmount: number;
  status: 'lunas' | 'aktif' | 'menunggak';
  startDate: Date;
  dueDate: Date;
  interestRate: number;
  monthlyInstallment?: number;
  nextDueDate?: Date | null;
  purpose?: string;
  guarantor?: string;
}

export interface SavingsDeposit {
  memberId: string;
  operationalAmount: number;
  loanFundAmount: number;
  notes?: string;
}

export interface NewLoanFromMember {
  lenderName: string;
  amount: number;
  dueDate: Date;
  interestRate?: number;
  notes?: string;
}

export interface NewLoanToMember {
  borrowerId: string;
  amount: number;
  installmentCount: number;
  interestRate?: number;
  notes?: string;
}

export interface LoanInstallment {
  loanId: string;
  amount: number;
  notes?: string;
}

export type SavingsLoansTab = 'dashboard' | 'savings' | 'loans-from' | 'loans-to';