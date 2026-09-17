const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const INITIAL_CATEGORIES = [
  { id: 1, name: "Awareness", color: "yellow", count: 2 },
  { id: 2, name: "Key Concept", color: "purple", count: 1 },
  { id: 3, name: "Personal Reflection", color: "green", count: 2 },
  { id: 4, name: "Scientific Evidence", color: "pink", count: 2 },
  { id: 5, name: "Question", color: "yellow", count: 2 },
  { id: 6, name: "Mindful Eating", color: "red", count: 0 }
];

const MOCK_REPLIES = [
  {
    name: "Andi Kurniawan",
    avatar: "https://i.pravatar.cc/150?u=andi",
    message: "How do we silence the ego in daily life? I've been trying to apply Chapter 3 but I keep getting pulled back into reactive thinking. Has anyone found a practical method that works alongside the audio sessions?",
    date: "21 Feb 2026 • 09:05",
    reported: null,
    status: "Visible"
  },
  {
    name: "Sarah Williams",
    avatar: "https://i.pravatar.cc/150?u=sarah",
    message: "This is a reply that has been reported by users. I don't agree with anything said in this discussion.",
    date: "20 Feb 2026 • 14:20",
    reported: "Harassment & Harmful Behavior",
    status: "Hidden"
  },
  {
    name: "Budi Santoso",
    avatar: "https://i.pravatar.cc/150?u=budi",
    message: "I find that just taking 5 deep breaths before responding to an email helps me detach from the ego's immediate reaction.",
    date: "19 Feb 2026 • 11:30",
    reported: null,
    status: "Visible"
  }
];

const MOCK_REPORTED = [
  {
    discussion_message: "You clearly haven't understood anything if you beli...",
    date: "21 Feb 2026 • 09:14",
    reason: "Harassment & Harmful Behavior",
    reported_user_name: "Marie Laura",
    reported_user_avatar: "https://i.pravatar.cc/150?u=marie",
    reported_by_name: "Arlene McCoy",
    reported_by_avatar: "https://i.pravatar.cc/150?u=arlene",
    status: "Visible",
    ignored: false
  },
  {
    discussion_message: "Check out my meditation app - link in bio! 100% f...",
    date: "21 Feb 2026 • 09:14",
    reason: "Irrelevant to topic",
    reported_user_name: "Andi Kim",
    reported_user_avatar: "https://i.pravatar.cc/150?u=andi",
    reported_by_name: "David Lade",
    reported_by_avatar: "https://i.pravatar.cc/150?u=david",
    status: "Visible",
    ignored: false
  },
  {
    discussion_message: "I think the audio quality in chapter 2 is really b...",
    date: "21 Feb 2026 • 09:14",
    reason: "Spam or Misleading",
    reported_user_name: "Jane Smith",
    reported_user_avatar: "https://i.pravatar.cc/150?u=jane",
    reported_by_name: "Alex Johnson",
    reported_by_avatar: "https://i.pravatar.cc/150?u=alex",
    status: "Hidden",
    ignored: false
  }
];

async function setup() {
  try {
    console.log("Creating tables...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50) NOT NULL,
        count INTEGER DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS discussion_replies (
        id SERIAL PRIMARY KEY,
        discussion_id INTEGER,
        name VARCHAR(255),
        avatar VARCHAR(255),
        message TEXT,
        date VARCHAR(255),
        reported VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Visible'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reported_discussions (
        id SERIAL PRIMARY KEY,
        discussion_message TEXT,
        date VARCHAR(255),
        reason VARCHAR(255),
        reported_user_name VARCHAR(255),
        reported_user_avatar VARCHAR(255),
        reported_by_name VARCHAR(255),
        reported_by_avatar VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Visible',
        ignored BOOLEAN DEFAULT false
      );
    `);

    // Check if categories are empty
    const { rows: categories } = await pool.query('SELECT * FROM community_categories');
    if (categories.length === 0) {
      console.log("Seeding categories...");
      for (const cat of INITIAL_CATEGORIES) {
        await pool.query(
          'INSERT INTO community_categories (name, color, count) VALUES ($1, $2, $3)',
          [cat.name, cat.color, cat.count]
        );
      }
    }

    // Check if replies are empty
    const { rows: replies } = await pool.query('SELECT * FROM discussion_replies');
    if (replies.length === 0) {
      console.log("Seeding replies...");
      for (const rep of MOCK_REPLIES) {
        await pool.query(
          'INSERT INTO discussion_replies (discussion_id, name, avatar, message, date, reported, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [null, rep.name, rep.avatar, rep.message, rep.date, rep.reported, rep.status]
        );
      }
    }

    // Check if reported are empty
    const { rows: reported } = await pool.query('SELECT * FROM reported_discussions');
    if (reported.length === 0) {
      console.log("Seeding reported discussions...");
      for (const rep of MOCK_REPORTED) {
        await pool.query(
          'INSERT INTO reported_discussions (discussion_message, date, reason, reported_user_name, reported_user_avatar, reported_by_name, reported_by_avatar, status, ignored) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [rep.discussion_message, rep.date, rep.reason, rep.reported_user_name, rep.reported_user_avatar, rep.reported_by_name, rep.reported_by_avatar, rep.status, rep.ignored]
        );
      }
    }

    console.log("Community tables setup complete!");
  } catch (error) {
    console.error("Error setting up database:", error);
  } finally {
    await pool.end();
  }
}

setup();
