document.addEventListener('DOMContentLoaded', () => {
    // Mode Toggle
    const modeToggle = document.querySelector('.mode-toggle');
    const iconSun = document.querySelector('.icon-sun');
    const iconMoon = document.querySelector('.icon-moon');

    modeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            iconSun.style.display = 'none';
            iconMoon.style.display = 'inline-block';
        } else {
            iconSun.style.display = 'inline-block';
            iconMoon.style.display = 'none';
        }
    });

    // Metrics Hint
    const metricsHint = document.querySelector('.metrics-hint');
    metricsHint.addEventListener('click', () => {
        window.scrollBy({
            top: window.innerHeight,
            behavior: 'smooth'
        });
    });

    // Power Button
    const powerButton = document.querySelector('.power-button');
    powerButton.addEventListener('click', () => {
        alert('Power button clicked! (Functionality to be implemented)');
    });
});
