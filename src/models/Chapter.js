const { pool } = require("../config/database");

class Chapter {
  static async create(chapterData) {
    const { title, description, status = "Drafted" } = chapterData;

    const getNextOrderQuery = `
      SELECT COALESCE(MAX(chapter_order), 0) + 1 as next_order
      FROM chapters
    `;

    const orderResult = await pool.query(getNextOrderQuery);
    const nextOrder = orderResult.rows[0].next_order;

    const query = `
      INSERT INTO chapters (chapter_order, title, description, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [nextOrder, title, description, status]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT * FROM chapters
      ORDER BY chapter_order ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT * FROM chapters
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, chapterData) {
    const { title, description, status } = chapterData;

    const query = `
      UPDATE chapters
      SET title = $1, description = $2, status = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(query, [title, description, status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM chapters
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async toggleStatus(id) {
    const query = `
      UPDATE chapters
      SET status = CASE
        WHEN status = 'Published' THEN 'Drafted'
        ELSE 'Published'
      END
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async setStatus(id, status) {
    const query = `
      UPDATE chapters
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = Chapter;
