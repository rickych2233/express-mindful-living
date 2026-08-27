const express = require('express');
const app = express();
const router = express.Router();

app.use(express.json());

router.put("/:id/sections/reorder", (req, res) => {
  res.json({ handler: "reorderSections", id: req.params.id, body: req.body });
});

router.put("/:chapterId/sections/:id", (req, res) => {
  res.json({ handler: "updateSection", chapterId: req.params.chapterId, id: req.params.id, body: req.body });
});

app.use('/api/chapters', router);

const http = require('http');
const server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  console.log("Listening on", port);
  const resp = await fetch(`http://localhost:${port}/api/chapters/10/sections/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionIds: [12, 5] })
  });
  const data = await resp.json();
  console.log("Response:", data);
  server.close();
});
