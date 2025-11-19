import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: スタッフへのコメント一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period')

    // 評価IDを取得
    let query = supabase
      .from('evaluations')
      .select('id')
      .eq('staff_id', params.staffId)

    if (period) {
      query = query.eq('evaluation_period', period)
    }

    const { data: evaluations } = await query

    if (!evaluations || evaluations.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // コメントを取得
    const { data: comments, error } = await supabase
      .from('admin_comments')
      .select(
        `
        *,
        admin:users!admin_comments_admin_id_fkey(full_name)
      `
      )
      .in(
        'evaluation_id',
        evaluations.map((e) => e.id)
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: comments })
  } catch (error: any) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: スタッフにコメントを追加
export async function POST(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { evaluationId, comment } = body

    const { data: newComment, error } = await supabase
      .from('admin_comments')
      .insert({
        evaluation_id: evaluationId,
        admin_id: user.id,
        comment,
      })
      .select(
        `
        *,
        admin:users!admin_comments_admin_id_fkey(full_name)
      `
      )
      .single()

    if (error) throw error

    return NextResponse.json({ data: newComment })
  } catch (error: any) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
