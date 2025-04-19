/**
 * DevSpeedTest - Theme Toggle
 * Handles theme switching between light and dark modes
 */

// DOM Elements
const themeToggleInput = document.getElementById('theme-toggle-input');
const body = document.body;

// Check for saved theme preference or use preferred color scheme
document.addEventListener('DOMContentLoaded', () => {
    // Check if theme preference is stored in localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleInput.checked = true;
    } else if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        themeToggleInput.checked = false;
    } else {
        // If no saved preference, check system preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDarkMode) {
            body.classList.add('dark-mode');
            themeToggleInput.checked = true;
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    }
    
    // Add animation class after initial load to prevent transition on page load
    setTimeout(() => {
        document.documentElement.classList.add('theme-transitions-enabled');
    }, 500);
});

// Theme switch event listener
themeToggleInput.addEventListener('change', () => {
    if (themeToggleInput.checked) {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        
        // Animate the switch with anime.js if available
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.toggle-icon',
                rotate: [0, 360],
                duration: 600,
                easing: 'easeInOutQuad'
            });
        }
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        
        // Animate the switch with anime.js if available
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.toggle-icon',
                rotate: [360, 0],
                duration: 600,
                easing: 'easeInOutQuad'
            });
        }
    }
});