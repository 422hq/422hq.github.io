import { normalizeDisplayTypography, formatTagLabel } from "./tables.js?v=b3d46e990981b2e1";

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  let id = null;
  if (url.hostname === 'youtu.be') id = url.pathname.split('/')[1];
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v')
      : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(id ?? '')
    ? `https://www.youtube.com/embed/${id}?autoplay=0` : null;
}

function isYouTubeShortsUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return false;
  const url = new URL(safe);
  return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
    && /^\/shorts\/[a-zA-Z0-9_-]{11}\/?$/.test(url.pathname);
}

export function vimeoEmbedUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (!['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) return null;
  const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
  if (!id) return null;
  const player = new URL(`https://player.vimeo.com/video/${id}`);
  player.searchParams.set('autoplay', '0');
  for (const option of ['title', 'byline', 'portrait', 'badge', 'vimeo_logo']) {
    player.searchParams.set(option, '0');
  }
  if (url.searchParams.get('h')) player.searchParams.set('h', url.searchParams.get('h'));
  return player.href;
}

export function instagramEmbedUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (!['instagram.com', 'www.instagram.com'].includes(url.hostname)) return null;
  const post = url.pathname.match(/^\/(p|reel|tv)\/([\w-]+)(?:\/embed)?\/?$/);
  return post ? `https://www.instagram.com/${post[1]}/${post[2]}/embed/` : null;
}

function videoEmbedUrl(value) {
  return youtubeEmbedUrl(value) ?? vimeoEmbedUrl(value) ?? instagramEmbedUrl(value);
}

export function sliderScrollStops(offsets, maxScroll) {
  if (!offsets.length) return [];
  const limit = Math.max(0, maxScroll);
  const stops = [{ index: 0, left: 0 }];
  for (let index = 1; index < offsets.length; index += 1) {
    const left = Math.min(Math.max(0, offsets[index] - offsets[0]), limit);
    if (left > stops.at(-1).left + 1) stops.push({ index, left });
    if (left >= limit - 1) break;
  }
  return stops;
}

