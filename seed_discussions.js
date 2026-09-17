require("dotenv").config();

const { pool } = require('./src/config/database');

async function seedDiscussions() {
  const discussions = [
    {
      name: 'Alex Johnson',
      avatar: 'https://i.pravatar.cc/150?img=47',
      message: 'Does anyone have tips for staying mindful during a busy workday?',
      date: '14 Sep 2026',
      resonated: '24',
      category: 'Mindful Practices',
      category_color: '#F59E0B',
      status: 'Visible'
    },
    {
      name: 'Sarah Williams',
      avatar: 'https://i.pravatar.cc/150?img=47',
      message: 'I tried the new body scan practice and it really helped my sleep.',
      date: '12 Sep 2026',
      resonated: '45',
      category: 'Daily Reflection',
      category_color: '#10B981',
      status: 'Visible'
    },
    {
      name: 'Michael Chen',
      avatar: 'https://i.pravatar.cc/150?img=68',
      message: 'How often should I practice meditation for beginners?',
      date: '10 Sep 2026',
      resonated: '12',
      category: 'Beginner Tips',
      category_color: '#3B82F6',
      status: 'Hidden'
    }
  ];

  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM discussions');
    if (parseInt(rows[0].count) === 0) {
      console.log('Seeding discussions...');
      for (const d of discussions) {
        await pool.query(
          `INSERT INTO discussions (name, avatar, message, date, category, category_color, resonated, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [d.name, d.avatar, d.message, d.date, d.category, d.category_color, d.resonated, d.status]
        );
      }
      console.log('Seeded 3 discussions successfully!');
    } else {
      console.log('Discussions table is not empty. Skipping seed.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

seedDiscussions();
