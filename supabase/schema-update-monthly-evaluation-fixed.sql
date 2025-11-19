-- Add columns to evaluations table
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS evaluation_year INTEGER,
ADD COLUMN IF NOT EXISTS evaluation_month INTEGER,
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS behavior_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS growth_score DECIMAL(5, 2);

-- Create quarterly_reports table
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

-- Create annual_evaluations table
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_quarterly_reports_updated_at ON quarterly_reports;
DROP TRIGGER IF EXISTS update_annual_evaluations_updated_at ON annual_evaluations;
DROP TRIGGER IF EXISTS trigger_update_quarterly_report ON evaluations;
DROP TRIGGER IF EXISTS trigger_update_annual_evaluation ON evaluations;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_quarterly_reports_updated_at
  BEFORE UPDATE ON quarterly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annual_evaluations_updated_at
  BEFORE UPDATE ON annual_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create or replace function to calculate and update quarterly reports
CREATE OR REPLACE FUNCTION update_quarterly_report()
RETURNS TRIGGER AS $$
DECLARE
  v_quarter INTEGER;
  v_avg_score DECIMAL(5, 2);
  v_eval_count INTEGER;
BEGIN
  IF NEW.status = 'completed' AND NEW.evaluation_year IS NOT NULL AND NEW.evaluation_month IS NOT NULL THEN
    v_quarter := CEIL(NEW.evaluation_month::DECIMAL / 3);

    SELECT
      AVG(total_score),
      COUNT(*)
    INTO v_avg_score, v_eval_count
    FROM evaluations
    WHERE staff_id = NEW.staff_id
      AND evaluation_year = NEW.evaluation_year
      AND CEIL(evaluation_month::DECIMAL / 3) = v_quarter
      AND status = 'completed';

    INSERT INTO quarterly_reports (staff_id, year, quarter, average_score, evaluation_count)
    VALUES (NEW.staff_id, NEW.evaluation_year, v_quarter, v_avg_score, v_eval_count)
    ON CONFLICT (staff_id, year, quarter)
    DO UPDATE SET
      average_score = v_avg_score,
      evaluation_count = v_eval_count,
      updated_at = TIMEZONE('utc', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to calculate and update annual evaluations
CREATE OR REPLACE FUNCTION update_annual_evaluation()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_score DECIMAL(5, 2);
  v_eval_count INTEGER;
  v_rank VARCHAR(10);
BEGIN
  IF NEW.status = 'completed' AND NEW.evaluation_year IS NOT NULL THEN
    SELECT
      AVG(total_score),
      COUNT(*)
    INTO v_avg_score, v_eval_count
    FROM evaluations
    WHERE staff_id = NEW.staff_id
      AND evaluation_year = NEW.evaluation_year
      AND status = 'completed';

    IF v_eval_count >= 12 THEN
      IF v_avg_score >= 95 THEN v_rank := 'SS';
      ELSIF v_avg_score >= 90 THEN v_rank := 'S';
      ELSIF v_avg_score >= 85 THEN v_rank := 'A+';
      ELSIF v_avg_score >= 80 THEN v_rank := 'A';
      ELSIF v_avg_score >= 75 THEN v_rank := 'A-';
      ELSIF v_avg_score >= 70 THEN v_rank := 'B';
      ELSIF v_avg_score >= 60 THEN v_rank := 'C';
      ELSE v_rank := 'D';
      END IF;

      INSERT INTO annual_evaluations (staff_id, year, average_score, rank, evaluation_count)
      VALUES (NEW.staff_id, NEW.evaluation_year, v_avg_score, v_rank, v_eval_count)
      ON CONFLICT (staff_id, year)
      DO UPDATE SET
        average_score = v_avg_score,
        rank = v_rank,
        evaluation_count = v_eval_count,
        updated_at = TIMEZONE('utc', NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to evaluations table
CREATE TRIGGER trigger_update_quarterly_report
  AFTER INSERT OR UPDATE ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_quarterly_report();

CREATE TRIGGER trigger_update_annual_evaluation
  AFTER INSERT OR UPDATE ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_annual_evaluation();

SELECT 'Monthly evaluation schema update completed successfully' AS message;
