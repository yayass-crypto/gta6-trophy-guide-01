// Leonida Legends — offline GTA VI trophy guide + tracker.
// Plain static app: it fetches only its own data/trophies.json, keeps the
// checklist in localStorage, and never reaches for the network at runtime.

const DATA_URL = 'data/trophies.json';
const SAVE_KEY = 'leonida-legends-v1';
const TOTAL_TROPHIES = 55;

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

const STAGE_PLANS = {
  1: {
    title: 'Stage 1 — Story',
    hours: '60–80 hours · 14 trophies',
    detail: 'Play the five chapters in order. Keep a manual save at the start and end of each chapter, and one more before the final mission. Grab the Chapter 1 balcony meditation (see the missable warning) and the Chapter 2 bowling valuables while you are there.',
  },
  2: {
    title: 'Stage 2 — 100% checklist',
    hours: 'About 100 hours · 25 trophies',
    detail: 'After the story, open Progress → Stats → 100% Completion and work it block by block: 100 optional missions, scan 200 of 277 vehicles, study 100 of 255 animals with binoculars, and 70 of 80 challenges. This is where A Long Road (gold) lands.',
  },
  3: {
    title: 'Stage 3 — Strangers & clean-up',
    hours: 'About 10 hours · 16 trophies',
    detail: 'Finish the stranger strands (Andy, Kenton, Billy, Randy, Tyrone, Bret, Cal, Kirk, Kyle, Yago, Pilot Pete), the partner robberies, and the money trophies. The five unconfirmed trophies wait here too — this guide updates them once a verified method is published.',
  },
};

// Demo states used only for the ?shot= screenshots. They live in memory:
// a staged view never reads or writes localStorage.
const SHOT_STATES = {
  cover: {
    earned: [2, 3, 4, 5, 8, 9, 15, 19, 21, 28, 35, 42, 46, 53],
    openGuideId: 1,
    spoilerOn: true,
  },
  spoiler: {
    earned: [8],
    openGuideId: 8,
    spoilerOn: true,
  },
  missable: {
    earned: [],
    openGuideId: 28,
    spoilerOn: true,
    kind: 'missable',
  },
};

const state = {
  trophies: [],
  earned: new Set(),
  spoilerOn: true,
  kind: 'all',
  grade: 'all',
  earnedFilter: 'all',
  query: '',
  view: 'checklist',
  openGuideId: null,
  staged: false,
};

const $ = (id) => document.getElementById(id);

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function isStoryHidden(trophy) {
  return state.spoilerOn && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

async function loadTrophyData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('Could not load ' + DATA_URL);
  const data = await response.json();
  return data.trophies;
}

function readSavedProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { earned: [], spoilerOn: true };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      spoilerOn: parsed.spoilerOn !== false,
    };
  } catch {
    return { earned: [], spoilerOn: true };
  }
}

function saveProgress() {
  if (state.staged) return; // staged screenshots never persist anything
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      earned: [...state.earned].sort((a, b) => a - b),
      spoilerOn: state.spoilerOn,
    }));
  } catch {
    // Private browsing or full storage: the tracker still works in memory.
  }
}

function applyShotStaging() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot === 'roadmap') {
    state.staged = true;
    state.view = 'roadmap';
    return;
  }
  const demo = SHOT_STATES[shot];
  if (!demo) return;
  state.staged = true;
  document.body.classList.add('shot-' + shot);
  state.earned = new Set(demo.earned);
  state.openGuideId = demo.openGuideId;
  state.spoilerOn = demo.spoilerOn;
  if (demo.kind) state.kind = demo.kind;
}

function renderGradeOptions() {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of state.trophies) counts[trophy.grade] += 1;
  const select = $('gradeSelect');
  const options = [
    ['all', 'All grades (' + TOTAL_TROPHIES + ')'],
    ['platinum', 'Platinum (' + counts.platinum + ')'],
    ['gold', 'Gold (' + counts.gold + ')'],
    ['silver', 'Silver (' + counts.silver + ')'],
    ['bronze', 'Bronze (' + counts.bronze + ')'],
  ];
  select.replaceChildren();
  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  select.value = state.grade;
}

