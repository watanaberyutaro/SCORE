import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 目標一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: goals, error } = await supabase
      .from('staff_goals')
      .select('*')
      .eq('staff_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: goals })
  } catch (error: any) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: 新しい目標を作成
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
    const { goal_title, goal_description, target_date } = body

    const { data: goal, error } = await supabase
      .from('staff_goals')
      .insert({
        staff_id: user.id,
        goal_title,
        goal_description,
        target_date,
        achievement_rate: 0,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: goal })
  } catch (error: any) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
