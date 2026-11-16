const { pool } = require("../config/database");

class DiscussionReply {
  static async findAll(discussionId = null) {
    let query = "SELECT * FROM discussion_replies";
    const values = [];
    if (discussionId) {
      query += " WHERE discussion_id = $1";
      values.push(discussionId);
    }
    query += " ORDER BY id ASC";
    const { rows } = await pool.query(query, values);
    return rows;
  }

  static async create(data) {
    const { discussion_id, name, avatar, message, date, reported, status, user_id } = data;
    const query = "INSERT INTO discussion_replies (discussion_id, name, avatar, message, date, reported, status, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *";
    const { rows } = await pool.query(query, [discussion_id, name, avatar, message, date, reported, status || 'Visible', user_id]);
    return rows[0];
  }

  static async update(id, data) {
    // Column whitelist — never interpolate raw body keys into SQL.
    const allowed = ["message", "status"];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] === undefined) continue;
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (fields.length === 0) return null;
    values.push(id);

    const query = `UPDATE discussion_replies SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = "DELETE FROM discussion_replies WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
}

module.exports = DiscussionReply;
