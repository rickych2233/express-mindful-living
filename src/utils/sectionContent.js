const { parseFragment } = require('parse5');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

// Existing sections without inline markers remain supported. Once markers are
// present, every language must describe the same complete media sequence.
function validateSectionContent(content, contents) {
  if (content == null) return;
  if (typeof content !== 'object' || Array.isArray(content)) invalid('content harus berupa objek bahasa');
  if (typeof content.en !== 'string') invalid('content.en harus berupa teks');
  const sequences = Object.entries(content).map(([lang, html]) => {
    if (typeof html !== 'string') invalid(`content.${lang} harus berupa teks`);
    const markers = [];
    function visit(node, parent) {
      const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
      if ((attrs.class || '').split(/\s+/).includes('media-embed')) {
        if (parent.nodeName !== '#document-fragment') invalid('Penanda media harus berada di antara blok teks');
        if (!/^\d+$/.test(attrs['data-index'] || '')) invalid('Indeks media tidak valid');
        const index = Number(attrs['data-index']);
        const media = contents[index];
        if (!media) invalid('Penanda media tidak memiliki lampiran yang sesuai');
        const type = String(media.type || 'Text').toLowerCase();
        if (attrs['data-type'] !== type) invalid('Tipe penanda media tidak sesuai lampiran');
        markers.push(index);
      }
      for (const child of node.childNodes || []) visit(child, node);
    }
    visit(parseFragment(html), null);
    return markers;
  });
  if (!sequences.some(s => s.length)) return;
  const expected = contents.map((_, index) => index);
  if (sequences.some(s => JSON.stringify(s) !== JSON.stringify(expected))) {
    invalid('Urutan media harus lengkap dan sama pada setiap bahasa');
  }
}

module.exports = { validateSectionContent };
