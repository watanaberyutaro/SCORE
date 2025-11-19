-- ===================================
-- 全テーブルのRLSポリシー設定
-- ===================================

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_items_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_evaluations ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage evaluations" ON evaluations;
DROP POLICY IF EXISTS "Staff can view their own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Anyone can read evaluation items master" ON evaluation_items_master;
DROP POLICY IF EXISTS "Anyone can read evaluation cycles" ON evaluation_cycles;

-- ======================
-- Users table policies
-- ======================
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ======================
-- Evaluations table policies
-- ======================
-- 認証済みユーザーは全ての評価を閲覧可能
CREATE POLICY "Authenticated users can view evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (TRUE);

-- 認証済みユーザーは評価を作成可能
CREATE POLICY "Authenticated users can create evaluations"
  ON evaluations FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- 認証済みユーザーは評価を更新可能
CREATE POLICY "Authenticated users can update evaluations"
  ON evaluations FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ======================
-- Evaluation responses policies
-- ======================
CREATE POLICY "Authenticated users can view responses"
  ON evaluation_responses FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create responses"
  ON evaluation_responses FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update responses"
  ON evaluation_responses FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ======================
-- Evaluation items policies
-- ======================
CREATE POLICY "Authenticated users can view items"
  ON evaluation_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create items"
  ON evaluation_items FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update items"
  ON evaluation_items FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can delete items"
  ON evaluation_items FOR DELETE
  TO authenticated
  USING (TRUE);

-- ======================
-- Admin comments policies
-- ======================
CREATE POLICY "Authenticated users can view comments"
  ON admin_comments FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create comments"
  ON admin_comments FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update comments"
  ON admin_comments FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ======================
-- Staff goals policies
-- ======================
CREATE POLICY "Authenticated users can view goals"
  ON staff_goals FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Staff can manage their own goals"
  ON staff_goals FOR ALL
  TO authenticated
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

-- ======================
-- Evaluation questions policies
-- ======================
CREATE POLICY "Authenticated users can view questions"
  ON evaluation_questions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Staff can create questions"
  ON evaluation_questions FOR INSERT
  TO authenticated
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Authenticated users can update questions"
  ON evaluation_questions FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ======================
-- Evaluation items master policies
-- ======================
CREATE POLICY "Anyone can read evaluation items master"
  ON evaluation_items_master FOR SELECT
  TO authenticated
  USING (TRUE);

-- ======================
-- Evaluation cycles policies
-- ======================
CREATE POLICY "Anyone can read evaluation cycles"
  ON evaluation_cycles FOR SELECT
  TO authenticated
  USING (TRUE);

-- ======================
-- Productivity data policies
-- ======================
CREATE POLICY "Authenticated users can view productivity data"
  ON productivity_data FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can manage productivity data"
  ON productivity_data FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ======================
-- Quarterly reports policies
-- ======================
CREATE POLICY "Authenticated users can view quarterly reports"
  ON quarterly_reports FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "System can manage quarterly reports"
  ON quarterly_reports FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ======================
-- Annual evaluations policies
-- ======================
CREATE POLICY "Authenticated users can view annual evaluations"
  ON annual_evaluations FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "System can manage annual evaluations"
  ON annual_evaluations FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 確認
SELECT 'RLS policies created successfully' AS message;
