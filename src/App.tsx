import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { PhoneAuth } from './components/PhoneAuth';
import { BudgetCard } from './components/BudgetCard';
import { AddBudgetButton } from './components/AddBudgetButton';
import { AddExpenseForm } from './components/AddExpenseForm';
import { useBudgets } from './contexts/BudgetsContext';
import { LogOut, User } from 'lucide-react';
import { BudgetsProvider } from './contexts/BudgetsContext';
import { ExpensesProvider } from './contexts/ExpensesContext';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const [showDropdown, setShowDropdown] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
        <PhoneAuth />
      </div>
    );
  }

  return (
    <BudgetsProvider>
      <ExpensesProvider>
        <div className="min-h-screen bg-gray-100 px-4 py-8 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="https://kkwcqninksetzodeayir.supabase.co/storage/v1/object/public/assets/logo.png?t=2024-11-09T19%3A28%3A55.368Z"
                  alt="Spend Simple Logo"
                  className="h-8 w-8"
                />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Spend Simple
                </h1>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="group flex h-10 w-10 items-center justify-center rounded-full bg-white ring-2 ring-gray-200 transition-all hover:ring-4 dark:bg-gray-800 dark:ring-gray-700"
                >
                  <User className="h-5 w-5 text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
                </button>

                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 z-40 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700">
                      <button
                        onClick={() => {
                          signOut();
                          setShowDropdown(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <AddExpenseForm />

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Budgets
              </h2>
              <AddBudgetButton />
            </div>

            {budgetsLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl bg-white p-6 shadow-md dark:bg-gray-800"
                  >
                    <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-4 h-8 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : budgets.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {budgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  No budgets yet
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Get started by creating your first budget
                </p>
              </div>
            )}
          </div>
        </div>
      </ExpensesProvider>
    </BudgetsProvider>
  );
}

export default App;