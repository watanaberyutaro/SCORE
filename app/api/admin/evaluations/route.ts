import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: スタッフ一覧と評価状況を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 現在のユーザーが管理者か確認
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('is_admin, company_id')
      .eq('id', user.id)
      .single()

    if (!currentUser?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // URLパラメータから評価期間を取得
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period')

    // スタッフ一覧を取得（同じ企業のみ）
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('id, email, full_name, department, position, role, company_id, created_at')
      .eq('role', 'staff')
      .eq('company_id', currentUser.company_id)
      .order('full_name')

    if (staffError) throw staffError
    if (!staff || staff.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // 全スタッフの評価を1回のクエリで取得（N+1クエリを解消）
    const staffIds = staff.map(s => s.id)

    let evaluationsQuery = supabase
      .from('evaluations')
      .select(
        `
        *,
        responses:evaluation_responses(
          id,
          admin_id,
          total_score,
          submitted_at,
          admin:users!evaluation_responses_admin_id_fkey(full_name)
        )
      `
      )
      .in('staff_id', staffIds)
      .order('created_at', { ascending: false })

    if (period) {
      evaluationsQuery = evaluationsQuery.eq('evaluation_period', period)
    }

    const { data: allEvaluations, error: evalError } = await evaluationsQuery

    if (evalError) {
      console.error('Error fetching evaluations:', evalError)
      // エラーが発生してもスタッフ一覧は返す
    }

    // スタッフIDごとに最新の評価をマッピング
    const evaluationsByStaffId: Record<string, any> = {}
    allEvaluations?.forEach((evaluation) => {
      if (!evaluationsByStaffId[evaluation.staff_id]) {
        evaluationsByStaffId[evaluation.staff_id] = evaluation
      }
    })

    // スタッフと評価を結合
    const staffWithEvaluations = staff.map((s) => ({
      ...s,
      latest_evaluation: evaluationsByStaffId[s.id] || null,
    }))

    return NextResponse.json({ data: staffWithEvaluations })
  } catch (error: any) {
    console.error('Error fetching staff evaluations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
