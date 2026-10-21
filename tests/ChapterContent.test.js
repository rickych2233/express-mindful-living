const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSectionContent } = require('../src/utils/sectionContent');
const { translateContent } = require('../src/utils/translateContent');
const marker = (index, type) => `<div class="media-embed" data-type="${type}" data-index="${index}"></div>`;
const media = [{ title: 'Sunrise', type: 'image', url: '/uploads/sunrise.jpg' }, { title: 'Breathing', type: 'video', url: '/uploads/breathing.mp4' }];
const content = { en: `<p>Pause and breathe.</p>${marker(0, 'image')}<p>Observe your breath.</p>${marker(1, 'video')}`, id: `<p>Berhenti sejenak dan bernapas.</p>${marker(0, 'image')}<p>Amati napas Anda.</p>${marker(1, 'video')}` };

test('accepts complete bilingual text/image/text/video and legacy attachments', () => {
  validateSectionContent(content, media);
  validateSectionContent({en: '<p>Old section</p>'}, media);
});
test('rejects missing, duplicate, reordered, nested and mismatched media markers', () => {
  for (const html of [marker(3,'image'), marker(0,'video'), marker(0,'image'), marker(0,'image')+marker(0,'image'), marker(1,'video')+marker(0,'image'), `<p>${marker(0,'image')}</p>`]) {
    assert.throws(() => validateSectionContent({en:html}, media), {status:400});
  }
  assert.throws(() => validateSectionContent({...content, id:'<p>No markers</p>'},media), {status:400});
});
test('translation preserves formatting, URL, media positions, and escapes provider output', async () => {
  const html = `<p><strong>Pause</strong> and breathe.</p>${marker(0,'image')}<p><a href="/help">Observe</a></p>`;
  const result = await translateContent(html, 'en', 'id', async input => {
    assert.deepEqual(input, ['Pause','and breathe.','Observe']);
    return [{text:'Berhenti'},{text:'dan bernapas.'},{text:'Amati <napas>'}];
  });
  assert.equal(result, `<p><strong>Berhenti</strong> dan bernapas.</p>${marker(0,'image')}<p><a href="/help">Amati &lt;napas&gt;</a></p>`);
});
test('rejects empty and incomplete provider results', async () => {
  await assert.rejects(translateContent('<p>Pause</p>', 'en','id',async()=>[]));
  await assert.rejects(translateContent('Pause', 'en','id',async()=>({text:''})));
});

// Stub only the external provider. Exercise the actual controller response contract.
const providerPath = require.resolve('google-translate-api-x');
require.cache[providerPath] = {id:providerPath, filename:providerPath, loaded:true, exports:async (text, {to}) => {
  if(to==='fr') throw new Error('simulated outage');
  return {text:'Berhenti'};
}};
const Controller = require('../src/controllers/TranslationController');
async function request(body) {
  let status, data;
  const original = console.error;
  console.error = ()=>{};
  try { await Controller.translateText({body},{status(code){status=code;return this},json(value){data=value;return this}}); }
  finally {console.error=original;}
  return {status,data};
}
test('partial failures retain successful translations and report failed language', async () => {
  const {status,data} = await request({text:'Pause',targets:['id','fr']});
  assert.equal(status,200); assert.equal(data.status,'partial');
  assert.equal(data.translations.id,'Berhenti'); assert(!('fr' in data.translations)); assert(data.errors.fr);
});
test('total provider failure is HTTP 502; malformed requests are HTTP 400', async () => {
  assert.equal((await request({text:'Pause',targets:['fr']})).status,502);
  for (const body of [{text:{}},{text:'Pause',targets:'id'},{text:'Pause',targets:['bad']}]) assert.equal((await request(body)).status,400);
});
module.exports = {content, media};
