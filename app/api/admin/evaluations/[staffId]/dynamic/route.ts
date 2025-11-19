import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
    const { data: cycles } = await supabase
      .from('evaluation_cycles')
      .select('id')
      .eq('company_id', adminData.company_id)
      .lte('start_date', `${evaluationYear}-${String(evaluationMonth).padStart(2, '0')}-01`)
      .gte('end_date', `${evaluationYear}-${String(evaluationMonth).padStart(2, '0')}-01`)
      .single()

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
      .single()

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

    // 既存の評価回答を削除（管理者の分のみ）
    await supabase
      .from('evaluation_responses')
      .delete()
      .eq('evaluation_id', evaluationId)
      .eq('evaluator_id', userData.user.id)

    // 新しい評価回答を作成
    const { data: newResponse, error: responseError } = await supabase
      .from('evaluation_responses')
      .insert({
        evaluation_id: evaluationId,
        evaluator_id: userData.user.id,
        is_draft: isDraft,
      })
      .select('id')
      .single()

    if (responseError || !newResponse) {
      console.error('Error creating response:', responseError)
      return NextResponse.json({ error: 'Failed to create response' }, { status: 500 })
    }

    // 評価項目の詳細を保存
    const itemsToInsert = Object.entries(scores).map(([itemId, score]) => {
      const item = itemsMaster.find(i => i.id === itemId)
      return {
        response_id: newResponse.id,
        item_name: item?.item_name || '',
        category: item?.category || '',
        score: Number(score),
        comment: comments[itemId] || null,
      }
    })

    const { error: itemsError } = await supabase
      .from('evaluation_response_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating response items:', itemsError)
      return NextResponse.json({ error: 'Failed to save evaluation items' }, { status: 500 })
    }

    // 評価が完成したら（下書きでなく、3人の管理者が評価完了したら）平均スコアを計算
    if (!isDraft) {
      // この評価に対する完了済みの回答数を確認
      const { data: allResponses } = await supabase
        .from('evaluation_responses')
        .select(`
          id,
          is_draft,
          items:evaluation_response_items(score)
        `)
        .eq('evaluation_id', evaluationId)
        .eq('is_draft', false)

      if (allResponses && allResponses.length === 3) {
        // 3人全員が評価完了した場合、平均スコアを計算
        let totalSum = 0
        allResponses.forEach(response => {
          const responseTotal = response.items.reduce((sum: number, item: any) => sum + item.score, 0)
          totalSum += responseTotal
        })
        const averageScore = totalSum / 3

        // ランクを判定
        let rank = 'C'
        if (averageScore >= 120) rank = 'S'
        else if (averageScore >= 100) rank = 'A'
        else if (averageScore >= 80) rank = 'B'
        else if (averageScore >= 60) rank = 'C'
        else if (averageScore >= 40) rank = 'D'
        else rank = 'E'

        // 評価を更新
        await supabase
          .from('evaluations')
          .update({
            total_score: averageScore,
            rank: rank,
          })
          .eq('id', evaluationId)
      }
    }

    return NextResponse.json({
      success: true,
      data: { evaluationId, responseId: newResponse.id },
    })
  } catch (error) {
    console.error('Error in POST /api/admin/evaluations/[staffId]/dynamic:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
