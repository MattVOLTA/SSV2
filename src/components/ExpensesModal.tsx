import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { ExpenseList } from './ExpenseList';
import type { Database } from '../types/supabase';

type Budget = Database['public']['Tables']['budgets']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];

interface BudgetWithExpenses extends Budget {
  expenses?: Expense[];
  totalExpenses: number;
}

interface ExpensesModalProps {
  budget: BudgetWithExpenses;
  isOpen: boolean;
  onClose: () => void;
}

export function ExpensesModal({ budget, isOpen, onClose }: ExpensesModalProps) {
  if (!isOpen) return null;

  // Get current month's expenses
  const currentMonthExpenses = budget.expenses?.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && 
           expenseDate.getFullYear() === now.getFullYear();
  }) || [];

  const spentAmount = currentMonthExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {budget.name}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Monthly Budget: {formatCurrency(budget.amount)} • 
              Spent: {formatCurrency(spentAmount)} • 
              Remaining: {formatCurrency(budget.amount - spentAmount)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {budget.expenses && budget.expenses.length > 0 ? (
            <ExpenseList expenses={budget.expenses} budgetId={budget.id} />
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No expenses yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}