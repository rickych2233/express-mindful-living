const { pool } = require("../config/database");

class MediaFile {
  static async findAll(filters = {}) {
    let query = "SELECT * FROM media_files";
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
    const { name, author, format, category, date_added, status, color } = data;
    const result = await pool.query(
      `INSERT INTO media_files (name, author, format, category, date_added, status, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, author, format, category, date_added, status, color]
    );
    return result.rows[0];
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
    const query = `UPDATE media_files SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query("DELETE FROM media_files WHERE id = $1 RETURNING *", [id]);
    return result.rows[0];
  }
}

module.exports = MediaFile;
