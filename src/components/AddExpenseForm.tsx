import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { callOpenAI } from '../lib/openai';
import { useBudgets } from '../contexts/BudgetsContext';
import { useExpenses } from '../contexts/ExpensesContext';
import { Loader2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

export function AddExpenseForm() {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { budgets, refreshBudgets } = useBudgets();
  const { addExpense } = useExpenses();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (successMessage) {
      timeout = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const aiResponse = await callOpenAI(description, budgets);
      
      if (!aiResponse.transactions || aiResponse.transactions.length === 0) {
        throw new Error('No transactions identified');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const transaction of aiResponse.transactions) {
        try {
          await addExpense(
            transaction.BudgetID,
            transaction.Description,
            transaction.Amount,
            transaction.Date
          );
          
          const budget = budgets.find(b => b.id === transaction.BudgetID);
          if (budget) {
            const remaining = budget.amount - budget.totalExpenses - transaction.Amount;
            setSuccessMessage(
              `${transaction.Description} for ${formatCurrency(transaction.Amount)} was added to ${budget.name}, ${formatCurrency(remaining)} remaining`
            );
          }
        } catch (err) {
          console.error('Error adding transaction:', err);
          throw err;
        }
      }

      // Refresh budgets to update the UI
      await refreshBudgets();
      setDescription('');
    } catch (err) {
      console.error('Error in form submission:', err);
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="relative">
        {error && (
          <p className="absolute -top-6 left-0 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your expense (e.g., Spent $45 on groceries at Walmart yesterday)"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 text-white shadow-lg transition-all hover:shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:shadow-indigo-900"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {isSubmitting ? (
              <Loader2 className="relative h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>
        {successMessage && (
          <p className="absolute left-0 right-0 mt-2 animate-fade-out text-sm text-green-600 dark:text-green-400">
            {successMessage}
          </p>
        )}
      </div>
    </form>
  );
}