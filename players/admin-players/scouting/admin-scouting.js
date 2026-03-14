// ===== CONFIGURATION SUPABASE (nom unique) =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseScoutingAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let allPlayers = [];
let currentPlayerId = null;
let currentScoutingData = null;

// ===== LISTE DES CHAMPS ATTRIBUTS =====
const techFields = [
    { name: 'technique_centres', label: 'Centres' },
    { name: 'technique_controle_balle', label: 'Contrôle balle' },
    { name: 'technique_corners', label: 'Corners' },
    { name: 'technique_coups_francs', label: 'Coups francs' },
    { name: 'technique_dribbles', label: 'Dribbles' },
    { name: 'technique_finition', label: 'Finition' },
    { name: 'technique_jeu_de_tete', label: 'Jeu de tête' },
    { name: 'technique_marquage', label: 'Marquage' },
    { name: 'technique_passes', label: 'Passes' },
    { name: 'technique_penalty', label: 'Penalty' },
    { name: 'technique_tactics', label: 'Tactique' },
    { name: 'technique_technique', label: 'Technique' },
    { name: 'technique_tirs_de_loin', label: 'Tirs de loin' },
    { name: 'technique_touches_longues', label: 'Touches longues' }
];

const mentalFields = [
    { name: 'mental_agressivite', label: 'Agressivité' },
    { name: 'mental_anticipation', label: 'Anticipation' },
    { name: 'mental_appels_de_balle', label: 'Appels de balle' },
    { name: 'mental_concentration', label: 'Concentration' },
    { name: 'mental_courage', label: 'Courage' },
    { name: 'mental_decisions', label: 'Décisions' },
    { name: 'mental_determination', label: 'Détermination' },
    { name: 'mental_inspiration', label: 'Inspiration' },
    { name: 'mental_jeu_collectif', label: 'Jeu collectif' },
    { name: 'mental_leadership', label: 'Leadership' },
    { name: 'mental_placement', label: 'Placement' },
    { name: 'mental_sang_froid', label: 'Sang-froid' },
    { name: 'mental_vision_du_jeu', label: 'Vision du jeu' },
    { name: 'mental_volume_de_jeu', label: 'Volume de jeu' }
];

const physiqueFields = [
    { name: 'physique_acceleration', label: 'Accélération' },
    { name: 'physique_agilite', label: 'Agilité' },
    { name: 'physique_detente_verticale', label: 'Détente verticale' },
    { name: 'physique_endurance', label: 'Endurance' },
    { name: 'physique_equilibre', label: 'Équilibre' },
    { name: 'physique_puissance', label: 'Puissance' },
    { name: 'physique_qualites_physiques_nat', label: 'Qualités phys. nat.' },
    { name: 'physique_vitesse', label: 'Vitesse' }
];

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
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
function showLoader(show) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION ADMIN =====
async function checkAdmin() {
    showLoader(true);
    const { data: { session }, error } = await supabaseScoutingAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseScoutingAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseScoutingAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DE LA LISTE DES JOUEURS =====
async function loadPlayers() {
    const { data, error } = await supabaseScoutingAdmin
        .from('player_profiles')
        .select('id, nom_complet')
        .order('nom_complet');
    if (error) {
        console.error('Erreur chargement joueurs:', error);
        showToast('Erreur chargement joueurs', 'error');
        return [];
    }
    return data || [];
}

// ===== CHARGEMENT DES DONNÉES SCOUTING =====
async function loadScoutingData(playerId) {
    const { data, error } = await supabaseScoutingAdmin
        .from('player_scouting')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement scouting:', error);
        showToast('Erreur chargement données scouting', 'error');
        return null;
    }
    return data;
}

// ===== CRÉATION D'UNE NOUVELLE LIGNE SCOUTING =====
async function createScoutingData(playerId) {
    const { data, error } = await supabaseScoutingAdmin
        .from('player_scouting')
        .insert([{ player_id: playerId }])
        .select()
        .single();
    if (error) {
        console.error('Erreur création scouting:', error);
        showToast('Erreur création données scouting', 'error');
        return null;
    }
    return data;
}

// ===== CHARGEMENT DU PROFIL JOUEUR (pour affichage) =====
async function loadPlayerProfile(playerId) {
    const { data, error } = await supabaseScoutingAdmin
        .from('player_profiles')
        .select('*')
        .eq('id', playerId)
        .single();
    if (error) {
        console.error('Erreur chargement profil joueur:', error);
        return null;
    }
    return data;
}

