import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/admin/dashboard-client'
import { redirect } from 'next/navigation'

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

  // スタッフ総数（同じ企業のみ）
  const { count: totalStaff } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'staff')
    .eq('company_id', currentUser.company_id)

  // 全スタッフの情報を取得（同じ企業のみ）
  const { data: allStaff } = await supabase
    .from('users')
    .select('id, full_name, department, position, email')
    .eq('role', 'staff')
    .eq('company_id', currentUser.company_id)
    .order('full_name')

  // 今月の評価データを取得（同じ企業のみ）
  const { data: currentMonthEvaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      staff:users!evaluations_staff_id_fkey(id, full_name, department, position, email, company_id)
    `)
    .eq('evaluation_year', currentYear)
    .eq('evaluation_month', currentMonth)

  // 同じ企業の評価のみフィルタ
  const filteredEvaluations = currentMonthEvaluations?.filter(e => e.staff?.company_id === currentUser.company_id)

  console.log('全スタッフ:', allStaff?.length)
  console.log('今月の評価:', currentYear, '年', currentMonth, '月')
  console.log('評価データ:', filteredEvaluations?.length)

  const evaluations = filteredEvaluations || []

  // 完了した評価のみを抽出
  const completedUsers = evaluations.filter(e => e.status === 'completed')

  // 未完了のスタッフを抽出（評価が存在しないスタッフ）
  const pendingUsers = (allStaff || []).filter(staff => {
    const hasEvaluation = evaluations.some(e => e.staff_id === staff.id)
    return !hasEvaluation
  })

  console.log('完了:', completedUsers.length, '未完了:', pendingUsers.length)

  // 目標管理のデータを取得（同じ企業のスタッフの目標のみ）
  const staffIds = (allStaff || []).map(s => s.id)
  const { data: allGoals } = await supabase
    .from('staff_goals')
    .select('*')
    .in('staff_id', staffIds.length > 0 ? staffIds : [''])

  // 面談前の目標（interview_status が pending または scheduled）
  const pendingInterviews = (allGoals || []).filter(g => g.interview_status === 'pending' || g.interview_status === 'scheduled')

  // 面談済みの目標（interview_status が completed）
  const completedInterviews = (allGoals || []).filter(g => g.interview_status === 'completed')

  // 未回答の質問を取得（同じ企業のスタッフの質問のみ）
  const { data: unansweredQuestions } = await supabase
    .from('evaluation_questions')
    .select(`
      *,
      staff:users!evaluation_questions_staff_id_fkey(id, company_id)
    `)
    .is('answer', null)

  // 同じ企業の質問のみフィルタ
  const filteredUnansweredQuestions = (unansweredQuestions || []).filter(
    q => q.staff?.company_id === currentUser.company_id
  )

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
    unansweredQuestions: filteredUnansweredQuestions.length,
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
