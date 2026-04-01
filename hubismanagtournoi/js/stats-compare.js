// ===== stats-compare.js =====
let tournaments = [];
let currentTournamentId = null;
let currentCompareType = 'teams'; // 'teams' ou 'players'
let teamsList = [];
let playersList = [];

// Éléments DOM
const tournamentSelect = document.getElementById('tournamentSelect');
const firstSelect = document.getElementById('firstSelect');
const secondSelect = document.getElementById('secondSelect');
const resultsDiv = document.getElementById('comparisonResults');

// ===== CHARGEMENT DES TOURNOIS =====
async function loadTournaments() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_tournaments')
        .select('id, name')
        .eq('is_active', true)
        .order('start_date', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement des tournois', 'error');
        tournamentSelect.innerHTML = '<option value="">Erreur de chargement</option>';
        return;
    }
    tournaments = data || [];
    if (!tournaments.length) {
        tournamentSelect.innerHTML = '<option value="">Aucun tournoi disponible</option>';
        return;
    }
    tournamentSelect.innerHTML = '<option value="">-- Sélectionnez un tournoi --</option>' +
        tournaments.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    tournamentSelect.addEventListener('change', () => {
        currentTournamentId = tournamentSelect.value ? parseInt(tournamentSelect.value) : null;
        if (currentTournamentId) {
            loadEntities();
        } else {
            resetSelects();
            showEmptyState();
        }
    });
}

// ===== CHARGEMENT DES ENTITÉS SELON LE TYPE =====
async function loadEntities() {
    if (!currentTournamentId) return;
    if (currentCompareType === 'teams') {
        await loadTeamsForTournament();
    } else {
        await loadPlayersForTournament();
    }
}

async function loadTeamsForTournament() {
    // Récupérer les équipes ayant participé à ce tournoi (via stats)
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_stats')
        .select('team_id, team:team_id (id, name)')
        .eq('tournament_id', currentTournamentId);
    if (error) {
        console.error(error);
        teamsList = [];
    } else {
        teamsList = data.map(s => s.team).filter(t => t !== null);
    }
    populateSelects(teamsList, 'name');
}

async function loadPlayersForTournament() {
    // Récupérer les joueurs ayant participé à ce tournoi (via inscriptions approuvées)
    // On prend les joueurs inscrits et approuvés pour ce tournoi
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_registrations')
        .select('player_id, player:player_id (id, profiles:user_id (full_name))')
        .eq('tournament_id', currentTournamentId)
        .eq('status', 'approved');
    if (error) {
        console.error(error);
        playersList = [];
    } else {
        playersList = data.map(r => ({
            id: r.player_id,
            name: r.player?.profiles?.full_name || 'Joueur'
        })).filter(p => p.id !== null);
    }
    populateSelects(playersList, 'name');
}

function populateSelects(items, labelKey) {
    if (!items.length) {
        firstSelect.innerHTML = '<option value="">Aucune donnée disponible</option>';
        secondSelect.innerHTML = '<option value="">Aucune donnée disponible</option>';
        firstSelect.disabled = true;
        secondSelect.disabled = true;
        return;
    }
    const options = items.map(item => `<option value="${item.id}">${escapeHtml(item[labelKey])}</option>`).join('');
    firstSelect.innerHTML = `<option value="">-- Sélectionnez --</option>${options}`;
    secondSelect.innerHTML = `<option value="">-- Sélectionnez --</option>${options}`;
    firstSelect.disabled = false;
    secondSelect.disabled = false;

    // Réinitialiser les sélections précédentes
    firstSelect.value = '';
    secondSelect.value = '';
    resultsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Sélectionnez deux entités</p></div>';

    // Ajouter les événements de changement
    firstSelect.onchange = () => compare();
    secondSelect.onchange = () => compare();
}

function resetSelects() {
    firstSelect.innerHTML = '<option value="">-- Sélectionnez --</option>';
    secondSelect.innerHTML = '<option value="">-- Sélectionnez --</option>';
    firstSelect.disabled = true;
    secondSelect.disabled = true;
}

function showEmptyState() {
    resultsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Sélectionnez un tournoi, un type et deux entités à comparer</p></div>';
}

// ===== COMPARAISON =====
async function compare() {
    const firstId = firstSelect.value;
    const secondId = secondSelect.value;
    if (!firstId || !secondId) return;
    if (!currentTournamentId) return;

    if (currentCompareType === 'teams') {
        await compareTeams(firstId, secondId);
    } else {
        await comparePlayers(firstId, secondId);
    }
}

