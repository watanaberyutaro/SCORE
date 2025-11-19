-- Enable Row Level Security
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

-- Users table policies
-- 管理者は全てのユーザーを閲覧可能
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- ユーザーは自分自身の情報を閲覧可能
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 管理者はユーザー情報を更新可能
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- ユーザーは自分自身の情報を更新可能
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Evaluations table policies
-- 管理者は全ての評価を閲覧可能
CREATE POLICY "Admins can view all evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- スタッフは自分の評価のみ閲覧可能
CREATE POLICY "Staff can view their own evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

-- 管理者は評価を作成・更新可能
CREATE POLICY "Admins can insert evaluations"
  ON evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update evaluations"
  ON evaluations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- Evaluation responses table policies
-- 管理者は全ての評価回答を閲覧可能
CREATE POLICY "Admins can view all evaluation responses"
  ON evaluation_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- スタッフは自分への評価回答を閲覧可能
CREATE POLICY "Staff can view their evaluation responses"
  ON evaluation_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_responses.evaluation_id
      AND evaluations.staff_id = auth.uid()
    )
  );

-- 管理者は自分の評価回答を作成・更新可能
CREATE POLICY "Admins can insert their own responses"
  ON evaluation_responses FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update their own responses"
  ON evaluation_responses FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- Evaluation items table policies
-- 管理者は全ての評価項目を閲覧可能
CREATE POLICY "Admins can view all evaluation items"
  ON evaluation_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- スタッフは自分への評価項目を閲覧可能
CREATE POLICY "Staff can view their evaluation items"
  ON evaluation_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_responses er
      JOIN evaluations e ON e.id = er.evaluation_id
      WHERE er.id = evaluation_items.evaluation_response_id
      AND e.staff_id = auth.uid()
    )
  );

-- 管理者は評価項目を作成・更新可能
CREATE POLICY "Admins can insert evaluation items"
  ON evaluation_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluation_responses er
      WHERE er.id = evaluation_response_id
      AND er.admin_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = TRUE
      )
    )
  );

-- Admin comments table policies
-- 管理者は全てのコメントを閲覧・作成・更新可能
CREATE POLICY "Admins can manage comments"
  ON admin_comments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- スタッフは自分へのコメントを閲覧可能
CREATE POLICY "Staff can view their comments"
  ON admin_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = admin_comments.evaluation_id
      AND evaluations.staff_id = auth.uid()
    )
  );

-- Staff goals table policies
-- スタッフは自分の目標を管理可能
CREATE POLICY "Staff can manage their own goals"
  ON staff_goals FOR ALL
  TO authenticated
  USING (staff_id = auth.uid());

-- 管理者は全ての目標を閲覧可能
CREATE POLICY "Admins can view all goals"
  ON staff_goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- Evaluation questions table policies
-- スタッフは自分の質問を作成・閲覧可能
CREATE POLICY "Staff can manage their own questions"
  ON evaluation_questions FOR ALL
  TO authenticated
  USING (staff_id = auth.uid());

-- 管理者は全ての質問を閲覧・回答可能
CREATE POLICY "Admins can manage all questions"
  ON evaluation_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- Evaluation items master table policies
-- 全てのユーザーが閲覧可能
CREATE POLICY "All users can view evaluation items master"
  ON evaluation_items_master FOR SELECT
  TO authenticated
  USING (TRUE);

-- 管理者のみ作成・更新可能
CREATE POLICY "Admins can manage evaluation items master"
  ON evaluation_items_master FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- Evaluation cycles table policies
-- 全てのユーザーが閲覧可能
CREATE POLICY "All users can view evaluation cycles"
  ON evaluation_cycles FOR SELECT
  TO authenticated
  USING (TRUE);

-- 管理者のみ作成・更新可能
CREATE POLICY "Admins can manage evaluation cycles"
  ON evaluation_cycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- Productivity data table policies
-- スタッフは自分のデータを閲覧可能
CREATE POLICY "Staff can view their own productivity data"
  ON productivity_data FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

-- 管理者は全てのデータを閲覧可能
CREATE POLICY "Admins can view all productivity data"
  ON productivity_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- 管理者はデータを作成・更新可能
CREATE POLICY "Admins can manage productivity data"
  ON productivity_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update productivity data"
  ON productivity_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );
