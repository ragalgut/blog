(() => {
  'use strict';

  const archive = document.querySelector('[data-article-archive]');
  if (!archive) return;

  const form = archive.querySelector('.archive-filters');
  const query = form.elements.q;
  const topic = form.elements.tema;
  const technology = form.elements.tecnologia;
  const year = form.elements.ano;
  const order = form.elements.orden;
  const grid = archive.querySelector('#archive-results');
  const count = archive.querySelector('.archive-count');
  const reset = archive.querySelector('.archive-summary [data-archive-reset]');
  const empty = archive.querySelector('.archive-empty');
  const pagination = archive.querySelector('.archive-pagination');
  const previous = pagination.querySelector('[data-archive-previous]');
  const next = pagination.querySelector('[data-archive-next]');
  const pageLabel = pagination.querySelector('[data-archive-page]');
  const pageSize = 12;
  let page = 1;
  let totalPages = 1;
  let searchTimer;

  function normalize(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  }

  const posts = Array.from(grid.querySelectorAll('.article-card')).map((card, index) => {
    const tags = JSON.parse(card.dataset.archiveTags || '[]');
    const title = card.querySelector('.article-card__title').textContent;
    const description = card.querySelector('.article-card__description');
    return {
      card,
      index,
      tags,
      topic: card.dataset.archiveTopic,
      year: card.dataset.archiveYear,
      date: Date.parse(card.dataset.archiveDate),
      text: normalize([title, description ? description.textContent : '', card.querySelector('.article-card__topics')?.textContent || '', ...tags].join(' '))
    };
  });

  function validOption(control, value, fallback) {
    return Array.from(control.options).some(option => option.value === value) ? value : fallback;
  }

  function readLocation() {
    const params = new URL(window.location.href).searchParams;
    query.value = params.get('q') || '';
    topic.value = validOption(topic, params.get('tema'), '');
    technology.value = validOption(technology, params.get('tecnologia'), '') ||
      (!topic.value ? validOption(technology, params.get('tema'), '') : '');
    year.value = validOption(year, params.get('ano'), '');
    order.value = validOption(order, params.get('orden'), 'recientes');
    const requestedPage = Number(params.get('pagina'));
    page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  }

  function writeLocation(push) {
    const url = new URL(window.location.href);
    const values = {
      q: query.value.trim(),
      tema: topic.value,
      tecnologia: technology.value,
      ano: year.value,
      orden: order.value === 'antiguos' ? order.value : '',
      pagina: page > 1 ? String(page) : ''
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    if (url.href !== window.location.href) {
      window.history[push ? 'pushState' : 'replaceState'](null, '', url);
    }
  }

  function render(syncLocation = true, push = false) {
    const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    const filtered = posts.filter(post =>
      (!topic.value || post.topic === topic.value) &&
      (!technology.value || post.tags.includes(technology.value)) &&
      (!year.value || post.year === year.value) &&
      words.every(word => post.text.includes(word))
    ).sort((a, b) => (order.value === 'antiguos' ? a.date - b.date : b.date - a.date) || a.index - b.index);

    totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, totalPages);
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, filtered.length);
    const fragment = document.createDocumentFragment();
    posts.forEach(post => { post.card.hidden = true; });
    filtered.slice(start, end).forEach(post => {
      post.card.hidden = false;
      fragment.appendChild(post.card);
    });
    grid.appendChild(fragment);

    grid.hidden = filtered.length === 0;
    empty.hidden = filtered.length !== 0;
    const noun = filtered.length === 1 ? 'artículo' : 'artículos';
    if (filtered.length > pageSize) {
      count.textContent = `Mostrando ${start + 1}–${end} de ${filtered.length} ${noun}`;
    } else if (filtered.length === posts.length) {
      count.textContent = `${filtered.length} ${noun}`;
    } else {
      count.textContent = `${filtered.length} de ${posts.length} artículos`;
    }
    reset.hidden = !(query.value.trim() || topic.value || technology.value || year.value || order.value !== 'recientes');
    pagination.hidden = totalPages <= 1;
    previous.disabled = page <= 1;
    next.disabled = page >= totalPages;
    pageLabel.textContent = `Página ${page} de ${totalPages}`;
    if (syncLocation) writeLocation(push);
  }

  function changeFilters() {
    clearTimeout(searchTimer);
    page = 1;
    render();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    changeFilters();
  });
  query.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(changeFilters, 120);
  });
  [topic, technology, year, order].forEach(control => control.addEventListener('change', changeFilters));
  archive.querySelectorAll('[data-archive-reset]').forEach(button => {
    button.addEventListener('click', () => {
      form.reset();
      changeFilters();
      query.focus();
    });
  });

  function changePage(delta) {
    clearTimeout(searchTimer);
    page = Math.min(totalPages, Math.max(1, page + delta));
    render(true, true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    archive.querySelector('.archive-summary').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
  previous.addEventListener('click', () => changePage(-1));
  next.addEventListener('click', () => changePage(1));
  window.addEventListener('popstate', () => {
    clearTimeout(searchTimer);
    readLocation();
    render(false);
  });

  readLocation();
  render();
  form.hidden = false;
})();
