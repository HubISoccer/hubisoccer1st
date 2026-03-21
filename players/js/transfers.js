// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;   // ici, currentProfile contiendra les infos de profiles
let transfers = [];
let offers = [];

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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL (depuis profiles) =====
async function loadProfile() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            return null;
        }
        currentProfile = data;
        document.getElementById('userName').textContent = currentProfile.full_name || 'Joueur';
        document.getElementById('userAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
        return currentProfile;
    } catch (err) {
        console.error('❌ Exception loadProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DES TRANSFERTS (table player_transfers) =====
async function loadTransfers() {
    if (!currentProfile) return;
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_transfers')
            .select('*')
            .eq('user_id', currentProfile.id)   // user_id fait référence à profiles.id (uuid)
            .order('date_transfert', { ascending: false });

        if (error) {
            console.error('Erreur chargement transferts:', error);
            return;
        }
        transfers = data || [];
        renderTransfers();
    } catch (err) {
        console.error('❌ Exception loadTransfers:', err);
    }
}

// ===== CHARGEMENT DES OFFRES (table player_offers) =====
async function loadOffers() {
    if (!currentProfile) return;
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_offers')
            .select('*')
            .eq('user_id', currentProfile.id)   // user_id fait référence à profiles.id
            .order('date_offre', { ascending: false });

        if (error) {
            console.error('Erreur chargement offres:', error);
            return;
        }
        offers = data || [];
        renderOffers();
    } catch (err) {
        console.error('❌ Exception loadOffers:', err);
    }
}

// ===== RENDU DES TRANSFERTS (inchangé) =====
function renderTransfers() {
    const list = document.getElementById('transfersList');
    if (!list) return;

    if (transfers.length === 0) {
        list.innerHTML = '<p class="empty-message">Aucun transfert pour le moment.</p>';
        return;
    }

    list.innerHTML = transfers.map(t => {
        const typeLabel = {
            'transfert': 'Transfert',
            'pret': 'Prêt',
            'fin_contrat': 'Fin de contrat'
        }[t.type_transfert] || 'Transfert';

        const typeClass = {
            'transfert': 'transfer',
            'pret': 'loan',
            'fin_contrat': 'end'
        }[t.type_transfert] || 'transfer';

        const feeDisplay = t.montant > 0 
            ? `${t.montant.toLocaleString()} FCFA` 
            : 'Gratuit (libre)';

        const dateFormatted = t.date_transfert ? new Date(t.date_transfert).toLocaleDateString('fr-FR') : 'Date inconnue';

        return `
            <div class="transfer-card">
                <div class="transfer-info">
                    <span class="transfer-type ${typeClass}">${typeLabel}</span>
                    <div class="transfer-clubs">
                        ${t.club_depart} <i class="fas fa-arrow-right"></i> ${t.club_arrivee}
                    </div>
                    <div class="transfer-date">${dateFormatted}</div>
                    <div class="transfer-fee ${t.montant === 0 ? 'free' : ''}">${feeDisplay}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RENDU DES OFFRES (inchangé) =====
function renderOffers() {
    const list = document.getElementById('offersList');
    if (!list) return;

    if (offers.length === 0) {
        list.innerHTML = '<p class="empty-message">Aucune offre reçue pour le moment.</p>';
        return;
    }

    list.innerHTML = offers.map(o => {
        const statusLabel = {
            'acceptee': 'Acceptée',
            'en_attente': 'En attente',
            'rejetee': 'Rejetée'
        }[o.statut] || 'En attente';

        const amountDisplay = o.montant_offre ? o.montant_offre.toLocaleString() + ' FCFA' : 'Non spécifié';
        const dateFormatted = o.date_offre ? new Date(o.date_offre).toLocaleDateString('fr-FR') : 'Date inconnue';

        return `
            <div class="offer-card">
                <div class="offer-info">
                    <div class="offer-club">${o.club_offrant}</div>
                    <div class="offer-details">
                        <span>Offre du ${dateFormatted}</span>
                        <span class="offer-amount">${amountDisplay}</span>
                    </div>
                </div>
                <div class="offer-status ${o.statut === 'acceptee' ? 'accepted' : o.statut === 'en_attente' ? 'pending' : 'rejected'}">${statusLabel}</div>
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

// ===== POIGNÉE DE MENU =====
function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

// ===== SIDEBAR =====
function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
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
            if (e.cancelable) {
                e.preventDefault();
            }
            if (diffX > 0 && touchStartX < 50) {
                openSidebar();
            } else if (diffX < 0 && sidebar.classList.contains('active')) {
                closeSidebarFunc();
            }
        }
    }, { passive: false });
}

// ===== DÉCONNEXION =====
function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabasePlayersSpacePrive.auth.signOut().then(() => {
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