import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/admin/dashboard-client'
import { redirect } from 'next/navigation'
import { type RankSetting } from '@/lib/utils/evaluation-calculator'

async function getDashboardData() {
  const supabase = await createSupabaseServerClient()

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 現在のユーザーのcompany_idを取得
  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  // 管理者権限のチェック
  if (currentUser.role !== 'admin') {
    redirect('/dashboard')
  }

  // 現在の年月を取得
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // 全てのクエリを並列実行（パフォーマンス改善）
  const [
    { count: totalStaff },
    { data: allStaff },
    { data: currentMonthEvaluations },
    { data: allGoals },
    { data: unansweredQuestions },
    { data: rankSettings }
  ] = await Promise.all([
    // スタッフ総数（同じ企業のみ）
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'staff')
      .eq('company_id', currentUser.company_id),

    // 全スタッフの情報を取得（同じ企業のみ）
    supabase
      .from('users')
      .select('id, full_name, department, position, email')
      .eq('role', 'staff')
      .eq('company_id', currentUser.company_id)
      .order('full_name'),

    // 今月の評価データを取得（同じ企業のみ、評価レスポンスも含む）
    supabase
      .from('evaluations')
      .select(`
        id,
        staff_id,
        status,
        staff:users!evaluations_staff_id_fkey(id, full_name, department, position, email, company_id),
        responses:evaluation_responses(id, admin_id, submitted_at)
      `)
      .eq('evaluation_year', currentYear)
      .eq('evaluation_month', currentMonth),

    // 目標管理のデータを取得（必要なカラムのみ）
    supabase
      .from('staff_goals')
      .select('id, interview_status')
      .eq('company_id', currentUser.company_id),

    // 未回答の質問を取得（カウントのみ）
    supabase
      .from('evaluation_questions')
      .select('id')
      .eq('company_id', currentUser.company_id)
      .is('answer', null),

    // ランク設定を取得
    supabase
      .from('rank_settings')
      .select('rank_name, min_score, amount, display_order')
      .eq('company_id', currentUser.company_id)
      .order('display_order', { ascending: false })
  ])

  // 同じ企業の評価のみフィルタ
  const filteredEvaluations = currentMonthEvaluations?.filter((e: any) => e.staff?.company_id === currentUser.company_id)

  const evaluations = filteredEvaluations || []

  // 現在のユーザー（管理者）が評価を提出済みのスタッフを抽出
  const completedUsers = (allStaff || [])
    .map(staff => {
      const evaluation = evaluations.find(e => e.staff_id === staff.id)
      // 現在のユーザーのレスポンスを探す
      const myResponse = evaluation?.responses?.find((r: any) => r.admin_id === user.id)
      const isSubmitted = myResponse?.submitted_at !== null && myResponse?.submitted_at !== undefined

      return {
        ...staff,
        ...evaluation, // 評価データを直接展開（rank, total_scoreなどにアクセス可能）
        staff_id: staff.id, // 上書き防止
        isSubmitted
      }
    })
    .filter(item => item.isSubmitted)

  // 現在のユーザー（管理者）が未提出のスタッフを抽出
  const pendingUsers = (allStaff || [])
    .map(staff => {
      const evaluation = evaluations.find(e => e.staff_id === staff.id)
      // 現在のユーザーのレスポンスを探す
      const myResponse = evaluation?.responses?.find((r: any) => r.admin_id === user.id)
      const isSubmitted = myResponse?.submitted_at !== null && myResponse?.submitted_at !== undefined

      return {
        ...staff,
        ...evaluation, // 評価データを直接展開
        staff_id: staff.id, // 上書き防止
        isSubmitted
      }
    })
    .filter(item => !item.isSubmitted)

  // 面談前の目標（interview_status が pending または scheduled）
  const pendingInterviews = (allGoals || []).filter(g => g.interview_status === 'pending' || g.interview_status === 'scheduled')

  // 面談済みの目標（interview_status が completed）
  const completedInterviews = (allGoals || []).filter(g => g.interview_status === 'completed')

  return {
    totalStaff: totalStaff || 0,
    currentYear,
    currentMonth,
    completedEvaluations: completedUsers.length,
    pendingEvaluations: pendingUsers.length,
    completedUsers,
    pendingUsers,
    // 目標管理関連
    pendingInterviews: pendingInterviews.length,
    completedInterviews: completedInterviews.length,
    totalGoals: (allGoals || []).length,
    // 質問管理関連
    unansweredQuestions: (unansweredQuestions || []).length,
    // ランク設定
    rankSettings: (rankSettings || []) as RankSetting[],
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">管理者ダッシュボード</h1>
        <p className="mt-2 text-sm text-black">
          評価管理システムの概要とスタッフの評価状況を確認できます
        </p>
      </div>

      <DashboardClient data={data} />
    </div>
  )
}
