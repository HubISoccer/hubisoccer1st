// ===== ÉTATS =====
let tournaments = [];
let currentTournamentId = null;
let compareType = 'teams'; // 'teams' ou 'players'
let teamsList = [];
let playersList = [];
let teamStats = {};
let playerStats = {};

// ===== CHARGEMENT DES TOURNOIS =====
async function loadTournaments() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select('id, name')
        .eq('is_active', true)
        .order('start_date', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement tournois', 'error');
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
    select.addEventListener('change', async () => {
        currentTournamentId = select.value ? parseInt(select.value) : null;
        if (currentTournamentId) {
            await loadDataForTournament();
            updateSelectors();
        } else {
            document.getElementById('comparisonResults').innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Sélectionnez un tournoi</p></div>';
        }
    });
}

// ===== CHARGEMENT DES DONNÉES POUR LE TOURNOI =====
async function loadDataForTournament() {
    if (!currentTournamentId) return;
    await Promise.all([
        loadTeamsForTournament(),
        loadPlayersForTournament(),
        loadStatsForTournament()
    ]);
}

async function loadTeamsForTournament() {
    // Récupérer les équipes qui ont des statistiques dans ce tournoi
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_stats')
        .select('team_id, team:team_id (id, name, logo_url)')
        .eq('tournament_id', currentTournamentId)
        .not('team_id', 'is', null);
    if (error) {
        console.error(error);
        teamsList = [];
        return;
    }
    teamsList = data?.map(s => s.team).filter(t => t) || [];
}

