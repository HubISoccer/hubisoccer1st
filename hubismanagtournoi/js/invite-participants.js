// ===== RÉCUPÉRATION DE L'ID DU TOURNOI =====
const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');

if (!tournamentId) {
    window.location.href = 'my-tournaments.html';
}

let currentUser = null;
let tournamentData = null;
let allTeams = [];
let allPlayers = [];
let invitations = [];
let currentFilter = '';

// ===== VÉRIFICATION DE L'UTILISATEUR ET CHARGEMENT DU TOURNOI =====
async function getCurrentUser() {
    if (window.supabaseAuthPrive) {
        const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
        if (!error && user) return user;
    }
    return null;
}

async function checkCreator() {
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return false;
    }
    const { data: tournament, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select('created_by, name, start_date, end_date, location, sport_id')
        .eq('id', tournamentId)
        .single();
    if (error || !tournament || tournament.created_by !== currentUser.id) {
        showToast('Vous n\'êtes pas autorisé à inviter pour ce tournoi', 'error');
        window.location.href = 'my-tournaments.html';
        return false;
    }
    tournamentData = tournament;
    document.getElementById('tournamentName').textContent = tournament.name;
    document.getElementById('tournamentDetails').innerHTML = `
        Du ${new Date(tournament.start_date).toLocaleDateString('fr-FR')} au ${new Date(tournament.end_date).toLocaleDateString('fr-FR')}<br>
        ${tournament.location || 'Lieu non précisé'}
    `;
    return true;
}

// ===== CHARGEMENT DES ÉQUIPES =====
async function loadTeams() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_teams')
        .select('*')
        .order('name');
    if (error) {
        console.error(error);
        showToast('Erreur chargement des équipes', 'error');
        return;
    }
    allTeams = data || [];
    renderTeams();
}

function renderTeams() {
    const container = document.getElementById('teamsList');
    const filter = document.getElementById('teamSearch').value.toLowerCase();
    const filtered = allTeams.filter(team => team.name.toLowerCase().includes(filter));
    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Aucune équipe trouvée</p></div>';
        return;
    }
    container.innerHTML = filtered.map(team => `
        <div class="item-card" data-id="${team.id}">
            <div class="item-info">
                <div class="item-avatar">
                    ${team.logo_url ? `<img src="${team.logo_url}" alt="${team.name}">` : `<i class="fas fa-users"></i>`}
                </div>
                <div class="item-details">
                    <h4>${escapeHtml(team.name)}</h4>
                    <p>${team.age_category || 'Toutes catégories'}</p>
                </div>
            </div>
            <button class="btn-invite" data-type="team" data-id="${team.id}" data-name="${escapeHtml(team.name)}">
                <i class="fas fa-paper-plane"></i> Inviter
            </button>
        </div>
    `).join('');
    attachInviteButtons();
}

// ===== CHARGEMENT DES JOUEURS =====
async function loadPlayers() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select(`
            id,
            user_id,
            jersey_number,
            position,
            profiles:user_id (id, full_name, avatar_url)
        `);
    if (error) {
        console.error(error);
        showToast('Erreur chargement des joueurs', 'error');
        return;
    }
    allPlayers = data || [];
    renderPlayers();
}

function renderPlayers() {
    const container = document.getElementById('playersList');
    const filter = document.getElementById('playerSearch').value.toLowerCase();
    const filtered = allPlayers.filter(p => (p.profiles?.full_name || '').toLowerCase().includes(filter));
    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user"></i><p>Aucun joueur trouvé</p></div>';
        return;
    }
    container.innerHTML = filtered.map(player => `
        <div class="item-card" data-id="${player.id}">
            <div class="item-info">
                <div class="item-avatar">
                    ${player.profiles?.avatar_url ? `<img src="${player.profiles.avatar_url}" alt="${player.profiles.full_name}">` : `<i class="fas fa-user"></i>`}
                </div>
                <div class="item-details">
                    <h4>${escapeHtml(player.profiles?.full_name || 'Joueur')}</h4>
                    <p>${player.position || 'Poste non renseigné'} ${player.jersey_number ? `- N°${player.jersey_number}` : ''}</p>
                </div>
            </div>
            <button class="btn-invite" data-type="player" data-id="${player.id}" data-name="${escapeHtml(player.profiles?.full_name || 'Joueur')}">
                <i class="fas fa-paper-plane"></i> Inviter
            </button>
        </div>
    `).join('');
    attachInviteButtons();
}

// ===== INVITATIONS =====
async function loadInvitations() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_invitations')
        .select(`
            *,
            team:team_id (id, name, logo_url),
            player:player_id (id, user_id, profiles:user_id (full_name, avatar_url))
        `)
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement des invitations', 'error');
        return;
    }
    invitations = data || [];
    renderInvitations();
}

