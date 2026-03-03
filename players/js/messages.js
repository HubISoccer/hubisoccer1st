// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let conversations = [];
let currentConversationId = null;
let replyingTo = null; // { id, content }
let searchTerm = '';

// ===== DONNÉES FICTIVES =====
const fakeConversations = [
    {
        id: 1,
        contactId: 101,
        contactName: "Jean-Michel Scout",
        avatar: null,
        online: true,
        lastMessage: "Bonjour, j'ai vu votre profil, intéressant !",
        lastTime: "2025-03-03T14:30:00",
        unread: 2,
        messages: [
            { id: 1001, from: "contact", content: "Bonjour, j'ai vu votre profil, intéressant !", time: "2025-03-03T14:30:00", read: true },
            { id: 1002, from: "me", content: "Merci beaucoup ! Je suis ouvert aux opportunités.", time: "2025-03-03T14:32:00", read: true },
            { id: 1003, from: "contact", content: "Aimeriez-vous passer un test la semaine prochaine ?", time: "2025-03-03T14:35:00", read: false }
        ]
    },
    {
        id: 2,
        contactId: 102,
        contactName: "Koffi (Académie)",
        avatar: null,
        online: false,
        lastMessage: "Rappel : entraînement demain 9h",
        lastTime: "2025-03-02T18:00:00",
        unread: 0,
        messages: [
            { id: 2001, from: "contact", content: "Salut ! Prêt pour le match de samedi ?", time: "2025-03-01T10:00:00", read: true },
            { id: 2002, from: "me", content: "Oui, je suis à fond !", time: "2025-03-01T10:05:00", read: true },
            { id: 2003, from: "contact", content: "Rappel : entraînement demain 9h", time: "2025-03-02T18:00:00", read: true }
        ]
    },
    {
        id: 3,
        contactId: 103,
        contactName: "Support HubISoccer",
        avatar: null,
        online: true,
        lastMessage: "Comment pouvons-nous vous aider ?",
        lastTime: "2025-03-03T09:00:00",
        unread: 0,
        messages: [
            { id: 3001, from: "contact", content: "Bienvenue sur HubISoccer !", time: "2025-02-28T08:00:00", read: true },
            { id: 3002, from: "contact", content: "Comment pouvons-nous vous aider ?", time: "2025-03-03T09:00:00", read: true }
        ]
    }
];

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

// ===== INITIALISATION DES DONNÉES =====
function initData() {
    conversations = fakeConversations.map(conv => ({
        ...conv,
        messages: conv.messages.map(m => ({ ...m, replyTo: null }))
    }));
    if (conversations.length > 0) {
        currentConversationId = conversations[0].id;
    }
}