async function loadPlayersForTournament() {
    // Récupérer les joueurs qui ont participé à des matchs du tournoi (via events)
    const { data: matches, error: matchesError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select('id')
        .eq('tournament_id', currentTournamentId);
    if (matchesError || !matches.length) {
        playersList = [];
        return;
    }
    const matchIds = matches.map(m => m.id);
    const { data: events, error: eventsError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_events')
        .select('player_id, player:player_id (id, user_id, profiles:user_id (full_name, avatar_url))')
        .in('match_id', matchIds)
        .not('player_id', 'is', null);
    if (eventsError) {
        console.error(eventsError);
        playersList = [];
        return;
    }
    // Dédupliquer les joueurs
    const playerMap = new Map();
    events.forEach(e => {
        if (e.player && !playerMap.has(e.player.id)) {
            playerMap.set(e.player.id, e.player);
        }
    });
    playersList = Array.from(playerMap.values());
}

async function loadStatsForTournament() {
    // Charger les stats des équipes
    const { data: teamStatsData, error: teamError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_stats')
        .select('*')
        .eq('tournament_id', currentTournamentId);
    if (!teamError) {
        teamStats = {};
        teamStatsData.forEach(s => {
            teamStats[s.team_id] = s;
        });
    }
    // Charger les stats des joueurs (à partir des événements)
    const { data: matches, error: matchesError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select('id')
        .eq('tournament_id', currentTournamentId);
    if (matchesError || !matches.length) {
        playerStats = {};
        return;
    }
    const matchIds = matches.map(m => m.id);
    const { data: events, error: eventsError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_events')
        .select('*')
        .in('match_id', matchIds);
    if (eventsError) {
        console.error(eventsError);
        playerStats = {};
        return;
    }
    playerStats = {};
    events.forEach(e => {
        if (!e.player_id) return;
        if (!playerStats[e.player_id]) {
            playerStats[e.player_id] = {
                goals: 0,
                assists: 0,
                yellow_cards: 0,
                red_cards: 0,
                matches: 0
            };
        }
        if (e.event_type === 'goal') playerStats[e.player_id].goals++;
        else if (e.event_type === 'assist') playerStats[e.player_id].assists++;
        else if (e.event_type === 'yellow_card') playerStats[e.player_id].yellow_cards++;
        else if (e.event_type === 'red_card') playerStats[e.player_id].red_cards++;
    });
    // Compter les matchs joués par joueur (à partir des participations)
    const { data: playersData, error: playersError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id, team_id')
        .in('team_id', teamsList.map(t => t.id));
    if (!playersError && playersData) {
        playersData.forEach(p => {
            if (playerStats[p.id]) {
                playerStats[p.id].matches = (playerStats[p.id].matches || 0) + 1;
            }
        });
    }
}

function updateSelectors() {
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');
    if (compareType === 'teams') {
        firstSelect.innerHTML = '<option value="">-- Sélectionnez une équipe --</option>' +
            teamsList.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
        secondSelect.innerHTML = '<option value="">-- Sélectionnez une équipe --</option>' +
            teamsList.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    } else {
        firstSelect.innerHTML = '<option value="">-- Sélectionnez un joueur --</option>' +
            playersList.map(p => `<option value="${p.id}">${escapeHtml(p.profiles?.full_name || 'Joueur')}</option>`).join('');
        secondSelect.innerHTML = '<option value="">-- Sélectionnez un joueur --</option>' +
            playersList.map(p => `<option value="${p.id}">${escapeHtml(p.profiles?.full_name || 'Joueur')}</option>`).join('');
    }
    firstSelect.disabled = false;
    secondSelect.disabled = false;
    firstSelect.value = '';
    secondSelect.value = '';
    document.getElementById('comparisonResults').innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Sélectionnez deux entités à comparer</p></div>';
}

function compare() {
    const firstId = document.getElementById('firstSelect').value;
    const secondId = document.getElementById('secondSelect').value;
    if (!firstId || !secondId) {
        showToast('Veuillez sélectionner deux éléments', 'warning');
        return;
    }
    if (compareType === 'teams') {
        compareTeams(parseInt(firstId), parseInt(secondId));
    } else {
        comparePlayers(parseInt(firstId), parseInt(secondId));
    }
}

function compareTeams(id1, id2) {
    const team1 = teamsList.find(t => t.id === id1);
    const team2 = teamsList.find(t => t.id === id2);
    const stats1 = teamStats[id1] || {};
    const stats2 = teamStats[id2] || {};

    const metrics = [
        { label: 'Matchs joués', key: 'matches_played', fmt: v => v || 0 },
        { label: 'Victoires', key: 'wins', fmt: v => v || 0 },
        { label: 'Nuls', key: 'draws', fmt: v => v || 0 },
        { label: 'Défaites', key: 'losses', fmt: v => v || 0 },
        { label: 'Buts marqués', key: 'goals_for', fmt: v => v || 0 },
        { label: 'Buts encaissés', key: 'goals_against', fmt: v => v || 0 },
        { label: 'Différence', key: 'goals_diff', fmt: v => (stats1.goals_for - stats1.goals_against) || 0, value2: (stats2.goals_for - stats2.goals_against) || 0 },
        { label: 'Points', key: 'points', fmt: v => v || 0 },
        { label: 'Cartons jaunes', key: 'yellow_cards', fmt: v => v || 0 },
        { label: 'Cartons rouges', key: 'red_cards', fmt: v => v || 0 }
    ];

    let html = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Statistique</th>
                    <th>${escapeHtml(team1.name)}</th>
                    <th>${escapeHtml(team2.name)}</th>
                </tr>
            </thead>
            <tbody>
    `;
    metrics.forEach(m => {
        let val1 = m.fmt(stats1[m.key]);
        let val2 = m.fmt(stats2[m.key]);
        if (m.key === 'goals_diff') {
            val1 = m.value1;
            val2 = m.value2;
        }
        let winnerClass = '';
        if (val1 > val2) winnerClass = 'winner';
        else if (val2 > val1) winnerClass = '';
        html += `
            <tr>
                <td>${m.label}</td>
                <td class="${winnerClass}">${val1}</td>
                <td>${val2}</td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    document.getElementById('comparisonResults').innerHTML = html;
}

function comparePlayers(id1
