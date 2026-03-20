// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
let sessions = [];
let players = []; // Liste des joueurs suivis par le coach
let currentSessionId = null;
let currentAttendances = [];

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
        const { data: { session }, error } = await supabaseCoachPrive.auth.getSession();
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

// ===== CHARGEMENT DU PROFIL COACH =====
async function loadCoachProfile() {
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        currentCoach = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentCoach;
    } catch (err) {
        console.error('❌ Exception loadCoachProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DES JOUEURS =====
async function loadPlayers() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_players')
        .select(`
            id,
            player_id,
            notes,
            player:player_id (id, full_name, avatar_url)
        `)
        .eq('coach_id', currentCoach.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        showToast('Erreur chargement joueurs', 'error');
        return;
    }
    players = data || [];
}

// ===== CHARGEMENT DES SÉANCES =====
async function loadSessions() {
    showLoader(true);
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_training_sessions')
            .select('*')
            .eq('coach_id', currentCoach.id)
            .order('date', { ascending: false });

        if (error) throw error;
        sessions = data || [];
        renderSessions();
        populateMonthFilter();
    } catch (err) {
        console.error('Erreur chargement séances:', err);
        showToast('Erreur lors du chargement des séances', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES SÉANCES =====
function renderSessions() {
    const container = document.getElementById('sessionsList');
    if (!container) return;

    const filterMonth = document.getElementById('filterMonth').value;
    const searchTerm = document.getElementById('searchSession').value.toLowerCase();

    let filtered = sessions;
    if (filterMonth !== 'all') {
        filtered = filtered.filter(s => {
            const d = new Date(s.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return key === filterMonth;
        });
    }
    if (searchTerm) {
        filtered = filtered.filter(s => s.title.toLowerCase().includes(searchTerm) || (s.description && s.description.toLowerCase().includes(searchTerm)));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune séance trouvée.</p>';
        return;
    }

    container.innerHTML = filtered.map(session => {
        const date = new Date(session.date).toLocaleDateString('fr-FR');
        const startTime = session.start_time ? session.start_time.slice(0, 5) : '';
        const endTime = session.end_time ? session.end_time.slice(0, 5) : '';
        const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : startTime ? `${startTime}` : '';

        return `
            <div class="session-card" data-session-id="${session.id}">
                <div class="session-header">
                    <div class="session-title">${session.title}</div>
                    <div class="session-date">${date} ${timeStr ? 'à ' + timeStr : ''}</div>
                </div>
                <div class="session-info">
                    <div class="session-location"><i class="fas fa-map-marker-alt"></i> ${session.location || 'Lieu non défini'}</div>
                </div>
                <div class="session-actions">
                    <button class="session-action-btn" onclick="editSession(${session.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="session-action-btn" onclick="manageAttendance(${session.id})"><i class="fas fa-calendar-check"></i> Présences</button>
                    <button class="session-action-btn" onclick="addPlayersToSession(${session.id})"><i class="fas fa-user-plus"></i> Ajouter joueurs</button>
                    <button class="session-action-btn delete" onclick="deleteSession(${session.id})"><i class="fas fa-trash-alt"></i> Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FILTRE PAR MOIS =====
function populateMonthFilter() {
    const select = document.getElementById('filterMonth');
    const months = {};
    sessions.forEach(s => {
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = `${d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    });
    const sortedKeys = Object.keys(months).sort().reverse();
    select.innerHTML = '<option value="all">Tous les mois</option>' + sortedKeys.map(k => `<option value="${k}">${months[k]}</option>`).join('');
}

// ===== CRÉATION / MODIFICATION D'UNE SÉANCE =====
function openAddSessionModal(session = null) {
    const modal = document.getElementById('sessionModal');
    const title = document.getElementById('sessionModalTitle');
    const form = document.getElementById('sessionForm');

    form.reset();
    document.getElementById('sessionId').value = '';

    if (session) {
        title.innerText = 'Modifier la séance';
        document.getElementById('sessionId').value = session.id;
        document.getElementById('sessionTitle').value = session.title;
        document.getElementById('sessionDesc').value = session.description || '';
        document.getElementById('sessionDate').value = session.date;
        document.getElementById('sessionStartTime').value = session.start_time || '';
        document.getElementById('sessionEndTime').value = session.end_time || '';
        document.getElementById('sessionLocation').value = session.location || '';
        document.getElementById('sessionObjectives').value = session.objectives || '';
        document.getElementById('sessionMaterials').value = session.materials || '';
    } else {
        title.innerText = 'Nouvelle séance';
        // Set default date to today
        document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0];
    }
    modal.style.display = 'block';
}

function closeSessionModal() {
    document.getElementById('sessionModal').style.display = 'none';
}

async function saveSession(e) {
    e.preventDefault();

    const sessionId = document.getElementById('sessionId').value;
    const title = document.getElementById('sessionTitle').value.trim();
    const description = document.getElementById('sessionDesc').value.trim() || null;
    const date = document.getElementById('sessionDate').value;
    const startTime = document.getElementById('sessionStartTime').value || null;
    const endTime = document.getElementById('sessionEndTime').value || null;
    const location = document.getElementById('sessionLocation').value.trim() || null;
    const objectives = document.getElementById('sessionObjectives').value.trim() || null;
    const materials = document.getElementById('sessionMaterials').value.trim() || null;

    if (!title || !date) {
        showToast('Le titre et la date sont obligatoires', 'warning');
        return;
    }

    const sessionData = {
        coach_id: currentCoach.id,
        title,
        description,
        date,
        start_time: startTime,
        end_time: endTime,
        location,
        objectives,
        materials
    };

    showLoader(true);
    try {
        if (sessionId) {
            const { error } = await supabaseCoachPrive
                .from('coach_training_sessions')
                .update(sessionData)
                .eq('id', sessionId);
            if (error) throw error;
            showToast('Séance modifiée', 'success');
        } else {
            const { error } = await supabaseCoachPrive
                .from('coach_training_sessions')
                .insert([sessionData]);
            if (error) throw error;
            showToast('Séance créée', 'success');
        }
        closeSessionModal();
        await loadSessions();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        showLoader(false);
    }
}

window.editSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        openAddSessionModal(session);
    }
};

async function deleteSession(sessionId) {
    if (!confirm('Supprimer définitivement cette séance ?')) return;
    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_training_sessions')
            .delete()
            .eq('id', sessionId);
        if (error) throw error;
        showToast('Séance supprimée', 'success');
        await loadSessions();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== GESTION DES PRÉSENCES =====
async function manageAttendance(sessionId) {
    currentSessionId = sessionId;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    document.getElementById('attendanceModalTitle').innerHTML = `Présences - ${session.title}`;
    document.getElementById('attendanceInfo').innerHTML = `
        <div class="attendance-session-info">
            <strong>Date :</strong> ${new Date(session.date).toLocaleDateString('fr-FR')}<br>
            <strong>Lieu :</strong> ${session.location || 'Non défini'}
        </div>
    `;

    await loadAttendance(sessionId);
    document.getElementById('attendanceModal').style.display = 'block';
}

async function loadAttendance(sessionId) {
    // Charger tous les joueurs du coach et leurs présences pour cette séance
    const attendanceMap = {};
    const { data: attendanceData, error } = await supabaseCoachPrive
        .from('coach_training_attendance')
        .select('*')
        .eq('session_id', sessionId);
    if (!error && attendanceData) {
        attendanceData.forEach(a => {
            attendanceMap[a.player_id] = a;
        });
    }

    const listContainer = document.getElementById('attendanceList');
    if (players.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">Aucun joueur dans votre liste. Ajoutez-en d\'abord.</p>';
        return;
    }

    currentAttendances = players.map(p => {
        const player = p.player;
        const existing = attendanceMap[player.id];
        return {
            player_id: player.id,
            player_name: player.full_name,
            player_avatar: player.avatar_url,
            attendance_id: existing?.id || null,
            status: existing?.status || 'present',
            notes: existing?.notes || ''
        };
    });

    listContainer.innerHTML = currentAttendances.map(a => `
        <div class="attendance-item" data-player-id="${a.player_id}">
            <img src="${a.player_avatar || 'img/user-default.jpg'}" alt="${a.player_name}" class="attendance-avatar">
            <div class="attendance-name">${a.player_name}</div>
            <div class="attendance-status">
                <select class="attendance-status-select" data-player-id="${a.player_id}">
                    <option value="present" ${a.status === 'present' ? 'selected' : ''}>Présent</option>
                    <option value="absent" ${a.status === 'absent' ? 'selected' : ''}>Absent</option>
                    <option value="excused" ${a.status === 'excused' ? 'selected' : ''}>Excusé</option>
                </select>
            </div>
            <div class="attendance-notes">
                <input type="text" class="attendance-notes-input" data-player-id="${a.player_id}" placeholder="Notes..." value="${a.notes.replace(/"/g, '&quot;')}">
            </div>
        </div>
    `).join('');
}

async function saveAttendance() {
    const sessionId = currentSessionId;
    if (!sessionId) return;

    const updates = [];
    const attendanceItems = document.querySelectorAll('.attendance-item');
    for (const item of attendanceItems) {
        const playerId = item.dataset.playerId;
        const statusSelect = item.querySelector(`.attendance-status-select[data-player-id="${playerId}"]`);
        const notesInput = item.querySelector(`.attendance-notes-input[data-player-id="${playerId}"]`);
        const status = statusSelect.value;
        const notes = notesInput.value.trim() || null;

        const existing = currentAttendances.find(a => a.player_id === playerId);
        if (existing) {
            if (existing.status !== status || existing.notes !== notes) {
                if (existing.attendance_id) {
                    updates.push({
                        id: existing.attendance_id,
                        player_id: playerId,
                        status,
                        notes
                    });
                } else {
                    updates.push({
                        player_id: playerId,
                        status,
                        notes,
                        session_id: sessionId
                    });
                }
            }
        }
    }

    if (updates.length === 0) {
        showToast('Aucun changement détecté', 'info');
        closeAttendanceModal();
        return;
    }

    showLoader(true);
    try {
        for (const upd of updates) {
            if (upd.id) {
                const { error } = await supabaseCoachPrive
                    .from('coach_training_attendance')
                    .update({
                        status: upd.status,
                        notes: upd.notes,
                        updated_at: new Date()
                    })
                    .eq('id', upd.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseCoachPrive
                    .from('coach_training_attendance')
                    .insert([{
                        session_id: sessionId,
                        player_id: upd.player_id,
                        status: upd.status,
                        notes: upd.notes
                    }]);
                if (error) throw error;
            }
        }
        showToast('Présences enregistrées', 'success');
        closeAttendanceModal();
        // Optionnel : recharger la liste des séances pour mettre à jour le badge de présence ?
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        showLoader(false);
    }
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').style.display = 'none';
}

// ===== AJOUTER DES JOUEURS À UNE SÉANCE =====
let currentAddPlayersSessionId = null;

async function addPlayersToSession(sessionId) {
    currentAddPlayersSessionId = sessionId;
    // Afficher la liste des joueurs du coach avec une checkbox pour ceux déjà présents
    const { data: existingAttendances } = await supabaseCoachPrive
        .from('coach_training_attendance')
        .select('player_id')
        .eq('session_id', sessionId);
    const existingPlayerIds = new Set(existingAttendances?.map(a => a.player_id) || []);

    const listContainer = document.getElementById('availablePlayersList');
    if (players.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">Aucun joueur dans votre liste.</p>';
        return;
    }

    listContainer.innerHTML = players.map(p => {
        const player = p.player;
        const isChecked = existingPlayerIds.has(player.id);
        return `
            <label class="player-checkbox-item">
                <input type="checkbox" value="${player.id}" ${isChecked ? 'checked disabled' : ''}>
                <img src="${player.avatar_url || 'img/user-default.jpg'}" alt="${player.full_name}" class="player-avatar-small">
                <span>${player.full_name}</span>
                ${isChecked ? '<span class="already-added">(déjà ajouté)</span>' : ''}
            </label>
        `;
    }).join('');
    document.getElementById('addPlayersModal').style.display = 'block';
}

function closeAddPlayersModal() {
    document.getElementById('addPlayersModal').style.display = 'none';
}

async function confirmAddPlayers() {
    const sessionId = currentAddPlayersSessionId;
    if (!sessionId) return;

    const checkboxes = document.querySelectorAll('#availablePlayersList input[type="checkbox"]:checked:not([disabled])');
    const playerIds = Array.from(checkboxes).map(cb => cb.value);
    if (playerIds.length === 0) {
        showToast('Aucun joueur sélectionné', 'warning');
        return;
    }

    showLoader(true);
    try {
        const inserts = playerIds.map(playerId => ({
            session_id: sessionId,
            player_id: playerId,
            status: 'present'
        }));
        const { error } = await supabaseCoachPrive
            .from('coach_training_attendance')
            .insert(inserts);
        if (error) throw error;
        showToast('Joueurs ajoutés à la séance', 'success');
        closeAddPlayersModal();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'ajout', 'error');
    } finally {
        showLoader(false);
    }
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
            await supabaseCoachPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page entraînements (coach)');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
    if (!currentCoach) return;

    await loadPlayers();
    await loadSessions();

    document.getElementById('openAddSessionModal').addEventListener('click', () => openAddSessionModal());
    document.getElementById('sessionForm').addEventListener('submit', saveSession);
    document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendance);
    document.getElementById('confirmAddPlayersBtn').addEventListener('click', confirmAddPlayers);
    document.getElementById('filterMonth').addEventListener('change', renderSessions);
    document.getElementById('searchSession').addEventListener('input', renderSessions);

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

// Exposer les fonctions globales
window.editSession = editSession;
window.deleteSession = deleteSession;
window.manageAttendance = manageAttendance;
window.addPlayersToSession = addPlayersToSession;
window.closeSessionModal = closeSessionModal;
window.closeAttendanceModal = closeAttendanceModal;
window.closeAddPlayersModal = closeAddPlayersModal;
