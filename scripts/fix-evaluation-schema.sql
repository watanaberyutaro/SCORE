-- 評価項目マスターのcategoryフィールドをenumからtextに変更
-- これにより、動的に追加したカテゴリが使用可能になります

-- まず、既存のCHECK制約を削除
ALTER TABLE evaluation_items_master
  DROP CONSTRAINT IF EXISTS evaluation_items_master_category_check;

-- categoryフィールドをtextに変更
ALTER TABLE evaluation_items_master
  ALTER COLUMN category TYPE text;

-- デフォルトカテゴリをevaluation_categoriesテーブルに追加（存在しない場合）
INSERT INTO evaluation_categories (category_key, category_label, description, display_order, is_default, is_active)
VALUES
  ('performance', '成果評価', '売上や実績、勤怠など業務成果に関する評価', 1, true, true),
  ('behavior', '行動評価', '主体性、責任感、協調性など行動面に関する評価', 2, true, true),
  ('growth', '成長評価', '自己研鑽、レスポンス、目標達成など成長面に関する評価', 3, true, true)
ON CONFLICT (category_key) DO NOTHING;

-- デフォルトの評価項目を追加（存在しない場合）
INSERT INTO evaluation_items_master (category, item_name, min_score, max_score, description)
VALUES
  -- 成果評価項目
  ('performance', '実績評価', 0, 25, '売上や契約数などの実績を評価'),
  ('performance', '勤怠評価', -5, 5, '出勤状況や遅刻・早退を評価'),
  ('performance', 'コンプライアンス評価', -10, 3, '規則遵守やコンプライアンス意識を評価'),
  ('performance', 'クライアント評価', 0, 15, 'クライアントからの評価や満足度'),

  -- 行動評価項目
  ('behavior', '主体性評価', 0, 10, '自発的な行動や提案を評価'),
  ('behavior', '責任感', 0, 7, '仕事への責任感や完遂力を評価'),
  ('behavior', '協調性評価', 0, 10, 'チームワークや協力姿勢を評価'),
  ('behavior', 'アピアランス評価', 0, 3, '身だしなみや印象を評価'),

  -- 成長評価項目
  ('growth', '自己研鑽評価', 0, 7, '自己学習や成長への取り組みを評価'),
  ('growth', 'レスポンス評価', 0, 5, '迅速な対応や反応を評価'),
  ('growth', '自己目標達成評価', 0, 10, '設定した目標の達成度を評価')
ON CONFLICT DO NOTHING;
