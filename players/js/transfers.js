// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let transfers = [];
let offers = [];
let currentFilters = { year: '', club: '', type: '' };
let currentOffer = null; // offre sélectionnée pour le modal

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

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

// ===== SESSION =====
async function checkSession() {
    showLoader();
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error(err);
        window.location.href = '../auth/login.html';
        return null;
    } finally {
        hideLoader();
    }
}

// ===== PROFIL =====
async function loadProfile() {
    if (!currentUser) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();
        if (error) throw error;
        currentProfile = data;
        document.getElementById('userName').textContent = currentProfile.full_name || 'Joueur';
        updateAvatarDisplay();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement profil', 'error');
    } finally {
        hideLoader();
    }
}

function updateAvatarDisplay() {
    const userAvatar = document.getElementById('userAvatar');
    const userInitials = document.getElementById('userAvatarInitials');
    if (currentProfile?.avatar_url) {
        userAvatar.src = currentProfile.avatar_url;
        userAvatar.style.display = 'block';
        if (userInitials) userInitials.style.display = 'none';
    } else {
        const initials = (currentProfile?.full_name || 'J').charAt(0).toUpperCase();
        if (userInitials) {
            userInitials.textContent = initials;
            userInitials.style.display = 'flex';
        }
        userAvatar.style.display = 'none';
    }
}

// ===== TRANSFERTS =====
async function loadTransfers() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_transfers')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('date', { ascending: false });
        if (error) throw error;
        transfers = data || [];
        // Remplir les options des filtres (années et clubs uniques)
        const years = [...new Set(transfers.map(t => t.year).filter(y => y))];
        const clubs = [...new Set(transfers.map(t => t.club).filter(c => c))];
        const yearSelect = document.getElementById('filterYear');
        const clubSelect = document.getElementById('filterClub');
        yearSelect.innerHTML = '<option value="">Toutes</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
        clubSelect.innerHTML = '<option value="">Tous</option>' + clubs.map(c => `<option value="${c}">${c}</option>`).join('');
        applyTransfersFilters();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement transferts', 'error');
    } finally {
        hideLoader();
    }
}

function applyTransfersFilters() {
    let filtered = transfers;
    if (currentFilters.year) filtered = filtered.filter(t => t.year == currentFilters.year);
    if (currentFilters.club) filtered = filtered.filter(t => t.club === currentFilters.club);
    if (currentFilters.type) filtered = filtered.filter(t => t.type === currentFilters.type);
    renderTransfers(filtered);
}

function renderTransfers(transfersList) {
    const container = document.getElementById('transfersList');
    if (!container) return;
    if (transfersList.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun transfert correspondant.</p>';
        return;
    }
    container.innerHTML = transfersList.map(transfer => {
        const statusText = {
            approved: 'Validé',
            pending: 'En attente',
            rejected: 'Rejeté'
        }[transfer.status] || 'En attente';
        const amountFormatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(transfer.amount || 0);
        return `
            <div class="transfer-card">
                <div class="transfer-icon"><i class="fas ${transfer.type === 'transfert' ? 'fa-exchange-alt' : transfer.type === 'pret' ? 'fa-handshake' : 'fa-file-signature'}"></i></div>
                <div class="transfer-info">
                    <h4>${transfer.club || 'Club non spécifié'}</h4>
                    <p>${transfer.type === 'transfert' ? 'Transfert' : transfer.type === 'pret' ? 'Prêt' : 'Fin de contrat'} – ${transfer.year || 'Année inconnue'}</p>
                </div>
                <div class="transfer-amount">${amountFormatted}</div>
                <span class="transfer-status ${transfer.status}">${statusText}</span>
            </div>
        `;
    }).join('');
}

// ===== OFFRES =====
async function loadOffers() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_offers')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        offers = data || [];
        renderOffers();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement offres', 'error');
    } finally {
        hideLoader();
    }
}

function renderOffers() {
    const container = document.getElementById('offersList');
    if (!container) return;
    if (offers.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune offre reçue pour le moment.</p>';
        return;
    }
    container.innerHTML = offers.map(offer => {
        const statusText = {
            accepted: 'Acceptée',
            rejected: 'Refusée',
            pending: 'En attente'
        }[offer.status] || 'En attente';
        let icon = 'fa-file-contract';
        if (offer.type === 'transfert') icon = 'fa-exchange-alt';
        else if (offer.type === 'tournoi') icon = 'fa-trophy';
        else if (offer.type === 'recrutement') icon = 'fa-user-plus';
        return `
            <div class="offer-card" data-offer-id="${offer.id}">
                <div class="offer-icon"><i class="fas ${icon}"></i></div>
                <div class="offer-info">
                    <h4>${offer.title || 'Offre'}</h4>
                    <p>${offer.from_entity || 'Entité'} – ${new Date(offer.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span class="offer-status ${offer.status}">${statusText}</span>
            </div>
        `;
    }).join('');
    // Attacher les événements click sur les cartes
    document.querySelectorAll('.offer-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const id = card.dataset.offerId;
            const offer = offers.find(o => o.id == id);
            if (offer) openOfferModal(offer);
        });
    });
}

