const { initDatabase } = require("./src/config/initDatabase");
const { pool } = require("./src/config/database");
const Section = require("./src/models/Section");
const Chapter = require("./src/models/Chapter");

async function runTest() {
  try {
    console.log("1. Initializing DB...");
    await initDatabase();
    
    console.log("2. Cleaning up old test data...");
    await pool.query("DELETE FROM chapters WHERE title = 'Test Chapter for Contents'");

    console.log("3. Creating Chapter...");
    const chapter = await Chapter.create({
      title: "Test Chapter for Contents",
      description: "Testing section contents",
      status: "Published",
      sections: []
    });
    console.log("Chapter created with ID:", chapter.id);

    console.log("4. Creating Section...");
    const section = await Section.create({
      chapter_id: chapter.id,
      title: "Section A - What is Presence?",
      type: "Text",
      status: "Published"
    });
    console.log("Section created with ID:", section.id);

    console.log("5. Inserting Section Contents...");
    await pool.query(`
      INSERT INTO section_contents (section_id, content_order, title, type, is_required)
      VALUES 
      ($1, 1, 'Understanding the Basics of Presence', 'Text', true),
      ($1, 2, 'Guided Meditation', 'Audio', true),
      ($1, 3, 'Reflection Exercise', 'Text', false)
    `, [section.id]);
    console.log("Contents inserted.");

    console.log("6. Fetching Sections by Chapter ID...");
    const sections = await Section.findByChapterId(chapter.id);
    console.log("Fetched Sections:", JSON.stringify(sections, null, 2));

    console.log("TEST SUCCESSFUL");
    process.exit(0);
  } catch (error) {
    console.error("TEST FAILED:", error);
    process.exit(1);
  }
}

runTest();
