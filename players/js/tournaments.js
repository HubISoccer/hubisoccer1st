// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let currentTournament = null;
let tournaments = [];
let messages = []; // Messages du chat pour le tournoi courant
let starredPlayers = new Set(); // IDs des joueurs favoris

// ===== DONNÉES FICTIVES =====
const fakeTournaments = [
    {
        id: 1,
        name: "Coupe HubISoccer 2026 - Phase de groupes",
        date: "2026-03-03",
        streamUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        players: [
            { id: 101, name: "Koffi SOGLO", position: "Ailier droit", avatar: "img/user-default.jpg" },
            { id: 102, name: "Yao KOFFI", position: "Milieu offensif", avatar: "img/user-default.jpg" },
            { id: 103, name: "Amadou DIALLO", position: "Buteur", avatar: "img/user-default.jpg" },
            { id: 104, name: "Jean-Claude", position: "Défenseur central", avatar: "img/user-default.jpg" }
        ]
    },
    {
        id: 2,
        name: "Tournoi des Espoirs - Demi-finale",
        date: "2026-03-04",
        streamUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        players: [
            { id: 201, name: "Moussa TRAORE", position: "Gardien", avatar: "img/user-default.jpg" },
            { id: 202, name: "Ibrahim SOW", position: "Arrière droit", avatar: "img/user-default.jpg" }
        ]
    },
    {
        id: 3,
        name: "Ligue des Champions Junior",
        date: "2026-03-05",
        streamUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        players: [
            { id: 301, name: "Ousmane DEMBELE", position: "Ailier gauche", avatar: "img/user-default.jpg" }
        ]
    }
];

const fakeMessages = {
    1: [
        { id: 1, author: "Koffi S.", text: "Super match !", time: "15:30", userId: 1 },
        { id: 2, author: "Yao K.", text: "Allez l'équipe !", time: "15:32", userId: 2 },
        { id: 3, author: "Admin", text: "Belle action de Koffi !", time: "15:35", userId: 999 }
    ],
    2: [
        { id: 1, author: "Moussa", text: "Prêt pour la finale", time: "16:00", userId: 201 }
    ],
    3: []
};

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL =====
async function loadPlayerProfile() {
    if (!currentUser?.id) {
        playerProfile = { nom_complet: 'Joueur', id: 999 };
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('player_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            playerProfile = { nom_complet: 'Joueur', id: 999 };
        } else {
            playerProfile = data || { nom_complet: 'Joueur', id: 999 };
        }
        document.getElementById('userName').textContent = playerProfile.nom_complet || 'Joueur';
    } catch (err) {
        console.error('❌ Exception loadPlayerProfile :', err);
        playerProfile = { nom_complet: 'Joueur', id: 999 };
    }
}

// ===== INITIALISATION =====
function init() {
    tournaments = fakeTournaments;
    currentTournament = tournaments[0];
    messages = fakeMessages[currentTournament.id] || [];
    renderLiveTournament();
    renderTournamentList();
}

// ===== AFFICHAGE DU TOURNOI EN DIRECT =====
function renderLiveTournament() {
    const container = document.getElementById('liveTournament');
    container.innerHTML = `
        <div class="tournament-video">
            <iframe src="${currentTournament.streamUrl}" frameborder="0" allowfullscreen></iframe>
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

function renderChatMessages() {
    const chatDiv = document.getElementById('chatMessages');
    if (!chatDiv) return;
    chatDiv.innerHTML = '';
    messages.forEach(msg => {
        const isOwn = msg.userId === playerProfile.id || msg.author === playerProfile.nom_complet;
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${isOwn ? 'own' : ''}`;
        msgDiv.innerHTML = `
            <div class="author">${msg.author}</div>
            <div class="text">${msg.text}</div>
            <div class="time">${msg.time}</div>
        `;
        chatDiv.appendChild(msgDiv);
    });
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const newMsg = {
        id: Date.now(),
        author: playerProfile.nom_complet || 'Joueur',
        text: text,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        userId: playerProfile.id
    };
    messages.push(newMsg);
    renderChatMessages();
    input.value = '';
}

// ===== MODALE LISTE DES TOURNOIS =====
function openTournamentModal() {
    document.getElementById('tournamentModal').style.display = 'block';
}
function closeTournamentModal() {
    document.getElementById('tournamentModal').style.display = 'none';
}

function renderTournamentList() {
    const list = document.getElementById('tournamentList');
    list.innerHTML = '';
    tournaments.forEach(t => {
        const item = document.createElement('div');
        item.className = 'tournament-item';
        item.onclick = () => selectTournament(t.id);
        item.innerHTML = `
            <span class="tournament-item-name">${t.name}</span>
            <span class="tournament-item-date">${new Date(t.date).toLocaleDateString('fr-FR')}</span>
        `;
        list.appendChild(item);
    });
}

function selectTournament(id) {
    currentTournament = tournaments.find(t => t.id === id);
    messages = fakeMessages[id] || [];
    renderLiveTournament();
    closeTournamentModal();
}

// ===== MODALE FICHE JOUEURS =====
function openPlayersModal() {
    renderPlayersList();
    document.getElementById('playersModal').style.display = 'block';
}
function closePlayersModal() {
    document.getElementById('playersModal').style.display = 'none';
}

function renderPlayersList() {
    const list = document.getElementById('playersList');
    list.innerHTML = '';
    currentTournament.players.forEach(p => {
        const item = document.createElement('div');
        item.className = 'player-item';
        const isStarred = starredPlayers.has(p.id);
        item.innerHTML = `
            <div class="player-avatar"><i class="fas fa-user"></i></div>
            <div class="player-info">
                <div class="player-name">${p.name}</div>
                <div class="player-position">${p.position}</div>
            </div>
            <div class="player-star ${isStarred ? 'active' : ''}" onclick="toggleStar(${p.id})">
                <i class="fas fa-star"></i>
            </div>
        `;
        list.appendChild(item);
    });
}

function toggleStar(playerId) {
    if (starredPlayers.has(playerId)) {
        starredPlayers.delete(playerId);
    } else {
        starredPlayers.add(playerId);
    }
    renderPlayersList(); // Rafraîchir pour mettre à jour les étoiles
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

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!menuBtn || !sidebar || !closeBtn || !overlay) {
        console.warn('Éléments de la sidebar manquants');
        return;
    }

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    menuBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebarFunc);
    overlay.addEventListener('click', closeSidebarFunc);
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseClient.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION PRINCIPALE =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page tournaments');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    init();

    // Ouvrir/fermer modales
    document.getElementById('openTournamentModal').addEventListener('click', openTournamentModal);
    window.closeTournamentModal = closeTournamentModal;
    window.closePlayersModal = closePlayersModal;
    window.openPlayersModal = openPlayersModal;
    window.toggleStar = toggleStar;

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});