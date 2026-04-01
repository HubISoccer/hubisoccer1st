// ===== RÉCUPÉRATION DES PARAMÈTRES =====
const urlParams = new URLSearchParams(window.location.search);
const teamId = urlParams.get('id');
const tournamentIdParam = urlParams.get('tournament');

if (!teamId) {
    window.location.href = 'accueil_hubisgst.html';
}

let currentUser = null;
let teamData = null;
let teamPlayers = [];
let tournaments = [];
let currentTournamentStats = null;
let teamMatches = [];

// ===== VÉRIFICATION DE L'UTILISATEUR =====
async function getCurrentUser() {
    const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
    if (!error && user) return user;
    return null;
}

// ===== CHARGEMENT DE L'ÉQUIPE =====
async function loadTeam() {
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
        console.error(error);
        showToast('Erreur chargement équipe', 'error');
        return;
    }
    teamData = data;
    document.getElementById('teamName').textContent = data.name;
    const logoContainer = document.getElementById('teamLogo');
    if (data.logo_url) {
        logoContainer.innerHTML = `<img src="${data.logo_url}" alt="${data.name}">`;
    } else {
        logoContainer.innerHTML = '<i class="fas fa-users"></i>';
    }
    document.getElementById('teamCategory').textContent = data.age_category || 'Non spécifiée';
    document.getElementById('teamSport').textContent = data.sport?.name || '-';
    document.getElementById('teamCreator').textContent = data.creator?.full_name || 'Administrateur';
    document.getElementById('teamCreated').textContent = new Date(data.created_at).toLocaleDateString('fr-FR');

    if (currentUser && (teamData.created_by === currentUser.id)) {
        document.getElementById('addPlayerBtn').style.display = 'flex';
    }
}

// ===== CHARGEMENT DES JOUEURS =====
async function loadPlayers() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select(`
            *,
            profiles:user_id (id, full_name, avatar_url)
        `)
        .eq('team_id', teamId)
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
            ${(currentUser && teamData.created_by === currentUser.id) ? `
            <div class="player-actions">
                <button class="btn-remove-player" data-id="${player.id}" data-name="${escapeHtml(player.profiles?.full_name || 'Joueur')}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            ` : ''}
        </div>
    `).join('');

    if (currentUser && teamData.created_by === currentUser.id) {
        document.querySelectorAll('.btn-remove-player').forEach(btn => {
            btn.addEventListener('click', async () => {
                const playerId = btn.getAttribute('data-id');
                const playerName = btn.getAttribute('data-name');
                if (confirm(`Retirer ${playerName} de l'équipe ?`)) {
                    const { error } = await window.supabaseAuthPrive
                        .from('gestionnairetournoi_players')
                        .update({ team_id: null })
                        .eq('id', playerId);
                    if (error) {
                        showToast('Erreur lors du retrait', 'error');
                    } else {
                        showToast(`${playerName} retiré de l'équipe`, 'success');
                        loadPlayers();
                    }
                }
            });
        });
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

async function addPlayer(e) {
    e.preventDefault();
    if (!selectedPlayerId) {
        showToast('Veuillez sélectionner un joueur', 'warning');
        return;
    }
    const jersey = document.getElementById('playerJersey').value;
    const position = document.getElementById('playerPosition').value;
    const isCaptain = document.getElementById('playerIsCaptain').checked;

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
        team_id: teamId,
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
        loadPlayers();
    }
}

function openAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'block';
    selectedPlayerId = null;
    document.getElementById('playerSearch').value = '';
    document.getElementById('playerSearchResults').innerHTML = '';
    document.getElementById('playerJersey').value = '';
    document.getElementById('playerPosition').value = '';
    document.getElementById('playerIsCaptain').checked = false;
}
function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'none';
}

// ===== CHARGEMENT DES TOURNOIS POUR STATISTIQUES =====
async function loadTournamentsForStats() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_stats')
        .select('tournament_id, tournament:tournament_id (id, name, start_date)')
        .eq('team_id', teamId)
        .order('tournament.start_date', { ascending: false });
    if (error) {
        console.error(error);
        return;
    }
    tournaments = data?.map(s => s.tournament).filter(Boolean) || [];
    const select = document.getElementById('tournamentStatsSelect');
    if (!tournaments.length) {
        select.innerHTML = '<option value="">Aucun tournoi disputé</option>';
        return;
    }
    select.innerHTML = '<option value="">-- Sélectionner un tournoi --</option>' +
        tournaments.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    if (tournamentIdParam) {
        select.value = tournamentIdParam;
        loadTeamStats(tournamentIdParam);
    }
    select.addEventListener('change', () => {
        const tid = select.value;
        if (tid) loadTeamStats(tid);
        else document.getElementById('teamStats').innerHTML = '<div class="empty-state">Sélectionnez un tournoi</div>';
    });
}

