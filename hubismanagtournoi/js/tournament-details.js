// ===== tournament-details.js =====
let currentUser = null;
let currentProfile = null;
let tournamentId = null;
let tournament = null;
let matches = [];

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

async function loadTournament() {
    const urlParams = new URLSearchParams(window.location.search);
    tournamentId = urlParams.get('id');
    if (!tournamentId) {
        showToast('Tournoi non spécifié', 'error');
        setTimeout(() => window.location.href = 'accueil_hubisgst.html', 2000);
        return;
    }

    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select(`
            *,
            sport:gestionnairetournoi_sports(name),
            type:gestionnairetournoi_types(name, label)
        `)
        .eq('id', tournamentId)
        .single();

    if (error || !data) {
        console.error('Erreur chargement tournoi:', error);
        showToast('Tournoi introuvable', 'error');
        setTimeout(() => window.location.href = 'accueil_hubisgst.html', 2000);
        return;
    }
    tournament = data;
    renderTournamentDetails();
}

function renderTournamentDetails() {
    document.getElementById('tournamentName').textContent = tournament.name;
    document.getElementById('tournamentDates').innerHTML = `<i class="fas fa-calendar-alt"></i> ${new Date(tournament.start_date).toLocaleDateString()} - ${new Date(tournament.end_date).toLocaleDateString()}`;
    document.getElementById('tournamentLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${tournament.location || 'Lieu non spécifié'}`;
    document.getElementById('tournamentSport').innerHTML = `<i class="fas fa-futbol"></i> ${tournament.sport?.name || 'Sport'}`;
    document.getElementById('tournamentDescription').textContent = tournament.description || 'Aucune description';
    document.getElementById('tournamentRules').innerHTML = tournament.rules ? `<p>${escapeHtml(tournament.rules)}</p>` : '<p>Aucun règlement spécifié.</p>';
    document.getElementById('tournamentPrize').textContent = tournament.prize_pool ? `${tournament.prize_pool.toLocaleString()} FCFA` : 'Prime à définir';

    const streamContainer = document.getElementById('streamContainer');
    if (tournament.stream_url) {
        const url = tournament.stream_url;
        let embedUrl = url;
        if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
            const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
        streamContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width:100%; height:300px; border-radius:12px;"></iframe>`;
    } else {
        streamContainer.innerHTML = '<p>Aucun stream disponible pour le moment.</p>';
    }

    // Vérifier si l'utilisateur est déjà inscrit
    checkRegistrationStatus();
}

async function checkRegistrationStatus() {
    if (!currentProfile || !tournamentId) return;
    // Vérifier dans gestionnairetournoi_registrations (si le joueur a un profil joueur)
    const { data: player, error: playerError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentProfile.id)
        .maybeSingle();

    if (playerError || !player) return; // pas de profil joueur, pas d'inscription

    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .select('status')
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.id)
        .maybeSingle();

    if (data) {
        const btn = document.getElementById('registerBtn');
        if (data.status === 'approved') {
            btn.textContent = 'Inscrit ✅';
            btn.disabled = true;
        } else if (data.status === 'pending') {
            btn.textContent = 'Inscription en attente';
            btn.disabled = true;
        }
    }
}

