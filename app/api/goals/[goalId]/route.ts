import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT: 目標を更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { goalId: string } }
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
    const { goal_title, goal_description, target_date, achievement_rate, status } = body

    const { data: goal, error } = await supabase
      .from('staff_goals')
      .update({
        goal_title,
        goal_description,
        target_date,
        achievement_rate,
        status,
      })
      .eq('id', params.goalId)
      .eq('staff_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: goal })
  } catch (error: any) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: 目標を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('staff_goals')
      .delete()
      .eq('id', params.goalId)
      .eq('staff_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