async function loadTeamStats(tournamentId) {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_stats')
        .select('*')
        .eq('team_id', teamId)
        .eq('tournament_id', tournamentId)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error(error);
        showToast('Erreur chargement statistiques', 'error');
        return;
    }
    currentTournamentStats = data || null;
    renderTeamStats();
}

function renderTeamStats() {
    const container = document.getElementById('teamStats');
    if (!currentTournamentStats) {
        container.innerHTML = '<div class="empty-state">Aucune statistique disponible pour ce tournoi</div>';
        return;
    }
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item"><div class="stat-value">${currentTournamentStats.matches_played || 0}</div><div class="stat-label">Matchs joués</div></div>
            <div class="stat-item"><div class="stat-value">${currentTournamentStats.wins || 0}</div><div class="stat-label">Victoires</div></div>
            <div class="stat-item"><div class="stat-value">${currentTournamentStats.draws || 0}</div><div class="stat-label">Nuls</div></div>
            <div class="stat-item"><div class="stat-value">${currentTournamentStats.losses || 0}</div><div class="stat-label">Défaites</div></div>
            <div class="stat-item"><div class="stat-value">${currentTournamentStats.goals_for || 0}</div><div class="stat-label">Buts marqués</div></div>
            <div class="stat-item"><div class="stat-value">${currentTournamentStats.goals_against || 0}</div><div class="stat-label">Buts encaissés</div></div>
            <div class="stat-item"><div class="stat-value">${(currentTournamentStats.goals_for - currentTournamentStats.goals_against) || 0}</div><div class="stat-label">Différence</div></div>
            <div class="stat-item"><div class="stat-value">${currentTournamentStats.points || 0}</div><div class="stat-label">Points</div></div>
        </div>
    `;
}

// ===== CHARGEMENT DES MATCHS DE L'ÉQUIPE =====
async function loadTeamMatches() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_matches')
        .select(`
            *,
            tournament:tournament_id (name),
            home_team:home_team_id (id, name),
            away_team:away_team_id (id, name)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement matchs', 'error');
        return;
    }
    teamMatches = data || [];
    renderTeamMatches();
}

function renderTeamMatches() {
    const container = document.getElementById('teamMatchesList');
    if (!teamMatches.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Aucun match disputé</p></div>';
        return;
    }
    container.innerHTML = teamMatches.map(match => {
        const isHome = match.home_team_id === teamId;
        const opponent = isHome ? match.away_team?.name : match.home_team?.name;
        const score = `${match.home_score ?? '-'} - ${match.away_score ?? '-'}`;
        return `
            <div class="match-card">
                <div class="match-date"><i class="fas fa-calendar-alt"></i> ${new Date(match.match_date).toLocaleString('fr-FR')}</div>
                <div class="match-teams">${isHome ? match.home_team?.name : match.away_team?.name} vs ${opponent}</div>
                <div class="match-score">${score}</div>
                <a href="match-details.html?id=${match.id}" class="btn-view">Détails</a>
            </div>
        `;
    }).join('');
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await getCurrentUser();
    await loadTeam();
    if (!teamData) return;
    await Promise.all([
        loadPlayers(),
        loadTournamentsForStats(),
        loadTeamMatches()
    ]);

    // Onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}Tab`).classList.add('active');
        });
    });

    // Boutons
    document.getElementById('backBtn').addEventListener('click', () => {
        const referrer = document.referrer;
        if (referrer.includes('tournament-details')) {
            window.location.href = referrer;
        } else {
            window.location.href = 'accueil_hubisgst.html';
        }
    });
    if (currentUser && teamData.created_by === currentUser.id) {
        document.getElementById('addPlayerBtn').addEventListener('click', openAddPlayerModal);
        document.getElementById('addPlayerForm').addEventListener('submit', addPlayer);
    }

    // Fermeture modale
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

    // Recherche joueur dans modale
    document.getElementById('playerSearch').addEventListener('input', (e) => {
        searchPlayers(e.target.value);
    });
});
