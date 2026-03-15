// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrain = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ===== ÉTAT GLOBAL =====
let currentParrain = null; // { id, first_name, last_name, email, phone, avatar_url, ... }

// ===== GESTION DE LA SESSION =====
async function checkParrainSession() {
    try {
        const { data: { session }, error } = await supabaseParrain.auth.getSession();
        if (error || !session) {
            window.location.href = 'auth/login.html';
            return null;
        }
        // Récupérer le profil dans la table parrain_profiles
        const { data: profile, error: profileError } = await supabaseParrain
            .from('parrain_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profileError || !profile) {
            // Si pas de profil, rediriger vers complétion de profil
            window.location.href = 'auth/complete-profile.html';
            return null;
        }
        currentParrain = profile;
        updateUserUI();
        return profile;
    } catch (err) {
        console.error('Erreur check session:', err);
        window.location.href = 'auth/login.html';
        return null;
    }
}

function updateUserUI() {
    if (currentParrain) {
        userNameSpan.textContent = `${currentParrain.first_name} ${currentParrain.last_name}`;
        if (currentParrain.avatar_url) {
            userAvatar.src = currentParrain.avatar_url;
        }
    }
}

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

// ===== DÉCONNEXION =====
async function handleLogout(e) {
    e.preventDefault();
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        await supabaseParrain.auth.signOut();
        window.location.href = '../index.html';
    }
}

// ===== GESTION DES NOTIFICATIONS =====
async function loadNotifications() {
    if (!currentParrain) return;
    // Charger le nombre de notifications non lues (par exemple dans parrain_messages)
    const { count, error } = await supabaseParrain
        .from('parrain_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentParrain.id)
        .eq('receiver_type', 'parrain')
        .eq('is_read', false);
    if (!error && notifBadge) {
        notifBadge.textContent = count || 0;
    }
}

// ===== GESTION DES LANGUES =====
const translations = {
    fr: { /* ... à compléter ... */ },
    en: { /* ... */ },
    // ... pour les 24 langues, à définir si nécessaire
};

let currentLang = 'fr';

function applyTranslations(lang) {
    // Implémenter la traduction des éléments data-i18n
}

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

// ===== INITIALISATION COMMUNE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkParrainSession();
    initUserMenu();
    initSidebar();
    initLanguage();
    loadNotifications();

    if (logoutLink) logoutLink.addEventListener('click', handleLogout);
    if (logoutLinkSidebar) logoutLinkSidebar.addEventListener('click', handleLogout);
});

// Exposer certaines fonctions globalement si besoin
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

// Gestion de l'upload d'avatar (à implémenter)
document.getElementById('fileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentParrain) return;
    // Upload vers un bucket 'parrain-avatars' (à créer)
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${currentParrain.id}_${Date.now()}.${fileExt}`;
    const { error } = await supabaseParrain.storage
        .from('parrain-avatars')
        .upload(fileName, file);
    if (error) {
        alert('Erreur upload: ' + error.message);
        return;
    }
    const { publicURL } = supabaseParrain.storage
        .from('parrain-avatars')
        .getPublicUrl(fileName);
    // Mettre à jour le profil
    const { error: updateError } = await supabaseParrain
        .from('parrain_profiles')
        .update({ avatar_url: publicURL })
        .eq('id', currentParrain.id);
    if (!updateError) {
        currentParrain.avatar_url = publicURL;
        userAvatar.src = publicURL;
        document.getElementById('profileDisplay').src = publicURL;
    }
});