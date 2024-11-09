import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useGroups } from './useGroups';

type Budget = Database['public']['Tables']['budgets']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];

interface BudgetWithExpenses extends Budget {
  expenses?: Expense[];
  totalExpenses: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithExpenses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { groups } = useGroups();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCount = useRef(0);

  const fetchBudgetsAndExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length === 0) {
        setBudgets([]);
        return;
      }

      const groupIds = memberships.map(m => m.group_id);

      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*, expenses(*)')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      const budgetsWithTotals = (budgetsData || []).map(budget => ({
        ...budget,
        totalExpenses: budget.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
      }));

      setBudgets(budgetsWithTotals);
      retryCount.current = 0; // Reset retry count on success
    } catch (err) {
      console.error('Error fetching budgets:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setBudgets([]);

      // Implement retry logic
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        setTimeout(() => {
          fetchBudgetsAndExpenses();
        }, RETRY_DELAY * retryCount.current);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (groups.length > 0) {
      fetchBudgetsAndExpenses();
    }
  }, [groups, fetchBudgetsAndExpenses]);

  const addBudget = useCallback(async (name: string, amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const ownerGroup = groups.find(group => group.role === 'owner');
      if (!ownerGroup) {
        throw new Error('You must be an owner of a group to create budgets');
      }

      const { data, error } = await supabase
        .from('budgets')
        .insert([{ name, amount, group_id: ownerGroup.id }])
        .select()
        .single();

      if (error) throw error;

      setBudgets(prev => [{ ...data, expenses: [], totalExpenses: 0 }, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [groups]);

  const deleteBudget = useCallback(async (budgetId: string) => {
    try {
      // First, delete all expenses associated with this budget
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('budget_id', budgetId);

      if (expensesError) throw expensesError;

      // Then delete the budget itself
      const { error: budgetError } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (budgetError) throw budgetError;

      setBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  const updateBudget = useCallback(async (
    budgetId: string,
    updates: { name?: string; amount?: number }
  ) => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;

      setBudgets(prev => prev.map(budget => 
        budget.id === budgetId 
          ? { ...budget, ...updates }
          : budget
      ));

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  const updateExpense = useCallback(async (
    expenseId: string,
    updates: { description?: string; amount?: number; expense_date?: string }
  ) => {
    try {
      const budget = budgets.find(b => b.expenses?.some(e => e.id === expenseId));
      if (!budget) throw new Error('Expense not found');

      const expenseIndex = budget.expenses!.findIndex(e => e.id === expenseId);
      const oldExpense = budget.expenses![expenseIndex];
      const updatedExpense = { ...oldExpense, ...updates };

      setBudgets(prev => {
        const updatedBudgets = [...prev];
        const budgetIndex = updatedBudgets.findIndex(b => b.id === budget.id);
        const updatedBudget = { ...updatedBudgets[budgetIndex] };
        updatedBudget.expenses = [...updatedBudget.expenses!];
        updatedBudget.expenses[expenseIndex] = updatedExpense;
        updatedBudget.totalExpenses = updatedBudget.expenses.reduce((sum, e) => sum + e.amount, 0);
        updatedBudgets[budgetIndex] = updatedBudget;
        return updatedBudgets;
      });

      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .select()
        .single();

      if (error) {
        setBudgets(prev => {
          const updatedBudgets = [...prev];
          const budgetIndex = updatedBudgets.findIndex(b => b.id === budget.id);
          const updatedBudget = { ...updatedBudgets[budgetIndex] };
          updatedBudget.expenses = [...updatedBudget.expenses!];
          updatedBudget.expenses[expenseIndex] = oldExpense;
          updatedBudget.totalExpenses = updatedBudget.expenses.reduce((sum, e) => sum + e.amount, 0);
          updatedBudgets[budgetIndex] = updatedBudget;
          return updatedBudgets;
        });
        throw error;
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [budgets]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    try {
      const budget = budgets.find(b => b.expenses?.some(e => e.id === expenseId));
      if (!budget) throw new Error('Expense not found');

      const expense = budget.expenses!.find(e => e.id === expenseId)!;

      setBudgets(prev => {
        const updatedBudgets = [...prev];
        const budgetIndex = updatedBudgets.findIndex(b => b.id === budget.id);
        const updatedBudget = { ...updatedBudgets[budgetIndex] };
        updatedBudget.expenses = updatedBudget.expenses!.filter(e => e.id !== expenseId);
        updatedBudget.totalExpenses = updatedBudget.expenses.reduce((sum, e) => sum + e.amount, 0);
        updatedBudgets[budgetIndex] = updatedBudget;
        return updatedBudgets;
      });

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) {
        setBudgets(prev => {
          const updatedBudgets = [...prev];
          const budgetIndex = updatedBudgets.findIndex(b => b.id === budget.id);
          const updatedBudget = { ...updatedBudgets[budgetIndex] };
          updatedBudget.expenses = [...updatedBudget.expenses!, expense];
          updatedBudget.totalExpenses = updatedBudget.expenses.reduce((sum, e) => sum + e.amount, 0);
          updatedBudgets[budgetIndex] = updatedBudget;
          return updatedBudgets;
        });
        throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [budgets]);

  return {
    budgets,
    loading,
    error,
    addBudget,
    updateBudget,
    deleteBudget,
    updateExpense,
    deleteExpense,
    refreshBudgets: fetchBudgetsAndExpenses,
  };
}