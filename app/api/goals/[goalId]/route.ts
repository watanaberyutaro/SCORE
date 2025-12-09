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

// PATCH: 面談ステータスを更新（管理者用）
export async function PATCH(
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

    // 管理者かどうかを確認
    const { data: userData } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { interview_status } = body

    // interview_statusが有効な値かチェック
    const validStatuses = ['pending', 'scheduled', 'completed']
    if (interview_status && !validStatuses.includes(interview_status)) {
      return NextResponse.json({ error: 'Invalid interview status' }, { status: 400 })
    }

    const updateData: any = {}
    if (interview_status) {
      updateData.interview_status = interview_status
      if (interview_status === 'completed') {
        updateData.interviewed_at = new Date().toISOString()
        updateData.reviewed_by = user.id
      }
    }

    // 同じ企業の目標のみ更新
    const { data: goal, error } = await supabase
      .from('staff_goals')
      .update(updateData)
      .eq('id', params.goalId)
      .eq('company_id', userData.company_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: goal })
  } catch (error: any) {
    console.error('Error updating goal interview status:', error)
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