// ===== RENDU DE LA LISTE DES CONVERSATIONS =====
function renderConversations() {
    const list = document.getElementById('conversationsList');
    if (!list) return;

    const filtered = conversations.filter(conv =>
        conv.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    list.innerHTML = filtered.map(conv => {
        const lastMsg = conv.messages[conv.messages.length - 1];
        const lastTime = new Date(lastMsg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const unread = conv.messages.filter(m => !m.read && m.from !== 'me').length;
        const isActive = conv.id === currentConversationId;
        const avatarHtml = `<div class="conversation-avatar ${conv.online ? 'online' : ''}"><i class="fas fa-user"></i></div>`;

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" data-conv-id="${conv.id}">
                ${avatarHtml}
                <div class="conversation-info">
                    <div class="conversation-name">
                        <span>${conv.contactName}</span>
                        <span class="conversation-time">${lastTime}</span>
                    </div>
                    <div class="conversation-last">
                        ${lastMsg.content.substring(0, 30)}${lastMsg.content.length > 30 ? '…' : ''}
                        ${unread > 0 ? `<span class="conversation-badge">${unread}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Ajouter les événements de clic
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const convId = parseInt(item.dataset.convId);
            selectConversation(convId);
        });
    });
}

// ===== SÉLECTION D'UNE CONVERSATION =====
function selectConversation(convId) {
    currentConversationId = convId;
    // Marquer les messages comme lus
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
        conv.messages.forEach(m => { if (m.from !== 'me') m.read = true; });
    }
    renderConversations();
    renderChat();
    // Sur mobile, on pourrait cacher la liste et montrer le chat
    if (window.innerWidth <= 900) {
        document.querySelector('.conversations-panel').classList.remove('mobile-show');
        document.querySelector('.chat-panel').classList.remove('mobile-hide');
    }
}

// ===== RENDU DU CHAT =====
function renderChat() {
    const conv = conversations.find(c => c.id === currentConversationId);
    const chatHeader = document.getElementById('chatHeader');
    const chatMessagesArea = document.getElementById('chatMessagesArea');
    const chatInputArea = document.getElementById('chatInputArea');

    if (!conv) {
        chatHeader.innerHTML = '<div class="chat-header">Sélectionnez une conversation</div>';
        chatMessagesArea.innerHTML = '';
        chatInputArea.innerHTML = '';
        return;
    }

    // En-tête
    const contact = conv;
    chatHeader.innerHTML = `
        <div class="chat-contact">
            <div class="chat-contact-avatar ${contact.online ? 'online' : ''}"><i class="fas fa-user"></i></div>
            <div class="chat-contact-info">
                <h3>${contact.contactName}</h3>
                <p>${contact.online ? 'En ligne' : 'Hors ligne'}</p>
            </div>
        </div>
        <div class="chat-actions">
            <button class="chat-action-btn" title="Bloquer" onclick="blockContact(${contact.id})"><i class="fas fa-ban"></i></button>
            <button class="chat-action-btn" title="Archiver" onclick="archiveContact(${contact.id})"><i class="fas fa-archive"></i></button>
            <button class="chat-action-btn" title="Inviter" onclick="inviteContact(${contact.id})"><i class="fas fa-user-plus"></i></button>
        </div>
    `;

    // Messages
    chatMessagesArea.innerHTML = conv.messages.map(msg => {
        const isMe = msg.from === 'me';
        const time = new Date(msg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const replyQuote = msg.replyTo ? `<div class="reply-quote">${msg.replyTo.content}</div>` : '';

        return `
            <div class="message-bubble ${isMe ? 'outgoing' : 'incoming'}" data-msg-id="${msg.id}">
                ${replyQuote}
                <div class="message-content">${msg.content}</div>
                <span class="message-time">${time}</span>
                <div class="message-actions">
                    <button class="message-action" onclick="replyToMessage(${msg.id})"><i class="fas fa-reply"></i> Répondre</button>
                    <button class="message-action" onclick="copyMessage(${msg.id})"><i class="fas fa-copy"></i> Copier</button>
                </div>
            </div>
        `;
    }).join('');

    // Zone de saisie
    const replyIndicator = replyingTo ? `
        <div class="reply-indicator">
            <span><i class="fas fa-reply"></i> Réponse à : "${replyingTo.content.substring(0, 30)}${replyingTo.content.length > 30 ? '…' : ''}"</span>
            <button class="cancel-reply" onclick="cancelReply()"><i class="fas fa-times"></i></button>
        </div>
    ` : '';

    chatInputArea.innerHTML = `
        <form class="message-form" id="messageForm" onsubmit="sendMessage(event)">
            ${replyIndicator}
            <div class="input-row">
                <button type="button" class="attach-btn" onclick="attachFile()"><i class="fas fa-paperclip"></i></button>
                <div class="message-input-wrapper">
                    <textarea class="message-input" id="messageInput" placeholder="Votre message..." rows="1"></textarea>
                </div>
                <button type="button" class="emoji-btn" onclick="openEmoji()"><i class="fas fa-smile"></i></button>
                <button type="button" class="sticker-btn" onclick="openSticker()"><i class="fas fa-sticker-mule"></i></button>
                <button type="submit" class="send-btn"><i class="fas fa-paper-plane"></i></button>
            </div>
        </form>
    `;

    // Auto-resize textarea
    const textarea = document.getElementById('messageInput');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    // Scroll en bas
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

// ===== ENVOI D'UN MESSAGE =====
function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;

    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;

    const newMsg = {
        id: Date.now(),
        from: 'me',
        content: content,
        time: new Date().toISOString(),
        read: true,
        replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content } : null
    };
    conv.messages.push(newMsg);
    conv.lastMessage = content;
    conv.lastTime = newMsg.time;
    if (replyingTo) cancelReply();

    input.value = '';
    input.style.height = 'auto';

    renderConversations();
    renderChat();
}

// ===== ACTIONS =====
function replyToMessage(msgId) {
    const conv = conversations.find(c => c.id === currentConversationId);
    const msg = conv?.messages.find(m => m.id === msgId);
    if (msg) {
        replyingTo = { id: msg.id, content: msg.content };
        renderChat();
    }
}

function cancelReply() {
    replyingTo = null;
    renderChat();
}

function copyMessage(msgId) {
    const conv = conversations.find(c => c.id === currentConversationId);
    const msg = conv?.messages.find(m => m.id === msgId);
    if (msg) {
        navigator.clipboard.writeText(msg.content);
        alert('Message copié !');
    }
}

function blockContact(convId) {
    alert(`Contact ${convId} bloqué (simulation)`);
}

function archiveContact(convId) {
    alert(`Conversation ${convId} archivée (simulation)`);
}

function inviteContact(convId) {
    alert(`Invitation envoyée à ${convId} (simulation)`);
}

function attachFile() {
    alert('Fonction d\'attachement de fichier (simulation)');
}

function openEmoji() {
    alert('Sélecteur d\'émoji (simulation)');
}

function openSticker() {
    alert('Sélecteur de sticker (simulation)');
}

// ===== RECHERCHE =====
function initSearch() {
    const searchInput = document.getElementById('searchConv');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderConversations();
        });
    }
}

// ===== RESPONSIVE (bouton retour mobile) =====
function initMobileNav() {
    if (window.innerWidth <= 900) {
        // Ajouter un bouton retour dans le chat header
        const chatHeader = document.getElementById('chatHeader');
        const backBtn = document.createElement('button');
        backBtn.className = 'chat-action-btn mobile-back-btn';
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
        backBtn.onclick = () => {
            document.querySelector('.conversations-panel').classList.add('mobile-show');
            document.querySelector('.chat-panel').classList.add('mobile-hide');
        };
        chatHeader.prepend(backBtn);
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

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);
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
    console.log('🚀 Initialisation de la page messages');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    initData();
    renderConversations();
    if (currentConversationId) renderChat();

    initSearch();
    initMobileNav();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});