import { EvaluationRank } from '@/types'

export interface RankDefinition {
  rank: EvaluationRank
  minScore: number
  maxScore: number | null
  reward: number
  description: string
  color: string
}

/**
 * ランク定義
 */
export const RANK_DEFINITIONS: RankDefinition[] = [
  {
    rank: 'SS',
    minScore: 95,
    maxScore: null,
    reward: 15000,
    description: '最優秀評価',
    color: 'purple',
  },
  {
    rank: 'S',
    minScore: 90,
    maxScore: 94,
    reward: 10000,
    description: '優秀評価',
    color: 'green',
  },
  {
    rank: 'A+',
    minScore: 85,
    maxScore: 89,
    reward: 4000,
    description: '非常に良好',
    color: 'blue',
  },
  {
    rank: 'A',
    minScore: 80,
    maxScore: 84,
    reward: 3000,
    description: '良好',
    color: 'blue',
  },
  {
    rank: 'A-',
    minScore: 75,
    maxScore: 79,
    reward: 2000,
    description: '良好',
    color: 'blue',
  },
  {
    rank: 'B',
    minScore: 60,
    maxScore: 74,
    reward: 0,
    description: '標準',
    color: 'gray',
  },
  {
    rank: 'C',
    minScore: 55,
    maxScore: 59,
    reward: -5000,
    description: '改善が必要',
    color: 'orange',
  },
  {
    rank: 'D',
    minScore: 0,
    maxScore: 54,
    reward: -10000,
    description: '大幅な改善が必要',
    color: 'red',
  },
]

/**
 * ランクの順序
 */
export const RANK_ORDER: EvaluationRank[] = ['SS', 'S', 'A+', 'A', 'A-', 'B', 'C', 'D']

/**
 * ランクの色マップ
 */
export const RANK_COLORS: Record<EvaluationRank, string> = {
  SS: 'bg-purple-100 text-purple-800 border-purple-300',
  S: 'bg-green-100 text-green-800 border-green-300',
  'A+': 'bg-blue-100 text-blue-800 border-blue-300',
  A: 'bg-blue-50 text-blue-700 border-blue-200',
  'A-': 'bg-blue-50 text-blue-600 border-blue-200',
  B: 'bg-gray-100 text-gray-800 border-gray-300',
  C: 'bg-orange-100 text-orange-800 border-orange-300',
  D: 'bg-red-100 text-red-800 border-red-300',
}

/**
 * 報酬タイプ
 */
export const REWARD_TYPES: Record<EvaluationRank, 'addition' | 'fixed'> = {
  SS: 'addition',
  S: 'addition',
  'A+': 'addition',
  A: 'addition',
  'A-': 'addition',
  B: 'fixed',
  C: 'fixed',
  D: 'fixed',
}

/**
 * 報酬の説明
 */
export const REWARD_DESCRIPTIONS: Record<EvaluationRank, string> = {
  SS: '+15,000円（加算式）',
  S: '+10,000円（加算式）',
  'A+': '+4,000円（加算式）',
  A: '+3,000円（加算式）',
  'A-': '+2,000円（加算式）',
  B: '特に無し',
  C: '-5,000円（固定式）',
  D: '-10,000円（固定式）',
}
