import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Expense = Database['public']['Tables']['expenses']['Row'];

interface ExpensesContextType {
  addExpense: (budgetId: string, description: string, amount: number, expenseDate: string) => Promise<Expense>;
  expenses: Record<string, Expense[]>;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});

  const addExpense = useCallback(async (
    budgetId: string,
    description: string,
    amount: number,
    expenseDate: string
  ) => {
    try {
      // Create optimistic expense
      const optimisticExpense: Expense = {
        id: crypto.randomUUID(),
        budget_id: budgetId,
        description,
        amount,
        expense_date: expenseDate,
        created_at: new Date().toISOString()
      };

      // Update state optimistically
      setExpenses(prev => ({
        ...prev,
        [budgetId]: [optimisticExpense, ...(prev[budgetId] || [])]
      }));

      // Make the actual API call
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          budget_id: budgetId,
          description,
          amount,
          expense_date: expenseDate
        }])
        .select()
        .single();

      if (error) {
        // Revert optimistic update on error
        setExpenses(prev => ({
          ...prev,
          [budgetId]: (prev[budgetId] || []).filter(e => e.id !== optimisticExpense.id)
        }));
        throw error;
      }

      // Update with actual data
      setExpenses(prev => ({
        ...prev,
        [budgetId]: [data, ...(prev[budgetId] || []).filter(e => e.id !== optimisticExpense.id)]
      }));

      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  return (
    <ExpensesContext.Provider value={{ expenses, addExpense }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
}