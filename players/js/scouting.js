const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let scoutingData = null;
let requests = [];
let offers = [];
let currentFilter = 'all';

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

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
        <div class="toast-content">${escapeHtml(message)}</div>
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

async function loadScoutingData() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_scouting')
            .select('*')
            .eq('player_id', currentProfile.id)
            .maybeSingle();
        if (error) throw error;
        scoutingData = data;
        renderStats();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement données scouting', 'error');
    } finally {
        hideLoader();
    }
}

function renderStats() {
    if (!scoutingData) return;
    document.getElementById('statMatchs').textContent = scoutingData.matchs || 0;
    document.getElementById('statButs').textContent = scoutingData.buts || 0;
    document.getElementById('statPasses').textContent = scoutingData.passes || 0;
    const value = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(scoutingData.valeur_marche || 0);
    document.getElementById('statValeur').textContent = value;
    document.getElementById('statVues').textContent = scoutingData.scouting_views || 0;
    document.getElementById('statFavoris').textContent = scoutingData.recruiter_favs || 0;
}

async function loadRequests() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('scouting_requests')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        requests = data || [];
        renderRequests();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement demandes', 'error');
    } finally {
        hideLoader();
    }
}

function renderRequests() {
    const container = document.getElementById('requestsList');
    if (!container) return;
    const filtered = currentFilter === 'all' ? requests : requests.filter(r => r.status === currentFilter);
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune demande de scouting.</p>';
        return;
    }
    container.innerHTML = filtered.map(req => {
        const statusText = {
            pending: 'En attente',
            approved: 'Approuvée',
            rejected: 'Rejetée'
        }[req.status] || 'En attente';
        return `
            <div class="request-card ${req.status}">
                <div class="card-header">
                    <div class="card-title">${escapeHtml(req.recruiter_name || 'Recruteur')}</div>
                    <span class="card-status ${req.status}">${statusText}</span>
                </div>
                <div class="card-details">
                    <p>${escapeHtml(req.message || 'Aucun message')}</p>
                    <p><small>${new Date(req.created_at).toLocaleDateString('fr-FR')}</small></p>
                </div>
                <div class="card-actions">
                    ${req.status === 'pending' ? `
                        <button class="btn-accept" data-id="${req.id}" data-type="request">Accepter</button>
                        <button class="btn-reject" data-id="${req.id}" data-type="request">Refuser</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.btn-accept, .btn-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            const action = btn.classList.contains('btn-accept') ? 'accept' : 'reject';
            if (type === 'request') {
                if (action === 'accept') acceptRequest(id);
                else rejectRequest(id);
            } else {
                if (action === 'accept') acceptOffer(id);
                else rejectOffer(id);
            }
        });
    });
}

async function loadOffers() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('scouting_offers')
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
    const filtered = currentFilter === 'all' ? offers : offers.filter(o => o.status === currentFilter);
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune offre de scouting.</p>';
        return;
    }
    container.innerHTML = filtered.map(off => {
        const statusText = {
            pending: 'En attente',
            approved: 'Approuvée',
            rejected: 'Rejetée'
        }[off.status] || 'En attente';
        return `
            <div class="offer-card ${off.status}">
                <div class="card-header">
                    <div class="card-title">${escapeHtml(off.recruiter_name || 'Recruteur')}</div>
                    <span class="card-status ${off.status}">${statusText}</span>
                </div>
                <div class="card-details">
                    <p>${escapeHtml(off.message || 'Aucun message')}</p>
                    ${off.amount ? `<p><strong>Montant :</strong> ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(off.amount)}</p>` : ''}
                    <p><small>${new Date(off.created_at).toLocaleDateString('fr-FR')}</small></p>
                </div>
                <div class="card-actions">
                    ${off.status === 'pending' ? `
                        <button class="btn-accept" data-id="${off.id}" data-type="offer">Accepter</button>
                        <button class="btn-reject" data-id="${off.id}" data-type="offer">Refuser</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.btn-accept, .btn-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            const action = btn.classList.contains('btn-accept') ? 'accept' : 'reject';
            if (type === 'request') {
                if (action === 'accept') acceptRequest(id);
                else rejectRequest(id);
            } else {
                if (action === 'accept') acceptOffer(id);
                else rejectOffer(id);
            }
        });
    });
}

async function acceptRequest(requestId) {
    if (!confirm('Confirmez-vous l’acceptation de cette demande ?')) return;
    showLoader();
    try {
        const { error } = await supabasePlayersSpacePrive
            .from('scouting_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);
        if (error) throw error;
        showToast('Demande acceptée', 'success');
        await loadRequests();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l’acceptation', 'error');
    } finally {
        hideLoader();
    }
}

async function rejectRequest(requestId) {
    if (!confirm('Confirmez-vous le rejet de cette demande ?')) return;
    showLoader();
    try {
        const { error } = await supabasePlayersSpacePrive
            .from('scouting_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);
        if (error) throw error;
        showToast('Demande rejetée', 'success');
        await loadRequests();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors du rejet', 'error');
    } finally {
        hideLoader();
    }
}

async function acceptOffer(offerId) {
    if (!confirm('Confirmez-vous l’acceptation de cette offre ?')) return;
    showLoader();
    try {
        const { error } = await supabasePlayersSpacePrive
            .from('scouting_offers')
            .update({ status: 'approved' })
            .eq('id', offerId);
        if (error) throw error;
        showToast('Offre acceptée', 'success');
        await loadOffers();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l’acceptation', 'error');
    } finally {
        hideLoader();
    }
}

async function rejectOffer(offerId) {
    if (!confirm('Confirmez-vous le rejet de cette offre ?')) return;
    showLoader();
    try {
        const { error } = await supabasePlayersSpacePrive
            .from('scouting_offers')
            .update({ status: 'rejected' })
            .eq('id', offerId);
        if (error) throw error;
        showToast('Offre rejetée', 'success');
        await loadOffers();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors du rejet', 'error');
    } finally {
        hideLoader();
    }
}

function initFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderRequests();
            renderOffers();
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation scouting');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadScoutingData();
    await loadRequests();
    await loadOffers();
    initFilters();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    console.log('✅ Initialisation terminée');
});
