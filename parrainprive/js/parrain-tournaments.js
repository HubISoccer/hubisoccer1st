// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentParrain = null;
let tournaments = [];
let currentTournament = null;
let messages = [];
let starredPlayers = new Set(); // IDs des joueurs (player_tournament_id)
let messagesSubscription = null;

// ===== TOAST (optionnel) =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
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
        const { data: { session }, error } = await supabaseParrainPrive.auth.getSession();
        if (error || !session) {
            window.location.href = 'auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = 'auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL PARRAIN =====
async function loadParrainProfile() {
    try {
        const { data, error } = await supabaseParrainPrive
            .from('parrain_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil parrain:', error);
            return null;
        }
        currentParrain = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentParrain;
    } catch (err) {
        console.error('❌ Exception loadParrainProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DES TOURNOIS =====
async function loadTournaments() {
    const { data, error } = await supabaseParrainPrive
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error('Erreur chargement tournois:', error);
        return;
    }

    tournaments = data || [];
    if (tournaments.length > 0) {
        currentTournament = tournaments[0];
        await loadTournamentDetails(currentTournament.id);
        await loadStarredPlayers(currentTournament.id);
    }
    renderTournamentList();
    renderLiveTournament();
}

// ===== CHARGEMENT DES DÉTAILS D'UN TOURNOI (joueurs) =====
async function loadTournamentDetails(tournamentId) {
    const { data, error } = await supabaseParrainPrive
        .from('tournament_players')
        .select(`
            id,
            position,
            jersey_number,
            player:player_profiles(id, first_name, last_name, avatar_url, hub_id)
        `)
        .eq('tournament_id', tournamentId);

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        return;
    }

    // Construction des objets joueurs avec nom complet
    const players = (data || []).map(p => ({
        id: p.id,
        playerId: p.player.id,
        name: p.player ? `${p.player.first_name} ${p.player.last_name}` : 'Joueur inconnu',
        avatar: p.player?.avatar_url,
        position: p.position,
        jersey_number: p.jersey_number
    }));

    currentTournament = {
        ...currentTournament,
        players: players
    };
}

// ===== CHARGEMENT DES ÉTOILES (favoris) =====
async function loadStarredPlayers(tournamentId) {
    const { data, error } = await supabaseParrainPrive
        .from('player_stars')
        .select('player_id')
        .eq('user_id', currentParrain.id)  // user_id = id du parrain
        .eq('tournament_id', tournamentId);

    if (error) {
        console.error('Erreur chargement étoiles:', error);
        return;
    }

    starredPlayers = new Set(data.map(s => s.player_id));
}

// ===== RENDU DE LA LISTE DES TOURNOIS (modale) =====
function renderTournamentList() {
    const list = document.getElementById('tournamentList');
    if (!list) return;

    list.innerHTML = tournaments.map(t => `
        <div class="tournament-item" data-tournament-id="${t.id}">
            <span class="tournament-item-name">${t.name}</span>
            <span class="tournament-item-date">${new Date(t.date).toLocaleDateString('fr-FR')}</span>
        </div>
    `).join('');

    document.querySelectorAll('.tournament-item').forEach(item => {
        item.addEventListener('click', () => {
            const tournamentId = parseInt(item.dataset.tournamentId);
            selectTournament(tournamentId);
        });
    });
}

// ===== RENDU DU TOURNOI EN DIRECT =====
function renderLiveTournament() {
    if (!currentTournament) return;

    const container = document.getElementById('liveTournament');
    const streamUrl = currentTournament.stream_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // URL par défaut

    container.innerHTML = `
        <div class="tournament-video">
            <iframe src="${streamUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
        <div class="tournament-info">
            <h2 class="tournament-name">${currentTournament.name}</h2>
            <span class="tournament-date">${new Date(currentTournament.date).toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="tournament-actions">
            <button class="btn-players" onclick="openPlayersModal()"><i class="fas fa-users"></i> Voir les joueurs</button>
        </div>
        <div class="chat-section">
            <h3>Chat en direct</h3>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-area">
                <input type="text" id="chatInput" placeholder="Votre message...">
                <button onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    renderChatMessages();
}

// ===== CHARGEMENT DES MESSAGES DU CHAT =====
async function loadMessages(tournamentId) {
    const { data, error } = await supabaseParrainPrive
        .from('tournament_messages')
        .select(`
            id,
            message,
            created_at,
            user:parrain_profiles!user_id(id, first_name, last_name, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur chargement messages:', error);
        return;
    }

    messages = data.map(m => ({
        id: m.id,
        userId: m.user.id,
        author: m.user ? `${m.user.first_name} ${m.user.last_name}` : 'Inconnu',
        text: m.message,
        time: new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }));

    renderChatMessages();
}

// ===== RENDU DES MESSAGES DU CHAT =====
function renderChatMessages() {
    const chatDiv = document.getElementById('chatMessages');
    if (!chatDiv) return;

    chatDiv.innerHTML = messages.map(msg => {
        const isOwn = msg.userId === currentParrain.id;
        return `
            <div class="chat-message ${isOwn ? 'own' : ''}">
                <div class="author">${msg.author}</div>
                <div class="text">${msg.text}</div>
                <div class="time">${msg.time}</div>
            </div>
        `;
    }).join('');

    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// ===== ENVOI D'UN MESSAGE =====
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !currentTournament) return;

    const { error } = await supabaseParrainPrive
        .from('tournament_messages')
        .insert([{
            tournament_id: currentTournament.id,
            user_id: currentParrain.id,
            message: text
        }]);

    if (error) {
        console.error('Erreur envoi message:', error);
        showToast('Erreur lors de l\'envoi du message', 'error');
        return;
    }

    input.value = '';
    // Le message apparaîtra via Realtime
}

