import { siteInfo, commercialProjects, personalProjects, tags, soundCloud } from "./data.js?v=b3d46e990981b2e1";
import { createTable, normalizeDisplayTypography, formatTagLabel, addMobileScrollIndicator } from "./tables.js?v=b3d46e990981b2e1";
import { startClock } from "./clock.js?v=b3d46e990981b2e1";
import { getGlassesPreview } from "./glasses.js?v=b3d46e990981b2e1";
import { projectDetailsById } from "./project-details-data.js?v=b3d46e990981b2e1";
import { projectMediaById } from "./project-media-data.js?v=b3d46e990981b2e1";
import { createProjectDetail, imageSource, shouldOpenProject } from "./project-details.js?v=b3d46e990981b2e1";
import { createTagResults, projectsForTag } from "./tag-results.js?v=b3d46e990981b2e1";
import { introduction, englishIntroduction, contact } from "./info-content.js?v=b3d46e990981b2e1";

document.querySelector('#site').innerHTML = `
  <div class="viewport">
    <main class="left-pane">
      <header class="site-meta">
        <div class="site-meta-primary">
          <h1 id="site-name"></h1>
          <button class="info-trigger navigation-link" id="info-trigger" type="button" aria-controls="right-pane-content" aria-expanded="false"></button>
        </div>
        <div class="site-meta-secondary">
          <p id="site-location"></p>
          <time id="seoul-clock"><span class="clock-time"></span><span class="clock-date"></span></time>
        </div>
      </header>
      <div class="glasses-preview">
        <img id="glasses-preview" width="100" height="63" alt="">
      </div>
      <div class="archive-layout">
        <section class="archive-module commercial" id="commercial" aria-labelledby="commercial-heading" tabindex="-1">
          <div class="module-heading"><h2 id="commercial-heading">Commercial Projects<span class="count" id="commercial-count"></span></h2></div>
          <div class="table-frame commercial-frame" id="commercial-table" role="region" aria-label="Commercial projects table" tabindex="0"></div>
          <p id="sort-status" class="sr-only" role="status" aria-live="polite"></p>
        </section>
        <div class="secondary-records">
          <section class="archive-module personal" aria-labelledby="personal-heading">
            <div class="module-heading"><h2 id="personal-heading">Personal Projects<span class="count" id="personal-count"></span></h2></div>
            <div class="table-frame personal-frame" id="personal-table" role="region" aria-label="Personal projects table" tabindex="0"></div>
          </section>
          <section class="archive-module tags" aria-labelledby="tags-heading">
            <div class="module-heading"><h2 id="tags-heading">Tags<span class="count" id="tag-count"></span></h2></div>
            <div class="table-frame tag-frame" id="tag-table" role="region" aria-label="Tag counts table" tabindex="0"></div>
          </section>
        </div>
        <section class="archive-module sound" aria-labelledby="sound-heading">
          <div class="module-heading">
            <h2 id="sound-heading">Mixset</h2>
            <a id="soundcloud-profile" class="sound-profile-link navigation-link" target="_blank" rel="noopener noreferrer">SoundCloud ↗︎</a>
          </div>
          <div class="sound-frame">
            <iframe id="soundcloud-player" title="SoundCloud Mixset player" loading="eager" scrolling="no" allow="autoplay"></iframe>
          </div>
        </section>
      </div>
    </main>
    <aside class="right-pane" aria-label="Information panel">
      <div class="right-pane-body">
        <button class="mobile-index-back navigation-link" type="button" hidden>Index</button>
        <div class="right-pane-content" id="right-pane-content" aria-live="polite"></div>
        <footer class="right-pane-credits">
          <p>An ongoing archive of selected works.</p>
          <p>Site designed and maintained by Jung Yejin, 2026.</p>
        </footer>
      </div>
    </aside>
  </div>
`;

