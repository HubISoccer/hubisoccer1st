// ===== RÉCUPÉRATION DE L'ID DU TOURNOI =====
const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');

if (!tournamentId) {
    window.location.href = 'my-tournaments.html';
}

let currentUser = null;
let tournamentData = null;
let teamsList = [];
let pendingRegistrations = [];
let approvedRegistrations = [];
let matchesList = [];
let reportsList = [];
let prizesList = [];

// ===== VÉRIFICATION DE L'UTILISATEUR =====
async function getCurrentUser() {
    const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
    if (!error && user) return user;
    return null;
}

async function checkCreator() {
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return false;
    }
    const { data: tournament, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_tournaments')
        .select('created_by')
        .eq('id', tournamentId)
        .single();
    if (error || !tournament || tournament.created_by !== currentUser.id) {
        showToast('Vous n\'êtes pas autorisé à gérer ce tournoi', 'error');
        window.location.href = 'my-tournaments.html';
        return false;
    }
    return true;
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadTournamentInfo() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_tournaments')
        .select(`
            *,
            type:type_id (name, label),
            sport:sport_id (name)
        `)
        .eq('id', tournamentId)
        .single();
    if (error) {
        console.error(error);
        showToast('Erreur chargement du tournoi', 'error');
        return;
    }
    tournamentData = data;
    document.getElementById('tournamentName').textContent = data.name;
    document.getElementById('infoName').textContent = data.name;
    document.getElementById('infoDates').textContent = `${new Date(data.start_date).toLocaleDateString('fr-FR')} - ${new Date(data.end_date).toLocaleDateString('fr-FR')}`;
    document.getElementById('infoLocation').textContent = data.location || 'Non spécifié';
    document.getElementById('infoSport').textContent = data.sport?.name || '-';
    document.getElementById('infoType').textContent = data.type?.label || '-';
    document.getElementById('infoPrize').textContent = data.prize_pool ? `${data.prize_pool.toLocaleString()} FCFA` : 'Non défini';
    document.getElementById('infoDescription').textContent = data.description || 'Aucune description';
    // Préremplir le formulaire de modification
    document.getElementById('editName').value = data.name;
    document.getElementById('editStartDate').value = data.start_date?.slice(0,16);
    document.getElementById('editEndDate').value = data.end_date?.slice(0,16);
    document.getElementById('editLocation').value = data.location || '';
    document.getElementById('editDescription').value = data.description || '';
    document.getElementById('editPrizePool').value = data.prize_pool || '';
    document.getElementById('editRegistrationCode').value = data.registration_code || '';
    document.getElementById('editStreamUrl').value = data.stream_url || '';
    document.getElementById('editIsActive').checked = data.is_active;
}

async function loadRegistrations() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_registrations')
        .select(`
            *,
            player:player_id (
                id,
                user_id,
                jersey_number,
                position,
                profiles:user_id (full_name, avatar_url, email)
            )
        `)
        .eq('tournament_id', tournamentId)
        .order('registration_date', { ascending: false });
    if (error) {
        console.error(error);
        return;
    }
    pendingRegistrations = data.filter(r => r.status === 'pending');
    approvedRegistrations = data.filter(r => r.status === 'approved');
    renderRegistrations();
}

function renderRegistrations() {
    const pendingContainer = document.getElementById('pendingRegistrationsList');
    const approvedContainer = document.getElementById('approvedRegistrationsList');

    if (pendingRegistrations.length === 0) {
        pendingContainer.innerHTML = '<div class="empty-state">Aucune demande en attente</div>';
    } else {
        pendingContainer.innerHTML = pendingRegistrations.map(reg => `
            <div class="registration-item" data-id="${reg.id}">
                <div class="registration-info">
                    <div class="registration-name">${escapeHtml(reg.player?.profiles?.full_name || 'Joueur')}</div>
                    <div class="registration-details">
                        ${reg.player?.position ? `Poste: ${reg.player.position}` : ''}
                        ${reg.player?.jersey_number ? ` - N°${reg.player.jersey_number}` : ''}
                    </div>
                    <div class="registration-status status-pending">En attente</div>
                </div>
                <div class="registration-actions">
                    <button class="btn-approve" data-id="${reg.id}"><i class="fas fa-check"></i> Approuver</button>
                    <button class="btn-reject" data-id="${reg.id}"><i class="fas fa-times"></i> Rejeter</button>
                </div>
            </div>
        `).join('');
    }

    if (approvedRegistrations.length === 0) {
        approvedContainer.innerHTML = '<div class="empty-state">Aucune inscription validée</div>';
    } else {
        approvedContainer.innerHTML = approvedRegistrations.map(reg => `
            <div class="registration-item" data-id="${reg.id}">
                <div class="registration-info">
                    <div class="registration-name">${escapeHtml(reg.player?.profiles?.full_name || 'Joueur')}</div>
                    <div class="registration-details">
                        ${reg.player?.position ? `Poste: ${reg.player.position}` : ''}
                        ${reg.player?.jersey_number ? ` - N°${reg.player.jersey_number}` : ''}
                    </div>
                    <div class="registration-status status-approved">Approuvé</div>
                </div>
                <div class="registration-actions">
                    <button class="btn-reject" data-id="${reg.id}"><i class="fas fa-times"></i> Retirer</button>
                </div>
            </div>
        `).join('');
    }

    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', async () => {
            const regId = btn.getAttribute('data-id');
            await updateRegistrationStatus(regId, 'approved');
        });
    });
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async () => {
            const regId = btn.getAttribute('data-id');
            await updateRegistrationStatus(regId, 'rejected');
        });
    });
}