// ===== SOUSCRIPTION AUX NOUVEAUX MESSAGES =====
function subscribeToMessages(tournamentId) {
    if (messagesSubscription) messagesSubscription.unsubscribe();

    messagesSubscription = supabaseParrainPrive
        .channel(`tournament_messages:${tournamentId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'tournament_messages',
            filter: `tournament_id=eq.${tournamentId}`
        }, async (payload) => {
            // Récupérer les infos de l'utilisateur (parrain) pour le nouveau message
            const { data: userData } = await supabaseParrainPrive
                .from('parrain_profiles')
                .select('first_name, last_name')
                .eq('id', payload.new.user_id)
                .single();

            const newMsg = {
                id: payload.new.id,
                userId: payload.new.user_id,
                author: userData ? `${userData.first_name} ${userData.last_name}` : 'Inconnu',
                text: payload.new.message,
                time: new Date(payload.new.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            };

            messages.push(newMsg);
            renderChatMessages();
        })
        .subscribe();
}

// ===== SÉLECTION D'UN TOURNOI =====
async function selectTournament(tournamentId) {
    currentTournament = tournaments.find(t => t.id === tournamentId);
    await loadTournamentDetails(tournamentId);
    await loadStarredPlayers(tournamentId);
    await loadMessages(tournamentId);
    subscribeToMessages(tournamentId);
    renderLiveTournament();
    closeTournamentModal();
}

// ===== MODALES =====
function openTournamentModal() {
    document.getElementById('tournamentModal').style.display = 'block';
}
function closeTournamentModal() {
    document.getElementById('tournamentModal').style.display = 'none';
}
function openPlayersModal() {
    renderPlayersList();
    document.getElementById('playersModal').style.display = 'block';
}
function closePlayersModal() {
    document.getElementById('playersModal').style.display = 'none';
}

// ===== RENDU DE LA LISTE DES JOUEURS =====
function renderPlayersList() {
    const list = document.getElementById('playersList');
    if (!list || !currentTournament?.players) return;

    list.innerHTML = currentTournament.players.map(p => {
        const isStarred = starredPlayers.has(p.id);
        return `
            <div class="player-item">
                <div class="player-avatar">
                    <img src="${p.avatar || 'img/user-default.jpg'}" alt="${p.name}">
                </div>
                <div class="player-info">
                    <div class="player-name">${p.name}</div>
                    <div class="player-position">${p.position || 'Poste inconnu'}</div>
                </div>
                <div class="player-star ${isStarred ? 'active' : ''}" onclick="toggleStar(${p.id})">
                    <i class="fas fa-star"></i>
                </div>
            </div>
        `;
    }).join('');
}

// ===== AJOUT/SUPPRESSION D'UNE ÉTOILE =====
async function toggleStar(playerTournamentId) {
    if (starredPlayers.has(playerTournamentId)) {
        // Supprimer l'étoile
        const { error } = await supabaseParrainPrive
            .from('player_stars')
            .delete()
            .eq('user_id', currentParrain.id)
            .eq('tournament_id', currentTournament.id)
            .eq('player_id', playerTournamentId);

        if (!error) {
            starredPlayers.delete(playerTournamentId);
        }
    } else {
        // Ajouter une étoile
        const { error } = await supabaseParrainPrive
            .from('player_stars')
            .insert([{
                user_id: currentParrain.id,
                tournament_id: currentTournament.id,
                player_id: playerTournamentId
            }]);

        if (!error) {
            starredPlayers.add(playerTournamentId);
        }
    }
    renderPlayersList();
}

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

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
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

// ===== GESTION DES SWIPES (mobile) =====
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
    const leftSidebar = document.getElementById('leftSidebar');
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
            supabaseParrainPrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page tournois (parrain)');

    const user = await checkSession();
    if (!user) return;

    await loadParrainProfile();
    if (!currentParrain) return;

    await loadTournaments();

    if (currentTournament) {
        await loadMessages(currentTournament.id);
        subscribeToMessages(currentTournament.id);
    }

    document.getElementById('openTournamentModal').addEventListener('click', openTournamentModal);

    // Rendre les fonctions globales pour les attributs onclick
    window.closeTournamentModal = closeTournamentModal;
    window.closePlayersModal = closePlayersModal;
    window.openPlayersModal = openPlayersModal;
    window.toggleStar = toggleStar;
    window.sendMessage = sendMessage;

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});