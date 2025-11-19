import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

/**
 * 日付を指定フォーマットで表示
 */
export function formatDate(date: string | Date, formatStr: string = 'yyyy年MM月dd日'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: ja })
  } catch (error) {
    return '無効な日付'
  }
}

/**
 * 日時を指定フォーマットで表示
 */
export function formatDateTime(date: string | Date, formatStr: string = 'yyyy年MM月dd日 HH:mm'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: ja })
  } catch (error) {
    return '無効な日時'
  }
}

/**
 * 相対的な日時表示（例: 2時間前、3日前）
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

    if (diffInSeconds < 60) return 'たった今'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}週間前`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}ヶ月前`
    return `${Math.floor(diffInSeconds / 31536000)}年前`
  } catch (error) {
    return '不明'
  }
}

/**
 * 通貨フォーマット
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`
}

/**
 * パーセンテージフォーマット
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * 数値フォーマット（3桁区切り）
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * スコアフォーマット
 */
export function formatScore(score: number): string {
  return `${score.toFixed(1)}点`
}

/**
 * 評価期間フォーマット（例: 2025-Q1 → 2025年第1四半期）
 */
export function formatEvaluationPeriod(period: string): string {
  const match = period.match(/(\d{4})-Q(\d)/)
  if (match) {
    const [, year, quarter] = match
    return `${year}年第${quarter}四半期`
  }
  return period
}

/**
 * 目標の進捗状況を色付きで表示
 */
export function getAchievementColor(rate: number): string {
  if (rate >= 100) return 'text-green-600'
  if (rate >= 80) return 'text-blue-600'
  if (rate >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * 評価ステータスの日本語表示
 */
export function getStatusLabel(status: 'draft' | 'submitted' | 'completed'): string {
  const labels = {
    draft: '下書き',
    submitted: '提出済み',
    completed: '完了',
  }
  return labels[status] || status
}

/**
 * ユーザーロールの日本語表示
 */
export function getRoleLabel(role: 'admin' | 'staff'): string {
  const labels = {
    admin: '管理者',
    staff: 'スタッフ',
  }
  return labels[role] || role
}

/**
 * 目標ステータスの日本語表示
 */
export function getGoalStatusLabel(status: 'active' | 'completed' | 'abandoned'): string {
  const labels = {
    active: '進行中',
    completed: '達成',
    abandoned: '中止',
  }
  return labels[status] || status
}

/**
 * ファイルサイズフォーマット
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 名前の略称を取得（アバター表示用）
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * テキストを指定文字数で切り詰め
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}
