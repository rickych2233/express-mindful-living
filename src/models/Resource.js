const { pool } = require("../config/database");

class Resource {
  static async create(resourceData) {
    const { title, caption, category, status, thumbnail, content_type, content_texts, content_files } = resourceData;
    const query = `
      INSERT INTO resources (title, caption, category, status, thumbnail, content_type, content_texts, content_files)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      title,
      caption,
      category,
      status || 'Drafted',
      thumbnail || null,
      content_type || 'Text',
      content_texts || '{}',
      content_files || '{}'
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll(options = {}) {
    let query = "SELECT * FROM resources";
    const conditions = [];
    const values = [];

    if (options.category) {
      values.push(options.category);
      conditions.push(`category = $${values.length}`);
    }
    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY created_at DESC";

    const { rows } = await pool.query(query, values);
    return rows;
  }

  static async update(id, updates) {
    const allowedFields = ["title", "caption", "category", "status", "thumbnail", "content_type", "content_texts", "content_files"];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (setClause.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE resources
      SET ${setClause.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = "DELETE FROM resources WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
}

module.exports = Resource;
