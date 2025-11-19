-- Drop all existing policies first
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Users table policies (Fixed to avoid infinite recursion)
-- 認証済みユーザーは全てのユーザー情報を閲覧可能
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (TRUE);

-- ユーザーは自分自身の情報のみを更新可能
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note: 管理者権限のチェックはアプリケーション層で行います
-- RLSポリシーでは無限再帰を避けるため、usersテーブルの参照を含めません
