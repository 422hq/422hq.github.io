const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
export const displayValue = value => Array.isArray(value) ? value.join(', ') : String(value ?? '');
const smallCapitals = {
  'ᴀ': 'A', 'ʙ': 'B', 'ᴄ': 'C', 'ᴅ': 'D', 'ᴇ': 'E', 'ꜰ': 'F',
  'ɢ': 'G', 'ʜ': 'H', 'ɪ': 'I', 'ᴊ': 'J', 'ᴋ': 'K', 'ʟ': 'L',
  'ᴍ': 'M', 'ɴ': 'N', 'ᴏ': 'O', 'ᴘ': 'P', 'ʀ': 'R', 'ꜱ': 'S',
  'ᴛ': 'T', 'ᴜ': 'U', 'ᴠ': 'V', 'ᴡ': 'W', 'ʏ': 'Y', 'ᴢ': 'Z',
};
const styledLatin = /[\u{1D400}-\u{1D7FF}ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀꜱᴛᴜᴠᴡʏᴢ]/gu;


export function normalizeDisplayTypography(value) {
  return displayValue(value).replace(styledLatin, character => smallCapitals[character] ?? character.normalize('NFKC'));
}

const tagAcronyms = new Set(['AI', '2D', '3D', 'CGI', 'VFX', 'AR', 'VR', 'UI', 'UX']);

export function formatTagLabel(value) {
  return normalizeDisplayTypography(value).replace(/[A-Za-z0-9]+/g, word => {
    const upper = word.toUpperCase();
    if (tagAcronyms.has(upper)) return upper;
    if (/[a-z]/.test(word) && /[A-Z]/.test(word)) return word;
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  });
}
const firstRolePriority = new Map([['director', 0], ['assistant director', 1], ['editor', 2]]);
const rolePriority = new Map([
  'director', 'editor', 'post production supervisor', 'color grading',
  'visual effects', '2d artwork', 'motion graphics', 'beauty retouching',
].map((role, index) => [role, index]));

const listParts = value => displayValue(value).split(',').map(part => part.trim().toLowerCase()).filter(Boolean);
const displayOrder = record => Number(record.displayOrder);

export function compareRoles(a, b) {
  const aParts = listParts(a.role);
  const bParts = listParts(b.role);
  const aFirst = aParts[0] ?? '';
  const bFirst = bParts[0] ?? '';
  const aPriority = firstRolePriority.get(aFirst) ?? 3;
  const bPriority = firstRolePriority.get(bFirst) ?? 3;

  if (aPriority !== bPriority) return aPriority - bPriority;
  for (let index = 0; index < Math.min(aParts.length, bParts.length); index += 1) {
    const aRank = rolePriority.get(aParts[index]) ?? rolePriority.size;
    const bRank = rolePriority.get(bParts[index]) ?? rolePriority.size;
    if (aRank !== bRank) return aRank - bRank;
    if (aRank === rolePriority.size) {
      const unknownRoleOrder = collator.compare(aParts[index], bParts[index]);
      if (unknownRoleOrder) return unknownRoleOrder;
    }
  }
  if (aParts.length !== bParts.length) return bParts.length - aParts.length;
  return displayOrder(a) - displayOrder(b);
}

export function compareTools(a, b) {
  const rank = record => {
    const tools = listParts(record.tools);
    const names = new Set(tools);
    const premiere = names.has('premiere pro');
    const afterEffects = names.has('after effects');
    if (premiere && afterEffects) return 0;
    if (premiere && names.has('davinci resolve')) return 1;
    if (premiere) return 2;
    if (afterEffects) return 3;
    return tools.length ? 4 : 5;
  };
  return rank(a) - rank(b) || displayOrder(a) - displayOrder(b);
}

export function sortRecords(records, key, direction) {
  if (key === 'role' || key === 'tools') {
    const sorted = [...records].sort(key === 'role' ? compareRoles : compareTools);
    return direction === 'descending' ? sorted.reverse() : sorted;
  }
  const multiplier = direction === 'ascending' ? 1 : -1;
  return [...records].sort((a, b) => multiplier * (key === 'year'
    ? Number(a[key]) - Number(b[key])
    : collator.compare(displayValue(a[key]), displayValue(b[key]))));
}

export function renderRows(tbody, records, columns) {
  const fragment = document.createDocumentFragment();
  for (const project of records) {
    const row = document.createElement('tr');
    row.dataset.projectId = project.id;
    for (const { key } of columns) {
      const cell = document.createElement('td');
      if (key === 'title') cell.className = 'project-title';
      const content = document.createElement('span');
      content.className = 'cell-scroll';
      content.textContent = normalizeDisplayTypography(project[key]);
      cell.append(content);
      row.append(cell);
    }
    fragment.append(row);
  }
  tbody.replaceChildren(fragment);
}

export function createTable({ records, columns, name, className, sortable = false, onSort }) {
  const table = document.createElement('table');
  table.className = className;
  const caption = table.createCaption();
  caption.className = 'sr-only';
  caption.textContent = name;
  const colgroup = document.createElement('colgroup');
  for (const { key } of columns) {
    const col = document.createElement('col');
    col.className = `col-${key}`;
    colgroup.append(col);
  }
  table.append(colgroup);
  const headerRow = table.createTHead().insertRow();
  const tbody = table.createTBody();

  let activeKey = null;
  let direction = 'ascending';
  for (const { key, label } of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    if (sortable) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sort-button';
      button.dataset.sortKey = key;
      button.setAttribute('aria-label', `${label}: sort ascending`);
      const text = document.createElement('span');
      text.className = 'column-label';
      text.textContent = label;
      const arrow = document.createElement('span');
      arrow.className = 'sort-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(text, arrow);
      button.addEventListener('click', () => {
        direction = activeKey === key && direction === 'ascending' ? 'descending' : 'ascending';
        activeKey = key;
        renderRows(tbody, sortRecords(records, key, direction), columns);
        for (const header of headerRow.cells) {
          const control = header.querySelector('button');
          const selected = control.dataset.sortKey === activeKey;
          header.removeAttribute('aria-sort');
          if (selected) header.setAttribute('aria-sort', direction);
          control.querySelector('.sort-arrow').textContent = selected ? (direction === 'ascending' ? '↑' : '↓') : '';
          const nextDirection = selected && direction === 'ascending' ? 'descending' : 'ascending';
          control.setAttribute('aria-label', `${control.querySelector('.column-label').textContent}: sort ${nextDirection}`);
        }
        onSort?.(`${name} sorted by ${label}, ${direction}.`);
      });
      th.append(button);
    } else th.textContent = label;
    headerRow.append(th);
  }
  renderRows(tbody, records, columns);
  return table;
}
