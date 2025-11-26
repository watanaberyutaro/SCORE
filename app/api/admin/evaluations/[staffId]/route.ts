import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateScores, determineRank, type RankSetting } from '@/lib/utils/evaluation-calculator'

// GET: 特定スタッフの評価を取得
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
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // 評価を取得
    let query = supabase
      .from('evaluations')
      .select(
        `
        *,
        staff:users!evaluations_staff_id_fkey(*)
      `
      )
      .eq('staff_id', params.staffId)

    if (year && month) {
      query = query.eq('evaluation_year', parseInt(year)).eq('evaluation_month', parseInt(month))
    }

    const { data: evaluation, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ data: null })
    }

    // 現在のユーザー（管理者）の回答のみを取得
    let myResponse = null
    if (evaluation) {
      const { data: responseData } = await supabase
        .from('evaluation_responses')
        .select(
          `
          *,
          admin:users!evaluation_responses_admin_id_fkey(full_name),
          items:evaluation_items(*)
        `
        )
        .eq('evaluation_id', evaluation.id)
        .eq('admin_id', user.id)
        .single()

      myResponse = responseData
    }

    // 自分の回答だけを含めて返す
    const result = evaluation
      ? {
          ...evaluation,
          responses: myResponse ? [myResponse] : [],
        }
      : null

    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error('Error fetching evaluation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: 評価を作成または更新
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
    const { evaluationYear, evaluationMonth, formData, isDraft } = body

    // 評価レコードを取得または作成
    let { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .select('id')
      .eq('staff_id', params.staffId)
      .eq('evaluation_year', evaluationYear)
      .eq('evaluation_month', evaluationMonth)
      .single()

    if (evalError && evalError.code === 'PGRST116') {
      // 評価が存在しない場合は作成
      const { data: newEval, error: createError } = await supabase
        .from('evaluations')
        .insert({
          staff_id: params.staffId,
          evaluation_year: evaluationYear,
          evaluation_month: evaluationMonth,
          status: 'draft',
        })
        .select()
        .single()

      if (createError) throw createError
      evaluation = newEval
    } else if (evalError) {
      throw evalError
    }

    // 管理者の評価回答を取得または作成
    let { data: response, error: responseError } = await supabase
      .from('evaluation_responses')
      .select('id')
      .eq('evaluation_id', evaluation!.id)
      .eq('admin_id', user.id)
      .single()

    const scores = calculateScores(formData)

    if (responseError && responseError.code === 'PGRST116') {
      // 回答が存在しない場合は作成
      const { data: newResponse, error: createError } = await supabase
        .from('evaluation_responses')
        .insert({
          evaluation_id: evaluation!.id,
          admin_id: user.id,
          total_score: scores.totalScore,
          submitted_at: isDraft ? null : new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) throw createError
      response = newResponse
    } else if (responseError) {
      throw responseError
    } else {
      // 既存の回答を更新
      const { error: updateError } = await supabase
        .from('evaluation_responses')
        .update({
          total_score: scores.totalScore,
          submitted_at: isDraft ? null : new Date().toISOString(),
        })
        .eq('id', response!.id)

      if (updateError) throw updateError
    }

    // 既存の評価項目を削除
    await supabase.from('evaluation_items').delete().eq('evaluation_response_id', response!.id)

    // 新しい評価項目を挿入
    const items = [
      // 成果評価
      {
        evaluation_response_id: response!.id,
        category: 'performance',
        item_name: '実績評価',
        score: formData.performance.achievement,
        min_score: 0,
        max_score: 25,
        comment: formData.comments.achievement || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'performance',
        item_name: '勤怠評価',
        score: formData.performance.attendance,
        min_score: -5,
        max_score: 5,
        comment: formData.comments.attendance || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'performance',
        item_name: 'コンプライアンス評価',
        score: formData.performance.compliance,
        min_score: -10,
        max_score: 3,
        comment: formData.comments.compliance || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'performance',
        item_name: 'クライアント評価',
        score: formData.performance.client,
        min_score: 0,
        max_score: 15,
        comment: formData.comments.client || null,
      },
      // 行動評価
      {
        evaluation_response_id: response!.id,
        category: 'behavior',
        item_name: '主体性評価',
        score: formData.behavior.initiative,
        min_score: 0,
        max_score: 10,
        comment: formData.comments.initiative || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'behavior',
        item_name: '責任感',
        score: formData.behavior.responsibility,
        min_score: 0,
        max_score: 7,
        comment: formData.comments.responsibility || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'behavior',
        item_name: '協調性評価',
        score: formData.behavior.cooperation,
        min_score: 0,
        max_score: 10,
        comment: formData.comments.cooperation || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'behavior',
        item_name: 'アピアランス評価',
        score: formData.behavior.appearance,
        min_score: 0,
        max_score: 3,
        comment: formData.comments.appearance || null,
      },
      // 成長評価
      {
        evaluation_response_id: response!.id,
        category: 'growth',
        item_name: '自己研鑽評価',
        score: formData.growth.selfImprovement,
        min_score: 0,
        max_score: 7,
        comment: formData.comments.selfImprovement || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'growth',
        item_name: 'レスポンス評価',
        score: formData.growth.response,
        min_score: 0,
        max_score: 5,
        comment: formData.comments.response || null,
      },
      {
        evaluation_response_id: response!.id,
        category: 'growth',
        item_name: '自己目標達成評価',
        score: formData.growth.goalAchievement,
        min_score: 0,
        max_score: 10,
        comment: formData.comments.goalAchievement || null,
      },
    ]

    const { error: itemsError } = await supabase.from('evaluation_items').insert(items)

    if (itemsError) throw itemsError

    // 企業の管理者数を取得
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: adminUsers, error: adminCountError } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', userData!.company_id)
      .eq('role', 'admin')

    if (adminCountError) {
      console.error('Error fetching admin count:', adminCountError)
    }

    const adminCount = adminUsers?.length || 0

    // 全管理者が提出済みか確認
    const { data: allResponses } = await supabase
      .from('evaluation_responses')
      .select('id, submitted_at')
      .eq('evaluation_id', evaluation!.id)

    // 提出済み（下書きでない）回答のみをカウント
    const submittedResponses = allResponses?.filter((r) => r.submitted_at !== null) || []

    const allSubmitted =
      submittedResponses &&
      adminCount &&
      submittedResponses.length === adminCount

    if (allSubmitted) {
      // 全ての回答とその評価項目を取得
      const { data: responsesWithItems } = await supabase
        .from('evaluation_responses')
        .select('total_score, items:evaluation_items(*)')
        .eq('evaluation_id', evaluation!.id)

      // 平均スコアを計算
      const totalScores = responsesWithItems?.map((r) => r.total_score || 0) || []
      const averageScore = totalScores.reduce((sum, score) => sum + score, 0) / adminCount!

      // カテゴリ別の平均スコアを計算
      const performanceScores: number[] = []
      const behaviorScores: number[] = []
      const growthScores: number[] = []

      responsesWithItems?.forEach((response) => {
        const items = response.items || []

        // 成果評価の合計
        const performanceTotal = items
          .filter((item: any) => item.category === 'performance')
          .reduce((sum: number, item: any) => sum + (item.score || 0), 0)
        performanceScores.push(performanceTotal)

        // 行動評価の合計
        const behaviorTotal = items
          .filter((item: any) => item.category === 'behavior')
          .reduce((sum: number, item: any) => sum + (item.score || 0), 0)
        behaviorScores.push(behaviorTotal)

        // 成長評価の合計
        const growthTotal = items
          .filter((item: any) => item.category === 'growth')
          .reduce((sum: number, item: any) => sum + (item.score || 0), 0)
        growthScores.push(growthTotal)
      })

      const avgPerformance = performanceScores.reduce((sum, score) => sum + score, 0) / adminCount!
      const avgBehavior = behaviorScores.reduce((sum, score) => sum + score, 0) / adminCount!
      const avgGrowth = growthScores.reduce((sum, score) => sum + score, 0) / adminCount!

      // カスタムランク設定を取得
      const { data: rankSettings } = await supabase
        .from('rank_settings')
        .select('rank_name, min_score, amount, display_order')
        .eq('company_id', userData!.company_id)
        .order('display_order', { ascending: false })

      // ランクを判定（新しいdetermineRank関数を使用）
      const rank = determineRank(averageScore, rankSettings || undefined)

      // 評価を完了状態に更新
      await supabase
        .from('evaluations')
        .update({
          status: 'completed',
          total_score: averageScore,
          average_score: averageScore,
          rank: rank,
        })
        .eq('id', evaluation!.id)
    }

    return NextResponse.json({ success: true, data: { evaluationId: evaluation!.id } })
  } catch (error: any) {
    console.error('Error saving evaluation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
