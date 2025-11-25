/**
 * カテゴリマッピングユーティリティ
 * 企業ごとのカスタムカテゴリ設定に対応
 */

export interface CategoryMaster {
  id: string
  category_key: string
  category_label: string
  display_order: number
  description?: string
}

// デフォルトのカテゴリマッピング（後方互換性）
const DEFAULT_CATEGORIES: CategoryMaster[] = [
  {
    id: 'default-1',
    category_key: 'performance',
    category_label: '成果評価',
    display_order: 1,
    description: '実績・勤怠・コンプライアンス・クライアント評価',
  },
  {
    id: 'default-2',
    category_key: 'behavior',
    category_label: '行動評価',
    display_order: 2,
    description: '主体性・責任感・協調性・アピアランス評価',
  },
  {
    id: 'default-3',
    category_key: 'growth',
    category_label: '成長評価',
    display_order: 3,
    description: '自己研鑽・レスポンス・自己目標達成評価',
  },
]

/**
 * カテゴリキーから日本語名を取得
 */
export function getCategoryName(
  categoryKey: string,
  categories?: CategoryMaster[]
): string {
  const categoryList = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES
  const category = categoryList.find((c) => c.category_key === categoryKey)
  return category?.category_label || categoryKey
}

/**
 * 全てのカテゴリを表示順でソートして取得
 */
export function getAllCategories(categories?: CategoryMaster[]): CategoryMaster[] {
  const categoryList = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES
  return [...categoryList].sort((a, b) => a.display_order - b.display_order)
}

/**
 * カテゴリキーのマップを作成（パフォーマンス最適化用）
 */
export function createCategoryMap(
  categories?: CategoryMaster[]
): Map<string, CategoryMaster> {
  const categoryList = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES
  const map = new Map<string, CategoryMaster>()
  categoryList.forEach((cat) => {
    map.set(cat.category_key, cat)
  })
  return map
}

/**
 * カテゴリの色を取得（UI表示用）
 */
export function getCategoryColor(categoryKey: string): {
  from: string
  to: string
} {
  const colorMap: Record<string, { from: string; to: string }> = {
    performance: { from: '#017598', to: '#087ea2' }, // ダークティール
    behavior: { from: '#05a7be', to: '#18c4b8' }, // ミディアムティール
    growth: { from: '#18c4b8', to: '#1ed7cd' }, // ライトシアン
  }

  return colorMap[categoryKey] || { from: '#05a7be', to: '#18c4b8' }
}

/**
 * カテゴリのアイコンを取得
 */
export function getCategoryIcon(categoryKey: string): string {
  const iconMap: Record<string, string> = {
    performance: 'TrendingUp',
    behavior: 'Award',
    growth: 'Target',
  }

  return iconMap[categoryKey] || 'Activity'
}

/**
 * デフォルトカテゴリを取得
 */
export function getDefaultCategories(): CategoryMaster[] {
  return DEFAULT_CATEGORIES
}
