import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/admin/dashboard-client'

async function getDashboardData() {
  const supabase = await createSupabaseServerClient()

  // 現在の年月を取得
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // スタッフ総数
  const { count: totalStaff } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'staff')

  // 全スタッフの情報を取得
  const { data: allStaff } = await supabase
    .from('users')
    .select('id, full_name, department, position, email')
    .eq('role', 'staff')
    .order('full_name')

  // 今月の評価データを取得
  const { data: currentMonthEvaluations } = await supabase
    .from('evaluations')
    .select(`
      *,
      staff:users!evaluations_staff_id_fkey(id, full_name, department, position, email)
    `)
    .eq('evaluation_year', currentYear)
    .eq('evaluation_month', currentMonth)

  console.log('全スタッフ:', allStaff?.length)
  console.log('今月の評価:', currentYear, '年', currentMonth, '月')
  console.log('評価データ:', currentMonthEvaluations?.length)

  const evaluations = currentMonthEvaluations || []

  // 完了した評価のみを抽出
  const completedUsers = evaluations.filter(e => e.status === 'completed')

  // 未完了のスタッフを抽出（評価が存在しないスタッフ）
  const pendingUsers = (allStaff || []).filter(staff => {
    const hasEvaluation = evaluations.some(e => e.staff_id === staff.id)
    return !hasEvaluation
  })

  console.log('完了:', completedUsers.length, '未完了:', pendingUsers.length)

  return {
    totalStaff: totalStaff || 0,
    currentYear,
    currentMonth,
    completedEvaluations: completedUsers.length,
    pendingEvaluations: pendingUsers.length,
    completedUsers,
    pendingUsers,
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
