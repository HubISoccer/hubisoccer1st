// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseRevenueAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let walletsData = [];
let transactionsData = [];
let currentTxId = null;
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
    const { data: { session }, error } = await supabaseRevenueAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseRevenueAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseRevenueAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DES PORTEFEUILLES =====
async function loadWallets() {
    showLoader(true);
    try {
        const { data, error } = await supabaseRevenueAdmin
            .from('player_wallets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Charger les noms des joueurs
        const playerIds = [...new Set(data.map(w => w.player_id))];
        const { data: players, error: playersError } = await supabaseRevenueAdmin
            .from('player_profiles')
            .select('id, nom_complet')
            .in('id', playerIds);

        if (playersError) throw playersError;

        const playersMap = {};
        (players || []).forEach(p => playersMap[p.id] = p.nom_complet);

        walletsData = (data || []).map(w => ({
            ...w,
            player_name: playersMap[w.player_id] || 'Joueur inconnu'
        }));

        renderWallets();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement portefeuilles:', error);
        showToast('Erreur lors du chargement', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES PORTEFEUILLES =====
function renderWallets() {
    const search = document.getElementById('walletSearch')?.value.toLowerCase() || '';
    const filtered = walletsData.filter(w => 
        w.player_name.toLowerCase().includes(search)
    );

    const container = document.getElementById('walletsList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucun portefeuille trouvé.</p>';
        return;
    }

    container.innerHTML = filtered.map(w => `
        <div class="item-card">
            <div class="item-info">
                <div class="item-player">${w.player_name}</div>
                <div class="item-detail">Solde: ${w.balance} FCFA | Bonus: ${w.bonus_inscription} FCFA</div>
                <div class="item-meta">Créé le ${new Date(w.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="item-actions">
                <button class="btn-action view" onclick="viewWallet(${w.player_id})"><i class="fas fa-eye"></i> Transactions</button>
            </div>
        </div>
    `).join('');
}

// ===== CHARGEMENT DES TRANSACTIONS =====
async function loadTransactions() {
    showLoader(true);
    try {
        const { data, error } = await supabaseRevenueAdmin
            .from('player_transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const playerIds = [...new Set(data.map(t => t.player_id))];
        const { data: players, error: playersError } = await supabaseRevenueAdmin
            .from('player_profiles')
            .select('id, nom_complet')
            .in('id', playerIds);

        if (playersError) throw playersError;

        const playersMap = {};
        (players || []).forEach(p => playersMap[p.id] = p.nom_complet);

        transactionsData = (data || []).map(t => ({
            ...t,
            player_name: playersMap[t.player_id] || 'Joueur inconnu'
        }));

        renderTransactions();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement transactions:', error);
        showToast('Erreur lors du chargement', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES TRANSACTIONS =====
function renderTransactions() {
    const search = document.getElementById('txSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('txStatusFilter')?.value || '';
    const typeFilter = document.getElementById('txTypeFilter')?.value || '';

    const filtered = transactionsData.filter(t => {
        const matchesSearch = t.player_name.toLowerCase().includes(search) || 
                             (t.description || '').toLowerCase().includes(search);
        const matchesStatus = !statusFilter || t.status === statusFilter;
        const matchesType = !typeFilter || t.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const container = document.getElementById('transactionsList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucune transaction trouvée.</p>';
        return;
    }

    container.innerHTML = filtered.map(t => {
        const amountClass = (t.type === 'deposit' || t.type === 'bonus') ? 'positive' : 'negative';
        const sign = (t.type === 'deposit' || t.type === 'bonus') ? '+' : '-';
        const statusLabel = {
            pending: 'En attente',
            completed: 'Validé',
            failed: 'Échoué'
        }[t.status] || t.status;

        return `
            <div class="item-card">
                <div class="item-info">
                    <div class="item-player">${t.player_name}</div>
                    <div class="item-detail">${t.description || t.type}</div>
                    <div class="item-meta">${new Date(t.created_at).toLocaleString('fr-FR')}</div>
                </div>
                <div class="item-amount ${amountClass}">${sign}${t.amount} FCFA</div>
                <div class="item-status ${t.status}">${statusLabel}</div>
                <div class="item-actions">
                    <button class="btn-action view" onclick="viewTransaction(${t.id})"><i class="fas fa-eye"></i> Voir</button>
                    ${t.status === 'pending' ? `
                        <button class="btn-action approve" onclick="confirmApproveTx(${t.id})"><i class="fas fa-check"></i> Approuver</button>
                        <button class="btn-action reject" onclick="confirmRejectTx(${t.id})"><i class="fas fa-times"></i> Rejeter</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===== STATISTIQUES =====
function updateStats() {
    document.getElementById('totalPlayers').textContent = walletsData.length;
    const totalFunds = walletsData.reduce((sum, w) => sum + (w.balance || 0), 0);
    document.getElementById('totalFunds').textContent = totalFunds.toLocaleString() + ' FCFA';
    const pending = transactionsData.filter(t => t.status === 'pending').length;
    document.getElementById('pendingTx').textContent = pending;
}

// ===== VOIR UN PORTEFEUILLE (redirige vers l'onglet transactions filtré) =====
function viewWallet(playerId) {
    // Activer l'onglet transactions
    document.querySelector('.tab-btn[data-tab="transactions"]').click();
    // Filtrer par joueur (recherche par nom)
    const player = walletsData.find(w => w.player_id === playerId);
    if (player) {
        document.getElementById('txSearch').value = player.player_name;
        renderTransactions();
    }
}

// ===== VOIR UNE TRANSACTION (MODALE) =====
function viewTransaction(txId) {
    const tx = transactionsData.find(t => t.id === txId);
    if (!tx) return;

    currentTxId = txId;
    const modalBody = document.getElementById('txModalBody');
    const statusLabel = {
        pending: 'En attente',
        completed: 'Validé',
        failed: 'Échoué'
    }[tx.status] || tx.status;

    modalBody.innerHTML = `
        <div class="detail-row"><span class="detail-label">Joueur :</span> <span class="detail-value">${tx.player_name}</span></div>
        <div class="detail-row"><span class="detail-label">Type :</span> <span class="detail-value">${tx.type}</span></div>
        <div class="detail-row"><span class="detail-label">Montant :</span> <span class="detail-value">${tx.amount} FCFA</span></div>
        <div class="detail-row"><span class="detail-label">Statut :</span> <span class="detail-value" style="color: ${tx.status === 'completed' ? 'var(--success)' : tx.status === 'failed' ? 'var(--danger)' : 'var(--warning)'};">${statusLabel}</span></div>
        <div class="detail-row"><span class="detail-label">Description :</span> <span class="detail-value">${tx.description || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Référence :</span> <span class="detail-value">${tx.reference || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Date :</span> <span class="detail-value">${new Date(tx.created_at).toLocaleString('fr-FR')}</span></div>
    `;

    document.getElementById('modalApproveBtn').onclick = () => updateTxStatus(txId, 'completed');
    document.getElementById('modalRejectBtn').onclick = () => updateTxStatus(txId, 'failed');
    document.getElementById('txModal').style.display = 'block';
}

function closeTxModal() {
    document.getElementById('txModal').style.display = 'none';
    currentTxId = null;
}

// ===== VALIDER/REJETER UNE TRANSACTION =====
async function updateTxStatus(txId, newStatus) {
    const tx = transactionsData.find(t => t.id === txId);
    if (!tx) return;

    const actionText = newStatus === 'completed' ? 'approuver' : 'rejeter';
    if (!confirm(`Êtes-vous sûr de vouloir ${actionText} cette transaction ?`)) return;

    showLoader(true);
    try {
        // Mise à jour du statut de la transaction
        const { error: txError } = await supabaseRevenueAdmin
            .from('player_transactions')
            .update({ status: newStatus })
            .eq('id', txId);

        if (txError) throw txError;

        // Si approuvé et que c'est un retrait, diminuer le solde
        if (newStatus === 'completed' && tx.type === 'withdraw') {
            const { data: wallet, error: walletError } = await supabaseRevenueAdmin
                .from('player_wallets')
                .select('balance')
                .eq('player_id', tx.player_id)
                .single();

            if (walletError) throw walletError;

            const newBalance = wallet.balance - tx.amount;
            const { error: updateError } = await supabaseRevenueAdmin
                .from('player_wallets')
                .update({ balance: newBalance })
                .eq('player_id', tx.player_id);

            if (updateError) throw updateError;
        }

        // Si approuvé et que c'est un dépôt, augmenter le solde
        if (newStatus === 'completed' && tx.type === 'deposit') {
            const { data: wallet, error: walletError } = await supabaseRevenueAdmin
                .from('player_wallets')
                .select('balance')
                .eq('player_id', tx.player_id)
                .single();

            if (walletError) throw walletError;

            const newBalance = wallet.balance + tx.amount;
            const { error: updateError } = await supabaseRevenueAdmin
                .from('player_wallets')
                .update({ balance: newBalance })
                .eq('player_id', tx.player_id);

            if (updateError) throw updateError;
        }

        showToast(`Transaction ${actionText}e avec succès`, 'success');
        closeTxModal();
        closeConfirmModal();
        // Recharger les données
        await loadWallets();
        await loadTransactions();
    } catch (error) {
        console.error('Erreur mise à jour transaction:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmApproveTx(id) {
    currentAction = { type: 'approve', id };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Approuver cette transaction ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

function confirmRejectTx(id) {
    currentAction = { type: 'reject', id };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Rejeter cette transaction ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

function executeAction() {
    if (!currentAction) return;
    if (currentAction.type === 'approve') {
        updateTxStatus(currentAction.id, 'completed');
    } else if (currentAction.type === 'reject') {
        updateTxStatus(currentAction.id, 'failed');
    }
}

// ===== FERMETURE DES MODALES =====
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
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
document.getElementById('walletSearch')?.addEventListener('input', renderWallets);
document.getElementById('txSearch')?.addEventListener('input', renderTransactions);
document.getElementById('txStatusFilter')?.addEventListener('change', renderTransactions);
document.getElementById('txTypeFilter')?.addEventListener('change', renderTransactions);

// ===== RAFRAÎCHIR =====
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadWallets();
    loadTransactions();
});

// ===== DÉCONNEXION =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseRevenueAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    await loadWallets();
    await loadTransactions();
    initTabs();
});

// Exposer les fonctions globales
window.viewWallet = viewWallet;
window.viewTransaction = viewTransaction;
window.confirmApproveTx = confirmApproveTx;
window.confirmRejectTx = confirmRejectTx;
window.closeTxModal = closeTxModal;
window.closeConfirmModal = closeConfirmModal;
window.executeAction = executeAction;