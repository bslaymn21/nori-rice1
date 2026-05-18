// Theme Manager Logic for Matamkom

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.classList.remove(currentTheme);
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateToggleIcon(newTheme);
}

function updateToggleIcon(theme) {
    const icons = document.querySelectorAll('.theme-icon');
    icons.forEach(icon => {
        icon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
    });
}

(function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.add(savedTheme);
    document.documentElement.classList.remove(savedTheme === 'light' ? 'dark' : 'light');

    document.addEventListener('DOMContentLoaded', () => {
        updateToggleIcon(savedTheme);
    });
})();
