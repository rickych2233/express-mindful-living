const { pool } = require("../config/database");

class CommunityCategory {
  static async findAll() {
    const query = "SELECT * FROM community_categories ORDER BY id ASC";
    const { rows } = await pool.query(query);
    return rows;
  }

  static async create(data) {
    const { name, color, count } = data;
    const query = "INSERT INTO community_categories (name, color, count) VALUES ($1, $2, $3) RETURNING *";
    const { rows } = await pool.query(query, [name, color, count || 0]);
    return rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in data) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (fields.length === 0) return null;
    values.push(id);

    const query = `UPDATE community_categories SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = "DELETE FROM community_categories WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
}

module.exports = CommunityCategory;
