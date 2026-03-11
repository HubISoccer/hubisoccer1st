// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let conversations = [];
let currentConversationId = null;
let messagesSubscription = null;
let replyingTo = null;
let searchTerm = '';

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const div = document.createElement('div');
        div.id = 'toastContainer';
        div.className = 'toast-container';
        document.body.appendChild(div);
        container = div;
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
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
        .from('conversations')
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
        return {
            id: conv.id,
            contactId: contact.id,
            contactName: contact.nom_complet,
            contactAvatar: contact.avatar_url,
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
        conv.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    list.innerHTML = filtered.map(conv => {
        const lastTime = conv.lastTime ? new Date(conv.lastTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        const isActive = conv.id === currentConversationId;

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" data-conv-id="${conv.id}">
                <div class="conversation-avatar ${conv.online ? 'online' : ''}">
                    <img src="${conv.contactAvatar || 'img/user-default.jpg'}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
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

// ===== SÉLECTION D'UNE CONVERSATION =====
async function selectConversation(convId) {
    if (messagesSubscription) messagesSubscription.unsubscribe();
    currentConversationId = convId;
    renderConversations();
    await loadMessages(convId);
    messagesSubscription = supabase
        .channel(`messages:${convId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, payload => {
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
    const { data, error } = await supabase
        .from('messages')
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
    const conv = conversations.find(c => c.id === currentConversationId);
    const contactName = conv ? conv.contactName : 'Contact';
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
    const replyHtml = msg.reply_to_id ? `<div class="reply-quote">${msg.reply_content || ''}</div>` : '';
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
    if (!conv) return;

    const newMsg = {
        conversation_id: currentConversationId,
        sender_id: currentProfile.id,
        content: content,
        reply_to_id: replyingTo ? replyingTo.id : null
    };
    const { error } = await supabase
        .from('messages')
        .insert(newMsg)
        .select()
        .single();
    if (error) {
        showToast('Erreur lors de l\'envoi', 'error');
        return;
    }
    await supabase
        .from('conversations')
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
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msgId)
        .eq('sender_id', currentProfile.id);
    if (error) showToast('Erreur lors de la suppression', 'error');
    else await loadMessages(currentConversationId);
}

// ===== RÉPONDRE =====
function replyToMessage(msgId) {
    const msgElement = document.querySelector(`[data-msg-id="${msgId}"] .message-content`);
    if (msgElement) {
        replyingTo = { id: msgId, content: msgElement.textContent };
        renderChatInput();
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
    let supportProfileId;
    const { data: supportData } = await supabase
        .from('player_profiles')
        .select('id')
        .eq('hub_id', 'SUPPORT')
        .maybeSingle();
    if (!supportData) {
        const { data: newSupport, error } = await supabase
            .from('player_profiles')
            .insert([{
                user_id: null,
                hub_id: 'SUPPORT',
                nom_complet: 'Support HubISoccer',
                avatar_url: 'img/support.jpg'
            }])
            .select()
            .single();
        if (error) {
            console.error('Erreur création support:', error);
            return;
        }
        supportProfileId = newSupport.id;
    } else {
        supportProfileId = supportData.id;
    }
    const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${currentProfile.id},participant2_id.eq.${supportProfileId}),and(participant1_id.eq.${supportProfileId},participant2_id.eq.${currentProfile.id})`)
        .maybeSingle();
    if (existingConv) return;
    const { data: newConv, error: convError } = await supabase
        .from('conversations')
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
    await supabase
        .from('messages')
        .insert([{
            conversation_id: newConv.id,
            sender_id: supportProfileId,
            content: 'Bienvenue sur HubISoccer ! Nous sommes là pour vous aider. N\'hésitez pas à poser vos questions.'
        }]);
    await loadConversations();
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

// ===== MENU UTILISATEUR =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    userMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown?.classList.remove('show'));
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    function openSidebar() { sidebar?.classList.add('active'); overlay?.classList.add('active'); }
    function closeSidebarFunc() { sidebar?.classList.remove('active'); overlay?.classList.remove('active'); }
    menuBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebarFunc);
    overlay?.addEventListener('click', closeSidebarFunc);
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabase.auth.signOut().then(() => window.location.href = '../index.html');
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation messages');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadConversations();
    await ensureSupportConversation();
    renderConversations();
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
