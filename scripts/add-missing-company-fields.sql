-- 全テーブルに company_id および必要なフィールドを追加
-- これにより、すべてのデータが企業ごとに独立します

-- 1. evaluations テーブルに必要なフィールドを追加
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES evaluation_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluation_year integer,
  ADD COLUMN IF NOT EXISTS evaluation_month integer;

-- 2. staff_goals テーブルに company_id を追加（ユーザー経由で取得可能だが、直接持つ方が効率的）
ALTER TABLE staff_goals
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 3. evaluation_questions テーブルに company_id を追加
ALTER TABLE evaluation_questions
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 4. productivity_data テーブルに company_id を追加（存在する場合）
ALTER TABLE productivity_data
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 5. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_evaluations_cycle_id ON evaluations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_year_month ON evaluations(evaluation_year, evaluation_month);
CREATE INDEX IF NOT EXISTS idx_staff_goals_company_id ON staff_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_questions_company_id ON evaluation_questions(company_id);
CREATE INDEX IF NOT EXISTS idx_productivity_data_company_id ON productivity_data(company_id);

-- 6. 既存データに company_id を設定（users テーブルから取得）
UPDATE staff_goals sg
SET company_id = u.company_id
FROM users u
WHERE sg.staff_id = u.id AND sg.company_id IS NULL;

UPDATE evaluation_questions eq
SET company_id = u.company_id
FROM users u
WHERE eq.staff_id = u.id AND eq.company_id IS NULL;

-- 7. 既存の evaluations データに evaluation_year と evaluation_month を設定
UPDATE evaluations
SET
  evaluation_year = CAST(SUBSTRING(evaluation_period FROM '(\d{4})年') AS INTEGER),
  evaluation_month = CAST(SUBSTRING(evaluation_period FROM '(\d+)月') AS INTEGER)
WHERE evaluation_year IS NULL OR evaluation_month IS NULL;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'データベーススキーマの更新が完了しました';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '追加されたフィールド:';
  RAISE NOTICE '- evaluations: cycle_id, evaluation_year, evaluation_month';
  RAISE NOTICE '- staff_goals: company_id';
  RAISE NOTICE '- evaluation_questions: company_id';
  RAISE NOTICE '- productivity_data: company_id';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. アプリケーションを再起動';
  RAISE NOTICE '2. TypeScript型定義を更新（types/database.ts）';
  RAISE NOTICE '==============================================';
END $$;
