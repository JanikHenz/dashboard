function isAndroid() {
  return /Android/i.test(navigator.userAgent + (navigator.userAgentData?.platform || ''));
}

export function createPageSwitcher({ onResizeMonitoring }) {
  const shell = document.getElementById('app-shell');
  document.querySelectorAll('.hint').forEach((button) => {
    button.onclick = () => {
      const isShow = shell?.classList.contains('show-monitoring');
      if (!shell || (isAndroid() && !isShow && !button.classList.contains('back-hint'))) return;
      shell.classList.toggle('show-monitoring');
      onResizeMonitoring();
    };
  });
}
