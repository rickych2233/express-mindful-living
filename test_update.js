const fetch = require('node-fetch');
async function test() {
  const payload = {
    title: { en: "Updated Title" },
    description: { en: "Updated Description" },
    status: "Published",
    sections: [
      {
        id: 1, // assuming section 1 exists
        title: { en: "Updated Section" },
        description: { en: "Updated Sec Desc" },
        content: "{\"en\":\"some content\"}",
        type: "Text",
        contents: []
      }
    ]
  };
  try {
    const res = await fetch('http://localhost:5001/api/chapters/2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(res.status, await res.text());
  } catch (e) { console.error(e); }
}
test();
