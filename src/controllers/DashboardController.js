const { pool } = require("../config/database");

class DashboardController {
  static async getStats(req, res) {
    try {
      // 1. User Metrics
      const usersResult = await pool.query("SELECT COUNT(*) as total FROM users");
      const activeUsersResult = await pool.query("SELECT COUNT(*) as total FROM users WHERE active = true");
      
      // 2. Notes & Bookmarks
      const notesResult = await pool.query("SELECT COUNT(*) as total FROM notes");
      const bookmarksResult = await pool.query("SELECT COUNT(*) as total FROM bookmarks");
      
      // 3. Community / Discussions
      const discussionsResult = await pool.query("SELECT COUNT(*) as total FROM discussions");
      const activeCategoriesResult = await pool.query("SELECT COUNT(DISTINCT category) as total FROM discussions WHERE category IS NOT NULL");
      
      // 4. Content Metrics
      const chaptersResult = await pool.query("SELECT COUNT(*) as total FROM chapters");
      const practicesResult = await pool.query("SELECT COUNT(*) as total FROM practices");
      
      // 5. Donations / Top Supporters
      const topSupportersResult = await pool.query(`
        SELECT name, donation_amount, created_at 
        FROM users 
        WHERE donation_amount > 0 
        ORDER BY donation_amount DESC 
        LIMIT 5
      `);

      // 6. Recent Supporters
      const recentSupportersResult = await pool.query(`
        SELECT name, donation_amount, created_at 
        FROM users 
        WHERE donation_amount > 0 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      res.json({
        metrics: {
          totalUsers: parseInt(usersResult.rows[0].total) || 0,
          activeUsers: parseInt(activeUsersResult.rows[0].total) || 0,
          totalNotes: parseInt(notesResult.rows[0].total) || 0,
          totalBookmarks: parseInt(bookmarksResult.rows[0].total) || 0,
          totalDiscussions: parseInt(discussionsResult.rows[0].total) || 0,
          activeDiscussionCategories: parseInt(activeCategoriesResult.rows[0].total) || 0,
          totalChapters: parseInt(chaptersResult.rows[0].total) || 0,
          totalPractices: parseInt(practicesResult.rows[0].total) || 0,
        },
        donations: {
          topSupporters: topSupportersResult.rows.map(row => ({
            name: row.name,
            amount: parseFloat(row.donation_amount),
            date: row.created_at
          })),
          recentSupporters: recentSupportersResult.rows.map(row => ({
            name: row.name,
            amount: parseFloat(row.donation_amount),
            date: row.created_at
          }))
        }
      });
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  }
}

module.exports = DashboardController;
