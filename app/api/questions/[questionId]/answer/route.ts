import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: 質問に回答
export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者か確認
    const { data: currentUser } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!currentUser?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { answer } = body

    const { data: updatedQuestion, error } = await supabase
      .from('evaluation_questions')
      .update({
        answer,
        admin_id: user.id,
        answered_at: new Date().toISOString(),
      })
      .eq('id', params.questionId)
      .select(
        `
        *,
        staff:users!evaluation_questions_staff_id_fkey(full_name),
        admin:users!evaluation_questions_admin_id_fkey(full_name),
        evaluation:evaluations!evaluation_questions_evaluation_id_fkey(evaluation_period)
      `
      )
      .single()

    if (error) throw error

    return NextResponse.json({ data: updatedQuestion })
  } catch (error: any) {
    console.error('Error answering question:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