function localAssetSource(value) {
  if (typeof value !== 'string' || !/^(?:\.\/)?assets\//.test(value)) return null;
  const parts = value.replace(/^\.\//, '').split('/');
  return parts.every(part => part !== '..' && part !== '.' && /^[\w. -]+$/.test(part))
    ? value : null;
}

export function imageSource(value) {
  return safeExternalUrl(value) ?? localAssetSource(value);
}

function localVideoSource(value) {
  return /\.mp4$/i.test(value ?? '') ? localAssetSource(value) : null;
}

export function mediaKind(item) {
  const url = String(item?.mediaUrl ?? '');
  if (localVideoSource(url)) return 'local-video';
  if (/\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?|#|$)/i.test(url)) return 'image';
  const kind = String(item?.mediaType ?? '').trim().toLowerCase();
  if (['video', 'image', 'web'].includes(kind)) return kind;
  return !kind && videoEmbedUrl(url) ? 'video' : null;
}

export function mediaRenderIssue(item) {
  const declared = String(item.mediaType ?? '').trim().toLowerCase();
  if (declared && !['video', 'image', 'web'].includes(declared)) return `unsupported mediaType: ${declared}`;
  if (item.aspectRatio && !aspectRatioDimensions(item.aspectRatio)) return 'invalid aspectRatio (expected positive width:height)';
  if (!String(item.mediaUrl ?? '').trim()) return 'missing mediaUrl';
  const kind = mediaKind(item);
  const source = kind === 'local-video' ? localVideoSource(item.mediaUrl)
    : kind === 'video' ? videoEmbedUrl(item.mediaUrl)
    : kind === 'image' ? imageSource(item.mediaUrl)
      : kind === 'web' ? safeExternalUrl(item.mediaUrl) : null;
  return source ? null : 'unsupported media URL for this mediaType';
}


export function groupProjectMedia(items = []) { return groupDetailMedia(items); }

export function groupDetailMedia(items = []) {
    const groups = new Map();
    for (const item of items) {
      const view = item.presentation;
      if (!view || !Number.isInteger(view.group) || !['single', 'slider'].includes(view.kind)) throw new Error('Invalid media presentation');
      if (!groups.has(view.group)) groups.set(view.group, { kind: view.kind, items: [] });
      const group = groups.get(view.group);
      if (group.kind !== view.kind) throw new Error('Inconsistent media presentation');
      group.items.push(item);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b).map(([, group]) => ({
      ...group, items: group.items.sort((a, b) => Number(a.order) - Number(b.order))
    }));
  }

export function videoFrameRatioFromDimensions(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const aspect = w / h;
  return {
    ratio: `${w} / ${h}`,
    width: aspect < 1 ? 'min(100%, clamp(200px, 38%, 300px))'
      : aspect >= (16 / 9) - 0.01 ? '100%'
        : `${Number((aspect / (16 / 9) * 100).toFixed(4))}%`,
  };
}


export function videoFrameRatio(value) {
  const id = vimeoEmbedUrl(value)?.match(/\/video\/(\d+)\?/)?.[1];
  if (id === '1238436120') return { ratio: '5 / 4', width: '70.3125%' };
  if (id === '1243815199') return videoFrameRatioFromDimensions(240, 426);
  return null;
}

function aspectRatioDimensions(value) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(value ?? '');
  if (!match) return null;
  const dimensions = match.slice(1).map(Number);
  return dimensions.every(n => Number.isFinite(n) && n > 0) ? dimensions : null;
}

export function initialVideoFrame(item) {
    if (!item.presentation?.frame) throw new Error('Missing media presentation');
    return item.presentation.frame;
  }

export async function fetchVimeoFrameRatio(value, request = fetch) {
  const player = vimeoEmbedUrl(value);
  if (!player) return null;
  const id = new URL(player).pathname.match(/^\/video\/(\d+)$/)?.[1];
  if (!id) return null;
  const oEmbed = new URL('https://vimeo.com/api/oembed.json');
  const privacyHash = new URL(player).searchParams.get('h');
  oEmbed.searchParams.set('url', `https://vimeo.com/${id}${privacyHash ? `/${encodeURIComponent(privacyHash)}` : ''}`);
  const response = await request(oEmbed.href);
  if (!response.ok) return null;
  const metadata = await response.json();
  return videoFrameRatioFromDimensions(metadata.width, metadata.height);
}

export function parseProjectTags(value) {
  return String(value ?? '').split(',').map(tag => tag.trim().toUpperCase()).filter(Boolean);
}

export function shouldOpenProject(dragDistance, hasSelection) {
  return dragDistance < 5 && !hasSelection;
}

export function isFourByFiveMedia(width, height) {
  return width > 0 && height > 0 && Math.abs(width / height - 4 / 5) < 0.005;
}

function appendMedia(container, project, item, { slider = false } = {}) {
  const mediaType = mediaKind(item);
  const media = document.createElement('div');
  media.className = 'detail-media';
  const fitPersonalPoster = !slider && project.id.startsWith('personal-') && ['local-video', 'image'].includes(mediaType);
  if (fitPersonalPoster) media.classList.add('detail-media-personal-poster');
  const setWidth = width => {
    if (slider) container.style.setProperty('--slide-width', width);
    else media.style.width = width;
  };
  const markMobileWidth = (width, height, intrinsic = false) => {
    const wide = isFourByFiveMedia(width, height)
      || (!slider && width > 0 && height > 0 && Math.abs(width / height - 5 / 4) < 0.005);
    media.toggleAttribute('data-mobile-wide', wide);
    if (slider) container.toggleAttribute('data-mobile-wide', wide);
    if (intrinsic && width > 0) {
      media.style.setProperty('--media-native-width', `${width}px`);
      if (slider) container.style.setProperty('--media-native-width', `${width}px`);
    }
  };
  if (mediaType === 'local-video') {
    const video = document.createElement('video');
    video.src = localVideoSource(item.mediaUrl);
    video.setAttribute('aria-label', `${normalizeDisplayTypography(project.title)} video`);
    video.autoplay = true;
    video.defaultMuted = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', () => {
      markMobileWidth(video.videoWidth, video.videoHeight, true);
      if (!fitPersonalPoster) {
        const frame = videoFrameRatioFromDimensions(video.videoWidth, video.videoHeight);
        if (frame) setWidth(frame.width);
      }
    });
    media.append(video);
  } else if (mediaType === 'video') {
    const instagram = instagramEmbedUrl(item.mediaUrl);
    const src = videoEmbedUrl(item.mediaUrl);
    if (!src) return;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = `${normalizeDisplayTypography(project.title)} video`;
    iframe.loading = slider ? 'lazy' : 'eager';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    if (instagram) {

      media.classList.add('detail-media-instagram');
      setWidth('min(100%, 360px)');
      media.append(iframe);
    } else {
      media.classList.add('detail-media-video');
      const setFrame = frame => {
        media.style.aspectRatio = frame.ratio;
        setWidth(frame.width);
        markMobileWidth(...frame.ratio.split('/').map(Number));
      };
      setFrame(initialVideoFrame(item));
      if (!item.aspectRatio && vimeoEmbedUrl(item.mediaUrl) && !videoFrameRatio(item.mediaUrl)) {
        fetchVimeoFrameRatio(item.mediaUrl).then(frame => {
          if (frame) setFrame(frame);
        }).catch(() => {});
      }
      media.append(iframe);
    }
  } else if (mediaType === 'image') {
    const src = imageSource(item.mediaUrl);
    if (!src) return;
    const image = document.createElement('img');
    image.src = src;
    image.alt = normalizeDisplayTypography(project.title);
    image.addEventListener('load', () => {
      markMobileWidth(image.naturalWidth, image.naturalHeight, true);
      if (!fitPersonalPoster) {
        if (image.naturalHeight > image.naturalWidth) {
          setWidth('min(100%, clamp(200px, 38%, 300px))');
        }
      }
    });
    media.append(image);
  } else if (mediaType === 'web') {
    const href = safeExternalUrl(item.mediaUrl);
    if (!href) return;
    const link = document.createElement('a');
    link.className = 'navigation-link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Visit Website ↗\uFE0E';
    media.append(link);
  } else return;
  container.append(media);
}

