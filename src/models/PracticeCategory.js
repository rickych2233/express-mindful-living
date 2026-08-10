const { pool } = require("../config/database");

class PracticeCategory {
  static async create(name) {
    const query = "INSERT INTO practice_categories (name) VALUES ($1) RETURNING *";
    const { rows } = await pool.query(query, [name]);
    return rows[0];
  }

  static async findAll() {
    const query = "SELECT * FROM practice_categories ORDER BY order_index ASC, id ASC";
    const { rows } = await pool.query(query);
    return rows;
  }

  static async update(id, name) {
    const query = "UPDATE practice_categories SET name = $1 WHERE id = $2 RETURNING *";
    const { rows } = await pool.query(query, [name, id]);
    return rows[0];
  }

  static async delete(id) {
    const query = "DELETE FROM practice_categories WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async reorder(categoryIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < categoryIds.length; i++) {
        await client.query('UPDATE practice_categories SET order_index = $1 WHERE id = $2', [i, categoryIds[i]]);
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

module.exports = PracticeCategory;
