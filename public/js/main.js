// ===== GESTION DU MENU MOBILE =====
document.addEventListener('click', function(e) {
    const menuToggle = e.target.closest('#menuToggle');
    if (menuToggle) {
        e.preventDefault();
        const navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('open');
        }
        return;
    }
    if (!e.target.closest('.nav-links') && !e.target.closest('#menuToggle')) {
        const navLinks = document.getElementById('navLinks');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            const toggle = document.getElementById('menuToggle');
            if (toggle) toggle.classList.remove('open');
        }
    }
});

// ===== GESTION DES LANGUES =====
let translations = {};

async function loadLanguage(lang) {
    try {
        // Chemin absolu incluant le nom du dépôt
        const response = await fetch(`../lang/${lang}.json`);
        if (!response.ok) throw new Error('Langue non trouvée');
        translations = await response.json();
        applyTranslations();
        localStorage.setItem('hubiLang', lang);
    } catch (error) {
        console.error('Erreur chargement langue:', error);
        // Fallback vers français
        if (lang !== 'fr') loadLanguage('fr');
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (el.innerHTML.includes('<')) {
                el.innerHTML = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });
    // Traduire les placeholders si utilisés
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) el.placeholder = translations[key];
    });
    // Traduire les attributs alt
    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
        const key = el.getAttribute('data-i18n-alt');
        if (translations[key]) el.alt = translations[key];
    });
}

// Initialisation : langue stockée ou détection navigateur
const savedLang = localStorage.getItem('hubiLang') || navigator.language.split('-')[0] || 'fr';
loadLanguage(savedLang);

// Écouter le changement de langue
document.addEventListener('change', function(e) {
    if (e.target.matches('#langSelect')) {
        loadLanguage(e.target.value);
    }
});