async function compareTeams(teamAId, teamBId) {
    // Récupérer les statistiques des deux équipes dans le tournoi
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_stats')
        .select('*')
        .eq('tournament_id', currentTournamentId)
        .in('team_id', [teamAId, teamBId]);
    if (error) {
        console.error(error);
        showToast('Erreur récupération statistiques', 'error');
        return;
    }
    const teamAStats = data.find(s => s.team_id == teamAId) || {};
    const teamBStats = data.find(s => s.team_id == teamBId) || {};

    const teamAName = teamsList.find(t => t.id == teamAId)?.name || 'Équipe A';
    const teamBName = teamsList.find(t => t.id == teamBId)?.name || 'Équipe B';

    renderComparison(teamAName, teamBName, [
        { label: 'Matchs joués', a: teamAStats.matches_played || 0, b: teamBStats.matches_played || 0 },
        { label: 'Victoires', a: teamAStats.wins || 0, b: teamBStats.wins || 0 },
        { label: 'Nuls', a: teamAStats.draws || 0, b: teamBStats.draws || 0 },
        { label: 'Défaites', a: teamAStats.losses || 0, b: teamBStats.losses || 0 },
        { label: 'Buts marqués', a: teamAStats.goals_for || 0, b: teamBStats.goals_for || 0 },
        { label: 'Buts encaissés', a: teamAStats.goals_against || 0, b: teamBStats.goals_against || 0 },
        { label: 'Différence', a: (teamAStats.goals_for || 0) - (teamAStats.goals_against || 0),
                                   b: (teamBStats.goals_for || 0) - (teamBStats.goals_against || 0) },
        { label: 'Points', a: teamAStats.points || 0, b: teamBStats.points || 0 }
    ]);
}

async function comparePlayers(playerAId, playerBId) {
    // Récupérer les événements de tous les matchs du tournoi
    const { data: matches, error: matchesError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_matches')
        .select('id')
        .eq('tournament_id', currentTournamentId);
    if (matchesError) {
        console.error(matchesError);
        showToast('Erreur chargement matchs', 'error');
        return;
    }
    const matchIds = matches.map(m => m.id);
    if (!matchIds.length) {
        renderComparison('Joueur A', 'Joueur B', []);
        return;
    }
    const { data: events, error: eventsError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_match_events')
        .select('*')
        .in('match_id', matchIds);
    if (eventsError) {
        console.error(eventsError);
        showToast('Erreur chargement événements', 'error');
        return;
    }

    const playerAStats = { goals: 0, assists: 0, yellow: 0, red: 0 };
    const playerBStats = { goals: 0, assists: 0, yellow: 0, red: 0 };
    events.forEach(e => {
        if (e.player_id == playerAId) {
            if (e.event_type === 'goal') playerAStats.goals++;
            else if (e.event_type === 'assist') playerAStats.assists++;
            else if (e.event_type === 'yellow_card') playerAStats.yellow++;
            else if (e.event_type === 'red_card') playerAStats.red++;
        } else if (e.player_id == playerBId) {
            if (e.event_type === 'goal') playerBStats.goals++;
            else if (e.event_type === 'assist') playerBStats.assists++;
            else if (e.event_type === 'yellow_card') playerBStats.yellow++;
            else if (e.event_type === 'red_card') playerBStats.red++;
        }
    });

    const playerAName = playersList.find(p => p.id == playerAId)?.name || 'Joueur A';
    const playerBName = playersList.find(p => p.id == playerBId)?.name || 'Joueur B';

    renderComparison(playerAName, playerBName, [
        { label: 'Buts', a: playerAStats.goals, b: playerBStats.goals },
        { label: 'Passes décisives', a: playerAStats.assists, b: playerBStats.assists },
        { label: 'Cartons jaunes', a: playerAStats.yellow, b: playerBStats.yellow },
        { label: 'Cartons rouges', a: playerAStats.red, b: playerBStats.red }
    ]);
}

function renderComparison(nameA, nameB, stats) {
    if (!stats.length) {
        resultsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Aucune statistique disponible pour ces deux entités</p></div>';
        return;
    }
    let html = `
        <div class="comparison-header">
            <div class="comparison-item first">${escapeHtml(nameA)}</div>
            <div class="comparison-item second">${escapeHtml(nameB)}</div>
        </div>
        <div class="comparison-stats">
    `;
    stats.forEach(stat => {
        const diff = stat.a - stat.b;
        const diffClass = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : 'equal');
        html += `
            <div class="stat-row">
                <div class="stat-label">${escapeHtml(stat.label)}</div>
                <div class="stat-values">
                    <span class="stat-value first-value">${stat.a}</span>
                    <span class="stat-diff ${diffClass}">${diff > 0 ? '+' + diff : diff}</span>
                    <span class="stat-value second-value">${stat.b}</span>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

// ===== GESTION DES ONGLETS =====
function initTypeSelector() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCompareType = btn.getAttribute('data-type');
            if (currentTournamentId) {
                loadEntities();
            } else {
                resetSelects();
                showEmptyState();
            }
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadTournaments();
    initTypeSelector();

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'accueil_hubisgst.html';
    });
});
