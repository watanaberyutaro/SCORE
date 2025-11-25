-- パフォーマンス改善のためのインデックス追加
-- 実行前に必ずバックアップを取得してください

-- ============================================
-- Step 1: 既存のインデックスを確認
-- ============================================
-- 以下のクエリで現在のインデックスを確認できます
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- ============================================
-- Step 2: usersテーブルのインデックス
-- ============================================

-- company_idでの検索を高速化（全ページで頻繁に使用）
CREATE INDEX IF NOT EXISTS idx_users_company_id
ON users(company_id);

-- roleとcompany_idの複合インデックス（管理者ダッシュボードで使用）
CREATE INDEX IF NOT EXISTS idx_users_role_company_id
ON users(role, company_id);

-- emailでの検索を高速化（ログイン時に使用）
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- ============================================
-- Step 3: companiesテーブルのインデックス
-- ============================================

-- company_codeでの検索を高速化（ログイン時に使用）
CREATE INDEX IF NOT EXISTS idx_companies_company_code
ON companies(company_code);

-- is_activeでのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_companies_is_active
ON companies(is_active);

-- ============================================
-- Step 4: evaluationsテーブルのインデックス
-- ============================================

-- staff_idでの検索を高速化（評価一覧取得時に使用）
CREATE INDEX IF NOT EXISTS idx_evaluations_staff_id
ON evaluations(staff_id);

-- evaluation_yearとevaluation_monthの複合インデックス（月次評価取得時に使用）
CREATE INDEX IF NOT EXISTS idx_evaluations_year_month
ON evaluations(evaluation_year, evaluation_month);

-- staff_id, year, monthの複合インデックス（特定のスタッフの特定月の評価取得時に使用）
CREATE INDEX IF NOT EXISTS idx_evaluations_staff_year_month
ON evaluations(staff_id, evaluation_year, evaluation_month);

-- statusでのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_evaluations_status
ON evaluations(status);

-- ============================================
-- Step 5: evaluation_responsesテーブルのインデックス
-- ============================================

-- evaluation_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_evaluation_id
ON evaluation_responses(evaluation_id);

-- admin_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_admin_id
ON evaluation_responses(admin_id);

-- ============================================
-- Step 6: evaluation_itemsテーブルのインデックス
-- ============================================

-- evaluation_response_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_evaluation_items_evaluation_response_id
ON evaluation_items(evaluation_response_id);

-- categoryでのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_evaluation_items_category
ON evaluation_items(category);

-- ============================================
-- Step 7: evaluation_items_masterテーブルのインデックス
-- ============================================

-- company_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_evaluation_items_master_company_id
ON evaluation_items_master(company_id);

-- company_idとcategoryの複合インデックス
CREATE INDEX IF NOT EXISTS idx_evaluation_items_master_company_category
ON evaluation_items_master(company_id, category);

-- ============================================
-- Step 8: evaluation_categoriesテーブルのインデックス
-- ============================================

-- company_idとis_activeの複合インデックス
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_company_active
ON evaluation_categories(company_id, is_active);

-- ============================================
-- Step 9: staff_goalsテーブルのインデックス
-- ============================================

-- company_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_staff_goals_company_id
ON staff_goals(company_id);

-- staff_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_staff_goals_staff_id
ON staff_goals(staff_id);

-- interview_statusでのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_staff_goals_interview_status
ON staff_goals(interview_status);

-- company_idとinterview_statusの複合インデックス（ダッシュボードで使用）
CREATE INDEX IF NOT EXISTS idx_staff_goals_company_interview_status
ON staff_goals(company_id, interview_status);

-- ============================================
-- Step 10: evaluation_questionsテーブルのインデックス
-- ============================================

-- company_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_evaluation_questions_company_id
ON evaluation_questions(company_id);

-- answerがnullかどうかでのフィルタリングを高速化
-- （部分インデックス：answerがnullの場合のみインデックス化）
CREATE INDEX IF NOT EXISTS idx_evaluation_questions_unanswered
ON evaluation_questions(company_id)
WHERE answer IS NULL;

-- ============================================
-- Step 11: rank_settingsテーブルのインデックス
-- ============================================

-- company_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_rank_settings_company_id
ON rank_settings(company_id);

-- ============================================
-- Step 12: インデックス作成完了の確認
-- ============================================

-- 以下のクエリで追加されたインデックスを確認
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- パフォーマンス改善効果の推定
-- ============================================
-- これらのインデックスにより、以下の改善が期待できます：
--
-- 1. ログイン処理: 30-50%高速化
--    - companies.company_code のインデックス
--    - users.email のインデックス
--
-- 2. ダッシュボード読み込み: 50-70%高速化
--    - users.role + company_id の複合インデックス
--    - evaluations.year + month の複合インデックス
--    - staff_goals.company_id + interview_status の複合インデックス
--
-- 3. 評価詳細ページ: 40-60%高速化
--    - evaluations.staff_id + year + month の複合インデックス
--    - evaluation_responses.evaluation_id のインデックス
--
-- 4. 全般的なクエリ: 20-40%高速化
--    - 各テーブルの company_id インデックス
--
-- ⚠️ 注意事項:
-- - インデックスはストレージを消費します（データ量の10-20%程度）
-- - INSERTやUPDATE時に若干のオーバーヘッドが発生しますが、
--   SELECT（読み取り）が圧倒的に多いシステムでは問題ありません
