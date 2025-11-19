import { Database } from './database'

// Database types
export type Company = Database['public']['Tables']['companies']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Evaluation = Database['public']['Tables']['evaluations']['Row']
export type EvaluationResponse = Database['public']['Tables']['evaluation_responses']['Row']
export type EvaluationItem = Database['public']['Tables']['evaluation_items']['Row']
export type AdminComment = Database['public']['Tables']['admin_comments']['Row']
export type StaffGoal = Database['public']['Tables']['staff_goals']['Row']
export type EvaluationQuestion = Database['public']['Tables']['evaluation_questions']['Row']
export type EvaluationItemMaster = Database['public']['Tables']['evaluation_items_master']['Row']
export type EvaluationCycle = Database['public']['Tables']['evaluation_cycles']['Row']
export type ProductivityData = Database['public']['Tables']['productivity_data']['Row']

// 新しい月次評価システム用の型
export interface QuarterlyReport {
  id: string
  staff_id: string
  year: number
  quarter: number
  average_score: number
  evaluation_count: number
  created_at: string
  updated_at: string
}

export interface AnnualEvaluation {
  id: string
  staff_id: string
  year: number
  average_score: number
  rank: EvaluationRank
  evaluation_count: number
  created_at: string
  updated_at: string
}

// Enums
export type UserRole = 'admin' | 'staff'
export type EvaluationStatus = 'draft' | 'submitted' | 'completed'
export type EvaluationRank = 'SS' | 'S' | 'A+' | 'A' | 'A-' | 'B' | 'C' | 'D'
export type EvaluationCategory = 'performance' | 'behavior' | 'growth'
export type GoalStatus = 'active' | 'completed' | 'abandoned'
export type CycleStatus = 'planning' | 'active' | 'completed'

// Extended types with relations
export interface EvaluationWithDetails extends Evaluation {
  staff: User
  responses: EvaluationResponseWithDetails[]
  admin_comments: (AdminComment & { admin: User })[]
}

export interface EvaluationResponseWithDetails extends EvaluationResponse {
  admin: User
  items: EvaluationItem[]
}

// 月次評価詳細型
export interface MonthlyEvaluationSummary {
  year: number
  month: number
  evaluations: Evaluation[]
  average_score: number
  staff: User
}

// 四半期レポート詳細型
export interface QuarterlyReportWithDetails extends QuarterlyReport {
  staff: User
  monthly_evaluations: MonthlyEvaluationSummary[]
}

// 年次評価詳細型
export interface AnnualEvaluationWithDetails extends AnnualEvaluation {
  staff: User
  quarterly_reports: QuarterlyReport[]
  monthly_evaluations: MonthlyEvaluationSummary[]
}

// Form types
export interface EvaluationFormData {
  // 成果評価 (-15 ~ 100点)
  performance: {
    achievement: number // 実績評価 (0~25)
    attendance: number // 勤怠評価 (-5~5)
    compliance: number // コンプライアンス評価 (-10~3)
    client: number // クライアント評価 (0~15)
  }
  // 行動評価 (0 ~ 30点)
  behavior: {
    initiative: number // 主体性評価 (0~10)
    responsibility: number // 責任感 (0~7)
    cooperation: number // 協調性評価 (0~10)
    appearance: number // アピアランス評価 (0~3)
  }
  // 成長評価 (0 ~ 30点)
  growth: {
    selfImprovement: number // 自己研鑽評価 (0~7)
    response: number // レスポンス評価 (0~5)
    goalAchievement: number // 自己目標達成評価 (0~10)
  }
  // コメント
  comments: {
    [key: string]: string
  }
}

// Evaluation calculation types
export interface EvaluationScores {
  performanceScore: number
  behaviorScore: number
  growthScore: number
  totalScore: number
}

export interface RankInfo {
  rank: EvaluationRank
  reward: number
  description: string
}

// Analytics types
export interface EvaluationAnalytics {
  totalStaff: number
  completedEvaluations: number
  averageScore: number
  rankDistribution: Record<EvaluationRank, number>
  departmentScores: Record<string, number>
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
