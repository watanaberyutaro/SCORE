import { EvaluationRank, EvaluationFormData, EvaluationScores, RankInfo } from '@/types'

// デフォルトのランク設定（後方互換性のため）
const DEFAULT_RANKS = [
  { rank_name: 'SS', min_score: 95, amount: 15000, display_order: 8 },
  { rank_name: 'S', min_score: 90, amount: 10000, display_order: 7 },
  { rank_name: 'A+', min_score: 85, amount: 4000, display_order: 6 },
  { rank_name: 'A', min_score: 80, amount: 3000, display_order: 5 },
  { rank_name: 'A-', min_score: 75, amount: 2000, display_order: 4 },
  { rank_name: 'B', min_score: 60, amount: 0, display_order: 3 },
  { rank_name: 'C', min_score: 40, amount: -5000, display_order: 2 },
  { rank_name: 'D', min_score: 0, amount: -10000, display_order: 1 },
]

export interface RankSetting {
  rank_name: string
  min_score: number
  amount: number
  display_order?: number
}

export interface EvaluationItemMaster {
  id: string
  category: string
  item_name: string
  min_score: number
  max_score: number
}

/**
 * 評価フォームデータから各カテゴリのスコアと合計スコアを計算
 * 動的な評価項目に対応
 */
export function calculateScores(formData: EvaluationFormData): EvaluationScores {
  // 成果評価スコア
  const performanceScore =
    formData.performance.achievement +
    formData.performance.attendance +
    formData.performance.compliance +
    formData.performance.client

  // 行動評価スコア
  const behaviorScore =
    formData.behavior.initiative +
    formData.behavior.responsibility +
    formData.behavior.cooperation +
    formData.behavior.appearance

  // 成長評価スコア
  const growthScore =
    formData.growth.selfImprovement +
    formData.growth.response +
    formData.growth.goalAchievement

  // 合計スコア
  const totalScore = performanceScore + behaviorScore + growthScore

  return {
    performanceScore,
    behaviorScore,
    growthScore,
    totalScore,
  }
}

/**
 * 動的な評価項目からスコアを計算
 */
export function calculateScoresFromItems(items: Array<{ category: string; score: number }>): {
  performanceScore: number
  behaviorScore: number
  growthScore: number
  totalScore: number
} {
  let performanceScore = 0
  let behaviorScore = 0
  let growthScore = 0

  items.forEach((item) => {
    if (item.category === 'performance') {
      performanceScore += item.score
    } else if (item.category === 'behavior') {
      behaviorScore += item.score
    } else if (item.category === 'growth') {
      growthScore += item.score
    }
  })

  const totalScore = performanceScore + behaviorScore + growthScore

  return {
    performanceScore,
    behaviorScore,
    growthScore,
    totalScore,
  }
}

/**
 * 複数の管理者からの評価の平均スコアを計算
 */
export function calculateAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((acc, score) => acc + score, 0)
  return Math.round((sum / scores.length) * 100) / 100 // 小数点第2位まで
}

/**
 * スコアに基づいてランクを判定（動的ランク設定対応）
 */
export function determineRank(score: number, rankSettings?: RankSetting[]): string {
  const ranks = rankSettings && rankSettings.length > 0 ? rankSettings : DEFAULT_RANKS

  // display_orderの降順でソート（高い順）
  const sortedRanks = [...ranks].sort((a, b) => (b.display_order || 0) - (a.display_order || 0))

  // スコアが基準を満たす最初のランクを返す
  for (const rank of sortedRanks) {
    if (score >= rank.min_score) {
      return rank.rank_name
    }
  }

  // どのランクにも該当しない場合は最低ランクを返す
  return sortedRanks[sortedRanks.length - 1]?.rank_name || 'D'
}

/**
 * ランクに基づいて報酬額を計算（動的ランク設定対応）
 */
export function calculateReward(rank: string, rankSettings?: RankSetting[]): number {
  const ranks = rankSettings && rankSettings.length > 0 ? rankSettings : DEFAULT_RANKS
  const rankSetting = ranks.find((r) => r.rank_name === rank)
  return rankSetting?.amount || 0
}

/**
 * ランク情報を取得（動的ランク設定対応）
 */
export function getRankInfo(rank: string, rankSettings?: RankSetting[]): RankInfo {
  const reward = calculateReward(rank, rankSettings)

  // デフォルトの説明
  const defaultDescriptions: Record<string, string> = {
    'SS': '最優秀評価',
    'S': '優秀評価',
    'A+': '非常に良好',
    'A': '良好',
    'A-': '良好',
    'B': '標準',
    'C': '改善が必要',
    'D': '大幅な改善が必要',
  }

  return {
    rank: rank as EvaluationRank,
    reward,
    description: defaultDescriptions[rank] || rank,
  }
}

/**
 * 報酬の表示形式を取得
 */
export function getRewardDisplay(reward: number): string {
  if (reward > 0) {
    return `+¥${reward.toLocaleString()}`
  } else if (reward < 0) {
    return `-¥${Math.abs(reward).toLocaleString()}`
  }
  return '±¥0'
}

/**
 * スコアの色を取得（UI表示用）
 * 指定カラーパレットのみ使用: #017598, #087ea2, #05a7be, #18c4b8, #1ed7cd, #ffffff
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-[#18c4b8]' // 高スコア: Light Teal
  if (score >= 80) return 'text-[#05a7be]' // 良好: Medium Teal
  if (score >= 70) return 'text-[#087ea2]' // 標準: Medium Dark Teal
  if (score >= 60) return 'text-[#017598]' // やや低い: Dark Teal
  return 'text-[#017598]' // 低スコア: Dark Teal
}

/**
 * ランクの色を取得（UI表示用・動的ランク対応）
 * 指定カラーパレットのみ使用: #017598, #087ea2, #05a7be, #18c4b8, #1ed7cd, #ffffff
 */
