const express = require('express');
const app = express();
app.use(express.json());

const ChapterController = require("./src/controllers/ChapterController");
const chapterRoutes = require("./src/routes/chapterRoutes");

// Mock database
jest = require('jest-mock');
const { pool } = require('./src/config/database');
pool.connect = async () => ({
  query: async (query, params) => {
    console.log("DB QUERY:", query.trim().replace(/\s+/g, ' '), "PARAMS:", params);
    return { rowCount: 1 };
  },
  release: () => {}
});

app.use('/api/chapters', chapterRoutes);

const request = require('supertest');
request(app)
  .put('/api/chapters/10/sections/reorder')
  .send({ sectionIds: [12, 5] })
  .expect(200)
  .then(res => {
    console.log("API Response:", res.body);
  })
  .catch(console.error);
