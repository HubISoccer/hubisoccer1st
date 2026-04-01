// ===== ÉTATS GLOBAUX =====
let currentUser = null;
let userTeams = [];
let currentTeamId = null;
let currentTeam = null;
let teamPlayers = [];
let sports = [];

// ===== RÉCUPÉRATION DE L'UTILISATEUR =====
async function getCurrentUser() {
    const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
    if (!error && user) return user;
    return null;
}

// ===== CHARGEMENT DES SPORTS =====
async function loadSports() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_sports')
        .select('id, name')
        .order('name');
    if (error) {
        console.error(error);
        return;
    }
    sports = data || [];
    const select = document.getElementById('teamSportInput');
    select.innerHTML = '<option value="">Sélectionnez un sport</option>' +
        sports.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

// ===== CHARGEMENT DES ÉQUIPES DE L'UTILISATEUR =====
async function loadUserTeams() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_teams')
        .select('*')
        .eq('created_by', currentUser.id)
        .order('name');
    if (error) {
        console.error(error);
        showToast('Erreur chargement équipes', 'error');
        return;
    }
    userTeams = data || [];
    const select = document.getElementById('teamSelect');
    if (!userTeams.length) {
        select.innerHTML = '<option value="">Aucune équipe</option>';
        document.getElementById('teamInfo').style.display = 'none';
        document.getElementById('addPlayerBtn').style.display = 'none';
        return;
    }
    select.innerHTML = '<option value="">-- Sélectionnez une équipe --</option>' +
        userTeams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    if (userTeams.length === 1 && !currentTeamId) {
        select.value = userTeams[0].id;
        loadTeam(userTeams[0].id);
    }
    select.addEventListener('change', () => {
        const id = select.value ? parseInt(select.value) : null;
        if (id) loadTeam(id);
        else {
            currentTeamId = null;
            document.getElementById('teamInfo').style.display = 'none';
            document.getElementById('addPlayerBtn').style.display = 'none';
            document.getElementById('playersList').innerHTML = '';
        }
    });
}

// ===== CHARGEMENT D'UNE ÉQUIPE =====
async function loadTeam(teamId) {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_teams')
        .select(`
            *,
            sport:sport_id (name),
            creator:created_by (full_name)
        `)
        .eq('id', teamId)
        .single();
    if (error) {
        showToast('Erreur chargement équipe', 'error');
        return;
    }
    currentTeam = data;
    currentTeamId = teamId;
    displayTeamInfo();
    loadTeamPlayers();
    document.getElementById('addPlayerBtn').style.display = currentTeam.created_by === currentUser.id ? 'flex' : 'none';
}

function displayTeamInfo() {
    document.getElementById('teamInfo').style.display = 'flex';
    document.getElementById('teamName').textContent = currentTeam.name;
    document.getElementById('teamCategory').textContent = currentTeam.age_category || 'Non spécifiée';
    document.getElementById('teamSport').textContent = currentTeam.sport?.name || '-';
    document.getElementById('teamCreator').textContent = currentTeam.creator?.full_name || 'Vous';
    document.getElementById('teamCreated').textContent = new Date(currentTeam.created_at).toLocaleDateString('fr-FR');
    const logoContainer = document.getElementById('teamLogo');
    if (currentTeam.logo_url) {
        logoContainer.innerHTML = `<img src="${currentTeam.logo_url}" alt="${currentTeam.name}">`;
    } else {
        logoContainer.innerHTML = '<i class="fas fa-users"></i>';
    }
    document.getElementById('editTeamBtn').style.display = currentTeam.created_by === currentUser.id ? 'inline-flex' : 'none';
}

async function loadTeamPlayers() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select(`
            *,
            profiles:user_id (id, full_name, avatar_url)
        `)
        .eq('team_id', currentTeamId)
        .order('is_captain', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement joueurs', 'error');
        return;
    }
    teamPlayers = data || [];
    renderPlayers();
}

