// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseMessages = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let conversations = [];
let currentConversationId = null;
let messagesSubscription = null;
let conversationsSubscription = null;
let replyingTo = null;
let searchTerm = '';
let targetUserId = null;

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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    const { data: { session }, error } = await supabaseMessages.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    const { data, error } = await supabaseMessages
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    if (error) {
        console.error('Erreur chargement profil:', error);
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = currentProfile.nom_complet || 'Joueur';
    document.getElementById('userAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    return currentProfile;
}

// ===== CHARGEMENT DES CONVERSATIONS =====
async function loadConversations() {
    console.log('Chargement des conversations...');
    const { data, error } = await supabaseMessages
        .from('player_conversations')
        .select(`
            id,
            participant1_id,
            participant2_id,
            last_message_content,
            last_message_time,
            participant1:player_profiles!participant1_id (id, nom_complet, avatar_url, hub_id),
            participant2:player_profiles!participant2_id (id, nom_complet, avatar_url, hub_id)
        `)
        .or(`participant1_id.eq.${currentProfile.id},participant2_id.eq.${currentProfile.id}`)
        .order('last_message_time', { ascending: false, nullsFirst: false });

    if (error) {
        console.error('Erreur chargement conversations:', error);
        return;
    }

    conversations = data.map(conv => {
        const contact = (conv.participant1.id === currentProfile.id) ? conv.participant2 : conv.participant1;
        // Sécuriser le nom du contact
        const contactName = contact?.nom_complet || 'Utilisateur inconnu';
        return {
            id: conv.id,
            contactId: contact?.id,
            contactName: contactName,
            contactAvatar: contact?.avatar_url,
            lastMessage: conv.last_message_content,
            lastTime: conv.last_message_time,
            unread: 0,
            online: false
        };
    });

    renderConversations();
}

// ===== RENDU DES CONVERSATIONS =====
function renderConversations() {
    const list = document.getElementById('conversationsList');
    if (!list) return;

    const filtered = conversations.filter(conv =>
        (conv.contactName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    list.innerHTML = filtered.map(conv => {
        const lastTime = conv.lastTime ? new Date(conv.lastTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        const isActive = conv.id === currentConversationId;

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" data-conv-id="${conv.id}">
                <div class="conversation-avatar ${conv.online ? 'online' : ''}">
                    <img src="${conv.contactAvatar || 'img/user-default.jpg'}" alt="Avatar">
                </div>
                <div class="conversation-info">
                    <div class="conversation-name">
                        <span>${conv.contactName}</span>
                        <span class="conversation-time">${lastTime}</span>
                    </div>
                    <div class="conversation-last">
                        ${conv.lastMessage ? conv.lastMessage.substring(0, 30) : ''}${conv.lastMessage && conv.lastMessage.length > 30 ? '…' : ''}
                        ${conv.unread > 0 ? `<span class="conversation-badge">${conv.unread}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const convId = parseInt(item.dataset.convId);
            selectConversation(convId);
        });
    });
}

// ===== CRÉER UNE CONVERSATION AVEC UN UTILISATEUR =====
async function findOrCreateConversationWithUser(userId) {
    console.log('Recherche/création conversation avec utilisateur', userId);

    const { data: existingConv, error: searchError } = await supabaseMessages
        .from('player_conversations')
        .select('id')
        .or(`and(participant1_id.eq.${currentProfile.id},participant2_id.eq.${userId}),and(participant1_id.eq.${userId},participant2_id.eq.${currentProfile.id})`)
        .maybeSingle();

    if (searchError) {
        console.error('Erreur recherche conversation:', searchError);
        return null;
    }

    if (existingConv) {
        console.log('Conversation existante trouvée', existingConv.id);
        return existingConv.id;
    }

    const { data: newConv, error: createError } = await supabaseMessages
        .from('player_conversations')
        .insert([{
            participant1_id: currentProfile.id,
            participant2_id: userId
        }])
        .select()
        .single();

    if (createError) {
        console.error('Erreur création conversation:', createError);
        return null;
    }

    console.log('Nouvelle conversation créée', newConv.id);
    return newConv.id;
}

// ===== SÉLECTION D'UNE CONVERSATION =====
async function selectConversation(convId) {
    console.log('Sélection conversation', convId);
    if (messagesSubscription) messagesSubscription.unsubscribe();
    currentConversationId = convId;
    renderConversations();
    await loadMessages(convId);

    messagesSubscription = supabaseMessages
        .channel(`player_messages:${convId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'player_messages',
            filter: `conversation_id=eq.${convId}`
        }, payload => {
            console.log('Nouveau message reçu', payload.new);
            if (currentConversationId === convId) {
                appendMessage(payload.new);
            }
            updateConversationLastMessage(convId, payload.new);
        })
        .subscribe();

    if (window.innerWidth <= 900) {
        document.querySelector('.conversations-panel').classList.add('hide');
        document.querySelector('.chat-panel').classList.remove('hide');
    }
}

// ===== CHARGEMENT DES MESSAGES =====
async function loadMessages(convId) {
    console.log('Chargement des messages pour conversation', convId);
    const { data, error } = await supabaseMessages
        .from('player_messages')
        .select(`
            id,
            sender_id,
            content,
            reply_to_id,
            created_at,
            reply:reply_to_id (content)
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur chargement messages:', error);
        return;
    }

    renderMessages(data);
}

// ===== RENDU DES MESSAGES =====
function renderMessages(messages) {
    const area = document.getElementById('chatMessagesArea');
    if (!area) return;
    let html = '';
    messages.forEach(msg => {
        const isMe = msg.sender_id === currentProfile.id;
        const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const replyQuote = msg.reply ? `<div class="reply-quote">${msg.reply.content}</div>` : '';
        html += `
            <div class="message-bubble ${isMe ? 'outgoing' : 'incoming'}" data-msg-id="${msg.id}">
                ${replyQuote}
                <div class="message-content">${msg.content}</div>
                <span class="message-time">${time}</span>
                <div class="message-actions">
                    <button class="message-action" onclick="replyToMessage(${msg.id})"><i class="fas fa-reply"></i></button>
                    <button class="message-action" onclick="copyMessage('${msg.content}')"><i class="fas fa-copy"></i></button>
                    ${isMe ? `<button class="message-action delete" onclick="deleteMessage(${msg.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });
    area.innerHTML = html;
    area.scrollTop = area.scrollHeight;
}

// ===== AJOUTER UN MESSAGE (Realtime) =====
function appendMessage(msg) {
    const area = document.getElementById('chatMessagesArea');
    if (!area) return;
    const isMe = msg.sender_id === currentProfile.id;
    const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const replyHtml = msg.reply_to_id ? `<div class="reply-quote">Réponse à un message</div>` : '';
    const msgHtml = `
        <div class="message-bubble ${isMe ? 'outgoing' : 'incoming'}" data-msg-id="${msg.id}">
            ${replyHtml}
            <div class="message-content">${msg.content}</div>
            <span class="message-time">${time}</span>
            <div class="message-actions">
                <button class="message-action" onclick="replyToMessage(${msg.id})"><i class="fas fa-reply"></i></button>
                <button class="message-action" onclick="copyMessage('${msg.content}')"><i class="fas fa-copy"></i></button>
                ${isMe ? `<button class="message-action delete" onclick="deleteMessage(${msg.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>
    `;
    area.insertAdjacentHTML('beforeend', msgHtml);
    area.scrollTop = area.scrollHeight;
}

function updateConversationLastMessage(convId, msg) {
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
        conv.lastMessage = msg.content;
        conv.lastTime = msg.created_at;
        renderConversations();
    }
}

// ===== ENVOI D'UN MESSAGE =====
async function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;

    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) {
        showToast('Aucune conversation sélectionnée', 'error');
        return;
    }

    console.log('Envoi message:', content);

    const { data: newMsg, error: msgError } = await supabaseMessages
        .from('player_messages')
        .insert({
            conversation_id: currentConversationId,
            sender_id: currentProfile.id,
            content: content,
            reply_to_id: replyingTo ? replyingTo.id : null
        })
        .select()
        .single();

    if (msgError) {
        console.error('Erreur envoi message:', msgError);
        showToast('Erreur lors de l\'envoi', 'error');
        return;
    }

    await supabaseMessages
        .from('player_conversations')
        .update({
            last_message_content: content,
            last_message_time: new Date().toISOString()
        })
        .eq('id', currentConversationId);

    input.value = '';
    input.style.height = 'auto';
    if (replyingTo) cancelReply();
}

// ===== SUPPRESSION D'UN MESSAGE =====
async function deleteMessage(msgId) {
    if (!confirm('Supprimer ce message ?')) return;
    const { error } = await supabaseMessages
        .from('player_messages')
        .delete()
        .eq('id', msgId)
        .eq('sender_id', currentProfile.id);
    if (error) {
        showToast('Erreur lors de la suppression', 'error');
    } else {
        await loadMessages(currentConversationId);
    }
}

// ===== RÉPONDRE =====
function replyToMessage(msgId) {
    const msgElement = document.querySelector(`[data-msg-id="${msgId}"] .message-content`);
    if (msgElement) {
        replyingTo = { id: msgId, content: msgElement.textContent };
        renderChatInput();
        document.getElementById('messageInput').focus();
    }
}

function cancelReply() {
    replyingTo = null;
    renderChatInput();
}

function renderChatInput() {
    const area = document.getElementById('chatInputArea');
    if (!area) return;
    const replyIndicator = replyingTo ? `
        <div class="reply-indicator">
            <span><i class="fas fa-reply"></i> Réponse à : "${replyingTo.content.substring(0, 30)}${replyingTo.content.length > 30 ? '…' : ''}"</span>
            <button class="cancel-reply" onclick="cancelReply()"><i class="fas fa-times"></i></button>
        </div>
    ` : '';
    area.innerHTML = `
        <form class="message-form" id="messageForm" onsubmit="sendMessage(event)">
            ${replyIndicator}
            <div class="input-row">
                <button type="button" class="attach-btn" onclick="showToast('Fonction à venir','info')"><i class="fas fa-paperclip"></i></button>
                <div class="message-input-wrapper">
                    <textarea class="message-input" id="messageInput" placeholder="Votre message..." rows="1"></textarea>
                </div>
                <button type="button" class="emoji-btn" onclick="showToast('Fonction à venir','info')"><i class="fas fa-smile"></i></button>
                <button type="button" class="sticker-btn" onclick="showToast('Fonction à venir','info')"><i class="fas fa-sticker-mule"></i></button>
                <button type="submit" class="send-btn"><i class="fas fa-paper-plane"></i></button>
            </div>
        </form>
    `;

    const textarea = document.getElementById('messageInput');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
}

// ===== ACTIONS DIVERSES =====
function copyMessage(text) {
    navigator.clipboard.writeText(text);
    showToast('Message copié !', 'success');
}

function backToConversations() {
    document.querySelector('.conversations-panel').classList.remove('hide');
    document.querySelector('.chat-panel').classList.add('hide');
}

// ===== MESSAGE DE BIENVENUE AUTOMATIQUE =====
async function ensureSupportConversation() {
    console.log('Création conversation support...');
    let supportProfileId;

    const { data: supportData, error: searchError } = await supabaseMessages
        .from('player_profiles')
        .select('id')
        .eq('hub_id', 'SUPPORT')
        .maybeSingle();

    if (searchError) {
        console.error('Erreur recherche support:', searchError);
        return;
    }

    if (!supportData) {
        const { data: newSupport, error: insertError } = await supabaseMessages
            .from('player_profiles')
            .insert([{
                user_id: null,
                hub_id: 'SUPPORT',
                nom_complet: 'Support HubISoccer',
                avatar_url: 'img/user-default.jpg'
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Erreur création support:', insertError);
            return;
        }
        supportProfileId = newSupport.id;
    } else {
        supportProfileId = supportData.id;
    }

    const { data: existingConv, error: convCheckError } = await supabaseMessages
        .from('player_conversations')
        .select('id')
        .or(`and(participant1_id.eq.${currentProfile.id},participant2_id.eq.${supportProfileId}),and(participant1_id.eq.${supportProfileId},participant2_id.eq.${currentProfile.id})`)
        .maybeSingle();

    if (convCheckError) {
        console.error('Erreur vérification conversation support:', convCheckError);
        return;
    }

    if (existingConv) {
        console.log('Conversation support déjà existante');
        return;
    }

    const { data: newConv, error: convError } = await supabaseMessages
        .from('player_conversations')
        .insert([{
            participant1_id: currentProfile.id,
            participant2_id: supportProfileId
        }])
        .select()
        .single();

    if (convError) {
        console.error('Erreur création conversation support:', convError);
        return;
    }

    const { error: msgError } = await supabaseMessages
        .from('player_messages')
        .insert([{
            conversation_id: newConv.id,
            sender_id: supportProfileId,
            content: 'Bienvenue sur HubISoccer ! Nous sommes là pour vous aider. N\'hésitez pas à poser vos questions.'
        }]);

    if (msgError) {
        console.error('Erreur envoi message bienvenue:', msgError);
    } else {
        console.log('Message de bienvenue envoyé');
        await loadConversations();
    }
}

// ===== RECHERCHE =====
function initSearch() {
    const input = document.getElementById('searchConv');
    if (input) {
        input.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderConversations();
        });
    }
}

// ===== SOUSCRIPTION AUX NOUVELLES CONVERSATIONS =====
function subscribeToNewConversations() {
    conversationsSubscription = supabaseMessages
        .channel('player_conversations_changes')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'player_conversations',
            filter: `participant1_id=eq.${currentProfile.id} OR participant2_id=eq.${currentProfile.id}`
        }, async (payload) => {
            console.log('Nouvelle conversation créée', payload.new);
            // Recharger les conversations pour mettre à jour la liste
            await loadConversations();
        })
        .subscribe();
}

// ===== GESTION DES SWIPES =====
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
    const leftSidebar = document.getElementById('sidebar');
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

// ===== MENU UTILISATEUR =====
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

// ===== SIDEBAR GAUCHE =====
function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
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

// ===== DÉCONNEXION =====
function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseMessages.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== EXTRAIRE LE PARAMÈTRE "TO" DE L'URL =====
function getTargetUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const to = urlParams.get('to');
    return to ? parseInt(to) : null;
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation messages');

    const user = await checkSession();
    if (!user) return;

    await loadProfile();

    targetUserId = getTargetUserIdFromUrl();
    console.log('Target user ID from URL:', targetUserId);

    await loadConversations();
    await ensureSupportConversation();

    // Souscrire aux nouvelles conversations
    subscribeToNewConversations();

    if (targetUserId && targetUserId !== currentProfile.id) {
        const convId = await findOrCreateConversationWithUser(targetUserId);
        if (convId) {
            await loadConversations(); // recharger pour inclure la nouvelle
            await selectConversation(convId);
        } else {
            showToast('Impossible de créer la conversation', 'error');
        }
    }

    renderChatInput();

    if (window.innerWidth <= 900) {
        document.querySelector('.conversations-panel')?.classList.remove('hide');
        document.querySelector('.chat-panel')?.classList.add('hide');
    }

    initSearch();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});

// Fonctions globales
window.backToConversations = backToConversations;
window.sendMessage = sendMessage;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.copyMessage = copyMessage;
window.deleteMessage = deleteMessage;
window.attachFile = () => showToast('Fonction à venir', 'info');
window.openEmoji = () => showToast('Fonction à venir', 'info');
window.openSticker = () => showToast('Fonction à venir', 'info');