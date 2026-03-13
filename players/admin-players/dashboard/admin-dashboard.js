// ===== CONFIGURATION (héritée de admin-common.js) =====
// Nous utilisons supabaseAdmin (défini dans admin-common.js)
// mais on le référence via la variable globale

let currentPlayerId = null;
let clubsList = [];

// ===== CHARGEMENT DE LA LISTE DES JOUEURS =====
async function loadPlayers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterClub = document.getElementById('filterClub').value;

    let query = supabaseAdmin
        .from('player_profiles')
        .select('id, nom_complet, position, club, avatar_url, hub_id')
        .order('nom_complet');

    if (searchTerm) {
        query = query.or(`nom_complet.ilike.%${searchTerm}%,hub_id.ilike.%${searchTerm}%`);
    }
    if (filterClub) {
        query = query.eq('club', filterClub);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erreur chargement joueurs:', error);
        showToast('Erreur chargement liste joueurs', 'error');
        return;
    }
    renderPlayersList(data || []);
    // Mettre à jour la liste des clubs pour le filtre
    updateClubsFilter(data || []);
}

function renderPlayersList(players) {
    const container = document.getElementById('playersListContainer');
    container.innerHTML = players.map(p => `
        <div class="player-item ${p.id === currentPlayerId ? 'selected' : ''}" data-player-id="${p.id}">
            <img src="${p.avatar_url || '../../img/user-default.jpg'}" class="player-avatar">
            <div class="player-info">
                <div class="player-name">${p.nom_complet || 'Sans nom'}</div>
                <div class="player-detail">${p.position || 'Poste ?'} | ${p.club || 'Club ?'}</div>
            </div>
        </div>
    `).join('');

    // Ajouter les événements de clic
    document.querySelectorAll('.player-item').forEach(item => {
        item.addEventListener('click', () => {
            const playerId = parseInt(item.dataset.playerId);
            selectPlayer(playerId);
        });
    });
}

function updateClubsFilter(players) {
    const clubs = [...new Set(players.map(p => p.club).filter(c => c))];
    const select = document.getElementById('filterClub');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Tous les clubs</option>' + 
        clubs.map(c => `<option value="${c}">${c}</option>`).join('');
    if (currentValue) select.value = currentValue;
}

// ===== SÉLECTION D'UN JOUEUR =====
async function selectPlayer(playerId) {
    currentPlayerId = playerId;
    document.querySelectorAll('.player-item').forEach(item => item.classList.remove('selected'));
    document.querySelector(`.player-item[data-player-id="${playerId}"]`).classList.add('selected');

    // Charger les données du joueur depuis player_profiles et player_scouting
    const [profileRes, scoutingRes] = await Promise.all([
        supabaseAdmin.from('player_profiles').select('*').eq('id', playerId).single(),
        supabaseAdmin.from('player_scouting').select('*').eq('player_id', playerId).maybeSingle()
    ]);

    if (profileRes.error) {
        showToast('Erreur chargement profil', 'error');
        return;
    }
    const profile = profileRes.data;
    let scouting = scoutingRes.data;
    if (!scouting) {
        // Créer une ligne scouting vide si elle n'existe pas
        const { data: newScouting, error: insertError } = await supabaseAdmin
            .from('player_scouting')
            .insert([{ player_id: playerId }])
            .select()
            .single();
        if (insertError) {
            showToast('Erreur création données scouting', 'error');
            return;
        }
        scouting = newScouting;
    }

    fillForm(profile, scouting);
    document.getElementById('playerForm').style.display = 'block';
    document.getElementById('noSelectionMessage').style.display = 'none';
    document.getElementById('editTitle').textContent = `Modifier ${profile.nom_complet || 'joueur'}`;
}

