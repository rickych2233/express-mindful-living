const { pool } = require('./src/config/database');
const Section = require('./src/models/Section');

async function test() {
  try {
    const result = await Section.create({
      chapter_id: 1,
      title: { en: "hahaha" },
      description: { en: "asd" },
      type: "Text",
      status: "Drafted"
    });
    console.log("Success:", result);
  } catch (error) {
    console.error("Error creating section:", error);
  } finally {
    pool.end();
  }
}

test();
