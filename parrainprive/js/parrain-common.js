// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉLÉMENTS DOM COMMUNS =====
const userMenu = document.getElementById('userMenu');
const userDropdown = document.getElementById('userDropdown');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutLink = document.getElementById('logoutLink');
const logoutLinkSidebar = document.getElementById('logoutLinkSidebar');
const userNameSpan = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const notifBadge = document.getElementById('notifBadge');
const langSelect = document.getElementById('langSelect');
const languageLink = document.getElementById('languageLink');

// ===== ÉTAT GLOBAL (utilisateur factice pour les tests) =====
let currentParrain = {
    id: 1, // Remplacez par un ID existant dans vos tables
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '0123456789',
    avatar_url: null,
    date_adhesion: '2024-01-01T00:00:00Z'
};

// Mettre à jour l'interface avec les infos factices
function updateUserUI() {
    if (currentParrain) {
        userNameSpan.textContent = `${currentParrain.first_name} ${currentParrain.last_name}`;
        if (currentParrain.avatar_url) {
            userAvatar.src = currentParrain.avatar_url;
        }
    }
}
updateUserUI();

// ===== GESTION DU MENU UTILISATEUR =====
function initUserMenu() {
    if (userMenu) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => {
            userDropdown.classList.remove('show');
        });
    }
}

// ===== GESTION DE LA SIDEBAR =====
function initSidebar() {
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
    }
    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
}

// ===== DÉCONNEXION (simulée) =====
function handleLogout(e) {
    e.preventDefault();
    alert('Déconnexion simulée (aucune action réelle)');
}

// ===== GESTION DES NOTIFICATIONS (simulée) =====
async function loadNotifications() {
    if (!currentParrain) return;
    // Exemple : compteur fictif
    if (notifBadge) notifBadge.textContent = '3';
}

// ===== GESTION DES LANGUES =====
const translations = {
    fr: {},
    en: {}
};
let currentLang = 'fr';

function applyTranslations(lang) { /* ... */ }

function loadLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        applyTranslations(lang);
        localStorage.setItem('hubiLang', lang);
    } else {
        loadLanguage('fr');
    }
}

function initLanguage() {
    const savedLang = localStorage.getItem('hubiLang') || 'fr';
    loadLanguage(savedLang);
    if (langSelect) {
        langSelect.value = savedLang;
        langSelect.addEventListener('change', (e) => loadLanguage(e.target.value));
    }
    if (languageLink) {
        languageLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Changement de langue disponible dans le sélecteur');
        });
    }
}

// ===== UPLOAD D'AVATAR (simulé) =====
document.addEventListener('change', async (e) => {
    if (e.target.id !== 'fileInput' || !currentParrain) return;
    alert('Upload simulé – pas de modification réelle');
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    initUserMenu();
    initSidebar();
    initLanguage();
    loadNotifications();

    if (logoutLink) logoutLink.addEventListener('click', handleLogout);
    if (logoutLinkSidebar) logoutLinkSidebar.addEventListener('click', handleLogout);
});

// Fonctions globales
window.copyID = function() {
    const idSpan = document.getElementById('parrainID');
    if (idSpan) {
        const idText = idSpan.textContent.replace('ID: ', '');
        navigator.clipboard.writeText(idText);
        alert('ID copié !');
    }
};

window.triggerUpload = function() {
    document.getElementById('fileInput').click();
};