// ===== GÉNÉRATION DES GRILLES D'ATTRIBUTS =====
function generateAttrGrids() {
    const techHtml = techFields.map(f => `
        <div class="attr-item">
            <span>${f.label}</span>
            <input type="number" name="${f.name}" value="0" min="0" max="20">
        </div>
    `).join('');
    document.getElementById('techGrid').innerHTML = techHtml;

    const mentalHtml = mentalFields.map(f => `
        <div class="attr-item">
            <span>${f.label}</span>
            <input type="number" name="${f.name}" value="0" min="0" max="20">
        </div>
    `).join('');
    document.getElementById('mentalGrid').innerHTML = mentalHtml;

    const physiqueHtml = physiqueFields.map(f => `
        <div class="attr-item">
            <span>${f.label}</span>
            <input type="number" name="${f.name}" value="0" min="0" max="20">
        </div>
    `).join('');
    document.getElementById('physiqueGrid').innerHTML = physiqueHtml;
}

// ===== REMPLIR LE FORMULAIRE =====
function fillForm(profile, scouting) {
    // Profil (lecture seule)
    document.getElementById('fullName').value = profile.nom_complet || '';
    document.getElementById('position').value = profile.position || '';
    document.getElementById('age').value = profile.age || '';
    document.getElementById('taille').value = profile.height || profile.taille_cm || '';
    document.getElementById('poids').value = profile.poids_kg || '';
    document.getElementById('nationalite').value = profile.nationalite || '';
    document.getElementById('piedFort').value = profile.preferred_foot || profile.pied_fort || '';
    document.getElementById('club').value = profile.club || '';

    // Stats globales
    document.getElementById('niveauActuel').value = scouting.niveau_actuel || 0;
    document.getElementById('potentiel').value = scouting.potentiel || 0;
    document.getElementById('personnalite').value = scouting.personnalite || 0;
    document.getElementById('valeurMarche').value = scouting.valeur_marche || 0;
    document.getElementById('salaire').value = scouting.salaire || 0;
    document.getElementById('pretInfo').value = scouting.pret_info || '';
    document.getElementById('expireLe').value = scouting.expire_le || '';
    document.getElementById('selectionJeunes').value = scouting.selection_jeunes || '';

    // Vidéos/rapports
    document.getElementById('videoHighlights').value = scouting.video_highlights_url || '';
    document.getElementById('videoMatch').value = scouting.video_match_complet_url || '';
    document.getElementById('rapportsRecruteurs').value = scouting.rapports_recruteurs || '';

    // Infos complémentaires
    document.getElementById('secondaryPositions').value = scouting.secondary_positions || '';
    document.getElementById('leftFootRating').value = scouting.left_foot_rating || 0;
    document.getElementById('rightFootRating').value = scouting.right_foot_rating || 0;
    document.getElementById('strengths').value = scouting.strengths || '';
    document.getElementById('weaknesses').value = scouting.weaknesses || '';
    document.getElementById('contractExpiry').value = scouting.contract_expiry || '';
    document.getElementById('nextEvaluation').value = scouting.next_evaluation || '';

    // Attributs techniques
    techFields.forEach(f => {
        const input = document.querySelector(`input[name="${f.name}"]`);
        if (input) input.value = scouting[f.name] || 0;
    });
    mentalFields.forEach(f => {
        const input = document.querySelector(`input[name="${f.name}"]`);
        if (input) input.value = scouting[f.name] || 0;
    });
    physiqueFields.forEach(f => {
        const input = document.querySelector(`input[name="${f.name}"]`);
        if (input) input.value = scouting[f.name] || 0;
    });
}

