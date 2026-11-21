import { fallbackThumbnailsById } from "./thumbnail-data.js?v=477395226372dddc";
import { normalizeDisplayTypography, formatTagLabel } from "./tables.js?v=477395226372dddc";
import {
  groupProjectMedia, imageSource, mediaKind, parseProjectTags, videoFrameRatio,
} from "./project-details.js?v=477395226372dddc";
import { thumbnailsById } from "./thumbnail-data.js?v=477395226372dddc";

const fallbackThumbnail = { kind: 'placeholder', ratio: '16 / 9', label: '16:9' };
const landscapeRatio = 16 / 9;

export function projectReference(id) {
  const match = /^(commercial|personal)-(\d+)$/.exec(String(id));
  if (!match) return null;
  return { letter: match[1] === 'commercial' ? 'C' : 'P', number: match[2] };
}

export function projectReferenceLabel(id, mode) {
  const reference = projectReference(id);
  if (!reference) return '';
  const separator = mode === 'grid-d' || mode === 'list' ? '' : '.';
  return `${reference.letter}${separator}${reference.number}`;
}

function setThumbnailRatio(button, slot, ratio) {
  button.style.setProperty('--thumbnail-width-factor', String(Math.min(1, ratio / landscapeRatio)));
  slot.dataset.align = 'start';
}

export function projectsForTag(tag, commercialProjects, personalProjects, detailsById) {
  const wanted = String(tag ?? '').trim().toUpperCase();
  if (!wanted) return [];
  return [commercialProjects, personalProjects]
    .flatMap(section => [...section].sort((a, b) => a.displayOrder - b.displayOrder))
    .filter(project => parseProjectTags(detailsById[project.id]?.tags).includes(wanted));
}

export function thumbnailForProject(projectId, mediaById, thumbnails = thumbnailsById) {
    const thumbnail = thumbnails[projectId];
    if (thumbnail && imageSource(thumbnail.src)) return { kind: 'image', ...thumbnail };
    return { ...(fallbackThumbnailsById[projectId] ?? { kind: 'placeholder', ratio: '16 / 9', label: '16:9' }) };
  }

function appendPlaceholder(slot, button, thumbnail) {
  const placeholder = document.createElement('span');
  placeholder.className = 'tag-result-thumbnail-placeholder';
  placeholder.dataset.ratio = thumbnail.label;
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.textContent = thumbnail.label;
  const [width, height] = thumbnail.ratio.split('/').map(Number);
  setThumbnailRatio(button, slot, width / height);
  slot.replaceChildren(placeholder);
}

export function createTagResults(tag, projects, mediaById, mode = 'grid-b', { canGoBack = false } = {}) {
  const section = document.createElement('section');
  section.className = 'tag-results';
  section.dataset.tag = tag;
  section.dataset.mode = mode;

  const header = document.createElement('header');
  header.className = 'tag-results-header';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'tag-results-eyebrow';
  eyebrow.textContent = 'Tags';
  const summary = document.createElement('div');
  summary.className = 'tag-results-summary';
  const title = document.createElement('h2');
  title.className = 'tag-results-title';
  title.textContent = `(${formatTagLabel(tag)})`;
  const count = document.createElement('p');
  count.className = 'tag-results-count';
  count.textContent = `(${String(projects.length).padStart(2, '0')})`;
  summary.append(title, count);
  header.append(eyebrow, summary);
  if (canGoBack) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'tag-results-back';
    back.textContent = '← Back';
    summary.append(back);
  }

  const list = document.createElement('div');
  list.className = 'tag-results-list';
  for (const project of projects) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-result-project';
    button.dataset.projectId = project.id;
    const slot = document.createElement('span');
    slot.className = 'tag-result-thumbnail-slot';
    const thumbnail = thumbnailForProject(project.id, mediaById);
    if (thumbnail.kind === 'image') {
      const image = document.createElement('img');
      image.className = 'tag-result-thumbnail-image';
      image.alt = '';
      image.loading = 'lazy';
      if (thumbnail.width && thumbnail.height) setThumbnailRatio(button, slot, thumbnail.width / thumbnail.height);
      image.addEventListener('load', () => {
        if (image.naturalWidth && image.naturalHeight) setThumbnailRatio(button, slot, image.naturalWidth / image.naturalHeight);
      });
      image.addEventListener('error', () => {
        const fallback = thumbnailForProject(project.id, mediaById, {});
        appendPlaceholder(slot, button, fallback.kind === 'placeholder' ? fallback : fallbackThumbnail);
      }, { once: true });
      image.src = thumbnail.src;
      slot.append(image);
    } else {
      appendPlaceholder(slot, button, thumbnail);
    }
    const caption = document.createElement('span');
    caption.className = 'tag-result-project-caption';
    const referenceLine = document.createElement('span');
    referenceLine.className = 'tag-result-project-reference';
    referenceLine.textContent = projectReferenceLabel(project.id, mode);
    const projectTitle = document.createElement('span');
    projectTitle.className = 'tag-result-project-title';
    projectTitle.textContent = normalizeDisplayTypography(project.title);
    caption.append(referenceLine, projectTitle);
    button.append(slot, caption);
    list.append(button);
  }
  if (!projects.length) {
    const empty = document.createElement('p');
    empty.className = 'tag-results-empty';
    empty.textContent = 'No projects with this tag yet.';
    list.append(empty);
  }
  section.append(header, list);
  return section;
}
