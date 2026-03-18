// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseMessages = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let conversations = [];
let currentConversationId = null;
let currentContact = null; // objet contact pour la conversation en cours
let messagesSubscription = null;
let conversationsSubscription = null;
let replyingTo = null;
let searchTerm = '';
let targetUserId = null;
let attachments = [];
let contextMenuMsgId = null; // pour le menu contextuel

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
        const onlineClass = conv.online ? 'online' : '';

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" data-conv-id="${conv.id}">
                <div class="conversation-avatar ${onlineClass}">
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

    // Récupérer le contact
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
        const { data: contactProfile } = await supabaseMessages
            .from('player_profiles')
            .select('*')
            .eq('id', conv.contactId)
            .single();
        currentContact = contactProfile;
    }

    renderConversations();
    await loadMessages(convId);
    renderChatHeader();

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
            attachment_url,
            reply_to_id,
            created_at,
            reply:reply_to_id (content, attachment_url)
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
        let replyHtml = '';
        if (msg.reply) {
            const replyContent = msg.reply.content ? `<span>${msg.reply.content}</span>` : '';
            const replyAttachment = msg.reply.attachment_url ? `<i class="fas fa-image"></i> Image` : '';
            replyHtml = `<div class="reply-quote">${replyContent} ${replyAttachment}</div>`;
        }
        let attachmentHtml = '';
        if (msg.attachment_url) {
            attachmentHtml = `<div class="message-attachment"><img src="${msg.attachment_url}" alt="Image" onclick="window.open('${msg.attachment_url}', '_blank')"></div>`;
        }
        html += `
            <div class="message-bubble ${isMe ? 'outgoing' : 'incoming'}" data-msg-id="${msg.id}" data-sender="${msg.sender_id}">
                ${replyHtml}
                ${attachmentHtml}
                <div class="message-content">${msg.content || ''}</div>
                <span class="message-time">${time}</span>
                <div class="message-actions">
                    <button class="message-action" onclick="event.stopPropagation(); showContextMenu(event, ${msg.id})"><i class="fas fa-ellipsis-v"></i></button>
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
    let replyHtml = '';
    if (msg.reply_to_id) {
        replyHtml = `<div class="reply-quote">Réponse à un message</div>`;
    }
    let attachmentHtml = '';
    if (msg.attachment_url) {
        attachmentHtml = `<div class="message-attachment"><img src="${msg.attachment_url}" alt="Image" onclick="window.open('${msg.attachment_url}', '_blank')"></div>`;
    }
    const msgHtml = `
        <div class="message-bubble ${isMe ? 'outgoing' : 'incoming'}" data-msg-id="${msg.id}" data-sender="${msg.sender_id}">
            ${replyHtml}
            ${attachmentHtml}
            <div class="message-content">${msg.content || ''}</div>
            <span class="message-time">${time}</span>
            <div class="message-actions">
                <button class="message-action" onclick="event.stopPropagation(); showContextMenu(event, ${msg.id})"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        </div>
    `;
    area.insertAdjacentHTML('beforeend', msgHtml);
    area.scrollTop = area.scrollHeight;
}

function updateConversationLastMessage(convId, msg) {
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
        conv.lastMessage = msg.content || (msg.attachment_url ? '📷 Image' : '');
        conv.lastTime = msg.created_at;
        renderConversations();
    }
}

// ===== ENVOI D'UN MESSAGE (avec upload) =====
async function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    const fileInput = document.getElementById('fileInput');
    const files = fileInput ? fileInput.files : [];

    if (!content && files.length === 0 && attachments.length === 0) {
        showToast('Veuillez écrire un message ou joindre un fichier', 'warning');
        return;
    }

    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) {
        showToast('Aucune conversation sélectionnée', 'error');
        return;
    }

    // Gérer les fichiers (images) sélectionnés
    let attachmentUrls = [];
    if (files.length > 0) {
        for (let file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentProfile.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const bucket = 'message-attachments';
            const { error: uploadError } = await supabaseMessages.storage
                .from(bucket)
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
            if (uploadError) {
                console.error('Erreur upload:', uploadError);
                showToast('Erreur lors de l\'upload de l\'image', 'error');
                return;
            }
            const { data: urlData } = supabaseMessages.storage.from(bucket).getPublicUrl(fileName);
            attachmentUrls.push(urlData.publicUrl);
        }
    }

    // Envoyer un message pour chaque fichier (ou un seul message texte)
    if (attachmentUrls.length > 0) {
        for (let url of attachmentUrls) {
            await insertMessage(conv.id, content, url);
        }
    } else {
        await insertMessage(conv.id, content, null);
    }

    // Réinitialiser
    input.value = '';
    input.style.height = 'auto';
    if (fileInput) fileInput.value = '';
    attachments = [];
    document.querySelector('.attachment-preview')?.remove();
    if (replyingTo) cancelReply();
}

async function insertMessage(conversationId, content, attachmentUrl) {
    const { data: newMsg, error: msgError } = await supabaseMessages
        .from('player_messages')
        .insert({
            conversation_id: conversationId,
            sender_id: currentProfile.id,
            content: content,
            reply_to_id: replyingTo ? replyingTo.id : null,
            attachment_url: attachmentUrl
        })
        .select()
        .single();

    if (msgError) {
        console.error('Erreur envoi message:', msgError);
        showToast('Erreur lors de l\'envoi', 'error');
        return;
    }

    // Mettre à jour la conversation avec le dernier message
    const lastContent = attachmentUrl ? '📷 Image' : content;
    await supabaseMessages
        .from('player_conversations')
        .update({
            last_message_content: lastContent,
            last_message_time: new Date().toISOString()
        })
        .eq('id', conversationId);
}

// ===== GESTION DES FICHIERS =====
function openFilePicker() {
    let fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'fileInput';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.multiple = true;
        document.body.appendChild(fileInput);
        fileInput.addEventListener('change', handleFileSelect);
    }
    fileInput.click();
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    // Afficher une prévisualisation
    let preview = document.querySelector('.attachment-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'attachment-preview';
        document.getElementById('chatInputArea').appendChild(preview);
    }
    preview.innerHTML = '';
    for (let file of files) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.margin = '5px';
            img.style.borderRadius = '5px';
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
    showToast(`${files.length} fichier(s) sélectionné(s)`, 'info');
}

// ===== SUPPRESSION D'UN MESSAGE =====
async function deleteMessage(msgId, forEveryone = false) {
    if (!confirm('Supprimer ce message ?')) return;
    if (forEveryone) {
        // Supprimer pour tous (seulement si l'utilisateur est l'expéditeur)
        const { error } = await supabaseMessages
            .from('player_messages')
            .delete()
            .eq('id', msgId);
        if (error) {
            showToast('Erreur lors de la suppression', 'error');
        } else {
            showToast('Message supprimé pour tous', 'success');
            await loadMessages(currentConversationId);
        }
    } else {
        // Supprimer uniquement pour l'utilisateur : on pourrait marquer comme supprimé ou cacher côté client
        // Pour l'instant, on cache simplement l'élément DOM
        const msgElement = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgElement) msgElement.remove();
        showToast('Message supprimé (visible seulement pour vous)', 'success');
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

// ===== MENU CONTEXTUEL =====
function showContextMenu(event, msgId) {
    event.preventDefault();
    contextMenuMsgId = msgId;
    const menu = document.getElementById('messageContextMenu');
    const msgElement = document.querySelector(`[data-msg-id="${msgId}"]`);
    const senderId = msgElement?.dataset.sender;
    const isMe = senderId == currentProfile.id;

    // Afficher ou masquer l'option "Supprimer pour tous" si c'est l'expéditeur
    const deleteForEveryoneOption = document.getElementById('deleteForEveryoneOption');
    if (deleteForEveryoneOption) {
        deleteForEveryoneOption.style.display = isMe ? 'block' : 'none';
    }

    // Positionner le menu près du clic
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    menu.style.display = 'block';

    // Fermer au clic suivant
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
        }
    });
}

function copyMessageFromMenu() {
    const msgElement = document.querySelector(`[data-msg-id="${contextMenuMsgId}"] .message-content`);
    if (msgElement) {
        navigator.clipboard.writeText(msgElement.textContent);
        showToast('Message copié !', 'success');
    }
    document.getElementById('messageContextMenu').style.display = 'none';
}

function replyToMessageFromMenu() {
    replyToMessage(contextMenuMsgId);
    document.getElementById('messageContextMenu').style.display = 'none';
}

function deleteForMe() {
    deleteMessage(contextMenuMsgId, false);
    document.getElementById('messageContextMenu').style.display = 'none';
}

function deleteForEveryone() {
    deleteMessage(contextMenuMsgId, true);
    document.getElementById('messageContextMenu').style.display = 'none';
}

// ===== ACTIONS SUR LA CONVERSATION =====
function archiveConversation() {
    // Implémenter l'archivage (table séparée)
    showToast('Fonctionnalité d\'archivage à venir', 'info');
}

function blockUser() {
    if (!currentContact) return;
    if (confirm(`Bloquer ${currentContact.nom_complet} ? Vous ne recevrez plus de messages de sa part.`)) {
        // Implémenter le blocage
        showToast('Fonctionnalité de blocage à venir', 'info');
    }
}

function openDeleteConvModal() {
    document.getElementById('deleteConvModal').style.display = 'block';
}
function closeDeleteConvModal() {
    document.getElementById('deleteConvModal').style.display = 'none';
}
async function confirmDeleteConversation() {
    if (!currentConversationId) return;
    // Supprimer tous les messages puis la conversation
    const { error: msgError } = await supabaseMessages
        .from('player_messages')
        .delete()
        .eq('conversation_id', currentConversationId);
    if (msgError) {
        showToast('Erreur lors de la suppression des messages', 'error');
        return;
    }
    const { error: convError } = await supabaseMessages
        .from('player_conversations')
        .delete()
        .eq('id', currentConversationId);
    if (convError) {
        showToast('Erreur lors de la suppression de la conversation', 'error');
        return;
    }
    showToast('Conversation supprimée', 'success');
    closeDeleteConvModal();
    // Revenir à la liste
    currentConversationId = null;
    currentContact = null;
    document.querySelector('.conversations-panel').classList.remove('hide');
    document.querySelector('.chat-panel').classList.add('hide');
    await loadConversations();
}

function openUserInfoModal() {
    if (!currentContact) return;
    const content = document.getElementById('userInfoContent');
    content.innerHTML = `
        <div style="text-align: center;">
            <img src="${currentContact.avatar_url || 'img/user-default.jpg'}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 15px;">
            <h3>${currentContact.nom_complet}</h3>
            <p>@${currentContact.hub_id || 'inconnu'}</p>
            <p>${currentContact.bio || 'Aucune bio'}</p>
        </div>
    `;
    document.getElementById('userInfoModal').style.display = 'block';
}
function closeUserInfoModal() {
    document.getElementById('userInfoModal').style.display = 'none';
}

function backToConversations() {
    document.querySelector('.conversations-panel').classList.remove('hide');
    document.querySelector('.chat-panel').classList.add('hide');
}

// ===== RENDU DE L'EN-TÊTE DE CONVERSATION =====
function renderChatHeader() {
    const header = document.getElementById('chatHeader');
    if (!header) return;
    if (!currentContact) {
        header.innerHTML = ''; // Aucune conversation sélectionnée
        return;
    }
    const onlineClass = currentContact.online ? 'online' : '';
    header.innerHTML = `
        <div class="chat-header-left">
            <button class="back-btn" onclick="backToConversations()"><i class="fas fa-arrow-left"></i></button>
            <div class="chat-contact">
                <div class="chat-contact-avatar ${onlineClass}">
                    <img src="${currentContact.avatar_url || 'img/user-default.jpg'}" alt="Avatar">
                </div>
                <div class="chat-contact-info">
                    <h3>${currentContact.nom_complet}</h3>
                    <p>${currentContact.online ? 'En ligne' : 'Hors ligne'}</p>
                </div>
            </div>
        </div>
        <div class="chat-actions">
            <button class="chat-action-btn" onclick="archiveConversation()" title="Archiver"><i class="fas fa-archive"></i></button>
            <button class="chat-action-btn" onclick="blockUser()" title="Bloquer"><i class="fas fa-ban"></i></button>
            <button class="chat-action-btn danger" onclick="openDeleteConvModal()" title="Supprimer la conversation"><i class="fas fa-trash-alt"></i></button>
            <button class="chat-action-btn" onclick="openUserInfoModal()" title="Informations"><i class="fas fa-info-circle"></i></button>
        </div>
    `;
}

// ===== RENDU DE LA ZONE DE SAISIE =====
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
                <button type="button" class="attach-btn" onclick="openFilePicker()"><i class="fas fa-paperclip"></i></button>
                <div class="message-input-wrapper">
                    <textarea class="message-input" id="messageInput" placeholder="Votre message..." rows="1"></textarea>
                </div>
                <button type="button" class="emoji-btn" onclick="openEmojiPicker()"><i class="fas fa-smile"></i></button>
                <button type="button" class="sticker-btn" onclick="openStickerPicker()"><i class="fas fa-sticker-mule"></i></button>
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

// ===== EMOJIS ET STICKERS (à implémenter) =====
function openEmojiPicker() {
    // Pour l'instant, on ouvre un simple sélecteur (à améliorer)
    showToast('Sélecteur d\'emojis à venir', 'info');
}

function openStickerPicker() {
    showToast('Sélecteur de stickers à venir', 'info');
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

    subscribeToNewConversations();

    if (targetUserId && targetUserId !== currentProfile.id) {
        const convId = await findOrCreateConversationWithUser(targetUserId);
        if (convId) {
            await loadConversations();
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

// ===== FONCTIONS GLOBALES =====
window.backToConversations = backToConversations;
window.sendMessage = sendMessage;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.copyMessage = copyMessage;
window.deleteMessage = deleteMessage;
window.openFilePicker = openFilePicker;
window.showContextMenu = showContextMenu;
window.copyMessageFromMenu = copyMessageFromMenu;
window.replyToMessageFromMenu = replyToMessageFromMenu;
window.deleteForMe = deleteForMe;
window.deleteForEveryone = deleteForEveryone;
window.archiveConversation = archiveConversation;
window.blockUser = blockUser;
window.openDeleteConvModal = openDeleteConvModal;
window.closeDeleteConvModal = closeDeleteConvModal;
window.confirmDeleteConversation = confirmDeleteConversation;
window.openUserInfoModal = openUserInfoModal;
window.closeUserInfoModal = closeUserInfoModal;
window.openEmojiPicker = openEmojiPicker;
window.openStickerPicker = openStickerPicker;