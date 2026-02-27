// Gestion du menu mobile
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

// Gestion des langues
let translations = {};

async function loadLanguage(lang) {
    try {
        // Chemin absolu incluant le nom du dépôt
        const response = await fetch(`/hubisoccer1st/public/lang/${lang}.json`);
        if (!response.ok) throw new Error('Langue non trouvée');
        translations = await response.json();
        applyTranslations();
        localStorage.setItem('hubiLang', lang);
    } catch (error) {
        console.error('Erreur chargement langue:', error);
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
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) el.placeholder = translations[key];
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
        const key = el.getAttribute('data-i18n-alt');
        if (translations[key]) el.alt = translations[key];
    });
}

const savedLang = localStorage.getItem('hubiLang') || navigator.language.split('-')[0] || 'fr';
loadLanguage(savedLang);

document.addEventListener('change', function(e) {
    if (e.target.matches('#langSelect')) {
        loadLanguage(e.target.value);
    }
});