// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
let events = [];
let calendar = null;
let currentEventId = null;
let coachPlayers = [];

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

// ===== CHARGEMENT DES JOUEURS SUIVIS =====
async function loadPlayers() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_players')
        .select(`
            player_id,
            player:player_id (id, full_name, avatar_url)
        `)
        .eq('coach_id', currentCoach.id);
    if (error) {
        console.error('Erreur chargement joueurs:', error);
        return;
    }
    coachPlayers = data.map(p => ({ id: p.player_id, name: p.player.full_name }));
    populatePlayerSelect();
}

function populatePlayerSelect() {
    const select = document.getElementById('participantSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Sélectionner un joueur</option>';
    coachPlayers.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
}

// ===== CHARGEMENT DES ÉVÉNEMENTS =====
async function loadEvents() {
    showLoader(true);
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_events')
            .select('*')
            .eq('coach_id', currentCoach.id)
            .order('date', { ascending: true });

        if (error) throw error;
        events = data || [];
        renderCalendar();
        renderUpcomingEvents();
    } catch (err) {
        console.error('Erreur chargement événements:', err);
        showToast('Erreur lors du chargement des événements', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== CALENDRIER =====
function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const eventsForCalendar = events.map(ev => ({
        id: ev.id,
        title: ev.title,
        start: ev.date,
        extendedProps: { type: ev.event_type },
        className: ev.event_type
    }));

    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: eventsForCalendar,
        eventClick: (info) => {
            openEventDetailModal(info.event.id);
        },
        dateClick: (info) => {
            document.getElementById('eventDate').value = info.dateStr;
            openEventModal();
        }
    });
    calendar.render();
}

// ===== LISTE DES ÉVÉNEMENTS À VENIR =====
function renderUpcomingEvents() {
    const container = document.getElementById('upcomingEventsList');
    if (!container) return;

    const now = new Date();
    const upcoming = events.filter(e => new Date(e.date) >= now).slice(0, 5);
    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun événement à venir.</p>';
        return;
    }

    container.innerHTML = upcoming.map(ev => {
        const typeClass = ev.event_type === 'match' ? 'match' : (ev.event_type === 'stage' ? 'stage' : 'tournament');
        const typeLabel = {
            match: 'Match',
            stage: 'Stage',
            tournament: 'Tournoi'
        }[ev.event_type] || ev.event_type;
        return `
            <div class="event-item" onclick="openEventDetailModal(${ev.id})">
                <div class="event-title">${ev.title}</div>
                <div class="event-type ${typeClass}">${typeLabel}</div>
                <div class="event-date">${new Date(ev.date).toLocaleDateString('fr-FR')}</div>
            </div>
        `;
    }).join('');
}

// ===== MODALE CRÉATION/ÉDITION ÉVÉNEMENT =====
function openEventModal(eventId = null) {
    const modal = document.getElementById('eventModal');
    const title = document.getElementById('eventModalTitle');
    const form = document.getElementById('eventForm');
    form.reset();

    if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
            title.innerText = 'Modifier l\'événement';
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventType').value = event.event_type;
            document.getElementById('eventDate').value = event.date.split('T')[0];
            document.getElementById('eventLocation').value = event.location || '';
            document.getElementById('eventDescription').value = event.description || '';
        } else {
            return;
        }
    } else {
        title.innerText = 'Nouvel événement';
        document.getElementById('eventId').value = '';
        // Date par défaut (aujourd'hui si non précisée)
        if (!document.getElementById('eventDate').value) {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('eventDate').value = today;
        }
    }
    modal.style.display = 'block';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
}

async function saveEvent(e) {
    e.preventDefault();

    const eventId = document.getElementById('eventId').value;
    const title = document.getElementById('eventTitle').value.trim();
    const eventType = document.getElementById('eventType').value;
    const date = document.getElementById('eventDate').value;
    const location = document.getElementById('eventLocation').value.trim();
    const description = document.getElementById('eventDescription').value.trim();

    if (!title || !date) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    const eventData = {
        coach_id: currentCoach.id,
        title,
        event_type: eventType,
        date,
        location: location || null,
        description: description || null
    };

    showLoader(true);
    try {
        if (eventId) {
            const { error } = await supabaseCoachPrive
                .from('coach_events')
                .update(eventData)
                .eq('id', eventId);
            if (error) throw error;
            showToast('Événement modifié', 'success');
        } else {
            const { error } = await supabaseCoachPrive
                .from('coach_events')
                .insert([eventData]);
            if (error) throw error;
            showToast('Événement créé', 'success');
        }
        closeEventModal();
        await loadEvents();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== DÉTAIL DE L'ÉVÉNEMENT =====
async function openEventDetailModal(eventId) {
    currentEventId = eventId;
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('eventDetailModal');
    const detailDiv = document.getElementById('eventDetailContent');
    detailDiv.innerHTML = `
        <p><strong>Titre :</strong> ${event.title}</p>
        <p><strong>Type :</strong> ${event.event_type === 'match' ? 'Match' : (event.event_type === 'stage' ? 'Stage' : 'Tournoi')}</p>
        <p><strong>Date :</strong> ${new Date(event.date).toLocaleDateString('fr-FR')}</p>
        <p><strong>Lieu :</strong> ${event.location || 'Non spécifié'}</p>
        <p><strong>Description :</strong> ${event.description || 'Aucune description'}</p>
    `;
    modal.style.display = 'block';
    await loadParticipants(eventId);
    await loadResult(eventId);
    await loadComments(eventId);
}

function closeEventDetailModal() {
    document.getElementById('eventDetailModal').style.display = 'none';
}

// ===== GESTION DES PARTICIPANTS =====
async function loadParticipants(eventId) {
    const { data, error } = await supabaseCoachPrive
        .from('coach_event_participants')
        .select(`
            player_id,
            status,
            notes,
            player:player_id (id, full_name, avatar_url)
        `)
        .eq('event_id', eventId);

    if (error) {
        console.error(error);
        showToast('Erreur chargement participants', 'error');
        return;
    }

    const container = document.getElementById('participantsList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p>Aucun participant.</p>';
    } else {
        container.innerHTML = data.map(p => {
            const statusLabel = {
                confirmed: 'Confirmé',
                pending: 'En attente',
                declined: 'Refusé'
            }[p.status] || p.status;
            const statusClass = p.status || 'pending';
            return `
                <div class="participant-item">
                    <div class="participant-name">${p.player.full_name}</div>
                    <div class="participant-status ${statusClass}">${statusLabel}</div>
                    <button class="remove-participant" onclick="removeParticipant(${p.player_id})"><i class="fas fa-times"></i></button>
                </div>
            `;
        }).join('');
    }
}

async function addParticipant() {
    const playerId = document.getElementById('participantSelect').value;
    if (!playerId) {
        showToast('Sélectionnez un joueur', 'warning');
        return;
    }

    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_event_participants')
            .insert([{
                event_id: currentEventId,
                player_id: playerId,
                status: 'pending'
            }]);
        if (error) throw error;
        showToast('Participant ajouté', 'success');
        await loadParticipants(currentEventId);
        document.getElementById('participantSelect').value = '';
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'ajout', 'error');
    } finally {
        showLoader(false);
    }
}