async function updateRegistrationStatus(registrationId, status) {
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_registrations')
        .update({ status, approved_by: currentUser.id })
        .eq('id', registrationId);
    if (error) {
        showToast('Erreur lors de la mise à jour', 'error');
    } else {
        showToast(`Inscription ${status === 'approved' ? 'approuvée' : 'rejetée'}`, 'success');
        await loadRegistrations();
    }
}

async function loadTeams() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_teams')
        .select('*')
        .eq('sport_id', tournamentData.sport_id)
        .order('name');
    if (error) {
        console.error(error);
        return;
    }
    teamsList = data || [];
    renderTeams();
}

function renderTeams() {
    const container = document.getElementById('teamsList');
    if (!teamsList.length) {
        container.innerHTML = '<div class="empty-state">Aucune équipe inscrite</div>';
        return;
    }
    container.innerHTML = teamsList.map(team => `
        <div class="team-card">
            <div class="team-logo">
                ${team.logo_url ? `<img src="${team.logo_url}" alt="${team.name}">` : `<i class="fas fa-users"></i>`}
            </div>
            <div class="team-info">
                <div class="team-name">${escapeHtml(team.name)}</div>
                <div class="team-category">${team.age_category || 'Toutes catégories'}</div>
            </div>
            <div class="team-actions">
                <button class="btn-edit" data-id="${team.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" data-id="${team.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editTeam(btn.getAttribute('data-id')));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const teamId = btn.getAttribute('data-id');
            if (confirm('Supprimer cette équipe ?')) {
                const { error } = await window.supabaseAuthPrive
                    .from('gestionnairetournoi_teams')
                    .delete()
                    .eq('id', teamId);
                if (error) showToast('Erreur suppression', 'error');
                else {
                    showToast('Équipe supprimée', 'success');
                    loadTeams();
                }
            }
        });
    });
}

async function loadMatches() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_matches')
        .select(`
            *,
            home_team:home_team_id (id, name),
            away_team:away_team_id (id, name)
        `)
        .eq('tournament_id', tournamentId)
        .order('match_date', { ascending: true });
    if (error) {
        console.error(error);
        return;
    }
    matchesList = data || [];
    renderMatches();
}

function renderMatches() {
    const container = document.getElementById('matchesList');
    if (!matchesList.length) {
        container.innerHTML = '<div class="empty-state">Aucun match programmé</div>';
        return;
    }
    container.innerHTML = matchesList.map(match => `
        <div class="match-item">
            <div class="match-info">
                <div class="match-title">${escapeHtml(match.home_team?.name || '?')} vs ${escapeHtml(match.away_team?.name || '?')}</div>
                <div class="match-details">${new Date(match.match_date).toLocaleString('fr-FR')} | ${match.location || 'Lieu non précisé'}</div>
                <div class="match-score">Score: ${match.home_score ?? '-'} - ${match.away_score ?? '-'}</div>
            </div>
            <div class="match-actions">
                <button class="btn-edit" data-id="${match.id}"><i class="fas fa-edit"></i> Modifier</button>
                <button class="btn-delete" data-id="${match.id}"><i class="fas fa-trash-alt"></i> Supprimer</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.match-actions .btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editMatch(btn.getAttribute('data-id')));
    });
    document.querySelectorAll('.match-actions .btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const matchId = btn.getAttribute('data-id');
            if (confirm('Supprimer ce match ?')) {
                const { error } = await window.supabaseAuthPrive
                    .from('gestionnairetournoi_matches')
                    .delete()
                    .eq('id', matchId);
                if (error) showToast('Erreur suppression', 'error');
                else {
                    showToast('Match supprimé', 'success');
                    loadMatches();
                }
            }
        });
    });
}

async function loadReports() {
    const matchIds = matchesList.map(m => m.id);
    if (!matchIds.length) {
        reportsList = [];
        renderReports();
        return;
    }
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_match_reports')
        .select(`
            *,
            match:match_id (id, home_team_id, away_team_id, home_team:home_team_id(name), away_team:away_team_id(name))
        `)
        .in('match_id', matchIds)
        .order('created_at', { ascending: false });
    if (error) {
        console.error(error);
        return;
    }
    reportsList = data || [];
    renderReports();
}

