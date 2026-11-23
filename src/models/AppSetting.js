const { pool } = require("../config/database");

/** Global app settings stored as JSONB, remote-controlled from the server. */
class AppSetting {
  static async get(key) {
    const { rows } = await pool.query(
      "SELECT value FROM app_settings WHERE key = $1",
      [key]
    );
    return rows[0]?.value ?? null;
  }

  static async set(key, value) {
    const { rows } = await pool.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE
       SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, JSON.stringify(value)]
    );
    return rows[0];
  }
}

module.exports = { AppSetting };