// ===== REMPLIR LE FORMULAIRE =====
function fillForm(profile, scouting) {
    // Informations personnelles
    document.getElementById('playerId').value = profile.id;
    document.getElementById('nomComplet').value = profile.nom_complet || '';
    document.getElementById('position').value = profile.position || '';
    document.getElementById('taille').value = profile.height || profile.taille_cm || '';
    document.getElementById('poids').value = profile.poids_kg || '';
    document.getElementById('nationalite').value = profile.nationalite || '';
    document.getElementById('piedFort').value = profile.preferred_foot || profile.pied_fort || '';
    document.getElementById('club').value = profile.club || '';
    document.getElementById('age').value = profile.age || '';
    document.getElementById('avatarUrl').value = profile.avatar_url || '';

    // Statistiques profil
    document.getElementById('profileCompletion').value = profile.profile_completion || 0;
    document.getElementById('scoutingViews').value = profile.scouting_views || 0;
    document.getElementById('recruiterFavs').value = profile.recruiter_favs || 0;

    // Stats globales scouting
    document.getElementById('niveauActuel').value = scouting.niveau_actuel || 0;
    document.getElementById('potentiel').value = scouting.potentiel || 0;
    document.getElementById('personnalite').value = scouting.personnalite || 0;
    document.getElementById('valeurMarche').value = scouting.valeur_marche || 0;
    document.getElementById('pretInfo').value = scouting.pret_info || '';
    document.getElementById('salaire').value = scouting.salaire || 0;
    document.getElementById('expireLe').value = scouting.expire_le ? scouting.expire_le.slice(0,10) : '';
    document.getElementById('selectionJeunes').value = scouting.selection_jeunes || '';

    // Attributs techniques (14)
    const techFields = [
        'technique_centres', 'technique_controle_balle', 'technique_corners', 'technique_coups_francs',
        'technique_dribbles', 'technique_finition', 'technique_jeu_de_tete', 'technique_marquage',
        'technique_passes', 'technique_penalty', 'technique_tactics', 'technique_technique',
        'technique_tirs_de_loin', 'technique_touches_longues'
    ];
    let techHtml = '';
    techFields.forEach(field => {
        techHtml += `
            <div class="form-group">
                <label>${field.replace('technique_', '').replace(/_/g, ' ')}</label>
                <input type="number" name="${field}" value="${scouting[field] || 0}">
            </div>
        `;
    });
    document.querySelector('#playerForm fieldset:nth-child(4) .attr-grid').innerHTML = techHtml;

    // Attributs mentaux
    const mentalFields = [
        'mental_agressivite', 'mental_anticipation', 'mental_appels_de_balle', 'mental_concentration',
        'mental_courage', 'mental_decisions', 'mental_determination', 'mental_inspiration',
        'mental_jeu_collectif', 'mental_leadership', 'mental_placement', 'mental_sang_froid',
        'mental_vision_du_jeu', 'mental_volume_de_jeu'
    ];
    let mentalHtml = '';
    mentalFields.forEach(field => {
        mentalHtml += `
            <div class="form-group">
                <label>${field.replace('mental_', '').replace(/_/g, ' ')}</label>
                <input type="number" name="${field}" value="${scouting[field] || 0}">
            </div>
        `;
    });
    document.getElementById('mentalGrid').innerHTML = mentalHtml;

    // Attributs physiques
    const physiqueFields = [
        'physique_acceleration', 'physique_agilite', 'physique_detente_verticale', 'physique_endurance',
        'physique_equilibre', 'physique_puissance', 'physique_qualites_physiques_nat', 'physique_vitesse'
    ];
    let physiqueHtml = '';
    physiqueFields.forEach(field => {
        physiqueHtml += `
            <div class="form-group">
                <label>${field.replace('physique_', '').replace(/_/g, ' ')}</label>
                <input type="number" name="${field}" value="${scouting[field] || 0}">
            </div>
        `;
    });
    document.getElementById('physiqueGrid').innerHTML = physiqueHtml;

    // Rapports
    document.getElementById('rapportsRecruteurs').value = scouting.rapports_recruteurs || '';
}

