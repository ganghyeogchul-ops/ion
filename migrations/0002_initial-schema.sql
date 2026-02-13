-- Members table (회원)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  id_number TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- Posts table (게시글)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  board_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  item_name TEXT,
  price TEXT,
  views INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_posts_board_type ON posts(board_type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON posts(deleted_at);

-- Comments table (댓글)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at);

-- Trade requests table (거래신청)
CREATE TABLE IF NOT EXISTS trade_requests (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  post_title TEXT,
  name TEXT NOT NULL,
  id_number TEXT,
  phone TEXT,
  game_id TEXT,
  sell_amount INTEGER DEFAULT 0,
  buy_amount INTEGER DEFAULT 0,
  trade_type TEXT,
  status TEXT DEFAULT 'completed',
  created_at INTEGER NOT NULL,
  custom_date TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trade_requests_post_id ON trade_requests(post_id);
CREATE INDEX IF NOT EXISTS idx_trade_requests_status ON trade_requests(status);
CREATE INDEX IF NOT EXISTS idx_trade_requests_deleted_at ON trade_requests(deleted_at);
