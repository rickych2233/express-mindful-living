const express = require('express');
const app = express();
const router = express.Router();

router.put("/:id/sections/reorder", (req, res) => res.send("hit reorder"));
router.put("/:chapterId/sections/:id", (req, res) => res.send("hit update"));

app.use('/api/chapters', router);
const request = require('supertest');
request(app).put('/api/chapters/10/sections/reorder')
  .expect(200)
  .then(res => console.log("Result:", res.text));
