// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';

// Création du client (nom différent pour éviter les conflits)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
const avatarBucket = 'avatars'; // Assurez-vous que ce bucket existe dans Supabase Storage

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

// ===== CHARGEMENT DU PROFIL JOUEUR =====
async function loadPlayerProfile() {
    if (!currentUser) return;

    const { data, error } = await supabaseClient
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement profil:', error);
        return;
    }

    if (data) {
        playerProfile = data;
    } else {
        // Créer un profil par défaut
        const { data: newProfile, error: insertError } = await supabaseClient
            .from('player_profiles')
            .insert([{
                user_id: currentUser.id,
                full_name: currentUser.user_metadata?.full_name || 'Joueur',
                hub_id: generateHubId(),
                profile_completion: 0,
                scouting_views: 0,
                recruiter_favs: 0,
                market_value: 0,
                potential: 0,
                offers_count: 0,
                level: 0
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Erreur création profil:', insertError);
            return;
        }
        playerProfile = newProfile;
    }

    updateUIWithProfile();
}

function generateHubId() {
    return 'HUB' + Date.now().toString(36).toUpperCase();
}

// ===== MISE À JOUR DE L'INTERFACE =====
function updateUIWithProfile() {
    if (!playerProfile) return;

    setText('dashboardName', playerProfile.full_name || '-');
    setText('dashboardRole', playerProfile.position || '-');
    setText('playerID', `ID: ${playerProfile.hub_id || '-'}`);
    setText('userName', playerProfile.full_name || 'Joueur');

    // Avatar
    if (playerProfile.avatar_url) {
        document.getElementById('profileDisplay').src = playerProfile.avatar_url;
        document.getElementById('userAvatar').src = playerProfile.avatar_url;
    } else {
        document.getElementById('profileDisplay').src = 'img/user-default.jpg';
        document.getElementById('userAvatar').src = 'img/user-default.jpg';
    }

    // Statistiques
    setText('profileCompletion', playerProfile.profile_completion || 0);
    setText('scoutingViews', playerProfile.scouting_views || 0);
    setText('recruiterFavs', playerProfile.recruiter_favs || 0);
    setText('marketValue', formatMoney(playerProfile.market_value || 0));
    setText('potential', (playerProfile.potential || 0) + '/100');
    setText('offers', playerProfile.offers_count || 0);
    setText('level', 'LVL ' + (playerProfile.level || 0));
    setText('nextStep', playerProfile.next_step || 'Prochain palier : -');

    // Barre de progression
    const progress = playerProfile.profile_completion || 0;
    document.getElementById('progressFill').style.width = progress + '%';

    // Formulaire
    setSelectValue('editPoste', playerProfile.position);
    setInputValue('editClub', playerProfile.club || '');
    setInputValue('editTaille', playerProfile.height || '');
    setSelectValue('editPied', playerProfile.preferred_foot);
    setTextareaValue('editBio', playerProfile.bio || '');
}

// Fonctions utilitaires
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}
function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}
function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.value = value;
}
function setTextareaValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}
function formatMoney(value) {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
}

// ===== SAUVEGARDE DU PROFIL =====
async function saveProfile() {
    if (!currentUser || !playerProfile) return;

    const updates = {
        position: document.getElementById('editPoste').value,
        club: document.getElementById('editClub').value,
        height: parseInt(document.getElementById('editTaille').value) || null,
        preferred_foot: document.getElementById('editPied').value,
        bio: document.getElementById('editBio').value,
        updated_at: new Date()
    };

    const { error } = await supabaseClient
        .from('player_profiles')
        .update(updates)
        .eq('id', playerProfile.id);

    if (error) {
        alert('Erreur lors de la sauvegarde : ' + error.message);
    } else {
        alert('Profil mis à jour avec succès !');
        Object.assign(playerProfile, updates);
        updateUIWithProfile();
    }
}

// ===== UPLOAD AVATAR =====
async function uploadAvatar(file) {
    if (!currentUser) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabaseClient.storage
        .from(avatarBucket)
        .upload(filePath, file);

    if (uploadError) {
        alert('Erreur upload : ' + uploadError.message);
        return;
    }

    const { data: urlData } = supabaseClient.storage
        .from(avatarBucket)
        .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabaseClient
        .from('player_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', playerProfile.id);

    if (updateError) {
        alert('Erreur mise à jour avatar : ' + updateError.message);
        return;
    }

    playerProfile.avatar_url = publicUrl;
    document.getElementById('profileDisplay').src = publicUrl;
    document.getElementById('userAvatar').src = publicUrl;
}

// ===== DÉCONNEXION =====
async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error('Erreur déconnexion:', error);
    window.location.href = '../index.html';
}

// ===== GESTIONNAIRES D'ÉVÉNEMENTS =====
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

function showTab(tabName, event) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    if (tabs.length === 0 || contents.length === 0) return;

    tabs.forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
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

    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });
}

// ===== SIDEBAR AVEC SWIPE AMÉLIORÉ =====
function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            if (overlay) overlay.classList.add('active');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // SWIPE : détection du toucher
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;

        // Swipe droite depuis le bord gauche
        if (diff > swipeThreshold && touchStartX < 50) {
            sidebar.classList.add('active');
            if (overlay) overlay.classList.add('active');
        }
        // Swipe gauche
        else if (diff < -swipeThreshold) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    }, { passive: true });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();

    initUserMenu();
    initSidebar();

    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    // Exposer les fonctions globales
    window.triggerUpload = triggerUpload;
    window.copyID = copyID;
    window.showTab = showTab;
    window.saveProfile = saveProfile;
});