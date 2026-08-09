const { pool } = require("../config/database");

const getNotes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notes ORDER BY id ASC");
    if (result.rows.length === 0) {
      // Mock data insertion for notes
      const mockNotes = [
        {
          name: "Marie Laura", avatar: "https://i.pravatar.cc/150?img=1", date: "21 Feb 2026",
          chapter: "Chapter 1", section: "Section 2", note: "\"This idea resonates with my current work situation. I often resist change because I fear losing stability, but this section helped me see adaptability differently.\"",
          highlighted_passage: "Embracing Change: The Need for Adaptability and Innovation in Today's World",
          categories: JSON.stringify([{ name: "Personal Reflection", color: "green" }, { name: "Awareness", color: "orange" }])
        },
        {
          name: "Marcus Chen", avatar: "https://i.pravatar.cc/150?img=11", date: "21 Feb 2026",
          chapter: "Chapter 5", section: "Section 2", note: "\"I'm not sure I fully understand the distinction here between active observing and merely observing reality...\"",
          highlighted_passage: "The Power of Mindfulness: Embracing the Present Moment",
          categories: JSON.stringify([{ name: "Question", color: "orange" }, { name: "Key Concept", color: "purple" }])
        },
        {
          name: "Elena Rodriguez", avatar: "https://i.pravatar.cc/150?img=5", date: "21 Feb 2026",
          chapter: "Chapter 3", section: "Section 1", note: "\"This concept reminds me of a recurring pattern where unconscious decisions emerge from unexamined habits.\"",
          highlighted_passage: "The Power of Mindful Eating: A 10-Minute Transformation",
          categories: JSON.stringify([{ name: "Awareness", color: "orange" }, { name: "Scientific Evidence", color: "purple" }])
        }
      ];
      
      for (const n of mockNotes) {
        await pool.query(
          "INSERT INTO notes (name, avatar, date, chapter, section, note, highlighted_passage, categories) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [n.name, n.avatar, n.date, n.chapter, n.section, n.note, n.highlighted_passage, n.categories]
        );
      }
      const newResult = await pool.query("SELECT * FROM notes ORDER BY id ASC");
      return res.json(newResult.rows);
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBookmarks = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM bookmarks ORDER BY id ASC");
    if (result.rows.length === 0) {
      const mockBookmarks = [
        { sentence: "In a world that constantly evolves, cultivating a mindset of adaptability and innovation is essential for personal growth and harmony.", chapter: "Chapter 1", section: "Section 2", date: "21 Feb 2026", amount: 125 },
        { sentence: "Finding peace within chaos is the true essence of mindfulness.", chapter: "Chapter 1", section: "Section 1", date: "21 Feb 2026", amount: 524 },
        { sentence: "Finding tranquility in the chaos of life can be achieved through simple moments of reflection.", chapter: "Chapter 2", section: "Section 3", date: "21 Feb 2026", amount: 47 }
      ];
      for (const b of mockBookmarks) {
        await pool.query(
          "INSERT INTO bookmarks (sentence, chapter, section, date, amount) VALUES ($1, $2, $3, $4, $5)",
          [b.sentence, b.chapter, b.section, b.date, b.amount]
        );
      }
      const newResult = await pool.query("SELECT * FROM bookmarks ORDER BY id ASC");
      return res.json(newResult.rows);
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM note_categories ORDER BY id ASC");
    if (result.rows.length === 0) {
      const mockCategories = [
        { name: "Awareness", color: "#F97316", amount: "2 discussions" },
        { name: "Key Concept", color: "#8B5CF6", amount: "1 discussion" },
        { name: "Personal Reflection", color: "#22C55E", amount: "2 discussions" },
        { name: "Scientific Evidence", color: "#D946EF", amount: "2 discussions" },
        { name: "Question", color: "#F59E0B", amount: "2 discussions" }
      ];
      for (const c of mockCategories) {
        await pool.query(
          "INSERT INTO note_categories (name, color, amount) VALUES ($1, $2, $3)",
          [c.name, c.color, c.amount]
        );
      }
      const newResult = await pool.query("SELECT * FROM note_categories ORDER BY id ASC");
      return res.json(newResult.rows);
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, color, amount } = req.body;
    const result = await pool.query(
      "INSERT INTO note_categories (name, color, amount) VALUES ($1, $2, $3) RETURNING *",
      [name, color, amount || "0 discussions"]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, amount } = req.body;
    const result = await pool.query(
      "UPDATE note_categories SET name = $1, color = $2, amount = COALESCE($3, amount) WHERE id = $4 RETURNING *",
      [name, color, amount, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Category not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM note_categories WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getNotes,
  getBookmarks,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
