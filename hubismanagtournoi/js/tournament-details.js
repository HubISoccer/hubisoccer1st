// ===== RÉCUPÉRATION DE L'ID DU TOURNOI =====
const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');

if (!tournamentId) {
    window.location.href = 'accueil_hubisgst.html';
}

// ===== ÉLÉMENTS DOM =====
const tournamentNameEl = document.getElementById('tournamentName');
const tournamentDatesEl = document.getElementById('tournamentDates');
const tournamentLocationEl = document.getElementById('tournamentLocation');
const tournamentPrizeEl = document.getElementById('tournamentPrize');
const tournamentTypeEl = document.getElementById('tournamentType');
const tournamentSportEl = document.getElementById('tournamentSport');
const tournamentDescriptionEl = document.getElementById('tournamentDescription');
const teamsListEl = document.getElementById('teamsList');
const matchesListEl = document.getElementById('matchesList');
const standingsListEl = document.getElementById('standingsList');
const prizeSection = document.getElementById('prizeSection');
const prizeListEl = document.getElementById('prizeList');
const registerBtn = document.getElementById('registerBtn');
const registrationBlock = document.getElementById('registrationBlock');
const registrationMessage = document.getElementById('registrationMessage');

// ===== ÉTATS =====
let currentUser = null;
let tournamentData = null;
let teamsData = [];
let matchesData = [];
let standingsData = [];
let prizesData = [];

// ===== FONCTIONS UTILITAIRES =====
async function getCurrentUser() {
    if (window.supabaseAuthPrive) {
        const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
        if (!error && user) return user;
    }
    return null;
}

