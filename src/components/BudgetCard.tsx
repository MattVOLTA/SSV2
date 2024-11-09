import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { EditBudgetModal } from './EditBudgetModal';
import { ExpensesModal } from './ExpensesModal';
import type { Database } from '../types/supabase';

type Budget = Database['public']['Tables']['budgets']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];

interface BudgetWithExpenses extends Budget {
  expenses?: Expense[];
  totalExpenses: number;
}

interface BudgetCardProps {
  budget: BudgetWithExpenses;
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);

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

  const remainingAmount = budget.amount - spentAmount;
  const ratio = budget.amount > 0 ? spentAmount / budget.amount : 0;

  return (
    <>
      <div 
        className="cursor-pointer rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg dark:bg-gray-800"
        onClick={() => setIsExpensesModalOpen(true)}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {budget.name}
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditModalOpen(true);
            }}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Edit2 className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Budget: {formatCurrency(budget.amount)}</span>
            <span>Spent: {formatCurrency(spentAmount)}</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full transition-all ${
                ratio > 0.9
                  ? 'bg-red-500'
                  : ratio > 0.7
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            Left to spend: {formatCurrency(remainingAmount)}
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <EditBudgetModal
          budget={budget}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      <ExpensesModal
        budget={budget}
        isOpen={isExpensesModalOpen}
        onClose={() => setIsExpensesModalOpen(false)}
      />
    </>
  );
}