async function removeParticipant(playerId) {
    if (!confirm('Retirer ce participant ?')) return;
    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_event_participants')
            .delete()
            .eq('event_id', currentEventId)
            .eq('player_id', playerId);
        if (error) throw error;
        showToast('Participant retiré', 'success');
        await loadParticipants(currentEventId);
    } catch (err) {
        console.error(err);
        showToast('Erreur', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== GESTION DES RÉSULTATS =====
async function loadResult(eventId) {
    const { data, error } = await supabaseCoachPrive
        .from('coach_event_results')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    const container = document.getElementById('resultsContent');
    if (data) {
        container.innerHTML = `
            <p><strong>Score :</strong> ${data.score || 'Non renseigné'}</p>
            <p><strong>Notes :</strong> ${data.notes || 'Aucune'}</p>
        `;
    } else {
        container.innerHTML = '<p>Aucun résultat enregistré.</p>';
    }
}

function openResultModal() {
    document.getElementById('resultModal').style.display = 'block';
    loadResultForModal();
}

async function loadResultForModal() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_event_results')
        .select('*')
        .eq('event_id', currentEventId)
        .maybeSingle();
    if (error) return;
    document.getElementById('resultScore').value = data?.score || '';
    document.getElementById('resultNotes').value = data?.notes || '';
}

async function saveResult() {
    const score = document.getElementById('resultScore').value.trim();
    const notes = document.getElementById('resultNotes').value.trim();

    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_event_results')
            .upsert({
                event_id: currentEventId,
                score: score || null,
                notes: notes || null
            }, { onConflict: 'event_id' });
        if (error) throw error;
        showToast('Résultat enregistré', 'success');
        closeResultModal();
        await loadResult(currentEventId);
    } catch (err) {
        console.error(err);
        showToast('Erreur', 'error');
    } finally {
        showLoader(false);
    }
}

function closeResultModal() {
    document.getElementById('resultModal').style.display = 'none';
}

// ===== GESTION DES COMMENTAIRES =====
async function loadComments(eventId) {
    const { data, error } = await supabaseCoachPrive
        .from('coach_event_comments')
        .select(`
            *,
            author:profiles!user_id (full_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const container = document.getElementById('commentsList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p>Aucun commentaire.</p>';
    } else {
        container.innerHTML = data.map(c => `
            <div class="comment-item">
                <div class="comment-author">${c.author?.full_name || 'Anonyme'}</div>
                <div class="comment-text">${c.content}</div>
                <div class="comment-date">${new Date(c.created_at).toLocaleString('fr-FR')}</div>
            </div>
        `).join('');
    }
}

async function addComment() {
    const content = document.getElementById('newComment').value.trim();
    if (!content) {
        showToast('Veuillez écrire un commentaire', 'warning');
        return;
    }

    showLoader(true);
    try {
        const { error } = await supabaseCoachPrive
            .from('coach_event_comments')
            .insert([{
                event_id: currentEventId,
                user_id: currentUser.id,
                content: content
            }]);
        if (error) throw error;
        showToast('Commentaire ajouté', 'success');
        document.getElementById('newComment').value = '';
        await loadComments(currentEventId);
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
    console.log('🚀 Initialisation de la page événements (coach)');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
    if (!currentCoach) return;

    await loadPlayers();
    await loadEvents();

    document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
    document.getElementById('eventForm').addEventListener('submit', saveEvent);
    document.getElementById('addParticipantBtn').addEventListener('click', addParticipant);
    document.getElementById('editResultsBtn').addEventListener('click', openResultModal);
    document.getElementById('addCommentBtn').addEventListener('click', addComment);
    document.getElementById('saveResultBtn').addEventListener('click', saveResult);

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
window.openEventDetailModal = openEventDetailModal;
window.closeEventModal = closeEventModal;
window.closeEventDetailModal = closeEventDetailModal;
window.closeResultModal = closeResultModal;
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