function showError(message) {
    if (window.showToast) window.showToast(message, 'error');
    else alert(message);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadTournamentDetails() {
    try {
        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_tournaments')
            .select(`
                *,
                type:type_id (name, label),
                sport:sport_id (name)
            `)
            .eq('id', tournamentId)
            .single();

        if (error) throw error;
        tournamentData = data;

        tournamentNameEl.textContent = data.name;
        tournamentDatesEl.textContent = `${formatDate(data.start_date)} - ${formatDate(data.end_date)}`;
        tournamentLocationEl.textContent = data.location || 'Non spécifié';
        tournamentPrizeEl.textContent = data.prize_pool ? `${data.prize_pool.toLocaleString()} FCFA` : 'Non défini';
        tournamentTypeEl.textContent = data.type?.label || data.type?.name || 'Non spécifié';
        tournamentSportEl.textContent = data.sport?.name || 'Non spécifié';
        tournamentDescriptionEl.textContent = data.description || 'Aucune description';

        // Afficher le bouton d'inscription si le tournoi est actif et l'utilisateur connecté
        if (currentUser) {
            await checkUserRegistration();
            registrationBlock.style.display = 'block';
        } else {
            registrationBlock.style.display = 'none';
        }

    } catch (err) {
        console.error(err);
        showError('Erreur lors du chargement du tournoi');
    }
}

async function checkUserRegistration() {
    if (!currentUser || !tournamentData) return;
    // Vérifier si l'utilisateur est déjà inscrit (dans la table gestionnairetournoi_registrations)
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .select('id, status')
        .eq('tournament_id', tournamentId)
        .eq('player_id', currentUser.id) // Il faudrait une jointure avec gestionnairetournoi_players pour trouver le player_id
        .maybeSingle();

    // Pour simplifier, on suppose qu'on a une table `gestionnairetournoi_players` avec `user_id`
    // On va d'abord récupérer le player_id correspondant à l'utilisateur
    const { data: player, error: playerError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (playerError || !player) {
        // L'utilisateur n'a pas de fiche joueur, donc pas encore inscrit
        registerBtn.disabled = false;
        registerBtn.onclick = () => registerUser();
        registrationMessage.textContent = '';
        return;
    }

    const { data: reg, error: regError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .select('status')
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.id)
        .maybeSingle();

    if (regError) {
        console.error(regError);
        registerBtn.disabled = true;
        registrationMessage.textContent = 'Erreur de vérification';
        return;
    }

    if (reg) {
        if (reg.status === 'approved') {
            registerBtn.disabled = true;
            registerBtn.textContent = 'Inscrit ✓';
            registrationMessage.textContent = 'Vous êtes déjà inscrit et approuvé.';
        } else if (reg.status === 'pending') {
            registerBtn.disabled = true;
            registerBtn.textContent = 'En attente';
            registrationMessage.textContent = 'Votre inscription est en attente de validation.';
        } else {
            registerBtn.disabled = false;
            registerBtn.onclick = () => registerUser();
            registrationMessage.textContent = '';
        }
    } else {
        registerBtn.disabled = false;
        registerBtn.onclick = () => registerUser();
        registrationMessage.textContent = '';
    }
}

async function registerUser() {
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    if (!tournamentData) return;

    // 1. S'assurer que l'utilisateur a une fiche joueur dans gestionnairetournoi_players
    let playerId;
    const { data: existingPlayer, error: playerError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (playerError) {
        showError('Erreur lors de la vérification de votre profil');
        return;
    }

    if (existingPlayer) {
        playerId = existingPlayer.id;
    } else {
        // Créer une fiche joueur basique
        const { data: newPlayer, error: createError } = await supabaseGestionTournoi
            .from('gestionnairetournoi_players')
            .insert({
                user_id: currentUser.id,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        if (createError) {
            showError('Erreur lors de la création de votre fiche joueur');
            return;
        }
        playerId = newPlayer.id;
    }

    // 2. Vérifier si déjà inscrit
    const { data: existingReg, error: regCheckError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .maybeSingle();

    if (regCheckError) {
        showError('Erreur de vérification');
        return;
    }
    if (existingReg) {
        showToast('Vous êtes déjà inscrit à ce tournoi', 'warning');
        return;
    }

    // 3. Inscription
    const { error: insertError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .insert({
            tournament_id: tournamentId,
            player_id: playerId,
            status: 'pending'
        });

    if (insertError) {
        showError('Erreur lors de l\'inscription');
        return;
    }

    showToast('Inscription enregistrée, en attente de validation', 'success');
    registerBtn.disabled = true;
    registerBtn.textContent = 'En attente';
    registrationMessage.textContent = 'Votre inscription est en attente de validation.';
}

// ===== CHARGEMENT DES ÉQUIPES =====
async function loadTeams() {
    try {
        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_teams')
            .select(`
                *,
                players:gestionnairetournoi_players( id, user_id, jersey_number, position, is_captain )
            `)
            .eq('sport_id', tournamentData.sport_id);
        if (error) throw error;
        teamsData = data || [];
        renderTeams();
    } catch (err) {
        console.error(err);
        teamsListEl.innerHTML = '<div class="empty-state">Erreur chargement des équipes</div>';
    }
}

function renderTeams() {
    if (!teamsData.length) {
        teamsListEl.innerHTML = '<div class="empty-state">Aucune équipe inscrite pour le moment</div>';
        return;
    }
    teamsListEl.innerHTML = teamsData.map(team => `
        <div class="team-card" onclick="window.location.href='team-details.html?id=${team.id}'">
            <div class="team-logo">
                ${team.logo_url ? `<img src="${team.logo_url}" alt="${team.name}">` : `<i class="fas fa-users"></i>`}
            </div>
            <div class="team-info">
                <div class="team-name">${escapeHtml(team.name)}</div>
                <div class="team-category">${team.age_category || 'Toutes catégories'}</div>
            </div>
        </div>
    `).join('');
}

// ===== CHARGEMENT DES MATCHS =====
async function loadMatches() {
    try {
        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_matches')
            .select(`
                *,
                home_team:home_team_id (id, name),
                away_team:away_team_id (id, name)
            `)
            .eq('tournament_id', tournamentId)
            .order('match_date', { ascending: true });
        if (error) throw error;
        matchesData = data || [];
        renderMatches();
    } catch (err) {
        console.error(err);
        matchesListEl.innerHTML = '<div class="empty-state">Erreur chargement des matchs</div>';
    }
}

function renderMatches() {
    if (!matchesData.length) {
        matchesListEl.innerHTML = '<div class="empty-state">Aucun match programmé pour le moment</div>';
        return;
    }
    const now = new Date();
    matchesListEl.innerHTML = matchesData.map(match => {
        const matchDate = new Date(match.match_date);
        const isLive = matchDate <= now && matchDate > new Date(now - 2 * 60 * 60 * 1000);
        const scoreDisplay = (match.home_score !== undefined && match.away_score !== undefined) ?
            `${match.home_score} - ${match.away_score}` : 'vs';
        return `
            <div class="match-card">
                <div class="match-date">
                    <i class="fas fa-calendar-alt"></i> ${formatDateTime(match.match_date)}
                </div>
                <div class="match-teams">
                    <span>${escapeHtml(match.home_team?.name || '?')}</span>
                    <span class="match-score">${scoreDisplay}</span>
                    <span>${escapeHtml(match.away_team?.name || '?')}</span>
                </div>
                ${isLive && match.stream_url ? `
                    <a href="${match.stream_url}" target="_blank" class="match-stream"><i class="fas fa-video"></i> Live</a>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ===== CHARGEMENT DU CLASSEMENT =====
async function loadStandings() {
    try {
        // Récupérer les statistiques depuis gestionnairetournoi_stats
        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_stats')
            .select(`
                *,
                team:team_id (id, name)
            `)
            .eq('tournament_id', tournamentId)
            .order('points', { ascending: false })
            .order('goals_for', { ascending: false });
        if (error) throw error;
        standingsData = data || [];
        renderStandings();
    } catch (err) {
        console.error(err);
        standingsListEl.innerHTML = '<div class="empty-state">Classement non disponible</div>';
    }
}

function renderStandings() {
    if (!standingsData.length) {
        standingsListEl.innerHTML = '<div class="empty-state">Aucune statistique disponible</div>';
        return;
    }
    let html = `
        <table>
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
    standingsData.forEach((stat, idx) => {
        const diff = stat.goals_for - stat.goals_against;
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
    html += `</tbody></table>`;
    standingsListEl.innerHTML = html;
}

// ===== CHARGEMENT DES PRIMES =====
async function loadPrizes() {
    try {
        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_prizes')
            .select(`
                *,
                team:team_id (id, name),
                player:player_id (id, user_id)
            `)
            .eq('tournament_id', tournamentId)
            .order('amount', { ascending: false });
        if (error) throw error;
        prizesData = data || [];
        if (prizesData.length) {
            prizeSection.style.display = 'block';
            renderPrizes();
        } else {
            prizeSection.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
    }
}

function renderPrizes() {
    prizeListEl.innerHTML = prizesData.map(prize => {
        let winner = '';
        if (prize.team) winner = prize.team.name;
        else if (prize.player) winner = 'Joueur';
        else winner = 'Non attribué';
        return `
            <div class="prize-item">
                <div class="prize-winner">
                    <i class="fas fa-trophy"></i> ${escapeHtml(winner)}
                </div>
                <div class="prize-amount">${prize.amount.toLocaleString()} FCFA</div>
                <div class="prize-reason">${prize.reason || 'Récompense'}</div>
            </div>
        `;
    }).join('');
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Récupérer l'utilisateur connecté (si existant)
    if (window.supabaseAuthPrive) {
        const user = await getCurrentUser();
        currentUser = user;
    }

    // Charger les données
    await loadTournamentDetails();
    if (!tournamentData) return;
    await Promise.all([
        loadTeams(),
        loadMatches(),
        loadStandings(),
        loadPrizes()
    ]);
});

// Exporter les fonctions si nécessaires (non requis ici)