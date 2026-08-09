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
    const { name, author, format, category, date_added, status, color, shortQuote, whyItMatters, corpusConnection, relatedChapters, criticalNote, integrationQuestion, thumbnail, contentFile } = data;
    const result = await pool.query(
      `INSERT INTO media_files (name, author, format, category, date_added, status, color, short_quote, why_it_matters, corpus_connection, related_chapters, critical_note, integration_question, thumbnail, content_file)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        name || null,
        author || null,
        format || null,
        category || null,
        date_added || null,
        status || null,
        color || null,
        shortQuote || null,
        whyItMatters || null,
        corpusConnection || null,
        relatedChapters ? JSON.stringify(relatedChapters) : null,
        criticalNote || null,
        integrationQuestion || null,
        thumbnail ? JSON.stringify(thumbnail) : null,
        contentFile ? JSON.stringify(contentFile) : null
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    const keyMap = {
      name: "name", author: "author", format: "format", category: "category",
      date_added: "date_added", status: "status", color: "color",
      shortQuote: "short_quote", whyItMatters: "why_it_matters",
      corpusConnection: "corpus_connection", criticalNote: "critical_note",
      integrationQuestion: "integration_question"
    };

    for (const key in data) {
      if (keyMap[key] && data[key] !== undefined) {
        fields.push(`${keyMap[key]} = $${idx}`);
        values.push(data[key]);
        idx++;
      } else if (key === "relatedChapters" && data[key] !== undefined) {
        fields.push(`related_chapters = $${idx}`);
        values.push(data[key] ? JSON.stringify(data[key]) : null);
        idx++;
      } else if (key === "thumbnail" && data[key] !== undefined) {
        fields.push(`thumbnail = $${idx}`);
        values.push(data[key] ? JSON.stringify(data[key]) : null);
        idx++;
      } else if (key === "contentFile" && data[key] !== undefined) {
        fields.push(`content_file = $${idx}`);
        values.push(data[key] ? JSON.stringify(data[key]) : null);
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
