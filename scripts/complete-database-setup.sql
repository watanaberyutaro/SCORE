-- ========================================
-- 完全なデータベースセットアップスクリプト
-- 全ての必要な変更を正しい順序で実行します
-- ========================================

-- ステップ1: CHECK制約を削除
ALTER TABLE evaluation_items_master
  DROP CONSTRAINT IF EXISTS evaluation_items_master_category_check;

-- ステップ2: categoryフィールドをtext型に変更
ALTER TABLE evaluation_items_master
  ALTER COLUMN category TYPE text;

-- ステップ3: 評価テーブルにcompany_idを追加
ALTER TABLE evaluation_categories
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE evaluation_items_master
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- ステップ4: 既存データを削除（全企業共有になっているため）
DELETE FROM evaluation_items_master;
DELETE FROM evaluation_categories;

-- ステップ5: インデックスを追加
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_company_id
  ON evaluation_categories(company_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_items_master_company_id
  ON evaluation_items_master(company_id);

-- ステップ6: category_keyのユニーク制約を変更
ALTER TABLE evaluation_categories
  DROP CONSTRAINT IF EXISTS evaluation_categories_category_key_key;

ALTER TABLE evaluation_categories
  ADD CONSTRAINT evaluation_categories_company_category_key
  UNIQUE (company_id, category_key);

-- ステップ7: evaluationsテーブルに必要なフィールドを追加
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES evaluation_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluation_year integer,
  ADD COLUMN IF NOT EXISTS evaluation_month integer;

-- ステップ8: 他のテーブルにcompany_idを追加
ALTER TABLE staff_goals
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE evaluation_questions
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- ステップ9: インデックスを追加
CREATE INDEX IF NOT EXISTS idx_evaluations_cycle_id ON evaluations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_year_month ON evaluations(evaluation_year, evaluation_month);
CREATE INDEX IF NOT EXISTS idx_staff_goals_company_id ON staff_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_questions_company_id ON evaluation_questions(company_id);

-- ステップ10: 既存データにcompany_idを設定
UPDATE staff_goals sg
SET company_id = u.company_id
FROM users u
WHERE sg.staff_id = u.id AND sg.company_id IS NULL;

UPDATE evaluation_questions eq
SET company_id = u.company_id
FROM users u
WHERE eq.staff_id = u.id AND eq.company_id IS NULL;

-- ステップ11: 既存のevaluationsデータにevaluation_yearとevaluation_monthを設定
UPDATE evaluations
SET
  evaluation_year = CAST(SUBSTRING(evaluation_period FROM '(\d{4})年') AS INTEGER),
  evaluation_month = CAST(SUBSTRING(evaluation_period FROM '(\d+)月') AS INTEGER)
WHERE evaluation_year IS NULL OR evaluation_month IS NULL;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'データベースセットアップが完了しました！';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. 次のSQLで合同会社SHAREの評価基準を追加';
  RAISE NOTICE '   → add-share-evaluation-items-with-company.sql';
  RAISE NOTICE '2. アプリケーションを再起動';
  RAISE NOTICE '==============================================';
END $$;
