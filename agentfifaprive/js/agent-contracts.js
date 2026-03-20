// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAgentPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentAgent = null;
let contracts = [];
let clients = [];
let commissionsChart = null;

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
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
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseAgentPrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL AGENT =====
async function loadAgentProfile() {
    try {
        const { data, error } = await supabaseAgentPrive
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        currentAgent = data;
        document.getElementById('userName').textContent = data.full_name || 'Agent';
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentAgent;
    } catch (err) {
        console.error('❌ Exception loadAgentProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DES CLIENTS (pour le sélecteur) =====
async function loadClientsForSelect() {
    const { data, error } = await supabaseAgentPrive
        .from('agent_clients')
        .select(`
            id,
            player_id,
            player:player_id (id, full_name)
        `)
        .eq('agent_id', currentAgent.id);

    if (error) {
        console.error('Erreur chargement clients:', error);
        return [];
    }
    clients = data || [];
    return clients;
}

// ===== CHARGEMENT DES CONTRATS =====
async function loadContracts() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAgentPrive
            .from('agent_contracts')
            .select('*')
            .eq('agent_id', currentAgent.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        contracts = data || [];
        applyFiltersAndRender();
        updateChart();
    } catch (err) {
        console.error('Erreur chargement contrats:', err);
        showToast('Erreur lors du chargement des contrats', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== FILTRES =====
let currentStatusFilter = 'all';
let currentSearchTerm = '';

function applyFiltersAndRender() {
    let filtered = [...contracts];

    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === currentStatusFilter);
    }

    if (currentSearchTerm.trim()) {
        const term = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(c =>
            c.player_name?.toLowerCase().includes(term)
        );
    }

    renderContracts(filtered);
}

function renderContracts(contractsToRender) {
    const container = document.getElementById('contractsList');
    if (!container) return;

    if (contractsToRender.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun contrat trouvé.</p>';
        return;
    }

    container.innerHTML = contractsToRender.map(contract => {
        const statusClass = contract.status || 'active';
        const statusLabel = {
            active: 'Actif',
            expired: 'Expiré',
            terminated: 'Résilié',
            renewal: 'Renouvellement'
        }[statusClass] || 'Actif';

        const startDate = contract.start_date ? new Date(contract.start_date).toLocaleDateString('fr-FR') : '-';
        const endDate = contract.end_date ? new Date(contract.end_date).toLocaleDateString('fr-FR') : 'Non défini';
        const commissionDisplay = contract.commission
            ? `${contract.commission.toLocaleString()} ${contract.commission_type === 'percentage' ? '%' : 'FCFA'}`
            : 'Non défini';

        const contractTypeLabel = {
            representation: 'Représentation',
            sponsoring: 'Sponsoring',
            transfer: 'Transfert'
        }[contract.contract_type] || 'Représentation';

        return `
            <div class="contract-card" data-contract-id="${contract.id}">
                <div class="contract-header">
                    <div class="contract-player">${contract.player_name || 'Joueur'}</div>
                    <div class="contract-status ${statusClass}">${statusLabel}</div>
                </div>
                <div class="contract-dates">
                    <span><i class="fas fa-calendar-alt"></i> Du ${startDate}</span>
                    <span><i class="fas fa-calendar-check"></i> Au ${endDate}</span>
                </div>
                <div class="contract-commission">
                    <i class="fas fa-money-bill-wave"></i> Commission : ${commissionDisplay}
                </div>
                <div class="contract-details-preview">
                    <i class="fas fa-tag"></i> ${contractTypeLabel}
                </div>
                <div class="contract-actions">
                    <button class="contract-action-btn" onclick="editContract(${contract.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="contract-action-btn" onclick="showPayments(${contract.id})"><i class="fas fa-history"></i> Paiements</button>
                    <button class="contract-action-btn" onclick="toggleDetails(${contract.id})"><i class="fas fa-info-circle"></i> Détails</button>
                    <button class="contract-action-btn delete" onclick="deleteContract(${contract.id})"><i class="fas fa-trash-alt"></i> Supprimer</button>
                </div>
                <div class="contract-details" id="details-${contract.id}">
                    <strong>Détails supplémentaires :</strong><br>
                    ${contract.details ? contract.details.replace(/\n/g, '<br>') : 'Aucune information supplémentaire.'}
                </div>
            </div>
        `;
    }).join('');
}

function toggleDetails(contractId) {
    const detailsDiv = document.getElementById(`details-${contractId}`);
    if (detailsDiv) {
        detailsDiv.classList.toggle('show');
    }
}

// ===== CHARGEMENT DES PAIEMENTS =====
let currentPaymentsContractId = null;

async function showPayments(contractId) {
    currentPaymentsContractId = contractId;
    await loadPayments(contractId);
    document.getElementById('paymentsModal').style.display = 'block';
}

async function loadPayments(contractId) {
    const { data, error } = await supabaseAgentPrive
        .from('agent_commission_payments')
        .select('*')
        .eq('contract_id', contractId)
        .order('payment_date', { ascending: false });

    if (error) {
        console.error(error);
        showToast('Erreur chargement paiements', 'error');
        return;
    }

    const container = document.getElementById('paymentsList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun paiement enregistré.</p>';
    } else {
        container.innerHTML = data.map(p => `
            <div class="payment-item">
                <div class="payment-amount">${p.amount.toLocaleString()} FCFA</div>
                <div class="payment-date">${new Date(p.payment_date).toLocaleDateString('fr-FR')}</div>
                <div class="payment-desc">${p.description || ''}</div>
            </div>
        `).join('');
    }
}

// ===== GRAPHIQUE =====
function updateChart() {
    const ctx = document.getElementById('commissionsChart').getContext('2d');
    if (commissionsChart) commissionsChart.destroy();

    // Grouper par mois
    const monthly = {};
    contracts.forEach(c => {
        if (c.created_at) {
            const date = new Date(c.created_at);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            monthly[key] = (monthly[key] || 0) + (c.commission || 0);
        }
    });

    const sortedKeys = Object.keys(monthly).sort();
    const labels = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return `${m}/${y}`;
    });
    const data = sortedKeys.map(k => monthly[k]);

    commissionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Commissions (FCFA)',
                data: data,
                borderColor: '#551B8C',
                backgroundColor: 'rgba(85,27,140,0.1)',
                tension: 0.4,
                pointBackgroundColor: '#FFCC00'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ===== CRÉATION / MODIFICATION DE CONTRAT =====
async function openAddContractModal(contract = null) {
    const modal = document.getElementById('contractModal');
    const title = document.getElementById('contractModalTitle');
    const form = document.getElementById('contractForm');

    // Réinitialiser le formulaire
    form.reset();
    document.getElementById('contractId').value = '';

    // Charger la liste des joueurs (clients)
    const playerSelect = document.getElementById('contractPlayerId');
    const clientsList = await loadClientsForSelect();
    playerSelect.innerHTML = '<option value="">Sélectionner un joueur</option>';
    clientsList.forEach(client => {
        const player = client.player || {};
        playerSelect.innerHTML += `<option value="${client.player_id}">${player.full_name || 'Joueur inconnu'}</option>`;
    });

    if (contract) {
        title.innerText = 'Modifier le contrat';
        document.getElementById('contractId').value = contract.id;
        document.getElementById('contractPlayerId').value = contract.player_id;
        document.getElementById('contractStartDate').value = contract.start_date;
        document.getElementById('contractEndDate').value = contract.end_date || '';
        document.getElementById('contractCommission').value = contract.commission || '';
        document.getElementById('contractCommissionType').value = contract.commission_type || 'fixed';
        document.getElementById('contractType').value = contract.contract_type || 'representation';
        document.getElementById('contractStatus').value = contract.status || 'active';
        document.getElementById('contractDetails').value = contract.details || '';
    } else {
        title.innerText = 'Nouveau contrat';
    }

    modal.style.display = 'block';
}

function closeContractModal() {
    document.getElementById('contractModal').style.display = 'none';
}

async function saveContract(e) {
    e.preventDefault();

    const contractId = document.getElementById('contractId').value;
    const playerId = document.getElementById('contractPlayerId').value;
    const playerName = document.getElementById('contractPlayerId').selectedOptions[0]?.text || null;
    const startDate = document.getElementById('contractStartDate').value;
    const endDate = document.getElementById('contractEndDate').value || null;
    const commission = parseFloat(document.getElementById('contractCommission').value);
    const commissionType = document.getElementById('contractCommissionType').value;
    const contractType = document.getElementById('contractType').value;
    const status = document.getElementById('contractStatus').value;
    const details = document.getElementById('contractDetails').value.trim() || null;

    if (!playerId || !startDate) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    const contractData = {
        agent_id: currentAgent.id,
        player_id: playerId,
        player_name: playerName,
        start_date: startDate,
        end_date: endDate,
        commission: isNaN(commission) ? null : commission,
        commission_type: commissionType,
        contract_type: contractType,
        status: status,
        details: details
    };

    showLoader(true);
    try {
        if (contractId) {
            // Mise à jour
            const { error } = await supabaseAgentPrive
                .from('agent_contracts')
                .update(contractData)
                .eq('id', contractId);
            if (error) throw error;
            showToast('Contrat modifié avec succès', 'success');
        } else {
            // Création
            const { error } = await supabaseAgentPrive
                .from('agent_contracts')
                .insert([contractData]);
            if (error) throw error;
            showToast('Contrat créé avec succès', 'success');
        }
        closeContractModal();
        await loadContracts();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        showLoader(false);
    }
}

window.editContract = async (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
        await openAddContractModal(contract);
    }
};

async function deleteContract(contractId) {
    if (!confirm('Supprimer définitivement ce contrat ? Cette action supprimera aussi l’historique des paiements.')) return;

    showLoader(true);
    try {
        const { error } = await supabaseAgentPrive
            .from('agent_contracts')
            .delete()
            .eq('id', contractId);
        if (error) throw error;
        showToast('Contrat supprimé', 'success');
        await loadContracts();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== GESTION DES PAIEMENTS =====
function openAddPaymentModal() {
    if (!currentPaymentsContractId) return;
    document.getElementById('paymentContractId').value = currentPaymentsContractId;
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDescription').value = '';
    document.getElementById('addPaymentModal').style.display = 'block';
}

function closeAddPaymentModal() {
    document.getElementById('addPaymentModal').style.display = 'none';
}

function closePaymentsModal() {
    document.getElementById('paymentsModal').style.display = 'none';
}

async function savePayment(e) {
    e.preventDefault();

    const contractId = document.getElementById('paymentContractId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentDate = document.getElementById('paymentDate').value;
    const description = document.getElementById('paymentDescription').value.trim() || null;

    if (!contractId || !amount || !paymentDate) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    showLoader(true);
    try {
        const { error } = await supabaseAgentPrive
            .from('agent_commission_payments')
            .insert([{
                contract_id: contractId,
                amount: amount,
                payment_date: paymentDate,
                description: description
            }]);
        if (error) throw error;

        showToast('Paiement ajouté', 'success');
        closeAddPaymentModal();
        await loadPayments(contractId);
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'ajout', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== FILTRES =====
function initFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchContract');

    statusFilter.addEventListener('change', () => {
        currentStatusFilter = statusFilter.value;
        applyFiltersAndRender();
    });

    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        applyFiltersAndRender();
    });
}

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!userMenu || !dropdown) return;
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
}

function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    let touchStartX = 0, touchStartY = 0, touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0 && sidebar.classList.contains('active')) closeSidebarFunc();
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseAgentPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page contrats (agent)');

    const user = await checkSession();
    if (!user) return;

    await loadAgentProfile();
    if (!currentAgent) return;

    await loadContracts();
    initFilters();

    document.getElementById('openAddContractModal').addEventListener('click', () => openAddContractModal());
    document.getElementById('contractForm').addEventListener('submit', saveContract);
    document.getElementById('paymentForm').addEventListener('submit', savePayment);
    document.getElementById('openAddPaymentModal').addEventListener('click', openAddPaymentModal);

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang = e.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});

// Exposer les fonctions globales
window.openAddContractModal = openAddContractModal;
window.closeContractModal = closeContractModal;
window.editContract = editContract;
window.deleteContract = deleteContract;
window.showPayments = showPayments;
window.closePaymentsModal = closePaymentsModal;
window.closeAddPaymentModal = closeAddPaymentModal;
window.savePayment = savePayment;
window.toggleDetails = toggleDetails;