export function getRankColor(rank: string, rankSettings?: RankSetting[]): string {
  const ranks = rankSettings && rankSettings.length > 0 ? rankSettings : DEFAULT_RANKS
  const sortedRanks = [...ranks].sort((a, b) => (b.display_order || 0) - (a.display_order || 0))

  // ランクのインデックスを取得
  const rankIndex = sortedRanks.findIndex((r) => r.rank_name === rank)
  const totalRanks = sortedRanks.length

  // デフォルトの色マッピング（後方互換性）
  const defaultColorMap: Record<string, string> = {
    'SS': 'bg-[#1ed7cd] text-[#000] border-2 border-[#1ed7cd] font-bold',
    'S': 'bg-[#18c4b8] text-[#000] border-2 border-[#18c4b8] font-bold',
    'A+': 'bg-[#05a7be] text-[#000] border-2 border-[#05a7be] font-bold',
    'A': 'bg-[#087ea2] text-[#000] border-2 border-[#087ea2] font-bold',
    'A-': 'bg-[#087ea2] text-[#000] border-2 border-[#087ea2]',
    'B': 'bg-[#18c4b8] text-[#000] border-2 border-[#18c4b8]',
    'C': 'bg-[#087ea2] text-[#000] border-2 border-[#087ea2]',
    'D': 'bg-[#017598] text-[#000] border-2 border-[#017598] font-bold',
  }

  if (defaultColorMap[rank]) {
    return defaultColorMap[rank]
  }

  // カスタムランクの場合、位置に基づいて色を割り当て
  const colors = ['#1ed7cd', '#18c4b8', '#05a7be', '#087ea2', '#017598']
  const colorIndex = Math.min(Math.floor((rankIndex / totalRanks) * colors.length), colors.length - 1)
  const color = colors[colorIndex]

  return `bg-[${color}] text-[#000] border-2 border-[${color}] font-bold`
}

/**
 * 評価項目の範囲チェック
 */
export function validateScore(score: number, min: number, max: number): boolean {
  return score >= min && score <= max
}

/**
 * 評価フォームデータのバリデーション（動的評価項目対応）
 */
export function validateEvaluationForm(
  formData: EvaluationFormData,
  itemsMaster?: EvaluationItemMaster[]
): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!itemsMaster || itemsMaster.length === 0) {
    // デフォルトのバリデーション（後方互換性）
    if (!validateScore(formData.performance.achievement, 0, 25)) {
      errors.push('実績評価は0〜25点の範囲で入力してください')
    }
    if (!validateScore(formData.performance.attendance, -5, 5)) {
      errors.push('勤怠評価は-5〜5点の範囲で入力してください')
    }
    if (!validateScore(formData.performance.compliance, -10, 3)) {
      errors.push('コンプライアンス評価は-10〜3点の範囲で入力してください')
    }
    if (!validateScore(formData.performance.client, 0, 15)) {
      errors.push('クライアント評価は0〜15点の範囲で入力してください')
    }
    if (!validateScore(formData.behavior.initiative, 0, 10)) {
      errors.push('主体性評価は0〜10点の範囲で入力してください')
    }
    if (!validateScore(formData.behavior.responsibility, 0, 7)) {
      errors.push('責任感は0〜7点の範囲で入力してください')
    }
    if (!validateScore(formData.behavior.cooperation, 0, 10)) {
      errors.push('協調性評価は0〜10点の範囲で入力してください')
    }
    if (!validateScore(formData.behavior.appearance, 0, 3)) {
      errors.push('アピアランス評価は0〜3点の範囲で入力してください')
    }
    if (!validateScore(formData.growth.selfImprovement, 0, 7)) {
      errors.push('自己研鑽評価は0〜7点の範囲で入力してください')
    }
    if (!validateScore(formData.growth.response, 0, 5)) {
      errors.push('レスポンス評価は0〜5点の範囲で入力してください')
    }
    if (!validateScore(formData.growth.goalAchievement, 0, 10)) {
      errors.push('自己目標達成評価は0〜10点の範囲で入力してください')
    }
  } else {
    // 動的な評価項目のバリデーション
    itemsMaster.forEach((item) => {
      let score: number | undefined

      // カテゴリと項目名に基づいてスコアを取得
      if (item.category === 'performance') {
        const key = Object.keys(formData.performance).find((k) =>
          formData.performance[k as keyof typeof formData.performance] !== undefined
        )
        if (key) score = formData.performance[key as keyof typeof formData.performance]
      } else if (item.category === 'behavior') {
        const key = Object.keys(formData.behavior).find((k) =>
          formData.behavior[k as keyof typeof formData.behavior] !== undefined
        )
        if (key) score = formData.behavior[key as keyof typeof formData.behavior]
      } else if (item.category === 'growth') {
        const key = Object.keys(formData.growth).find((k) =>
          formData.growth[k as keyof typeof formData.growth] !== undefined
        )
        if (key) score = formData.growth[key as keyof typeof formData.growth]
      }

      if (score !== undefined && !validateScore(score, item.min_score, item.max_score)) {
        errors.push(`${item.item_name}は${item.min_score}〜${item.max_score}点の範囲で入力してください`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 全てのランク設定を取得（デフォルト含む）
 */
export function getAllRanks(rankSettings?: RankSetting[]): RankSetting[] {
  return rankSettings && rankSettings.length > 0 ? rankSettings : DEFAULT_RANKS
}
