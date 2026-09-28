const STORAGE_KEY = 'little-by-little-journal-v3';
const OLD_KEYS = ['little-by-little-journal-v2', 'little-by-little-journal-v1'];
const DEFAULT_JOURNAL_ID = 'journal-default';
const PAGE_SIZE = 12;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const dateLabel = (iso) => { if (!iso) return { month: '', day: '', year: '' }; const d = new Date(`${iso}T12:00:00`); return { month: d.toLocaleDateString('en', { month: 'short' }).toUpperCase(), day: String(d.getDate()).padStart(2, '0'), year: d.getFullYear() }; };
const seedEntries = [
  { id:'sample-1', title:'Two Sum', date:'2026-09-27', tag:'ARRAYS', description:'Given an array of integers and a target, find the two numbers that add up to the target.', input:'An integer array nums and an integer target.', output:'The indices of the two numbers that add up to target.', constraints:'Exactly one solution exists. You cannot use the same element twice.', code:'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (seen.has(complement)) return [seen.get(complement), i];\n    seen.set(nums[i], i);\n  }\n}', hard:'My first instinct was to try every pair. I had to stop thinking about all the pairs I could make and ask what information would help me find the next number.', reflection:'As I walk through the array, I keep a little lookup table of numbers I have already seen. For each number, I ask: have I already passed its partner? One pass, one small table, and the pair finds itself.', createdAt:'2026-09-27T12:00:00' },
  { id:'sample-2', title:'Valid Parentheses', date:'2026-09-25', tag:'STACKS', description:'Decide whether a string of brackets is balanced and correctly nested.', input:'A string containing (), {}, and [].', output:'True if every opening bracket closes in the correct order.', constraints:'The string contains only bracket characters and may be empty.', code:'function isValid(s) {\n  const pairs = { ")": "(", "}": "{", "]": "[" };\n  const stack = [];\n  for (const char of s) {\n    if (!pairs[char]) stack.push(char);\n    else if (stack.pop() !== pairs[char]) return false;\n  }\n  return stack.length === 0;\n}', hard:'It is easy to check that the counts match, but counts alone miss the order. `([)]` has matching counts and is still wrong.', reflection:'The most recent opening bracket needs to be the first one closed. That is exactly what a stack remembers. Each closer has to match the very top; an empty stack at the end means nobody was left waiting.', createdAt:'2026-09-25T12:00:00' },
  { id:'sample-3', title:'Maximum Subarray', date:'2026-09-22', tag:'DYNAMIC PROGRAMMING', description:'Find the contiguous part of an array with the greatest possible sum.', input:'An array of integers, including possible negative values.', output:'The largest sum of any non-empty contiguous subarray.', constraints:'The subarray must contain at least one number.', hard:'I kept wanting to restart the search at every index. The useful question was simpler: is my running total helping the next number?', reflection:'For every number, I can either start fresh here, or add it onto the best stretch that ended just before. If the old stretch has dragged the sum below zero, I let it go. I carry forward the best answer I have seen.', createdAt:'2026-09-22T12:00:00' }
];
let entries = [];
let journals = [{ id: DEFAULT_JOURNAL_ID, name: 'Practice log', createdAt: new Date().toISOString() }];
let activeJournalId = DEFAULT_JOURNAL_ID;
try {
  let saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) for (const key of OLD_KEYS) { saved = localStorage.getItem(key); if (saved) break; }
  if (saved) {
    const state = JSON.parse(saved);
    entries = Array.isArray(state) ? state : Array.isArray(state.entries) ? state.entries : [];
    if (!Array.isArray(state) && Array.isArray(state.journals) && state.journals.length) journals = state.journals;
    if (!Array.isArray(state) && journals.some((j) => j.id === state.activeJournalId)) activeJournalId = state.activeJournalId;
  } else entries = seedEntries;
} catch { entries = seedEntries; }
if (!journals.length) journals = [{ id: DEFAULT_JOURNAL_ID, name: 'Practice log', createdAt: new Date().toISOString() }];
entries = (entries || []).map((entry) => ({ kind: entry.kind || 'problem', ...entry, journalId: entry.journalId || DEFAULT_JOURNAL_ID, images: Array.isArray(entry.images) ? entry.images : [] }));
if (!journals.some((j) => j.id === activeJournalId)) activeJournalId = journals[0].id;
let activeFilter = 'all', selectedEntryId = null, toastTimer, currentPage = 1, quoteIndex = Math.floor(Date.now() / 12000) % 7, quoteTimer;
let mediaDbPromise, formMedia = [], formMediaToken = 0, formObjectUrls = [], detailObjectUrls = [];
let lastMarkdownField = null;
const quotes = [
  { text:'“Great things are not done by impulse,\nbut by a series of small things brought together.”', by:'VAN GOGH · LETTER 274' },
  { text:'“Confusion is part of the map.”', by:'A NOTE TO SELF' },
  { text:'“Stay with the question a little longer.”', by:'A NOTE TO SELF' },
  { text:'“Every wrong turn leaves a mark.”', by:'A NOTE TO SELF' },
  { text:'“The answer changes how you see the question.”', by:'A NOTE TO SELF' },
  { text:'“Make a small thing. Then make it clearer.”', by:'A NOTE TO SELF' },
  { text:'“Today’s almost is tomorrow’s understanding.”', by:'A NOTE TO SELF' }
];

