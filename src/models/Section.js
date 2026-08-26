const { pool } = require("../config/database");

class Section {
  static async create(sectionData) {
    const { chapter_id, title, description = "", content = "", type = "Text", status = "Drafted" } = sectionData;

    const getNextOrderQuery = `
      SELECT COALESCE(MAX(section_order), 0) + 1 as next_order
      FROM sections
      WHERE chapter_id = $1
    `;

    const orderResult = await pool.query(getNextOrderQuery, [chapter_id]);
    const nextOrder = orderResult.rows[0].next_order;

    const query = `
      INSERT INTO sections (chapter_id, section_order, title, description, content, type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [chapter_id, nextOrder, title, description, content, type, status]);
    return result.rows[0];
  }

  static async findByChapterId(chapterId) {
    const query = `
      SELECT s.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', sc.id, 
                   'title', sc.title, 
                   'type', sc.type, 
                   'is_required', sc.is_required, 
                   'url', sc.url,
                   'content_order', sc.content_order
                 ) ORDER BY sc.content_order ASC
               ) FILTER (WHERE sc.id IS NOT NULL), '[]'
             ) as contents
      FROM sections s
      LEFT JOIN section_contents sc ON s.id = sc.section_id
      WHERE s.chapter_id = $1
      GROUP BY s.id
      ORDER BY s.section_order ASC
    `;

    const result = await pool.query(query, [chapterId]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT * FROM sections
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, sectionData) {
    const { title, description, content, type, status } = sectionData;

    const query = `
      UPDATE sections
      SET title = $1, description = $2, content = $3, type = $4, status = $5
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [title, description, content, type, status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM sections
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async toggleStatus(id) {
    const query = `
      UPDATE sections
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

  static async countByChapterId(chapterId) {
    const query = `
      SELECT COUNT(*)::int as count FROM sections
      WHERE chapter_id = $1
    `;

    const result = await pool.query(query, [chapterId]);
    return result.rows[0].count;
  }

  static async setContents(sectionId, contents) {
    // Delete existing
    await pool.query('DELETE FROM section_contents WHERE section_id = $1', [sectionId]);
    
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return [];
    }

    const values = [];
    const flatValues = [];
    let i = 1;
    
    contents.forEach((c, idx) => {
      values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
      flatValues.push(
        sectionId,
        idx + 1, // content_order
        c.title || '',
        c.type || 'Text',
        c.is_required !== undefined ? c.is_required : true,
        c.url || null
      );
    });

    const query = `
      INSERT INTO section_contents (section_id, content_order, title, type, is_required, url)
      VALUES ${values.join(', ')}
      RETURNING *
    `;

    const result = await pool.query(query, flatValues);
    return result.rows;
  }
}

module.exports = Section;
