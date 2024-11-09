import React, { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { EditExpenseModal } from './EditExpenseModal';
import { useBudgets } from '../contexts/BudgetsContext';
import { formatCurrency } from '../utils/formatCurrency';
import type { Database } from '../types/supabase';

type Expense = Database['public']['Tables']['expenses']['Row'];

interface ExpenseListProps {
  expenses: Expense[];
  budgetId: string;
}

export function ExpenseList({ expenses, budgetId }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const { deleteExpense, refreshBudgets } = useBudgets();

  const handleDelete = async (expense: Expense) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(expense.id);
        await refreshBudgets(); // Refresh budgets after deletion
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
  );

  return (
    <div className="space-y-2">
      {sortedExpenses.map((expense) => (
        <div
          key={expense.id}
          className="flex items-center justify-between rounded-lg bg-gray-50 p-3 shadow-sm dark:bg-gray-700/50"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {expense.description}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(expense.expense_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(expense.amount)}
            </p>
            <button
              onClick={() => setSelectedExpense(expense)}
              className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(expense)}
              className="rounded p-1 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {selectedExpense && (
        <EditExpenseModal
          expense={selectedExpense}
          isOpen={Boolean(selectedExpense)}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </div>
  );
}