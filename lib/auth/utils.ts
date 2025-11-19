import { createSupabaseServerClient } from '@/lib/supabase/server'
import { User } from '@/types'

/**
 * 現在ログイン中のユーザー情報を取得
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return null
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * ユーザーが管理者かどうかを確認
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.is_admin === true
}

/**
 * ユーザーが認証されているかを確認
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}
