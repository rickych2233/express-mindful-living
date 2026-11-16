const { pool } = require("../config/database");

class Discussion {
  static async findAll(filters = {}) {
    let query = "SELECT * FROM discussions";
    const values = [];
    if (filters.category) {
      query += " WHERE category = $1";
      values.push(filters.category);
    }
    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async create(data) {
    const { name, avatar, message, date, category, category_color, resonated, user_id } = data;
    const result = await pool.query(
      `INSERT INTO discussions (name, avatar, message, date, category, category_color, resonated, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, avatar, message, date, category, category_color, resonated, user_id]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    // Column whitelist — never interpolate raw body keys into SQL.
    const allowed = ["message", "category", "category_color", "resonated"];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] === undefined) continue;
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE discussions SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query("DELETE FROM discussions WHERE id = $1 RETURNING *", [id]);
    return result.rows[0];
  }
}

module.exports = Discussion;
