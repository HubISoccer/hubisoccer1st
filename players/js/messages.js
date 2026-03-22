// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let conversations = [];
let currentConversation = null;
let messages = [];
let messageSubscription = null;
let typingTimeout = null;
let selectedMessage = null;
let pendingReply = null;
let showingArchives = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let currentUploadController = null;
let selectedMessagesForDelete = new Set(); // pour la suppression multiple

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

function withButtonSpinner(button, asyncFn) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner"></span>';
    try {
        return asyncFn().finally(() => {
            button.disabled = false;
            button.innerHTML = originalText;
        });
    } catch (err) {
        button.disabled = false;
        button.innerHTML = originalText;
        throw err;
    }
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = '../auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (error) {
        console.error('Erreur chargement profil:', error);
        showToast('Impossible de charger votre profil', 'error');
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = data.full_name || 'Joueur';
    document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
    return currentProfile;
}

// ===== CHARGEMENT DES CONVERSATIONS =====
async function loadConversations() {
    showLoader(true);
    try {
        // Récupérer les conversations auxquelles l'utilisateur participe
        const { data: participants, error: partError } = await supabaseClient
            .from('conversation_participants')
            .select('conversation_id, last_read_at')
            .eq('user_id', currentProfile.id);
        if (partError) throw partError;

        const convIds = participants.map(p => p.conversation_id);
        if (convIds.length === 0) {
            conversations = [];
            renderConversationsList();
            showLoader(false);
            return;
        }

        // Récupérer les infos des conversations
        let query = supabaseClient
            .from('conversations')
            .select('*')
            .in('id', convIds)
            .order('updated_at', { ascending: false });

        if (showingArchives) {
            const { data: archived } = await supabaseClient
                .from('archived_conversations')
                .select('conversation_id')
                .eq('user_id', currentProfile.id);
            const archivedIds = archived.map(a => a.conversation_id);
            if (archivedIds.length) query = query.in('id', archivedIds);
            else { conversations = []; renderConversationsList(); showLoader(false); return; }
        } else {
            const { data: archived } = await supabaseClient
                .from('archived_conversations')
                .select('conversation_id')
                .eq('user_id', currentProfile.id);
            const archivedIds = archived.map(a => a.conversation_id);
            if (archivedIds.length) query = query.not('id', 'in', `(${archivedIds.join(',')})`);
        }

        const { data: convs, error: convError } = await query;
        if (convError) throw convError;

        // Pour chaque conversation, récupérer le dernier message et les participants
        conversations = await Promise.all(convs.map(async (conv) => {
            // Dernier message
            const { data: lastMsg, error: msgError } = await supabaseClient
                .from('messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .not('deleted_for', 'cs', `{${currentProfile.id}}`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (msgError) console.error(msgError);

            // Participants
            const { data: part, error: partError2 } = await supabaseClient
                .from('conversation_participants')
                .select('user_id, profiles:user_id (full_name, avatar_url, username)')
                .eq('conversation_id', conv.id);
            if (partError2) console.error(partError2);

            let name = '';
            let avatar = '';
            let isGroup = conv.is_group;
            if (isGroup) {
                name = conv.group_name || 'Groupe';
                avatar = conv.group_avatar || 'img/group-default.jpg';
            } else {
                const other = part?.find(p => p.user_id !== currentProfile.id);
                if (other) {
                    name = other.profiles?.full_name || 'Utilisateur';
                    avatar = other.profiles?.avatar_url || 'img/user-default.jpg';
                } else {
                    name = 'Inconnu';
                    avatar = 'img/user-default.jpg';
                }
            }

            return {
                ...conv,
                name,
                avatar,
                lastMessage: lastMsg,
                lastMessageTime: lastMsg?.created_at,
                unreadCount: 0 // à calculer plus tard
            };
        }));

        renderConversationsList();
    } catch (error) {
        console.error('Erreur chargement conversations:', error);
        showToast('Erreur lors du chargement des conversations', 'error');
    } finally {
        showLoader(false);
    }
}

function renderConversationsList() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    if (conversations.length === 0) {
        container.innerHTML = '<div class="empty-conversations">Aucune conversation</div>';
        return;
    }
    container.innerHTML = conversations.map(conv => `
        <div class="conversation-item" data-conversation-id="${conv.id}">
            <div class="conversation-avatar">
                <img src="${conv.avatar}" alt="${conv.name}">
            </div>
            <div class="conversation-info">
                <div class="conversation-name">
                    <span>${conv.name}</span>
                    <span class="conversation-time">${conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                </div>
                <div class="conversation-last">${conv.lastMessage?.content || 'Aucun message'}</div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.conversation-item').forEach(el => {
        el.addEventListener('click', () => {
            const convId = parseInt(el.dataset.conversationId);
            selectConversation(convId);
        });
    });
}

async function selectConversation(conversationId) {
    currentConversation = conversations.find(c => c.id === conversationId);
    if (!currentConversation) return;
    await loadMessages(conversationId);
    await markConversationAsRead(conversationId);
    renderChatHeader();
    renderMessages();
    initChatInput();
}

// ===== CHARGEMENT DES MESSAGES D'UNE CONVERSATION =====
async function loadMessages(conversationId) {
    showLoader(true);
    try {
        // Récupérer les messages non supprimés pour l'utilisateur
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*, profiles:user_id (full_name, avatar_url)')
            .eq('conversation_id', conversationId)
            .not('deleted_for', 'cs', `{${currentProfile.id}}`)
            .order('created_at', { ascending: true });
        if (error) throw error;

        messages = data || [];
        // Marquer comme lus les messages entrants
        await markMessagesAsRead(conversationId);

        if (messageSubscription) messageSubscription.unsubscribe();
        subscribeToMessages(conversationId);
    } catch (error) {
        console.error('Erreur chargement messages:', error);
        showToast('Erreur lors du chargement des messages', 'error');
    } finally {
        showLoader(false);
    }
}

async function markMessagesAsRead(conversationId) {
    // Mettre à jour la date de dernière lecture dans conversation_participants
    await supabaseClient
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentProfile.id);

    // Mettre à jour le compteur de non-lus (si on avait une colonne, on pourrait la décrémenter)
}

function subscribeToMessages(conversationId) {
    messageSubscription = supabaseClient
        .channel(`messages:${conversationId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
        }, async (payload) => {
            // Ne pas ajouter le message si l'utilisateur est l'expéditeur (déjà ajouté localement) ou si le message est supprimé pour lui
            if (payload.new.user_id === currentProfile.id) return;
            if (payload.new.deleted_for?.includes(currentProfile.id)) return;
            const { data: author } = await supabaseClient
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', payload.new.user_id)
                .single();
            const newMsg = {
                ...payload.new,
                profiles: author
            };
            messages.push(newMsg);
            renderMessages();
            // Mettre à jour la conversation dans la liste (dernier message)
            const conv = conversations.find(c => c.id === conversationId);
            if (conv) {
                conv.lastMessage = newMsg;
                conv.lastMessageTime = newMsg.created_at;
                renderConversationsList();
            }
        })
        .subscribe();
}

