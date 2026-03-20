// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
let payments = [];
let withdrawalRequests = [];
let monthlyChart = null;

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
        const { data: { session }, error } = await supabaseCoachPrive.auth.getSession();
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

// ===== CHARGEMENT DU PROFIL COACH =====
async function loadCoachProfile() {
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        currentCoach = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentCoach;
    } catch (err) {
        console.error('❌ Exception loadCoachProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DES PAIEMENTS =====
async function loadPayments() {
    showLoader(true);
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_payments')
            .select('*')
            .eq('coach_id', currentCoach.id)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        payments = data || [];
        calculateStats();
        renderPaymentsTable();
        updateMonthlyChart();
    } catch (err) {
        console.error('Erreur chargement paiements:', err);
        showToast('Erreur lors du chargement des paiements', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== CHARGEMENT DES DEMANDES DE RETRAIT =====
async function loadWithdrawalRequests() {
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_withdrawal_requests')
            .select('*')
            .eq('coach_id', currentCoach.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        withdrawalRequests = data || [];
        renderWithdrawals();
    } catch (err) {
        console.error('Erreur chargement retraits:', err);
        showToast('Erreur lors du chargement des retraits', 'error');
    }
}

// ===== CALCUL DES STATISTIQUES =====
function calculateStats() {
    const totalHonoraires = payments.reduce((sum, p) => sum + p.amount, 0);
    const receivedHonoraires = totalHonoraires; // tous sont perçus
    const totalWithdrawn = withdrawalRequests
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0);
    const pendingHonoraires = receivedHonoraires - totalWithdrawn;

    document.getElementById('totalHonoraires').textContent = totalHonoraires.toLocaleString() + ' FCFA';
    document.getElementById('receivedHonoraires').textContent = receivedHonoraires.toLocaleString() + ' FCFA';
    document.getElementById('pendingHonoraires').textContent = pendingHonoraires.toLocaleString() + ' FCFA';
    document.getElementById('totalWithdrawn').textContent = totalWithdrawn.toLocaleString() + ' FCFA';
    document.getElementById('availableBalance').textContent = pendingHonoraires.toLocaleString() + ' FCFA';
    return { pendingHonoraires };
}

// ===== RENDU DU TABLEAU DES PAIEMENTS =====
function renderPaymentsTable() {
    const filter = document.getElementById('paymentFilter')?.value || 'all';
    const filtered = payments.filter(p => filter === 'all' || p.source_type === filter);
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Aucun paiement enregistré.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const typeLabel = {
            session: 'Session d\'entraînement',
            player: 'Par joueur',
            club: 'Par club'
        }[p.source_type] || p.source_type;
        return `
            <tr>
                <td>${new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                <td>${typeLabel}</td>
                <td>${p.source_id || '-'}</td>
                <td>${p.amount.toLocaleString()} FCFA</td>
                <td>${p.description || '-'}</td>
            </tr>
        `;
    }).join('');
}

// ===== GRAPHIQUE MENSUEL =====
function updateMonthlyChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();

    const monthly = {};
    payments.forEach(p => {
        const date = new Date(p.payment_date);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        monthly[key] = (monthly[key] || 0) + p.amount;
    });

    const sortedKeys = Object.keys(monthly).sort();
    const labels = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return `${m}/${y}`;
    });
    const data = sortedKeys.map(k => monthly[k]);

    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Honoraires (FCFA)',
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
            scales: { y: { beginAtZero: true, ticks: { callback: value => value.toLocaleString() } } }
        }
    });
}

// ===== RENDU DES DEMANDES DE RETRAIT =====
function renderWithdrawals() {
    const container = document.getElementById('withdrawalsList');
    if (!container) return;

    if (withdrawalRequests.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune demande de retrait.</p>';
        return;
    }

    container.innerHTML = withdrawalRequests.map(w => {
        const statusLabel = {
            pending: 'En attente',
            approved: 'Approuvé',
            rejected: 'Rejeté'
        }[w.status] || 'En attente';
        const rejectionHtml = w.status === 'rejected' && w.rejection_reason
            ? `<div class="withdrawal-reason">Motif : ${w.rejection_reason}</div>`
            : '';
        return `
            <div class="withdrawal-item ${w.status}">
                <div class="withdrawal-amount">${w.amount.toLocaleString()} FCFA</div>
                <div class="withdrawal-status ${w.status}">${statusLabel}</div>
                <div class="withdrawal-date">${new Date(w.created_at).toLocaleDateString('fr-FR')}</div>
                ${rejectionHtml}
            </div>
        `;
    }).join('');
}

// ===== DEMANDE DE RETRAIT =====
async function submitWithdrawal(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const recipient = document.getElementById('withdrawRecipient').value.trim();

    if (!amount || amount < 1000) {
        showToast('Le montant minimum est de 1 000 FCFA', 'warning');
        return;
    }
    if (!recipient) {
        showToast('Veuillez renseigner le numéro/IBAN', 'warning');
        return;
    }

    const stats = calculateStats();
    if (amount > stats.pendingHonoraires) {
        showToast('Solde insuffisant', 'warning');
        return;
    }

    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_withdrawal_requests')
            .insert([{
                coach_id: currentCoach.id,
                amount: amount,
                method: method,
                recipient: recipient,
                status: 'pending'
            }]);

        if (error) throw error;

        showToast('Demande de retrait envoyée avec succès', 'success');
        closeWithdrawModal();
        await loadWithdrawalRequests();
        calculateStats(); // Met à jour le solde affiché
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la demande', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== MODALES =====
function openWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'block';
}
function closeWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'none';
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
            await supabaseCoachPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page revenus (coach)');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
    if (!currentCoach) return;

    await loadPayments();
    await loadWithdrawalRequests();

    document.getElementById('paymentFilter').addEventListener('change', () => renderPaymentsTable());
    document.getElementById('withdrawForm').addEventListener('submit', submitWithdrawal);
    document.getElementById('openWithdrawModal').addEventListener('click', openWithdrawModal);

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
window.openWithdrawModal = openWithdrawModal;
window.closeWithdrawModal = closeWithdrawModal;
window.submitWithdrawal = submitWithdrawal;
