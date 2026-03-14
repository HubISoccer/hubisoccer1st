// ===== CONFIGURATION SUPABASE (nom unique) =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseTransfersAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let allPlayers = [];
let transfersData = [];
let offersData = [];
let currentTransferId = null;
let currentOfferId = null;
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
    const { data: { session }, error } = await supabaseTransfersAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseTransfersAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseTransfersAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DE LA LISTE DES JOUEURS =====
async function loadPlayers() {
    const { data, error } = await supabaseTransfersAdmin
        .from('player_profiles')
        .select('id, nom_complet')
        .order('nom_complet');
    if (error) {
        console.error('Erreur chargement joueurs:', error);
        return [];
    }
    return data || [];
}

// ===== CHARGEMENT DES TRANSFERTS (sans relation imbriquée) =====
async function loadTransfers() {
    showLoader(true);
    try {
        const { data, error } = await supabaseTransfersAdmin
            .from('player_transfers')
            .select('*')
            .order('transfer_date', { ascending: false });

        if (error) throw error;

        // Charger les noms des joueurs séparément
        const playerIds = [...new Set(data.map(t => t.player_id))];
        const { data: players, error: playersError } = await supabaseTransfersAdmin
            .from('player_profiles')
            .select('id, nom_complet')
            .in('id', playerIds);

        if (playersError) throw playersError;

        const playersMap = {};
        (players || []).forEach(p => playersMap[p.id] = p.nom_complet);

        transfersData = (data || []).map(t => ({
            ...t,
            player_name: playersMap[t.player_id] || 'Joueur inconnu'
        }));

        renderTransfers();
    } catch (error) {
        console.error('Erreur chargement transferts:', error);
        showToast('Erreur lors du chargement des transferts', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES TRANSFERTS =====
function renderTransfers() {
    const search = document.getElementById('transferSearch')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('transferTypeFilter')?.value || '';

    const filtered = transfersData.filter(t => {
        const playerName = t.player_name?.toLowerCase() || '';
        const matchesSearch = playerName.includes(search) || t.from_club?.toLowerCase().includes(search) || t.to_club?.toLowerCase().includes(search);
        const matchesType = !typeFilter || t.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const container = document.getElementById('transfersList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucun transfert trouvé.</p>';
        return;
    }

    container.innerHTML = filtered.map(t => {
        const typeLabel = {
            transfer: 'Transfert',
            loan: 'Prêt',
            end: 'Fin de contrat'
        }[t.type] || 'Transfert';

        return `
            <div class="item-card">
                <div class="item-info">
                    <div class="item-player">${t.player_name}</div>
                    <div class="item-detail">${t.from_club} → ${t.to_club}</div>
                    <div class="item-meta">${new Date(t.transfer_date).toLocaleDateString('fr-FR')} · ${typeLabel} · ${t.fee.toLocaleString()} ${t.currency}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-action edit" onclick="editTransfer(${t.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="btn-action delete" onclick="confirmDeleteTransfer(${t.id})"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== CHARGEMENT DES OFFRES (sans relation imbriquée) =====
async function loadOffers() {
    showLoader(true);
    try {
        const { data, error } = await supabaseTransfersAdmin
            .from('player_offers')
            .select('*')
            .order('offer_date', { ascending: false });

        if (error) throw error;

        const playerIds = [...new Set(data.map(o => o.player_id))];
        const { data: players, error: playersError } = await supabaseTransfersAdmin
            .from('player_profiles')
            .select('id, nom_complet')
            .in('id', playerIds);

        if (playersError) throw playersError;

        const playersMap = {};
        (players || []).forEach(p => playersMap[p.id] = p.nom_complet);

        offersData = (data || []).map(o => ({
            ...o,
            player_name: playersMap[o.player_id] || 'Joueur inconnu'
        }));

        renderOffers();
    } catch (error) {
        console.error('Erreur chargement offres:', error);
        showToast('Erreur lors du chargement des offres', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES OFFRES =====
function renderOffers() {
    const search = document.getElementById('offerSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('offerStatusFilter')?.value || '';

    const filtered = offersData.filter(o => {
        const playerName = o.player_name?.toLowerCase() || '';
        const matchesSearch = playerName.includes(search) || o.from_club?.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || o.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const container = document.getElementById('offersList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucune offre trouvée.</p>';
        return;
    }

    container.innerHTML = filtered.map(o => {
        const statusLabel = {
            pending: 'En attente',
            accepted: 'Acceptée',
            rejected: 'Rejetée'
        }[o.status] || 'Inconnu';

        return `
            <div class="item-card">
                <div class="item-info">
                    <div class="item-player">${o.player_name}</div>
                    <div class="item-detail">${o.from_club}</div>
                    <div class="item-meta">${new Date(o.offer_date).toLocaleDateString('fr-FR')} · ${o.amount.toLocaleString()} FCFA</div>
                </div>
                <div class="item-status ${o.status}">${statusLabel}</div>
                <div class="item-actions">
                    <button class="btn-action edit" onclick="editOffer(${o.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="btn-action delete" onclick="confirmDeleteOffer(${o.id})"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== GESTION DES TRANSFERTS =====
async function openTransferModal(transfer = null) {
    if (allPlayers.length === 0) allPlayers = await loadPlayers();
    const select = document.getElementById('transferPlayerId');
    select.innerHTML = '<option value="">Sélectionner un joueur</option>' + 
        allPlayers.map(p => `<option value="${p.id}">${p.nom_complet}</option>`).join('');

    document.getElementById('transferModalTitle').textContent = transfer ? 'Modifier un transfert' : 'Ajouter un transfert';
    if (transfer) {
        document.getElementById('transferId').value = transfer.id;
        document.getElementById('transferPlayerId').value = transfer.player_id;
        document.getElementById('transferFromClub').value = transfer.from_club;
        document.getElementById('transferToClub').value = transfer.to_club;
        document.getElementById('transferDate').value = transfer.transfer_date.split('T')[0];
        document.getElementById('transferType').value = transfer.type;
        document.getElementById('transferFee').value = transfer.fee;
        document.getElementById('transferCurrency').value = transfer.currency || 'FCFA';
    } else {
        document.getElementById('transferId').value = '';
        document.getElementById('transferPlayerId').value = '';
        document.getElementById('transferFromClub').value = '';
        document.getElementById('transferToClub').value = '';
        document.getElementById('transferDate').value = '';
        document.getElementById('transferType').value = 'transfer';
        document.getElementById('transferFee').value = '0';
        document.getElementById('transferCurrency').value = 'FCFA';
    }
    document.getElementById('transferModal').style.display = 'block';
}

function closeTransferModal() {
    document.getElementById('transferModal').style.display = 'none';
}

document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('transferId').value;
    const player_id = parseInt(document.getElementById('transferPlayerId').value);
    const from_club = document.getElementById('transferFromClub').value.trim();
    const to_club = document.getElementById('transferToClub').value.trim();
    const transfer_date = document.getElementById('transferDate').value;
    const type = document.getElementById('transferType').value;
    const fee = parseInt(document.getElementById('transferFee').value) || 0;
    const currency = document.getElementById('transferCurrency').value.trim() || 'FCFA';

    if (!player_id || !from_club || !to_club || !transfer_date) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    showLoader(true);
    try {
        if (id) {
            const { error } = await supabaseTransfersAdmin
                .from('player_transfers')
                .update({ player_id, from_club, to_club, transfer_date, type, fee, currency })
                .eq('id', id);
            if (error) throw error;
            showToast('Transfert mis à jour', 'success');
        } else {
            const { error } = await supabaseTransfersAdmin
                .from('player_transfers')
                .insert([{ player_id, from_club, to_club, transfer_date, type, fee, currency }]);
            if (error) throw error;
            showToast('Transfert ajouté', 'success');
        }
        closeTransferModal();
        loadTransfers();
    } catch (error) {
        console.error('Erreur sauvegarde transfert:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        showLoader(false);
    }
});

function editTransfer(id) {
    const transfer = transfersData.find(t => t.id === id);
    if (transfer) openTransferModal(transfer);
}

async function deleteTransfer(id) {
    showLoader(true);
    try {
        const { error } = await supabaseTransfersAdmin
            .from('player_transfers')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Transfert supprimé', 'success');
        closeConfirmModal();
        loadTransfers();
    } catch (error) {
        console.error('Erreur suppression transfert:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmDeleteTransfer(id) {
    currentAction = { type: 'deleteTransfer', id };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer ce transfert ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

// ===== GESTION DES OFFRES =====
async function openOfferModal(offer = null) {
    if (allPlayers.length === 0) allPlayers = await loadPlayers();
    const select = document.getElementById('offerPlayerId');
    select.innerHTML = '<option value="">Sélectionner un joueur</option>' + 
        allPlayers.map(p => `<option value="${p.id}">${p.nom_complet}</option>`).join('');

    document.getElementById('offerModalTitle').textContent = offer ? 'Modifier une offre' : 'Ajouter une offre';
    if (offer) {
        document.getElementById('offerId').value = offer.id;
        document.getElementById('offerPlayerId').value = offer.player_id;
        document.getElementById('offerFromClub').value = offer.from_club;
        document.getElementById('offerDate').value = offer.offer_date.split('T')[0];
        document.getElementById('offerAmount').value = offer.amount;
        document.getElementById('offerStatus').value = offer.status;
    } else {
        document.getElementById('offerId').value = '';
        document.getElementById('offerPlayerId').value = '';
        document.getElementById('offerFromClub').value = '';
        document.getElementById('offerDate').value = '';
        document.getElementById('offerAmount').value = '';
        document.getElementById('offerStatus').value = 'pending';
    }
    document.getElementById('offerModal').style.display = 'block';
}

function closeOfferModal() {
    document.getElementById('offerModal').style.display = 'none';
}

document.getElementById('offerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('offerId').value;
    const player_id = parseInt(document.getElementById('offerPlayerId').value);
    const from_club = document.getElementById('offerFromClub').value.trim();
    const offer_date = document.getElementById('offerDate').value;
    const amount = parseInt(document.getElementById('offerAmount').value);
    const status = document.getElementById('offerStatus').value;

    if (!player_id || !from_club || !offer_date || !amount) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    showLoader(true);
    try {
        if (id) {
            const { error } = await supabaseTransfersAdmin
                .from('player_offers')
                .update({ player_id, from_club, offer_date, amount, status })
                .eq('id', id);
            if (error) throw error;
            showToast('Offre mise à jour', 'success');
        } else {
            const { error } = await supabaseTransfersAdmin
                .from('player_offers')
                .insert([{ player_id, from_club, offer_date, amount, status }]);
            if (error) throw error;
            showToast('Offre ajoutée', 'success');
        }
        closeOfferModal();
        loadOffers();
    } catch (error) {
        console.error('Erreur sauvegarde offre:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        showLoader(false);
    }
});

function editOffer(id) {
    const offer = offersData.find(o => o.id === id);
    if (offer) openOfferModal(offer);
}

async function deleteOffer(id) {
    showLoader(true);
    try {
        const { error } = await supabaseTransfersAdmin
            .from('player_offers')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Offre supprimée', 'success');
        closeConfirmModal();
        loadOffers();
    } catch (error) {
        console.error('Erreur suppression offre:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmDeleteOffer(id) {
    currentAction = { type: 'deleteOffer', id };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer cette offre ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

// ===== FERMETURE DES MODALES =====
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

function executeAction() {
    if (!currentAction) return;
    if (currentAction.type === 'deleteTransfer') {
        deleteTransfer(currentAction.id);
    } else if (currentAction.type === 'deleteOffer') {
        deleteOffer(currentAction.id);
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
        });
    });
}

// ===== FILTRES =====
document.getElementById('transferSearch')?.addEventListener('input', renderTransfers);
document.getElementById('transferTypeFilter')?.addEventListener('change', renderTransfers);
document.getElementById('offerSearch')?.addEventListener('input', renderOffers);
document.getElementById('offerStatusFilter')?.addEventListener('change', renderOffers);

// ===== RAFRAÎCHIR =====
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadTransfers();
    loadOffers();
});

// ===== BOUTONS D'AJOUT =====
document.getElementById('addTransferBtn').addEventListener('click', () => openTransferModal());
document.getElementById('addOfferBtn').addEventListener('click', () => openOfferModal());

// ===== DÉCONNEXION =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseTransfersAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    allPlayers = await loadPlayers();
    await loadTransfers();
    await loadOffers();
    initTabs();
});

// Exposer les fonctions globales
window.editTransfer = editTransfer;
window.confirmDeleteTransfer = confirmDeleteTransfer;
window.editOffer = editOffer;
window.confirmDeleteOffer = confirmDeleteOffer;
window.closeConfirmModal = closeConfirmModal;
window.executeAction = executeAction;
window.closeTransferModal = closeTransferModal;
window.closeOfferModal = closeOfferModal;
