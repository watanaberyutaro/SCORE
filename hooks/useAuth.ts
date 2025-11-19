'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 初回ユーザー情報の取得
    getUser()

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser()
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function getUser() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) throw error

      setUser(userData)
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string, companyCode: string) {
    try {
      console.log('サインイン開始:', email, 'companyCode:', companyCode)

      // 1. 企業コードの検証
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, company_code, company_name, is_active')
        .eq('company_code', companyCode)
        .single()

      if (companyError || !companyData) {
        console.error('企業コード検証エラー:', companyError)
        throw new Error('企業コードが正しくありません')
      }

      if (!companyData.is_active) {
        throw new Error('この企業アカウントは無効化されています')
      }

      console.log('企業コード検証成功:', companyData.company_name)

      // 2. 認証
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('認証エラー:', error)
        throw error
      }

      console.log('認証成功:', data.user.id)

      // 3. ユーザー情報取得とcompany_idの検証
      console.log('ユーザー情報取得中...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_admin, company_id')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        console.error('ユーザー情報取得エラー:', userError)
        await supabase.auth.signOut()
        throw userError
      }

      // 4. ユーザーが指定した企業に所属しているか確認
      if (userData.company_id !== companyData.id) {
        console.error('企業不一致:', { userCompanyId: userData.company_id, inputCompanyId: companyData.id })
        await supabase.auth.signOut()
        throw new Error('この企業コードではログインできません')
      }

      console.log('ユーザー情報:', userData)
      await getUser()

      // 5. ロールに応じてリダイレクト
      if (userData?.is_admin) {
        console.log('管理者としてリダイレクト: /admin/dashboard')
        router.push('/admin/dashboard')
      } else {
        console.log('一般ユーザーとしてリダイレクト: /dashboard')
        router.push('/dashboard')
      }

      return { success: true }
    } catch (error: any) {
      console.error('サインインエラー:', error)
      return { success: false, error: error.message }
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user,
    loading,
    signIn,
    signOut,
    isAdmin: user?.is_admin === true,
  }
}