const commercialColumns = ['Year', 'Title', 'Role', 'Type', 'Tools', 'Client'].map(label => ({ key: label.toLowerCase(), label }));
const personalColumns = ['Year', 'Title', 'Type', 'Status'].map(label => ({ key: label.toLowerCase(), label }));
const commercialProjectsByDisplayOrder = [...commercialProjects].sort(
  (a, b) => a.displayOrder - b.displayOrder,
);
const personalProjectsByDisplayOrder = [...personalProjects].sort(
  (a, b) => a.displayOrder - b.displayOrder,
);
const personalRowsForDisplay = [
  ...personalProjectsByDisplayOrder,
  ...Array.from(
    { length: Math.max(0, 5 - personalProjectsByDisplayOrder.length) },
    (_, index) => ({ id: `personal-placeholder-${index + 1}` }),
  ),
];
const count = records => `(${String(records.length).padStart(2, '0')})`;
document.querySelector('#site-name').textContent = normalizeDisplayTypography(siteInfo.name);
document.querySelector('#site-location').textContent = normalizeDisplayTypography(siteInfo.location);
document.querySelector('#info-trigger').textContent = normalizeDisplayTypography(siteInfo.infoLabel);
document.querySelector('#commercial-count').textContent = count(commercialProjects);
document.querySelector('#personal-count').textContent = count(personalProjects);
document.querySelector('#tag-count').textContent = count(tags);

const glassesImage = document.querySelector('#glasses-preview');
const glassesPreview = getGlassesPreview();
glassesImage.src = glassesPreview.src;
glassesImage.alt = glassesPreview.alt;

document.querySelector('#commercial-table').append(createTable({
  records: commercialProjectsByDisplayOrder, columns: commercialColumns, name: 'Commercial projects',
  className: 'commercial-table', sortable: true,
  onSort: message => {
    document.querySelector('#sort-status').textContent = message;
    markCurrentRows();
  },
}));
document.querySelector('#personal-table').append(createTable({
  records: personalRowsForDisplay, columns: personalColumns, name: 'Personal projects', className: 'personal-table',
}));
const tagTable = document.createElement('table');
tagTable.className = 'tag-table';
const tagCaption = tagTable.createCaption();
tagCaption.className = 'sr-only';
tagCaption.textContent = 'Tag counts';
const tagBody = tagTable.createTBody();
for (const { name, count } of tags) {
  const row = tagBody.insertRow();
  row.dataset.tag = name;
  row.tabIndex = 0;
  row.insertCell().textContent = formatTagLabel(name);
  row.insertCell().textContent = count === '' || count == null ? '' : String(count).padStart(2, '0');
}
document.querySelector('#tag-table').append(tagTable);
const soundCloudPlayerUrl = new URL('https://w.soundcloud.com/player/');
for (const [key, value] of Object.entries({
  url: soundCloud.trackUrl,
  auto_play: 'false',
  show_artwork: 'false',
  show_user: 'false',
  show_playcount: 'false',
  show_comments: 'false',
  sharing: 'false',
  download: 'false',
  buying: 'false',
  color: '000000',
})) soundCloudPlayerUrl.searchParams.set(key, value);
document.querySelector('#soundcloud-player').src = soundCloudPlayerUrl;
document.querySelector('#soundcloud-profile').href = soundCloud.profileUrl;
startClock(document.querySelector('#seoul-clock'));

const projectsById = new Map([...commercialProjects, ...personalProjects].map(project => [project.id, project]));
const rightPane = document.querySelector('.right-pane');
const rightPaneContent = document.querySelector('#right-pane-content');
const rightPaneCredits = rightPane.querySelector('.right-pane-credits');
const infoTrigger = document.querySelector('#info-trigger');
const projectFrames = [document.querySelector('#commercial-table'), document.querySelector('#personal-table')];
const tagFrame = document.querySelector('#tag-table');
const mobileLayout = window.matchMedia('(max-width: 760px)');
const indexBack = rightPane.querySelector('.mobile-index-back');
for (const frame of [...projectFrames, tagFrame]) addMobileScrollIndicator(frame, mobileLayout);

const paneHistory = [];
let currentView = null;
let indexTarget = null;


for (const frame of [...projectFrames, tagFrame]) {
  let touch = null;
  frame.addEventListener('pointerdown', event => {
    touch = mobileLayout.matches && event.pointerType === 'touch'
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false } : null;
  }, { passive: true });
  frame.addEventListener('pointermove', event => {
    if (touch?.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) >= 5) touch.moved = true;
  }, { passive: true });
  frame.addEventListener('pointercancel', event => {
    if (touch?.id === event.pointerId) touch.moved = true;
  }, { passive: true });
  frame.addEventListener('scroll', () => { if (touch) touch.moved = true; }, { passive: true, capture: true });
  frame.addEventListener('click', event => {
    if (mobileLayout.matches && touch?.moved && event.detail > 0) event.stopImmediatePropagation();
    touch = null;
  }, { capture: true });
}

