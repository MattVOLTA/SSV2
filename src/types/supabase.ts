export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          owner_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_at?: string | null
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: 'owner' | 'member'
          added_at: string | null
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'owner' | 'member'
          added_at?: string | null
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          added_at?: string | null
        }
      }
      budgets: {
        Row: {
          id: string
          group_id: string | null
          name: string
          amount: number
          created_at: string | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          name: string
          amount: number
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string | null
          name?: string
          amount?: number
          created_at?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          budget_id: string | null
          description: string
          amount: number
          expense_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          budget_id?: string | null
          description: string
          amount: number
          expense_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          budget_id?: string | null
          description?: string
          amount?: number
          expense_date?: string
          created_at?: string | null
        }
      }
    }
  }
}