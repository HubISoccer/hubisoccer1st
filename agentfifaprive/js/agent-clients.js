// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAgentPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentAgent = null;
let clients = [];
let searchTimeout = null;
let selectedPlayer = null;
let currentReportsClientId = null;

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
        currentAgent = data;
        document.getElementById('userName').textContent = data.full_name || 'Agent';
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentAgent;
    } catch (err) {
        console.error('❌ Exception loadAgentProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DES CLIENTS =====
async function loadClients() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAgentPrive
            .from('agent_clients')
            .select(`
                id,
                player_id,
                notes,
                created_at,
                updated_at,
                player:player_id (id, full_name, avatar_url, username)
            `)
            .eq('agent_id', currentAgent.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        clients = data || [];

        // Charger les rapports pour chaque client
        for (let client of clients) {
            const { data: reports, error: reportsError } = await supabaseAgentPrive
                .from('agent_client_reports')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false });
            if (!reportsError) client.reports = reports || [];
            else client.reports = [];
        }

        renderClients();
    } catch (err) {
        console.error('Erreur chargement clients:', err);
        showToast('Erreur lors du chargement des joueurs', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES CLIENTS =====
function renderClients() {
    const container = document.getElementById('clientsList');
    if (!container) return;

    if (clients.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun joueur représenté pour le moment.</p>';
        return;
    }

    container.innerHTML = clients.map(client => {
        const player = client.player || {};
        const fullName = player.full_name || 'Joueur inconnu';
        const avatar = player.avatar_url || 'img/user-default.jpg';
        const age = '?'; // À calculer si on a la date de naissance
        const club = 'Non renseigné'; // À récupérer depuis player_scouting

        const notesPreview = client.notes ? client.notes.substring(0, 80) : 'Aucune note';
        const hasNotes = client.notes && client.notes.length > 0;

        return `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-header">
                    <div class="client-avatar">
                        <img src="${avatar}" alt="${fullName}">
                    </div>
                    <div class="client-info">
                        <div class="client-name">${fullName}</div>
                        <div class="client-details">
                            <span><i class="fas fa-calendar-alt"></i> ${age} ans</span>
                            <span><i class="fas fa-futbol"></i> ${club}</span>
                        </div>
                    </div>
                </div>
                <div class="client-notes">
                    <i class="fas fa-sticky-note"></i> ${notesPreview}${hasNotes ? '' : ' (Aucune note)'}
                </div>
                <div class="client-actions">
                    <button class="client-action-btn" onclick="viewPlayerProfile('${player.id}')">
                        <i class="fas fa-eye"></i> Profil
                    </button>
                    <button class="client-action-btn" onclick="openEditNotes('${client.id}', '${client.notes?.replace(/'/g, "\\'") || ''}')">
                        <i class="fas fa-edit"></i> Notes
                    </button>
                    <button class="client-action-btn" onclick="openReportsModal('${client.id}')">
                        <i class="fas fa-file-alt"></i> Rapports
                    </button>
                    <button class="client-action-btn delete" onclick="deleteClient('${client.id}')">
                        <i class="fas fa-trash-alt"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RECHERCHE DE JOUEURS =====
function initSearch() {
    const searchInput = document.getElementById('searchPlayerInput');
    const resultsDiv = document.getElementById('searchResults');

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            resultsDiv.innerHTML = '';
            selectedPlayer = null;
            document.getElementById('confirmAddClient').disabled = true;
            return;
        }
        searchTimeout = setTimeout(async () => {
            // Rechercher dans profiles (rôle joueur) par nom ou username ou hub_id
            const { data, error } = await supabaseAgentPrive
                .from('profiles')
                .select('id, full_name, username, hub_id, avatar_url')
                .eq('role', 'joueur')
                .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,hub_id.ilike.%${query}%`)
                .limit(5);

            if (error) {
                console.error('Erreur recherche:', error);
                return;
            }

            if (data.length === 0) {
                resultsDiv.innerHTML = '<div class="search-result-item">Aucun joueur trouvé</div>';
                selectedPlayer = null;
                document.getElementById('confirmAddClient').disabled = true;
                return;
            }

            resultsDiv.innerHTML = data.map(player => `
                <div class="search-result-item" onclick="selectPlayer(${JSON.stringify(player).replace(/"/g, '&quot;')})">
                    <img src="${player.avatar_url || 'img/user-default.jpg'}" alt="${player.full_name}">
                    <div class="info">
                        <div class="name">${player.full_name}</div>
                        <div class="id">${player.hub_id || player.username || player.id}</div>
                    </div>
                </div>
            `).join('');
        }, 300);
    });
}