function renderPlayers() {
    const container = document.getElementById('playersList');
    if (!teamPlayers.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>Aucun joueur dans cette équipe</p></div>';
        return;
    }
    container.innerHTML = teamPlayers.map(player => `
        <div class="player-card" data-id="${player.id}">
            <div class="player-info">
                <div class="player-avatar">
                    ${player.profiles?.avatar_url ? `<img src="${player.profiles.avatar_url}" alt="${player.profiles.full_name}">` : `<i class="fas fa-user"></i>`}
                </div>
                <div class="player-details">
                    <h4>
                        ${escapeHtml(player.profiles?.full_name || 'Joueur')}
                        ${player.is_captain ? '<span class="captain-badge">Capitaine</span>' : ''}
                    </h4>
                    <p>${player.position || 'Poste non renseigné'} ${player.jersey_number ? `- N°${player.jersey_number}` : ''}</p>
                </div>
            </div>
            ${currentTeam?.created_by === currentUser.id ? `
            <div class="player-actions">
                ${!player.is_captain ? `<button class="btn-set-captain" data-id="${player.id}" data-name="${escapeHtml(player.profiles?.full_name || 'Joueur')}" title="Nommer capitaine"><i class="fas fa-crown"></i></button>` : ''}
                <button class="btn-remove-player" data-id="${player.id}" data-name="${escapeHtml(player.profiles?.full_name || 'Joueur')}" title="Retirer"><i class="fas fa-trash-alt"></i></button>
            </div>
            ` : ''}
        </div>
    `).join('');

    if (currentTeam?.created_by === currentUser.id) {
        document.querySelectorAll('.btn-set-captain').forEach(btn => {
            btn.addEventListener('click', async () => {
                const playerId = btn.getAttribute('data-id');
                const playerName = btn.getAttribute('data-name');
                if (confirm(`Nommer ${playerName} capitaine ?`)) {
                    await setCaptain(playerId);
                }
            });
        });
        document.querySelectorAll('.btn-remove-player').forEach(btn => {
            btn.addEventListener('click', async () => {
                const playerId = btn.getAttribute('data-id');
                const playerName = btn.getAttribute('data-name');
                if (confirm(`Retirer ${playerName} de l'équipe ?`)) {
                    await removePlayer(playerId);
                }
            });
        });
    }
}

async function setCaptain(playerId) {
    // Retirer le statut de capitaine à tous les joueurs de l'équipe
    const { error: resetError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .update({ is_captain: false })
        .eq('team_id', currentTeamId);
    if (resetError) {
        showToast('Erreur lors de la mise à jour', 'error');
        return;
    }
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .update({ is_captain: true })
        .eq('id', playerId);
    if (error) {
        showToast('Erreur', 'error');
    } else {
        showToast('Capitaine nommé avec succès', 'success');
        loadTeamPlayers();
    }
}

async function removePlayer(playerId) {
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .update({ team_id: null })
        .eq('id', playerId);
    if (error) {
        showToast('Erreur lors du retrait', 'error');
    } else {
        showToast('Joueur retiré', 'success');
        loadTeamPlayers();
    }
}

// ===== CRÉATION / MODIFICATION D'ÉQUIPE =====
let editingTeamId = null;
function openCreateTeamModal() {
    editingTeamId = null;
    document.getElementById('teamModalTitle').textContent = 'Créer une équipe';
    document.getElementById('teamNameInput').value = '';
    document.getElementById('teamAgeCategoryInput').value = '';
    document.getElementById('teamLogoInput').value = '';
    document.getElementById('teamSportInput').value = '';
    document.getElementById('teamModal').style.display = 'block';
}
function openEditTeamModal() {
    if (!currentTeam) return;
    editingTeamId = currentTeam.id;
    document.getElementById('teamModalTitle').textContent = 'Modifier l\'équipe';
    document.getElementById('teamNameInput').value = currentTeam.name;
    document.getElementById('teamAgeCategoryInput').value = currentTeam.age_category || '';
    document.getElementById('teamLogoInput').value = currentTeam.logo_url || '';
    document.getElementById('teamSportInput').value = currentTeam.sport_id || '';
    document.getElementById('teamModal').style.display = 'block';
}
function closeTeamModal() {
    document.getElementById('teamModal').style.display = 'none';
}
async function saveTeam(e) {
    e.preventDefault();
    const name = document.getElementById('teamNameInput').value.trim();
    const ageCategory = document.getElementById('teamAgeCategoryInput').value;
    const logoUrl = document.getElementById('teamLogoInput').value;
    const sportId = parseInt(document.getElementById('teamSportInput').value);
    if (!name || !sportId) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }
    const teamData = {
        name,
        age_category: ageCategory || null,
        logo_url: logoUrl || null,
        sport_id: sportId,
        created_by: currentUser.id
    };
    if (editingTeamId) {
        const { error } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_teams')
            .update(teamData)
            .eq('id', editingTeamId);
        if (error) {
            showToast('Erreur lors de la modification', 'error');
        } else {
            showToast('Équipe modifiée avec succès', 'success');
            closeTeamModal();
            await loadUserTeams();
            if (editingTeamId === currentTeamId) {
                await loadTeam(editingTeamId);
            }
        }
    } else {
        const { data, error } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_teams')
            .insert(teamData)
            .select()
            .single();
        if (error) {
            showToast('Erreur lors de la création', 'error');
        } else {
            showToast('Équipe créée avec succès', 'success');
            closeTeamModal();
            await loadUserTeams();
            document.getElementById('teamSelect').value = data.id;
            await loadTeam(data.id);
        }
    }
}

