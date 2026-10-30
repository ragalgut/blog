(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.querySelector('.toggle-theme');
  function syncTheme() {
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
  }
  themeButton.hidden = false;
  syncTheme();
  themeButton.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (_) {}
    syncTheme();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    try { if (localStorage.getItem('theme')) return; } catch (_) { return; }
    root.dataset.theme = event.matches ? 'dark' : 'light';
    syncTheme();
  });
  const tools = document.querySelector('.site-tools');
  document.addEventListener('click', event => { if (!tools.contains(event.target)) tools.open = false; });
  tools.addEventListener('keydown', event => {
    if (event.key === 'Escape') { tools.open = false; tools.querySelector('summary').focus(); }
  });

  if (document.querySelector('[data-topic]')) {
    function scrollToLegacyTopic() {
      if (!location.hash) return;
      try {
        const topicName = decodeURIComponent(location.hash.slice(1)).replace(/\+/g, ' ');
        const section = [...document.querySelectorAll('[data-topic]')].find(node => node.dataset.topic === topicName);
        if (section) section.scrollIntoView();
      } catch (_) {}
    }
    scrollToLegacyTopic();
    window.addEventListener('hashchange', scrollToLegacyTopic);
  }

  function prepareDialog(dialog) {
    dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  }
  const searchDialog = document.querySelector('.search-dialog');
  prepareDialog(searchDialog);
  const openSearch = document.querySelector('[data-search-open]');
  const searchInput = searchDialog.querySelector('input');
  const results = searchDialog.querySelector('.search-results');
  const status = searchDialog.querySelector('.search-status');
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  let indexPromise;
  let searchVersion = 0;
  async function search() {
    const version = ++searchVersion;
    const query = normalize(searchInput.value.trim());
    results.replaceChildren();
    if (!query) { status.textContent = 'Escribe para buscar en todos los artículos.'; return; }
    status.textContent = 'Buscando…';
    try {
      indexPromise ||= fetch(searchDialog.dataset.searchIndex).then(response => {
        if (!response.ok) throw new Error('No se pudo cargar el índice');
        return response.json();
      }).then(posts => posts.map(post => ({ ...post, text: normalize([post.title, post.description, post.topic, ...post.tags, post.content].join(' ')) })));
      const posts = await indexPromise;
      if (version !== searchVersion) return;
      const words = query.split(/\s+/);
      const matches = posts.filter(post => words.every(word => post.text.includes(word)));
      status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'artículo encontrado' : 'artículos encontrados'}` : 'No hay coincidencias. Prueba con otra palabra o tema.';
      const fragment = document.createDocumentFragment();
      matches.forEach(post => {
        const article = document.createElement('article');
        article.className = 'search-result';
        const image = document.createElement('img');
        image.src = post.image; image.alt = post.image_alt; image.width = 90; image.height = 66; image.loading = 'lazy';
        const copy = document.createElement('div');
        const heading = document.createElement('h3');
        const link = document.createElement('a');
        link.href = post.url; link.textContent = post.title;
        heading.append(link);
        const description = document.createElement('p');
        description.textContent = post.description;
        copy.append(heading, description); article.append(image, copy); fragment.append(article);
      });
      results.append(fragment);
    } catch (_) {
      if (version !== searchVersion) return;
      indexPromise = null;
      status.textContent = 'No se ha podido cargar la búsqueda. Puedes usar el archivo de artículos.';
    }
  }
  openSearch.hidden = false;
  openSearch.addEventListener('click', () => { tools.open = false; searchDialog.showModal(); searchInput.focus(); });
  searchInput.addEventListener('input', search);

  async function copyText(text, button, label) {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '¡Copiado!';
      setTimeout(() => { button.textContent = label; }, 2200);
    } catch (_) { button.textContent = 'No se pudo copiar'; setTimeout(() => { button.textContent = label; }, 2500); }
  }
  const copyLink = document.querySelector('[data-copy-link]');
  if (copyLink && navigator.clipboard) {
    copyLink.hidden = false;
    copyLink.addEventListener('click', () => copyText(copyLink.dataset.copyLink, copyLink, 'Copiar enlace'));
  }
  document.querySelectorAll('.prose pre > code').forEach(code => {
    if (!navigator.clipboard) return;
    const pre = code.parentElement;
    const wrapper = document.createElement('div'); wrapper.className = 'code-block';
    pre.before(wrapper); wrapper.append(pre);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'code-copy'; button.textContent = 'Copiar';
    button.setAttribute('aria-label', 'Copiar bloque de código');
    wrapper.append(button);
    button.addEventListener('click', () => copyText(code.textContent, button, 'Copiar'));
  });

  const postBody = document.querySelector('[data-post-body]');
  if (postBody) {
    const bar = document.querySelector('.reading-progress__bar');
    let scheduled = false;
    function updateProgress() {
      const start = postBody.getBoundingClientRect().top + window.scrollY;
      const progress = Math.max(0, Math.min(1, (window.scrollY + window.innerHeight - start) / postBody.offsetHeight));
      bar.style.transform = `scaleX(${progress})`; scheduled = false;
    }
    window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }, { passive: true });
    window.addEventListener('resize', updateProgress); updateProgress();
  }
  let imageDialog;
  document.querySelectorAll('[data-post-body] img, .project-gallery img').forEach(image => {
    if (image.closest('a')) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'image-zoom';
    button.setAttribute('aria-label', `Ampliar imagen: ${image.alt}`);
    image.before(button); button.append(image);
    button.addEventListener('click', () => {
      if (!imageDialog) {
        imageDialog = document.createElement('dialog'); imageDialog.className = 'image-dialog'; imageDialog.setAttribute('aria-label', 'Imagen ampliada');
        const close = document.createElement('button'); close.type = 'button'; close.className = 'button'; close.dataset.dialogClose = ''; close.textContent = 'Cerrar imagen';
        imageDialog.append(close, document.createElement('img')); document.body.append(imageDialog); prepareDialog(imageDialog);
      }
      const full = imageDialog.querySelector('img'); full.src = image.dataset.fullSrc || image.currentSrc || image.src; full.alt = image.alt;
      imageDialog.showModal();
    });
  });
  const comments = document.querySelector('[data-comments]');
  if (comments) {
    comments.hidden = false;
    comments.addEventListener('click', () => {
      comments.disabled = true; comments.textContent = 'Cargando comentarios…';
      window.disqus_config = function () { this.page.url = comments.dataset.url; this.page.identifier = comments.dataset.identifier; };
      const script = document.createElement('script'); script.src = `https://${comments.dataset.shortname}.disqus.com/embed.js`; script.async = true;
      script.onload = () => { comments.hidden = true; };
      script.onerror = () => { script.remove(); comments.disabled = false; comments.textContent = 'Reintentar cargar comentarios'; };
      document.head.append(script);
    });
  }
})();