// ===== MODAL DES OFFRES =====
function openOfferModal(offer) {
    currentOffer = offer;
    const modal = document.getElementById('offerModal');
    const detailsDiv = document.getElementById('modalOfferDetails');
    detailsDiv.innerHTML = `
        <p><strong>Titre :</strong> ${offer.title || '-'}</p>
        <p><strong>Type :</strong> ${offer.type === 'transfert' ? 'Transfert' : offer.type === 'tournoi' ? 'Participation à un tournoi' : 'Recrutement'}</p>
        <p><strong>De :</strong> ${offer.from_entity || '-'}</p>
        <p><strong>Date :</strong> ${new Date(offer.created_at).toLocaleString('fr-FR')}</p>
        <p><strong>Détails :</strong> ${offer.description || 'Aucun détail fourni.'}</p>
        ${offer.amount ? `<p><strong>Montant :</strong> ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(offer.amount)}</p>` : ''}
        ${offer.tournament_id ? `<p><strong>Tournoi :</strong> ID ${offer.tournament_id}</p>` : ''}
    `;
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('offerModal').style.display = 'none';
    currentOffer = null;
}

async function acceptOffer() {
    if (!currentOffer) return;
    showLoader();
    try {
        // Mettre à jour le statut de l'offre
        const { error: updateError } = await supabasePlayersSpacePrive
            .from('player_offers')
            .update({ status: 'accepted', responded_at: new Date() })
            .eq('id', currentOffer.id);
        if (updateError) throw updateError;

        // Envoyer un message à l'administrateur (ou à l'entité) via la messagerie
        // Ici on suppose qu'on envoie un message à un admin (id fixe ou récupéré)
        // Pour simplifier, on ajoute une notification dans la table notifications
        await supabasePlayersSpacePrive
            .from('notifications')
            .insert([{
                user_id: currentProfile.id,
                type: 'offer_accepted',
                content: `Vous avez accepté l'offre "${currentOffer.title}".`,
                read: false,
                created_at: new Date()
            }]);

        // On peut aussi envoyer un message directement à l'entité si on a son ID
        // Pour l'instant, on recharge les offres
        showToast('Offre acceptée ! Un message a été envoyé à l\'administrateur.', 'success');
        await loadOffers(); // recharge la liste
        closeModal();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'acceptation.', 'error');
    } finally {
        hideLoader();
    }
}

async function ignoreOffer() {
    if (!currentOffer) return;
    showLoader();
    try {
        const { error: updateError } = await supabasePlayersSpacePrive
            .from('player_offers')
            .update({ status: 'rejected', responded_at: new Date() })
            .eq('id', currentOffer.id);
        if (updateError) throw updateError;

        // Envoyer une notification d'ignorance
        await supabasePlayersSpacePrive
            .from('notifications')
            .insert([{
                user_id: currentProfile.id,
                type: 'offer_ignored',
                content: `Vous avez ignoré l'offre "${currentOffer.title}".`,
                read: false,
                created_at: new Date()
            }]);

        showToast('Offre ignorée.', 'info');
        await loadOffers();
        closeModal();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'ignorance.', 'error');
    } finally {
        hideLoader();
    }
}

// ===== FILTRES TRANSFERTS =====
function initFilters() {
    const yearSelect = document.getElementById('filterYear');
    const clubSelect = document.getElementById('filterClub');
    const typeSelect = document.getElementById('filterType');
    const resetBtn = document.getElementById('resetFilters');

    const apply = () => {
        currentFilters = {
            year: yearSelect.value,
            club: clubSelect.value,
            type: typeSelect.value
        };
        applyTransfersFilters();
    };
    yearSelect.addEventListener('change', apply);
    clubSelect.addEventListener('change', apply);
    typeSelect.addEventListener('change', apply);
    resetBtn.addEventListener('click', () => {
        yearSelect.value = '';
        clubSelect.value = '';
        typeSelect.value = '';
        currentFilters = { year: '', club: '', type: '' };
        applyTransfersFilters();
    });
}

// ===== ONGLETS =====
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${target}Tab`).classList.add('active');
            // Rafraîchir les offres si on affiche l'onglet offres
            if (target === 'offers') {
                loadOffers();
            }
        });
    });
}

// ===== UI =====
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

    let touchStartX = 0, touchStartY = 0;
    const swipeThreshold = 50;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0) closeSidebarFunc();
        }
    }, { passive: false });
}

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
    console.log('🚀 Initialisation transfers');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadTransfers();
    initFilters();
    initTabs();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    // Gestion du modal
    const modal = document.getElementById('offerModal');
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.getElementById('acceptOfferBtn').addEventListener('click', acceptOffer);
    document.getElementById('ignoreOfferBtn').addEventListener('click', ignoreOffer);

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    console.log('✅ Initialisation terminée');
});
