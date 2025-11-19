-- ===================================
-- 月次評価システム対応スキーマ更新
-- ===================================

-- evaluationsテーブルに年月フィールドを追加
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS evaluation_year INTEGER,
ADD COLUMN IF NOT EXISTS evaluation_month INTEGER;

-- evaluation_periodから年月を抽出して設定（既存データの移行）
UPDATE evaluations
SET
  evaluation_year = EXTRACT(YEAR FROM CURRENT_DATE),
  evaluation_month = 1
WHERE evaluation_year IS NULL;

-- 3ヶ月ごとの中間報告テーブル
CREATE TABLE IF NOT EXISTS quarterly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  average_score DECIMAL(5, 2),
  evaluation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(staff_id, year, quarter)
);

-- 年次評価テーブル
CREATE TABLE IF NOT EXISTS annual_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  average_score DECIMAL(5, 2),
  rank VARCHAR(10) CHECK (rank IN ('SS', 'S', 'A+', 'A', 'A-', 'B', 'C', 'D')),
  evaluation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(staff_id, year)
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_evaluations_year_month ON evaluations(evaluation_year, evaluation_month);
CREATE INDEX IF NOT EXISTS idx_evaluations_staff_year ON evaluations(staff_id, evaluation_year);
CREATE INDEX IF NOT EXISTS idx_quarterly_reports_staff_id ON quarterly_reports(staff_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_reports_year_quarter ON quarterly_reports(year, quarter);
CREATE INDEX IF NOT EXISTS idx_annual_evaluations_staff_id ON annual_evaluations(staff_id);
CREATE INDEX IF NOT EXISTS idx_annual_evaluations_year ON annual_evaluations(year);

-- updated_atトリガー追加
CREATE TRIGGER update_quarterly_reports_updated_at BEFORE UPDATE ON quarterly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annual_evaluations_updated_at BEFORE UPDATE ON annual_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3ヶ月ごとの平均を計算して中間報告を作成する関数
CREATE OR REPLACE FUNCTION calculate_quarterly_report(
  p_staff_id UUID,
  p_year INTEGER,
  p_quarter INTEGER
)
RETURNS void AS $$
DECLARE
  v_start_month INTEGER;
  v_end_month INTEGER;
  v_avg_score DECIMAL(5, 2);
  v_count INTEGER;
BEGIN
  -- 四半期の開始月と終了月を計算
  v_start_month := (p_quarter - 1) * 3 + 1;
  v_end_month := p_quarter * 3;

  -- 該当期間の評価の平均を計算
  SELECT
    AVG(total_score),
    COUNT(*)
  INTO
    v_avg_score,
    v_count
  FROM evaluations
  WHERE
    staff_id = p_staff_id
    AND evaluation_year = p_year
    AND evaluation_month BETWEEN v_start_month AND v_end_month
    AND status = 'completed';

  -- 中間報告を作成または更新
  IF v_count > 0 THEN
    INSERT INTO quarterly_reports (
      staff_id,
      year,
      quarter,
      average_score,
      evaluation_count
    ) VALUES (
      p_staff_id,
      p_year,
      p_quarter,
      v_avg_score,
      v_count
    )
    ON CONFLICT (staff_id, year, quarter)
    DO UPDATE SET
      average_score = v_avg_score,
      evaluation_count = v_count,
      updated_at = TIMEZONE('utc', NOW());
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 年次評価を計算する関数
CREATE OR REPLACE FUNCTION calculate_annual_evaluation(
  p_staff_id UUID,
  p_year INTEGER
)
RETURNS void AS $$
DECLARE
  v_avg_score DECIMAL(5, 2);
  v_count INTEGER;
  v_rank VARCHAR(10);
BEGIN
  -- 1年間の評価の平均を計算
  SELECT
    AVG(total_score),
    COUNT(*)
  INTO
    v_avg_score,
    v_count
  FROM evaluations
  WHERE
    staff_id = p_staff_id
    AND evaluation_year = p_year
    AND status = 'completed';

  -- ランクを決定
  IF v_avg_score >= 95 THEN
    v_rank := 'SS';
  ELSIF v_avg_score >= 90 THEN
    v_rank := 'S';
  ELSIF v_avg_score >= 85 THEN
    v_rank := 'A+';
  ELSIF v_avg_score >= 80 THEN
    v_rank := 'A';
  ELSIF v_avg_score >= 75 THEN
    v_rank := 'A-';
  ELSIF v_avg_score >= 70 THEN
    v_rank := 'B';
  ELSIF v_avg_score >= 60 THEN
    v_rank := 'C';
  ELSE
    v_rank := 'D';
  END IF;

  -- 年次評価を作成または更新
  IF v_count >= 12 THEN  -- 12ヶ月分の評価が揃っている場合のみ
    INSERT INTO annual_evaluations (
      staff_id,
      year,
      average_score,
      rank,
      evaluation_count
    ) VALUES (
      p_staff_id,
      p_year,
      v_avg_score,
      v_rank,
      v_count
    )
    ON CONFLICT (staff_id, year)
    DO UPDATE SET
      average_score = v_avg_score,
      rank = v_rank,
      evaluation_count = v_count,
      updated_at = TIMEZONE('utc', NOW());
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 評価完了時に自動的に中間報告と年次評価を更新するトリガー関数
CREATE OR REPLACE FUNCTION auto_update_reports()
RETURNS TRIGGER AS $$
DECLARE
  v_quarter INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- 四半期を計算
    v_quarter := CEIL(NEW.evaluation_month::DECIMAL / 3);

    -- 3ヶ月ごとの中間報告を更新
    PERFORM calculate_quarterly_report(NEW.staff_id, NEW.evaluation_year, v_quarter);

    -- 12月の評価が完了したら年次評価を計算
    IF NEW.evaluation_month = 12 THEN
      PERFORM calculate_annual_evaluation(NEW.staff_id, NEW.evaluation_year);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_auto_update_reports ON evaluations;
CREATE TRIGGER trigger_auto_update_reports
  AFTER INSERT OR UPDATE ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_reports();

-- 確認用クエリ
SELECT 'Schema updated successfully' AS message;
