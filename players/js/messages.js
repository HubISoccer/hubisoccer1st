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
let pendingReply = null;
let showingArchives = false;
let mediaRecorder = null;
let audioChunksLocal = [];
let recordingTimer = null;
let recordingSeconds = 0;
let currentUploadController = null;
let selectedMessagesForDelete = new Set();
let pendingMediaFile = null;
let pendingAudioBlob = null;
let emojiPickerVisible = false;
let currentContextMessageId = null;

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

        conversations = await Promise.all(convs.map(async (conv) => {
            const { data: lastMsg, error: msgError } = await supabaseClient
                .from('messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .not('deleted_for', 'cs', `{${currentProfile.id}}`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (msgError) console.error(msgError);

            const { data: part, error: partError2 } = await supabaseClient
                .from('conversation_participants')
                .select('user_id, profiles:user_id (full_name, avatar_url, username)')
                .eq('conversation_id', conv.id);
            if (partError2) console.error(partError2);

            let name = '', avatar = '';
            if (conv.is_group) {
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
                unreadCount: 0
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

// ===== CHARGEMENT DES MESSAGES =====
async function loadMessages(conversationId) {
    showLoader(true);
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*, profiles:user_id (full_name, avatar_url)')
            .eq('conversation_id', conversationId)
            .not('deleted_for', 'cs', `{${currentProfile.id}}`)
            .order('created_at', { ascending: true });
        if (error) throw error;

        messages = data || [];
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
    await supabaseClient
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentProfile.id);
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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===== ZONE DE SAISIE =====
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

    document.getElementById('messageInput').addEventListener('input', handleTyping);
    document.getElementById('messageInput').addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('attachFileBtn').addEventListener('click', () => document.getElementById('fileInput')?.click());
    document.getElementById('audioRecordBtn').addEventListener('click', toggleAudioRecorder);
    document.getElementById('emojiBtn').addEventListener('click', toggleEmojiPicker);
    document.getElementById('stickerBtn').addEventListener('click', toggleStickerPicker);

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
    typingTimeoutId = setTimeout(() => {}, 2000);
}

function cancelReply() {
    pendingReply = null;
    document.getElementById('replyIndicator').style.display = 'none';
}

// ===== ENVOI DE MESSAGE =====
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
        const newMsg = {
            ...messageData,
            id: Date.now(),
            created_at: new Date().toISOString(),
            profiles: { full_name: currentProfile.full_name, avatar_url: currentProfile.avatar_url }
        };
        messages.push(newMsg);
        renderMessages();
        const conv = conversations.find(c => c.id === currentConversation.id);
        if (conv) {
            conv.lastMessage = newMsg;
            conv.lastMessageTime = newMsg.created_at;
            renderConversationsList();
        }
    });
}

// ===== GESTION DES MÉDIAS =====
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
        audioChunksLocal = [];
        mediaRecorderAudio.ondataavailable = event => audioChunksLocal.push(event.data);
        mediaRecorderAudio.onstop = () => {
            const audioBlob = new Blob(audioChunksLocal, { type: 'audio/webm' });
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
        if (elapsed >= 300) {
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
function toggleEmojiPicker() {
    if (!emojiPickerVisible) showEmojiPicker();
    else hideEmojiPicker();
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
    const picker = document.getElementById('stickerPicker');
    if (picker) picker.remove();
    else showStickerPicker();
}
function showStickerPicker() {
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
            picker.remove();
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

// ===== MENU CONTEXTUEL =====
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
        document.getElementById('replyToName').textContent = msg.profiles?.full_name || 'Utilisateur';
        document.getElementById('replyIndicator').style.display = 'flex';
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

// ===== ARCHIVAGE =====
function toggleArchive() {
    showingArchives = !showingArchives;
    document.getElementById('archiveToggleText').textContent = showingArchives ? 'Conversations' : 'Archives';
    loadConversations();
}
async function archiveConversation(conversationId) {
    const { error } = await supabaseClient
        .from('archived_conversations')
        .insert({ user_id: currentProfile.id, conversation_id: conversationId });
    if (error) showToast('Erreur lors de l\'archivage', 'error');
    else loadConversations();
}
async function unarchiveConversation(conversationId) {
    const { error } = await supabaseClient
        .from('archived_conversations')
        .delete()
        .eq('user_id', currentProfile.id)
        .eq('conversation_id', conversationId);
    if (error) showToast('Erreur lors du désarchivage', 'error');
    else loadConversations();
}

// ===== BLOCAGE =====
async function loadBlockedUsers() {
    const { data, error } = await supabaseClient
        .from('blocked_users')
        .select('blocked_user_id, profiles:blocked_user_id (full_name, avatar_url)')
        .eq('user_id', currentProfile.id);
    if (error) {
        console.error(error);
        return;
    }
    const listDiv = document.getElementById('blockedUsersList');
    listDiv.innerHTML = (data || []).map(b => `
        <div class="blocked-user-item">
            <div class="blocked-user-avatar"><img src="${b.profiles?.avatar_url || 'img/user-default.jpg'}"></div>
            <div class="blocked-user-info"><div class="blocked-user-name">${b.profiles?.full_name || 'Utilisateur'}</div></div>
            <button class="blocked-user-unblock" onclick="unblockUser('${b.blocked_user_id}')">Débloquer</button>
        </div>
    `).join('');
    document.getElementById('blockedUsersModal').style.display = 'block';
}
async function blockUser(userId) {
    const { error } = await supabaseClient
        .from('blocked_users')
        .insert({ user_id: currentProfile.id, blocked_user_id: userId });
    if (error) showToast('Erreur lors du blocage', 'error');
    else showToast('Utilisateur bloqué', 'success');
}
async function unblockUser(userId) {
    const { error } = await supabaseClient
        .from('blocked_users')
        .delete()
        .eq('user_id', currentProfile.id)
        .eq('blocked_user_id', userId);
    if (error) showToast('Erreur lors du déblocage', 'error');
    else {
        showToast('Utilisateur débloqué', 'success');
        loadBlockedUsers();
    }
}

// ===== GROUPES =====
async function openCreateGroupModal() {
    const { data: followers, error } = await supabaseClient
        .from('unified_follows')
        .select('following_id, profiles:following_id (full_name, avatar_url)')
        .eq('follower_id', currentProfile.id);
    if (error) {
        console.error(error);
        return;
    }
    const listDiv = document.getElementById('groupMembersList');
    listDiv.innerHTML = (followers || []).map(f => `
        <label style="display: block; margin: 5px 0;">
            <input type="checkbox" value="${f.following_id}"> ${f.profiles?.full_name || 'Utilisateur'}
        </label>
    `).join('');
    document.getElementById('createGroupModal').style.display = 'block';
}
async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    if (!groupName) {
        showToast('Veuillez donner un nom au groupe', 'warning');
        return;
    }
    const selected = Array.from(document.querySelectorAll('#groupMembersList input:checked')).map(cb => cb.value);
    if (selected.length < 2) {
        showToast('Sélectionnez au moins 2 participants', 'warning');
        return;
    }
    const participants = [...selected, currentProfile.id];
    const { data: conv, error: convError } = await supabaseClient
        .from('conversations')
        .insert({ is_group: true, group_name: groupName })
        .select()
        .single();
    if (convError) {
        showToast('Erreur création groupe', 'error');
        return;
    }
    const participantsData = participants.map(uid => ({ conversation_id: conv.id, user_id: uid }));
    const { error: partError } = await supabaseClient
        .from('conversation_participants')
        .insert(participantsData);
    if (partError) {
        showToast('Erreur ajout participants', 'error');
        return;
    }
    showToast('Groupe créé avec succès', 'success');
    closeCreateGroupModal();
    loadConversations();
}
function closeCreateGroupModal() {
    document.getElementById('createGroupModal').style.display = 'none';
}
function closeBlockedUsersModal() {
    document.getElementById('blockedUsersModal').style.display = 'none';
}
function closeDeleteConvModal() {
    document.getElementById('deleteConvModal').style.display = 'none';
}
async function confirmDeleteConversation() {
    if (currentConversation) {
        await supabaseClient
            .from('archived_conversations')
            .delete()
            .eq('user_id', currentProfile.id)
            .eq('conversation_id', currentConversation.id);
        await supabaseClient
            .from('conversation_participants')
            .delete()
            .eq('conversation_id', currentConversation.id)
            .eq('user_id', currentProfile.id);
        const { count } = await supabaseClient
            .from('conversation_participants')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', currentConversation.id);
        if (count === 0) {
            await supabaseClient
                .from('conversations')
                .delete()
                .eq('id', currentConversation.id);
        }
        showToast('Conversation supprimée', 'success');
        closeDeleteConvModal();
        currentConversation = null;
        document.getElementById('chatHeader').innerHTML = '';
        document.getElementById('chatMessagesArea').innerHTML = '';
        document.getElementById('chatInputArea').innerHTML = '';
        loadConversations();
    }
}

// ===== INFOS UTILISATEUR =====
async function showUserInfo(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('full_name, avatar_url, bio, username')
        .eq('id', userId)
        .single();
    if (error) return;
    document.getElementById('userInfoContent').innerHTML = `
        <div style="text-align:center;">
            <img src="${data.avatar_url || 'img/user-default.jpg'}" style="width:80px; height:80px; border-radius:50%;">
            <h3>${data.full_name}</h3>
            <p>@${data.username || ''}</p>
            <p>${data.bio || ''}</p>
        </div>
    `;
    document.getElementById('userInfoModal').style.display = 'block';
}
function closeUserInfoModal() {
    document.getElementById('userInfoModal').style.display = 'none';
}

function renderChatHeader() {
    const header = document.getElementById('chatHeader');
    if (!header || !currentConversation) return;
    header.innerHTML = `
        <div class="chat-header-left">
            <button class="back-btn" id="backToConversationsBtn" onclick="closeCurrentConversation()"><i class="fas fa-arrow-left"></i></button>
            <div class="chat-contact">
                <div class="chat-contact-avatar"><img src="${currentConversation.avatar}" alt="${currentConversation.name}"></div>
                <div class="chat-contact-info">
                    <h3>${currentConversation.name}</h3>
                    <p>${currentConversation.is_group ? 'Groupe' : 'En ligne'}</p>
                </div>
            </div>
        </div>
        <div class="chat-actions">
            <button class="chat-action-btn" onclick="showUserInfo(${currentConversation.is_group ? null : getOtherParticipantId()})" title="Infos"><i class="fas fa-info-circle"></i></button>
            <button class="chat-action-btn" onclick="archiveConversation(${currentConversation.id})" title="Archiver"><i class="fas fa-archive"></i></button>
            <button class="chat-action-btn" onclick="openSelectMessagesModal()" title="Sélectionner"><i class="fas fa-check-double"></i></button>
            <button class="chat-action-btn danger" onclick="openDeleteConvModal()" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
    document.getElementById('backToConversationsBtn')?.addEventListener('click', () => {
        currentConversation = null;
        document.getElementById('chatHeader').innerHTML = '';
        document.getElementById('chatMessagesArea').innerHTML = '';
        document.getElementById('chatInputArea').innerHTML = '';
    });
}

function openDeleteConvModal() {
    document.getElementById('deleteConvModal').style.display = 'block';
}

function getOtherParticipantId() {
    // À implémenter si nécessaire
    return null;
}

function closeCurrentConversation() {
    currentConversation = null;
    renderConversationsList();
}

// ===== INITIALISATION =====
async function init() {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadConversations();

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('to');
    if (targetUserId) {
        // Vérifier si une conversation existe déjà
        const { data: existing } = await supabaseClient
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', currentProfile.id);
        const convIds = existing?.map(e => e.conversation_id) || [];
        let found = null;
        for (const cid of convIds) {
            const { data: participants } = await supabaseClient
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', cid);
            if (participants?.length === 2 && participants.some(p => p.user_id === targetUserId)) {
                found = cid;
                break;
            }
        }
        if (found) {
            await selectConversation(found);
        } else {
            const { data: newConv, error: convError } = await supabaseClient
                .from('conversations')
                .insert({ is_group: false })
                .select()
                .single();
            if (!convError) {
                await supabaseClient
                    .from('conversation_participants')
                    .insert([
                        { conversation_id: newConv.id, user_id: currentProfile.id },
                        { conversation_id: newConv.id, user_id: targetUserId }
                    ]);
                await loadConversations();
                await selectConversation(newConv.id);
            }
        }
    }

    document.getElementById('refreshBtn').addEventListener('click', () => loadConversations());
    document.getElementById('archiveToggleBtn').addEventListener('click', toggleArchive);
    document.getElementById('blockedUsersBtn').addEventListener('click', loadBlockedUsers);
    document.getElementById('createGroupBtn').addEventListener('click', openCreateGroupModal);
    document.getElementById('confirmCreateGroup').addEventListener('click', createGroup);
}

// Exposer les fonctions globales
window.closeCreateGroupModal = closeCreateGroupModal;
window.closeBlockedUsersModal = closeBlockedUsersModal;
window.closeDeleteConvModal = closeDeleteConvModal;
window.confirmDeleteConversation = confirmDeleteConversation;
window.openSelectMessagesModal = openSelectMessagesModal;
window.closeSelectMessagesModal = closeSelectMessagesModal;
window.deleteSelectedMessages = deleteSelectedMessages;
window.showContextMenu = showContextMenu;
window.copyMessageFromMenu = copyMessageFromMenu;
window.replyToMessageFromMenu = replyToMessageFromMenu;
window.pinMessageFromMenu = pinMessageFromMenu;
window.deleteForMe = deleteForMe;
window.deleteForEveryone = deleteForEveryone;
window.cancelReply = cancelReply;
window.toggleAudioRecorder = toggleAudioRecorder;
window.sendMessage = sendMessage;
window.openMediaZoom = (url, type) => {
    const modal = document.getElementById('mediaZoomModal');
    const viewer = document.getElementById('mediaViewer');
    if (type === 'image') viewer.innerHTML = `<img src="${url}" alt="Zoom">`;
    else viewer.innerHTML = `<video src="${url}" controls autoplay></video>`;
    modal.style.display = 'block';
};
window.closeMediaZoom = () => document.getElementById('mediaZoomModal').style.display = 'none';
window.showUserInfo = showUserInfo;
window.closeUserInfoModal = closeUserInfoModal;
window.blockUser = blockUser;
window.unblockUser = unblockUser;
window.archiveConversation = archiveConversation;
window.unarchiveConversation = unarchiveConversation;
window.closeCurrentConversation = closeCurrentConversation;

document.addEventListener('DOMContentLoaded', init);