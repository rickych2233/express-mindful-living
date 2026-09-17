const { pool } = require("../config/database");

class ReportedDiscussion {
  static async findAll() {
    const query = "SELECT * FROM reported_discussions ORDER BY id ASC";
    const { rows } = await pool.query(query);
    return rows;
  }

  static async create(data) {
    const { discussion_message, date, reason, reported_user_name, reported_user_avatar, reported_by_name, reported_by_avatar, status, ignored } = data;
    const query = "INSERT INTO reported_discussions (discussion_message, date, reason, reported_user_name, reported_user_avatar, reported_by_name, reported_by_avatar, status, ignored) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *";
    const { rows } = await pool.query(query, [discussion_message, date, reason, reported_user_name, reported_user_avatar, reported_by_name, reported_by_avatar, status || 'Visible', ignored || false]);
    return rows[0];
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

    const query = `UPDATE reported_discussions SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = "DELETE FROM reported_discussions WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
}

module.exports = ReportedDiscussion;
