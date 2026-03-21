// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let playerCV = null;
let scoutingData = null;

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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL (depuis profiles) =====
async function loadProfile() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();
        if (error) {
            console.error('Erreur chargement profil:', error);
            return null;
        }
        playerProfile = data;
        document.getElementById('userName').textContent = playerProfile.full_name || 'Joueur';
        document.getElementById('userAvatar').src = playerProfile.avatar_url || 'img/user-default.jpg';
        return playerProfile;
    } catch (err) {
        console.error('❌ Exception loadProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DES DONNÉES SPORTIVES (player_cv) =====
async function loadPlayerCV() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_cv')
            .select('data')
            .eq('player_id', currentUser.id)
            .maybeSingle();
        if (error) {
            console.error('Erreur chargement player_cv:', error);
            return;
        }
        playerCV = data?.data || {};
    } catch (err) {
        console.error('❌ Exception loadPlayerCV:', err);
    }
}

// ===== CHARGEMENT DES DONNÉES DE SCOUTING =====
async function loadScoutingData() {
    if (!playerProfile) return;
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_scouting')
            .select('*')
            .eq('player_id', currentUser.id)
            .maybeSingle();
        if (error) {
            console.error('Erreur chargement scouting:', error);
            return;
        }
        scoutingData = data || {};
        renderPage();
    } catch (err) {
        console.error('❌ Exception loadScoutingData:', err);
    }
}

// ===== CALCUL DES 8 COMPÉTENCES CLÉS =====
function computeSkills() {
    const defense = average([
        scoutingData.technique_marquage,
        scoutingData.mental_agressivite,
        scoutingData.mental_anticipation,
        scoutingData.physique_puissance
    ]);

    const mental = average([
        scoutingData.mental_agressivite,
        scoutingData.mental_anticipation,
        scoutingData.mental_appels_de_balle,
        scoutingData.mental_concentration,
        scoutingData.mental_courage,
        scoutingData.mental_decisions,
        scoutingData.mental_determination,
        scoutingData.mental_inspiration,
        scoutingData.mental_jeu_collectif,
        scoutingData.mental_leadership,
        scoutingData.mental_placement,
        scoutingData.mental_sang_froid,
        scoutingData.mental_vision_du_jeu,
        scoutingData.mental_volume_de_jeu
    ]);

    const physique = average([
        scoutingData.physique_acceleration,
        scoutingData.physique_agilite,
        scoutingData.physique_detente_verticale,
        scoutingData.physique_endurance,
        scoutingData.physique_equilibre,
        scoutingData.physique_puissance,
        scoutingData.physique_qualites_physiques_nat,
        scoutingData.physique_vitesse
    ]);

    const aerien = average([
        scoutingData.technique_jeu_de_tete,
        scoutingData.physique_detente_verticale
    ]);

    const vitesse = average([
        scoutingData.physique_vitesse,
        scoutingData.physique_acceleration
    ]);

    const technique = average([
        scoutingData.technique_centres,
        scoutingData.technique_controle_balle,
        scoutingData.technique_corners,
        scoutingData.technique_coups_francs,
        scoutingData.technique_dribbles,
        scoutingData.technique_finition,
        scoutingData.technique_jeu_de_tete,
        scoutingData.technique_marquage,
        scoutingData.technique_passes,
        scoutingData.technique_penalty,
        scoutingData.technique_tactics,
        scoutingData.technique_technique,
        scoutingData.technique_tirs_de_loin,
        scoutingData.technique_touches_longues
    ]);

    const vision = average([
        scoutingData.mental_vision_du_jeu,
        scoutingData.technique_passes,
        scoutingData.technique_tactics
    ]);

    const attaque = average([
        scoutingData.technique_finition,
        scoutingData.technique_dribbles,
        scoutingData.technique_tirs_de_loin
    ]);

    return {
        defense, mental, physique, aerien, vitesse, technique, vision, attaque
    };
}

function average(arr) {
    const valid = arr.filter(v => v != null && !isNaN(v));
    if (valid.length === 0) return 0;
    const sum = valid.reduce((a, b) => a + b, 0);
    return Math.round(sum / valid.length);
}

// ===== RENDU DE LA PAGE =====
function renderPage() {
    if (!playerProfile) return;

    // Postes (depuis player_cv)
    const primary = playerCV.position || 'Non renseigné';
    document.getElementById('primaryPosition').textContent = primary;
    const secondary = scoutingData.secondary_positions || 'Non renseigné';
    document.getElementById('secondaryPositions').textContent = secondary;

    // Pieds
    const preferredFoot = playerCV.piedFort || 'Droitier';
    let leftRating = scoutingData.left_foot_rating || 0;
    let rightRating = scoutingData.right_foot_rating || 0;
    if (leftRating === 0 && rightRating === 0) {
        if (preferredFoot.toLowerCase().includes('gauche')) {
            leftRating = 85;
            rightRating = 30;
        } else if (preferredFoot.toLowerCase().includes('droit')) {
            leftRating = 30;
            rightRating = 85;
        } else {
            leftRating = 50;
            rightRating = 50;
        }
    }
    document.getElementById('leftFootBar').style.width = leftRating + '%';
    document.getElementById('rightFootBar').style.width = rightRating + '%';
    document.getElementById('leftFootLabel').textContent = leftRating >= 70 ? 'Très fort' : (leftRating >= 40 ? 'Moyen' : 'Faible');
    document.getElementById('rightFootLabel').textContent = rightRating >= 70 ? 'Très fort' : (rightRating >= 40 ? 'Moyen' : 'Faible');

    // Dates clés
    const expiry = scoutingData.expire_le ? new Date(scoutingData.expire_le).toLocaleDateString('fr-FR') : 'Non renseigné';
    document.getElementById('contractExpiry').textContent = expiry;
    document.getElementById('nextReport').textContent = 'mars 2025'; // exemple
    document.getElementById('lastUpdate').textContent = scoutingData.updated_at ? new Date(scoutingData.updated_at).toLocaleDateString('fr-FR') : '-';

    // Points forts/faibles
    document.getElementById('strengths').textContent = scoutingData.strengths || 'Aucun atout exceptionnel';
    document.getElementById('weaknesses').textContent = scoutingData.weaknesses || 'Aucune faiblesse exceptionnelle';

    // Graphique radar
    const skills = computeSkills();
    const ctx = document.getElementById('skillsRadar').getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Défense', 'Mental', 'Physique', 'Jeu aérien', 'Vitesse', 'Technique', 'Vision du jeu', 'Attaque'],
            datasets: [{
                label: 'Niveau',
                data: [
                    skills.defense,
                    skills.mental,
                    skills.physique,
                    skills.aerien,
                    skills.vitesse,
                    skills.technique,
                    skills.vision,
                    skills.attaque
                ],
                backgroundColor: 'rgba(85, 27, 140, 0.2)',
                borderColor: '#551B8C',
                pointBackgroundColor: '#ffcc00',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#551B8C',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        color: '#6c757d'
                    },
                    grid: {
                        color: '#e9ecef'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.raw}/100`
                    }
                }
            }
        }
    });
}

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
            if (e.cancelable) {
                e.preventDefault();
            }
            if (diffX > 0 && touchStartX < 50) {
                openSidebar();
            } else if (diffX < 0 && sidebar.classList.contains('active')) {
                closeSidebarFunc();
            }
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabasePlayersSpacePrive.auth.signOut().then(() => window.location.href = '../index.html');
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation scouting-detail');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!playerProfile) return;
    await loadPlayerCV();
    await loadScoutingData();

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
});