function updateProgressBar() {
  const earnedByGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of state.trophies) {
    if (state.earned.has(trophy.id)) earnedByGrade[trophy.grade] += 1;
  }
  const earnedCount = state.earned.size;
  const percent = Math.round((earnedCount / TOTAL_TROPHIES) * 100);
  $('progressCount').textContent = earnedCount + ' / ' + TOTAL_TROPHIES + ' earned';
  $('progressPercent').textContent = percent + '%';
  $('progressFill').style.width = percent + '%';
  $('progressGrades').textContent =
    'Platinum ' + earnedByGrade.platinum + '/1 · Gold ' + earnedByGrade.gold +
    '/2 · Silver ' + earnedByGrade.silver + '/6 · Bronze ' + earnedByGrade.bronze + '/46';
}

function renderStatsRow() {
  const counts = { story: 0, collectibles: 0, activities: 0 };
  for (const trophy of state.trophies) counts[trophy.kind] = (counts[trophy.kind] || 0) + 1;
  const missableCount = state.trophies.filter((t) => t.missable).length;
  const cards = [
    ['55', 'trophies · 1 platinum, 2 gold, 6 silver, 46 bronze'],
    [String(counts.story), 'story'],
    [String(counts.collectibles), 'collectibles'],
    [String(counts.activities), 'activities'],
    [String(missableCount), 'missable — see the warning'],
    ['0', 'online — all 55 single-player'],
  ];
  const row = $('statsRow');
  row.replaceChildren();
  for (const [value, label] of cards) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const valueEl = document.createElement('div');
    valueEl.className = 'stat-value';
    valueEl.textContent = value;
    const labelEl = document.createElement('div');
    labelEl.className = 'stat-label';
    labelEl.textContent = label;
    card.append(valueEl, labelEl);
    row.append(card);
  }
}

function renderKindChips() {
  const counts = { all: state.trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const trophy of state.trophies) {
    counts[trophy.kind] += 1;
    if (trophy.missable) counts.missable += 1;
  }
  const row = $('kindChips');
  row.replaceChildren();
  for (const kind of ['all', 'story', 'missable', 'collectibles', 'activities', 'online']) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'kind-chip' + (state.kind === kind ? ' active' : '');
    chip.textContent = (kind === 'all' ? 'All' : KIND_LABELS[kind]) + ' (' + counts[kind] + ')';
    chip.addEventListener('click', () => {
      state.kind = kind;
      renderKindChips();
      renderTrophyList();
    });
    row.append(chip);
  }
}

function trophyMatchesFilters(trophy) {
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind === 'online') return false; // no online trophies exist
  if (state.kind !== 'all' && state.kind !== 'missable' && trophy.kind !== state.kind) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.earnedFilter === 'earned' && !state.earned.has(trophy.id)) return false;
  if (state.earnedFilter === 'unearned' && state.earned.has(trophy.id)) return false;
  if (state.query) {
    const haystack = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide).toLowerCase();
    if (!haystack.includes(state.query)) return false;
  }
  return true;
}

