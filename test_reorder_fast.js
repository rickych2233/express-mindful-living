const ChapterController = require("./src/controllers/ChapterController");
const { pool } = require('./src/config/database');
const Section = require('./src/models/Section');

pool.connect = async () => ({
  query: async (query, params) => {
    console.log("DB QUERY:", query.trim().replace(/\s+/g, ' '), "PARAMS:", params);
    return { rowCount: 1 };
  },
  release: () => {}
});

const req = { body: { sectionIds: [12, 5] } };
const res = {
  status: (code) => ({
    json: (data) => console.log(`HTTP ${code}:`, data)
  })
};

ChapterController.reorderSections(req, res).catch(console.error);
