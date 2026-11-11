const { parseFragment, serialize } = require('parse5');

// Translate only visible text. Tags, links, and media markers never reach
// the translation provider and retain their structure in every language.
async function translateContent(text, source, target, translate) {
  if (!/<[a-z][\s\S]*>/i.test(text)) {
    const result = await translate(text, { from: source, to: target });
    if (!result || typeof result.text !== 'string' || !result.text.trim()) throw new Error('Empty translation');
    return result.text;
  }
  const fragment = parseFragment(text);
  const nodes = [];
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
    if (['script', 'style', 'code', 'pre'].includes(node.tagName) ||
        (attrs.class || '').split(/\s+/).includes('media-embed')) return;
    if (node.nodeName === '#text' && node.value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()) nodes.push(node);
    for (const child of node.childNodes || []) visit(child);
  }
  visit(fragment);
  if (!nodes.length) return serialize(fragment);
  const results = await translate(nodes.map(n => n.value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()), { from: source, to: target });
  if (!Array.isArray(results) || results.length !== nodes.length) throw new Error('Incomplete translation');
  nodes.forEach((node, index) => {
    const value = results[index]?.text;
    if (typeof value !== 'string' || !value.trim()) throw new Error('Empty translation');
    node.value = node.value.match(/^\s*/)[0] + value + node.value.match(/\s*$/)[0];
  });
  return serialize(fragment);
}

module.exports = { translateContent };