function arrangeMobileWebsiteLink() {
  if (currentView?.type !== 'project' || currentView.id !== 'personal-001') return;
  const article = rightPaneContent.querySelector('.project-detail');
  const title = article?.querySelector('.detail-title');
  const website = article?.querySelector('.detail-website')
    ?? [...(article?.children ?? [])].find(child => child.matches('.detail-media') && child.querySelector('a'));
  const link = website?.querySelector('a') ?? title?.querySelector('a');
  if (!title || !website || !link) return;
  website.classList.add('detail-website');
  website.hidden = mobileLayout.matches;
  title.classList.toggle('detail-title-with-website', mobileLayout.matches);
  (mobileLayout.matches ? title : website).append(link);
}
mobileLayout.addEventListener('change', arrangeMobileWebsiteLink);

function rememberIndexTarget(element) {
  const frame = element.closest('.table-frame');
  const top = element.getBoundingClientRect().top;
  return {
    projectId: element.dataset.projectId,
    tag: element.dataset.tag,
    info: element === infoTrigger,
    frameTop: frame?.scrollTop ?? 0,
    viewportTop: top >= 0 && top < window.innerHeight ? top : Math.min(160, window.innerHeight / 3),
  };
}

function indexElement(target) {
  if (target?.info) return infoTrigger;
  return [...document.querySelectorAll('tr[data-project-id], tr[data-tag]')].find(row =>
    target?.projectId ? row.dataset.projectId === target.projectId : row.dataset.tag === target?.tag);
}

function paneScrollTop() {
  return mobileLayout.matches
    ? Math.max(0, -rightPane.getBoundingClientRect().top)
    : rightPane.scrollTop;
}

function positionPane(scrollTop = 0) {
  if (mobileLayout.matches) {
    window.scrollTo({ top: window.scrollY + rightPane.getBoundingClientRect().top + scrollTop, behavior: 'instant' });
  } else rightPane.scrollTop = scrollTop;
}

indexBack.addEventListener('click', () => {
  const element = indexElement(indexTarget);
  if (!element || !mobileLayout.matches) return;
  const frame = element.closest('.table-frame');
  if (frame) {
    frame.scrollTop = indexTarget.frameTop;
    const head = frame.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const bounds = frame.getBoundingClientRect();
    const row = element.getBoundingClientRect();
    if (row.top < bounds.top + head) frame.scrollTop += row.top - bounds.top - head;
    else if (row.bottom > bounds.bottom) frame.scrollTop += row.bottom - bounds.bottom;
  }
  window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - indexTarget.viewportTop, behavior: 'instant' });
  if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
  element.focus({ preventScroll: true });
});

function markCurrentRows() {
  for (const frame of [...projectFrames, tagFrame]) {
    for (const row of frame.querySelectorAll('tr[data-project-id], tr[data-tag]')) {
      const type = row.hasAttribute('data-tag') ? 'tag' : 'project';
      const id = type === 'tag' ? row.dataset.tag.trim().toUpperCase() : row.dataset.projectId;
      if (currentView?.type === type && currentView.id === id) row.setAttribute('aria-current', 'page');
      else row.removeAttribute('aria-current');
    }
  }
}

function createInfoPage() {
  const section = document.createElement('section');
  section.className = 'info-page';
  const name = document.createElement('h2');
  name.textContent = siteInfo.name;

  const renderLine = parts => {
    const line = document.createElement('p');
    for (const part of parts) {
      if (typeof part === 'string') {
        line.append(part);
        continue;
      }
      const link = document.createElement('a');
      link.className = 'inline-link';
      link.textContent = part.text;
      link.href = part.href;
      if (link.protocol === 'https:') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      line.append(link);
    }
    return line;
  };

  const bio = document.createElement('div');
  bio.className = 'info-bio';
  bio.lang = 'ko';
  const profile = siteInfo.profile;
  bio.append(...(profile?.bioKo ?? introduction).map(renderLine));

  const translation = document.createElement('div');
  translation.className = 'info-bio';
  translation.lang = 'en';
  translation.append(...(profile?.bioEn ?? englishIntroduction).map(renderLine));

  const contacts = document.createElement('div');
  contacts.className = 'info-contact';
  const heading = document.createElement('h3');
  heading.textContent = 'Contact';
  const contactLines = profile ? [...profile.contactInstagram, ...profile.contactEmail] : contact;
  contacts.append(heading, ...contactLines.map(renderLine));
  section.append(name, bio, translation);
  if (siteInfo.infoImage) {
    const source = imageSource(siteInfo.infoImage);
    if (source) {
      const figure = document.createElement('figure');
      figure.className = 'info-image';
      const image = document.createElement('img');
      image.alt = '';
      image.addEventListener('load', () => { figure.style.maxWidth = `${image.naturalWidth}px`; });
      image.addEventListener('error', () => {
        void 0;
        figure.remove();
      });
      image.src = source;
      figure.append(image);
      if (siteInfo.infoImageCaption) {
        const caption = document.createElement('figcaption');
        caption.textContent = siteInfo.infoImageCaption;
        figure.append(caption);
      }
      section.append(figure);
    } else void 0;
  }
  section.append(contacts);
  return section;
}

