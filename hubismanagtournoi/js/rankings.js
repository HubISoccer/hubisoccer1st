// ===== rankings.js =====
// ===== ÉTATS GLOBAUX =====
let tournaments = [];
let currentTournamentId = null;
let teamsStats = [];
let playersStats = [];
let players = [];

// ===== CHARGEMENT DES TOURNOIS =====
async function loadTournaments() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_tournaments')
        .select('id, name, sport_id, start_date')
        .eq('is_active', true)
        .order('start_date', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement des tournois', 'error');
        return;
    }
    tournaments = data || [];
    const select = document.getElementById('tournamentSelect');
    if (!tournaments.length) {
        select.innerHTML = '<option value="">Aucun tournoi disponible</option>';
        return;
    }
    select.innerHTML = '<option value="">-- Sélectionnez un tournoi --</option>' +
        tournaments.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    select.addEventListener('change', () => {
        currentTournamentId = select.value ? parseInt(select.value) : null;
        if (currentTournamentId) {
            loadAllRankings();
        }
    });
}

// ===== CHARGEMENT DES STATISTIQUES =====
async function loadTeamStats() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_stats')
        .select(`
            *,
            team:team_id (id, name, logo_url)
        `)
        .eq('tournament_id', currentTournamentId)
        .order('points', { ascending: false })
        .order('goals_for', { ascending: false })
        .order('goals_against', { ascending: true });
    if (error) {
        console.error(error);
        teamsStats = [];
    } else {
        teamsStats = data || [];
    }
    renderTeamsRanking();
}

async function loadPlayersStats() {
    // Récupérer tous les événements de match pour ce tournoi
    const { data: matches, error: matchesError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_matches')
        .select('id')
        .eq('tournament_id', currentTournamentId);
    if (matchesError || !matches.length) {
        playersStats = [];
        renderScorersRanking();
        renderAssistsRanking();
        renderCardsRanking();
        return;
    }
    const matchIds = matches.map(m => m.id);
    const { data: events, error: eventsError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_match_events')
        .select('*')
        .in('match_id', matchIds)
        .order('event_minute', { ascending: true });
    if (eventsError) {
        console.error(eventsError);
        playersStats = [];
        renderScorersRanking();
        renderAssistsRanking();
        renderCardsRanking();
        return;
    }

    // Récupérer les joueurs avec leurs profils
    const { data: playersData, error: playersError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select(`
            id,
            user_id,
            jersey_number,
            position,
            profiles:user_id (id, full_name, avatar_url)
        `);
    if (playersError) {
        console.error(playersError);
        players = [];
    } else {
        players = playersData || [];
    }

    // Calcul des statistiques
    const stats = {};
    events.forEach(event => {
        if (!event.player_id) return;
        if (!stats[event.player_id]) {
            stats[event.player_id] = { goals: 0, assists: 0, yellow: 0, red: 0 };
        }
        if (event.event_type === 'goal') stats[event.player_id].goals++;
        else if (event.event_type === 'assist') stats[event.player_id].assists++;
        else if (event.event_type === 'yellow_card') stats[event.player_id].yellow++;
        else if (event.event_type === 'red_card') stats[event.player_id].red++;
    });
    playersStats = Object.entries(stats).map(([playerId, stat]) => {
        const player = players.find(p => p.id == playerId);
        return {
            player_id: parseInt(playerId),
            player_name: player?.profiles?.full_name || 'Joueur',
            player_avatar: player?.profiles?.avatar_url,
            goals: stat.goals,
            assists: stat.assists,
            yellow_cards: stat.yellow,
            red_cards: stat.red
        };
    });
    playersStats.sort((a,b) => b.goals - a.goals);
    renderScorersRanking();
    renderAssistsRanking();
    renderCardsRanking();
}

function renderTeamsRanking() {
    const container = document.getElementById('teamsRanking');
    if (!teamsStats.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-simple"></i><p>Aucune statistique d’équipe disponible</p></div>';
        return;
    }
    let html = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Équipe</th>
                    <th>J</th>
                    <th>V</th>
                    <th>N</th>
                    <th>D</th>
                    <th>BP</th>
                    <th>BC</th>
                    <th>Diff</th>
                    <th>Pts</th>
                </tr>
            </thead>
            <tbody>
    `;
    teamsStats.forEach((stat, idx) => {
        const diff = (stat.goals_for || 0) - (stat.goals_against || 0);
        html += `
            <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(stat.team?.name || 'Équipe')}</td>
                <td>${stat.matches_played || 0}</td>
                <td>${stat.wins || 0}</td>
                <td>${stat.draws || 0}</td>
                <td>${stat.losses || 0}</td>
                <td>${stat.goals_for || 0}</td>
                <td>${stat.goals_against || 0}</td>
                <td>${diff}</td>
                <td>${stat.points || 0}</td>
            </tr>
        `;
    });
    html += `</tbody> </table>`;
    container.innerHTML = html;
}

function renderScorersRanking() {
    const container = document.getElementById('scorersRanking');
    const scorers = playersStats.filter(p => p.goals > 0).sort((a,b) => b.goals - a.goals);
    if (!scorers.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-futbol"></i><p>Aucun buteur enregistré</p></div>';
        return;
    }
    let html = `
        <table class="ranking-table">
            <thead><tr><th>#</th><th>Joueur</th><th>Buts</th></tr></thead>
            <tbody>
    `;
    scorers.forEach((p, idx) => {
        html += `<tr><td>${idx+1}</td><td>${escapeHtml(p.player_name)}</td><td>${p.goals}</td></tr>`;
    });
    html += `</tbody> </table>`;
    container.innerHTML = html;
}

function renderAssistsRanking() {
    const container = document.getElementById('assistsRanking');
    const assisters = playersStats.filter(p => p.assists > 0).sort((a,b) => b.assists - a.assists);
    if (!assisters.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-eye"></i><p>Aucune passe décisive enregistrée</p></div>';
        return;
    }
    let html = `
        <table class="ranking-table">
            <thead><tr><th>#</th><th>Joueur</th><th>Passes</th></tr></thead>
            <tbody>
    `;
    assisters.forEach((p, idx) => {
        html += `<tr><td>${idx+1}</td><td>${escapeHtml(p.player_name)}</td><td>${p.assists}</td></tr>`;
    });
    html += `</tbody> </table>`;
    container.innerHTML = html;
}

function renderCardsRanking() {
    const container = document.getElementById('cardsRanking');
    const cards = playersStats.filter(p => p.yellow_cards > 0 || p.red_cards > 0).sort((a,b) => (b.yellow_cards + b.red_cards*3) - (a.yellow_cards + a.red_cards*3));
    if (!cards.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-square"></i><p>Aucun carton enregistré</p></div>';
        return;
    }
    let html = `
        <table class="ranking-table">
            <thead><tr><th>#</th><th>Joueur</th><th>Jaunes</th><th>Rouges</th></tr></thead>
            <tbody>
    `;
    cards.forEach((p, idx) => {
        html += `<tr><td>${idx+1}</td><td>${escapeHtml(p.player_name)}</td><td>${p.yellow_cards}</td><td>${p.red_cards}</td></tr>`;
    });
    html += `</tbody> </table>`;
    container.innerHTML = html;
}

async function loadAllRankings() {
    if (!currentTournamentId) return;
    await Promise.all([
        loadTeamStats(),
        loadPlayersStats()
    ]);
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadTournaments();

    // Gestion des onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}Tab`).classList.add('active');
        });
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'accueil_hubisgst.html';
    });
});
