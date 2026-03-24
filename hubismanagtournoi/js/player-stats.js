// ===== RÉCUPÉRATION DES PARAMÈTRES =====
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('id');
const tournamentIdParam = urlParams.get('tournament');

if (!playerId) {
    window.location.href = 'accueil_hubisgst.html';
}

let playerData = null;
let tournaments = [];
let selectedTournamentId = null;
let allEvents = [];

// ===== CHARGEMENT DU JOUEUR =====
async function loadPlayer() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select(`
            *,
            profiles:user_id (id, full_name, avatar_url),
            team:team_id (id, name)
        `)
        .eq('id', playerId)
        .single();
    if (error) {
        console.error(error);
        showToast('Erreur chargement joueur', 'error');
        return;
    }
    playerData = data;
    document.getElementById('playerName').textContent = playerData.profiles?.full_name || 'Joueur';
    const avatarContainer = document.getElementById('playerAvatar');
    if (playerData.profiles?.avatar_url) {
        avatarContainer.innerHTML = `<img src="${playerData.profiles.avatar_url}" alt="${playerData.profiles.full_name}">`;
    } else {
        avatarContainer.innerHTML = '<i class="fas fa-user"></i>';
    }
    document.getElementById('playerPosition').textContent = playerData.position || 'Non renseigné';
    document.getElementById('playerNumber').textContent = playerData.jersey_number || '-';
    document.getElementById('playerTeam').textContent = playerData.team?.name || 'Aucune équipe';
    document.getElementById('playerSince').textContent = playerData.created_at ? new Date(playerData.created_at).toLocaleDateString('fr-FR') : '-';
}

// ===== CHARGEMENT DES ÉVÉNEMENTS =====
async function loadPlayerEvents() {
    // Récupérer tous les événements (buts, passes, cartons) du joueur
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_events')
        .select(`
            *,
            match:match_id (
                id,
                match_date,
                tournament:tournament_id (id, name),
                home_team:home_team_id (id, name),
                away_team:away_team_id (id, name),
                home_score,
                away_score
            )
        `)
        .eq('player_id', playerId)
        .order('match.match_date', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement événements', 'error');
        return;
    }
    allEvents = data || [];

    // Extraire les tournois uniques
    const tournamentsMap = new Map();
    allEvents.forEach(ev => {
        if (ev.match?.tournament) {
            tournamentsMap.set(ev.match.tournament.id, ev.match.tournament);
        }
    });
    tournaments = Array.from(tournamentsMap.values()).sort((a,b) => new Date(b.start_date) - new Date(a.start_date));
    const select = document.getElementById('tournamentSelect');
    select.innerHTML = '<option value="">Tous les tournois</option>' +
        tournaments.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    if (tournamentIdParam) {
        select.value = tournamentIdParam;
        selectedTournamentId = parseInt(tournamentIdParam);
    }
    select.addEventListener('change', () => {
        selectedTournamentId = select.value ? parseInt(select.value) : null;
        renderStats();
    });

    renderStats();
}

function renderStats() {
    // Filtrer par tournoi
    let filteredEvents = allEvents;
    if (selectedTournamentId) {
        filteredEvents = filteredEvents.filter(ev => ev.match?.tournament_id === selectedTournamentId);
    }

    // Calculer les totaux
    let goals = 0, assists = 0, yellow = 0, red = 0;
    const matchesMap = new Map(); // pour compter les matchs uniques
    filteredEvents.forEach(ev => {
        if (ev.event_type === 'goal') goals++;
        else if (ev.event_type === 'assist') assists++;
        else if (ev.event_type === 'yellow_card') yellow++;
        else if (ev.event_type === 'red_card') red++;
        if (ev.match_id) matchesMap.set(ev.match_id, ev.match);
    });
    const matches = Array.from(matchesMap.values());

    document.getElementById('totalGoals').textContent = goals;
    document.getElementById('totalAssists').textContent = assists;
    document.getElementById('totalYellow').textContent = yellow;
    document.getElementById('totalRed').textContent = red;
    document.getElementById('totalMatches').textContent = matches.length;

    renderMatchesStats(matches, filteredEvents);
}

function renderMatchesStats(matches, events) {
    const container = document.getElementById('matchesStatsList');
    if (!matches.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-futbol"></i><p>Aucun match disputé</p></div>';
        return;
    }

    container.innerHTML = matches.map(match => {
        const matchEvents = events.filter(ev => ev.match_id === match.id);
        const goalsList = matchEvents.filter(ev => ev.event_type === 'goal');
        const assistsList = matchEvents.filter(ev => ev.event_type === 'assist');
        const cardsList = matchEvents.filter(ev => ev.event_type === 'yellow_card' || ev.event_type === 'red_card');
        const score = `${match.home_score ?? '-'} - ${match.away_score ?? '-'}`;
        return `
            <div class="match-stat-card">
                <div class="match-header">
                    <div class="match-date">
                        <i class="fas fa-calendar-alt"></i> ${new Date(match.match_date).toLocaleString('fr-FR')}
                    </div>
                    <div class="match-teams">
                        ${match.home_team?.name} vs ${match.away_team?.name}
                    </div>
                    <div class="match-score">${score}</div>
                </div>
                <div class="player-stats-detail">
                    ${goalsList.length ? `
                        <div class="player-stat-item">
                            <i class="fas fa-futbol"></i> ${goalsList.length} but(s)
                        </div>
                    ` : ''}
                    ${assistsList.length ? `
                        <div class="player-stat-item">
                            <i class="fas fa-eye"></i> ${assistsList.length} passe(s)
                        </div>
                    ` : ''}
                    ${cardsList.length ? `
                        <div class="player-stat-item">
                            <i class="fas fa-square"></i> ${cardsList.length} carton(s)
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayer();
    if (!playerData) return;
    await loadPlayerEvents();

    document.getElementById('backBtn').addEventListener('click', () => {
        const referrer = document.referrer;
        if (referrer.includes('team-details')) {
            window.location.href = referrer;
        } else {
            window.location.href = 'accueil_hubisgst.html';
        }
    });
});
