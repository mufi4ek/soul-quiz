CREATE TABLE IF NOT EXISTS site_stats (
  id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO site_stats (id, views) VALUES ('total', 0);

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  last_counted INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitors_last_counted ON visitors(last_counted);

CREATE TRIGGER IF NOT EXISTS visitors_count_insert
AFTER INSERT ON visitors
BEGIN
  UPDATE site_stats SET views = views + 1 WHERE id = 'total';
END;

CREATE TRIGGER IF NOT EXISTS visitors_count_refresh
AFTER UPDATE OF last_counted ON visitors
WHEN NEW.last_counted > OLD.last_counted
BEGIN
  UPDATE site_stats SET views = views + 1 WHERE id = 'total';
END;