function appendSlider(container, project, items) {
  const section = document.createElement('section');
  section.className = 'detail-slider';
  section.setAttribute('aria-label', `${normalizeDisplayTypography(project.title)} media slider`);
  const viewport = document.createElement('div');
  viewport.className = 'detail-slider-viewport';
  const track = document.createElement('div');
  track.className = 'detail-slider-track';
  const slides = items.map(item => {
    const slide = document.createElement('div');
    slide.className = 'detail-slide';
    appendMedia(slide, project, item, { slider: true });
    track.append(slide);
    return slide;
  });
  viewport.append(track);

  const controls = document.createElement('div');
  controls.className = 'detail-slider-controls';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = '← Prev';
  const position = document.createElement('span');
  position.setAttribute('aria-live', 'polite');
  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = 'Next →';
  controls.append(previous, position, next);
  let activeStop = 0;
  let stops = [];
  const updateControls = () => {
    controls.hidden = stops.length <= 1;
    position.textContent = `${String(stops[activeStop].index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    previous.disabled = activeStop === 0;
    next.disabled = activeStop === stops.length - 1;
  };
  const update = () => {
    stops = sliderScrollStops(
      slides.map(slide => slide.offsetLeft), viewport.scrollWidth - viewport.clientWidth,
    );
    activeStop = Math.min(activeStop, stops.length - 1);
    updateControls();
    viewport.scrollTo({ left: stops[activeStop].left, behavior: 'smooth' });
  };
  viewport.addEventListener('scroll', () => {
    if (!window.matchMedia('(max-width: 760px)').matches || !stops.length) return;
    activeStop = stops.reduce((nearest, stop, index) =>
      Math.abs(stop.left - viewport.scrollLeft) < Math.abs(stops[nearest].left - viewport.scrollLeft) ? index : nearest, 0);
    updateControls();
  }, { passive: true });
  previous.addEventListener('click', () => { activeStop = Math.max(0, activeStop - 1); update(); });
  next.addEventListener('click', () => { activeStop = Math.min(stops.length - 1, activeStop + 1); update(); });
  section.append(viewport, controls);
  container.append(section);
  update();
  const observer = new ResizeObserver(() => {
    if (!section.isConnected) {
      observer.disconnect();
      return;
    }
    update();
  });
  observer.observe(viewport);
  for (const slide of slides) observer.observe(slide);
}

export function createProjectDetail(project, details, mediaItems = []) {
  const article = document.createElement('article');
  article.className = 'project-detail';
  const groups = groupDetailMedia(mediaItems, message => void 0);
  for (const group of groups) {
    if (group.kind === 'slider') appendSlider(article, project, group.items);
    else appendMedia(article, project, group.items[0]);
  }
  if (project.id.startsWith('personal-') && groups.length === 2 && groups.every(group => group.kind === 'single')) {
    const video = article.querySelector('.detail-media-personal-poster > video');
    const image = article.querySelector('.detail-media-personal-poster > img');
    if (video && image) {
      const matchWidths = () => {
        if (!video.videoWidth || !image.naturalWidth) return;
        article.style.setProperty('--poster-pair-width', `${Math.min(video.videoWidth, image.naturalWidth)}px`);
      };
      video.addEventListener('loadedmetadata', matchWidths, { once: true });
      image.addEventListener('load', matchWidths, { once: true });
      matchWidths();
    }
  }
  const hasPersonalMetadata = project.id.startsWith('personal-') && (project.role?.trim() || project.tools?.trim());
  if (!details && !hasPersonalMetadata) {
    const empty = document.createElement('p');
    empty.className = 'detail-empty';
    empty.textContent = 'Details not yet available.';
    article.append(empty);
    return article;
  }

  const title = document.createElement('h2');
  title.className = 'detail-title';
  title.textContent = normalizeDisplayTypography(project.title);
  article.append(title);

  const information = document.createElement('dl');
  information.className = 'detail-information';
  for (const [label, value] of [
    ['Year', project.year], ['Type', project.type], ['Role', project.role],
    ['Client', project.client], ['Production', details?.production], ['Tools', project.tools],
  ]) {
    if (value == null || String(value).trim() === '') continue;
    const term = document.createElement('dt');
    term.textContent = label;
    const definition = document.createElement('dd');
    definition.textContent = normalizeDisplayTypography(value);
    information.append(term, definition);
  }
  if (information.childElementCount) article.append(information);

  if (details?.description) {
    const description = document.createElement('div');
    description.className = 'detail-description';
    description.textContent = normalizeDisplayTypography(details.description);
    article.append(description);
  }

  const tagNames = parseProjectTags(details?.tags);
  if (tagNames.length) {
    const tagSection = document.createElement('section');
    tagSection.className = 'detail-tags-section';
    const tagHeading = document.createElement('h3');
    tagHeading.className = 'detail-tags-heading';
    tagHeading.textContent = 'Tags';
    const tags = document.createElement('div');
    tags.className = 'detail-tags';
    tags.setAttribute('aria-label', 'Project tags');
    for (const tag of tagNames) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'detail-tag';
      button.dataset.tag = tag;
      button.textContent = `(${formatTagLabel(tag)})`;
      tags.append(button);
    }
    tagSection.append(tagHeading, tags);
    article.append(tagSection);
  }
  return article;
}
