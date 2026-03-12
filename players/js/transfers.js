// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseTransfers = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let transfers = [];
let offers = [];

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    const { data: { session }, error } = await supabaseTransfers.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    const { data, error } = await supabaseTransfers
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    if (error) {
        console.error('Erreur chargement profil:', error);
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = currentProfile.nom_complet || 'Joueur';
    document.getElementById('userAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    return currentProfile;
}

// ===== CHARGEMENT DES TRANSFERTS =====
async function loadTransfers() {
    const { data, error } = await supabaseTransfers
        .from('player_transfers')
        .select('*')
        .eq('player_id', currentProfile.id)
        .order('transfer_date', { ascending: false });

    if (error) {
        console.error('Erreur chargement transferts:', error);
        return;
    }
    transfers = data || [];
    renderTransfers();
}

// ===== CHARGEMENT DES OFFRES =====
async function loadOffers() {
    const { data, error } = await supabaseTransfers
        .from('player_offers')
        .select('*')
        .eq('player_id', currentProfile.id)
        .order('offer_date', { ascending: false });

    if (error) {
        console.error('Erreur chargement offres:', error);
        return;
    }
    offers = data || [];
    renderOffers();
}

// ===== RENDU DES TRANSFERTS =====
function renderTransfers() {
    const list = document.getElementById('transfersList');
    if (!list) return;

    if (transfers.length === 0) {
        list.innerHTML = '<p class="empty-message">Aucun transfert pour le moment.</p>';
        return;
    }

    list.innerHTML = transfers.map(t => {
        const typeLabel = {
            transfer: 'Transfert',
            loan: 'Prêt',
            end: 'Fin de contrat'
        }[t.type] || 'Transfert';

        const typeClass = {
            transfer: 'transfer',
            loan: 'loan',
            end: 'end'
        }[t.type] || 'transfer';

        const feeDisplay = t.fee > 0 
            ? `${t.fee.toLocaleString()} ${t.currency}` 
            : 'Gratuit (libre)';

        return `
            <div class="transfer-card">
                <div class="transfer-info">
                    <span class="transfer-type ${typeClass}">${typeLabel}</span>
                    <div class="transfer-clubs">
                        ${t.from_club} <i class="fas fa-arrow-right"></i> ${t.to_club}
                    </div>
                    <div class="transfer-date">${new Date(t.transfer_date).toLocaleDateString('fr-FR')}</div>
                    <div class="transfer-fee ${t.fee === 0 ? 'free' : ''}">${feeDisplay}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RENDU DES OFFRES =====
function renderOffers() {
    const list = document.getElementById('offersList');
    if (!list) return;

    if (offers.length === 0) {
        list.innerHTML = '<p class="empty-message">Aucune offre reçue pour le moment.</p>';
        return;
    }

    list.innerHTML = offers.map(o => {
        const statusLabel = {
            accepted: 'Acceptée',
            pending: 'En attente',
            rejected: 'Rejetée'
        }[o.status] || 'En attente';

        const amountDisplay = o.amount.toLocaleString() + ' FCFA';

        return `
            <div class="offer-card">
                <div class="offer-info">
                    <div class="offer-club">${o.from_club}</div>
                    <div class="offer-details">
                        <span>Offre du ${new Date(o.offer_date).toLocaleDateString('fr-FR')}</span>
                        <span class="offer-amount">${amountDisplay}</span>
                    </div>
                </div>
                <div class="offer-status ${o.status}">${statusLabel}</div>
            </div>
        `;
    }).join('');
}

// ===== GESTION DES ONGLETS =====
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// ===== MENU UTILISATEUR =====
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

// ===== SIDEBAR =====
function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
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
    const leftSidebar = document.getElementById('sidebar');
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
            supabaseTransfers.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation transfers.js');

    const user = await checkSession();
    if (!user) return;

    await loadProfile();
    if (!currentProfile) {
        console.error('Impossible de charger le profil');
        return;
    }

    await loadTransfers();
    await loadOffers();

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