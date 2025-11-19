import { EvaluationRank, EvaluationFormData, EvaluationScores, RankInfo } from '@/types'

/**
 * 評価フォームデータから各カテゴリのスコアと合計スコアを計算
 */
export function calculateScores(formData: EvaluationFormData): EvaluationScores {
  // 成果評価スコア (-15 ~ 100点)
  const performanceScore =
    formData.performance.achievement +
    formData.performance.attendance +
    formData.performance.compliance +
    formData.performance.client

  // 行動評価スコア (0 ~ 30点)
  const behaviorScore =
    formData.behavior.initiative +
    formData.behavior.responsibility +
    formData.behavior.cooperation +
    formData.behavior.appearance

  // 成長評価スコア (0 ~ 30点)
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
 * 複数の管理者からの評価の平均スコアを計算
 */
export function calculateAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((acc, score) => acc + score, 0)
  return Math.round((sum / scores.length) * 100) / 100 // 小数点第2位まで
}

/**
 * スコアに基づいてランクを判定
 */
export function determineRank(score: number): EvaluationRank {
  if (score >= 95) return 'SS'
  if (score >= 90) return 'S'
  if (score >= 85) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'A-'
  if (score >= 60) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

/**
 * ランクに基づいて報酬額を計算
 */
export function calculateReward(rank: EvaluationRank): number {
  const rewardMap: Record<EvaluationRank, number> = {
    'SS': 15000,
    'S': 10000,
    'A+': 4000,
    'A': 3000,
    'A-': 2000,
    'B': 0,
    'C': -5000,
    'D': -10000,
  }
  return rewardMap[rank]
}

/**
 * ランク情報を取得
 */
export function getRankInfo(rank: EvaluationRank): RankInfo {
  const reward = calculateReward(rank)
  const descriptions: Record<EvaluationRank, string> = {
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
    rank,
    reward,
    description: descriptions[rank],
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
 * ランクの色を取得（UI表示用）
 * 指定カラーパレットのみ使用: #017598, #087ea2, #05a7be, #18c4b8, #1ed7cd, #ffffff
 */
export function getRankColor(rank: EvaluationRank): string {
  const colorMap: Record<EvaluationRank, string> = {
    'SS': 'bg-[#1ed7cd] text-[#000] border-2 border-[#1ed7cd] font-bold', // 最優秀: Light Cyan bg
    'S': 'bg-[#18c4b8] text-[#000] border-2 border-[#18c4b8] font-bold',  // 優秀: Light Teal bg
    'A+': 'bg-[#05a7be] text-[#000] border-2 border-[#05a7be] font-bold',     // 非常に良好: Medium Teal bg
    'A': 'bg-[#087ea2] text-[#000] border-2 border-[#087ea2] font-bold',      // 良好: Medium Dark Teal bg
    'A-': 'bg-[#087ea2] text-[#000] border-2 border-[#087ea2]',  // 良好: Medium Dark Teal bg
    'B': 'bg-[#18c4b8] text-[#000] border-2 border-[#18c4b8]', // 標準: Light Teal bg
    'C': 'bg-[#087ea2] text-[#000] border-2 border-[#087ea2]', // 改善必要: Medium Dark Teal bg
    'D': 'bg-[#017598] text-[#000] border-2 border-[#017598] font-bold',      // 大幅改善必要: Dark Teal bg
  }
  return colorMap[rank]
}

/**
 * 評価項目の範囲チェック
 */
export function validateScore(score: number, min: number, max: number): boolean {
  return score >= min && score <= max
}

/**
 * 評価フォームデータのバリデーション
 */
export function validateEvaluationForm(formData: EvaluationFormData): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 成果評価のバリデーション
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

  // 行動評価のバリデーション
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

  // 成長評価のバリデーション
  if (!validateScore(formData.growth.selfImprovement, 0, 7)) {
    errors.push('自己研鑽評価は0〜7点の範囲で入力してください')
  }
  if (!validateScore(formData.growth.response, 0, 5)) {
    errors.push('レスポンス評価は0〜5点の範囲で入力してください')
  }
  if (!validateScore(formData.growth.goalAchievement, 0, 10)) {
    errors.push('自己目標達成評価は0〜10点の範囲で入力してください')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