// ===== RENDU DES MESSAGES =====
function renderMessages() {
    const container = document.getElementById('chatMessagesArea');
    if (!container) return;
    if (messages.length === 0) {
        container.innerHTML = '<div class="empty-messages">Aucun message. Soyez le premier à écrire !</div>';
        return;
    }

    let lastDate = null;
    let html = '';
    messages.forEach(msg => {
        const msgDate = new Date(msg.created_at).toLocaleDateString();
        if (msgDate !== lastDate) {
            html += `<div class="date-separator">${msgDate}</div>`;
            lastDate = msgDate;
        }
        const isOwn = msg.user_id === currentProfile.id;
        const replyHtml = msg.reply_to_id ? `<div class="reply-quote">Réponse à un message</div>` : '';
        let mediaHtml = '';
        if (msg.media_url) {
            if (msg.media_type === 'image') {
                mediaHtml = `<div class="message-attachment"><img src="${msg.media_url}" alt="Image" onclick="openMediaZoom('${msg.media_url}', 'image')"></div>`;
            } else if (msg.media_type === 'video') {
                mediaHtml = `<div class="message-attachment"><video src="${msg.media_url}" controls onclick="openMediaZoom('${msg.media_url}', 'video')"></video></div>`;
            } else if (msg.media_type === 'audio') {
                mediaHtml = `<div class="message-attachment"><audio controls src="${msg.media_url}"></audio></div>`;
            } else if (msg.media_type === 'file') {
                mediaHtml = `<div class="message-attachment"><a href="${msg.media_url}" target="_blank" download><i class="fas fa-file"></i> Télécharger le fichier</a></div>`;
            }
        }
        const pinnedIcon = msg.pinned ? '<i class="fas fa-thumbtack" style="color:var(--gold); margin-left:5px;"></i>' : '';
        html += `
            <div class="message-bubble ${isOwn ? 'outgoing' : 'incoming'}" data-message-id="${msg.id}">
                <div class="message-content" oncontextmenu="showContextMenu(event, ${msg.id})">
                    ${replyHtml}
                    <div class="message-text">${escapeHtml(msg.content)} ${pinnedIcon}</div>
                    ${mediaHtml}
                </div>
                <div class="message-time">${new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
        `;
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

// ===== ZONE DE SAISIE (initiale) =====
function initChatInput() {
    const container = document.getElementById('chatInputArea');
    if (!container) return;
    container.innerHTML = `
        <div id="replyIndicator" class="reply-indicator" style="display: none;">
            <span><i class="fas fa-reply"></i> Répondre à <span id="replyToName"></span></span>
            <button class="cancel-reply" onclick="cancelReply()"><i class="fas fa-times"></i></button>
        </div>
        <div id="attachmentPreview" class="attachment-preview" style="display: none;"></div>
        <div class="input-row">
            <div class="message-input-wrapper">
                <textarea id="messageInput" class="message-input" rows="1" placeholder="Écrire un message..."></textarea>
            </div>
            <button id="attachFileBtn" class="attach-btn" title="Joindre un fichier"><i class="fas fa-paperclip"></i></button>
            <button id="audioRecordBtn" class="audio-btn" title="Message audio"><i class="fas fa-microphone"></i></button>
            <button id="emojiBtn" class="emoji-btn" title="Émojis"><i class="fas fa-smile"></i></button>
            <button id="stickerBtn" class="sticker-btn" title="Stickers"><i class="fas fa-sticky-note"></i></button>
            <button id="sendMessageBtn" class="send-btn"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;

    // Attacher les événements
    document.getElementById('messageInput').addEventListener('input', handleTyping);
    document.getElementById('messageInput').addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('attachFileBtn').addEventListener('click', () => document.getElementById('fileInput')?.click());
    document.getElementById('audioRecordBtn').addEventListener('click', toggleAudioRecorder);
    document.getElementById('emojiBtn').addEventListener('click', toggleEmojiPicker);
    document.getElementById('stickerBtn').addEventListener('click', toggleStickerPicker);

    // Input file caché
    if (!document.getElementById('fileInput')) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'fileInput';
        fileInput.style.display = 'none';
        fileInput.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx';
        fileInput.addEventListener('change', handleFileSelect);
        document.body.appendChild(fileInput);
    }
}

let typingTimeoutId = null;
function handleTyping() {
    if (typingTimeoutId) clearTimeout(typingTimeoutId);
    // Envoyer un signal de saisie (à implémenter avec Realtime)
    typingTimeoutId = setTimeout(() => {
        // Arrêt de la saisie
    }, 2000);
}

function cancelReply() {
    pendingReply = null;
    document.getElementById('replyIndicator').style.display = 'none';
}

// ===== ENVOI D'UN MESSAGE =====
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content && !pendingMediaFile && !pendingAudioBlob) return;
    const btn = document.getElementById('sendMessageBtn');
    withButtonSpinner(btn, async () => {
        let mediaUrl = null, mediaType = null, mediaSize = null;
        if (pendingMediaFile) {
            const file = pendingMediaFile;
            mediaSize = file.size;
            if (file.type.startsWith('image/')) mediaType = 'image';
            else if (file.type.startsWith('video/')) mediaType = 'video';
            else if (file.type.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'file';
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('message-attachments')
                .upload(fileName, file);
            if (uploadError) {
                showToast('Erreur upload : ' + uploadError.message, 'error');
                return;
            }
            const { data: urlData } = supabaseClient.storage.from('message-attachments').getPublicUrl(fileName);
            mediaUrl = urlData.publicUrl;
            pendingMediaFile = null;
            document.getElementById('attachmentPreview').style.display = 'none';
        } else if (pendingAudioBlob) {
            const fileName = `${currentProfile.id}_audio_${Date.now()}.webm`;
            const { error: uploadError } = await supabaseClient.storage
                .from('message-attachments')
                .upload(fileName, pendingAudioBlob);
            if (uploadError) {
                showToast('Erreur upload audio', 'error');
                return;
            }
            const { data: urlData } = supabaseClient.storage.from('message-attachments').getPublicUrl(fileName);
            mediaUrl = urlData.publicUrl;
            mediaType = 'audio';
            pendingAudioBlob = null;
            document.getElementById('audioPreview').style.display = 'none';
        }

        const messageData = {
            conversation_id: currentConversation.id,
            user_id: currentProfile.id,
            content: content || null,
            media_url: mediaUrl,
            media_type: mediaType,
            media_size: mediaSize,
            reply_to_id: pendingReply?.id || null,
            deleted_for: []
        };
        const { error } = await supabaseClient
            .from('messages')
            .insert(messageData);
        if (error) {
            showToast('Erreur envoi : ' + error.message, 'error');
            return;
        }
        input.value = '';
        pendingReply = null;
        document.getElementById('replyIndicator').style.display = 'none';
        // Ajouter localement
        const newMsg = {
            ...messageData,
            id: Date.now(), // temporaire
            created_at: new Date().toISOString(),
            profiles: { full_name: currentProfile.full_name, avatar_url: currentProfile.avatar_url }
        };
        messages.push(newMsg);
        renderMessages();
        // Mettre à jour la dernière conversation
        const conv = conversations.find(c => c.id === currentConversation.id);
        if (conv) {
            conv.lastMessage = newMsg;
            conv.lastMessageTime = newMsg.created_at;
            renderConversationsList();
        }
    });
}

// ===== GESTION DES MÉDIAS =====
let pendingMediaFile = null;
let pendingAudioBlob = null;

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
        showToast('Fichier trop volumineux (max 500 Mo)', 'warning');
        return;
    }
    pendingMediaFile = file;
    const previewDiv = document.getElementById('attachmentPreview');
    previewDiv.innerHTML = `
        <div class="preview-item">
            <i class="fas fa-file"></i> ${file.name}
            <button class="remove-preview-btn" onclick="pendingMediaFile=null; document.getElementById('attachmentPreview').style.display='none'"><i class="fas fa-times"></i></button>
        </div>
    `;
    previewDiv.style.display = 'block';
}

// ===== AUDIO =====
let mediaRecorderAudio = null;
let audioChunks = [];
let recordingActive = false;
let recordingStartTime = null;

function toggleAudioRecorder() {
    const recorderDiv = document.getElementById('audioRecorder');
    if (recorderDiv.style.display === 'none') {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderAudio = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorderAudio.ondataavailable = event => audioChunks.push(event.data);
        mediaRecorderAudio.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            pendingAudioBlob = audioBlob;
            const audioUrl = URL.createObjectURL(audioBlob);
            const previewDiv = document.getElementById('audioPreview');
            const audioPlayer = document.getElementById('recordedAudio');
            audioPlayer.src = audioUrl;
            previewDiv.style.display = 'block';
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderAudio.start();
        recordingActive = true;
        recordingStartTime = Date.now();
        document.getElementById('startRecordBtn').style.display = 'none';
        document.getElementById('stopRecordBtn').style.display = 'inline-block';
        document.getElementById('recordingTime').textContent = '0:00';
        startTimer();
    } catch (err) {
        showToast('Impossible d\'accéder au microphone', 'error');
    }
}

function stopRecording() {
    if (mediaRecorderAudio && recordingActive) {
        mediaRecorderAudio.stop();
        recordingActive = false;
        if (recordingTimer) clearInterval(recordingTimer);
        document.getElementById('startRecordBtn').style.display = 'inline-block';
        document.getElementById('stopRecordBtn').style.display = 'none';
    }
}

function startTimer() {
    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = setInterval(() => {
        if (!recordingActive) return;
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('recordingTime').textContent = `${minutes}:${seconds.toString().padStart(2,'0')}`;
        if (elapsed >= 300) { // 5 minutes max
            stopRecording();
            showToast('Enregistrement limité à 5 minutes', 'warning');
        }
    }, 1000);
}

document.getElementById('sendAudioBtn')?.addEventListener('click', () => {
    if (pendingAudioBlob) sendMessage();
});
document.getElementById('cancelAudioBtn')?.addEventListener('click', () => {
    pendingAudioBlob = null;
    document.getElementById('audioPreview').style.display = 'none';
    document.getElementById('audioRecorder').style.display = 'none';
});

// ===== ÉMOJIS ET STICKERS =====
let emojiPickerVisible = false;
function toggleEmojiPicker() {
    if (!emojiPickerVisible) {
        showEmojiPicker();
    } else {
        hideEmojiPicker();
    }
}
function showEmojiPicker() {
    const picker = document.createElement('div');
    picker.className = 'simple-emoji-picker';
    picker.id = 'emojiPicker';
    const emojis = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','😰','😱','😳','🤯','😬','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😈','👿','👹','👺','🤡','💩','👻','💀','👽','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'];
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.onclick = () => {
            const input = document.getElementById('messageInput');
            input.value += emoji;
            hideEmojiPicker();
        };
        picker.appendChild(span);
    });
    const btn = document.getElementById('emojiBtn');
    btn.parentNode.insertBefore(picker, btn.nextSibling);
    emojiPickerVisible = true;
}
function hideEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    if (picker) picker.remove();
    emojiPickerVisible = false;
}

function toggleStickerPicker() {
    // Similaire à emoji picker, mais avec des stickers personnalisés (images)
    showStickerPicker();
}
function showStickerPicker() {
    // Pour simplifier, on utilise des emojis comme stickers, ou on charge depuis une table
    const picker = document.createElement('div');
    picker.className = 'sticker-picker';
    picker.id = 'stickerPicker';
    const stickers = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥋','⛳','🏹','🎿','⛷️','🏂','🏋️','🤸','🤼','🤽','🤾','🏌️','🏇','🧘'];
    stickers.forEach(sticker => {
        const div = document.createElement('div');
        div.className = 'sticker-item';
        div.textContent = sticker;
        div.onclick = () => {
            const input = document.getElementById('messageInput');
            input.value += sticker;
            hideStickerPicker();
        };
        picker.appendChild(div);
    });
    const btn = document.getElementById('stickerBtn');
    btn.parentNode.insertBefore(picker, btn.nextSibling);
}
function hideStickerPicker() {
    const picker = document.getElementById('stickerPicker');
    if (picker) picker.remove();
}

// ===== SÉLECTION MULTIPLE DE MESSAGES =====
function openSelectMessagesModal() {
    const listDiv = document.getElementById('selectMessagesList');
    listDiv.innerHTML = messages.map(msg => `
        <div class="select-message-item">
            <label>
                <input type="checkbox" value="${msg.id}"> ${msg.content?.substring(0, 50) || 'Message sans texte'}
            </label>
        </div>
    `).join('');
    document.getElementById('selectMessagesModal').style.display = 'block';
}
function closeSelectMessagesModal() {
    document.getElementById('selectMessagesModal').style.display = 'none';
}
async function deleteSelectedMessages(forEveryone = false) {
    const checkboxes = document.querySelectorAll('#selectMessagesList input:checked');
    const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
    if (ids.length === 0) return;
    for (const id of ids) {
        if (forEveryone) {
            await supabaseClient
                .from('messages')
                .delete()
                .eq('id', id);
        } else {
            await supabaseClient.rpc('delete_message_for_user', { message_id: id, user_id: currentProfile.id });
        }
    }
    showToast(`${ids.length} message(s) supprimé(s)`, 'success');
    closeSelectMessagesModal();
    await loadMessages(currentConversation.id);
}
document.getElementById('confirmDeleteSelected')?.addEventListener('click', () => deleteSelectedMessages(false));
document.getElementById('confirmDeleteSelectedEveryone')?.addEventListener('click', () => deleteSelectedMessages(true));

// ===== MENU CONTEXTUEL (un seul message) =====
let currentContextMessageId = null;
function showContextMenu(event, messageId) {
    event.preventDefault();
    currentContextMessageId = messageId;
    const menu = document.getElementById('messageContextMenu');
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;
    menu.style.display = 'block';
    document.addEventListener('click', hideContextMenu);
}
function hideContextMenu() {
    document.getElementById('messageContextMenu').style.display = 'none';
    document.removeEventListener('click', hideContextMenu);
}
function copyMessageFromMenu() {
    const msg = messages.find(m => m.id === currentContextMessageId);
    if (msg && msg.content) {
        navigator.clipboard.writeText(msg.content);
        showToast('Message copié', 'success');
    }
    hideContextMenu();
}
function replyToMessageFromMenu() {
    const msg = messages.find(m => m.id === currentContextMessageId);
    if (msg) {
        pendingReply = msg;
        const replyIndicator = document.getElementById('replyIndicator');
        document.getElementById('replyToName').textContent = msg.profiles?.full_name || 'Utilisateur';
        replyIndicator.style.display = 'flex';
        hideContextMenu();
    }
}
async function pinMessageFromMenu() {
    const msg = messages.find(m => m.id === currentContextMessageId);
    if (msg) {
        const newPinned = !msg.pinned;
        await supabaseClient
            .from('messages')
            .update({ pinned: newPinned })
            .eq('id', msg.id);
        msg.pinned = newPinned;
        renderMessages();
        showToast(newPinned ? 'Message épinglé' : 'Message désépinglé', 'success');
    }
    hideContextMenu();
}
async function deleteForMe() {
    if (currentContextMessageId) {
        await supabaseClient.rpc('delete_message_for_user', { message_id: currentContextMessageId, user_id: currentProfile.id });
        await loadMessages(currentConversation.id);
        showToast('Message supprimé pour vous', 'success');
    }
    hideContextMenu();
}
async function deleteForEveryone() {
    if (currentContextMessageId && confirm('Supprimer ce message pour tous ?')) {
        await supabaseClient
            .from('messages')
            .delete()
            .eq('id', currentContextMessageId);
        await loadMessages(currentConversation.id);
        showToast('Message supprimé pour tous', 'success');
    }
    hideContextMenu();
}

// ===== SUPPRESSION DE CONVERSATION =====
let conversationToDelete = null;
function openDeleteConvModal(conversationId) {
    conversationToDelete = conversationId;
    document.getElementById('deleteConvModal').style.display = 'block';
}
function closeDeleteConvModal() {
    document.getElementById('deleteConvModal').style.display = 'none';
    conversationToDelete = null;
}
async function confirmDeleteConversation() {
    if (!conversationToDelete) return;
    // Supprimer la conversation (tous les messages et participants)
    const { error } = await supabaseClient
        .from('conversations')
        .delete()
        .eq('id', conversationToDelete);
    if (error) {
        showToast('Erreur lors de la suppression', 'error');
    } else {
        showToast('Conversation supprimée', 'success');
        await loadConversations();
        if (currentConversation?.id === conversationToDelete) {
            currentConversation = null;
            document.getElementById('chatHeader').innerHTML = '';
            document.getElementById('chatMessagesArea').innerHTML = '';
            document.getElementById('chatInputArea').innerHTML = '';
        }
    }
    closeDeleteConvModal();
}

// ===== ARCHIVAGE / DÉSARCHIVAGE =====
async function toggleArchive(conversationId) {
    const { data: existing } = await supabaseClient
        .from('archived_conversations')
        .select('id')
        .eq('user_id', currentProfile.id)
        .eq('conversation_id', conversationId)
        .maybeSingle();
    if (existing) {
        await supabaseClient
            .from('archived_conversations')
            .delete()
            .eq('id', existing.id);
        showToast('Conversation désarchivée', 'success');
    } else {
        await supabaseClient
            .from('archived_conversations')
            .insert({ user_id: currentProfile.id, conversation_id: conversationId });
        showToast('Conversation archivée', 'success');
    }
    await loadConversations();
}
document.getElementById('archiveToggleBtn')?.addEventListener('click', () => {
    showingArchives = !showingArchives;
    document.getElementById('archiveToggleText').textContent = showingArchives ? 'Conversations' : 'Archives';
    loadConversations();
});

// ===== BLOCAGE UTILISATEUR =====
async function blockUser(userId) {
    await supabaseClient
        .from('blocked_users')
        .insert({ user_id: currentProfile.id, blocked_user_id: userId });
    showToast('Utilisateur bloqué', 'success');
    // Optionnel : fermer la conversation si elle est ouverte
    if (currentConversation && !currentConversation.is_group) {
        const otherParticipant = await getOtherParticipant(currentConversation.id);
        if (otherParticipant === userId) {
            currentConversation = null;
            document.getElementById('chatHeader').innerHTML = '';
            document.getElementById('chatMessagesArea').innerHTML = '';
            document.getElementById('chatInputArea').innerHTML = '';
        }
    }
    await loadConversations();
}
async function unblockUser(userId) {
    await supabaseClient
        .from('blocked_users')
        .delete()
        .eq('user_id', currentProfile.id)
        .eq('blocked_user_id', userId);
    showToast('Utilisateur débloqué', 'success');
    await loadBlockedUsers();
}
async function loadBlockedUsers() {
    const { data, error } = await supabaseClient
        .from('blocked_users')
        .select('blocked_user_id, profiles:blocked_user_id (full_name, avatar_url, username)')
        .eq('user_id', currentProfile.id);
    if (error) {
        console.error(error);
        return;
    }
    const listDiv = document.getElementById('blockedUsersList');
    listDiv.innerHTML = (data || []).map(b => `
        <div class="blocked-user-item">
            <div class="blocked-user-avatar"><img src="${b.profiles?.avatar_url || 'img/user-default.jpg'}"></div>
            <div class="blocked-user-info"><div class="blocked-user-name">${b.profiles?.full_name || 'Utilisateur'}</div><div>@${b.profiles?.username || ''}</div></div>
            <button class="blocked-user-unblock" onclick="unblockUser('${b.blocked_user_id}')">Débloquer</button>
        </div>
    `).join('');
}
document.getElementById('blockedUsersBtn')?.addEventListener('click', () => {
    loadBlockedUsers();
    document.getElementById('blockedUsersModal').style.display = 'block';
});
function closeBlockedUsersModal() {
    document.getElementById('blockedUsersModal').style.display = 'none';
}

// ===== GROUPES =====
async function loadFollowersForGroup() {
    const { data, error } = await supabaseClient
        .from('unified_follows')
        .select('following_id, profiles:following_id (full_name, avatar_url, username)')
        .eq('follower_id', currentProfile.id);
    if (error) {
        console.error(error);
        return;
    }
    const listDiv = document.getElementById('groupMembersList');
    listDiv.innerHTML = (data || []).map(f => `
        <label><input type="checkbox" value="${f.following_id}"> ${f.profiles?.full_name || 'Utilisateur'}</label>
    `).join('');
}
document.getElementById('createGroupBtn')?.addEventListener('click', () => {
    loadFollowersForGroup();
    document.getElementById('createGroupModal').style.display = 'block';
});
function closeCreateGroupModal() {
    document.getElementById('createGroupModal').style.display = 'none';
}
document.getElementById('confirmCreateGroup')?.addEventListener('click', async () => {
    const groupName = document.getElementById('groupName').value.trim();
    if (!groupName) {
        showToast('Veuillez donner un nom au groupe', 'warning');
        return;
    }
    const selected = Array.from(document.querySelectorAll('#groupMembersList input:checked')).map(cb => cb.value);
    if (selected.length === 0) {
        showToast('Sélectionnez au moins un participant', 'warning');
        return;
    }
    const participants = [currentProfile.id, ...selected];
    // Créer la conversation de groupe
    const { data: newConv, error: convError } = await supabaseClient
        .from('conversations')
        .insert({ is_group: true, group_name: groupName })
        .select()
        .single();
    if (convError) {
        showToast('Erreur création groupe', 'error');
        return;
    }
    // Ajouter les participants
    const participantsRows = participants.map(uid => ({ conversation_id: newConv.id, user_id: uid }));
    const { error: partError } = await supabaseClient
        .from('conversation_participants')
        .insert(participantsRows);
    if (partError) {
        showToast('Erreur ajout participants', 'error');
        return;
    }
    showToast('Groupe créé avec succès', 'success');
    closeCreateGroupModal();
    await loadConversations();
    selectConversation(newConv.id);
});

// ===== EN-TÊTE DE CONVERSATION =====
function renderChatHeader() {
    const headerDiv = document.getElementById('chatHeader');
    if (!currentConversation) {
        headerDiv.innerHTML = '';
        return;
    }
    const isGroup = currentConversation.is_group;
    const name = currentConversation.name;
    const avatar = currentConversation.avatar;
    headerDiv.innerHTML = `
        <div class="chat-header-left">
            <button class="back-btn" id="backToListBtn" onclick="closeChatPanel()"><i class="fas fa-arrow-left"></i></button>
            <div class="chat-contact" onclick="showUserInfo(${currentConversation.id})">
                <div class="chat-contact-avatar"><img src="${avatar}" alt="${name}"></div>
                <div class="chat-contact-info">
                    <h3>${name}</h3>
                    <p>${isGroup ? 'Groupe' : 'En ligne'}</p>
                </div>
            </div>
        </div>
        <div class="chat-actions">
            <button class="chat-action-btn" onclick="toggleArchive(${currentConversation.id})" title="Archiver"><i class="fas fa-archive"></i></button>
            <button class="chat-action-btn" onclick="openDeleteConvModal(${currentConversation.id})" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
            ${!isGroup ? `<button class="chat-action-btn" onclick="blockUser(${getOtherParticipantId()})" title="Bloquer"><i class="fas fa-ban"></i></button>` : ''}
            ${isGroup ? `<button class="chat-action-btn" onclick="showGroupMembers()" title="Membres"><i class="fas fa-users"></i></button>` : ''}
        </div>
    `;
}
function closeChatPanel() {
    currentConversation = null;
    document.getElementById('chatHeader').innerHTML = '';
    document.getElementById('chatMessagesArea').innerHTML = '';
    document.getElementById('chatInputArea').innerHTML = '';
    // Sur mobile, on peut réafficher la liste des conversations
}
async function showUserInfo(conversationId) {
    if (currentConversation.is_group) {
        // Afficher les membres du groupe
        const { data: participants } = await supabaseClient
            .from('conversation_participants')
            .select('user_id, profiles:user_id (full_name, avatar_url, username)')
            .eq('conversation_id', conversationId);
        const modalBody = document.getElementById('userInfoContent');
        modalBody.innerHTML = `<h3>Membres du groupe</h3>${participants.map(p => `<div><img src="${p.profiles?.avatar_url || 'img/user-default.jpg'}" style="width:30px;height:30px;border-radius:50%;"> ${p.profiles?.full_name}</div>`).join('')}`;
        document.getElementById('userInfoModal').style.display = 'block';
    } else {
        const otherId = getOtherParticipantId();
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('full_name, avatar_url, username, bio')
            .eq('id', otherId)
            .single();
        if (error) return;
        document.getElementById('userInfoContent').innerHTML = `
            <div class="user-profile">
                <img src="${profile.avatar_url || 'img/user-default.jpg'}" style="width:80px;height:80px;border-radius:50%;">
                <h3>${profile.full_name}</h3>
                <p>@${profile.username}</p>
                <p>${profile.bio || ''}</p>
            </div>
        `;
        document.getElementById('userInfoModal').style.display = 'block';
    }
}
function closeUserInfoModal() {
    document.getElementById('userInfoModal').style.display = 'none';
}
function getOtherParticipantId() {
    if (!currentConversation || currentConversation.is_group) return null;
    const participants = currentConversation.participants || [];
    const other = participants.find(p => p.user_id !== currentProfile.id);
    return other?.user_id;
}

// ===== LECTEURS PERSONNALISÉS =====
function openMediaZoom(url, type) {
    const modal = document.createElement('div');
    modal.className = 'modal media-modal';
    modal.innerHTML = `
        <div class="modal-content media-modal-content" style="max-width:90%; background:transparent;">
            <span class="close-modal" onclick="this.closest('.modal').remove()" style="color:white; position:absolute; top:20px; right:20px;">×</span>
            <div class="media-viewer" style="display:flex; justify-content:center; align-items:center; min-height:80vh;">
                ${type === 'image' ? `<img src="${url}" style="max-width:100%; max-height:80vh;">` : `<video controls src="${url}" style="max-width:100%; max-height:80vh;"></video>`}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// ===== MARQUER COMME LU (conversation) =====
async function markConversationAsRead(conversationId) {
    await supabaseClient
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentProfile.id);
    // Mettre à jour le compteur de non-lus dans la liste
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    renderConversationsList();
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation messages.js');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadConversations();

    // Gestion de l'URL pour ouvrir directement une conversation (ex: ?to=userId)
    const urlParams = new URLSearchParams(window.location.search);
    const toUserId = urlParams.get('to');
    if (toUserId) {
        // Créer ou ouvrir une conversation privée avec cet utilisateur
        const { data: existingConv } = await supabaseClient
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', currentProfile.id)
            .in('conversation_id', (await supabaseClient.from('conversation_participants').select('conversation_id').eq('user_id', toUserId)).data?.map(p => p.conversation_id) || [])
            .maybeSingle();
        if (existingConv) {
            selectConversation(existingConv.conversation_id);
        } else {
            // Créer une nouvelle conversation privée
            const { data: newConv } = await supabaseClient
                .from('conversations')
                .insert({ is_group: false })
                .select()
                .single();
            await supabaseClient
                .from('conversation_participants')
                .insert([
                    { conversation_id: newConv.id, user_id: currentProfile.id },
                    { conversation_id: newConv.id, user_id: toUserId }
                ]);
            await loadConversations();
            selectConversation(newConv.id);
        }
    }

    // Bouton de rafraîchissement
    document.getElementById('refreshBtn')?.addEventListener('click', () => loadConversations());

    // Exposer les fonctions globales
    window.closeCreateGroupModal = closeCreateGroupModal;
    window.closeSelectMessagesModal = closeSelectMessagesModal;
    window.closeDeleteConvModal = closeDeleteConvModal;
    window.closeBlockedUsersModal = closeBlockedUsersModal;
    window.closeUserInfoModal = closeUserInfoModal;
    window.confirmDeleteConversation = confirmDeleteConversation;
    window.toggleArchive = toggleArchive;
    window.blockUser = blockUser;
    window.unblockUser = unblockUser;
    window.showUserInfo = showUserInfo;
    window.openMediaZoom = openMediaZoom;
    window.showContextMenu = showContextMenu;
    window.copyMessageFromMenu = copyMessageFromMenu;
    window.replyToMessageFromMenu = replyToMessageFromMenu;
    window.pinMessageFromMenu = pinMessageFromMenu;
    window.deleteForMe = deleteForMe;
    window.deleteForEveryone = deleteForEveryone;
    window.sendMessage = sendMessage;
    window.closeChatPanel = closeChatPanel;

    console.log('✅ Initialisation terminée');
});