export function createThemeSwitcher({ onThemeChanged }) {
  const themeToggle = document.getElementById('theme-toggle');
  const drehteil = document.querySelector('.drehteil');
  const themes = ['light', 'dark'];
  const savedTheme = themes.includes(localStorage.getItem('theme')) ? localStorage.getItem('theme') : 'light';

  function applyTheme(theme) {
    document.body.classList.remove('dark-mode');
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    if (drehteil) {
      drehteil.classList.remove('rotated');
      if (theme === 'dark') {
        drehteil.classList.add('rotated');
      }
    }

    localStorage.setItem('theme', theme);
    onThemeChanged();
  }

  function toggleTheme() {
    const activeTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const nextTheme = themes[(themes.indexOf(activeTheme) + 1) % themes.length];
    applyTheme(nextTheme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  applyTheme(savedTheme);

  return {
    applyTheme
  };
}
