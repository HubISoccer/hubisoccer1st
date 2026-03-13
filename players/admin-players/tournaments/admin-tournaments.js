// ===== CONFIGURATION SUPABASE (nom unique) =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseTournamentsAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let tournamentsData = [];
let allPlayers = []; // tous les joueurs (pour affectation)
let currentTournamentId = null;
let currentAction = null;

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ===== LOADER =====
function showLoader(show) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION ADMIN =====
async function checkAdmin() {
    showLoader(true);
    const { data: { session }, error } = await supabaseTournamentsAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseTournamentsAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseTournamentsAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DES TOURNOIS =====
async function loadTournaments() {
    showLoader(true);
    try {
        const { data, error } = await supabaseTournamentsAdmin
            .from('tournaments')
            .select(`
                *,
                players: tournament_players ( count ),
                messages: tournament_messages ( count )
            `)
            .order('date', { ascending: false });

        if (error) throw error;

        tournamentsData = data || [];
        renderTournaments();
        updateTournamentFilter();
    } catch (error) {
        console.error('Erreur chargement tournois:', error);
        showToast('Erreur lors du chargement', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES TOURNOIS =====
function renderTournaments() {
    const container = document.getElementById('tournamentsList');
    if (!container) return;

    if (tournamentsData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucun tournoi créé.</p>';
        return;
    }

    container.innerHTML = tournamentsData.map(t => `
        <div class="tournament-card" data-tournament-id="${t.id}">
            <div class="tournament-info">
                <div class="tournament-name">${t.name}</div>
                <div class="tournament-date">${new Date(t.date).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="tournament-stats">
                <i class="fas fa-users"></i> ${t.players?.[0]?.count || 0} joueurs · 
                <i class="fas fa-comment"></i> ${t.messages?.[0]?.count || 0} messages
            </div>
            <div class="tournament-actions">
                <button class="btn-action view" onclick="openPlayersModal(${t.id})"><i class="fas fa-users"></i> Joueurs</button>
                <button class="btn-action edit" onclick="editTournament(${t.id})"><i class="fas fa-edit"></i> Modifier</button>
                <button class="btn-action delete" onclick="confirmDeleteTournament(${t.id})"><i class="fas fa-trash"></i> Supprimer</button>
            </div>
        </div>
    `).join('');
}

// ===== CHARGEMENT DES JOUEURS POUR LE FILTRE =====
async function loadAllPlayers() {
    const { data, error } = await supabaseTournamentsAdmin
        .from('player_profiles')
        .select('id, nom_complet')
        .order('nom_complet');

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        return [];
    }
    return data || [];
}

// ===== RENDU DE L'ONGLET JOUEURS =====
async function renderPlayersTab() {
    const tournamentId = document.getElementById('tournamentFilter').value;
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();

    let query = supabaseTournamentsAdmin
        .from('tournament_players')
        .select(`
            *,
            player:player_profiles!player_id (
                id, nom_complet, avatar_url
            ),
            tournament:tournaments!tournament_id (
                id, name
            )
        `)
        .order('created_at', { ascending: false });

    if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erreur chargement participants:', error);
        return;
    }

    const filtered = data.filter(p => 
        p.player?.nom_complet?.toLowerCase().includes(searchTerm)
    );

    const container = document.getElementById('playersList');
    container.innerHTML = filtered.map(p => `
        <div class="tournament-card">
            <img src="${p.player?.avatar_url || '../../img/user-default.jpg'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
            <div class="tournament-info">
                <div class="tournament-name">${p.player?.nom_complet || 'Inconnu'}</div>
                <div class="tournament-date">Tournoi : ${p.tournament?.name || 'N/A'}</div>
                <div class="tournament-stats">Poste : ${p.position || 'Non défini'}</div>
            </div>
            <div class="tournament-actions">
                <button class="btn-action delete" onclick="removePlayer(${p.id})"><i class="fas fa-user-minus"></i> Retirer</button>
            </div>
        </div>
    `).join('');
}

// ===== MISE À JOUR DU FILTRE TOURNOI =====
function updateTournamentFilter() {
    const select = document.getElementById('tournamentFilter');
    select.innerHTML = '<option value="">Tous les tournois</option>' + 
        tournamentsData.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// ===== OUVRIR LA MODALE POUR AJOUTER/MODIFIER UN TOURNOI =====
function openTournamentModal(tournament = null) {
    document.getElementById('tournamentModalTitle').textContent = tournament ? 'Modifier le tournoi' : 'Ajouter un tournoi';
    if (tournament) {
        document.getElementById('tournamentId').value = tournament.id;
        document.getElementById('tournamentName').value = tournament.name;
        document.getElementById('tournamentDate').value = tournament.date.split('T')[0] || '';
        document.getElementById('tournamentStreamUrl').value = tournament.stream_url || '';
    } else {
        document.getElementById('tournamentId').value = '';
        document.getElementById('tournamentName').value = '';
        document.getElementById('tournamentDate').value = '';
        document.getElementById('tournamentStreamUrl').value = '';
    }
    document.getElementById('tournamentModal').style.display = 'block';
}

function closeTournamentModal() {
    document.getElementById('tournamentModal').style.display = 'none';
}

// ===== SAUVEGARDER UN TOURNOI =====
document.getElementById('tournamentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tournamentId').value;
    const name = document.getElementById('tournamentName').value.trim();
    const date = document.getElementById('tournamentDate').value;
    const streamUrl = document.getElementById('tournamentStreamUrl').value.trim();

    if (!name || !date) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    showLoader(true);
    try {
        if (id) {
            // Mise à jour
            const { error } = await supabaseTournamentsAdmin
                .from('tournaments')
                .update({ name, date, stream_url: streamUrl || null })
                .eq('id', id);
            if (error) throw error;
            showToast('Tournoi mis à jour', 'success');
        } else {
            // Création
            const { error } = await supabaseTournamentsAdmin
                .from('tournaments')
                .insert([{ name, date, stream_url: streamUrl || null }]);
            if (error) throw error;
            showToast('Tournoi créé', 'success');
        }
        closeTournamentModal();
        loadTournaments();
    } catch (error) {
        console.error('Erreur sauvegarde tournoi:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        showLoader(false);
    }
});

// ===== ÉDITION D'UN TOURNOI =====
function editTournament(id) {
    const tournament = tournamentsData.find(t => t.id === id);
    if (tournament) openTournamentModal(tournament);
}

// ===== SUPPRESSION D'UN TOURNOI =====
async function deleteTournament(id) {
    showLoader(true);
    try {
        const { error } = await supabaseTournamentsAdmin
            .from('tournaments')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Tournoi supprimé', 'success');
        closeConfirmModal();
        loadTournaments();
    } catch (error) {
        console.error('Erreur suppression tournoi:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmDeleteTournament(id) {
    currentAction = { type: 'deleteTournament', id };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer ce tournoi ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

// ===== GESTION DES JOUEURS =====
async function openPlayersModal(tournamentId) {
    const tournament = tournamentsData.find(t => t.id === tournamentId);
    if (!tournament) return;

    currentTournamentId = tournamentId;
    document.getElementById('playersModalTournamentName').textContent = tournament.name;

    // Charger tous les joueurs
    const players = await loadAllPlayers();

    // Charger les joueurs déjà affectés à ce tournoi
    const { data: existing } = await supabaseTournamentsAdmin
        .from('tournament_players')
        .select('player_id')
        .eq('tournament_id', tournamentId);
    const existingIds = new Set(existing?.map(e => e.player_id) || []);

    const checklist = document.getElementById('playersCheckList');
    checklist.innerHTML = players.map(p => `
        <div class="player-check-item">
            <input type="checkbox" id="player_${p.id}" value="${p.id}" ${existingIds.has(p.id) ? 'checked' : ''}>
            <label for="player_${p.id}">${p.nom_complet || 'Sans nom'}</label>
        </div>
    `).join('');

    document.getElementById('playersModal').style.display = 'block';
}

function closePlayersModal() {
    document.getElementById('playersModal').style.display = 'none';
}

async function savePlayers() {
    if (!currentTournamentId) return;
    const checkboxes = document.querySelectorAll('#playersCheckList input[type="checkbox"]');
    const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));

    showLoader(true);
    try {
        // Supprimer tous les anciens liens
        await supabaseTournamentsAdmin
            .from('tournament_players')
            .delete()
            .eq('tournament_id', currentTournamentId);

        // Ajouter les nouveaux
        if (selectedIds.length > 0) {
            const inserts = selectedIds.map(player_id => ({
                tournament_id: currentTournamentId,
                player_id,
                position: 'Non défini' // par défaut, à améliorer si besoin
            }));
            const { error } = await supabaseTournamentsAdmin
                .from('tournament_players')
                .insert(inserts);
            if (error) throw error;
        }

        showToast('Joueurs mis à jour', 'success');
        closePlayersModal();
        loadTournaments(); // pour mettre à jour le compteur
    } catch (error) {
        console.error('Erreur mise à jour joueurs:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

async function removePlayer(id) {
    if (!confirm('Retirer ce joueur du tournoi ?')) return;
    showLoader(true);
    try {
        const { error } = await supabaseTournamentsAdmin
            .from('tournament_players')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Joueur retiré', 'success');
        renderPlayersTab();
    } catch (error) {
        console.error('Erreur suppression joueur:', error);
        showToast('Erreur lors du retrait', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== FERMETURE DES MODALES =====
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

function executeAction() {
    if (!currentAction) return;
    if (currentAction.type === 'deleteTournament') {
        deleteTournament(currentAction.id);
    }
}

// ===== GESTION DES ONGLETS =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById(`tab-${tab}`).classList.add('active');
            if (tab === 'players') {
                renderPlayersTab();
            }
        });
    });
}

// ===== ÉVÉNEMENTS =====
document.getElementById('addTournamentBtn').addEventListener('click', () => openTournamentModal());
document.getElementById('refreshBtn').addEventListener('click', loadTournaments);
document.getElementById('tournamentFilter').addEventListener('change', renderPlayersTab);
document.getElementById('playerSearch').addEventListener('input', renderPlayersTab);

// ===== DÉCONNEXION =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseTournamentsAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    await loadTournaments();
    initTabs();
});

// Exposer les fonctions globales
window.openPlayersModal = openPlayersModal;
window.closePlayersModal = closePlayersModal;
window.editTournament = editTournament;
window.confirmDeleteTournament = confirmDeleteTournament;
window.closeConfirmModal = closeConfirmModal;
window.executeAction = executeAction;
window.removePlayer = removePlayer;