// ===== SAUVEGARDER =====
async function saveScouting(e) {
    e.preventDefault();
    if (!currentPlayerId) return;

    const form = document.getElementById('scoutingForm');
    const formData = new FormData(form);
    const updates = {};

    // Récupérer tous les champs
    for (let [key, value] of formData.entries()) {
        // Ne pas prendre les champs readonly (ils sont dans le profil)
        if (key.startsWith('technique_') || key.startsWith('mental_') || key.startsWith('physique_') ||
            key === 'niveauActuel' || key === 'potentiel' || key === 'personnalite' || key === 'valeurMarche' ||
            key === 'salaire' || key === 'pretInfo' || key === 'expireLe' || key === 'selectionJeunes' ||
            key === 'videoHighlights' || key === 'videoMatch' || key === 'rapportsRecruteurs' ||
            key === 'secondaryPositions' || key === 'leftFootRating' || key === 'rightFootRating' ||
            key === 'strengths' || key === 'weaknesses' || key === 'contractExpiry' || key === 'nextEvaluation') {
            updates[key] = value === '' ? null : value;
        }
    }

    // Renommer certains champs pour correspondre à la base
    updates.niveau_actuel = updates.niveauActuel; delete updates.niveauActuel;
    updates.valeur_marche = updates.valeurMarche; delete updates.valeurMarche;
    updates.pret_info = updates.pretInfo; delete updates.pretInfo;
    updates.selection_jeunes = updates.selectionJeunes; delete updates.selectionJeunes;
    updates.video_highlights_url = updates.videoHighlights; delete updates.videoHighlights;
    updates.video_match_complet_url = updates.videoMatch; delete updates.videoMatch;
    updates.rapports_recruteurs = updates.rapportsRecruteurs; delete updates.rapportsRecruteurs;
    updates.left_foot_rating = updates.leftFootRating; delete updates.leftFootRating;
    updates.right_foot_rating = updates.rightFootRating; delete updates.rightFootRating;
    updates.secondary_positions = updates.secondaryPositions; delete updates.secondaryPositions;
    updates.contract_expiry = updates.contractExpiry; delete updates.contractExpiry;
    updates.next_evaluation = updates.nextEvaluation; delete updates.nextEvaluation;

    // Ajouter updated_at
    updates.updated_at = new Date();

    showLoader(true);
    try {
        const { error } = await supabaseScoutingAdmin
            .from('player_scouting')
            .update(updates)
            .eq('player_id', currentPlayerId);

        if (error) throw error;

        showToast('Données scouting mises à jour', 'success');
        // Recharger les données pour refléter les changements
        const newScouting = await loadScoutingData(currentPlayerId);
        if (newScouting) currentScoutingData = newScouting;
    } catch (error) {
        console.error('Erreur sauvegarde scouting:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RÉINITIALISER =====
function resetForm() {
    if (!currentPlayerId || !currentScoutingData) return;
    // Recharger les données depuis l'état global
    const profile = {
        nom_complet: document.getElementById('fullName').value,
        position: document.getElementById('position').value,
        age: document.getElementById('age').value,
        height: document.getElementById('taille').value,
        poids_kg: document.getElementById('poids').value,
        nationalite: document.getElementById('nationalite').value,
        preferred_foot: document.getElementById('piedFort').value,
        club: document.getElementById('club').value
    };
    fillForm(profile, currentScoutingData);
    showToast('Formulaire réinitialisé', 'info');
}

// ===== CHARGEMENT DU JOUEUR SÉLECTIONNÉ =====
async function loadSelectedPlayer() {
    const playerId = parseInt(document.getElementById('playerSelect').value);
    if (!playerId) {
        document.getElementById('scoutingForm').style.display = 'none';
        document.getElementById('noSelectionMessage').style.display = 'block';
        return;
    }

    showLoader(true);
    currentPlayerId = playerId;
    try {
        // Charger le profil
        const profile = await loadPlayerProfile(playerId);
        if (!profile) throw new Error('Profil introuvable');

        // Charger les données scouting
        let scouting = await loadScoutingData(playerId);
        if (!scouting) {
            scouting = await createScoutingData(playerId);
            if (!scouting) throw new Error('Impossible de créer les données scouting');
        }
        currentScoutingData = scouting;

        // Remplir le formulaire
        fillForm(profile, scouting);

        document.getElementById('scoutingForm').style.display = 'block';
        document.getElementById('noSelectionMessage').style.display = 'none';
    } catch (error) {
        console.error(error);
        showToast('Erreur lors du chargement du joueur', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== INITIALISATION =====
async function init() {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;

    generateAttrGrids();

    // Charger la liste des joueurs
    allPlayers = await loadPlayers();
    const select = document.getElementById('playerSelect');
    select.innerHTML = '<option value="">Choisir un joueur...</option>' +
        allPlayers.map(p => `<option value="${p.id}">${p.nom_complet}</option>`).join('');

    // Événements
    document.getElementById('loadPlayerBtn').addEventListener('click', loadSelectedPlayer);
    document.getElementById('scoutingForm').addEventListener('submit', saveScouting);
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    document.getElementById('refreshBtn').addEventListener('click', () => {
        if (currentPlayerId) loadSelectedPlayer();
    });

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabaseScoutingAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
    });
}

document.addEventListener('DOMContentLoaded', init);