function renderInvitations() {
    const container = document.getElementById('invitationsList');
    if (!invitations.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope"></i><p>Aucune invitation envoyée</p></div>';
        return;
    }
    container.innerHTML = invitations.map(inv => {
        let name = '';
        let avatar = '';
        let typeLabel = '';
        if (inv.team) {
            name = inv.team.name;
            avatar = inv.team.logo_url;
            typeLabel = 'Équipe';
        } else if (inv.player) {
            name = inv.player.profiles?.full_name || 'Joueur';
            avatar = inv.player.profiles?.avatar_url;
            typeLabel = 'Joueur';
        }
        const statusClass = inv.status === 'pending' ? 'status-pending' : (inv.status === 'accepted' ? 'status-accepted' : 'status-declined');
        const statusText = inv.status === 'pending' ? 'En attente' : (inv.status === 'accepted' ? 'Acceptée' : 'Refusée');
        return `
            <div class="invitation-item">
                <div class="item-info">
                    <div class="item-avatar">
                        ${avatar ? `<img src="${avatar}" alt="${name}">` : `<i class="fas ${inv.team ? 'fa-users' : 'fa-user'}"></i>`}
                    </div>
                    <div class="item-details">
                        <h4>${escapeHtml(name)}</h4>
                        <p>${typeLabel}</p>
                    </div>
                </div>
                <div>
                    <span class="invitation-status ${statusClass}">${statusText}</span>
                    <small style="margin-left: 10px;">${new Date(inv.created_at).toLocaleDateString('fr-FR')}</small>
                </div>
            </div>
        `;
    }).join('');
}

// ===== ENVOI D'INVITATION =====
async function sendInvitation(type, id, name) {
    const payload = {
        tournament_id: tournamentId,
        status: 'pending',
        created_by: currentUser.id
    };
    if (type === 'team') {
        payload.team_id = id;
    } else {
        payload.player_id = id;
    }
    const { error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_invitations')
        .insert(payload);
    if (error) {
        showToast(`Erreur lors de l'invitation de ${name}`, 'error');
        console.error(error);
    } else {
        showToast(`Invitation envoyée à ${name}`, 'success');
        loadInvitations();
        // Mettre à jour le bouton pour indiquer "Invité"
        const btn = document.querySelector(`.btn-invite[data-type="${type}"][data-id="${id}"]`);
        if (btn) {
            btn.classList.add('invited');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-check"></i> Invité';
        }
    }
}

function attachInviteButtons() {
    document.querySelectorAll('.btn-invite').forEach(btn => {
        // Vérifier si déjà invité
        const type = btn.getAttribute('data-type');
        const id = parseInt(btn.getAttribute('data-id'));
        const alreadyInvited = invitations.some(inv => 
            (type === 'team' && inv.team_id === id) || 
            (type === 'player' && inv.player_id === id)
        );
        if (alreadyInvited) {
            btn.classList.add('invited');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-check"></i> Invité';
        } else {
            btn.addEventListener('click', () => {
                const name = btn.getAttribute('data-name');
                sendInvitation(type, id, name);
            });
        }
    });
}

// ===== CRÉATION D'ÉQUIPE =====
function openCreateTeamModal() {
    document.getElementById('createTeamModal').style.display = 'block';
}
function closeCreateTeamModal() {
    document.getElementById('createTeamModal').style.display = 'none';
}
async function createTeamAndInvite(e) {
    e.preventDefault();
    const name = document.getElementById('teamName').value.trim();
    if (!name) {
        showToast('Veuillez saisir un nom d\'équipe', 'warning');
        return;
    }
    const newTeam = {
        name: name,
        age_category: document.getElementById('teamAgeCategory').value,
        logo_url: document.getElementById('teamLogo').value,
        sport_id: tournamentData.sport_id,
        created_by: currentUser.id
    };
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_teams')
        .insert(newTeam)
        .select()
        .single();
    if (error) {
        showToast('Erreur création équipe', 'error');
        return;
    }
    showToast('Équipe créée avec succès', 'success');
    closeCreateTeamModal();
    // Rafraîchir la liste des équipes
    await loadTeams();
    // Envoyer l'invitation
    await sendInvitation('team', data.id, data.name);
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

    await Promise.all([
        loadTeams(),
        loadPlayers(),
        loadInvitations()
    ]);

    // Recherche
    document.getElementById('teamSearch').addEventListener('input', renderTeams);
    document.getElementById('playerSearch').addEventListener('input', renderPlayers);

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

    // Bouton création équipe
    document.getElementById('createTeamBtn').addEventListener('click', openCreateTeamModal);
    document.getElementById('createTeamForm').addEventListener('submit', createTeamAndInvite);

    // Fermeture modale
    document.querySelectorAll('.close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = `manage-tournament.html?id=${tournamentId}`;
    });
});
