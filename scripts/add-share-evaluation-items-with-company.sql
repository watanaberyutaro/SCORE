-- 合同会社SHARE用の評価カテゴリと評価項目を追加
-- ※事前に add-company-id-to-evaluation-tables.sql を実行してください

-- 1. 合同会社SHAREのcompany_idを取得
DO $$
DECLARE
  v_company_id uuid;
BEGIN
  -- 会社名で検索してcompany_idを取得
  SELECT id INTO v_company_id
  FROM companies
  WHERE company_name = '合同会社SHARE'
  LIMIT 1;

  -- 会社が見つからない場合はエラー
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION '合同会社SHAREが見つかりません。company_nameを確認してください。';
  END IF;

  -- 2. 評価カテゴリを追加
  INSERT INTO evaluation_categories (company_id, category_key, category_label, description, display_order, is_default, is_active)
  VALUES
    (v_company_id, 'performance', '成果評価', '売上や実績、勤怠など業務成果に関する評価', 1, true, true),
    (v_company_id, 'behavior', '行動評価', '主体性、責任感、協調性など行動面に関する評価', 2, true, true),
    (v_company_id, 'growth', '成長評価', '自己研鑽、レスポンス、目標達成など成長面に関する評価', 3, true, true)
  ON CONFLICT (company_id, category_key) DO NOTHING;

  -- 3. 評価項目を追加
  INSERT INTO evaluation_items_master (company_id, category, item_name, min_score, max_score, description)
  VALUES
    -- 成果評価（4項目）
    (
      v_company_id,
      'performance',
      '実績評価',
      0,
      25,
      '【イベント】契約数など実績、生産性【常勤】契約数など実績、ブラウン等副商材売上げ、月間総販（HS新規、でんき、ガス、光、クレカ類、自銀）'
    ),
    (
      v_company_id,
      'performance',
      '勤怠評価（※減点あり）',
      -5,
      5,
      '遅刻・欠勤・連絡遅れなどで減点'
    ),
    (
      v_company_id,
      'performance',
      'コンプライアンス評価',
      -10,
      3,
      'コンプラ違反、Cからクレーム、館からクレーム'
    ),
    (
      v_company_id,
      'performance',
      'クライアント評価',
      0,
      15,
      '案件継続、直接的評価'
    ),

    -- 行動評価（4項目）
    (
      v_company_id,
      'behavior',
      '主体性評価',
      0,
      10,
      '自発的な行動、自発的な提案'
    ),
    (
      v_company_id,
      'behavior',
      '責任感',
      0,
      7,
      '責任感（7段階評価）'
    ),
    (
      v_company_id,
      'behavior',
      '協調性評価',
      0,
      10,
      'チーム連携・他者配慮（10段階評価）'
    ),
    (
      v_company_id,
      'behavior',
      'アピアランス評価',
      0,
      3,
      '清潔感、第一印象、身だしなみ'
    ),

    -- 成長評価（3項目）
    (
      v_company_id,
      'growth',
      '自己研鑽評価',
      0,
      7,
      'スキル向上へ努力、全体会議など参加率'
    ),
    (
      v_company_id,
      'growth',
      'レスポンス評価',
      0,
      5,
      'フィードバックに対して修正、素直さ（5段階評価）'
    ),
    (
      v_company_id,
      'growth',
      '自己目標達成評価',
      0,
      10,
      '立てた目標達成度（達成率100%中どれくらいか）'
    );

  -- 成功メッセージ
  RAISE NOTICE '合同会社SHAREの評価設定を追加しました';
  RAISE NOTICE '- カテゴリ: 3件';
  RAISE NOTICE '- 評価項目: 11件';
  RAISE NOTICE '  - 成果評価: 4項目（最大48点、最小-10点）';
  RAISE NOTICE '  - 行動評価: 4項目（最大30点）';
  RAISE NOTICE '  - 成長評価: 3項目（最大22点）';
  RAISE NOTICE '  - 総合最大: 100点';
END $$;