async function registerForTournament() {
    if (!currentProfile) {
        showToast('Veuillez vous connecter', 'warning');
        return;
    }

    // Créer ou récupérer le profil joueur
    let playerId = null;
    const { data: existingPlayer, error: playerError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentProfile.id)
        .maybeSingle();

    if (playerError) {
        console.error(playerError);
        showToast('Erreur lors de l\'inscription', 'error');
        return;
    }

    if (existingPlayer) {
        playerId = existingPlayer.id;
    } else {
        // Créer un joueur (profil par défaut)
        const { data: newPlayer, error: createError } = await supabaseGestionTournoi
            .from('gestionnairetournoi_players')
            .insert({ user_id: currentProfile.id })
            .select()
            .single();
        if (createError) {
            showToast('Erreur lors de la création du profil', 'error');
            return;
        }
        playerId = newPlayer.id;
    }

    // Vérifier si déjà inscrit
    const { data: existingReg, error: regError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .maybeSingle();

    if (existingReg) {
        showToast('Vous êtes déjà inscrit à ce tournoi', 'info');
        return;
    }

    // Inscription
    const { error: insertError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .insert({
            tournament_id: tournamentId,
            player_id: playerId,
            status: 'pending'
        });

    if (insertError) {
        showToast('Erreur lors de l\'inscription : ' + insertError.message, 'error');
    } else {
        showToast('Inscription enregistrée ! En attente de validation.', 'success');
        document.getElementById('registerBtn').textContent = 'Inscription en attente';
        document.getElementById('registerBtn').disabled = true;
    }
}

async function loadMatches() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select(`
            *,
            home_team:gestionnairetournoi_teams!home_team_id(name),
            away_team:gestionnairetournoi_teams!away_team_id(name)
        `)
        .eq('tournament_id', tournamentId)
        .order('match_date', { ascending: true });

    if (error) {
        console.error('Erreur chargement matchs:', error);
        showToast('Erreur lors du chargement des matchs', 'error');
        return;
    }
    matches = data || [];
    renderMatches();
}

function renderMatches() {
    const container = document.getElementById('matchesList');
    if (!container) return;
    if (matches.length === 0) {
        container.innerHTML = '<p>Aucun match programmé pour le moment.</p>';
        return;
    }
    container.innerHTML = matches.map(m => `
        <div class="match-card" data-match-id="${m.id}">
            <div class="match-info">
                <span class="match-date">${new Date(m.match_date).toLocaleString()}</span>
                <div class="match-teams">
                    <span class="team-name">${escapeHtml(m.home_team?.name || 'Équipe')}</span>
                    <span class="match-score">${m.home_score ?? '?'} - ${m.away_score ?? '?'}</span>
                    <span class="team-name">${escapeHtml(m.away_team?.name || 'Équipe')}</span>
                </div>
                <div class="match-status">${m.status === 'scheduled' ? 'À venir' : m.status === 'live' ? 'En direct' : 'Terminé'}</div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            const matchId = card.dataset.matchId;
            window.location.href = `match-details.html?id=${matchId}&tournament=${tournamentId}`;
        });
    });
}

async function loadRankings() {
    // Récupérer les statistiques agrégées (table gestionnairetournoi_stats)
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_stats')
        .select(`
            *,
            team:gestionnairetournoi_teams(name)
        `)
        .eq('tournament_id', tournamentId)
        .order('points', { ascending: false })
        .order('goals_for', { ascending: false });

    if (error) {
        console.error('Erreur chargement classement:', error);
        showToast('Erreur lors du chargement du classement', 'error');
        return;
    }
    renderRankings(data || []);
}

function renderRankings(rankings) {
    const container = document.getElementById('rankingsList');
    if (!container) return;
    if (rankings.length === 0) {
        container.innerHTML = '<p>Aucune donnée de classement disponible.</p>';
        return;
    }
    container.innerHTML = `
        <table class="rankings-table">
            <thead>
                <tr><th>Position</th><th>Équipe</th><th>Matchs</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Points</th></tr>
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
                        <td>${(r.goals_for || 0) - (r.goals_against || 0)}</td>
                        <td>${r.points || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Gestion des onglets
document.getElementById('viewMatchesBtn').addEventListener('click', () => {
    document.getElementById('matchesSection').style.display = 'block';
    document.getElementById('rankingsSection').style.display = 'none';
    loadMatches();
});
document.getElementById('viewRankingsBtn').addEventListener('click', () => {
    document.getElementById('matchesSection').style.display = 'none';
    document.getElementById('rankingsSection').style.display = 'block';
    loadRankings();
});
document.getElementById('registerBtn').addEventListener('click', registerForTournament);

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadTournament();
});