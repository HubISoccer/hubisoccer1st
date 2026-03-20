// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAgentPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentAgent = null;
let clients = [];
let contracts = [];
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
        if (data.role !== 'agent') {
            showToast('Accès non autorisé', 'error');
            setTimeout(() => { window.location.href = '../index.html'; }, 2000);
            return null;
        }
        currentAgent = data;
        updateProfileUI();
        return currentAgent;
    } catch (err) {
        console.error('❌ Exception loadAgentProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

function updateProfileUI() {
    if (!currentAgent) return;
    const fullName = currentAgent.full_name || 'Agent';
    document.getElementById('userName').textContent = fullName;
    document.getElementById('dashboardName').textContent = fullName;
    document.getElementById('agentFullName').textContent = fullName;
    document.getElementById('agentEmail').textContent = currentAgent.email || '-';
    document.getElementById('playerPseudo').textContent = currentAgent.username || '-';

    const contact = currentAgent.contact_info || {};
    document.getElementById('playerPhone').textContent = contact.phone || '-';
    document.getElementById('playerEmail').textContent = contact.email || currentAgent.email || '-';
    document.getElementById('agentPhone').textContent = contact.phone || '-';

    const country = contact.country || currentAgent.country || '';
    document.getElementById('playerCountryName').textContent = country || '-';
    const flagMap = { 'Bénin': '🇧🇯', 'France': '🇫🇷', 'Côte d\'Ivoire': '🇨🇮', 'Sénégal': '🇸🇳', 'Cameroun': '🇨🇲', 'Maroc': '🇲🇦', 'Tunisie': '🇹🇳', 'Algérie': '🇩🇿', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭' };
    document.getElementById('playerCountryFlag').textContent = flagMap[country] || '🌍';

    if (currentAgent.avatar_url) {
        const avatarWithTimestamp = `${currentAgent.avatar_url}?t=${new Date().getTime()}`;
        document.getElementById('userAvatar').src = avatarWithTimestamp;
        document.getElementById('profileDisplay').src = avatarWithTimestamp;
    }

    if (currentAgent.created_at) {
        document.getElementById('memberSince').textContent = new Date(currentAgent.created_at).toLocaleDateString('fr-FR');
    } else {
        document.getElementById('memberSince').textContent = '-';
    }
    document.getElementById('agentID').textContent = `ID: ${currentAgent.hub_id || currentAgent.id}`;
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadAgentData() {
    showLoader(true);
    try {
        await Promise.all([loadClients(), loadContracts(), loadLicenseStatus()]);
        updateStatsAndLists();
        initCommissionsChart();
    } catch (err) {
        console.error('Erreur chargement données:', err);
        showToast('Erreur lors du chargement des données', 'error');
    } finally {
        showLoader(false);
    }
}

async function loadClients() {
    const { data, error } = await supabaseAgentPrive
        .from('agent_clients')
        .select('*, player:player_id (full_name, avatar_url)')
        .eq('agent_id', currentAgent.id)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erreur chargement clients:', error);
        showToast('Erreur chargement joueurs', 'error');
        return;
    }
    clients = data || [];
    document.getElementById('nbJoueurs').textContent = clients.length;
    document.getElementById('statsJoueurs').textContent = clients.length;
}

async function loadContracts() {
    const { data, error } = await supabaseAgentPrive
        .from('agent_contracts')
        .select('*')
        .eq('agent_id', currentAgent.id)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erreur chargement contrats:', error);
        showToast('Erreur chargement contrats', 'error');
        return;
    }
    contracts = data || [];
    const activeCount = contracts.filter(c => c.status === 'active').length;
    document.getElementById('nbContrats').textContent = contracts.length;
    document.getElementById('statsContrats').textContent = activeCount;
    const totalCommissions = contracts.reduce((sum, c) => sum + (c.commission || 0), 0);
    document.getElementById('totalCommissions').textContent = totalCommissions.toLocaleString();
    document.getElementById('statsCommissions').textContent = totalCommissions.toLocaleString() + ' FCFA';
}

async function loadLicenseStatus() {
    const { data, error } = await supabaseAgentPrive
        .from('license_requests')
        .select('status')
        .eq('user_id', currentAgent.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) {
        console.error('Erreur chargement statut licence:', error);
        return;
    }
    let statusText = 'Non demandée';
    if (data) {
        switch (data.status) {
            case 'approved': statusText = 'Validée'; break;
            case 'rejected': statusText = 'Rejetée'; break;
            case 'president_pending': statusText = 'Validation président'; break;
            case 'admin_pending': statusText = 'En attente admin'; break;
            default: statusText = 'En cours';
        }
    }
    document.getElementById('statsLicence').textContent = statusText;
}

function updateStatsAndLists() {
    // Derniers contrats
    const recentContracts = contracts.slice(0, 5);
    const contractsHtml = recentContracts.map(c => `
        <div class="recent-item">
            <div class="date">${c.start_date ? new Date(c.start_date).toLocaleDateString('fr-FR') : ''}</div>
            <div class="main">Contrat ${c.player_name || ''}</div>
            <div class="sub">${c.commission?.toLocaleString()} FCFA</div>
        </div>
    `).join('');
    document.getElementById('recentContractsList').innerHTML = contractsHtml || '<p>Aucun contrat récent</p>';

    // Derniers joueurs
    const recentClients = clients.slice(0, 5);
    const clientsHtml = recentClients.map(cl => `
        <div class="recent-item">
            <div class="main">${cl.player?.full_name || 'Joueur'}</div>
            <div class="sub">Depuis ${new Date(cl.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
    `).join('');
    document.getElementById('recentClientsList').innerHTML = clientsHtml || '<p>Aucun joueur récent</p>';

    // Derniers messages (conversations)
    loadRecentMessages();
}

async function loadRecentMessages() {
    const { data: conversations, error: convError } = await supabaseAgentPrive
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${currentAgent.id},participant2_id.eq.${currentAgent.id}`);
    if (convError || !conversations || conversations.length === 0) {
        document.getElementById('recentMessagesList').innerHTML = '<p class="no-data">Aucun message</p>';
        return;
    }
    const convIds = conversations.map(c => c.id);
    const { data: messages, error: msgError } = await supabaseAgentPrive
        .from('messages')
        .select(`id, content, created_at, sender_id, profiles!sender_id (full_name, avatar_url)`)
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(5);
    if (msgError) {
        console.error('Erreur chargement messages:', msgError);
        document.getElementById('recentMessagesList').innerHTML = '<p class="no-data">Erreur</p>';
        return;
    }
    if (messages.length === 0) {
        document.getElementById('recentMessagesList').innerHTML = '<p class="no-data">Aucun message récent</p>';
    } else {
        document.getElementById('recentMessagesList').innerHTML = messages.map(m => `
            <div class="recent-item">
                <div class="date">${new Date(m.created_at).toLocaleString('fr-FR')}</div>
                <div class="main">${m.profiles?.full_name || 'Inconnu'}</div>
                <div class="sub">${m.content.substring(0, 50)}...</div>
            </div>
        `).join('');
    }
}

function initCommissionsChart() {
    const ctx = document.getElementById('commissionsChart').getContext('2d');
    if (commissionsChart) commissionsChart.destroy();

    const monthly = {};
    contracts.forEach(c => {
        if (c.created_at) {
            const date = new Date(c.created_at);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            monthly[key] = (monthly[key] || 0) + (c.commission || 0);
        }
    });
    const sortedKeys = Object.keys(monthly).sort();
    const labels = sortedKeys.map(k => { const [y, m] = k.split('-'); return `${m}/${y}`; });
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
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

// ===== UPLOAD AVATAR =====
document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentAgent) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('L\'image ne doit pas dépasser 2 Mo', 'warning');
        return;
    }
    showLoader(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${currentAgent.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseAgentPrive.storage
            .from('avatars')
            .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabaseAgentPrive.storage.from('avatars').getPublicUrl(fileName);
        if (!data || !data.publicUrl) throw new Error('URL publique non générée');
        const publicURL = data.publicUrl;
        await supabaseAgentPrive.from('profiles').update({ avatar_url: publicURL }).eq('id', currentAgent.id);
        currentAgent.avatar_url = publicURL;
        const avatarWithTimestamp = `${publicURL}?t=${new Date().getTime()}`;
        document.getElementById('userAvatar').src = avatarWithTimestamp;
        document.getElementById('profileDisplay').src = avatarWithTimestamp;
        showToast('Avatar mis à jour avec succès', 'success');
    } catch (err) {
        console.error('Erreur upload avatar:', err);
        showToast('Erreur lors de la mise à jour de l\'avatar', 'error');
    } finally {
        showLoader(false);
    }
});

// ===== COPIER ID =====
window.copyID = () => {
    const id = document.getElementById('agentID').textContent.replace('ID: ', '');
    navigator.clipboard.writeText(id);
    showToast('ID copié !', 'success');
};

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
    function openSidebar() { sidebar.classList.add('active'); overlay.classList.add('active'); }
    function closeSidebarFunc() { sidebar.classList.remove('active'); overlay.classList.remove('active'); }
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
    console.log('🚀 Initialisation du dashboard agent');
    const user = await checkSession();
    if (!user) return;
    showLoader(true);
    try {
        await loadAgentProfile();
        if (!currentAgent) return;
        await loadAgentData();
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
    } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err);
        showToast('Erreur lors du chargement de la page', 'error');
    } finally {
        showLoader(false);
    }
});
