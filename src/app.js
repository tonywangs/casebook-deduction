import { DEFAULT_SEED } from './generator.js';
import { newSession, collect, available, collectedEvidence, checkNotebook, hint, accuse, serialize, deserialize, SAVE_KEY, MAX_SAVE_BYTES, evaluateAccusation } from './session.js';
const root = document.querySelector('#app');
const live = document.querySelector('#announcement');
let session = null, saved = null, view = 'desk', hintResult = null, accusationResult = null, notebookResult = null;
let notice = '', saveStatus = 'Saved on this device', activeRoom = 0, activePerson = 0, reveal = null;
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) saved = deserialize(raw); }
catch (error) { notice = `Local save could not be loaded: ${error.message} You may import a backup or start a new case.`; }
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
const button = (text, onclick, attrs = {}) => el('button', { type: 'button', onclick, ...attrs }, text);
const eyebrow = text => el('p', { class: 'eyebrow' }, text);
const paragraph = (text, cls = '') => el('p', { class: cls }, text);
function announce(text) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = text; }); }
function persist() {
  try { localStorage.setItem(SAVE_KEY, serialize(session)); saved = session; saveStatus = 'Saved on this device'; }
  catch { saveStatus = 'Local storage unavailable — export a backup'; }
  document.querySelector('#save-status')?.replaceChildren(saveStatus);
}
function go(next) { view = next; reveal = null; render(true); }
function render(focus = false) {
  const priorFocus = document.activeElement?.id;
  root.replaceChildren(el('div', { class: 'shell' }, sidebar(), el('div', { class: 'workspace' }, header(),
    el('main', { id: 'main', tabindex: '-1' }, notice && el('div', { class: 'notice', role: 'alert' }, paragraph(notice), button('Dismiss', () => { notice = ''; render(); })),
      view === 'desk' ? desk() : caseView()), footer())));
  if (focus) document.querySelector('#page-title')?.focus();
  else if (priorFocus) document.getElementById(priorFocus)?.focus({ preventScroll: true });
}
function sidebar() {
  return el('aside', { class: 'sidebar', 'aria-label': 'Case navigation' },
    button([el('span', { class: 'brand-icon', 'aria-hidden': 'true' }, 'C'), el('span', {}, 'CASEBOOK', el('small', {}, 'THE BELLWETHER FILES'))], () => go('desk'), { class: 'brand', 'aria-label': 'Casebook desk' }),
    el('div', { class: 'sidebar-rule' }), eyebrow('FIELD OFFICE / 01'),
    session && view !== 'desk' ? el('nav', { 'aria-label': 'Investigation' },
      ...[['explore', '01', 'Explore the museum'], ['interviews', '02', 'Interview suspects'], ['evidence', '03', 'Evidence file'], ['notebook', '04', 'Deduction notebook'], ['accusation', '05', 'Make an accusation']].map(([key, num, title]) =>
        button([el('span', { class: 'nav-number' }, num), title, key === 'evidence' && el('span', { class: 'count' }, session.collected.length)], () => go(key), { class: `nav-item ${view === key ? 'active' : ''}`, 'aria-current': view === key ? 'page' : null, id: `nav-${key}` }))) : el('div', { class: 'desk-note' }, paragraph('Every absence leaves a trace.'), paragraph('A quiet mystery in eight records. Take your time. Follow what you can prove.')),
    el('div', { class: 'sidebar-bottom' }, el('span', { class: 'status-dot', 'aria-hidden': 'true' }), 'OFFLINE · NO ACCOUNT', paragraph('Your notes stay in this browser.', 'muted')));
}
function header() {
  return el('header', { class: 'topbar' }, el('span', { class: 'breadcrumb' }, view === 'desk' ? 'THE CASE DESK' : `CASE 01 / ${session.completed ? 'CLOSED' : 'INVESTIGATION OPEN'}`),
    el('div', { class: 'top-actions' }, session && view !== 'desk' && button('Case desk', () => go('desk'), { class: 'text-button' }),
      button('Import save', () => document.querySelector('#import-save').click(), { class: 'text-button', id: 'import-button' }),
      session && button('Export save', exportSave, { class: 'text-button', id: 'export-button' }),
      el('input', { type: 'file', id: 'import-save', accept: '.json,application/json', hidden: true, onchange: importSave })));
}
function title(kicker, heading, sub) { return el('div', { class: 'page-heading' }, eyebrow(kicker), el('h1', { id: 'page-title', tabindex: '-1' }, heading), sub && paragraph(sub, 'lede')); }
function art() { return document.querySelector('#museum-art').content.cloneNode(true); }
function desk() {
  const current = session || saved;
  const seedInput = el('input', { id: 'case-seed', name: 'seed', type: 'text', value: DEFAULT_SEED, maxlength: 80, required: true, autocomplete: 'off', spellcheck: false, 'aria-describedby': 'seed-help' });
  const start = event => {
    event.preventDefault();
    if (current && !window.confirm('Start a new case? This replaces the save on this device. Export first if you want to keep it.')) return;
    try { session = newSession(seedInput.value); resetViews(); persist(); go('explore'); announce('Case opened. Explore a room to collect your first record.'); }
    catch (error) { notice = error.message; render(); }
  };
  return el('div', { class: 'desk' },
    el('section', { class: 'hero' }, el('div', { class: 'hero-copy' }, eyebrow('A CASE OF QUIET DISAPPEARANCE'),
      el('h1', { id: 'page-title', tabindex: '-1' }, 'The Last', el('br'), el('em', {}, 'Light.')),
      paragraph('One missing treasure. Four people behind closed doors. Eight records that cannot all be ignored.', 'hero-deck'),
      el('div', { class: 'case-tags' }, el('span', {}, '01 / MUSEUM THEFT'), el('span', {}, '4 SUSPECTS'), el('span', {}, 'NO TIMER')),
      current && el('div', { class: 'resume-card' }, paragraph(`Your case: ${current.game.seed}`), button(current.completed ? 'Review closed case →' : `Resume investigation · ${current.collected.length}/8 records →`, () => { session = current; resetViews(); go(session.completed ? 'accusation' : 'explore'); }, { class: 'primary', id: 'resume-case' })),
      el('form', { onsubmit: start, class: 'start-form' }, el('label', { for: 'case-seed' }, current ? 'Start another case' : 'Choose your case seed'),
        el('div', { class: 'seed-row' }, seedInput, el('button', { type: 'submit', class: 'primary', id: 'start-case' }, 'Open case →')),
        el('p', { id: 'seed-help', class: 'fine-print' }, 'Same seed, same mystery. Change the words for a different trail.'))),
      el('div', { class: 'hero-art' }, art(), el('div', { class: 'art-label' }, 'EXHIBIT A', el('span', {}, 'An empty place in the collection.')))),
    el('section', { class: 'desk-intro' }, eyebrow('YOUR INVESTIGATION'), el('h2', {}, 'Look closely. Think slowly.'),
      el('div', { class: 'steps' }, ...[['01', 'Find the records', 'Explore four rooms, then bring what you find to the four suspects. Every path is available without guessing the culprit.'], ['02', 'Connect the facts', 'Keep room and badge deductions in your notebook. Ask for a nudge when you need one. The records are reliable; hunches are yours.'], ['03', 'Make your case', 'Name the person in the gallery at 21:00. An accusation needs evidence, and a mistaken theory never ends your investigation.']].map(([num, heading, body]) => el('article', {}, eyebrow(num), el('h3', {}, heading), paragraph(body))))));
}
function resetViews() { hintResult = null; accusationResult = null; notebookResult = null; reveal = null; activeRoom = 0; activePerson = 0; notice = ''; }
function caseView() {
  const pages = { explore, interviews, evidenceFile, notebook, accusation };
  const content = view === 'evidence' ? pages.evidenceFile() : (pages[view] || explore)();
  return el('div', { class: 'case-content' }, el('div', { class: 'case-meta' }, el('span', { class: 'seed-display' }, `SEED / ${session.game.seed}`), el('span', {}, `${session.collected.length} / 8 RECORDS`), el('progress', { value: session.collected.length, max: 8, 'aria-label': 'Evidence collected' })), content,
    el('details', { class: 'rules', open: session.collected.length === 0 }, el('summary', {}, 'The briefing · facts you can rely on'), briefing()),
    hintPanel());
}
function briefing() {
  return el('div', {}, paragraph('The Bellwether Moon, a small silver astrolabe, vanished during the museum’s 21:00 security seal. The display sensor confirms it was taken by the sole person inside the Moon Gallery during that interval. There was no accomplice, remote mechanism, or earlier substitution.'),
    el('ul', {}, el('li', {}, 'Exactly four people were inside. Each occupied a different room for the entire interval: Moon Gallery, Archive, Workshop, or Winter Garden.'),
      el('li', {}, `Each wore one different issued badge: ${session.game.badges.join(', ')}. Badges were not exchanged during the interval.`),
      el('li', {}, 'Every collected record is authenticated and true. Interview opinions and personal histories are atmosphere, not logical evidence.'),
      el('li', {}, 'All clue statements refer to 21:00. Where you find a record does not imply who was in that room. The gallery’s occupant is the thief.')),
    paragraph('Your task is to identify the thief. You do not need to determine every other room and badge. No timers, penalties, or hidden actions.'));
}
function collectRecord(id) {
  try { const record = collect(session, id); reveal = record; hintResult = null; notebookResult = null; persist(); render(); announce(`Collected ${record.id}. ${record.text}`); }
  catch (error) { notice = error.message; render(); }
}
function recordCard(record, compact = false) {
  return el('article', { class: `evidence-card ${compact ? 'compact' : ''}`, id: `record-${record.id}`, tabindex: '-1' },
    el('div', { class: 'evidence-top' }, el('span', { class: 'record-id' }, record.id), el('span', { class: 'verified' }, 'VERIFIED RECORD')),
    el('h3', {}, record.title), paragraph(record.text, 'clue-text'), paragraph(record.source, 'source'), !compact && paragraph(record.context, 'fine-print'));
}
function explore() {
  const room = session.game.rooms[activeRoom];
  const record = session.game.evidence.find(e => e.channel === 'room' && e.location === activeRoom);
  return el('section', {}, title('FOLLOW THE PAPER TRAIL', 'Explore the museum', 'The doors are open now. The records remember when they were not.'),
    el('div', { class: 'explore-layout' }, el('div', { class: 'room-list', role: 'group', 'aria-label': 'Museum rooms' }, ...session.game.rooms.map(r => {
      const found = session.collected.includes(session.game.evidence.find(e => e.channel === 'room' && e.location === r.id).id);
      return button([el('span', { class: 'room-num' }, `0${r.id + 1}`), el('span', {}, el('strong', {}, r.name), el('small', {}, found ? 'Record collected' : r.subtitle)), el('span', { 'aria-hidden': 'true' }, activeRoom === r.id ? '↗' : '→')], () => { activeRoom = r.id; reveal = null; render(); announce(`${r.name}. ${r.description}`); }, { class: `room-button ${activeRoom === r.id ? 'selected' : ''}`, id: `room-${r.id}`, 'aria-pressed': activeRoom === r.id });
    })), el('article', { class: 'location-panel' }, el('div', { class: `location-illustration room-art-${activeRoom}`, 'aria-hidden': 'true' }, el('div', { class: 'arch' }, el('span', {}, ['◇', '▤', '⚙', '♧'][activeRoom])), el('span', { class: 'location-stamp' }, 'BELLWETHER / AFTER HOURS')),
      el('div', { class: 'location-copy' }, eyebrow(`LOCATION 0${activeRoom + 1}`), el('h2', {}, room.name), paragraph(room.description),
        button(session.collected.includes(record.id) ? 'Review collected record' : room.inspect, () => collectRecord(record.id), { class: 'primary', id: `inspect-${activeRoom}` })))),
    reveal && el('section', { class: 'reveal', 'aria-label': 'Discovered evidence' }, eyebrow('ADDED TO YOUR EVIDENCE FILE'), recordCard(reveal), paragraph(`Next lead: ${session.game.suspects[activeRoom].name} can review a countersigned duplicate.`), button('Go to interviews →', () => { activePerson = activeRoom; go('interviews'); }, { class: 'secondary' })));
}
function interviews() {
  const person = session.game.suspects[activePerson];
  const record = session.game.evidence.find(e => e.channel === 'interview' && e.location === activePerson);
  const unlocked = available(session, record);
  const heard = session.conversations.includes(activePerson);
  return el('section', {}, title('FOUR VERSIONS OF AN EVENING', 'Interview the suspects', 'Personal stories set the scene. Only authenticated records count as evidence.'),
    el('div', { class: 'suspect-tabs', role: 'group', 'aria-label': 'Suspects' }, ...session.game.suspects.map(p => button([el('span', { class: 'avatar', 'aria-hidden': 'true' }, p.name.split(' ').map(n => n[0]).join('')), el('span', {}, el('strong', {}, p.name), el('small', {}, p.role))], () => { activePerson = p.id; reveal = null; render(); announce(`Interviewing ${p.name}.`); }, { class: `suspect-tab ${activePerson === p.id ? 'selected' : ''}`, id: `person-${p.id}`, 'aria-pressed': activePerson === p.id }))),
    el('article', { class: 'interview-panel' }, eyebrow(`INTERVIEW / ${person.role.toUpperCase()}`), el('h2', {}, person.name), paragraph(person.portrait, 'italic'),
      el('blockquote', {}, person.response),
      el('div', { class: 'dialogue-choices' }, button('“Tell me about your evening.”', () => { if (!heard) session.conversations.push(activePerson); persist(); render(); announce(person.background); }, { class: 'dialogue-button', id: 'ask-background' }),
        button(session.collected.includes(record.id) ? '“Let me see that record again.”' : '“Can you review this room record?”', () => collectRecord(record.id), { class: 'dialogue-button', disabled: !unlocked, id: 'ask-record' })),
      !unlocked && paragraph(`First collect ${record.requires[0]} in the ${session.game.rooms[activePerson].name}.`, 'lock-note'),
      heard && el('div', { class: 'dialogue-response' }, eyebrow('PERSONAL ACCOUNT · NOT EVIDENCE'), paragraph(`“${person.background}”`)),
      reveal && el('div', { class: 'reveal' }, paragraph('They open the sealed duplicate and check it against the record you brought.'), recordCard(reveal))));
}
function evidenceFile() {
  const evidence = collectedEvidence(session);
  return el('section', {}, title('AUTHENTICATED / 21:00', 'The evidence file', 'Every statement here is reliable. Their relationships are yours to discover.'),
    evidence.length ? el('div', { class: 'evidence-grid' }, ...evidence.map(e => recordCard(e))) : el('div', { class: 'empty-state' }, el('span', { class: 'empty-symbol', 'aria-hidden': 'true' }, '⊕'), el('h2', {}, 'An open file. A blank page.'), paragraph('Inspect a room to collect your first record.'), button('Explore the museum →', () => go('explore'), { class: 'primary' })));
}
function notebook() {
  const grid = kind => {
    const columns = kind === 'room' ? session.game.rooms.map(r => r.short) : session.game.badges;
    return el('div', { class: 'matrix-wrap', role: 'region', 'aria-label': `${kind} deduction grid`, tabindex: '0' },
      el('table', { class: 'matrix' }, el('caption', {}, kind === 'room' ? 'Who was where?' : 'Who wore which badge?'),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Suspect'), ...columns.map(c => el('th', { scope: 'col' }, c)))),
        el('tbody', {}, ...session.game.suspects.map(p => el('tr', {}, el('th', { scope: 'row' }, p.name), ...columns.map((c, i) => {
          const key = `${p.id}:${kind}:${i}`;
          const value = session.marks[key] || 'unknown';
          const conflicting = notebookResult?.keys.includes(key);
          return el('td', {}, button(value === 'yes' ? '✓' : value === 'no' ? '×' : '·', () => {
            const next = value === 'unknown' ? 'yes' : value === 'yes' ? 'no' : null;
            if (next) session.marks[key] = next; else delete session.marks[key];
            notebookResult = null; persist(); render(); announce(`${p.name}, ${c}: ${next || 'unknown'}.`);
          }, { class: `mark ${value} ${conflicting ? 'conflict' : ''}`, id: `mark-${key}`, 'aria-label': `${p.name}, ${c}: ${value}${conflicting ? ', conflicting' : ''}`, title: 'Cycle unknown → yes → no → unknown' }));
        }))))));
  };
  const notes = el('textarea', { id: 'notes', maxlength: 2000, rows: 5, placeholder: 'What connects the room records to the badges?', oninput: event => { session.notes = event.target.value; persist(); } }, session.notes);
  return el('section', {}, title('YOUR WORKING THEORY', 'Deduction notebook', 'Tap a cell to cycle · unknown → ✓ yes → × no. Your marks never change the evidence.'),
    el('div', { class: 'notebook-grids' }, grid('room'), grid('badge')),
    el('div', { class: 'button-row' }, button('Check my deductions', () => { notebookResult = checkNotebook(session); render(); announce(notebookResult.text); }, { class: 'primary', id: 'check-notebook' }),
      button('Clear marks', () => { session.marks = {}; notebookResult = null; persist(); render(); announce('Notebook marks cleared.'); }, { class: 'secondary', id: 'clear-marks' })),
    notebookResult && el('div', { class: `feedback ${notebookResult.conflict ? 'warning' : ''}`, role: 'status' }, el('h2', {}, notebookResult.conflict ? 'A contradiction in the notebook' : 'Notebook checked'), paragraph(notebookResult.text)),
    el('div', { class: 'notes-panel' }, el('label', { for: 'notes' }, 'Field notes'), paragraph('Private to this device and any save file you export. Maximum 2,000 characters.', 'fine-print'), notes));
}
function citations(evidence) {
  return el('div', { class: 'citations' }, ...evidence.map(e => el('div', { class: 'citation' }, button(e.id, () => { view = 'evidence'; render(); document.querySelector(`#record-${e.id}`).focus(); }, { class: 'citation-link', 'aria-label': `Read evidence ${e.id}` }), paragraph(e.text))));
}
function outcomePanel(result) {
  return el('div', { class: `feedback outcome ${result.outcome === 'correct' ? 'success' : ''}`, role: 'status' }, eyebrow(result.outcome === 'correct' ? 'ESTABLISHED BY THE RECORDS' : 'INVESTIGATION REMAINS OPEN'), el('h2', {}, result.title), paragraph(result.text), citations(result.evidence),
    result.eliminations && el('details', {}, el('summary', {}, 'Why the other three suspects are excluded'), ...result.eliminations.map(ex => el('section', { class: 'exclusion' }, el('h3', {}, session.game.suspects[ex.suspect].name), paragraph('No assignment satisfying these records puts this person in the gallery. This is an exhaustive deduction using the briefing rules.'), citations(ex.evidence)))),
    result.outcome === 'correct' && paragraph('The silver astrolabe can return to its cradle. The museum will open in the morning; your evidence file will remember how this evening ended.', 'epilogue'));
}
function accusation() {
  if (!accusationResult && session.attempts.length) {
    const last = session.attempts.at(-1);
    accusationResult = evaluateAccusation({ ...session, collected: last.evidence }, last.suspect);
  }
  const select = el('select', { id: 'accused', required: true }, el('option', { value: '' }, 'Select a suspect'), ...session.game.suspects.map(p => el('option', { value: p.id }, p.name)));
  return el('section', {}, title('PUT THE FACTS TOGETHER', session.completed ? 'The case is closed' : 'Make an accusation', 'Who was in the Moon Gallery at 21:00? The evidence must leave only one possible answer.'),
    !session.completed && el('form', { class: 'accusation-form', onsubmit: event => { event.preventDefault(); if (!select.value) return; accusationResult = accuse(session, Number(select.value)); persist(); render(); announce(`${accusationResult.title}. ${accusationResult.text}`); } },
      el('label', { for: 'accused' }, 'I accuse…'), el('div', { class: 'seed-row' }, select, el('button', { type: 'submit', class: 'primary', id: 'submit-accusation' }, 'Present accusation')),
      paragraph('A wrong or unproved accusation keeps the case open. No penalties. Explanations use only records you have collected.', 'fine-print')),
    accusationResult && outcomePanel(accusationResult),
    session.completed && el('div', { class: 'button-row' }, button('Review the evidence', () => go('evidence'), { class: 'secondary' }), button('Return to case desk →', () => go('desk'), { class: 'primary' })));
}
function hintPanel() {
  return el('details', { class: 'hint-panel', open: Boolean(hintResult) }, el('summary', {}, 'Need a nudge?'), paragraph('Choose how much help you want. Deductions cite only the evidence in your file.', 'fine-print'),
    el('div', { class: 'button-row' }, ...['A place to look', 'Show a deduction', 'Explain the conclusion'].map((text, level) => button(text, () => { hintResult = hint(session, level); render(); announce(`${hintResult.title}. ${hintResult.text}`); }, { class: 'secondary', id: `hint-${level}` }))),
    hintResult && el('div', { class: 'hint-result', role: 'status' }, el('h3', {}, hintResult.title), paragraph(hintResult.text), citations(hintResult.evidence)));
}
function footer() {
  return el('footer', { class: 'footer' }, el('span', { id: 'save-status' }, session ? saveStatus : 'A local, self-contained mystery'),
    session && view !== 'desk' ? button('Restart this seed', () => {
      if (!window.confirm('Restart this seed and clear its collected evidence and notebook?')) return;
      session = newSession(session.game.seed); resetViews(); persist(); go('explore'); announce('Case restarted with the same seed.');
    }, { class: 'text-button', id: 'restart-case' }) : el('span', {}, 'No account. No network. Just evidence.'));
}
function exportSave() {
  const blob = new Blob([serialize(session)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: 'casebook-save.json' });
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('Save file exported.');
}
async function importSave(event) {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > MAX_SAVE_BYTES) throw new Error('Save file is too large (maximum 64 KiB).');
    const imported = deserialize(await file.text());
    if ((session || saved) && !window.confirm('Replace the current local case with this imported save?')) return;
    session = imported; resetViews(); persist(); go(session.completed ? 'accusation' : 'explore'); announce('Save imported and checked.');
  } catch (error) { notice = `Import failed: ${error.message} Your current case has not changed.`; render(); announce(notice); }
}
render();
