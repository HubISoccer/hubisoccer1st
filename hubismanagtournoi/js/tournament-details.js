// ===== tournament-details.js =====
let currentUser = null;
let currentProfile = null;
let tournament = null;
let teams = [];
let matches = [];

// Récupérer l'ID du tournoi depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');

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
    if (!tournamentId) {
        document.getElementById('tournamentDetails').innerHTML = '<p class="no-data">ID du tournoi manquant.</p>';
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
        document.getElementById('tournamentDetails').innerHTML = '<p class="no-data">Tournoi introuvable.</p>';
        return;
    }
    tournament = data;
    await loadTeams();
    await loadMatches();
    renderDetails();
}

async function loadTeams() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_teams')
        .select('*')
        .eq('sport_id', tournament.sport_id);
    if (error) {
        console.error('Erreur chargement équipes:', error);
        return;
    }
    teams = data || [];
}

async function loadMatches() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('match_date', { ascending: true });
    if (error) {
        console.error('Erreur chargement matchs:', error);
        return;
    }
    matches = data || [];
}

function renderDetails() {
    const container = document.getElementById('tournamentDetails');
    if (!tournament) return;

    const typeLabel = tournament.type?.label || 'Tournoi';
    const sportName = tournament.sport?.name || 'Sport';

    let teamsHtml = '';
    if (teams.length) {
        teamsHtml = `
            <div class="tournament-section">
                <h2>Équipes participantes</h2>
                <div class="teams-grid">
                    ${teams.map(t => `
                        <div class="team-card">
                            <div class="team-logo"><i class="fas fa-users"></i></div>
                            <div class="team-name">${escapeHtml(t.name)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        teamsHtml = '<p>Aucune équipe inscrite pour le moment.</p>';
    }

    let matchesHtml = '';
    if (matches.length) {
        matchesHtml = `
            <div class="tournament-section">
                <h2>Calendrier des matchs</h2>
                <div class="matches-list">
                    ${matches.map(m => `
                        <div class="match-card" data-match-id="${m.id}">
                            <div class="match-date">${new Date(m.match_date).toLocaleString()}</div>
                            <div class="match-teams">
                                <span>${getTeamName(m.home_team_id)}</span> vs <span>${getTeamName(m.away_team_id)}</span>
                            </div>
                            <div class="match-score">
                                ${m.home_score} - ${m.away_score}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        matchesHtml = '<p>Aucun match programmé pour le moment.</p>';
    }

    container.innerHTML = `
        <div class="tournament-header-details">
            <h1>${escapeHtml(tournament.name)}</h1>
            <div class="tournament-badge">${typeLabel} · ${sportName}</div>
        </div>
        <div class="tournament-info-grid">
            <div class="info-card">
                <i class="fas fa-calendar-alt"></i>
                <div><strong>Dates</strong><br>${new Date(tournament.start_date).toLocaleDateString()} - ${new Date(tournament.end_date).toLocaleDateString()}</div>
            </div>
            <div class="info-card">
                <i class="fas fa-map-marker-alt"></i>
                <div><strong>Lieu</strong><br>${escapeHtml(tournament.location || 'Non spécifié')}</div>
            </div>
            <div class="info-card">
                <i class="fas fa-trophy"></i>
                <div><strong>Prime</strong><br>${tournament.prize_pool ? tournament.prize_pool.toLocaleString() + ' FCFA' : 'À définir'}</div>
            </div>
            ${tournament.stream_url ? `
                <div class="info-card">
                    <i class="fas fa-video"></i>
                    <div><strong>Live</strong><br><a href="${escapeHtml(tournament.stream_url)}" target="_blank">Regarder le direct</a></div>
                </div>
            ` : ''}
        </div>
        ${tournament.rules ? `
            <div class="tournament-section">
                <h2>Règlement</h2>
                <div class="rules-text">${escapeHtml(tournament.rules).replace(/\n/g, '<br>')}</div>
            </div>
        ` : ''}
        ${teamsHtml}
        ${matchesHtml}
        <div class="tournament-actions">
            ${canRegister() ? `<button id="registerBtn" class="btn-register">S'inscrire</button>` : ''}
            ${isCreator() ? `<button id="editTournamentBtn" class="btn-edit">Modifier le tournoi</button>` : ''}
        </div>
    `;

    if (canRegister()) {
        document.getElementById('registerBtn').addEventListener('click', registerForTournament);
    }
    if (isCreator()) {
        document.getElementById('editTournamentBtn').addEventListener('click', () => {
            window.location.href = `edit-tournament.html?id=${tournament.id}`;
        });
    }
    // Attacher événement sur les matchs pour voir le détail
    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            const matchId = card.dataset.matchId;
            window.location.href = `match-details.html?id=${matchId}`;
        });
    });
}

function getTeamName(teamId) {
    const team = teams.find(t => t.id == teamId);
    return team ? escapeHtml(team.name) : 'Inconnu';
}

function canRegister() {
    if (!currentProfile) return false;
    // Vérifie si l'utilisateur n'est pas déjà inscrit (à implémenter plus tard)
    // Pour l'instant on retourne true pour tous les tournois actifs et non créés par lui
    return tournament.is_active && tournament.created_by !== currentProfile.id;
}

function isCreator() {
    return currentProfile && tournament.created_by === currentProfile.id;
}

async function registerForTournament() {
    const btn = document.getElementById('registerBtn');
    withButtonSpinner(btn, async () => {
        // Vérifier si l'utilisateur a déjà une équipe (à adapter selon votre logique)
        // Pour l'instant on simule une inscription individuelle
        const { data: existing, error: checkError } = await supabaseGestionTournoi
            .from('gestionnairetournoi_registrations')
            .select('id')
            .eq('tournament_id', tournament.id)
            .eq('user_id', currentProfile.id)
            .maybeSingle();
        if (existing) {
            showToast('Vous êtes déjà inscrit à ce tournoi.', 'warning');
            return;
        }
        // Créer une équipe temporaire pour le joueur si nécessaire (à simplifier)
        const { data: playerTeam, error: teamError } = await supabaseGestionTournoi
            .from('gestionnairetournoi_players')
            .select('team_id')
            .eq('user_id', currentProfile.id)
            .maybeSingle();
        let teamId = playerTeam?.team_id;
        if (!teamId) {
            // Créer une équipe "Libre" pour ce joueur
            const { data: newTeam, error: createTeamError } = await supabaseGestionTournoi
                .from('gestionnairetournoi_teams')
                .insert({
                    name: `${currentProfile.full_name} (individuel)`,
                    sport_id: tournament.sport_id,
                    created_by: currentProfile.id
                })
                .select()
                .single();
            if (createTeamError) {
                showToast('Erreur lors de la création de l\'équipe', 'error');
                return;
            }
            teamId = newTeam.id;
            // Ajouter le joueur dans gestionnairetournoi_players
            await supabaseGestionTournoi
                .from('gestionnairetournoi_players')
                .insert({
                    user_id: currentProfile.id,
                    team_id: teamId
                });
        }
        // Inscription
        const { error: regError } = await supabaseGestionTournoi
            .from('gestionnairetournoi_registrations')
            .insert({
                tournament_id: tournament.id,
                player_id: currentProfile.id, // à adapter : en réalité il faut l'id de gestionnairetournoi_players
                team_id: teamId,
                status: 'pending'
            });
        if (regError) {
            showToast('Erreur lors de l\'inscription', 'error');
        } else {
            showToast('Inscription demandée. En attente de validation.', 'success');
        }
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadTournament();
});