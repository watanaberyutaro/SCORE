import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    // マイグレーションSQLを読み込む
    const migrationPath = path.join(process.cwd(), 'database', 'migrations', 'create_rank_settings.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // SQLを実行（改行で分割して個別に実行）
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    console.log(`Executing ${statements.length} SQL statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}`)

      const { error } = await supabase.rpc('exec_sql', {
        sql_string: statement,
      })

      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        // テーブルが既に存在する場合などはエラーを無視
        if (!error.message.includes('already exists')) {
          throw error
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration executed successfully',
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error.message,
        help: 'Please run the SQL manually in Supabase Dashboard > SQL Editor. File: database/migrations/create_rank_settings.sql',
      },
      { status: 500 }
    )
  }
}
