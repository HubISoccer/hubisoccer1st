// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let scoutingData = null;
const avatarBucket = 'avatars';

// ===== TOAST (copié des autres pages) =====
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadPlayerProfile() {
    const { data, error } = await supabaseClient
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (error) {
        console.error('Erreur chargement profil:', error);
        showToast('Erreur lors du chargement du profil', 'error');
        return null;
    }
    playerProfile = data;
    document.getElementById('userName').textContent = playerProfile.nom_complet || 'Joueur';
    document.getElementById('userAvatar').src = playerProfile.avatar_url || 'img/user-default.jpg';
    return playerProfile;
}

// ===== CHARGEMENT / CRÉATION DES DONNÉES DE SCOUTING =====
async function loadScoutingData() {
    if (!playerProfile) return;

    const { data, error } = await supabaseClient
        .from('player_scouting')
        .select('*')
        .eq('player_id', playerProfile.id)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement scouting:', error);
        showToast('Erreur lors du chargement des données de scouting', 'error');
        return;
    }

    if (data) {
        scoutingData = data;
    } else {
        // Créer une entrée par défaut avec des valeurs à zéro
        const { data: newData, error: insertError } = await supabaseClient
            .from('player_scouting')
            .insert([{
                player_id: playerProfile.id
                // Tous les autres champs auront leur valeur par défaut (0 ou NULL)
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Erreur création scouting:', insertError);
            showToast('Erreur lors de l\'initialisation des données', 'error');
            return;
        }
        scoutingData = newData;
    }

    updateUIWithProfile(); // Met à jour les infos de base depuis player_profiles
    updateScoutingUI();    // Met à jour tous les attributs
}

// ===== MISE À JOUR DE L'INTERFACE (infos personnelles) =====
function updateUIWithProfile() {
    if (!playerProfile) return;

    // Nom complet et poste
    const fullName = playerProfile.nom_complet || '-';
    document.getElementById('playerFullName').textContent = fullName;
    document.getElementById('playerPosition').textContent = playerProfile.position || 'Poste non renseigné';

    // Informations de base
    document.getElementById('playerAge').textContent = playerProfile.age || '0'; // Si vous avez une colonne age
    document.getElementById('playerHeight').textContent = playerProfile.height || '0';
    document.getElementById('playerWeight').textContent = playerProfile.poids_kg || '0';
    document.getElementById('playerNationality').textContent = playerProfile.nationalite || '-';
    document.getElementById('playerFoot').textContent = playerProfile.preferred_foot || '-';
    document.getElementById('playerClub').textContent = playerProfile.club || '-';

    // ID HubISoccer
    document.getElementById('playerID').textContent = `ID: ${playerProfile.hub_id || '-'}`;

    // Avatar
    if (playerProfile.avatar_url) {
        document.getElementById('profileDisplay').src = playerProfile.avatar_url;
        document.getElementById('userAvatar').src = playerProfile.avatar_url;
    } else {
        document.getElementById('profileDisplay').src = 'img/user-default.jpg';
        document.getElementById('userAvatar').src = 'img/user-default.jpg';
    }

    // Mini-stats (profil complété, vues, favoris)
    document.getElementById('profileCompletion').textContent = playerProfile.profile_completion || 0;
    document.getElementById('scoutingViews').textContent = playerProfile.scouting_views || 0;
    document.getElementById('recruiterFavs').textContent = playerProfile.recruiter_favs || 0;
}

// ===== MISE À JOUR DES ATTRIBUTS DE SCOUTING =====
function updateScoutingUI() {
    if (!scoutingData) return;

    // Stats globales
    setText('currentLevel', scoutingData.niveau_actuel || 0);
    setText('potential', scoutingData.potentiel || 0);
    setText('personality', scoutingData.personnalite || 0);
    setText('marketValue', formatMoney(scoutingData.valeur_marche || 0));
    setText('loanFrom', scoutingData.pret_info || '-');
    setText('salary', scoutingData.salaire ? formatMoney(scoutingData.salaire) : '-');
    setText('contractExpiry', scoutingData.expire_le ? new Date(scoutingData.expire_le).toLocaleDateString('fr-FR') : '-');
    setText('youthSelection', scoutingData.selection_jeunes || '-');

    // Attributs techniques
    setText('tech_centres', scoutingData.technique_centres || 0);
    setText('tech_controle', scoutingData.technique_controle_balle || 0);
    setText('tech_corners', scoutingData.technique_corners || 0);
    setText('tech_coups_francs', scoutingData.technique_coups_francs || 0);
    setText('tech_dribbles', scoutingData.technique_dribbles || 0);
    setText('tech_finition', scoutingData.technique_finition || 0);
    setText('tech_jeu_de_tete', scoutingData.technique_jeu_de_tete || 0);
    setText('tech_marquage', scoutingData.technique_marquage || 0);
    setText('tech_passes', scoutingData.technique_passes || 0);
    setText('tech_penalty', scoutingData.technique_penalty || 0);
    setText('tech_tactics', scoutingData.technique_tactics || 0);
    setText('tech_technique', scoutingData.technique_technique || 0);
    setText('tech_tirs_de_loin', scoutingData.technique_tirs_de_loin || 0);
    setText('tech_touches_longues', scoutingData.technique_touches_longues || 0);

    // Attributs mentaux
    setText('mental_agressivite', scoutingData.mental_agressivite || 0);
    setText('mental_anticipation', scoutingData.mental_anticipation || 0);
    setText('mental_appels_de_balle', scoutingData.mental_appels_de_balle || 0);
    setText('mental_concentration', scoutingData.mental_concentration || 0);
    setText('mental_courage', scoutingData.mental_courage || 0);
    setText('mental_decisions', scoutingData.mental_decisions || 0);
    setText('mental_determination', scoutingData.mental_determination || 0);
    setText('mental_inspiration', scoutingData.mental_inspiration || 0);
    setText('mental_jeu_collectif', scoutingData.mental_jeu_collectif || 0);
    setText('mental_leadership', scoutingData.mental_leadership || 0);
    setText('mental_placement', scoutingData.mental_placement || 0);
    setText('mental_sang_froid', scoutingData.mental_sang_froid || 0);
    setText('mental_vision_du_jeu', scoutingData.mental_vision_du_jeu || 0);
    setText('mental_volume_de_jeu', scoutingData.mental_volume_de_jeu || 0);

    // Attributs physiques
    setText('physique_acceleration', scoutingData.physique_acceleration || 0);
    setText('physique_agilite', scoutingData.physique_agilite || 0);
    setText('physique_detente_verticale', scoutingData.physique_detente_verticale || 0);
    setText('physique_endurance', scoutingData.physique_endurance || 0);
    setText('physique_equilibre', scoutingData.physique_equilibre || 0);
    setText('physique_puissance', scoutingData.physique_puissance || 0);
    setText('physique_qualites_physiques_nat', scoutingData.physique_qualites_physiques_nat || 0);
    setText('physique_vitesse', scoutingData.physique_vitesse || 0);

    // Rapports
    setText('scoutingReports', scoutingData.rapports_recruteurs || 'Aucun rapport pour le moment.');
}

// ===== FONCTIONS UTILITAIRES =====
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatMoney(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + ' M€';
    if (value >= 1000) return (value / 1000).toFixed(0) + ' K€';
    return value + ' €';
}

// ===== UPLOAD AVATAR (inchangé) =====
async function uploadAvatar(file) {
    // ... (identique à votre code actuel)
}

function triggerUpload() {
    document.getElementById('fileInput').click();
}

document.addEventListener('change', function(e) {
    if (e.target.matches('#fileInput')) {
        const file = e.target.files[0];
        if (file) uploadAvatar(file);
    }
});

async function copyID() {
    if (!playerProfile?.hub_id) return;
    try {
        await navigator.clipboard.writeText(playerProfile.hub_id);
        const span = document.getElementById('playerID');
        const oldText = span.innerText;
        span.innerText = "Copié ! ✅";
        setTimeout(() => span.innerText = oldText, 2000);
    } catch {
        alert('Erreur de copie.');
    }
}

// ===== GESTION DES ONGLETS D'ATTRIBUTS =====
function initAttrTabs() {
    const tabs = document.querySelectorAll('.attr-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Retirer la classe active de tous les onglets et contenus
            document.querySelectorAll('.attr-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.attr-content').forEach(c => c.classList.remove('active'));

            // Activer l'onglet cliqué
            tab.classList.add('active');
            const cat = tab.dataset.cat;
            document.getElementById(`${cat}-attrs`).classList.add('active');
        });
    });
}

// ===== MENU UTILISATEUR =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!userMenu || !dropdown) return;
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
}

// ===== SIDEBAR =====
function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    // Swipe
    let touchStartX = 0, touchStartY = 0, touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0) closeSidebarFunc();
        }
    }, { passive: false });
}

function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

// ===== DÉCONNEXION =====
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = '../index.html';
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    await loadScoutingData();

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initAttrTabs();

    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    window.triggerUpload = triggerUpload;
    window.copyID = copyID;
});