const { pool } = require("../config/database");

// ─── Safe helpers ────────────────────────────────────────────────────────────

/**
 * Safely parse an integer from a DB count result row.
 * Returns 0 if rows is empty, field is null, or parsing fails.
 */
function safeCount(rows, field = "total") {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const raw = rows[0][field];
  if (raw === null || raw === undefined) return 0;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely parse a float (e.g. donation_amount).
 * Returns 0 if value is null, undefined, empty string, or NaN.
 */
function safeFloat(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely trim a string value; returns fallback if null/undefined.
 */
function safeStr(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

// ─── Controller ───────────────────────────────────────────────────────────────

class DashboardController {
  static async getStats(req, res) {
    try {
      // ── 1. Core user metrics ──────────────────────────────────────────────
      const usersResult          = await pool.query("SELECT COUNT(*) as total FROM users");
      const activeUsersResult    = await pool.query("SELECT COUNT(*) as total FROM users WHERE active = true");

      // ── 2. Notes & Bookmarks ──────────────────────────────────────────────
      const notesResult          = await pool.query("SELECT COUNT(*) as total FROM notes");
      const bookmarksResult      = await pool.query("SELECT COUNT(*) as total FROM bookmarks");

      // ── 3. Community / Discussions ────────────────────────────────────────
      const discussionsResult    = await pool.query("SELECT COUNT(*) as total FROM discussions");
      const activeCategoriesResult = await pool.query(
        "SELECT COUNT(DISTINCT category) as total FROM discussions WHERE category IS NOT NULL AND category != ''"
      );

      // ── 4. Content ────────────────────────────────────────────────────────
      const chaptersResult       = await pool.query("SELECT COUNT(*) as total FROM chapters");
      const practicesResult      = await pool.query("SELECT COUNT(*) as total FROM practices");

      // ── 5. Top Supporters ─────────────────────────────────────────────────
      const topSupportersResult  = await pool.query(`
        SELECT name, donation_amount, created_at
        FROM users
        WHERE donation_amount IS NOT NULL AND donation_amount > 0
        ORDER BY donation_amount DESC
        LIMIT 5
      `);

      // ── 6. Recent Supporters ──────────────────────────────────────────────
      const recentSupportersResult = await pool.query(`
        SELECT name, donation_amount, created_at
        FROM users
        WHERE donation_amount IS NOT NULL AND donation_amount > 0
        ORDER BY created_at DESC
        LIMIT 5
      `);

      // ── 7. Pending Reports ────────────────────────────────────────────────
      let pendingReportsCount = 0;
      let recentReports = [];
      try {
        const pendingResult = await pool.query(
          "SELECT COUNT(*) as total FROM reported_discussions WHERE status = 'Visible' AND ignored = false"
        );
        pendingReportsCount = safeCount(pendingResult.rows);

        const recentReportsResult = await pool.query(`
          SELECT reason, reported_user_name, discussion_message, date
          FROM reported_discussions
          WHERE status = 'Visible' AND ignored = false
          ORDER BY date DESC
          LIMIT 5
        `);
        recentReports = (recentReportsResult.rows || []).map(row => ({
          reason:            safeStr(row.reason, "Unknown"),
          reportedUserName:  safeStr(row.reported_user_name, "Unknown User"),
          discussionMessage: safeStr(row.discussion_message, ""),
          date:              row.date || null,
        }));
      } catch (_) {
        // Table may not exist yet — silently skip
      }

      // ── 8. Top Discussion Categories ──────────────────────────────────────
      let topDiscussionCategories = [];
      try {
        const topCatsResult = await pool.query(`
          SELECT category AS name, COUNT(*) AS count
          FROM discussions
          WHERE category IS NOT NULL AND category != ''
          GROUP BY category
          ORDER BY count DESC
          LIMIT 7
        `);
        topDiscussionCategories = (topCatsResult.rows || []).map(row => ({
          name:  safeStr(row.name, "Unknown"),
          count: parseInt(row.count, 10) || 0,
        }));
      } catch (_) {}

      // ── 9. Most Resonated Discussion ─────────────────────────────────────
      let mostResonatedDiscussion = null;
      try {
        const resonatedResult = await pool.query(`
          SELECT name, message, category, resonated
          FROM discussions
          WHERE resonated IS NOT NULL
          ORDER BY resonated DESC
          LIMIT 1
        `);
        if (resonatedResult.rows && resonatedResult.rows.length > 0) {
          const r = resonatedResult.rows[0];
          mostResonatedDiscussion = {
            name:      safeStr(r.name, "Anonymous"),
            message:   safeStr(r.message, ""),
            category:  safeStr(r.category, ""),
            resonated: parseInt(r.resonated, 10) || 0,
          };
        }
      } catch (_) {}

      // ── 10. Newest Discussion ─────────────────────────────────────────────
      let newestDiscussion = null;
      try {
        const newestResult = await pool.query(`
          SELECT name, message, category, created_at
          FROM discussions
          ORDER BY created_at DESC
          LIMIT 1
        `);
        if (newestResult.rows && newestResult.rows.length > 0) {
          const r = newestResult.rows[0];
          newestDiscussion = {
            name:      safeStr(r.name, "Anonymous"),
            message:   safeStr(r.message, ""),
            category:  safeStr(r.category, ""),
            createdAt: r.created_at || null,
          };
        }
      } catch (_) {}

      // ── 11. Most Reported Reason ──────────────────────────────────────────
      let mostReportedCategory = null;
      try {
        const mostReportedResult = await pool.query(`
          SELECT reason, COUNT(*) AS count
          FROM reported_discussions
          WHERE reason IS NOT NULL AND reason != ''
          GROUP BY reason
          ORDER BY count DESC
          LIMIT 1
        `);
        if (mostReportedResult.rows && mostReportedResult.rows.length > 0) {
          const r = mostReportedResult.rows[0];
          mostReportedCategory = {
            reason: safeStr(r.reason, "Unknown"),
            count:  parseInt(r.count, 10) || 0,
          };
        }
      } catch (_) {}

      // ── 12. Chapters List ─────────────────────────────────────────────────
      let chaptersList = [];
      try {
        const chaptersListResult = await pool.query(`
          SELECT id, chapter_order, title, status
          FROM chapters
          ORDER BY chapter_order ASC
        `);
        chaptersList = (chaptersListResult.rows || []).map(row => ({
          id:            row.id ?? null,
          chapterOrder:  parseInt(row.chapter_order, 10) || 0,
          title:         safeStr(row.title, "Untitled Chapter"),
          status:        safeStr(row.status, "Drafted"),
        }));
      } catch (_) {}

      // ── 13. Community Categories ──────────────────────────────────────────
      let communityCategories = [];
      try {
        const commCatResult = await pool.query(`
          SELECT name, color, count
          FROM community_categories
          ORDER BY count DESC
          LIMIT 7
        `);
        communityCategories = (commCatResult.rows || []).map(row => ({
          name:  safeStr(row.name, "Unknown"),
          color: safeStr(row.color, "#885F9A"),
          count: parseInt(row.count, 10) || 0,
        }));
      } catch (_) {}

      // ── Build response ────────────────────────────────────────────────────
      res.json({
        metrics: {
          totalUsers:                 safeCount(usersResult.rows),
          activeUsers:                safeCount(activeUsersResult.rows),
          totalNotes:                 safeCount(notesResult.rows),
          totalBookmarks:             safeCount(bookmarksResult.rows),
          totalDiscussions:           safeCount(discussionsResult.rows),
          activeDiscussionCategories: safeCount(activeCategoriesResult.rows),
          totalChapters:              safeCount(chaptersResult.rows),
          totalPractices:             safeCount(practicesResult.rows),
        },
        donations: {
          topSupporters: (topSupportersResult.rows || []).map(row => ({
            name:   safeStr(row.name, "Anonymous"),
            amount: safeFloat(row.donation_amount),
            date:   row.created_at || null,
          })),
          recentSupporters: (recentSupportersResult.rows || []).map(row => ({
            name:   safeStr(row.name, "Anonymous"),
            amount: safeFloat(row.donation_amount),
            date:   row.created_at || null,
          })),
        },
        reports: {
          pendingCount: pendingReportsCount,
          recentReports,
        },
        community: {
          topDiscussionCategories,
          mostResonatedDiscussion,
          newestDiscussion,
          mostReportedCategory,
          communityCategories,
        },
        content: {
          chaptersList,
        },
      });
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      res.status(500).json({
        message: "Failed to fetch dashboard statistics",
        metrics:   { totalUsers: 0, activeUsers: 0, totalNotes: 0, totalBookmarks: 0, totalDiscussions: 0, activeDiscussionCategories: 0, totalChapters: 0, totalPractices: 0 },
        donations: { topSupporters: [], recentSupporters: [] },
        reports:   { pendingCount: 0, recentReports: [] },
        community: { topDiscussionCategories: [], mostResonatedDiscussion: null, newestDiscussion: null, mostReportedCategory: null, communityCategories: [] },
        content:   { chaptersList: [] },
      });
    }
  }
}

module.exports = DashboardController;
