const { pool } = require("../config/database");

class User {
  static async create(userData) {
    const { name, email, password_hash } = userData;
    
    const query = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, donation_amount, created_at
    `;
    
    const result = await pool.query(query, [name, email, password_hash]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT id, name, email, donation_amount, active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT id, name, email, donation_amount, active, created_at 
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT * FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async update(id, userData) {
    const { name, email, password_hash, active } = userData;
    
    let query, params;
    
    if (password_hash) {
      query = `
        UPDATE users 
        SET name = $1, email = $2, password_hash = $3, active = $4
        WHERE id = $5
        RETURNING id, name, email, donation_amount, active, created_at
      `;
      params = [name, email, password_hash, active !== undefined ? active : true, id];
    } else {
      query = `
        UPDATE users 
        SET name = $1, email = $2, active = $3
        WHERE id = $4
        RETURNING id, name, email, donation_amount, active, created_at
      `;
      params = [name, email, active !== undefined ? active : true, id];
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM users 
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async toggleActive(id) {
    const query = `
      UPDATE users 
      SET active = NOT active
      WHERE id = $1
      RETURNING id, name, email, donation_amount, active, created_at
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async setActive(id, active) {
    const query = `
      UPDATE users 
      SET active = $1
      WHERE id = $2
      RETURNING id, name, email, donation_amount, active, created_at
    `;
    
    const result = await pool.query(query, [active, id]);
    return result.rows[0];
  }
}

module.exports = User;