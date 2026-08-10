const { pool } = require("../config/database");

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      donation_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS donation_amount NUMERIC(12,2) NOT NULL DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chapters (
      id SERIAL PRIMARY KEY,
      chapter_order INTEGER NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Published',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE chapters
    ADD COLUMN IF NOT EXISTS thumbnail TEXT DEFAULT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sections (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      section_order INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      type VARCHAR(50) NOT NULL DEFAULT 'Text',
      status VARCHAR(50) NOT NULL DEFAULT 'Drafted',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chapter_id, section_order)
    )
  `);

  // Patch: Add content column to sections if it doesn't exist
  await pool.query(`
    ALTER TABLE sections ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
  `).catch(err => {
    // Ignore error if column already exists or syntax not supported
    console.log("Note: content column might already exist.");
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS section_contents (
      id SERIAL PRIMARY KEY,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      content_order INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'Text',
      is_required BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS practices (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      goal VARCHAR(255) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      sessions INTEGER NOT NULL DEFAULT 1,
      category VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Drafted',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE practices
    ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS thumbnail TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS sessions_data JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS related_chapters JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      caption TEXT,
      category VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Drafted',
      thumbnail JSONB,
      content_type VARCHAR(50) NOT NULL DEFAULT 'Text',
      content_texts JSONB,
      content_files JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS discussions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      avatar VARCHAR(255),
      message TEXT NOT NULL,
      date VARCHAR(50),
      category VARCHAR(100),
      category_color VARCHAR(20),
      resonated VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_files (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      author VARCHAR(255),
      format VARCHAR(50),
      category VARCHAR(100),
      date_added VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Drafted',
      color VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE media_files
    ADD COLUMN IF NOT EXISTS short_quote TEXT,
    ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
    ADD COLUMN IF NOT EXISTS corpus_connection TEXT,
    ADD COLUMN IF NOT EXISTS related_chapters JSONB,
    ADD COLUMN IF NOT EXISTS critical_note TEXT,
    ADD COLUMN IF NOT EXISTS integration_question TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail JSONB,
    ADD COLUMN IF NOT EXISTS content_file JSONB
  `);

  // ===== Notes & Bookmarks =====
  await pool.query(`
    CREATE TABLE IF NOT EXISTS note_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(50) NOT NULL,
      amount VARCHAR(50) DEFAULT '0 discussions',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      avatar VARCHAR(255),
      date VARCHAR(50),
      chapter VARCHAR(100),
      section VARCHAR(100),
      note TEXT,
      highlighted_passage TEXT,
      categories JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      sentence TEXT,
      chapter VARCHAR(100),
      section VARCHAR(100),
      date VARCHAR(50),
      amount INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS practice_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Alter table to add order_index if it doesn't exist (for existing tables)
  try {
    await pool.query(`ALTER TABLE practice_categories ADD COLUMN order_index INT DEFAULT 0`);
  } catch (err) {
    // Column might already exist, ignore error
  }

  // Insert default categories if none exist
  await pool.query(`
    INSERT INTO practice_categories (name)
    SELECT * FROM unnest(ARRAY['Breathwork', 'Cardiac Coherence', 'Mindfulness', 'Focus', 'Grounding', 'Sleep', 'Nervous System Reset', 'Energy / Vitality'])
    WHERE NOT EXISTS (SELECT 1 FROM practice_categories)
    ON CONFLICT DO NOTHING
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_system BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      label VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      section VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id)
    )
  `);

  // ----- Seed permission catalog (idempotent, append-only) -----
  const PERMISSION_CATALOG = [
    ["view-dashboard", "View Dashboard", "", "dashboard"],
    ["view-chapter", "View Chapter", "", "chapter"],
    ["edit-chapters", "Add / Edit Chapters & Sections", "", "chapter"],
    ["delete-chapters", "Delete Chapters & Sections", "", "chapter"],
    ["view-practice", "View Practice Management", "", "practice"],
    ["edit-practice", "Add / Edit Practice, Sessions & Categories", "", "practice"],
    ["delete-practice", "Delete Practice, Sessions & Categories", "", "practice"],
    ["edit-resources", "Add / Edit Resources", "", "resources"],
    ["delete-resources", "Delete Resources", "", "resources"],
    ["approve-suggestions", "Approve/Reject User Suggestions", "", "resources"],
    ["download-media", "Download Media", "", "media-library"],
    ["delete-media", "Delete Media", "", "media-library"],
    ["view-community", "View Discussion, Reported & Categories", "", "community"],
    ["edit-community", "Add / Edit Categories", "", "community"],
    ["delete-community", "Delete Categories", "", "community"],
    ["view-notes", "View Notes, Bookmarks & Categories", "", "notes"],
    ["edit-notes", "Add / Edit Categories", "", "notes"],
    ["delete-notes", "Delete Categories", "", "notes"],
    ["view-users", "View User Details", "", "user"],
    ["mark-user-inactive", "Mark User as Inactive", "Soft-disable user access without deleting data", "user"],
    ["view-roles", "View Roles", "", "roles"],
    ["edit-roles", "Create / Edit Roles", "", "roles"],
    ["delete-roles", "Delete Roles", "", "roles"],
  ];

  for (const [key, label, description, section] of PERMISSION_CATALOG) {
    await pool.query(
      `INSERT INTO permissions (key, label, description, section)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING`,
      [key, label, description, section]
    );
  }

  // ----- Seed default roles (idempotent; perms only seeded on first creation) -----
  const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map(([key]) => key);
  const DEFAULT_ROLES = [
    { name: "Super Admin", description: "Full access to all modules", isSystem: true, perms: "ALL" },
    {
      name: "Content Editor",
      description: "Manage chapters & practices",
      isSystem: true,
      perms: ["view-dashboard", "view-chapter", "edit-chapters", "view-practice", "edit-practice"],
    },
    {
      name: "Viewer",
      description: "Read-only access",
      isSystem: true,
      perms: ["view-dashboard", "view-chapter", "view-practice", "view-users", "view-roles"],
    },
    {
      name: "Moderator",
      description: "Manage community",
      isSystem: true,
      perms: ["view-dashboard", "view-community", "edit-community", "delete-community", "view-notes", "edit-notes"],
    },
  ];

  for (const role of DEFAULT_ROLES) {
    const inserted = await pool.query(
      `INSERT INTO roles (name, description, is_system)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [role.name, role.description, role.isSystem]
    );

    if (inserted.rows.length > 0) {
      const roleId = inserted.rows[0].id;
      const keys = role.perms === "ALL" ? ALL_PERMISSION_KEYS : role.perms;
      for (const key of keys) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT $1, id FROM permissions WHERE key = $2
           ON CONFLICT DO NOTHING`,
          [roleId, key]
        );
      }
    }
  }
}

module.exports = { initDatabase };