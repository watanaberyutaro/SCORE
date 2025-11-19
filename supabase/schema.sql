-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
  is_admin BOOLEAN DEFAULT FALSE,
  department VARCHAR(100),
  position VARCHAR(100),
  hire_date DATE,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluation_period VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'submitted', 'completed')) DEFAULT 'draft',
  total_score DECIMAL(5, 2),
  rank VARCHAR(10) CHECK (rank IN ('SS', 'S', 'A+', 'A', 'A-', 'B', 'C', 'D')),
  average_score DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(staff_id, evaluation_period)
);

-- Evaluation responses table (3名の管理者からの評価)
CREATE TABLE IF NOT EXISTS evaluation_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_score DECIMAL(5, 2),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(evaluation_id, admin_id)
);

-- Evaluation items table
CREATE TABLE IF NOT EXISTS evaluation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_response_id UUID NOT NULL REFERENCES evaluation_responses(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('performance', 'behavior', 'growth')),
  item_name VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Admin comments table
CREATE TABLE IF NOT EXISTS admin_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Staff goals table
CREATE TABLE IF NOT EXISTS staff_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_title VARCHAR(255) NOT NULL,
  goal_description TEXT NOT NULL,
  target_date DATE NOT NULL,
  achievement_rate DECIMAL(5, 2) DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Evaluation questions table
CREATE TABLE IF NOT EXISTS evaluation_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  answered_at TIMESTAMP WITH TIME ZONE
);

-- Evaluation items master table
CREATE TABLE IF NOT EXISTS evaluation_items_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(20) NOT NULL CHECK (category IN ('performance', 'behavior', 'growth')),
  item_name VARCHAR(100) NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Evaluation cycles table
CREATE TABLE IF NOT EXISTS evaluation_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_name VARCHAR(100) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trial_date DATE,
  implementation_date DATE,
  final_date DATE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('planning', 'active', 'completed')) DEFAULT 'planning',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Productivity data table
CREATE TABLE IF NOT EXISTS productivity_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sales_amount DECIMAL(15, 2),
  contracts_count INTEGER,
  tasks_completed INTEGER,
  attendance_rate DECIMAL(5, 2),
  external_source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(staff_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evaluations_staff_id ON evaluations(staff_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_period ON evaluations(evaluation_period);
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_evaluation_id ON evaluation_responses(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_admin_id ON evaluation_responses(admin_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_items_response_id ON evaluation_items(evaluation_response_id);
CREATE INDEX IF NOT EXISTS idx_admin_comments_evaluation_id ON admin_comments(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_admin_comments_admin_id ON admin_comments(admin_id);
CREATE INDEX IF NOT EXISTS idx_staff_goals_staff_id ON staff_goals(staff_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_questions_evaluation_id ON evaluation_questions(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_questions_staff_id ON evaluation_questions(staff_id);
CREATE INDEX IF NOT EXISTS idx_productivity_data_staff_id ON productivity_data(staff_id);
CREATE INDEX IF NOT EXISTS idx_productivity_data_date ON productivity_data(date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_responses_updated_at BEFORE UPDATE ON evaluation_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_comments_updated_at BEFORE UPDATE ON admin_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_goals_updated_at BEFORE UPDATE ON staff_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default evaluation items master data
INSERT INTO evaluation_items_master (category, item_name, min_score, max_score, description) VALUES
-- Performance items
('performance', '実績評価', 0, 25, '売上や契約数などの実績を評価'),
('performance', '勤怠評価', -5, 5, '出勤状況や遅刻・早退を評価'),
('performance', 'コンプライアンス評価', -10, 3, '規則遵守やコンプライアンス意識を評価'),
('performance', 'クライアント評価', 0, 15, 'クライアントからの評価や満足度'),
-- Behavior items
('behavior', '主体性評価', 0, 10, '自発的な行動や提案を評価'),
('behavior', '責任感', 0, 7, '仕事への責任感や完遂力を評価'),
('behavior', '協調性評価', 0, 10, 'チームワークや協力姿勢を評価'),
('behavior', 'アピアランス評価', 0, 3, '身だしなみや印象を評価'),
-- Growth items
('growth', '自己研鑽評価', 0, 7, '自己学習や成長への取り組みを評価'),
('growth', 'レスポンス評価', 0, 5, '迅速な対応や反応を評価'),
('growth', '自己目標達成評価', 0, 10, '設定した目標の達成度を評価')
ON CONFLICT DO NOTHING;
