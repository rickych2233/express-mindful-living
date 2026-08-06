const { pool } = require("../config/database");

class Permission {
  // Returns [{ section, items: [{ key, label, description }] }] grouped by section.
  static async findAllGroupedBySection() {
    const result = await pool.query(
      `SELECT key, label, description, section FROM permissions ORDER BY id ASC`
    );

    const map = new Map();
    for (const row of result.rows) {
      if (!map.has(row.section)) map.set(row.section, []);
      map.get(row.section).push({
        key: row.key,
        label: row.label,
        description: row.description,
      });
    }

    return Array.from(map, ([section, items]) => ({ section, items }));
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT key, label, description, section FROM permissions ORDER BY id ASC`
    );
    return result.rows;
  }
}

module.exports = Permission;
