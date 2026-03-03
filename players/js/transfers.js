// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;

// ===== DONNÉES FICTIVES POUR L'EXEMPLE =====
const fakeTransfers = [
    {
        id: 1,
        fromClub: "Académie Cotonou",
        toClub: "Aspire Academy",
        date: "2024-06-15",
        type: "transfer", // transfer, loan, end
        fee: 15000000,
        currency: "FCFA"
    },
    {
        id: 2,
        fromClub: "Aspire Academy",
        toClub: "Djoliba AC",
        date: "2025-01-10",
        type: "loan",
        fee: 0,
        currency: "FCFA"
    },
    {
        id: 3,
        fromClub: "Djoliba AC",
        toClub: "Joueur libre",
        date: "2025-06-30",
        type: "end",
        fee: 0,
        currency: "FCFA"
    }
];

const fakeOffers = [
    {
        id: 101,
        fromClub: "ASEC Mimosas",
        date: "2025-02-20",
        amount: 25000000,
        status: "accepted", // accepted, pending, rejected
        type: "transfer"
    },
    {
        id: 102,
        fromClub: "Stade Malien",
        date: "2025-03-05",
        amount: 18000000,
        status: "pending",
        type: "transfer"
    },
    {
        id: 103,
        fromClub: "Horoya AC",
        date: "2025-03-10",
        amount: 30000000,
        status: "rejected",
        type: "transfer"
    }
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

// ===== AFFICHAGE DES TRANSFERTS =====
function renderTransfers() {
    const list = document.getElementById('transfersList');
    list.innerHTML = '';

    fakeTransfers.forEach(transfer => {
        const card = document.createElement('div');
        card.className = 'transfer-card';

        const typeLabel = {
            transfer: 'Transfert',
            loan: 'Prêt',
            end: 'Fin de contrat'
        }[transfer.type] || 'Transfert';

        const typeClass = {
            transfer: 'transfer',
            loan: 'loan',
            end: 'end'
        }[transfer.type] || 'transfer';

        const feeDisplay = transfer.fee > 0 
            ? `${transfer.fee.toLocaleString()} ${transfer.currency}` 
            : 'Gratuit (libre)';

        card.innerHTML = `
            <div class="transfer-info">
                <span class="transfer-type ${typeClass}">${typeLabel}</span>
                <div class="transfer-clubs">
                    ${transfer.fromClub} <i class="fas fa-arrow-right"></i> ${transfer.toClub}
                </div>
                <div class="transfer-date">${new Date(transfer.date).toLocaleDateString('fr-FR')}</div>
                <div class="transfer-fee ${transfer.fee === 0 ? 'free' : ''}">${feeDisplay}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

// ===== AFFICHAGE DES OFFRES =====
function renderOffers() {
    const list = document.getElementById('offersList');
    list.innerHTML = '';

    fakeOffers.forEach(offer => {
        const card = document.createElement('div');
        card.className = 'offer-card';

        const statusLabel = {
            accepted: 'Acceptée',
            pending: 'En attente',
            rejected: 'Rejetée'
        }[offer.status] || 'En attente';

        const amountDisplay = offer.amount.toLocaleString() + ' FCFA';

        card.innerHTML = `
            <div class="offer-info">
                <div class="offer-club">${offer.fromClub}</div>
                <div class="offer-details">
                    <span>Offre du ${new Date(offer.date).toLocaleDateString('fr-FR')}</span>
                    <span class="offer-amount">${amountDisplay}</span>
                </div>
            </div>
            <div class="offer-status ${offer.status}">${statusLabel}</div>
        `;
        list.appendChild(card);
    });
}

// ===== GESTION DES ONGLETS =====
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Retirer la classe active de tous les onglets et contenus
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Activer l'onglet cliqué
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

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
    console.log('🚀 Initialisation de la page transfers');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();

    // Remplir avec les données fictives
    renderTransfers();
    renderOffers();

    initTabs();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});