function renderPane(view, scrollTop = 0) {
  currentView = view;
  let content;
  if (view.type === 'project') {
    content = createProjectDetail(projectsById.get(view.id), projectDetailsById[view.id], projectMediaById[view.id]);
  } else if (view.type === 'tag') {
    const projects = projectsForTag(view.id, commercialProjects, personalProjects, projectDetailsById);
    content = createTagResults(view.id, projects, projectMediaById, 'grid-b', { canGoBack: paneHistory.length > 0 });
  } else {
    content = createInfoPage();
  }
  for (const video of rightPaneContent.querySelectorAll('video')) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  rightPaneContent.replaceChildren(content);
  arrangeMobileWebsiteLink();
  rightPaneCredits.hidden = view.type !== 'info';
  rightPane.dataset.hasView = 'true';
  indexBack.hidden = !indexTarget;
  positionPane(scrollTop);
  infoTrigger.setAttribute('aria-expanded', String(view.type === 'info'));
  markCurrentRows();
  return content;
}

function navigatePane(view, source = null) {
  if (currentView?.type === view.type && currentView.id === view.id) {
    if (source) indexTarget = rememberIndexTarget(source);
    if (mobileLayout.matches) positionPane();
    return;
  }
  if (currentView) paneHistory.push({ view: currentView, scrollTop: paneScrollTop(), indexTarget });
  if (source) indexTarget = rememberIndexTarget(source);
  renderPane(view);
}

function showTagResults(tag, source = null) {
  navigatePane({ type: 'tag', id: String(tag).trim().toUpperCase() }, source);
}

infoTrigger.addEventListener('click', () => navigatePane({ type: 'info' }, infoTrigger));

for (const frame of projectFrames) {
  let pointerStart = null;
  frame.addEventListener('pointerdown', event => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  frame.addEventListener('click', event => {
    const row = event.target.closest('tr[data-project-id]');
    if (!row || !frame.contains(row)) return;
    const project = projectsById.get(row.dataset.projectId);
    if (!project) return;
    const distance = pointerStart ? Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) : 0;
    pointerStart = null;
    if (!shouldOpenProject(distance, Boolean(window.getSelection()?.toString()))) return;
    navigatePane({ type: 'project', id: project.id }, row);
  });
}

let tagPointerStart = null;
tagFrame.addEventListener('pointerdown', event => {
  tagPointerStart = { x: event.clientX, y: event.clientY };
});
tagFrame.addEventListener('click', event => {
  const row = event.target.closest('tr[data-tag]');
  if (!row || !tagFrame.contains(row)) return;
  const distance = tagPointerStart ? Math.hypot(event.clientX - tagPointerStart.x, event.clientY - tagPointerStart.y) : 0;
  tagPointerStart = null;
  if (shouldOpenProject(distance, Boolean(window.getSelection()?.toString()))) showTagResults(row.dataset.tag, row);
});
tagFrame.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('tr[data-tag]')) {
    event.preventDefault();
    showTagResults(event.target.dataset.tag, event.target);
  }
});

rightPaneContent.addEventListener('click', event => {
  if (event.target.closest('.tag-results-back')) {
    const previous = paneHistory.pop();
    if (previous) {
      indexTarget = previous.indexTarget;
      const restored = renderPane(previous.view, previous.scrollTop);
      restored.tabIndex = -1;
      restored.focus({ preventScroll: true });
    }
    return;
  }
  const tag = event.target.closest('.detail-tag[data-tag]');
  if (tag) {
    showTagResults(tag.dataset.tag);
    return;
  }
  const resultProject = event.target.closest('.tag-result-project[data-project-id]');
  if (resultProject) {
    const project = projectsById.get(resultProject.dataset.projectId);
    if (project) navigatePane({ type: 'project', id: project.id }, indexElement({ projectId: project.id }));
    return;
  }
});
