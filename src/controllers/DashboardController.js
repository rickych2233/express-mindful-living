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

      // ── 6.5 Donation Summary ──────────────────────────────────────────────
      let totalContributions = null;
      let highestContribution = null;
      let averageDonation = null;
      const recurringDonors = null; // No recurring-payment history is stored.
      try {
        const donationSummaryResult = await pool.query(`
          SELECT 
            SUM(donation_amount) as total,
            MAX(donation_amount) as highest,
            AVG(donation_amount) as average
          FROM users
          WHERE donation_amount IS NOT NULL AND donation_amount > 0
        `);
        if (donationSummaryResult.rows && donationSummaryResult.rows.length > 0) {
           const r = donationSummaryResult.rows[0];
           totalContributions = safeFloat(r.total);
           highestContribution = safeFloat(r.highest);
           averageDonation = safeFloat(r.average);
        }
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

      // ── 6.6 Donations in the last 30 days ─────────────────────────────────
      const recentDonations30d = null; // Account creation dates are not payment dates.
      // ── 7. Pending Reports ────────────────────────────────────────────────
      let pendingReportsCount = null;
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
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

      // ── 8. Top Discussion Categories ──────────────────────────────────────
      let topDiscussionCategories = [];
      try {
        const topCatsResult = await pool.query(`
          SELECT category AS name, COUNT(*) AS count
          FROM discussions
          WHERE category IS NOT NULL AND category != ''
          GROUP BY category
          ORDER BY count DESC, name ASC
          LIMIT 7
        `);
        topDiscussionCategories = (topCatsResult.rows || []).map(row => ({
          name:  safeStr(row.name, "Unknown"),
          count: parseInt(row.count, 10) || 0,
        }));
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

      // ── 9. Most Resonated Discussion ─────────────────────────────────────
      let mostResonatedDiscussion = null;
      try {
        const resonatedResult = await pool.query(`
          SELECT name, message, category, resonated
          FROM discussions
          WHERE resonated IS NOT NULL
          ORDER BY CASE WHEN TRIM(resonated) ~ '^[0-9]+$' THEN TRIM(resonated)::numeric ELSE 0 END DESC, id DESC
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
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

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
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

      // ── 11. Most Reported Reason ──────────────────────────────────────────
      let mostReportedCategory = null;
      try {
        const mostReportedResult = await pool.query(`
          SELECT reason, COUNT(*) AS count
          FROM reported_discussions
          WHERE reason IS NOT NULL AND reason != '' AND status = 'Visible' AND ignored = false
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
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

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
          title:         row.title || "Untitled Chapter",
          status:        safeStr(row.status, "Drafted"),
        }));
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

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
      } catch (error) {
        if (error.code !== '42P01') throw error;
      }

      // Time-window counts come from actual creation timestamps.
      const [notePeriods, bookmarkPeriods, tagged, noted, questioned, resonatedCategory, registrations] = await Promise.all([
        pool.query(`SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS recent7,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days'
            AND created_at < NOW() - INTERVAL '7 days') AS previous7,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS recent30 FROM notes`),
        pool.query(`SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS recent7,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days'
            AND created_at < NOW() - INTERVAL '7 days') AS previous7 FROM bookmarks`),
        pool.query(`SELECT tag->>'name' AS name, COUNT(DISTINCT notes.id) AS count
          FROM notes CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(categories) = 'array' THEN categories ELSE '[]'::jsonb END
          ) AS tag WHERE NULLIF(TRIM(tag->>'name'), '') IS NOT NULL
          GROUP BY tag->>'name' ORDER BY count DESC, name ASC LIMIT 1`),
        pool.query(`SELECT chapter, section, COUNT(*) AS count FROM notes
          WHERE NULLIF(TRIM(chapter), '') IS NOT NULL
          GROUP BY chapter, section ORDER BY count DESC, chapter, section LIMIT 1`),
        pool.query(`SELECT chapter, section, COUNT(*) AS count FROM notes
          WHERE NULLIF(TRIM(chapter), '') IS NOT NULL AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(categories) = 'array'
              THEN categories ELSE '[]'::jsonb END) AS tag WHERE LOWER(tag->>'name') = 'question')
          GROUP BY chapter, section ORDER BY count DESC, chapter, section LIMIT 1`),
        pool.query(`SELECT category AS name, SUM(CASE WHEN TRIM(resonated) ~ '^[0-9]+$'
          THEN TRIM(resonated)::numeric ELSE 0 END) AS count FROM discussions
          WHERE NULLIF(TRIM(category), '') IS NOT NULL GROUP BY category
          HAVING SUM(CASE WHEN TRIM(resonated) ~ '^[0-9]+$' THEN TRIM(resonated)::numeric ELSE 0 END) > 0
          ORDER BY count DESC, name ASC LIMIT 1`),
        pool.query(`WITH ranges AS (
          SELECT 'weekly' AS range, 'day' AS unit, INTERVAL '6 days' AS lookback, INTERVAL '1 day' AS step
          UNION ALL SELECT 'monthly', 'week', INTERVAL '3 weeks', INTERVAL '1 week'
          UNION ALL SELECT 'yearly', 'month', INTERVAL '11 months', INTERVAL '1 month'
        ), buckets AS (
          SELECT range, unit, step, generate_series(date_trunc(unit, NOW()) - lookback,
            date_trunc(unit, NOW()), step) AS bucket FROM ranges
        ) SELECT range, bucket,
          CASE WHEN range = 'yearly' THEN to_char(bucket, 'Mon') ELSE to_char(bucket, 'DD Mon') END AS label,
          COUNT(users.id) AS count FROM buckets LEFT JOIN users
            ON users.created_at >= bucket AND users.created_at < bucket + step
          GROUP BY range, bucket ORDER BY range, bucket`),
      ]);
      const activity = {};
      for (const range of ['weekly', 'monthly', 'yearly']) {
        const rows = registrations.rows.filter(row => row.range === range);
        activity[range] = { labels: rows.map(row => row.label), primaryValues: null,
          secondaryValues: rows.map(row => Number(row.count)) };
      }
      const countRow = result => result.rows[0]
        ? { ...result.rows[0], count: Number(result.rows[0].count) } : null;

      // ── Build response ────────────────────────────────────────────────────
      res.json({
        activity,
        appUsage: null,
        notes: {
          recent7Days: safeCount(notePeriods.rows, 'recent7'),
          previous7Days: safeCount(notePeriods.rows, 'previous7'),
          bookmarksRecent7Days: safeCount(bookmarkPeriods.rows, 'recent7'),
          bookmarksPrevious7Days: safeCount(bookmarkPeriods.rows, 'previous7'),
          mostTaggedCategory: countRow(tagged),
        },
        metrics: {
          weeklyActiveUsers: null, returningUsers: null, highestFriction: null,
          notesLast30Days: safeCount(notePeriods.rows, 'recent30'),
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
          summary: {
            total: totalContributions,
            highest: highestContribution,
            average: averageDonation,
            recurring: recurringDonors,
            recent30Days: recentDonations30d
          },
          topSupporters: (topSupportersResult.rows || []).map(row => ({
            name:   safeStr(row.name, "Anonymous"),
            amount: safeFloat(row.donation_amount),
            joinedAt: row.created_at || null,
            date: null, // No transaction timestamp is stored.
          })),
          recentSupporters: (recentSupportersResult.rows || []).map(row => ({
            name:   safeStr(row.name, "Anonymous"),
            amount: safeFloat(row.donation_amount),
            joinedAt: row.created_at || null,
            date: null, // No transaction timestamp is stored.
          })),
        },
        reports: {
          pendingCount: pendingReportsCount,
          recentReports,
        },
        community: {
          topDiscussionCategories,
          mostResonatedCategory: countRow(resonatedCategory),
          mostResonatedDiscussion,
          newestDiscussion,
          mostReportedCategory,
          communityCategories,
        },
        content: {
          chaptersList,
          mostNoted: countRow(noted), mostQuestioned: countRow(questioned),
          topPractice: null, topResource: null, mostRevisited: null,
        },
      });
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      res.status(500).json({
        message: "Failed to fetch dashboard statistics",
      });
    }
  }
}

module.exports = DashboardController;
