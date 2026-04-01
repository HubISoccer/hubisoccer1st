// ===== RÉCUPÉRATION DES PARAMÈTRES URL =====
const urlParams = new URLSearchParams(window.location.search);
const currentTournamentId = urlParams.get('tournament_id'); // optionnel, utilisé pour le retour

// ===== ÉTATS =====
let currentUser = null;
let currentProfile = null;
let userPlayers = [];
let allTeams = [];
let userRequests = [];
let pendingRequests = [];

// ===== AUTHENTIFICATION =====
async function getCurrentUser() {
    const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
    if (!error && user) return user;
    return null;
}

async function loadProfile() {
    if (!currentUser) return;
    const { data, error } = await window.supabaseAuthPrive
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (!error && data) currentProfile = data;
}

// ===== CHARGEMENT DES JOUEURS DE L'UTILISATEUR =====
async function loadUserPlayers() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select(`
            *,
            team:team_id (id, name),
            profiles:user_id (full_name, avatar_url)
        `)
        .eq('user_id', currentUser.id);
    if (error) {
        console.error(error);
        userPlayers = [];
    } else {
        userPlayers = data || [];
    }

    const playerSelect = document.getElementById('playerSelect');
    if (!userPlayers.length) {
        playerSelect.innerHTML = '<option value="">Aucun joueur trouvé</option>';
        return;
    }
    playerSelect.innerHTML = '<option value="">Sélectionnez un joueur</option>' +
        userPlayers.map(p => `
            <option value="${p.id}" data-team-id="${p.team_id || ''}" data-team-name="${p.team?.name || 'Aucune équipe'}">
                ${p.profiles?.full_name || 'Joueur'} (${p.position || '?'})
            </option>
        `).join('');

    playerSelect.addEventListener('change', () => {
        const selected = playerSelect.options[playerSelect.selectedIndex];
        const teamName = selected.getAttribute('data-team-name') || '';
        document.getElementById('currentTeamDisplay').value = teamName;
    });
}

// ===== CHARGEMENT DES ÉQUIPES POUR LA DESTINATION =====
async function loadTeams() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_teams')
        .select('*')
        .order('name');
    if (error) {
        console.error(error);
        allTeams = [];
    } else {
        allTeams = data || [];
    }
    const teamSelect = document.getElementById('targetTeamSelect');
    teamSelect.innerHTML = '<option value="">Sélectionnez une équipe</option>' +
        allTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// ===== CHARGEMENT DES DEMANDES DE L'UTILISATEUR =====
async function loadUserRequests() {
    const playerIds = userPlayers.map(p => p.id);
    if (!playerIds.length) {
        userRequests = [];
        renderUserRequests();
        return;
    }
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_transfers')
        .select(`
            *,
            from_team:from_team_id (id, name),
            to_team:to_team_id (id, name),
            player:player_id (id, user_id, profiles:user_id (full_name))
        `)
        .in('player_id', playerIds)
        .order('requested_at', { ascending: false });
    if (error) {
        console.error(error);
        userRequests = [];
    } else {
        userRequests = data || [];
    }
    renderUserRequests();
}

function renderUserRequests() {
    const container = document.getElementById('myRequestsList');
    if (!userRequests.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Aucune demande de transfert</p></div>';
        return;
    }
    container.innerHTML = userRequests.map(req => {
        const statusClass = req.status === 'pending' ? 'status-pending' : (req.status === 'approved' ? 'status-approved' : 'status-rejected');
        const statusText = req.status === 'pending' ? 'En attente' : (req.status === 'approved' ? 'Approuvé' : 'Rejeté');
        return `
            <div class="request-card">
                <div class="request-info">
                    <div class="request-player">${escapeHtml(req.player?.profiles?.full_name || 'Joueur')}</div>
                    <div class="request-details">
                        De : ${req.from_team?.name || 'Aucune'} → Vers : ${req.to_team?.name || '?'}<br>
                        ${req.reason ? `Motif : ${escapeHtml(req.reason)}` : ''}<br>
                        Demandé le ${new Date(req.requested_at).toLocaleDateString('fr-FR')}
                    </div>
                </div>
                <div class="request-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }).join('');
}

// ===== CHARGEMENT DES DEMANDES EN ATTENTE (POUR ADMIN) =====
async function loadPendingRequests() {
    // Vérifier si l'utilisateur est admin
    if (!currentProfile || currentProfile.role !== 'admin') {
        const pendingTab = document.getElementById('pendingTab');
        if (pendingTab) pendingTab.style.display = 'none';
        return;
    }
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_transfers')
        .select(`
            *,
            from_team:from_team_id (id, name),
            to_team:to_team_id (id, name),
            player:player_id (id, user_id, profiles:user_id (full_name))
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });
    if (error) {
        console.error(error);
        pendingRequests = [];
    } else {
        pendingRequests = data || [];
    }
    renderPendingRequests();
}

