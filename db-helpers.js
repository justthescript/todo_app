const { pool } = require('./database');

/**
 * Helper functions to make PostgreSQL work similarly to SQLite
 * This minimizes changes needed in server.js
 */

// Convert SQLite placeholders (?) to PostgreSQL placeholders ($1, $2, etc.)
function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// SQLite-like prepare() that returns an object with run(), get(), and all() methods
function prepare(sql) {
  const pgSql = convertPlaceholders(sql);

  return {
    // run() - for INSERT, UPDATE, DELETE
    async run(...params) {
      const result = await pool.query(pgSql, params);
      return {
        lastInsertRowid: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    },

    // get() - for SELECT that returns one row
    async get(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows[0] || null;
    },

    // all() - for SELECT that returns multiple rows
    async all(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows;
    }
  };
}

// For queries that need to return the inserted ID
function prepareWithReturning(sql) {
  // Add RETURNING id to INSERT statements if not present
  let pgSql = sql;
  if (sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')) {
    pgSql = sql.trim() + ' RETURNING id';
  }
  pgSql = convertPlaceholders(pgSql);

  return {
    async run(...params) {
      const result = await pool.query(pgSql, params);
      return {
        lastInsertRowid: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    }
  };
}

module.exports = {
  prepare,
  prepareWithReturning,
  pool
};
