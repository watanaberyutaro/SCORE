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
    let mounted = true

    // 初回のユーザー情報取得
    getUser()

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      if (session?.user) {
        getUser()
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string, companyCode: string) {
    try {
      // 1. 企業コードの検証
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, company_code, company_name, is_active')
        .eq('company_code', companyCode)
        .single()

      if (companyError || !companyData) {
        throw new Error('企業コードが正しくありません')
      }

      if (!companyData.is_active) {
        throw new Error('この企業アカウントは無効化されています')
      }

      // 2. 認証
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // 3. ユーザー情報取得とcompany_idの検証（全カラム取得）
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        await supabase.auth.signOut()
        throw userError
      }

      // 4. ユーザーが指定した企業に所属しているか確認
      if (userData.company_id !== companyData.id) {
        await supabase.auth.signOut()
        throw new Error('この企業コードではログインできません')
      }

      // 5. ロールに応じてリダイレクト
      const redirectUrl = userData?.is_admin ? '/admin/dashboard' : '/dashboard'

      // ユーザー情報をステートにセット
      setUser(userData)
      setLoading(false)

      // 少し遅延させてからリダイレクト（UIの更新を確実にする）
      setTimeout(() => {
        router.push(redirectUrl)
      }, 100)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.push('/login')
    } catch (error) {
      // サインアウトエラーは無視（既にログアウト状態の可能性）
    }
  }

  // 企業コード生成（6桁の英数字）
  function generateCompanyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 紛らわしい文字を除外
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // 企業登録（管理者アカウント作成を含む）
  async function registerCompany(companyName: string, adminName: string, adminEmail: string, password: string, establishmentDate?: string) {
    try {
      // 1. 一意な企業コードを生成
      let companyCode = generateCompanyCode()
      let isUnique = false
      let attempts = 0

      while (!isUnique && attempts < 10) {
        const { data } = await supabase
          .from('companies')
          .select('id')
          .eq('company_code', companyCode)
          .single()

        if (!data) {
          isUnique = true
        } else {
          companyCode = generateCompanyCode()
          attempts++
        }
      }

      if (!isUnique) {
        throw new Error('企業コードの生成に失敗しました。もう一度お試しください。')
      }

      // 2. 管理者ユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('ユーザー作成に失敗しました')

      // 3. 企業を作成
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          company_code: companyCode,
          company_name: companyName,
          is_active: true,
          establishment_date: establishmentDate || null,
        })
        .select()
        .single()

      if (companyError) {
        // ロールバック: 作成したユーザーを削除
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw companyError
      }

      // 4. usersテーブルにレコードを作成（管理者として）
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: adminEmail,
          full_name: adminName,
          company_id: companyData.id,
          role: 'admin',
          is_admin: true,
        })

      if (userError) {
        // ロールバック: 企業を削除
        await supabase.from('companies').delete().eq('id', companyData.id)
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw userError
      }

      return { success: true, companyCode }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // ユーザー登録（既存企業への参加）
  async function registerUser(companyCode: string, fullName: string, email: string, password: string) {
    try {
      // 1. 企業コードの検証
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, company_code, company_name, is_active')
        .eq('company_code', companyCode)
        .single()

      if (companyError || !companyData) {
        throw new Error('企業コードが正しくありません')
      }

      if (!companyData.is_active) {
        throw new Error('この企業アカウントは無効化されています')
      }

      // 2. ユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('ユーザー作成に失敗しました')

      // 3. usersテーブルにレコードを作成（スタッフとして）
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          company_id: companyData.id,
          role: 'staff',
          is_admin: false,
        })

      if (userError) {
        // ロールバック: 作成したユーザーを削除
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw userError
      }

      return { success: true, companyName: companyData.company_name }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // パスワードリセット依頼
  async function requestPasswordReset(companyCode: string, email: string) {
    try {
      // 1. 企業コードの検証
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, company_code, company_name, is_active')
        .eq('company_code', companyCode)
        .single()

      if (companyError || !companyData) {
        throw new Error('企業コードが正しくありません')
      }

      if (!companyData.is_active) {
        throw new Error('この企業アカウントは無効化されています')
      }

      // 2. メールアドレスがこの企業に所属しているか確認
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, company_id')
        .eq('email', email)
        .eq('company_id', companyData.id)
        .single()

      if (userError || !userData) {
        // セキュリティのため、ユーザーが存在しない場合も成功メッセージを返す
        // （メールアドレスの存在を推測されないようにする）
        return { success: true }
      }

      // 3. パスワードリセットメール送信
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (resetError) {
        throw resetError
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // パスワード再設定
  async function resetPassword(newPassword: string) {
    try {
      // パスワード更新
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw error
      }

      // パスワード変更後は自動的にログアウト
      await supabase.auth.signOut()

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  return {
    user,
    loading,
    signIn,
    signOut,
    registerCompany,
    registerUser,
    requestPasswordReset,
    resetPassword,
    isAdmin: user?.is_admin === true,
  }
}
