const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let transfers = [];
let offers = [];
let currentFilters = { year: '', club: '', type: '' };
let currentOffer = null;

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

async function loadTransfers() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_transfers')
            .select('*')
            .eq('user_id', currentProfile.id)
            .order('date_transfert', { ascending: false });
        if (error) throw error;
        transfers = data || [];

        const years = [...new Set(transfers.map(t => t.date_transfert ? new Date(t.date_transfert).getFullYear() : null).filter(y => y))];
        const clubs = [...new Set(transfers.flatMap(t => [t.club_depart, t.club_arrivee]).filter(c => c))];
        const yearSelect = document.getElementById('filterYear');
        const clubSelect = document.getElementById('filterClub');
        if (yearSelect) yearSelect.innerHTML = '<option value="">Toutes</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (clubSelect) clubSelect.innerHTML = '<option value="">Tous</option>' + clubs.map(c => `<option value="${c}">${c}</option>`).join('');
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
    if (currentFilters.year) {
        filtered = filtered.filter(t => {
            if (!t.date_transfert) return false;
            return new Date(t.date_transfert).getFullYear() == currentFilters.year;
        });
    }
    if (currentFilters.club) {
        filtered = filtered.filter(t => 
            t.club_depart === currentFilters.club || t.club_arrivee === currentFilters.club
        );
    }
    if (currentFilters.type) {
        filtered = filtered.filter(t => t.type_transfert === currentFilters.type);
    }
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
        const amountFormatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(transfer.montant || 0);
        let clubText = '';
        if (transfer.club_depart && transfer.club_arrivee) {
            clubText = `${transfer.club_depart} → ${transfer.club_arrivee}`;
        } else if (transfer.club_arrivee) {
            clubText = transfer.club_arrivee;
        } else {
            clubText = 'Club non spécifié';
        }
        const year = transfer.date_transfert ? new Date(transfer.date_transfert).getFullYear() : 'Année inconnue';
        return `
            <div class="transfer-card">
                <div class="transfer-icon"><i class="fas ${transfer.type_transfert === 'transfert' ? 'fa-exchange-alt' : transfer.type_transfert === 'pret' ? 'fa-handshake' : 'fa-file-signature'}"></i></div>
                <div class="transfer-info">
                    <h4>${escapeHtml(clubText)}</h4>
                    <p>${transfer.type_transfert === 'transfert' ? 'Transfert' : transfer.type_transfert === 'pret' ? 'Prêt' : 'Fin de contrat'} – ${year}</p>
                </div>
                <div class="transfer-amount">${amountFormatted}</div>
                <span class="transfer-status ${transfer.status}">${statusText}</span>
            </div>
        `;
    }).join('');
}

async function loadOffers() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_offers')
            .select('*')
            .or(`player_id.eq.${currentProfile.id},and(is_public.eq.true,player_id.is.null)`)
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
                    <h4>${escapeHtml(offer.title || `${offer.from_entity} – ${offer.type}`)}</h4>
                    <p>${offer.from_entity || 'HubISoccer'} – ${new Date(offer.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span class="offer-status ${offer.status}">${statusText}</span>
            </div>
        `;
    }).join('');
    document.querySelectorAll('.offer-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const id = card.dataset.offerId;
            const offer = offers.find(o => o.id == id);
            if (offer) openOfferModal(offer);
        });
    });
}

function formatDescription(desc) {
    if (!desc) return '<p>Aucun détail fourni.</p>';
    let text = desc;
    // Remplacer les séquences littérales \n par de vrais retours à la ligne
    text = text.replace(/\\n/g, '\n');
    // Échapper le HTML pour éviter les injections
    let escaped = escapeHtml(text);
    // Remplacer les retours chariot par des <br>
    let html = escaped.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
    // Diviser en lignes
    let lines = html.split('<br>');
    let inList = false;
    let result = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.match(/^[•\-*]\s/)) {
            if (!inList) {
                result.push('<ul>');
                inList = true;
            }
            let content = line.replace(/^[•\-*]\s/, '');
            result.push(`<li>${content}</li>`);
        } else {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            if (line !== '') {
                result.push(`<p>${line}</p>`);
            } else {
                result.push('<br>');
            }
        }
    }
    if (inList) result.push('</ul>');
    return result.join('');
}

function openOfferModal(offer) {
    currentOffer = offer;
    const modal = document.getElementById('offerModal');
    const detailsDiv = document.getElementById('modalOfferDetails');
    const descriptionHtml = formatDescription(offer.description);
    detailsDiv.innerHTML = `
        <p><strong>${escapeHtml(offer.title || 'Offre')}</strong></p>
        <p><strong>Type :</strong> ${offer.type === 'transfert' ? 'Transfert' : offer.type === 'tournoi' ? 'Participation à un tournoi' : 'Recrutement'}</p>
        <p><strong>De :</strong> ${escapeHtml(offer.from_entity || '-')}</p>
        <p><strong>Date :</strong> ${new Date(offer.created_at).toLocaleString('fr-FR')}</p>
        <p><strong>Description :</strong></p>
        <div class="offer-description">${descriptionHtml}</div>
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
        const { error } = await supabasePlayersSpacePrive
            .from('player_offers')
            .update({ status: 'accepted', responded_at: new Date() })
            .eq('id', currentOffer.id);
        if (error) throw error;

        await supabasePlayersSpacePrive
            .from('notifications')
            .insert([{
                user_id: currentProfile.id,
                type: 'offer_accepted',
                content: `Vous avez accepté l'offre "${currentOffer.title || currentOffer.from_entity}".`,
                read: false,
                created_at: new Date()
            }]);

        showToast('Offre acceptée !', 'success');
        await loadOffers();
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
        const { error } = await supabasePlayersSpacePrive
            .from('player_offers')
            .update({ status: 'rejected', responded_at: new Date() })
            .eq('id', currentOffer.id);
        if (error) throw error;

        await supabasePlayersSpacePrive
            .from('notifications')
            .insert([{
                user_id: currentProfile.id,
                type: 'offer_ignored',
                content: `Vous avez ignoré l'offre "${currentOffer.title || currentOffer.from_entity}".`,
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

function initFilters() {
    const yearSelect = document.getElementById('filterYear');
    const clubSelect = document.getElementById('filterClub');
    const typeSelect = document.getElementById('filterType');
    const resetBtn = document.getElementById('resetFilters');
    if (!yearSelect || !clubSelect || !typeSelect || !resetBtn) return;
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
            if (target === 'offers') {
                loadOffers();
            }
        });
    });
}

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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

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

    const modal = document.getElementById('offerModal');
    const closeBtn = modal?.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    const acceptBtn = document.getElementById('acceptOfferBtn');
    const ignoreBtn = document.getElementById('ignoreOfferBtn');
    if (acceptBtn) acceptBtn.addEventListener('click', acceptOffer);
    if (ignoreBtn) ignoreBtn.addEventListener('click', ignoreOffer);

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    console.log('✅ Initialisation terminée');
});
