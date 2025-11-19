import { EvaluationCategory } from '@/types'

export interface EvaluationItemDefinition {
  id: string
  category: EvaluationCategory
  name: string
  description: string
  minScore: number
  maxScore: number
  weight?: number
}

/**
 * 成果評価項目 (-15 ~ 100点)
 */
export const PERFORMANCE_ITEMS: EvaluationItemDefinition[] = [
  {
    id: 'achievement',
    category: 'performance',
    name: '実績評価',
    description: '売上や契約数などの実績を評価',
    minScore: 0,
    maxScore: 25,
  },
  {
    id: 'attendance',
    category: 'performance',
    name: '勤怠評価',
    description: '出勤状況や遅刻・早退を評価',
    minScore: -5,
    maxScore: 5,
  },
  {
    id: 'compliance',
    category: 'performance',
    name: 'コンプライアンス評価',
    description: '規則遵守やコンプライアンス意識を評価',
    minScore: -10,
    maxScore: 3,
  },
  {
    id: 'client',
    category: 'performance',
    name: 'クライアント評価',
    description: 'クライアントからの評価や満足度',
    minScore: 0,
    maxScore: 15,
  },
]

/**
 * 行動評価項目 (0 ~ 30点)
 */
export const BEHAVIOR_ITEMS: EvaluationItemDefinition[] = [
  {
    id: 'initiative',
    category: 'behavior',
    name: '主体性評価',
    description: '自発的な行動や提案を評価',
    minScore: 0,
    maxScore: 10,
  },
  {
    id: 'responsibility',
    category: 'behavior',
    name: '責任感',
    description: '仕事への責任感や完遂力を評価',
    minScore: 0,
    maxScore: 7,
  },
  {
    id: 'cooperation',
    category: 'behavior',
    name: '協調性評価',
    description: 'チームワークや協力姿勢を評価',
    minScore: 0,
    maxScore: 10,
  },
  {
    id: 'appearance',
    category: 'behavior',
    name: 'アピアランス評価',
    description: '身だしなみや印象を評価',
    minScore: 0,
    maxScore: 3,
  },
]

/**
 * 成長評価項目 (0 ~ 30点)
 */
export const GROWTH_ITEMS: EvaluationItemDefinition[] = [
  {
    id: 'selfImprovement',
    category: 'growth',
    name: '自己研鑽評価',
    description: '自己学習や成長への取り組みを評価',
    minScore: 0,
    maxScore: 7,
  },
  {
    id: 'response',
    category: 'growth',
    name: 'レスポンス評価',
    description: '迅速な対応や反応を評価',
    minScore: 0,
    maxScore: 5,
  },
  {
    id: 'goalAchievement',
    category: 'growth',
    name: '自己目標達成評価',
    description: '設定した目標の達成度を評価',
    minScore: 0,
    maxScore: 10,
  },
]

/**
 * 全評価項目
 */
export const ALL_EVALUATION_ITEMS: EvaluationItemDefinition[] = [
  ...PERFORMANCE_ITEMS,
  ...BEHAVIOR_ITEMS,
  ...GROWTH_ITEMS,
]

/**
 * カテゴリ別の最大スコア
 */
export const CATEGORY_MAX_SCORES = {
  performance: 100, // -15 ~ 100点（マイナス含む）
  behavior: 30,
  growth: 30,
}

/**
 * 合計最大スコア
 */
export const TOTAL_MAX_SCORE = 160 // 理論上の最大値

/**
 * カテゴリ名
 */
export const CATEGORY_NAMES: Record<EvaluationCategory, string> = {
  performance: '成果評価',
  behavior: '行動評価',
  growth: '成長評価',
}

/**
 * カテゴリの説明
 */
export const CATEGORY_DESCRIPTIONS: Record<EvaluationCategory, string> = {
  performance: '売上や実績、勤怠など業務成果に関する評価',
  behavior: '主体性、責任感、協調性など行動面に関する評価',
  growth: '自己研鑽、レスポンス、目標達成など成長面に関する評価',
}
