const { pool } = require("../config/database");

class Chapter {
  static async create(chapterData) {
    const { title, description, status = "Drafted", sections } = chapterData;

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
    const chapter = result.rows[0];

    // Create initial sections if provided
    if (Array.isArray(sections) && sections.length > 0) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        await pool.query(
          `INSERT INTO sections (chapter_id, section_order, title, description, type, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            chapter.id,
            i + 1,
            sec.title || `Section ${i + 1}`,
            sec.description || "",
            sec.type || "Text",
            sec.status || "Drafted",
          ]
        );
      }
      chapter.section_count = sections.length;
    } else {
      chapter.section_count = 0;
    }

    return chapter;
  }

  static async findAll() {
    const query = `
      SELECT c.*,
        COALESCE(s.section_count, 0)::int as section_count
      FROM chapters c
      LEFT JOIN (
        SELECT chapter_id, COUNT(*) as section_count
        FROM sections
        GROUP BY chapter_id
      ) s ON c.id = s.chapter_id
      ORDER BY c.chapter_order ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT c.*,
        COALESCE(s.section_count, 0)::int as section_count
      FROM chapters c
      LEFT JOIN (
        SELECT chapter_id, COUNT(*) as section_count
        FROM sections
        GROUP BY chapter_id
      ) s ON c.id = s.chapter_id
      WHERE c.id = $1
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
