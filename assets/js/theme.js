(() => {
  let theme;
  try { theme = localStorage.getItem('theme'); } catch (_) {}
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
