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
      .select('*')
      .eq('role', 'staff')
      .eq('company_id', currentUser.company_id)
      .order('full_name')

    if (staffError) throw staffError

    // 各スタッフの評価状況を取得
    const staffWithEvaluations = await Promise.all(
      staff.map(async (s) => {
        let query = supabase
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
          .eq('staff_id', s.id)

        if (period) {
          query = query.eq('evaluation_period', period)
        }

        const { data: evaluations } = await query.order('created_at', { ascending: false }).limit(1)

        return {
          ...s,
          latest_evaluation: evaluations?.[0] || null,
        }
      })
    )

    return NextResponse.json({ data: staffWithEvaluations })
  } catch (error: any) {
    console.error('Error fetching staff evaluations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