function renderPendingRequests() {
    const container = document.getElementById('pendingRequestsList');
    if (!pendingRequests.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Aucune demande en attente</p></div>';
        return;
    }
    container.innerHTML = pendingRequests.map(req => `
        <div class="request-card" data-id="${req.id}">
            <div class="request-info">
                <div class="request-player">${escapeHtml(req.player?.profiles?.full_name || 'Joueur')}</div>
                <div class="request-details">
                    De : ${req.from_team?.name || 'Aucune'} → Vers : ${req.to_team?.name || '?'}<br>
                    ${req.reason ? `Motif : ${escapeHtml(req.reason)}` : ''}<br>
                    Demandé le ${new Date(req.requested_at).toLocaleDateString('fr-FR')}
                </div>
            </div>
            <div class="request-actions">
                <button class="btn-approve" data-id="${req.id}">Approuver</button>
                <button class="btn-reject" data-id="${req.id}">Rejeter</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await updateTransferStatus(id, 'approved');
        });
    });
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await updateTransferStatus(id, 'rejected');
        });
    });
}

async function updateTransferStatus(transferId, status) {
    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_transfers')
        .update({
            status: status,
            approved_at: new Date().toISOString(),
            approved_by: currentUser.id
        })
        .eq('id', transferId);
    if (error) {
        showToast('Erreur lors de la mise à jour', 'error');
    } else {
        showToast(`Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}`, 'success');
        if (status === 'approved') {
            // Mettre à jour l'équipe du joueur
            const transfer = pendingRequests.find(r => r.id == transferId);
            if (transfer) {
                await window.supabaseAuthPrive
                    .from('gestionnairetournoi_players')
                    .update({ team_id: transfer.to_team_id })
                    .eq('id', transfer.player_id);
            }
        }
        await loadPendingRequests();
        await loadUserRequests();
    }
}

// ===== ENVOI D'UNE DEMANDE DE TRANSFERT =====
async function submitTransfer(e) {
    e.preventDefault();
    const playerId = document.getElementById('playerSelect').value;
    const targetTeamId = document.getElementById('targetTeamSelect').value;
    const reason = document.getElementById('transferReason').value.trim();

    if (!playerId || !targetTeamId) {
        showToast('Veuillez sélectionner un joueur et une équipe de destination', 'warning');
        return;
    }

    const selectedPlayer = userPlayers.find(p => p.id == playerId);
    const currentTeamId = selectedPlayer?.team_id || null;

    if (currentTeamId == targetTeamId) {
        showToast('Le joueur est déjà dans cette équipe', 'warning');
        return;
    }

    const { error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_transfers')
        .insert({
            player_id: playerId,
            from_team_id: currentTeamId,
            to_team_id: targetTeamId,
            reason: reason || null,
            status: 'pending',
            requested_at: new Date().toISOString()
        });

    if (error) {
        showToast('Erreur lors de l\'envoi de la demande', 'error');
    } else {
        showToast('Demande de transfert envoyée', 'success');
        document.getElementById('transferForm').reset();
        document.getElementById('currentTeamDisplay').value = '';
        await loadUserRequests();
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    await loadProfile();
    await loadUserPlayers();
    await loadTeams();
    await loadUserRequests();
    await loadPendingRequests();

    document.getElementById('transferForm').addEventListener('submit', submitTransfer);

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

    document.getElementById('backBtn').addEventListener('click', () => {
        if (currentTournamentId) {
            window.location.href = `tournament-details.html?id=${currentTournamentId}`;
        } else {
            window.location.href = 'accueil_hubisgst.html';
        }
    });
});
