import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 質問一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: currentUser } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('evaluation_questions')
      .select(
        `
        *,
        staff:users!evaluation_questions_staff_id_fkey(full_name),
        admin:users!evaluation_questions_admin_id_fkey(full_name),
        evaluation:evaluations!evaluation_questions_evaluation_id_fkey(evaluation_period)
      `
      )

    // スタッフの場合は自分の質問のみ
    if (!currentUser?.is_admin) {
      query = query.eq('staff_id', user.id)
    }

    const { data: questions, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: questions })
  } catch (error: any) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: 質問を投稿
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { evaluationId, question } = body

    const { data: newQuestion, error } = await supabase
      .from('evaluation_questions')
      .insert({
        evaluation_id: evaluationId,
        staff_id: user.id,
        question,
      })
      .select(
        `
        *,
        staff:users!evaluation_questions_staff_id_fkey(full_name),
        evaluation:evaluations!evaluation_questions_evaluation_id_fkey(evaluation_period)
      `
      )
      .single()

    if (error) throw error

    return NextResponse.json({ data: newQuestion })
  } catch (error: any) {
    console.error('Error creating question:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