function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, journals, activeJournalId, entries })); $('#storage-status').textContent = 'SAVED ON THIS DEVICE'; return true; } catch { $('#storage-status').textContent = 'STORAGE FULL — EXPORT A BACKUP'; showToast('This browser is out of space. Export a backup.'); return false; } }
function esc(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function openMediaDb() { if (!('indexedDB' in window)) return Promise.reject(new Error('Image storage is unavailable in this browser.')); if (mediaDbPromise) return mediaDbPromise; mediaDbPromise = new Promise((resolve, reject) => { const request = indexedDB.open('little-by-little-media', 1); request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); return mediaDbPromise; }
async function mediaRequest(mode, action) { const db = await openMediaDb(); return new Promise((resolve, reject) => { const tx = db.transaction('images', mode); const req = action(tx.objectStore('images')); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
const getMedia = (id) => mediaRequest('readonly', (store) => store.get(id));
const putMedia = (record) => mediaRequest('readwrite', (store) => store.put(record));
const deleteMedia = (id) => mediaRequest('readwrite', (store) => store.delete(id));
async function deleteUnusedMedia(before, after) { const keep = new Set(after.flatMap((entry) => (entry.images || []).map((image) => image.id))); const old = new Set(before.flatMap((entry) => (entry.images || []).map((image) => image.id))); await Promise.all([...old].filter((id) => !keep.has(id)).map((id) => deleteMedia(id).catch(() => {}))); }
function daysFromToday(iso) { const a = new Date(`${todayISO()}T12:00:00`), b = new Date(`${iso}T12:00:00`); return Math.round((a - b) / 86400000); }
function weekStart() { const d = new Date(`${todayISO()}T12:00:00`); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().slice(0, 10); }
function currentJournal() { return journals.find((journal) => journal.id === activeJournalId) || journals[0]; }
function currentEntries() { return entries.filter((entry) => entry.journalId === activeJournalId); }
function hasInsight(e) { return e.kind === 'topic' ? !!(e.notes || e.whenToUse) : !!(e.reflection || e.hard); }
function filteredEntries() {
  const q = $('#search').value.trim().toLowerCase();
  return currentEntries().filter((e) => {
    const text = [e.title, e.tag, e.notes, e.whenToUse, e.complexity, e.description, e.input, e.output, e.constraints, e.hard, e.reflection, e.code].join(' ').toLowerCase(), day = daysFromToday(e.date);
    return (!q || text.includes(q)) && (activeFilter === 'all' || activeFilter === 'week' && day >= 0 && day < 7 || activeFilter === 'insight' && hasInsight(e) || activeFilter === 'code' && !!e.code);
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}
function render() {
  const scoped = currentEntries(), filtered = filteredEntries(), totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); currentPage = Math.min(currentPage, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), weekCount = scoped.filter((e) => e.date >= weekStart() && e.date <= todayISO()).length;
  $('#active-journal-name').textContent = currentJournal().name; $('#journal-subtitle').textContent = `${currentJournal().name.toUpperCase()} · SUBJECT JOURNAL`;
  $('#journal-list').innerHTML = journals.map((j) => `<div class="journal-item"><button class="journal-option${j.id === activeJournalId ? ' active' : ''}" type="button" data-journal-id="${esc(j.id)}"><span class="journal-option-name">${esc(j.name)}</span><span class="journal-option-count">${entries.filter((e) => e.journalId === j.id).length}</span></button><button class="journal-action" type="button" data-journal-edit="${esc(j.id)}" aria-label="Rename ${esc(j.name)}" title="Rename journal">↗</button><button class="journal-action delete-journal-action" type="button" data-journal-delete="${esc(j.id)}" aria-label="Delete ${esc(j.name)}" title="Delete journal">×</button></div>`).join('');
  $('#entry-count').textContent = `${String(scoped.length).padStart(2, '0')} ${scoped.length === 1 ? 'PAGE' : 'PAGES'}`; $('#stat-total').textContent = scoped.length; $('#stat-week').textContent = weekCount; $('#stat-streak').textContent = streakCount(scoped); renderWeek(scoped);
  $('#entries').innerHTML = visible.map((e) => { const d = dateLabel(e.date), preview = e.kind === 'topic' ? (e.notes || e.whenToUse || 'A concept worth returning to.') : (e.reflection || e.hard || e.description || 'A question worth keeping.'); const label = e.kind === 'topic' ? 'CONCEPT' : (e.tag || 'PRACTICE PROBLEM'); return `<article class="entry-row" data-id="${esc(e.id)}" tabindex="0" role="button" aria-label="Open ${esc(e.title)}"><time class="entry-date" datetime="${esc(e.date)}"><span class="date-day">${d.day}</span>${d.month} '${String(d.year).slice(-2)}</time><div class="entry-main"><h3 class="entry-title">${esc(e.title)}</h3><div class="entry-preview">${renderPreviewMarkdown(preview)}</div></div><span class="entry-tag">${esc(label)}</span><span class="entry-mark" aria-hidden="true">↗</span></article>`; }).join('');
  if (window.renderMathInElement) $('#entries').querySelectorAll('.entry-preview').forEach((preview) => window.renderMathInElement(preview, { delimiters:[{ left:'$$', right:'$$', display:true },{ left:'$', right:'$', display:false },{ left:'\\(', right:'\\)', display:false },{ left:'\\[', right:'\\]', display:true }], throwOnError:false, strict:false }));
  $('#empty-state').classList.toggle('hidden', filtered.length > 0); $('#entries').classList.toggle('hidden', filtered.length === 0);
  $('#empty-title').textContent = scoped.length === 0 ? 'A blank page is full of possibility.' : 'Nothing on this page just yet.'; $('#empty-copy').textContent = scoped.length === 0 ? 'Start with one concept you want to understand.' : 'Try another search or filter, or add a new page.';
  $('#entry-pagination').classList.toggle('hidden', filtered.length <= PAGE_SIZE); $('#page-summary').textContent = `PAGE ${currentPage} OF ${totalPages} · ${filtered.length} PAGES`; $('#previous-page').disabled = currentPage === 1; $('#next-page').disabled = currentPage === totalPages;
  $('#filter-count').classList.toggle('hidden', activeFilter === 'all'); $('#filter-count').textContent = activeFilter === 'all' ? '' : '1'; $('#clear-demo').classList.toggle('hidden', !entries.some((e) => e.id.startsWith('sample-')));
}
function streakCount(source = currentEntries()) { const dates = new Set(source.map((e) => e.date)); let day = todayISO(); if (!dates.has(day)) { day = new Date(new Date(`${day}T12:00:00`).getTime() - 86400000).toISOString().slice(0, 10); if (!dates.has(day)) return 0; } let n = 0; while (dates.has(day)) { n++; day = new Date(new Date(`${day}T12:00:00`).getTime() - 86400000).toISOString().slice(0, 10); } return n; }
function renderWeek(source = currentEntries()) { const names = ['M','T','W','T','F','S','S'], start = new Date(`${weekStart()}T12:00:00`), dates = new Set(source.map((e) => e.date)); $('#week-strip').innerHTML = names.map((name, i) => { const d = new Date(start); d.setDate(d.getDate() + i); const iso = d.toISOString().slice(0, 10); return `<span class="week-day" title="${iso}"><span>${name}</span><span class="week-dot${dates.has(iso) ? ' active' : ''}"></span></span>`; }).join(''); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400); }
function setQuote(index, animate = true) { const text = $('#quote-text'), apply = () => { text.textContent = quotes[index].text; $('#quote-by').textContent = quotes[index].by; text.classList.remove('is-changing'); }; if (!animate) return apply(); text.classList.add('is-changing'); setTimeout(apply, 180); }
function rotateQuote() { quoteIndex = (quoteIndex + 1) % quotes.length; setQuote(quoteIndex); }
function resetQuoteTimer() { clearInterval(quoteTimer); quoteTimer = setInterval(rotateQuote, 12000); }
function revokeUrls(urls) { urls.forEach((url) => URL.revokeObjectURL(url)); urls.length = 0; }
function renderFormMedia() {
  const host = $('#image-preview-list'); host.replaceChildren();
  formMedia.forEach((item, index) => {
    const card = document.createElement('div'); card.className = 'image-preview'; const img = document.createElement('img'); img.src = item.preview || ''; img.alt = item.name || 'Journal illustration';
    const fields = document.createElement('div'); fields.className = 'image-preview-fields'; const name = document.createElement('span'); name.className = 'image-file-name'; name.textContent = item.name;
    const caption = document.createElement('input'); caption.className = 'image-caption-input'; caption.placeholder = 'Add a caption'; caption.value = item.caption || ''; caption.setAttribute('aria-label', `Caption for ${item.name}`); caption.addEventListener('input', () => { item.caption = caption.value; });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-image'; remove.textContent = 'Remove'; remove.addEventListener('click', () => { if (item.preview) { URL.revokeObjectURL(item.preview); formObjectUrls = formObjectUrls.filter((url) => url !== item.preview); } formMedia.splice(index, 1); renderFormMedia(); });
    fields.append(name, caption, remove); card.append(img, fields); host.append(card);
  });
}
async function loadFormMedia(images, token) { for (const image of images || []) { try { const record = await getMedia(image.id); if (record && token === formMediaToken) { const preview = URL.createObjectURL(record.blob); formObjectUrls.push(preview); formMedia.push({ ...image, preview, existing: true }); } } catch { /* Missing media leaves its page text intact. */ } } if (token === formMediaToken) renderFormMedia(); }
function openForm(entry = null) {
  revokeUrls(formObjectUrls); const token = ++formMediaToken; formMedia = [];
  const form = $('#entry-form'); form.reset(); form.elements.id.value = entry?.id || ''; form.elements.title.value = entry?.title || ''; form.elements.date.value = entry?.date || todayISO(); form.elements.tag.value = entry?.tag || '';
  form.elements.kind.value = entry?.kind || 'topic'; form.elements.notes.value = entry?.notes || ''; form.elements.whenToUse.value = entry?.whenToUse || ''; form.elements.complexity.value = entry?.complexity || '';
  ['description','input','output','constraints','code','hard','reflection'].forEach((name) => { form.elements[name].value = entry?.[name] || ''; });
  lastMarkdownField = form.elements[form.elements.kind.value === 'topic' ? 'notes' : 'description'];
  $('#dialog-title').innerHTML = entry ? 'Return to the<br /><em>thinking.</em>' : 'Give an idea<br /><em>its own page.</em>'; $('#dialog-kicker').textContent = entry ? 'A PAGE IN PROGRESS' : 'A NEW PAGE'; $('#save-page-button').innerHTML = entry ? 'Save changes <span>↗</span>' : 'Save this page <span>↗</span>'; togglePageKind(); renderFormMedia(); $('#entry-dialog').showModal(); if (entry?.images?.length) void loadFormMedia(entry.images, token);
}
function togglePageKind() { const topic = $('#entry-form').elements.kind.value === 'topic'; $('.concept-fields').classList.toggle('hidden', !topic); $('.problem-fields').classList.toggle('hidden', topic); if (!lastMarkdownField || lastMarkdownField.closest('.field-group')?.classList.contains('hidden')) lastMarkdownField = $('#entry-form').elements[topic ? 'notes' : 'description']; }
$('#entry-form').addEventListener('focusin', (event) => { if (event.target.matches('textarea')) lastMarkdownField = event.target; });
$('.markdown-tools').addEventListener('click', (event) => {
  const action = event.target.closest('[data-md]')?.dataset.md; if (!action) return;
  let field = lastMarkdownField;
  if (!field || !field.isConnected || field.closest('.field-group')?.classList.contains('hidden')) { field = $('#entry-form').elements[$('#entry-form').elements.kind.value === 'topic' ? 'notes' : 'description']; lastMarkdownField = field; }
  field.focus(); const start = field.selectionStart, end = field.selectionEnd, selected = field.value.slice(start, end);
  const linePrefix = { heading:'## ', bullet:'- ', quote:'> ' }[action];
  if (linePrefix) {
    const body = selected || 'Write here', formatted = body.split('\n').map((line) => `${linePrefix}${line}`).join('\n');
    field.setRangeText(formatted, start, end, 'select');
  } else {
    const wrap = { bold:['**','**','bold text'], italic:['*','*','italic text'], 'inline-code':['`','`','code'], 'code-block':['```\n','\n```','code here\n'] }[action];
    if (!wrap) return;
    const body = selected || wrap[2]; field.setRangeText(`${wrap[0]}${body}${wrap[1]}`, start, end, 'select');
    if (!selected) field.setSelectionRange(start + wrap[0].length, start + wrap[0].length + body.length);
  }
  field.dispatchEvent(new Event('input', { bubbles:true }));
});
function inlineMarkdown(source) {
  const protectedParts = [];
  const protect = (value) => `\uE000${protectedParts.push(value) - 1}\uE001`;
  // Pasted problem statements often put inline formulas directly together,
  // producing `$...$$...$`. Separate that boundary before KaTeX sees it.
  const normalized = String(source).replace(/(?<=[A-Za-z0-9}])\$\$(?=[\\A-Za-z0-9])/g, () => '$ $');
  let html = esc(normalized);
  html = html.replace(/`([^`]+)`/g, (_, code) => protect(`<code>${code}</code>`));
  html = html.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/g, (math) => protect(math));
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(?!\s)(.+?)\*/g, '<em>$1</em>').replace(/_(?!\s)(.+?)_/g, '<em>$1</em>');
  return html.replace(/\uE000(\d+)\uE001/g, (_, index) => protectedParts[Number(index)]);
}
function renderPreviewMarkdown(source) {
  const flattened = String(source || '').replace(/```[^\n]*\n?/g, '').replace(/```/g, '').split('\n').map((line) => line.replace(/^\s*#{1,4}\s+/, '').replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+|>\s?)/, '')).join(' · ').replace(/\s+/g, ' ').trim();
  const compact = flattened.length > 260 ? `${flattened.slice(0, 257).trimEnd()}…` : flattened;
  return inlineMarkdown(compact);
}
function renderMarkdown(source) {
  const lines = String(source || '').replace(/\r/g, '').split('\n'), out = [];
  let paragraph = [], list = [], listType = '', code = null;
  const flushParagraph = () => { if (paragraph.length) { out.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`); paragraph = []; } };
  const flushList = () => { if (list.length) { out.push(`<${listType}>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`); list = []; listType = ''; } };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flushParagraph(); flushList();
      if (code === null) code = []; else { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null; }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/), numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) { flushParagraph(); const type = bullet ? 'ul' : 'ol'; if (listType && listType !== type) flushList(); listType = type; list.push((bullet || numbered)[1]); continue; }
    flushList();
    const heading = line.match(/^(#{1,4})\s+(.+)$/), quote = line.match(/^>\s?(.*)$/);
    if (heading) { flushParagraph(); const level = heading[1].length; out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); }
    else if (quote) { flushParagraph(); out.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); }
    else if (/^\s*([-*_]\s*){3,}$/.test(line)) { flushParagraph(); out.push('<hr>'); }
    else if (!line.trim()) flushParagraph();
    else paragraph.push(line);
  }
  if (code !== null) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  flushParagraph(); flushList();
  return out.join('');
}
function detailSection(title, text, cls = '') { return text ? `<section class="detail-section ${cls}"><h3>${title}</h3><div class="markdown-body">${renderMarkdown(text)}</div></section>` : ''; }
function clearDetailUrls() { revokeUrls(detailObjectUrls); }
async function renderDetailImages(images) { const host = $('#detail-images'); if (!host) return; host.replaceChildren(); for (const image of images || []) { try { const record = await getMedia(image.id); if (!record || !$('#detail-images')) continue; const url = URL.createObjectURL(record.blob); detailObjectUrls.push(url); const figure = document.createElement('figure'); figure.className = 'detail-figure'; const img = document.createElement('img'); img.src = url; img.alt = image.caption || image.name || 'Journal illustration'; figure.append(img); if (image.caption) { const caption = document.createElement('figcaption'); caption.textContent = image.caption; figure.append(caption); } host.append(figure); } catch { /* Text remains available when media is missing. */ } } }
function openDetail(id) {
  const e = entries.find((item) => item.id === id); if (!e) return; clearDetailUrls(); selectedEntryId = id; const d = dateLabel(e.date), topic = e.kind === 'topic';
  const body = topic ? `${detailSection('THE IDEA, IN YOUR WORDS', e.notes)}${detailSection('WHEN TO USE IT', e.whenToUse)}${detailSection('COST / COMPLEXITY', e.complexity)}` : `${detailSection('THE QUESTION', e.description)}<div class="detail-grid">${detailSection('INPUT FORMAT', e.input)}${detailSection('OUTPUT FORMAT', e.output)}</div>${detailSection('CONSTRAINTS', e.constraints)}${detailSection('THE TRICKY PART', e.hard)}${detailSection('MY OWN EXPLANATION', e.reflection)}`;
  $('#detail-content').innerHTML = `<div class="detail-wrap"><div class="detail-header"><div><p class="detail-date">${d.month} ${d.day}, ${d.year} · ${topic ? 'CONCEPT NOTE' : 'PRACTICE NOTE'}</p><h2>${esc(e.title)}<span class="period">.</span></h2><span class="detail-tag">${esc(topic ? (e.tag || 'CONCEPT') : (e.tag || 'PRACTICE PROBLEM'))}</span></div><div class="detail-actions"><button class="small-action" data-action="edit">Edit</button><button class="small-action" data-action="delete">Delete</button><button class="icon-button close-dialog" aria-label="Close">×</button></div></div>${body}${e.code ? `<section class="detail-section"><h3>${topic ? 'EXAMPLE / CODE' : 'MY CODE'}</h3><pre>${esc(e.code)}</pre></section>` : ''}<div class="detail-images" id="detail-images"></div></div>`;
  $('#detail-dialog').showModal();
  if (window.renderMathInElement) window.renderMathInElement($('#detail-content'), { delimiters:[{ left:'$$', right:'$$', display:true },{ left:'$', right:'$', display:false },{ left:'\\(', right:'\\)', display:false },{ left:'\\[', right:'\\]', display:true }], throwOnError:false, strict:false });
  if (e.images?.length) void renderDetailImages(e.images);
}
function openJournalForm(journal = null) { const form = $('#journal-form'); form.reset(); form.elements.id.value = journal?.id || ''; form.elements.name.value = journal?.name || ''; $('#journal-dialog-kicker').textContent = journal ? 'EDIT SUBJECT JOURNAL' : 'A NEW SUBJECT NOTEBOOK'; $('#journal-dialog-title').innerHTML = journal ? 'Change its<br /><em>cover name.</em>' : 'Make a little<br /><em>more room.</em>'; $('#journal-dialog-intro').textContent = journal ? 'Give this subject notebook a clearer name.' : 'Group related ideas into one subject journal.'; $('#journal-submit-label').innerHTML = journal ? 'Save journal <span>↗</span>' : 'Create journal <span>↗</span>'; $('#journal-dialog').showModal(); }
async function compressImage(file) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is over 10 MB. Choose a smaller image.`);
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (!('createImageBitmap' in window)) return file;
  try { const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob || file), 'image/webp', .86)); } catch { return file; }
}
function blobToDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
async function buildBackup() { const media = [], seen = new Set(); for (const entry of entries) for (const image of entry.images || []) { if (seen.has(image.id)) continue; seen.add(image.id); const record = await getMedia(image.id); if (record) media.push({ id: image.id, name: record.name || image.name, type: record.blob.type, data: await blobToDataUrl(record.blob) }); } return { version:3, exportedAt:new Date().toISOString(), journals, activeJournalId, entries, media }; }
async function restoreMedia(items) { for (const item of items || []) { if (!item.id || !item.data) continue; const blob = await (await fetch(item.data)).blob(); await putMedia({ id:item.id, name:item.name || 'Illustration', blob }); } }

$('#today').textContent = new Date().toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' }).toUpperCase(); $('#year').textContent = new Date().getFullYear(); setQuote(quoteIndex, false); resetQuoteTimer(); render();
$('#new-entry').addEventListener('click', () => openForm()); $('#empty-add').addEventListener('click', () => openForm()); $('#page-kind').addEventListener('change', togglePageKind);
$('#page-images').addEventListener('change', (event) => { for (const file of event.target.files) { if (!file.type.startsWith('image/')) { showToast('Please choose an image file.'); continue; } if (file.size > MAX_IMAGE_BYTES) { showToast(`${file.name} is over 10 MB. Choose a smaller image.`); continue; } const preview = URL.createObjectURL(file); formObjectUrls.push(preview); formMedia.push({ file, name:file.name, caption:'', preview }); } event.target.value = ''; renderFormMedia(); });
$('#search').addEventListener('input', () => { currentPage = 1; render(); }); $('#filter-button').addEventListener('click', () => { const tray = $('#filter-tray'), open = tray.classList.toggle('hidden') === false; $('#filter-button').setAttribute('aria-expanded', String(open)); });
$('#filter-tray').addEventListener('click', (event) => { const button = event.target.closest('[data-filter]'); if (!button) return; activeFilter = button.dataset.filter; currentPage = 1; $$('.filter-chip').forEach((chip) => chip.classList.toggle('active', chip === button)); render(); });
$('#previous-page').addEventListener('click', () => { currentPage--; render(); $('#entries').scrollIntoView({ behavior:'smooth', block:'start' }); }); $('#next-page').addEventListener('click', () => { currentPage++; render(); $('#entries').scrollIntoView({ behavior:'smooth', block:'start' }); });
$('#surprise-button').addEventListener('click', () => { const pool = currentEntries(); if (!pool.length) { showToast('Add a page to this journal first.'); return; } let pick = pool[Math.floor(Math.random() * pool.length)]; if (pool.length > 1 && pick.id === selectedEntryId) pick = pool[(pool.indexOf(pick) + 1) % pool.length]; openDetail(pick.id); });
$('#journal-switch').addEventListener('click', () => { const menu = $('#journal-menu'), open = menu.classList.toggle('hidden') === false; $('#journal-switch').setAttribute('aria-expanded', String(open)); });
$('#journal-list').addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-journal-edit]'); if (edit) { const journal = journals.find((j) => j.id === edit.dataset.journalEdit); if (journal) { $('#journal-menu').classList.add('hidden'); $('#journal-switch').setAttribute('aria-expanded', 'false'); openJournalForm(journal); } return; }
  const del = event.target.closest('[data-journal-delete]'); if (del) { const journal = journals.find((j) => j.id === del.dataset.journalDelete); if (!journal) return; if (journals.length === 1) { showToast('Keep at least one journal in your library.'); return; } const count = entries.filter((e) => e.journalId === journal.id).length; if (!confirm(`Delete “${journal.name}” and its ${count} ${count === 1 ? 'page' : 'pages'}? This cannot be undone.`)) return; const before = entries, oldJournals = journals, oldActive = activeJournalId; entries = entries.filter((e) => e.journalId !== journal.id); journals = journals.filter((j) => j.id !== journal.id); if (activeJournalId === journal.id) activeJournalId = journals[0].id; if (!save()) { entries = before; journals = oldJournals; activeJournalId = oldActive; return; } await deleteUnusedMedia(before, entries); render(); showToast('Subject journal deleted.'); return; }
  const option = event.target.closest('.journal-option[data-journal-id]'); if (!option) return; activeJournalId = option.dataset.journalId; currentPage = 1; activeFilter = 'all'; $('#search').value = ''; $$('.filter-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.filter === 'all')); $('#journal-menu').classList.add('hidden'); $('#journal-switch').setAttribute('aria-expanded', 'false'); save(); render();
});
$('#new-journal-button').addEventListener('click', () => { $('#journal-menu').classList.add('hidden'); $('#journal-switch').setAttribute('aria-expanded', 'false'); openJournalForm(); });
$('#journal-form').addEventListener('submit', (event) => { event.preventDefault(); const form = event.currentTarget, id = form.elements.id.value, name = form.elements.name.value.trim(); if (!name) return; if (journals.some((j) => j.id !== id && j.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { showToast('You already have a journal with that name.'); return; } if (id) journals = journals.map((j) => j.id === id ? { ...j, name } : j); else { const journal = { id:crypto.randomUUID(), name, createdAt:new Date().toISOString() }; journals.push(journal); activeJournalId = journal.id; } currentPage = 1; activeFilter = 'all'; $('#search').value = ''; $('#journal-dialog').close(); save(); render(); showToast(id ? 'Journal name updated.' : `“${name}” is ready for its first page.`); });
$('#quote-next').addEventListener('click', () => { rotateQuote(); resetQuoteTimer(); }); $('#entries').addEventListener('click', (event) => { const row = event.target.closest('[data-id]'); if (row) openDetail(row.dataset.id); });
$('#entries').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { const row = event.target.closest('[data-id]'); if (row) { event.preventDefault(); openDetail(row.dataset.id); } } });
$$('.close-dialog').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close())); $$('.cancel-button').forEach((button) => button.addEventListener('click', (event) => event.currentTarget.closest('dialog').close()));
$('#entry-dialog').addEventListener('close', () => { formMediaToken++; revokeUrls(formObjectUrls); });
$('#entry-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget, data = Object.fromEntries(new FormData(form)), existing = entries.find((e) => e.id === data.id), before = entries, savedIds = [];
  const saveButton = $('#save-page-button'); saveButton.disabled = true;
  try {
    const images = [];
    for (const item of formMedia) { if (item.id) images.push({ id:item.id, name:item.name, caption:item.caption || '' }); else if (item.file) { const blob = await compressImage(item.file), id = crypto.randomUUID(); await putMedia({ id, name:item.name, blob }); savedIds.push(id); images.push({ id, name:item.name, caption:item.caption || '' }); } }
    const page = { ...data, kind:data.kind || 'topic', id:data.id || crypto.randomUUID(), journalId:existing?.journalId || activeJournalId, createdAt:existing?.createdAt || new Date().toISOString(), images };
    entries = existing ? entries.map((e) => e.id === page.id ? page : e) : [...entries, page];
    if (!save()) { entries = before; await Promise.all(savedIds.map(deleteMedia)); return; }
    const next = entries; await deleteUnusedMedia(before, next); $('#entry-dialog').close(); render(); showToast(existing ? 'Your page has been updated.' : 'A new page for the things you learned.');
  } catch (error) { await Promise.all(savedIds.map(deleteMedia)); showToast(error.message || 'Could not save this page.'); }
  finally { saveButton.disabled = false; }
});
$('#detail-content').addEventListener('click', async (event) => { if (event.target.closest('.close-dialog')) { $('#detail-dialog').close(); return; } const action = event.target.closest('[data-action]')?.dataset.action; if (action === 'edit') { const page = entries.find((e) => e.id === selectedEntryId); $('#detail-dialog').close(); openForm(page); } if (action === 'delete' && confirm('Delete this page? This cannot be undone.')) { const before = entries; entries = entries.filter((e) => e.id !== selectedEntryId); if (save()) { await deleteUnusedMedia(before, entries); render(); $('#detail-dialog').close(); clearDetailUrls(); showToast('Page removed from your journal.'); } else entries = before; } });
$('#detail-dialog').addEventListener('close', clearDetailUrls); $('#backup-button').addEventListener('click', () => $('#backup-dialog').showModal());
$('#export-button').addEventListener('click', async () => { const button = $('#export-button'); button.disabled = true; $('#backup-message').textContent = 'Gathering pages and illustrations…'; try { const backup = await buildBackup(), blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `little-by-little-backup-${todayISO()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); $('#backup-message').textContent = 'Your backup includes journals, pages, and images.'; } catch { $('#backup-message').textContent = 'Could not build backup. Try again in a moment.'; } finally { button.disabled = false; } });
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text()), imported = Array.isArray(data) ? data : data.entries;
    if (!Array.isArray(imported) || imported.some((e) => !e.title || !e.date)) throw new Error('That file does not look like a journal backup.');
    if (!confirm('Restoring replaces the journals and pages saved in this browser. Continue?')) return;
    const before = entries, oldJournals = journals, oldActive = activeJournalId;
    if (!Array.isArray(data) && Array.isArray(data.media)) await restoreMedia(data.media);
    entries = imported.map((e) => ({ kind:e.kind || 'problem', ...e, journalId:e.journalId || DEFAULT_JOURNAL_ID, images:Array.isArray(e.images) ? e.images : [] }));
    journals = !Array.isArray(data) && Array.isArray(data.journals) && data.journals.length ? data.journals : [{ id:DEFAULT_JOURNAL_ID, name:'Practice log', createdAt:new Date().toISOString() }];
    activeJournalId = !Array.isArray(data) && journals.some((j) => j.id === data.activeJournalId) ? data.activeJournalId : journals[0].id; currentPage = 1;
    if (!save()) { entries = before; journals = oldJournals; activeJournalId = oldActive; throw new Error('Could not restore because browser storage is full.'); }
    await deleteUnusedMedia(before, entries); render(); $('#backup-message').textContent = `Restored ${entries.length} pages and their illustrations.`; showToast('Your journal has been restored.');
  } catch (error) { $('#backup-message').textContent = error.message || 'Could not read that backup file.'; }
  event.target.value = '';
});
$('#clear-demo').addEventListener('click', async () => { if (!confirm('Remove the sample entries? Your own pages will stay.')) return; const before = entries; entries = entries.filter((e) => !e.id.startsWith('sample-')); if (save()) { await deleteUnusedMedia(before, entries); render(); showToast('Sample pages cleared. Your journal is yours now.'); } else entries = before; });
document.addEventListener('click', (event) => { if (!event.target.closest('.journal-switch-wrap')) { $('#journal-menu').classList.add('hidden'); $('#journal-switch').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search').focus(); } if (event.key === 'Escape') { $$('dialog[open]').forEach((dialog) => dialog.close()); $('#journal-menu').classList.add('hidden'); $('#journal-switch').setAttribute('aria-expanded', 'false'); } });
for (const dialog of $$('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
// The app script is parser-loaded while KaTeX is deferred in <head>. Run once more
// after deferred assets finish so previews on the first paint get typeset too.
window.addEventListener('load', () => {
  if (window.renderMathInElement) $('#entries').querySelectorAll('.entry-preview').forEach((preview) => window.renderMathInElement(preview, { delimiters:[{ left:'$$', right:'$$', display:true },{ left:'$', right:'$', display:false },{ left:'\\(', right:'\\)', display:false },{ left:'\\[', right:'\\]', display:true }], throwOnError:false, strict:false }));
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
