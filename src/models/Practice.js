const { pool } = require("../config/database");

class Practice {
  static async create(practiceData) {
    const { title, goal, duration, sessions, category, status, caption, thumbnail, sessions_data, related_chapters } = practiceData;
    const query = `
      INSERT INTO practices (title, goal, duration, sessions, category, status, caption, thumbnail, sessions_data, related_chapters)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      title,
      goal,
      duration,
      sessions,
      category,
      status || 'Drafted',
      caption || '',
      thumbnail || null,
      sessions_data ? JSON.stringify(sessions_data) : '[]',
      related_chapters ? JSON.stringify(related_chapters) : '[]'
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll(options = {}) {
    let query = "SELECT * FROM practices";
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
    
    query += " ORDER BY order_index ASC, created_at DESC";

    const { rows } = await pool.query(query, values);
    return rows;
  }

  static async update(id, updates) {
    const allowedFields = ["title", "goal", "duration", "sessions", "category", "status", "caption", "thumbnail", "sessions_data", "related_chapters"];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        let val = updates[field];
        if ((field === 'sessions_data' || field === 'related_chapters') && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        values.push(val);
        paramIndex++;
      }
    }

    if (setClause.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE practices
      SET ${setClause.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = "DELETE FROM practices WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async reorder(practiceIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < practiceIds.length; i++) {
        await client.query('UPDATE practices SET order_index = $1 WHERE id = $2', [i, practiceIds[i]]);
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = Practice;
