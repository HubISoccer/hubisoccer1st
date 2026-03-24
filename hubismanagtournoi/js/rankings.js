// ===== rankings.js =====
let currentUser = null;
let currentProfile = null;
let tournaments = [];
let selectedTournamentId = null;
let rankings = [];

async function checkSession() {
    const { data: { session }, error } = await supabaseGestionTournoi.auth.getSession();
    if (error || !session) {
        window.location.href = '../auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

async function loadProfile() {
    const { data, error } = await supabaseGestionTournoi
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (error) {
        console.error('Erreur chargement profil:', error);
        showToast('Impossible de charger votre profil', 'error');
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = data.full_name || 'Joueur';
    document.getElementById('userAvatar').src = data.avatar_url || '../public/img/user-default.jpg';
    return currentProfile;
}

async function loadTournaments() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select('id, name, sport:gestionnairetournoi_sports(name)')
        .eq('is_active', true)
        .order('start_date', { ascending: false });
    if (error) {
        console.error('Erreur chargement tournois:', error);
        showToast('Erreur lors du chargement des tournois', 'error');
        return;
    }
    tournaments = data || [];
    const select = document.getElementById('tournamentSelect');
    select.innerHTML = '<option value="">Choisir un tournoi</option>';
    tournaments.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = `${t.name} (${t.sport?.name || 'Sport'})`;
        select.appendChild(option);
    });
}

async function loadRankings(tournamentId) {
    if (!tournamentId) return;
    showLoader(true);
    try {
        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_stats')
            .select(`
                *,
                team:gestionnairetournoi_teams(id, name),
                player:gestionnairetournoi_players(user_id, profiles:profiles(full_name))
            `)
            .eq('tournament_id', tournamentId)
            .order('points', { ascending: false })
            .order('goals_for', { ascending: false });
        if (error) throw error;
        rankings = data || [];
        renderRankings();
    } catch (error) {
        console.error('Erreur chargement classement:', error);
        showToast('Erreur lors du chargement du classement', 'error');
    } finally {
        showLoader(false);
    }
}

function renderRankings() {
    const container = document.getElementById('rankingsContainer');
    if (!container) return;
    if (rankings.length === 0) {
        container.innerHTML = '<p class="no-data">Aucune donnée de classement disponible pour ce tournoi.</p>';
        return;
    }
    // Détecter s'il s'agit d'un classement par équipe ou par joueur (selon les données)
    const hasTeams = rankings.some(r => r.team_id);
    if (hasTeams) {
        container.innerHTML = `
            <div class="rankings-table-wrapper">
                <table class="rankings-table">
                    <thead>
                        <tr><th>Pos</th><th>Équipe</th><th>Matchs</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Points</th><th>Jaunes</th><th>Rouges</th></tr>
                    </thead>
                    <tbody>
                        ${rankings.map((r, idx) => `
                            <tr>
                                <td>${idx+1}</td>
                                <td>${escapeHtml(r.team?.name || 'Équipe')}</td>
                                <td>${r.matches_played || 0}</td>
                                <td>${r.wins || 0}</td>
                                <td>${r.draws || 0}</td>
                                <td>${r.losses || 0}</td>
                                <td>${r.goals_for || 0}</td>
                                <td>${r.goals_against || 0}</td>
                                <td>${(r.goals_for||0) - (r.goals_against||0)}</td>
                                <td>${r.points || 0}</td>
                                <td>${r.yellow_cards || 0}</td>
                                <td>${r.red_cards || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="rankings-table-wrapper">
                <table class="rankings-table">
                    <thead>
                        <tr><th>Pos</th><th>Joueur</th><th>Matchs</th><th>Buts</th><th>Passes</th><th>Jaunes</th><th>Rouges</th></tr>
                    </thead>
                    <tbody>
                        ${rankings.map((r, idx) => `
                            <tr>
                                <td>${idx+1}</td>
                                <td>${escapeHtml(r.player?.profiles?.full_name || 'Joueur')}</td>
                                <td>${r.matches_played || 0}</td>
                                <td>${r.goals_for || 0}</td>
                                <td>${r.assists || 0}</td>
                                <td>${r.yellow_cards || 0}</td>
                                <td>${r.red_cards || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.getElementById('tournamentSelect').addEventListener('change', (e) => {
    selectedTournamentId = e.target.value;
    if (selectedTournamentId) {
        loadRankings(selectedTournamentId);
    } else {
        document.getElementById('rankingsContainer').innerHTML = '<p class="no-data">Sélectionnez un tournoi pour voir le classement.</p>';
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadTournaments();
});