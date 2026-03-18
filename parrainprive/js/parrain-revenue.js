// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentParrain = null;
let wallet = null;
let transactions = [];
let followersCount = 0;

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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseParrainPrive.auth.getSession();
        if (error || !session) {
            window.location.href = 'auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = 'auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL PARRAIN =====
async function loadParrainProfile() {
    try {
        const { data, error } = await supabaseParrainPrive
            .from('parrain_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil parrain:', error);
            return null;
        }
        currentParrain = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentParrain;
    } catch (err) {
        console.error('❌ Exception loadParrainProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT / CRÉATION DU PORTEFEUILLE =====
async function loadOrCreateWallet() {
    if (!currentParrain) return null;
    console.log('Chargement du portefeuille pour parrain_id:', currentParrain.id);
    const { data: existing, error: selectError } = await supabaseParrainPrive
        .from('parrain_wallets')
        .select('*')
        .eq('parrain_id', currentParrain.id)
        .maybeSingle();

    if (selectError) {
        console.error('Erreur chargement portefeuille:', selectError);
        return null;
    }

    if (existing) {
        wallet = existing;
        console.log('Portefeuille existant:', wallet);
    } else {
        console.log('Création nouveau portefeuille avec bonus');
        const { data: newWallet, error: insertError } = await supabaseParrainPrive
            .from('parrain_wallets')
            .insert([{
                parrain_id: currentParrain.id,
                balance: 0,
                bonus_inscription: 5000
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Erreur création portefeuille:', insertError);
            return null;
        }
        wallet = newWallet;
        console.log('Nouveau portefeuille créé:', wallet);

        // Ajouter une transaction de bonus
        const { error: transError } = await supabaseParrainPrive
            .from('parrain_transactions')
            .insert([{
                parrain_id: currentParrain.id,
                type: 'bonus',
                amount: 5000,
                status: 'completed',
                description: 'Bonus d\'inscription'
            }]);
        if (transError) console.error('Erreur création transaction bonus:', transError);
    }
    return wallet;
}

// ===== CHARGEMENT DES TRANSACTIONS =====
async function loadTransactions() {
    if (!currentParrain) return;
    const { data, error } = await supabaseParrainPrive
        .from('parrain_transactions')
        .select('*')
        .eq('parrain_id', currentParrain.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement transactions:', error);
        return;
    }
    transactions = data || [];
    renderTransactions();
}

// ===== COMPTER LES ABONNÉS (via unified_follows) =====
async function loadFollowersCount() {
    if (!currentUser) return;
    const { count, error } = await supabaseParrainPrive
        .from('unified_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', currentUser.id); // <- correction : on utilise l'UUID de l'utilisateur

    if (error) {
        console.error('Erreur comptage abonnés:', error);
        return;
    }
    followersCount = count || 0;
    updateBonusStatus();
}

// ===== MISE À JOUR DE L'INTERFACE =====
function updateBonusStatus() {
    const bonusElement = document.getElementById('bonusInscription');
    const withdrawBtn = document.getElementById('withdrawBonusBtn');
    if (bonusElement) {
        bonusElement.textContent = `${wallet.bonus_inscription} FCFA (${followersCount}/50 abonnés)`;
    }
    if (withdrawBtn) {
        withdrawBtn.disabled = followersCount < 50 || wallet.bonus_inscription <= 0;
        withdrawBtn.title = withdrawBtn.disabled 
            ? `Vous avez besoin de ${50 - followersCount} abonné(s) supplémentaire(s) pour retirer.` 
            : 'Retirer le bonus';
    }
}

function renderUI() {
    document.getElementById('walletBalance').textContent = `${wallet.balance} FCFA`;
    document.getElementById('bonusInscription').textContent = `${wallet.bonus_inscription} FCFA (${followersCount}/50 abonnés)`;
    document.getElementById('totalEarned').textContent = `${wallet.balance + wallet.bonus_inscription} FCFA`;

    let totalSpent = 0;
    transactions.forEach(t => {
        if (t.type === 'withdraw' || t.type === 'purchase') totalSpent += t.amount;
    });
    document.getElementById('totalSpent').textContent = `${totalSpent} FCFA`;

    // Bonus spécifiques (à adapter)
    document.getElementById('bonusDons').textContent = '0';
    document.getElementById('bonusFilleuls').textContent = '0';
    document.getElementById('bonusParrainages').textContent = '0';
    document.getElementById('bonusPrimes').textContent = '0';
}

function renderTransactions() {
    const list = document.getElementById('transactionsList');
    if (!list) return;
    let html = '';
    transactions.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString('fr-FR');
        const sign = t.type === 'deposit' || t.type === 'bonus' ? '+' : '-';
        const amountClass = (t.type === 'deposit' || t.type === 'bonus') ? 'positive' : 'negative';
        const icon = t.type === 'deposit' ? 'fa-arrow-down' : (t.type === 'withdraw' ? 'fa-arrow-up' : 'fa-gift');
        html += `
            <div class="transaction-item ${t.type}">
                <div class="transaction-icon"><i class="fas ${icon}"></i></div>
                <div class="transaction-details">
                    <div class="transaction-title">${t.description || t.type}</div>
                    <div class="transaction-desc">${t.status}</div>
                </div>
                <div class="transaction-amount ${amountClass}">${sign}${t.amount} FCFA</div>
                <div class="transaction-date">${date}</div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// ===== RETRAIT DU BONUS =====
async function withdrawBonus() {
    if (followersCount < 50) {
        showToast(`Vous devez avoir au moins 50 abonnés (actuellement ${followersCount})`, 'warning');
        return;
    }
    if (wallet.bonus_inscription <= 0) {
        showToast('Bonus déjà retiré ou inexistant', 'warning');
        return;
    }

    const { error } = await supabaseParrainPrive
        .from('parrain_transactions')
        .insert([{
            parrain_id: currentParrain.id,
            type: 'withdraw',
            amount: wallet.bonus_inscription,
            status: 'pending',
            description: 'Retrait du bonus d\'inscription'
        }]);

    if (error) {
        showToast('Erreur lors de la demande de retrait', 'error');
        return;
    }

    const { error: updateError } = await supabaseParrainPrive
        .from('parrain_wallets')
        .update({ bonus_inscription: 0 })
        .eq('id', wallet.id);

    if (updateError) {
        showToast('Erreur mise à jour portefeuille', 'error');
        return;
    }

    wallet.bonus_inscription = 0;
    showToast('Demande de retrait envoyée, en attente de validation.', 'success');
    await loadTransactions();
    updateBonusStatus();
    renderUI();
}

// ===== MODALES =====
function openDepositModal() { document.getElementById('depositModal').style.display = 'block'; }
function closeDepositModal() { document.getElementById('depositModal').style.display = 'none'; }
function openWithdrawModal() { document.getElementById('withdrawModal').style.display = 'block'; }
function closeWithdrawModal() { document.getElementById('withdrawModal').style.display = 'none'; }

// ===== GESTION DES ÉVÉNEMENTS DES FORMULAIRES =====
document.getElementById('depositForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('depositAmount').value);
    const method = document.getElementById('depositMethod').value;

    if (amount < 100) {
        showToast('Le montant minimum est de 100 FCFA', 'warning');
        return;
    }

    const { error } = await supabaseParrainPrive
        .from('parrain_transactions')
        .insert([{
            parrain_id: currentParrain.id,
            type: 'deposit',
            amount: amount,
            status: 'pending',
            description: `Dépôt via ${method}`
        }]);

    if (error) {
        showToast('Erreur lors de la demande de dépôt', 'error');
    } else {
        showToast('Demande de dépôt envoyée, en attente de confirmation.', 'success');
        closeDepositModal();
        await loadTransactions();
    }
});

document.getElementById('withdrawForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const recipient = document.getElementById('withdrawRecipient').value;

    if (amount < 100) {
        showToast('Le montant minimum est de 100 FCFA', 'warning');
        return;
    }
    if (amount > wallet.balance) {
        showToast('Solde insuffisant', 'warning');
        return;
    }

    const { error } = await supabaseParrainPrive
        .from('parrain_transactions')
        .insert([{
            parrain_id: currentParrain.id,
            type: 'withdraw',
            amount: amount,
            status: 'pending',
            description: `Retrait vers ${method} (${recipient})`
        }]);

    if (error) {
        showToast('Erreur lors de la demande de retrait', 'error');
    } else {
        showToast('Demande de retrait envoyée, en attente de validation.', 'success');
        closeWithdrawModal();
        await loadTransactions();
    }
});

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar?.classList.add('active');
        overlay?.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
    }

    menuBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebarFunc);
    overlay?.addEventListener('click', closeSidebarFunc);
}

// ===== GESTION DES SWIPES =====
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const leftSidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const diff = touchEndX - touchStartX;

    if (diff > swipeThreshold && touchStartX < 50) {
        leftSidebar?.classList.add('active');
        overlay?.classList.add('active');
    } else if (diff < -swipeThreshold && leftSidebar?.classList.contains('active')) {
        leftSidebar?.classList.remove('active');
        overlay?.classList.remove('active');
    }
}

// ===== DÉCONNEXION =====
function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseParrainPrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page revenus (parrain)');

    const user = await checkSession();
    if (!user) return;

    await loadParrainProfile();
    if (!currentParrain) return;

    await loadOrCreateWallet();
    await loadTransactions();
    await loadFollowersCount();

    renderUI();

    document.getElementById('depositBtn').addEventListener('click', openDepositModal);
    document.getElementById('withdrawBtn').addEventListener('click', openWithdrawModal);
    document.getElementById('withdrawBonusBtn')?.addEventListener('click', withdrawBonus);

    window.closeDepositModal = closeDepositModal;
    window.closeWithdrawModal = closeWithdrawModal;

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});

// ===== FONCTIONS GLOBALES =====
window.openDepositModal = openDepositModal;
window.openWithdrawModal = openWithdrawModal;
window.closeDepositModal = closeDepositModal;
window.closeWithdrawModal = closeWithdrawModal;
window.withdrawBonus = withdrawBonus;