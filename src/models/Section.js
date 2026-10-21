const { pool } = require("../config/database");

class Section {
  static async create(sectionData, db = pool) {
    const { chapter_id, title, description = "", content = null, type = "Text", status = "Drafted" } = sectionData;

    const getNextOrderQuery = `
      SELECT COALESCE(MAX(section_order), 0) + 1 as next_order
      FROM sections
      WHERE chapter_id = $1
    `;

    const orderResult = await db.query(getNextOrderQuery, [chapter_id]);
    const nextOrder = orderResult.rows[0].next_order;

    const query = `
      INSERT INTO sections (chapter_id, section_order, title, description, content, type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await db.query(query, [chapter_id, nextOrder, title, description, content, type, status]);
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
                   'content_order', sc.content_order,
                   'duration', sc.duration,
                   'instructions', sc.instructions
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

  static async update(id, sectionData, db = pool) {
    const { title, description, content = null, type, status } = sectionData;

    const query = `
      UPDATE sections
      SET title = $1, description = $2, content = $3, type = $4, status = $5
      WHERE id = $6
      RETURNING *
    `;

    const result = await db.query(query, [title, description, content, type, status, id]);
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

  static async setContents(sectionId, contents, db) {
    if (!db) return Section.transaction(client => Section.setContents(sectionId, contents, client));
    // Delete existing
    await db.query('DELETE FROM section_contents WHERE section_id = $1', [sectionId]);
    
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return [];
    }

    const values = [];
    const flatValues = [];
    let i = 1;
    
    contents.forEach((c, idx) => {
      values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
      flatValues.push(
        sectionId,
        idx + 1, // content_order
        c.title || '',
        c.type || 'Text',
        c.is_required !== undefined ? c.is_required : true,
        c.url || null,
        c.duration || null,
        c.instructions || null
      );
    });

    const query = `
      INSERT INTO section_contents (section_id, content_order, title, type, is_required, url, duration, instructions)
      VALUES ${values.join(', ')}
      RETURNING *
    `;

    const result = await db.query(query, flatValues);
    return result.rows;
  }

  static async transaction(work) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async saveWithContents(id, data, contents, chapterId, db) {
    const { validateSectionContent } = require('../utils/sectionContent');
    const work = async client => {
      if (id) {
        const existing = await client.query(
          'SELECT id FROM sections WHERE id = $1 AND chapter_id = $2 FOR UPDATE', [id, chapterId]
        );
        if (!existing.rows.length) {
          const error = new Error('section tidak ditemukan');
          error.status = 404;
          throw error;
        }
      }
      let media = contents;
      if (!Array.isArray(media)) {
        const existingMedia = id ? await client.query(
          'SELECT * FROM section_contents WHERE section_id = $1 ORDER BY content_order ASC', [id]
        ) : { rows: [] };
        media = existingMedia.rows;
      }
      validateSectionContent(data.content, media);
      const section = id ? await Section.update(id, data, client) : await Section.create(data, client);
      section.contents = Array.isArray(contents)
        ? await Section.setContents(section.id, contents, client) : media;
      return section;
    };
    return db ? work(db) : Section.transaction(work);
  }

  static async reorder(sectionIds) {
    if (!sectionIds || sectionIds.length === 0) return true;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Step 1: Set to negative to avoid UNIQUE constraint violations during swap
      for (let i = 0; i < sectionIds.length; i++) {
        await client.query(
          "UPDATE sections SET section_order = $1 WHERE id = $2",
          [-(i + 1), sectionIds[i]]
        );
      }
      // Step 2: Set to the actual positive sequence
      for (let i = 0; i < sectionIds.length; i++) {
        await client.query(
          "UPDATE sections SET section_order = $1 WHERE id = $2",
          [i + 1, sectionIds[i]]
        );
      }
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Section;