function trophyCardElement(trophy) {
  const earned = state.earned.has(trophy.id);
  const hidden = isStoryHidden(trophy);

  const item = document.createElement('li');
  item.className = 'trophy-card' + (earned ? ' earned-card' : '') + (trophy.missable ? ' missable-card' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'earned-checkbox';
  checkbox.checked = earned;
  checkbox.setAttribute('aria-label', 'Mark ' + (hidden ? 'story trophy' : trophy.name) + ' earned');
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) state.earned.add(trophy.id);
    else state.earned.delete(trophy.id);
    saveProgress();
    updateProgressBar();
    renderTrophyList();
  });

  const badge = document.createElement('span');
  badge.className = 'grade-badge grade-badge-' + trophy.grade;
  badge.title = gradeLabel(trophy.grade);
  const badgeText = document.createElement('span');
  badgeText.textContent = trophy.grade === 'platinum' ? 'Plat' : trophy.grade.slice(0, 4);
  badge.append(badgeText);

  const body = document.createElement('div');
  body.className = 'trophy-body';

  const nameEl = document.createElement('h3');
  nameEl.className = 'trophy-name';
  nameEl.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  if (earned) {
    const mark = document.createElement('span');
    mark.className = 'earned-mark';
    mark.textContent = ' ✓';
    nameEl.append(mark);
  }

  const descEl = document.createElement('p');
  descEl.className = 'trophy-description';
  descEl.textContent = hidden
    ? 'Hidden story trophy — earn it to reveal. (Spoilers are on.)'
    : '“' + trophy.description + '”';

  const meta = document.createElement('p');
  meta.className = 'trophy-meta';
  const kindTag = document.createElement('span');
  kindTag.className = 'meta-tag';
  kindTag.textContent = KIND_LABELS[trophy.kind] || trophy.kind;
  const gradeTag = document.createElement('span');
  gradeTag.className = 'meta-tag';
  gradeTag.textContent = gradeLabel(trophy.grade);
  const stageTag = document.createElement('span');
  stageTag.className = 'meta-tag';
  stageTag.textContent = 'Roadmap Stage ' + trophy.roadmap;
  meta.append(kindTag, gradeTag, stageTag);
  if (typeof trophy.count === 'number') {
    const countTag = document.createElement('span');
    countTag.className = 'meta-tag';
    countTag.textContent = 'Target: ' + trophy.count.toLocaleString('en-US');
    meta.append(countTag);
  }
  if (trophy.missable) {
    const missTag = document.createElement('span');
    missTag.className = 'meta-tag meta-tag-missable';
    missTag.textContent = '⚠ MISSABLE';
    meta.append(missTag);
  }

  body.append(nameEl, descEl, meta);

  if (hidden) {
    const note = document.createElement('p');
    note.className = 'spoiler-hidden-note';
    note.textContent = 'Guide hidden until this trophy is earned — or turn “Hide story spoilers” off to read it.';
    body.append(note);
  } else {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    const open = state.openGuideId === trophy.id;
    toggle.textContent = open ? 'Hide guide ▲' : 'Read the guide ▼';
    toggle.addEventListener('click', () => {
      state.openGuideId = open ? null : trophy.id;
      renderTrophyList();
    });
    body.append(toggle);
    if (open) {
      const panel = document.createElement('div');
      panel.className = 'guide-panel';
      const guideText = document.createElement('p');
      guideText.textContent = trophy.guide;
      panel.append(guideText);
      const sources = document.createElement('p');
      sources.className = 'guide-sources';
      sources.textContent = 'Sources: ';
      trophy.sources.forEach((source, index) => {
        if (index > 0) sources.append(document.createTextNode(' · '));
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = source.name;
        sources.append(link);
      });
      panel.append(sources);
      body.append(panel);
    }
  }

  item.append(checkbox, badge, body);
  return item;
}

function renderTrophyList() {
  const list = $('trophyList');
  const visible = state.trophies.filter(trophyMatchesFilters);
  list.replaceChildren();
  for (const trophy of visible) list.append(trophyCardElement(trophy));
  $('listCount').textContent = 'Showing ' + visible.length + ' of ' + TOTAL_TROPHIES + ' trophies'
    + (state.kind === 'online' ? ' — there are no online trophies.' : '');
  const empty = $('emptyNote');
  if (visible.length === 0) {
    empty.hidden = false;
    empty.textContent = state.kind === 'online'
      ? 'No online trophies — all 55 are single-player. Nothing to grind online, nothing to miss while the servers are quiet.'
      : 'No trophies match these filters. Clear the search or pick another kind.';
  } else {
    empty.hidden = true;
  }
}

