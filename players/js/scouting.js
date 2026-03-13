// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseScouting = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let scoutingData = null;
let radarChart = null;

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
    const { data: { session }, error } = await supabaseScouting.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadPlayerProfile() {
    const { data, error } = await supabaseScouting
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    if (error) {
        console.error('Erreur chargement profil:', error);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
    playerProfile = data;
    document.getElementById('userName').textContent = playerProfile.nom_complet || 'Joueur';
    document.getElementById('userAvatar').src = playerProfile.avatar_url || 'img/user-default.jpg';
    return playerProfile;
}

// ===== CHARGEMENT DES DONNÉES DE SCOUTING =====
async function loadScoutingData() {
    const { data, error } = await supabaseScouting
        .from('player_scouting')
        .select('*')
        .eq('player_id', playerProfile.id)
        .maybeSingle();
    if (error) {
        console.error('Erreur chargement scouting:', error);
        showToast('Erreur chargement données', 'error');
        return;
    }
    if (!data) {
        // Créer une ligne par défaut
        const { data: newData, error: insertError } = await supabaseScouting
            .from('player_scouting')
            .insert([{ player_id: playerProfile.id }])
            .select()
            .single();
        if (insertError) {
            console.error('Erreur création scouting:', insertError);
            showToast('Erreur initialisation', 'error');
            return;
        }
        scoutingData = newData;
    } else {
        scoutingData = data;
    }
    updateUI();
}

// ===== FONCTIONS DE CALCUL DES 8 COMPÉTENCES =====
function computeSkills() {
    const def = average([
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
    const phys = average([
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
        defense: def,
        mental: mental,
        physique: phys,
        aerien: aerien,
        vitesse: vitesse,
        technique: technique,
        vision: vision,
        attaque: attaque
    };
}

function average(arr) {
    const valid = arr.filter(v => v != null && !isNaN(v));
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ===== MISE À JOUR DE L'INTERFACE =====
function updateUI() {
    if (!playerProfile || !scoutingData) return;

    // Postes
    document.getElementById('primaryPosition').textContent = playerProfile.position || 'ST';
    document.getElementById('secondaryPositions').textContent = scoutingData.secondary_positions || 'MD, M(C)';

    // Pieds
    let leftRating = scoutingData.left_foot_rating || 0;
    let rightRating = scoutingData.right_foot_rating || 0;
    if (leftRating === 0 && rightRating === 0) {
        // Valeurs par défaut basées sur le pied fort
        const foot = playerProfile.preferred_foot || 'Droitier';
        if (foot.includes('Gauche')) {
            leftRating = 85;
            rightRating = 30;
        } else {
            leftRating = 30;
            rightRating = 85;
        }
    }
    document.getElementById('leftFootFill').style.width = leftRating + '%';
    document.getElementById('rightFootFill').style.width = rightRating + '%';
    document.getElementById('leftFootLabel').textContent = leftRating >= 70 ? 'Très fort' : (leftRating >= 40 ? 'Moyen' : 'Faible');
    document.getElementById('rightFootLabel').textContent = rightRating >= 70 ? 'Très fort' : (rightRating >= 40 ? 'Moyen' : 'Faible');

    // Dates clés (si présentes)
    if (scoutingData.contract_expiry) {
        document.getElementById('date1').textContent = new Date(scoutingData.contract_expiry).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    }
    if (scoutingData.next_evaluation) {
        document.getElementById('date2').textContent = new Date(scoutingData.next_evaluation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    }
    // La troisième date peut être personnalisée

    // Points forts/faibles
    document.getElementById('strengthsText').textContent = scoutingData.strengths || 'Aucun atout exceptionnel';
    document.getElementById('weaknessesText').textContent = scoutingData.weaknesses || 'Aucune faiblesse exceptionnelle';

    // Radar
    const skills = computeSkills();
    updateRadar(skills);
    // Mettre à jour les valeurs textuelles
    document.getElementById('val_defense').textContent = skills.defense;
    document.getElementById('val_mental').textContent = skills.mental;
    document.getElementById('val_physique').textContent = skills.physique;
    document.getElementById('val_aerien').textContent = skills.aerien;
    document.getElementById('val_vitesse').textContent = skills.vitesse;
    document.getElementById('val_technique').textContent = skills.technique;
    document.getElementById('val_vision').textContent = skills.vision;
    document.getElementById('val_attaque').textContent = skills.attaque;
}

// ===== CRÉATION DU RADAR =====
function updateRadar(skills) {
    const ctx = document.getElementById('skillsRadar').getContext('2d');
    if (radarChart) radarChart.destroy();

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Défense', 'Mental', 'Physique', 'Jeu aérien', 'Vitesse', 'Technique', 'Vision du jeu', 'Attaque'],
            datasets: [{
                label: 'Compétences',
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
                backgroundColor: 'rgba(85,27,140,0.2)',
                borderColor: '#551B8C',
                pointBackgroundColor: '#ffcc00',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#551B8C'
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 20,
                    ticks: {
                        stepSize: 5
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    userMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown?.classList.remove('show'));
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    function open() { sidebar?.classList.add('active'); overlay?.classList.add('active'); }
    function close() { sidebar?.classList.remove('active'); overlay?.classList.remove('active'); }
    menuBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseScouting.auth.signOut().then(() => window.location.href = '../index.html');
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    if (!playerProfile) return;

    await loadScoutingData();

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
});