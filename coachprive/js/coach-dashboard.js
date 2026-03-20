// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
let players = [];
let trainingSessions = [];
let events = [];
let honorairesChart = null;

// ===== TOAST =====
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

// ===== LOADER =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseCoachPrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL COACH =====
async function loadCoachProfile() {
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        currentCoach = data;
        updateProfileUI();
        return currentCoach;
    } catch (err) {
        console.error('❌ Exception loadCoachProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

function updateProfileUI() {
    if (!currentCoach) return;

    const fullName = `${currentCoach.first_name} ${currentCoach.last_name}`;
    document.getElementById('userName').textContent = fullName;
    document.getElementById('dashboardName').textContent = fullName;
    document.getElementById('coachFullName').textContent = fullName;
    document.getElementById('coachEmail').textContent = currentCoach.email || '-';
    document.getElementById('playerPseudo').textContent = currentCoach.username || '-';

    const contact = { phone: currentCoach.phone };
    document.getElementById('playerPhone').textContent = contact.phone || '-';
    document.getElementById('playerEmail').textContent = currentCoach.email || '-';
    document.getElementById('coachPhone').textContent = contact.phone || '-';

    // Drapeau (à récupérer depuis contact_info ou country)
    document.getElementById('playerCountryName').textContent = '-';
    document.getElementById('playerCountryFlag').textContent = '🌍';

    if (currentCoach.avatar_url) {
        const avatarWithTimestamp = `${currentCoach.avatar_url}?t=${new Date().getTime()}`;
        document.getElementById('userAvatar').src = avatarWithTimestamp;
        document.getElementById('profileDisplay').src = avatarWithTimestamp;
    }

    if (currentCoach.date_adhesion) {
        document.getElementById('memberSince').textContent = new Date(currentCoach.date_adhesion).toLocaleDateString('fr-FR');
    } else {
        document.getElementById('memberSince').textContent = '-';
    }
    document.getElementById('coachID').textContent = `ID: ${currentCoach.hub_id || currentCoach.id}`;

    // Mini stats
    document.getElementById('nbJoueurs').textContent = currentCoach.nb_joueurs_suivis || 0;
    document.getElementById('totalHonoraires').textContent = (currentCoach.total_honoraires || 0).toLocaleString();
}

// ===== CHARGEMENT DES DONNÉES SPÉCIFIQUES =====
async function loadCoachData() {
    showLoader(true);
    try {
        await Promise.all([
            loadPlayers(),
            loadTrainingSessions(),
            loadEvents(),
            loadLicenseStatus()
        ]);
        updateStatsAndLists();
        initHonorairesChart();
    } catch (err) {
        console.error('Erreur chargement données:', err);
        showToast('Erreur lors du chargement des données', 'error');
    } finally {
        showLoader(false);
    }
}

async function loadPlayers() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_players')
        .select(`
            id,
            player_id,
            notes,
            player:player_id (full_name, avatar_url)
        `)
        .eq('coach_id', currentCoach.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        showToast('Erreur chargement joueurs', 'error');
        return;
    }
    players = data || [];
    document.getElementById('nbJoueurs').textContent = players.length;
    document.getElementById('statsJoueurs').textContent = players.length;
}

async function loadTrainingSessions() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_training_sessions')
        .select('*')
        .eq('coach_id', currentCoach.id)
        .order('date', { ascending: false });

    if (error) {
        console.error('Erreur chargement séances:', error);
        showToast('Erreur chargement séances', 'error');
        return;
    }
    trainingSessions = data || [];
    const thisMonth = trainingSessions.filter(s => {
        const d = new Date(s.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    document.getElementById('statsSeances').textContent = thisMonth;
    document.getElementById('nbSeances').textContent = trainingSessions.length;
}

async function loadEvents() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_events')
        .select('*')
        .eq('coach_id', currentCoach.id)
        .order('date', { ascending: true });

    if (error) {
        console.error('Erreur chargement événements:', error);
        showToast('Erreur chargement événements', 'error');
        return;
    }
    events = data || [];
    const upcoming = events.filter(e => new Date(e.date) >= new Date()).length;
    document.getElementById('statsEvents').textContent = upcoming;
}

async function loadLicenseStatus() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_license_requests')
        .select('status')
        .eq('coach_id', currentCoach.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement statut licence:', error);
        return;
    }
    let statusText = 'Non demandée';
    if (data) {
        switch (data.status) {
            case 'approved': statusText = 'Validée'; break;
            case 'rejected': statusText = 'Rejetée'; break;
            case 'president_pending': statusText = 'Validation président'; break;
            case 'admin_pending': statusText = 'En attente admin'; break;
            default: statusText = 'En cours';
        }
    }
    document.getElementById('statsLicence').textContent = statusText;
}

function updateStatsAndLists() {
    // Dernières séances
    const recentTrainings = trainingSessions.slice(0, 5);
    const trainingsHtml = recentTrainings.map(t => `
        <div class="recent-item">
            <div class="date">${new Date(t.date).toLocaleDateString('fr-FR')}</div>
            <div class="main">${t.title}</div>
            <div class="sub">${t.location || ''}</div>
        </div>
    `).join('');
    document.getElementById('recentTrainingList').innerHTML = trainingsHtml || '<p>Aucune séance récente</p>';

    // Derniers joueurs
    const recentPlayers = players.slice(0, 5);
    const playersHtml = recentPlayers.map(p => {
        const player = p.player || {};
        return `
            <div class="recent-item">
                <div class="main">${player.full_name || 'Joueur'}</div>
                <div class="sub">Depuis ${new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
        `;
    }).join('');
    document.getElementById('recentPlayersList').innerHTML = playersHtml || '<p>Aucun joueur récent</p>';

    // Prochains événements
    const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 5);
    const eventsHtml = upcomingEvents.map(e => `
        <div class="recent-item">
            <div class="date">${new Date(e.date).toLocaleDateString('fr-FR')}</div>
            <div class="main">${e.title}</div>
            <div class="sub">${e.location || ''}</div>
        </div>
    `).join('');
    document.getElementById('recentEventsList').innerHTML = eventsHtml || '<p>Aucun événement à venir</p>';
}