function renderRoadmapStages() {
  const grid = $('stageGrid');
  grid.replaceChildren();
  for (const stage of [1, 2, 3]) {
    const plan = STAGE_PLANS[stage];
    const members = state.trophies.filter((t) => t.roadmap === stage);
    const card = document.createElement('article');
    card.className = 'stage-card';
    const title = document.createElement('h3');
    title.textContent = plan.title;
    const hours = document.createElement('p');
    hours.className = 'stage-hours';
    hours.textContent = plan.hours;
    const names = document.createElement('p');
    names.className = 'stage-trophies';
    members.forEach((trophy, index) => {
      if (index > 0) names.append(document.createTextNode(' · '));
      const name = document.createElement('span');
      if (trophy.grade !== 'bronze') name.className = 'stage-grade-' + trophy.grade;
      name.textContent = trophy.name;
      names.append(name);
    });
    const detail = document.createElement('p');
    detail.className = 'stage-detail';
    detail.textContent = plan.detail;
    card.append(title, hours, names, detail);
    grid.append(card);
  }
}

function renderViewTabs() {
  $('tabChecklist').classList.toggle('active', state.view === 'checklist');
  $('tabRoadmap').classList.toggle('active', state.view === 'roadmap');
  $('checklistView').hidden = state.view !== 'checklist';
  $('roadmapView').hidden = state.view !== 'roadmap';
}

function exportProgressFile() {
  const payload = {
    guide: 'Leonida Legends — GTA VI Trophy Guide & Tracker',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    total: TOTAL_TROPHIES,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-legends-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('saveNote').textContent = 'Exported ' + payload.earned.length + ' earned trophies as JSON.';
}

function importProgressFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed.earned) ? parsed.earned : parsed;
      if (!Array.isArray(ids)) throw new Error('No earned list found');
      const valid = new Set(state.trophies.map((t) => t.id));
      const next = new Set();
      for (const id of ids) {
        const n = Number(id);
        if (valid.has(n)) next.add(n);
      }
      state.earned = next;
      saveProgress();
      updateProgressBar();
      renderTrophyList();
      $('saveNote').textContent = 'Imported ' + next.size + ' earned trophies.';
    } catch {
      $('saveNote').textContent = 'Import failed — that file is not a Leonida Legends progress export.';
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!window.confirm('Reset your checklist? All earned ticks will be cleared.')) return;
  state.earned = new Set();
  saveProgress();
  updateProgressBar();
  renderTrophyList();
  $('saveNote').textContent = 'Progress reset. Your checklist is empty again.';
}

function wireControls() {
  $('tabChecklist').addEventListener('click', () => {
    state.view = 'checklist';
    renderViewTabs();
  });
  $('tabRoadmap').addEventListener('click', () => {
    state.view = 'roadmap';
    renderViewTabs();
  });
  $('gradeSelect').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderTrophyList();
  });
  $('earnedSelect').addEventListener('change', (event) => {
    state.earnedFilter = event.target.value;
    renderTrophyList();
  });
  $('searchInput').addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderTrophyList();
  });
  $('spoilerToggle').addEventListener('change', (event) => {
    state.spoilerOn = event.target.checked;
    saveProgress();
    renderTrophyList();
  });
  $('exportBtn').addEventListener('click', exportProgressFile);
  $('importFile').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgressFile(file);
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', resetProgress);
}

function renderAll() {
  updateProgressBar();
  renderStatsRow();
  renderKindChips();
  renderGradeOptions();
  renderTrophyList();
  renderRoadmapStages();
  renderViewTabs();
  $('spoilerToggle').checked = state.spoilerOn;
}

async function startLeonidaLegends() {
  state.trophies = await loadTrophyData();
  applyShotStaging();
  if (!state.staged) {
    const saved = readSavedProgress();
    state.earned = new Set(saved.earned);
    state.spoilerOn = saved.spoilerOn;
  }
  wireControls();
  renderAll();
  window.__shotReady = true;
}

startLeonidaLegends().catch((error) => {
  document.getElementById('trophyList').innerHTML =
    '<li class="empty-note">The trophy list could not be loaded (' + error.message + '). Open this guide from its own folder so data/trophies.json loads.</li>';
  window.__shotReady = true;
});