function renderReports() {
    const container = document.getElementById('reportsList');
    if (!reportsList.length) {
        container.innerHTML = '<div class="empty-state">Aucun rapport de match</div>';
        return;
    }
    container.innerHTML = reportsList.map(report => `
        <div class="report-item">
            <div class="report-info">
                <div class="report-title">${report.report_type === 'referee' ? 'Rapport arbitre' : report.report_type === 'commissioner' ? 'Rapport commissaire' : 'Rapport médical'}</div>
                <div class="report-details">Match: ${report.match?.home_team?.name} vs ${report.match?.away_team?.name}</div>
                <div class="report-details">Créé le ${new Date(report.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="report-actions">
                <a href="${report.file_url || '#'}" target="_blank" class="btn-view"><i class="fas fa-download"></i> Voir</a>
                <button class="btn-delete" data-id="${report.id}"><i class="fas fa-trash-alt"></i> Supprimer</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.report-actions .btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const reportId = btn.getAttribute('data-id');
            if (confirm('Supprimer ce rapport ?')) {
                const { error } = await window.supabaseAuthPrive
                    .from('gestionnairetournoi_match_reports')
                    .delete()
                    .eq('id', reportId);
                if (error) showToast('Erreur suppression', 'error');
                else {
                    showToast('Rapport supprimé', 'success');
                    loadReports();
                }
            }
        });
    });
}

async function loadPrizes() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_prizes')
        .select(`
            *,
            team:team_id (id, name),
            player:player_id (id, user_id, profiles:user_id (full_name))
        `)
        .eq('tournament_id', tournamentId)
        .order('amount', { ascending: false });
    if (error) {
        console.error(error);
        return;
    }
    prizesList = data || [];
    renderPrizes();
}

function renderPrizes() {
    const container = document.getElementById('prizesList');
    if (!prizesList.length) {
        container.innerHTML = '<div class="empty-state">Aucune prime attribuée</div>';
        return;
    }
    container.innerHTML = prizesList.map(prize => {
        let winner = '';
        if (prize.team) winner = prize.team.name;
        else if (prize.player) winner = prize.player.profiles?.full_name || 'Joueur';
        else winner = 'Non attribué';
        return `
            <div class="prize-item">
                <div class="prize-info">
                    <div class="prize-winner"><i class="fas fa-trophy"></i> ${escapeHtml(winner)}</div>
                    <div class="prize-details">${prize.amount.toLocaleString()} FCFA</div>
                    <div class="prize-details">${prize.reason || 'Récompense'}</div>
                </div>
                <div class="prize-actions">
                    <button class="btn-delete" data-id="${prize.id}"><i class="fas fa-trash-alt"></i> Supprimer</button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.prize-actions .btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const prizeId = btn.getAttribute('data-id');
            if (confirm('Supprimer cette prime ?')) {
                const { error } = await window.supabaseAuthPrive
                    .from('gestionnairetournoi_prizes')
                    .delete()
                    .eq('id', prizeId);
                if (error) showToast('Erreur suppression', 'error');
                else {
                    showToast('Prime supprimée', 'success');
                    loadPrizes();
                }
            }
        });
    });
}

// ===== GESTION DES MODALES =====
function openEditTournamentModal() {
    document.getElementById('editTournamentModal').style.display = 'block';
}
function closeEditTournamentModal() {
    document.getElementById('editTournamentModal').style.display = 'none';
}
async function saveTournamentChanges(e) {
    e.preventDefault();
    const updates = {
        name: document.getElementById('editName').value,
        start_date: document.getElementById('editStartDate').value,
        end_date: document.getElementById('editEndDate').value,
        location: document.getElementById('editLocation').value,
        description: document.getElementById('editDescription').value,
        prize_pool: parseFloat(document.getElementById('editPrizePool').value) || 0,
        registration_code: document.getElementById('editRegistrationCode').value,
        stream_url: document.getElementById('editStreamUrl').value,
        is_active: document.getElementById('editIsActive').checked
    };
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_tournaments')
        .update(updates)
        .eq('id', tournamentId);
    if (error) {
        showToast('Erreur mise à jour', 'error');
    } else {
        showToast('Tournoi modifié avec succès', 'success');
        closeEditTournamentModal();
        loadTournamentInfo();
    }
}

