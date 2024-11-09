import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type Expense = Database['public']['Tables']['expenses']['Row'];

export function useExpenses(budgetId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const optimisticUpdatesRef = useRef<Set<string>>(new Set());

  const fetchExpenses = useCallback(async () => {
    if (!budgetId) return;
    
    console.log('[useExpenses] Fetching expenses for budget:', budgetId);
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('budget_id', budgetId)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      console.log('[useExpenses] Fetched expenses:', data);
      setExpenses(data || []);
    } catch (err) {
      console.error('[useExpenses] Error fetching expenses:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    console.log('[useExpenses] Setting up subscription for budgetId:', budgetId);
    if (!budgetId) return;

    fetchExpenses();

    const channel = supabase.channel(`expenses-${budgetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `budget_id=eq.${budgetId}`,
        },
        (payload) => {
          console.log('[useExpenses] Realtime update received:', payload);
          
          setExpenses(current => {
            console.log('[useExpenses] Current expenses:', current);
            switch (payload.eventType) {
              case 'INSERT': {
                const newExpense = payload.new as Expense;
                console.log('[useExpenses] Processing INSERT:', newExpense);
                
                // Skip if this is an optimistic update we're already tracking
                if (optimisticUpdatesRef.current.has(newExpense.id)) {
                  console.log('[useExpenses] Skipping optimistic update:', newExpense.id);
                  optimisticUpdatesRef.current.delete(newExpense.id);
                  return current;
                }
                
                // Skip if we already have this expense
                if (current.some(e => e.id === newExpense.id)) {
                  console.log('[useExpenses] Expense already exists:', newExpense.id);
                  return current;
                }
                
                const updated = [newExpense, ...current].sort((a, b) => 
                  new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
                );
                console.log('[useExpenses] Updated expenses after INSERT:', updated);
                return updated;
              }
              
              default:
                return current;
            }
          });
        }
      )
      .subscribe((status) => {
        console.log(`[useExpenses] Subscription status:`, status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[useExpenses] Cleaning up subscription');
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [budgetId, fetchExpenses]);

  const addExpense = useCallback(async (
    description: string,
    amount: number,
    expenseDate: string,
    specificBudgetId?: string // Add optional parameter for specific budget ID
  ) => {
    // Use the specific budget ID if provided, otherwise use the current budgetId
    const targetBudgetId = specificBudgetId || budgetId;
    if (!targetBudgetId) throw new Error('No budget selected');

    console.log('[useExpenses] Adding expense:', { description, amount, expenseDate, targetBudgetId });
    try {
      // Create optimistic expense
      const optimisticExpense: Expense = {
        id: crypto.randomUUID(),
        budget_id: targetBudgetId,
        description,
        amount,
        expense_date: expenseDate,
        created_at: new Date().toISOString()
      };

      console.log('[useExpenses] Created optimistic expense:', optimisticExpense);
      optimisticUpdatesRef.current.add(optimisticExpense.id);

      // Update UI immediately
      setExpenses(current => {
        // Only update if this expense belongs to the currently viewed budget
        if (targetBudgetId === budgetId) {
          const updated = [optimisticExpense, ...current].sort((a, b) => 
            new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
          );
          console.log('[useExpenses] Updated expenses with optimistic update:', updated);
          return updated;
        }
        return current;
      });

      // Make the actual API call
      console.log('[useExpenses] Making API call to insert expense');
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          budget_id: targetBudgetId,
          description,
          amount,
          expense_date: expenseDate
        }])
        .select()
        .single();

      if (error) {
        console.error('[useExpenses] Error inserting expense:', error);
        // Revert optimistic update on error
        setExpenses(current => {
          const updated = current.filter(e => e.id !== optimisticExpense.id);
          console.log('[useExpenses] Reverting optimistic update:', updated);
          return updated;
        });
        optimisticUpdatesRef.current.delete(optimisticExpense.id);
        throw error;
      }

      console.log('[useExpenses] Successfully inserted expense:', data);
      return data;
    } catch (err) {
      console.error('[useExpenses] Error in addExpense:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [budgetId]);

  return {
    expenses,
    loading,
    error,
    addExpense,
    refreshExpenses: fetchExpenses,
  };
}