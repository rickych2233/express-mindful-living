const { pool } = require("../config/database");

// Shared query shape: each role with permissions (array of keys) + assigned_users.
const ROLE_WITH_RELATIONS_SELECT = `
  SELECT r.id, r.name, r.description, r.is_system, r.created_at,
    COALESCE(
      json_agg(DISTINCT p.key) FILTER (WHERE p.key IS NOT NULL), '[]'
    ) AS permissions,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email)
      ) FILTER (WHERE u.id IS NOT NULL), '[]'::jsonb
    ) AS assigned_users
  FROM roles r
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  LEFT JOIN user_roles ur ON r.id = ur.role_id
  LEFT JOIN users u ON ur.user_id = u.id
`;

class Role {
  static async create(roleData) {
    const { name, description = "", is_system = false, permissionKeys = [] } = roleData;

    const result = await pool.query(
      `INSERT INTO roles (name, description, is_system)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING id, name, description, is_system, created_at`,
      [name, description, is_system]
    );

    const role = result.rows[0];
    if (role && permissionKeys.length > 0) {
      await Role.setPermissions(role.id, permissionKeys);
    }
    return role ? Role.findById(role.id) : null;
  }

  static async findAll() {
    const query = `
      ${ROLE_WITH_RELATIONS_SELECT}
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.id ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      ${ROLE_WITH_RELATIONS_SELECT}
      WHERE r.id = $1
      GROUP BY r.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByName(name) {
    const query = `SELECT id, name, description, is_system FROM roles WHERE name = $1`;
    const result = await pool.query(query, [name]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const { name, description } = updates;
    const result = await pool.query(
      `UPDATE roles
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING id, name, description, is_system, created_at`,
      [name !== undefined ? name : null, description !== undefined ? description : null, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      `DELETE FROM roles WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0];
  }

  // Full replace of a role's permissions by key. Transaction-safe.
  static async setPermissions(roleId, permissionKeys = []) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
      for (const key of permissionKeys) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT $1, id FROM permissions WHERE key = $2
           ON CONFLICT DO NOTHING`,
          [roleId, key]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return Role.findById(roleId);
  }

  // Full replace of a role's users. Transaction-safe.
  static async setUsers(roleId, userIds = []) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM user_roles WHERE role_id = $1", [roleId]);
      for (const userId of userIds) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [userId, roleId]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return Role.findById(roleId);
  }

  static async addUsers(roleId, userIds = []) {
    for (const userId of userIds) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, roleId]
      );
    }
    return Role.findById(roleId);
  }

  static async removeUser(roleId, userId) {
    await pool.query(
      `DELETE FROM user_roles WHERE role_id = $1 AND user_id = $2`,
      [roleId, userId]
    );
    return Role.findById(roleId);
  }
}

module.exports = Role;
