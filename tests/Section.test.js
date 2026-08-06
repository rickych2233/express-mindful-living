const test = require('node:test');
const assert = require('node:assert');
const Section = require("../src/models/Section");
const { pool } = require("../src/config/database");

// Mock the pool query method
pool.query = async (queryStr) => {
  if (queryStr.includes('LEFT JOIN section_contents')) {
    if (queryStr.includes('Empty')) {
      return {
        rows: [
          {
            id: 2,
            chapter_id: 1,
            title: "Section B - Empty",
            contents: []
          }
        ]
      };
    }
    
    return {
      rows: [
        {
          id: 1,
          chapter_id: 1,
          title: "Section A - What is Presence?",
          status: "Published",
          contents: [
            { id: 101, title: "Understanding the Basics of Presence", type: "Text", is_required: true },
            { id: 102, title: "Guided Meditation", type: "Audio", is_required: true }
          ]
        }
      ]
    };
  }
  
  if (queryStr.includes('INSERT INTO sections')) {
    return { rows: [{ id: 1, chapter_id: 1, title: "New Section", type: "Text" }] };
  }
  
  if (queryStr.includes('COALESCE(MAX(section_order)')) {
    return { rows: [{ next_order: 1 }] };
  }

  if (queryStr.includes('CASE')) {
    return { rows: [{ id: 1, status: "Drafted" }] };
  }
  
  return { rows: [] };
};

test('Section Model - findByChapterId (Attached Contents Logic)', async (t) => {
  await t.test('fetch sections with their attached contents nested as a json array', async () => {
    const sections = await Section.findByChapterId(1);
    
    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].title, "Section A - What is Presence?");
    assert.strictEqual(sections[0].contents.length, 2);
    assert.strictEqual(sections[0].contents[1].type, "Audio");
  });

  await t.test('return empty array for contents if no attached contents exist', async () => {
    pool.query = async () => ({
      rows: [
        {
          id: 2,
          chapter_id: 1,
          title: "Section B - Empty",
          contents: [] 
        }
      ]
    });
    const sections = await Section.findByChapterId(1);
    assert.deepStrictEqual(sections[0].contents, []);
  });
});

test('Section Model - create section', async () => {
  pool.query = async (queryStr) => {
    if (queryStr.includes('COALESCE')) return { rows: [{ next_order: 1 }] };
    return { rows: [{ id: 1, chapter_id: 1, title: "New Section", type: "Text" }] };
  };
  const result = await Section.create({ chapter_id: 1, title: "New Section" });
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.title, "New Section");
});

test('Section Model - toggleStatus', async () => {
  pool.query = async () => ({ rows: [{ id: 1, status: "Drafted" }] });
  const result = await Section.toggleStatus(1);
  assert.strictEqual(result.status, "Drafted");
});
