export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          company_code: string
          company_name: string
          is_active: boolean
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_code: string
          company_name: string
          is_active?: boolean
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_code?: string
          company_name?: string
          is_active?: boolean
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'staff'
          is_admin: boolean
          company_id: string
          department: string | null
          position: string | null
          hire_date: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: 'admin' | 'staff'
          is_admin?: boolean
          company_id: string
          department?: string | null
          position?: string | null
          hire_date?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'staff'
          is_admin?: boolean
          company_id?: string
          department?: string | null
          position?: string | null
          hire_date?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      evaluations: {
        Row: {
          id: string
          staff_id: string
          evaluation_period: string
          status: 'draft' | 'submitted' | 'completed'
          total_score: number | null
          rank: 'SS' | 'S' | 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | null
          average_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          evaluation_period: string
          status?: 'draft' | 'submitted' | 'completed'
          total_score?: number | null
          rank?: 'SS' | 'S' | 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | null
          average_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          evaluation_period?: string
          status?: 'draft' | 'submitted' | 'completed'
          total_score?: number | null
          rank?: 'SS' | 'S' | 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D' | null
          average_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      evaluation_responses: {
        Row: {
          id: string
          evaluation_id: string
          admin_id: string
          total_score: number | null
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          evaluation_id: string
          admin_id: string
          total_score?: number | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          evaluation_id?: string
          admin_id?: string
          total_score?: number | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      evaluation_items: {
        Row: {
          id: string
          evaluation_response_id: string
          category: 'performance' | 'behavior' | 'growth'
          item_name: string
          score: number
          min_score: number
          max_score: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          evaluation_response_id: string
          category: 'performance' | 'behavior' | 'growth'
          item_name: string
          score: number
          min_score: number
          max_score: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          evaluation_response_id?: string
          category?: 'performance' | 'behavior' | 'growth'
          item_name?: string
          score?: number
          min_score?: number
          max_score?: number
          comment?: string | null
          created_at?: string
        }
      }
      admin_comments: {
        Row: {
          id: string
          evaluation_id: string
          admin_id: string
          comment: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          evaluation_id: string
          admin_id: string
          comment: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          evaluation_id?: string
          admin_id?: string
          comment?: string
          created_at?: string
          updated_at?: string
        }
      }
      staff_goals: {
        Row: {
          id: string
          staff_id: string
          goal_title: string
          goal_description: string
          target_date: string
          achievement_rate: number
          status: 'active' | 'completed' | 'abandoned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          goal_title: string
          goal_description: string
          target_date: string
          achievement_rate?: number
          status?: 'active' | 'completed' | 'abandoned'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          goal_title?: string
          goal_description?: string
          target_date?: string
          achievement_rate?: number
          status?: 'active' | 'completed' | 'abandoned'
          created_at?: string
          updated_at?: string
        }
      }
      evaluation_questions: {
        Row: {
          id: string
          evaluation_id: string
          staff_id: string
          question: string
          answer: string | null
          admin_id: string | null
          created_at: string
          answered_at: string | null
        }
        Insert: {
          id?: string
          evaluation_id: string
          staff_id: string
          question: string
          answer?: string | null
          admin_id?: string | null
          created_at?: string
          answered_at?: string | null
        }
        Update: {
          id?: string
          evaluation_id?: string
          staff_id?: string
          question?: string
          answer?: string | null
          admin_id?: string | null
          created_at?: string
          answered_at?: string | null
        }
      }
      evaluation_items_master: {
        Row: {
          id: string
          category: 'performance' | 'behavior' | 'growth'
          item_name: string
          min_score: number
          max_score: number
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          category: 'performance' | 'behavior' | 'growth'
          item_name: string
          min_score: number
          max_score: number
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          category?: 'performance' | 'behavior' | 'growth'
          item_name?: string
          min_score?: number
          max_score?: number
          description?: string
          created_at?: string
        }
      }
      evaluation_cycles: {
        Row: {
          id: string
          cycle_name: string
          start_date: string
          end_date: string
          trial_date: string | null
          implementation_date: string | null
          final_date: string | null
          status: 'planning' | 'active' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          cycle_name: string
          start_date: string
          end_date: string
          trial_date?: string | null
          implementation_date?: string | null
          final_date?: string | null
          status?: 'planning' | 'active' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          cycle_name?: string
          start_date?: string
          end_date?: string
          trial_date?: string | null
          implementation_date?: string | null
          final_date?: string | null
          status?: 'planning' | 'active' | 'completed'
          created_at?: string
        }
      }
      productivity_data: {
        Row: {
          id: string
          staff_id: string
          date: string
          sales_amount: number | null
          contracts_count: number | null
          tasks_completed: number | null
          attendance_rate: number | null
          external_source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          date: string
          sales_amount?: number | null
          contracts_count?: number | null
          tasks_completed?: number | null
          attendance_rate?: number | null
          external_source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          date?: string
          sales_amount?: number | null
          contracts_count?: number | null
          tasks_completed?: number | null
          attendance_rate?: number | null
          external_source?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