// ===== ENREGISTREMENT =====
document.getElementById('playerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const playerId = parseInt(document.getElementById('playerId').value);
    if (!playerId) return;

    // Collecte des données du formulaire
    const profileUpdates = {
        nom_complet: document.getElementById('nomComplet').value,
        position: document.getElementById('position').value,
        height: parseInt(document.getElementById('taille').value) || null,
        poids_kg: parseInt(document.getElementById('poids').value) || null,
        nationalite: document.getElementById('nationalite').value,
        preferred_foot: document.getElementById('piedFort').value,
        club: document.getElementById('club').value,
        age: parseInt(document.getElementById('age').value) || null,
        avatar_url: document.getElementById('avatarUrl').value || null,
        profile_completion: parseInt(document.getElementById('profileCompletion').value) || 0,
        scouting_views: parseInt(document.getElementById('scoutingViews').value) || 0,
        recruiter_favs: parseInt(document.getElementById('recruiterFavs').value) || 0
    };

    // Mise à jour player_profiles
    const { error: profileError } = await supabaseAdmin
        .from('player_profiles')
        .update(profileUpdates)
        .eq('id', playerId);
    if (profileError) {
        showToast('Erreur mise à jour profil: ' + profileError.message, 'error');
        return;
    }

    // Collecte des données scouting
    const scoutingUpdates = {
        niveau_actuel: parseInt(document.getElementById('niveauActuel').value) || 0,
        potentiel: parseInt(document.getElementById('potentiel').value) || 0,
        personnalite: parseInt(document.getElementById('personnalite').value) || 0,
        valeur_marche: parseInt(document.getElementById('valeurMarche').value) || 0,
        pret_info: document.getElementById('pretInfo').value,
        salaire: parseInt(document.getElementById('salaire').value) || 0,
        expire_le: document.getElementById('expireLe').value || null,
        selection_jeunes: document.getElementById('selectionJeunes').value,
        rapports_recruteurs: document.getElementById('rapportsRecruteurs').value
    };

    // Attributs techniques
    document.querySelectorAll('#playerForm fieldset:nth-child(4) .attr-grid input').forEach(input => {
        scoutingUpdates[input.name] = parseInt(input.value) || 0;
    });
    // Attributs mentaux
    document.querySelectorAll('#mentalGrid input').forEach(input => {
        scoutingUpdates[input.name] = parseInt(input.value) || 0;
    });
    // Attributs physiques
    document.querySelectorAll('#physiqueGrid input').forEach(input => {
        scoutingUpdates[input.name] = parseInt(input.value) || 0;
    });

    const { error: scoutingError } = await supabaseAdmin
        .from('player_scouting')
        .update(scoutingUpdates)
        .eq('player_id', playerId);

    if (scoutingError) {
        showToast('Erreur mise à jour scouting: ' + scoutingError.message, 'error');
        return;
    }

    showToast('Données mises à jour avec succès !', 'success');
    // Recharger la liste pour voir les changements (optionnel)
    loadPlayers();
});

// ===== SUPPRESSION D'UN JOUEUR =====
document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!currentPlayerId) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur ? Toutes ses données associées (CV, médias, etc.) seront également supprimées.')) return;

    const { error } = await supabaseAdmin
        .from('player_profiles')
        .delete()
        .eq('id', currentPlayerId);

    if (error) {
        showToast('Erreur suppression: ' + error.message, 'error');
    } else {
        showToast('Joueur supprimé', 'success');
        currentPlayerId = null;
        document.getElementById('playerForm').style.display = 'none';
        document.getElementById('noSelectionMessage').style.display = 'block';
        document.getElementById('editTitle').textContent = 'Sélectionnez un joueur';
        loadPlayers();
    }
});

// ===== RECHERCHE ET FILTRES =====
document.getElementById('searchInput').addEventListener('input', loadPlayers);
document.getElementById('filterClub').addEventListener('change', loadPlayers);
document.getElementById('refreshBtn').addEventListener('click', loadPlayers);

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier que l'utilisateur est admin (via admin-common.js)
    await initAdminPage(); // fourni dans admin-common.js
    // Charger la liste des joueurs
    loadPlayers();

    // Gérer la déconnexion (bouton déjà dans admin-common.js)
});