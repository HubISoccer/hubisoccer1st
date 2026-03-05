// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let walletBalance = 14675000; // Solde fictif en FCFA
let totalEarned = 15000000;
let totalSpent = 325000;
let bonusStats = {
    buts: 12,
    passes: 8,
    homme: 3,
    primes: 2
};

// Données fictives de transactions
let transactions = [
    { id: 1, type: 'deposit', title: 'Dépôt Mobile Money', amount: 50000, date: '2025-02-15T10:30:00', status: 'completed' },
    { id: 2, type: 'withdraw', title: 'Retrait vers Mobile Money', amount: -25000, date: '2025-02-20T14:20:00', status: 'completed' },
    { id: 3, type: 'bonus', title: 'Bonus but (vs ASEC)', amount: 15000, date: '2025-02-22T18:00:00', status: 'completed' },
    { id: 4, type: 'bonus', title: 'Prime homme du match', amount: 25000, date: '2025-02-28T21:15:00', status: 'completed' },
    { id: 5, type: 'deposit', title: 'Achat sur e-market', amount: -12000, date: '2025-03-01T09:45:00', status: 'completed' },
    { id: 6, type: 'bonus', title: 'Bonus passe décisive', amount: 10000, date: '2025-03-02T16:30:00', status: 'completed' }
    { id: 7, type: 'bonus', title: 'Bonus HubISoccer', amount: 15000000, date: '2025-03-02T16:30:00', status: 'completed' }
];

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL =====
async function loadPlayerProfile() {
    if (!currentUser?.id) {
        playerProfile = { nom_complet: 'Joueur' };
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('player_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            playerProfile = { nom_complet: 'Joueur' };
        } else {
            playerProfile = data || { nom_complet: 'Joueur' };
        }
        document.getElementById('userName').textContent = playerProfile.nom_complet || 'Joueur';
    } catch (err) {
        console.error('❌ Exception loadPlayerProfile :', err);
        playerProfile = { nom_complet: 'Joueur' };
    }
}

// ===== MISE À JOUR DE L'INTERFACE =====
function updateUI() {
    document.getElementById('walletBalance').textContent = walletBalance.toLocaleString() + ' FCFA';
    document.getElementById('totalEarned').textContent = totalEarned.toLocaleString() + ' FCFA';
    document.getElementById('totalSpent').textContent = totalSpent.toLocaleString() + ' FCFA';
    document.getElementById('bonusButs').textContent = bonusStats.buts;
    document.getElementById('bonusPasses').textContent = bonusStats.passes;
    document.getElementById('bonusHomme').textContent = bonusStats.homme;
    document.getElementById('bonusPrimes').textContent = bonusStats.primes;

    renderTransactions();
}

// ===== AFFICHAGE DES TRANSACTIONS =====
function renderTransactions() {
    const list = document.getElementById('transactionsList');
    list.innerHTML = '';

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const item = document.createElement('div');
        item.className = `transaction-item ${t.type}`;

        const icon = t.type === 'deposit' ? 'fa-arrow-down' : (t.type === 'withdraw' ? 'fa-arrow-up' : 'fa-gift');
        const sign = t.amount > 0 ? '+' : '';
        const amountClass = t.amount > 0 ? 'positive' : 'negative';

        item.innerHTML = `
            <div class="transaction-icon"><i class="fas ${icon}"></i></div>
            <div class="transaction-details">
                <div class="transaction-title">${t.title}</div>
                <div class="transaction-desc">${t.type === 'bonus' ? 'Bonus' : (t.type === 'deposit' ? 'Dépôt' : 'Retrait')}</div>
            </div>
            <div class="transaction-amount ${amountClass}">${sign}${t.amount.toLocaleString()} FCFA</div>
            <div class="transaction-date">${new Date(t.date).toLocaleDateString('fr-FR')}</div>
        `;
        list.appendChild(item);
    });
}

// ===== GESTION DES MODALES =====
function openDepositModal() {
    document.getElementById('depositModal').style.display = 'block';
}
function closeDepositModal() {
    document.getElementById('depositModal').style.display = 'none';
}
function openWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'block';
}
function closeWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'none';
}

// ===== SOUMISSION DÉPÔT =====
document.getElementById('depositForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('depositAmount').value);
    const method = document.getElementById('depositMethod').value;

    if (amount < 100) {
        alert('Le montant minimum est de 100 FCFA');
        return;
    }

    // Simulation d'ajout
    walletBalance += amount;
    totalEarned += amount;
    transactions.push({
        id: Date.now(),
        type: 'deposit',
        title: `Dépôt ${method === 'mobile' ? 'Mobile Money' : (method === 'card' ? 'Carte' : 'Portefeuille')}`,
        amount: amount,
        date: new Date().toISOString(),
        status: 'completed'
    });

    updateUI();
    closeDepositModal();
    alert(`Dépôt de ${amount} FCFA effectué avec succès !`);
    e.target.reset();
});

// ===== SOUMISSION RETRAIT =====
document.getElementById('withdrawForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const recipient = document.getElementById('withdrawRecipient').value;

    if (amount < 10000) {
        alert('Le montant minimum est de 10000 FCFA');
        return;
    }
    if (amount > walletBalance) {
        alert('Solde insuffisant');
        return;
    }

    // Simulation
    walletBalance -= amount;
    totalSpent += amount;
    transactions.push({
        id: Date.now(),
        type: 'withdraw',
        title: `Retrait vers ${method === 'mobile' ? 'Mobile Money' : 'Virement bancaire'} (${recipient})`,
        amount: -amount,
        date: new Date().toISOString(),
        status: 'completed'
    });

    updateUI();
    closeWithdrawModal();
    alert(`Demande de retrait de ${amount} FCFA envoyée. Traitement sous 48h.`);
    e.target.reset();
});

// ===== FONCTIONS UI (menus) =====
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

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!menuBtn || !sidebar || !closeBtn || !overlay) {
        console.warn('Éléments de la sidebar manquants');
        return;
    }

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    menuBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebarFunc);
    overlay.addEventListener('click', closeSidebarFunc);
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseClient.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page revenue');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();

    // Mettre à jour l'interface avec les données fictives
    updateUI();

    // Ouvrir/fermer modales
    document.getElementById('depositBtn').addEventListener('click', openDepositModal);
    document.getElementById('withdrawBtn').addEventListener('click', openWithdrawModal);
    window.closeDepositModal = closeDepositModal;
    window.closeWithdrawModal = closeWithdrawModal;

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});