function initHonorairesChart() {
    const ctx = document.getElementById('honorairesChart').getContext('2d');
    if (honorairesChart) honorairesChart.destroy();

    // Pour l'instant, données factices. À remplacer par des vraies données de `coach_revenue` ou `coach_payments`
    const monthly = {
        '2025-01': 50000,
        '2025-02': 75000,
        '2025-03': 60000,
        '2025-04': 80000,
        '2025-05': 95000,
        '2025-06': 110000
    };
    const sortedKeys = Object.keys(monthly).sort();
    const labels = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return `${m}/${y}`;
    });
    const data = sortedKeys.map(k => monthly[k]);

    honorairesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Honoraires (FCFA)',
                data: data,
                borderColor: '#551B8C',
                backgroundColor: 'rgba(85,27,140,0.1)',
                tension: 0.4,
                pointBackgroundColor: '#FFCC00'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: value => value.toLocaleString() } } }
        }
    });
}

// ===== UPLOAD AVATAR =====
document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentCoach) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('L\'image ne doit pas dépasser 2 Mo', 'warning');
        return;
    }
    showLoader(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${currentCoach.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseCoachPrive.storage
            .from('avatars')
            .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabaseCoachPrive.storage.from('avatars').getPublicUrl(fileName);
        if (!data || !data.publicUrl) throw new Error('URL publique non générée');
        const publicURL = data.publicUrl;
        await supabaseCoachPrive
            .from('coach_profiles')
            .update({ avatar_url: publicURL })
            .eq('id', currentCoach.id);
        currentCoach.avatar_url = publicURL;
        const avatarWithTimestamp = `${publicURL}?t=${new Date().getTime()}`;
        document.getElementById('userAvatar').src = avatarWithTimestamp;
        document.getElementById('profileDisplay').src = avatarWithTimestamp;
        showToast('Avatar mis à jour avec succès', 'success');
    } catch (err) {
        console.error('Erreur upload avatar:', err);
        showToast('Erreur lors de la mise à jour de l\'avatar', 'error');
    } finally {
        showLoader(false);
    }
});

// ===== COPIER ID =====
window.copyID = () => {
    const id = document.getElementById('coachID').textContent.replace('ID: ', '');
    navigator.clipboard.writeText(id);
    showToast('ID copié !', 'success');
};

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
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

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

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
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0 && sidebar.classList.contains('active')) closeSidebarFunc();
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseCoachPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation du dashboard coach');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
    if (!currentCoach) return;

    await loadCoachData();

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang = e.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});
