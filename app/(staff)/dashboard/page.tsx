import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getRankColor, type RankSetting } from '@/lib/utils/evaluation-calculator'
import { formatDate } from '@/lib/utils/format'
import { Award, Target, MessageSquare, TrendingUp, TrendingDown, Minus, Clock, CheckCircle, AlertCircle, Zap, Trophy, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { determineRank } from '@/lib/utils/evaluation-calculator'
import { getCategoryName, type CategoryMaster } from '@/lib/utils/category-mapper'

async function getDashboardData(userId: string, companyId: string) {
  const supabase = await createSupabaseServerClient()

  // 企業のランク設定を取得
  const { data: rankSettings } = await supabase
    .from('rank_settings')
    .select('rank_name, min_score, amount, display_order')
    .eq('company_id', companyId)
    .order('display_order', { ascending: false })

  // 現在の期を計算（7月始まり）
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  // 7月以降なら現在の年が期の開始年、6月以前なら前の年が期の開始年
  const fiscalYearStart = currentMonth >= 7 ? currentYear : currentYear - 1
  const fiscalYearEnd = fiscalYearStart + 1

  console.log('現在の期:', `${fiscalYearStart}年7月〜${fiscalYearEnd}年6月`)

  // 現在の期の全評価を取得
  const { data: currentFiscalYearEvaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      responses:evaluation_responses(
        *,
        admin:users!evaluation_responses_admin_id_fkey(full_name),
        items:evaluation_items(*)
      ),
      comments:admin_comments(
        *,
        admin:users!admin_comments_admin_id_fkey(full_name)
      )
    `)
    .eq('staff_id', userId)
    .or(
      `and(evaluation_year.eq.${fiscalYearStart},evaluation_month.gte.7),` +
      `and(evaluation_year.eq.${fiscalYearEnd},evaluation_month.lte.6)`
    )
    .order('evaluation_year', { ascending: false })
    .order('evaluation_month', { ascending: false })

  // 過去6ヶ月の評価を取得（推移表示用）
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      responses:evaluation_responses(
        *,
        admin:users!evaluation_responses_admin_id_fkey(full_name),
        items:evaluation_items(*)
      ),
      comments:admin_comments(
        *,
        admin:users!admin_comments_admin_id_fkey(full_name)
      )
    `)
    .eq('staff_id', userId)
    .order('evaluation_year', { ascending: false })
    .order('evaluation_month', { ascending: false })
    .limit(6)

  // 期の平均スコアを計算
  const fiscalYearScores = (currentFiscalYearEvaluations || [])
    .filter(e => e.total_score !== null && e.total_score !== undefined)
    .map(e => e.total_score!)

  const fiscalYearAverageScore = fiscalYearScores.length > 0
    ? fiscalYearScores.reduce((sum, score) => sum + score, 0) / fiscalYearScores.length
    : null

  // 期の平均ランクを判定
  const fiscalYearAverageRank = fiscalYearAverageScore !== null
    ? determineRank(fiscalYearAverageScore, rankSettings || undefined)
    : null

  // カテゴリ別スコアの平均も計算
  const avgPerformance = (currentFiscalYearEvaluations || [])
    .filter(e => e.performance_score !== null)
    .reduce((sum, e, _, arr) => sum + (e.performance_score || 0) / arr.length, 0)

  const avgBehavior = (currentFiscalYearEvaluations || [])
    .filter(e => e.behavior_score !== null)
    .reduce((sum, e, _, arr) => sum + (e.behavior_score || 0) / arr.length, 0)

  const avgGrowth = (currentFiscalYearEvaluations || [])
    .filter(e => e.growth_score !== null)
    .reduce((sum, e, _, arr) => sum + (e.growth_score || 0) / arr.length, 0)

  const latestEvaluation = evaluations?.[0]
  const previousEvaluation = evaluations?.[1]

  console.log('期の評価数:', fiscalYearScores.length)
  console.log('期の平均スコア:', fiscalYearAverageScore)

  // 目標を取得
  const { data: goals } = await supabase
    .from('staff_goals')
    .select('*')
    .eq('staff_id', userId)
    .order('target_date', { ascending: true })

  // 未回答の質問数
  const { count: unansweredQuestions } = await supabase
    .from('evaluation_questions')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', userId)
    .is('answer', null)

  return {
    evaluations: evaluations || [],
    latestEvaluation,
    previousEvaluation,
    fiscalYearAverageScore,
    fiscalYearAverageRank,
    fiscalYearEvaluationCount: fiscalYearScores.length,
    fiscalYearStart,
    fiscalYearEnd,
    avgPerformance,
    avgBehavior,
    avgGrowth,
    goals: goals || [],
    activeGoals: goals?.filter(g => g.status === 'active') || [],
    completedGoals: goals?.filter(g => g.status === 'completed') || [],
    unansweredQuestions: unansweredQuestions || 0,
  }
}

export default async function StaffDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const data = await getDashboardData(user.id, user.company_id)

  // 企業のカテゴリマスターを取得
  const supabase = await createSupabaseServerClient()

  const { data: categoryMasters } = await supabase
    .from('evaluation_categories')
    .select('id, category_key, category_label, display_order, description')
    .eq('company_id', user.company_id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // ランク設定も取得（表示用）
  const { data: rankSettings } = await supabase
    .from('rank_settings')
    .select('rank_name, min_score, amount, display_order')
    .eq('company_id', user.company_id)
    .order('display_order', { ascending: false })

  // 前月比較の計算（最新月と前月の比較）
  const scoreChange = data.latestEvaluation && data.previousEvaluation &&
    data.latestEvaluation.total_score && data.previousEvaluation.total_score
    ? data.latestEvaluation.total_score - data.previousEvaluation.total_score
    : null

  // カテゴリ別スコアは期の平均を使用
  const categoryScores = data.fiscalYearAverageScore !== null ? {
    performance: data.avgPerformance || 0,
    behavior: data.avgBehavior || 0,
    growth: data.avgGrowth || 0,
  } : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">
          {user.full_name}さんのダッシュボード
        </h1>
        <p className="mt-2 text-sm text-black">
          あなたの評価結果、目標、パフォーマンスデータを確認できます
        </p>
      </div>

      {/* トップ統計カード */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-8">
        <Card className="border-2" style={{ borderColor: '#05a7be' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">期の総合スコア</CardTitle>
            <Award className="h-5 w-5" style={{ color: '#05a7be' }} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">
              {data.fiscalYearAverageScore !== null ? data.fiscalYearAverageScore.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-black mt-1">
              {data.fiscalYearStart}年7月〜{data.fiscalYearEnd}年6月
            </p>
            <p className="text-xs text-black mt-1">
              評価月数: {data.fiscalYearEvaluationCount}ヶ月
            </p>
            {scoreChange !== null && (
              <div className="flex items-center mt-2">
                {scoreChange > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 mr-1" style={{ color: '#18c4b8' }} />
                    <span className="text-sm font-medium" style={{ color: '#18c4b8' }}>
                      +{scoreChange.toFixed(1)}
                    </span>
                  </>
                ) : scoreChange < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4 mr-1" style={{ color: '#087ea2' }} />
                    <span className="text-sm font-medium" style={{ color: '#087ea2' }}>
                      {scoreChange.toFixed(1)}
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-1 text-black" />
                    <span className="text-sm font-medium text-black">±0</span>
                  </>
                )}
                <span className="text-xs text-black ml-1">前月比</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: '#18c4b8' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">期の平均ランク</CardTitle>
            <Trophy className="h-5 w-5" style={{ color: '#18c4b8' }} />
          </CardHeader>
          <CardContent>
            {data.fiscalYearAverageRank ? (
              <>
                <Badge className={`text-3xl px-3 py-1 ${getRankColor(data.fiscalYearAverageRank, rankSettings || undefined)}`}>
                  {data.fiscalYearAverageRank}
                </Badge>
                <p className="text-xs text-black mt-2">期の平均評価</p>
              </>
            ) : (
              <p className="text-sm text-black">評価中</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ - 2カラム */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* 左カラム */}
        <div className="space-y-6">
          {/* カテゴリ別評価 */}
          {categoryScores && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-black">
                  <BarChart3 className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
                  カテゴリ別評価
                </CardTitle>
                <CardDescription className="text-black">
                  成果・行動・成長の3つの観点
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black">成果評価</span>
                      <span className="text-lg font-bold" style={{ color: '#017598' }}>
                        {categoryScores.performance.toFixed(1)}点
                      </span>
                    </div>
                    <div className="w-full rounded-full h-3" style={{ backgroundColor: '#1ed7cd33' }}>
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          background: 'linear-gradient(to right, #017598, #087ea2)',
                          width: `${(categoryScores.performance / 48) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black">行動評価</span>
                      <span className="text-lg font-bold" style={{ color: '#05a7be' }}>
                        {categoryScores.behavior.toFixed(1)}点
                      </span>
                    </div>
                    <div className="w-full rounded-full h-3" style={{ backgroundColor: '#1ed7cd33' }}>
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          background: 'linear-gradient(to right, #05a7be, #18c4b8)',
                          width: `${(categoryScores.behavior / 30) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black">成長評価</span>
                      <span className="text-lg font-bold" style={{ color: '#1ed7cd' }}>
                        {categoryScores.growth.toFixed(1)}点
                      </span>
                    </div>
                    <div className="w-full rounded-full h-3" style={{ backgroundColor: '#1ed7cd33' }}>
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          background: 'linear-gradient(to right, #18c4b8, #1ed7cd)',
                          width: `${(categoryScores.growth / 22) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 評価推移 */}
          {data.evaluations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-black">
                  <TrendingUp className="mr-2 h-5 w-5" style={{ color: '#18c4b8' }} />
                  評価推移
                </CardTitle>
                <CardDescription className="text-black">
                  過去6ヶ月のスコア変化
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.evaluations.slice(0, 6).reverse().map((evaluation, idx) => (
                    <div key={evaluation.id} className="flex items-center gap-3">
                      <div className="text-xs text-black w-16">
                        {evaluation.evaluation_year}年{evaluation.evaluation_month}月
                      </div>
                      <div className="flex-1">
                        <div className="w-full rounded-full h-2" style={{ backgroundColor: '#1ed7cd33' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              background: 'linear-gradient(to right, #05a7be, #1ed7cd)',
                              width: `${evaluation.total_score ? (evaluation.total_score / 100) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-bold text-black w-12 text-right">
                        {evaluation.total_score?.toFixed(1) || '-'}
                      </div>
                      {evaluation.rank && (
                        <Badge className={`${getRankColor(evaluation.rank, rankSettings || undefined)} text-xs`}>
                          {evaluation.rank}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 目標進捗 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Target className="mr-2 h-5 w-5" style={{ color: '#1ed7cd' }} />
                目標進捗
              </CardTitle>
              <CardDescription className="text-black">
                アクティブ: {data.activeGoals.length}件 / 完了: {data.completedGoals.length}件
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeGoals.length > 0 ? (
                <div className="space-y-4">
                  {data.activeGoals.slice(0, 5).map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate text-black">
                          {goal.goal_title}
                        </span>
                        <span className="text-sm font-bold text-black">
                          {goal.achievement_rate}%
                        </span>
                      </div>
                      <Progress value={goal.achievement_rate} />
                      <div className="flex items-center justify-between text-xs text-black">
                        <span>期限: {formatDate(goal.target_date)}</span>
                        <Badge variant="outline" style={{
                          backgroundColor: goal.achievement_rate >= 100 ? 'rgba(24, 196, 184, 0.2)' : 'rgba(5, 167, 190, 0.2)',
                          color: '#000',
                          borderColor: goal.achievement_rate >= 100 ? '#18c4b8' : '#05a7be'
                        }}>
                          {goal.achievement_rate >= 100 ? '達成' : '進行中'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Link href="/my-goals">
                    <Button variant="outline" className="w-full">
                      全ての目標を見る
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-center py-8 text-black">
                  目標を設定してください
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右カラム */}
        <div className="space-y-6">
          {/* おすすめアクション */}
          <Card style={{ background: 'linear-gradient(135deg, #05a7be15, #1ed7cd15)' }}>
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Zap className="mr-2 h-5 w-5" style={{ color: '#05a7be' }} />
                おすすめアクション
              </CardTitle>
              <CardDescription className="text-black">
                今すぐできる改善ポイント
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.unansweredQuestions > 0 && (
                  <Link href="/my-questions">
                    <div className="p-4 bg-white rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: '#087ea2' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: '#087ea2' }} />
                        <div>
                          <p className="font-medium text-black">未回答の質問があります</p>
                          <p className="text-sm text-black mt-1">
                            {data.unansweredQuestions}件の質問に回答してください
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {data.activeGoals.filter(g => g.achievement_rate < 50).length > 0 && (
                  <Link href="/my-goals">
                    <div className="p-4 bg-white rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: '#18c4b8' }}>
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 mt-0.5" style={{ color: '#18c4b8' }} />
                        <div>
                          <p className="font-medium text-black">目標の進捗が遅れています</p>
                          <p className="text-sm text-black mt-1">
                            {data.activeGoals.filter(g => g.achievement_rate < 50).length}件の目標を見直しましょう
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {categoryScores && Math.min(categoryScores.performance, categoryScores.behavior, categoryScores.growth) < 20 && (
                  <Link href="/evaluation-items">
                    <div className="p-4 bg-white rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: '#1ed7cd' }}>
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 mt-0.5" style={{ color: '#1ed7cd' }} />
                        <div>
                          <p className="font-medium text-black">評価項目を確認しましょう</p>
                          <p className="text-sm text-black mt-1">
                            低スコアの項目を改善できます
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                <Link href="/my-evaluation">
                  <div className="p-4 bg-white rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: '#05a7be' }}>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-0.5" style={{ color: '#05a7be' }} />
                      <div>
                        <p className="font-medium text-black">詳細な評価を確認</p>
                        <p className="text-sm text-black mt-1">
                          管理者からのフィードバックを確認しましょう
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 管理者からの最新コメント */}
          {data.latestEvaluation?.comments && data.latestEvaluation.comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-black">
                  <MessageSquare className="mr-2 h-5 w-5" style={{ color: '#087ea2' }} />
                  最新のコメント
                </CardTitle>
                <CardDescription className="text-black">
                  管理者からのフィードバック
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.latestEvaluation.comments.slice(0, 3).map((comment: any) => (
                    <div key={comment.id} className="border-l-4 pl-4 py-3 bg-gradient-to-r from-white to-transparent rounded-r-lg" style={{ borderColor: '#18c4b8' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-bold text-black">{comment.admin.full_name}</p>
                        <Badge variant="outline" style={{ backgroundColor: 'rgba(24, 196, 184, 0.2)', color: '#000', borderColor: '#18c4b8' }}>
                          管理者
                        </Badge>
                      </div>
                      <p className="text-sm text-black leading-relaxed">{comment.comment}</p>
                      <p className="text-xs text-black mt-2">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  ))}
                  <Link href="/my-comments">
                    <Button variant="outline" className="w-full">
                      全てのコメントを見る
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 最近のアクティビティ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Clock className="mr-2 h-5 w-5" style={{ color: '#017598' }} />
                最近のアクティビティ
              </CardTitle>
              <CardDescription className="text-black">
                あなたの最近の活動履歴
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.latestEvaluation && (
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(5, 167, 190, 0.1)' }}>
                    <Award className="h-4 w-4 mt-0.5" style={{ color: '#05a7be' }} />
                    <div>
                      <p className="text-sm font-medium text-black">評価が完了しました</p>
                      <p className="text-xs text-black mt-1">
                        {data.latestEvaluation.evaluation_year}年{data.latestEvaluation.evaluation_month}月の評価
                      </p>
                    </div>
                  </div>
                )}

                {data.completedGoals.slice(0, 2).map((goal) => (
                  <div key={goal.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(24, 196, 184, 0.1)' }}>
                    <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: '#18c4b8' }} />
                    <div>
                      <p className="text-sm font-medium text-black">目標を達成しました</p>
                      <p className="text-xs text-black mt-1">{goal.goal_title}</p>
                    </div>
                  </div>
                ))}

                {data.evaluations.length > 1 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(30, 215, 205, 0.1)' }}>
                    <TrendingUp className="h-4 w-4 mt-0.5" style={{ color: '#1ed7cd' }} />
                    <div>
                      <p className="text-sm font-medium text-black">スコアが更新されました</p>
                      <p className="text-xs text-black mt-1">
                        前月から{scoreChange && scoreChange > 0 ? '+' : ''}{scoreChange?.toFixed(1) || '0'}点
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