window.selectPlayer = function(player) {
    selectedPlayer = player;
    document.getElementById('searchPlayerInput').value = player.full_name;
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('confirmAddClient').disabled = false;
};

// ===== AJOUTER UN CLIENT =====
async function addClient() {
    if (!selectedPlayer) {
        showToast('Veuillez sélectionner un joueur', 'warning');
        return;
    }

    // Vérifier si le joueur est déjà dans la liste
    const exists = clients.some(c => c.player_id === selectedPlayer.id);
    if (exists) {
        showToast('Ce joueur est déjà dans votre liste', 'warning');
        return;
    }

    const notes = document.getElementById('clientNotes').value.trim();

    showLoader(true);
    try {
        const { data, error } = await supabaseAgentPrive
            .from('agent_clients')
            .insert([{
                agent_id: currentAgent.id,
                player_id: selectedPlayer.id,
                notes: notes || null
            }])
            .select()
            .single();

        if (error) throw error;

        showToast('Joueur ajouté avec succès', 'success');
        closeAddClientModal();
        await loadClients();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'ajout', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== ÉDITER NOTES =====
function openEditNotes(clientId, currentNotes) {
    document.getElementById('editClientId').value = clientId;
    document.getElementById('editNotesText').value = currentNotes;
    document.getElementById('editNotesModal').style.display = 'block';
}

async function saveNotes() {
    const clientId = document.getElementById('editClientId').value;
    const notes = document.getElementById('editNotesText').value.trim();

    showLoader(true);
    try {
        const { error } = await supabaseAgentPrive
            .from('agent_clients')
            .update({ notes: notes || null, updated_at: new Date() })
            .eq('id', clientId);

        if (error) throw error;

        showToast('Notes mises à jour', 'success');
        closeEditNotesModal();
        await loadClients();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== SUPPRIMER CLIENT =====
async function deleteClient(clientId) {
    if (!confirm('Supprimer ce joueur de votre liste ?')) return;

    showLoader(true);
    try {
        // Supprimer d'abord les rapports liés (ON DELETE CASCADE devrait le faire)
        const { error } = await supabaseAgentPrive
            .from('agent_clients')
            .delete()
            .eq('id', clientId);

        if (error) throw error;

        showToast('Joueur supprimé', 'success');
        await loadClients();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== GESTION DES RAPPORTS =====
async function openReportsModal(clientId) {
    currentReportsClientId = clientId;
    await loadReports(clientId);
    document.getElementById('reportsModal').style.display = 'block';
}

async function loadReports(clientId) {
    const { data, error } = await supabaseAgentPrive
        .from('agent_client_reports')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        showToast('Erreur chargement rapports', 'error');
        return;
    }

    const container = document.getElementById('reportsList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun rapport pour ce joueur.</p>';
    } else {
        container.innerHTML = data.map(report => `
            <div class="report-item" data-report-id="${report.id}">
                <div class="report-header">
                    <span class="report-type">${getReportTypeLabel(report.report_type)}</span>
                    <span class="report-date">${new Date(report.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="report-content">${report.content || ''}</div>
                ${report.file_url ? `<div class="report-file"><a href="${report.file_url}" target="_blank">Télécharger le fichier</a></div>` : ''}
                <div class="report-actions">
                    <button onclick="deleteReport('${report.id}')"><i class="fas fa-trash-alt"></i> Supprimer</button>
                </div>
            </div>
        `).join('');
    }
}

function getReportTypeLabel(type) {
    switch (type) {
        case 'coach': return 'Rapport du coach';
        case 'academie': return 'Rapport de l\'académie';
        case 'medical': return 'Rapport du staff médical';
        default: return type;
    }
}

async function deleteReport(reportId) {
    if (!confirm('Supprimer ce rapport ?')) return;

    showLoader(true);
    try {
        const { error } = await supabaseAgentPrive
            .from('agent_client_reports')
            .delete()
            .eq('id', reportId);

        if (error) throw error;

        showToast('Rapport supprimé', 'success');
        await loadReports(currentReportsClientId);
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== AJOUTER UN RAPPORT =====
function openAddReportModal(clientId) {
    document.getElementById('reportClientId').value = clientId;
    document.getElementById('reportType').value = 'coach';
    document.getElementById('reportContent').value = '';
    document.getElementById('reportFile').value = '';
    document.getElementById('addReportModal').style.display = 'block';
}

async function saveReport() {
    const clientId = document.getElementById('reportClientId').value;
    const type = document.getElementById('reportType').value;
    const content = document.getElementById('reportContent').value.trim();
    const fileInput = document.getElementById('reportFile');
    const file = fileInput.files[0];

    if (!content) {
        showToast('Veuillez saisir le contenu du rapport', 'warning');
        return;
    }

    showLoader(true);
    let fileUrl = null;

    try {
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Le fichier ne doit pas dépasser 5 Mo');
            }
            const fileExt = file.name.split('.').pop();
            const fileName = `report_${currentAgent.id}_${Date.now()}.${fileExt}`;
            const filePath = `agent_reports/${fileName}`;

            const { error: uploadError } = await supabaseAgentPrive.storage
                .from('documents')
                .upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseAgentPrive.storage
                .from('documents')
                .getPublicUrl(filePath);
            fileUrl = urlData.publicUrl;
        }

        const { error } = await supabaseAgentPrive
            .from('agent_client_reports')
            .insert([{
                client_id: clientId,
                report_type: type,
                content: content,
                file_url: fileUrl
            }]);

        if (error) throw error;

        showToast('Rapport ajouté avec succès', 'success');
        closeAddReportModal();
        await loadReports(clientId);
    } catch (err) {
        console.error(err);
        showToast('Erreur : ' + err.message, 'error');
    } finally {
        showLoader(false);
    }
}

// ===== PROFIL JOUEUR =====
function viewPlayerProfile(playerId) {
    window.location.href = `scouting.html?id=${playerId}`;
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

    // Swipe avec correction
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

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseAgentPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== MODALES =====
function openAddClientModal() {
    document.getElementById('addClientModal').style.display = 'block';
    document.getElementById('searchPlayerInput').value = '';
    document.getElementById('clientNotes').value = '';
    document.getElementById('searchResults').innerHTML = '';
    selectedPlayer = null;
    document.getElementById('confirmAddClient').disabled = true;
}

function closeAddClientModal() {
    document.getElementById('addClientModal').style.display = 'none';
}

function closeEditNotesModal() {
    document.getElementById('editNotesModal').style.display = 'none';
}

function closeAddReportModal() {
    document.getElementById('addReportModal').style.display = 'none';
}

function closeReportsModal() {
    document.getElementById('reportsModal').style.display = 'none';
}

// Exposer les fonctions globales
window.openAddClientModal = openAddClientModal;
window.closeAddClientModal = closeAddClientModal;
window.addClient = addClient;
window.selectPlayer = selectPlayer;
window.openEditNotes = openEditNotes;
window.closeEditNotesModal = closeEditNotesModal;
window.saveNotes = saveNotes;
window.deleteClient = deleteClient;
window.openReportsModal = openReportsModal;
window.closeReportsModal = closeReportsModal;
window.openAddReportModal = openAddReportModal;
window.closeAddReportModal = closeAddReportModal;
window.saveReport = saveReport;
window.deleteReport = deleteReport;
window.viewPlayerProfile = viewPlayerProfile;

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page clients (agent)');

    const user = await checkSession();
    if (!user) return;

    await loadAgentProfile();
    if (!currentAgent) return;

    await loadClients();

    initSearch();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('openAddClientModal').addEventListener('click', openAddClientModal);
    document.getElementById('confirmAddClient').addEventListener('click', addClient);
    document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);
    document.getElementById('saveReportBtn').addEventListener('click', saveReport);
    document.getElementById('openReportModalFromList').addEventListener('click', () => {
        if (currentReportsClientId) {
            closeReportsModal();
            openAddReportModal(currentReportsClientId);
        }
    });

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
