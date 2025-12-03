const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Password reset tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      context TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'To Do',
      completed BOOLEAN DEFAULT 0,
      priority TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Backlog tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS backlog_tasks (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      context TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'To Do',
      completed BOOLEAN DEFAULT 0,
      priority TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Recurring tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_tasks (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      context TEXT NOT NULL,
      status TEXT DEFAULT 'To Do',
      frequency TEXT NOT NULL,
      active BOOLEAN DEFAULT 1,
      generated_dates TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Custom statuses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Custom categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Classes/modules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Class modules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS class_modules (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      class_id TEXT NOT NULL,
      module_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      week_number INTEGER,
      status TEXT DEFAULT 'pending',
      completed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )
  `);

  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      theme TEXT DEFAULT 'light',
      settings_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(context);
    CREATE INDEX IF NOT EXISTS idx_backlog_user ON backlog_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_classes_user ON classes(user_id);
    CREATE INDEX IF NOT EXISTS idx_modules_user ON class_modules(user_id);
  `);

  console.log('Database initialized successfully');
}

// Initialize the database
initializeDatabase();

module.exports = db;