// ===== AJOUT D'UN JOUEUR =====
let selectedPlayerId = null;

function searchPlayers(query) {
    if (!query) {
        document.getElementById('playerSearchResults').innerHTML = '';
        return;
    }
    window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select(`
            id,
            user_id,
            profiles:user_id (id, full_name, avatar_url)
        `)
        .ilike('profiles.full_name', `%${query}%`)
        .limit(10)
        .then(({ data, error }) => {
            if (error) throw error;
            const results = data || [];
            const container = document.getElementById('playerSearchResults');
            if (!results.length) {
                container.innerHTML = '<div class="empty-state">Aucun joueur trouvé</div>';
                return;
            }
            container.innerHTML = results.map(p => `
                <div class="search-result-item" data-id="${p.id}">
                    <div class="search-result-avatar">
                        ${p.profiles?.avatar_url ? `<img src="${p.profiles.avatar_url}">` : `<i class="fas fa-user"></i>`}
                    </div>
                    <span>${escapeHtml(p.profiles?.full_name || 'Joueur')}</span>
                </div>
            `).join('');
            document.querySelectorAll('.search-result-item').forEach(el => {
                el.addEventListener('click', () => {
                    selectedPlayerId = parseInt(el.getAttribute('data-id'));
                    document.getElementById('playerSearch').value = el.querySelector('span').textContent;
                    container.innerHTML = '';
                });
            });
        })
        .catch(err => console.error(err));
}

function openAddPlayerModal() {
    selectedPlayerId = null;
    document.getElementById('playerSearch').value = '';
    document.getElementById('playerSearchResults').innerHTML = '';
    document.getElementById('playerJersey').value = '';
    document.getElementById('playerPosition').value = '';
    document.getElementById('playerIsCaptain').checked = false;
    document.getElementById('addPlayerModal').style.display = 'block';
}
function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'none';
}
async function addPlayer(e) {
    e.preventDefault();
    if (!selectedPlayerId) {
        showToast('Veuillez sélectionner un joueur', 'warning');
        return;
    }
    const jersey = document.getElementById('playerJersey').value;
    const position = document.getElementById('playerPosition').value;
    const isCaptain = document.getElementById('playerIsCaptain').checked;

    // Vérifier si le joueur est déjà dans une équipe
    const { data: existing, error: checkError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select('team_id')
        .eq('id', selectedPlayerId)
        .single();
    if (checkError && checkError.code !== 'PGRST116') {
        showToast('Erreur de vérification', 'error');
        return;
    }
    if (existing && existing.team_id) {
        showToast('Ce joueur est déjà dans une équipe', 'warning');
        return;
    }

    const updates = {
        team_id: currentTeamId,
        jersey_number: jersey || null,
        position: position || null,
        is_captain: isCaptain
    };
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .update(updates)
        .eq('id', selectedPlayerId);
    if (error) {
        showToast('Erreur lors de l\'ajout', 'error');
    } else {
        showToast('Joueur ajouté avec succès', 'success');
        closeAddPlayerModal();
        loadTeamPlayers();
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    await loadSports();
    await loadUserTeams();

    // Événements
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'accueil_hubisgst.html';
    });
    document.getElementById('createTeamBtn').addEventListener('click', openCreateTeamModal);
    document.getElementById('editTeamBtn').addEventListener('click', openEditTeamModal);
    document.getElementById('addPlayerBtn').addEventListener('click', openAddPlayerModal);

    document.getElementById('teamForm').addEventListener('submit', saveTeam);
    document.getElementById('addPlayerForm').addEventListener('submit', addPlayer);
    document.getElementById('playerSearch').addEventListener('input', (e) => searchPlayers(e.target.value));

    // Fermeture modales
    document.querySelectorAll('.close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});
