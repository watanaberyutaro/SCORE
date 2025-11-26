import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { determineRank, type RankSetting } from '@/lib/utils/evaluation-calculator'

export async function POST(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // 認証チェック
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    const { data: adminData } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', userData.user.id)
      .single()

    if (!adminData || adminData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { evaluationYear, evaluationMonth, scores, comments, isDraft } = body

    // スタッフの会社IDを確認
    const { data: staffData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', params.staffId)
      .single()

    if (!staffData || staffData.company_id !== adminData.company_id) {
      return NextResponse.json({ error: 'Invalid staff' }, { status: 400 })
    }

    // 評価サイクルを取得
    const { data: cycles, error: cyclesError } = await supabase
      .from('evaluation_cycles')
      .select('id')
      .eq('company_id', adminData.company_id)
      .lte('start_date', `${evaluationYear}-${String(evaluationMonth).padStart(2, '0')}-01`)
      .gte('end_date', `${evaluationYear}-${String(evaluationMonth).padStart(2, '0')}-01`)
      .maybeSingle()

    if (cyclesError) {
      console.error('Error fetching evaluation cycle:', cyclesError)
      return NextResponse.json({ error: 'Failed to fetch evaluation cycle', details: cyclesError.message }, { status: 500 })
    }

    if (!cycles) {
      return NextResponse.json({ error: 'No evaluation cycle found' }, { status: 400 })
    }

    // 評価期間の文字列を作成
    const evaluationPeriod = `${evaluationYear}年${evaluationMonth}月`

    // 既存の評価を確認
    let { data: existingEvaluation } = await supabase
      .from('evaluations')
      .select('id')
      .eq('staff_id', params.staffId)
      .eq('evaluation_period', evaluationPeriod)
      .eq('cycle_id', cycles.id)
      .maybeSingle()

    let evaluationId: string

    if (existingEvaluation) {
      evaluationId = existingEvaluation.id
    } else {
      // 新しい評価を作成
      const { data: newEvaluation, error: evalError } = await supabase
        .from('evaluations')
        .insert({
          staff_id: params.staffId,
          cycle_id: cycles.id,
          evaluation_period: evaluationPeriod,
          evaluation_year: evaluationYear,
          evaluation_month: evaluationMonth,
          total_score: 0,
          rank: 'C',
        })
        .select('id')
        .single()

      if (evalError || !newEvaluation) {
        console.error('Error creating evaluation:', evalError)
        return NextResponse.json({ error: 'Failed to create evaluation' }, { status: 500 })
      }

      evaluationId = newEvaluation.id
    }

    // 評価項目マスターから企業の項目を取得
    const { data: itemsMaster } = await supabase
      .from('evaluation_items_master')
      .select('*')
      .eq('company_id', staffData.company_id)

    if (!itemsMaster || itemsMaster.length === 0) {
      return NextResponse.json({ error: 'No evaluation items found for this company' }, { status: 400 })
    }

    // 既存の評価項目を削除（既存の回答に紐づく項目）
    const { data: existingResponse } = await supabase
      .from('evaluation_responses')
      .select('id')
      .eq('evaluation_id', evaluationId)
      .eq('admin_id', userData.user.id)
      .maybeSingle()

    let responseId: string

    if (existingResponse) {
      // 既存の回答がある場合は削除して再作成
      await supabase
        .from('evaluation_items')
        .delete()
        .eq('evaluation_response_id', existingResponse.id)

      // 既存の回答を更新
      const { error: updateError } = await supabase
        .from('evaluation_responses')
        .update({
          total_score: 0,
        })
        .eq('id', existingResponse.id)

      if (updateError) {
        console.error('Error updating response:', updateError)
        return NextResponse.json({ error: 'Failed to update response', details: updateError.message }, { status: 500 })
      }

      responseId = existingResponse.id
    } else {
      // 新しい回答を作成
      const { data: newResponse, error: createError } = await supabase
        .from('evaluation_responses')
        .insert({
          evaluation_id: evaluationId,
          admin_id: userData.user.id,
          total_score: 0,
        })
        .select('id')
        .single()

      if (createError || !newResponse) {
        console.error('Error creating response:', createError)
        return NextResponse.json({ error: 'Failed to create response', details: createError?.message }, { status: 500 })
      }

      responseId = newResponse.id
    }

    const newResponse = { id: responseId }

    // 評価項目の詳細を保存
    const itemsToInsert = Object.entries(scores).map(([itemId, score]) => {
      const item = itemsMaster.find(i => i.id === itemId)
      return {
        evaluation_response_id: newResponse.id,
        item_name: item?.item_name || '',
        category: item?.category || '',
        score: Number(score),
        min_score: item?.min_score || 0,
        max_score: item?.max_score || 100,
        comment: comments[itemId] || null,
      }
    })

    const { error: itemsError } = await supabase
      .from('evaluation_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating response items:', itemsError)
      return NextResponse.json({ error: 'Failed to save evaluation items' }, { status: 500 })
    }

    // この回答の合計スコアを計算して更新
    const responseTotalScore = Object.values(scores).reduce((sum: number, score) => sum + Number(score), 0)
    await supabase
      .from('evaluation_responses')
      .update({
        total_score: responseTotalScore,
        submitted_at: isDraft ? null : new Date().toISOString()
      })
      .eq('id', newResponse.id)

    // 評価が完成したら（全管理者が評価完了したら）平均スコアを計算
    // この企業の管理者数を取得
    const { data: adminUsers, error: adminCountError } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', adminData.company_id)
      .eq('role', 'admin')

    if (adminCountError) {
      console.error('Error fetching admin count:', adminCountError)
    }

    const adminCount = adminUsers?.length || 0

    // この評価に対する完了済みの回答数を確認
    const { data: allResponses } = await supabase
      .from('evaluation_responses')
      .select(`
        id,
        total_score,
        submitted_at,
        items:evaluation_items(score)
      `)
      .eq('evaluation_id', evaluationId)

    // 提出済み（下書きでない）回答のみをフィルタ
    const submittedResponses = (allResponses || []).filter((r: any) => r.submitted_at !== null)

    if (submittedResponses && adminCount > 0 && submittedResponses.length === adminCount) {
      // 全管理者が評価完了した場合、平均スコアを計算
      const totalSum = submittedResponses.reduce((sum: number, response: any) => sum + (response.total_score || 0), 0)
      const averageScore = totalSum / adminCount

      // カスタムランク設定を取得
      const { data: rankSettings } = await supabase
        .from('rank_settings')
        .select('rank_name, min_score, amount, display_order')
        .eq('company_id', adminData.company_id)
        .order('display_order', { ascending: false })

      // ランクを判定（新しいdetermineRank関数を使用）
      const rank = determineRank(averageScore, rankSettings || undefined)

      // 評価を更新
      await supabase
        .from('evaluations')
        .update({
          total_score: averageScore,
          average_score: averageScore,
          rank: rank,
          status: 'completed',
        })
        .eq('id', evaluationId)
    }

    return NextResponse.json({
      success: true,
      data: { evaluationId, responseId: newResponse.id },
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/evaluations/[staffId]/dynamic:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