function openAddTeamModal() {
    document.getElementById('addTeamModal').style.display = 'block';
}
function closeAddTeamModal() {
    document.getElementById('addTeamModal').style.display = 'none';
}
async function addTeam(e) {
    e.preventDefault();
    const newTeam = {
        name: document.getElementById('teamName').value,
        age_category: document.getElementById('teamAgeCategory').value,
        logo_url: document.getElementById('teamLogo').value,
        sport_id: tournamentData.sport_id,
        created_by: currentUser.id
    };
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_teams')
        .insert(newTeam);
    if (error) {
        showToast('Erreur ajout équipe', 'error');
    } else {
        showToast('Équipe ajoutée', 'success');
        closeAddTeamModal();
        loadTeams();
    }
}

function openAddMatchModal() {
    const homeSelect = document.getElementById('matchHomeTeam');
    const awaySelect = document.getElementById('matchAwayTeam');
    homeSelect.innerHTML = '<option value="">Sélectionner</option>';
    awaySelect.innerHTML = '<option value="">Sélectionner</option>';
    teamsList.forEach(team => {
        homeSelect.innerHTML += `<option value="${team.id}">${escapeHtml(team.name)}</option>`;
        awaySelect.innerHTML += `<option value="${team.id}">${escapeHtml(team.name)}</option>`;
    });
    document.getElementById('addMatchModal').style.display = 'block';
}
function closeAddMatchModal() {
    document.getElementById('addMatchModal').style.display = 'none';
}
async function addMatch(e) {
    e.preventDefault();
    const newMatch = {
        tournament_id: tournamentId,
        match_date: document.getElementById('matchDate').value,
        location: document.getElementById('matchLocation').value,
        home_team_id: document.getElementById('matchHomeTeam').value,
        away_team_id: document.getElementById('matchAwayTeam').value,
        stream_url: document.getElementById('matchStreamUrl').value
    };
    if (!newMatch.home_team_id || !newMatch.away_team_id) {
        showToast('Sélectionnez les deux équipes', 'warning');
        return;
    }
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_matches')
        .insert(newMatch);
    if (error) {
        showToast('Erreur ajout match', 'error');
    } else {
        showToast('Match ajouté', 'success');
        closeAddMatchModal();
        loadMatches();
    }
}

function openAddPrizeModal() {
    const teamSelect = document.getElementById('prizeTeamId');
    teamSelect.innerHTML = '<option value="">Sélectionner</option>';
    teamsList.forEach(team => {
        teamSelect.innerHTML += `<option value="${team.id}">${escapeHtml(team.name)}</option>`;
    });
    const playerSelect = document.getElementById('prizePlayerId');
    playerSelect.innerHTML = '<option value="">Sélectionner</option>';
    approvedRegistrations.forEach(reg => {
        playerSelect.innerHTML += `<option value="${reg.player.id}">${escapeHtml(reg.player?.profiles?.full_name || 'Joueur')}</option>`;
    });
    document.getElementById('addPrizeModal').style.display = 'block';
}
function closeAddPrizeModal() {
    document.getElementById('addPrizeModal').style.display = 'none';
}
async function addPrize(e) {
    e.preventDefault();
    const recipientType = document.getElementById('prizeRecipientType').value;
    let prizeData = {
        tournament_id: tournamentId,
        amount: parseFloat(document.getElementById('prizeAmount').value),
        reason: document.getElementById('prizeReason').value
    };
    if (recipientType === 'team') {
        prizeData.team_id = document.getElementById('prizeTeamId').value;
        if (!prizeData.team_id) {
            showToast('Sélectionnez une équipe', 'warning');
            return;
        }
    } else {
        prizeData.player_id = document.getElementById('prizePlayerId').value;
        if (!prizeData.player_id) {
            showToast('Sélectionnez un joueur', 'warning');
            return;
        }
    }
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_prizes')
        .insert(prizeData);
    if (error) {
        showToast('Erreur ajout prime', 'error');
    } else {
        showToast('Prime ajoutée', 'success');
        closeAddPrizeModal();
        loadPrizes();
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    const isCreator = await checkCreator();
    if (!isCreator) return;

    await loadTournamentInfo();
    await loadRegistrations();
    await loadTeams();
    await loadMatches();
    await loadReports();
    await loadPrizes();

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

    document.getElementById('backBtn').addEventListener('click', () => window.location.href = 'my-tournaments.html');
    document.getElementById('editTournamentBtn').addEventListener('click', openEditTournamentModal);
    document.getElementById('editTournamentForm').addEventListener('submit', saveTournamentChanges);
    document.getElementById('addTeamBtn').addEventListener('click', openAddTeamModal);
    document.getElementById('addTeamForm').addEventListener('submit', addTeam);
    document.getElementById('addMatchBtn').addEventListener('click', openAddMatchModal);
    document.getElementById('addMatchForm').addEventListener('submit', addMatch);
    document.getElementById('addPrizeBtn').addEventListener('click', openAddPrizeModal);
    document.getElementById('addPrizeForm').addEventListener('submit', addPrize);

    // Fermeture des modales
    document.querySelectorAll('.close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
