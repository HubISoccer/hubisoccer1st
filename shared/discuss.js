// ============================================================
//  HUBISOCCER — DISCUSS.JS (Shared)
//  Chat intérieur — Tous rôles
// ============================================================

const SUPABASE_URL  = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ===== ÉTAT GLOBAL =====
let currentUser       = null;
let currentProfile    = null;
let currentConvId     = null;
let currentConv       = null;
let messages          = [];
let pinnedMessages    = [];
let allConversations  = [];   // pour le transfert
let msgSubscription   = null;
let typingSubscription = null;
let presenceChannel   = null;
let onlineUsers       = new Set();

// Pagination
const PAGE_SIZE     = 40;
let   oldestMsgDate = null;
let   hasMoreMsgs   = false;

// Saisie en cours
let pendingReply    = null;
let editingMsgId    = null;
let pendingFile     = null;
let pendingAudio    = null;

// Contexte menu
let ctxMsgId        = null;

// Frappe
let typingTimeout   = null;
let isTyping        = false;

// Recherche dans messages
let searchMatches   = [];
let searchIdx       = 0;

// Audio recorder
let mediaRecorder   = null;
let audioChunks     = [];
let recInterval     = null;
let recSeconds      = 0;

// ===== TOAST =====
function toast(msg, type = 'info', duration = 3200) {
    const c = document.getElementById('toastContainer');
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span><button onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    c.appendChild(el);
    setTimeout(() => { el.style.animation='slideInRight 0.3s reverse'; setTimeout(()=>el.remove(),300); }, duration);
}

// ===== SESSION & PROFIL =====
async function checkSession() {
    const { data:{session}, error } = await sb.auth.getSession();
    if (error || !session) { window.location.href='../auth/login.html'; return null; }
    currentUser = session.user;
    return currentUser;
}

async function loadProfile() {
    const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    if (error) { toast('Erreur profil','error'); return null; }
    currentProfile = data;
    return data;
}

// ===== INITIALISATION DE LA CONVERSATION =====
async function loadConversation(convId) {
    const { data, error } = await sb
        .from('conversations')
        .select(`
            id, is_group, group_name, group_avatar, updated_at,
            conversation_participants (
                user_id,
                profiles:user_id ( id, full_name, avatar_url, username, role, bio )
            )
        `)
        .eq('id', convId)
        .single();

    if (error || !data) { toast('Conversation introuvable','error'); goBack(); return; }
    currentConv = data;

    // Vérifier que l'utilisateur est bien dans cette conversation
    const isMember = data.conversation_participants?.some(p => p.user_id === currentProfile.id);
    if (!isMember) { toast('Accès refusé','error'); goBack(); return; }

    // Remplir le header
    if (data.is_group) {
        document.getElementById('contactName').textContent = data.group_name || 'Groupe';
        document.getElementById('contactAvatar').src = data.group_avatar || '../img/group-default.jpg';
        const count = data.conversation_participants?.length || 0;
        document.getElementById('contactStatus').textContent = `${count} participant${count>1?'s':''}`;
        document.title = `${data.group_name} | HubISoccer`;
        document.getElementById('optViewProfile').style.display = 'none';
        document.getElementById('optBlockUser').style.display = 'none';
    } else {
        const other = data.conversation_participants?.find(p => p.user_id !== currentProfile.id);
        const p = other?.profiles;
        document.getElementById('contactName').textContent = p?.full_name || 'Utilisateur';
        document.getElementById('contactAvatar').src = p?.avatar_url || '../img/user-default.jpg';
        document.getElementById('contactStatus').textContent = 'Hors ligne';
        document.title = `${p?.full_name || 'Discussion'} | HubISoccer`;
    }
}

// ===== CHARGEMENT DES MESSAGES (avec pagination) =====
async function loadMessages(before = null) {
    let query = sb
        .from('messages')
        .select('*, profiles:user_id ( id, full_name, avatar_url )')
        .eq('conversation_id', currentConvId)
        .not('deleted_for', 'cs', `{${currentProfile.id}}`)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) { toast('Erreur chargement messages','error'); return []; }

    hasMoreMsgs = data.length > PAGE_SIZE;
    const msgs  = hasMoreMsgs ? data.slice(1) : data;
    return msgs.reverse();
}

async function initMessages() {
    document.getElementById('msgLoader').style.display = 'flex';
    document.getElementById('messagesContainer').innerHTML = '';

    messages = await loadMessages();
    if (messages.length > 0) oldestMsgDate = messages[0].created_at;

    document.getElementById('loadMoreBtn').style.display = hasMoreMsgs ? 'block' : 'none';
    renderAllMessages();
    scrollToBottom(false);

    await markAsRead();
    loadPinnedMessages();
    document.getElementById('msgLoader').style.display = 'none';
}

// ===== RENDU DES MESSAGES =====
function renderAllMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    if (messages.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray);font-size:0.88rem">
            <i class="fas fa-comment-dots" style="font-size:2rem;margin-bottom:10px;opacity:0.3"></i>
            <p>Aucun message. Soyez le premier à écrire !</p>
        </div>`;
        return;
    }

    let lastDate   = null;
    let lastSender = null;

    messages.forEach((msg, idx) => {
        const msgDate = new Date(msg.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
        if (msgDate !== lastDate) {
            container.appendChild(makeDateSeparator(msgDate));
            lastDate   = msgDate;
            lastSender = null;
        }
        const isSameSender = msg.user_id === lastSender;
        container.appendChild(makeMessageRow(msg, isSameSender));
        lastSender = msg.user_id;
    });
}

function makeDateSeparator(label) {
    const el = document.createElement('div');
    el.className = 'date-separator';
    el.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    return el;
}

function makeMessageRow(msg, hideAvatar = false) {
    const isOwn = msg.user_id === currentProfile.id;
    const row   = document.createElement('div');
    row.className = `msg-row ${isOwn ? 'outgoing' : 'incoming'}`;
    row.dataset.msgId = msg.id;

    // Avatar (pour les messages reçus et les groupes)
    if (!isOwn) {
        const avatarEl = document.createElement('img');
        avatarEl.className = `msg-avatar ${hideAvatar ? 'hidden' : ''}`;
        avatarEl.src = msg.profiles?.avatar_url || '../img/user-default.jpg';
        avatarEl.alt = '';
        avatarEl.onerror = () => { avatarEl.src='../img/user-default.jpg'; };
        row.appendChild(avatarEl);
    }

    const wrap = document.createElement('div');
    wrap.className = 'msg-bubble-wrap';

    // Nom expéditeur dans les groupes
    if (!isOwn && currentConv?.is_group && !hideAvatar) {
        const nameEl = document.createElement('div');
        nameEl.className = 'msg-sender-name';
        nameEl.textContent = msg.profiles?.full_name || 'Utilisateur';
        wrap.appendChild(nameEl);
    }

    // Bulle
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.dataset.msgId = msg.id;
    bubble.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, msg); });
    bubble.addEventListener('click', (e) => {
        if (window.innerWidth <= 600) showContextMenu(e, msg);
    });

    // Réponse citée
    if (msg.reply_to_id) {
        const replyEl = makeReplyQuote(msg.reply_to_id, isOwn);
        bubble.appendChild(replyEl);
    }

    // Contenu texte
    if (msg.content) {
        const textEl = document.createElement('span');
        textEl.innerHTML = formatMsgText(msg.content);
        if (msg.edited) {
            textEl.innerHTML += ` <span class="msg-edited">(modifié)</span>`;
        }
        if (msg.pinned) {
            textEl.innerHTML += ` <i class="fas fa-thumbtack pin-icon"></i>`;
        }
        bubble.appendChild(textEl);
    }

    // Média
    if (msg.media_url) {
        const mediaEl = makeMediaElement(msg);
        if (mediaEl) bubble.appendChild(mediaEl);
    }

    wrap.appendChild(bubble);

    // Réactions
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        wrap.appendChild(makeReactionsBar(msg));
    }

    // Méta (heure + statut)
    const metaEl = document.createElement('div');
    metaEl.className = 'msg-meta';
    const time = new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    metaEl.innerHTML = `<span class="msg-time">${time}</span>`;
    if (isOwn) {
        metaEl.innerHTML += `<span class="msg-status">${getMsgStatusIcon(msg)}</span>`;
    }
    wrap.appendChild(metaEl);

    row.appendChild(wrap);
    return row;
}

function getMsgStatusIcon(msg) {
    if (msg.read_by && msg.read_by.length > 0)
        return `<i class="fas fa-check-double seen" title="Vu"></i>`;
    if (msg.delivered)
        return `<i class="fas fa-check-double delivered" title="Reçu"></i>`;
    return `<i class="fas fa-check sent" title="Envoyé"></i>`;
}

function makeReplyQuote(replyToId, isOwn) {
    const div = document.createElement('div');
    div.className = 'reply-quote';
    const original = messages.find(m => m.id === replyToId);
    if (original) {
        div.innerHTML = `
            <div class="reply-quote-name">${original.profiles?.full_name || 'Utilisateur'}</div>
            <div class="reply-quote-text">${escapeHtml(original.content?.substring(0,80) || '📎 Média')}</div>
        `;
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => scrollToMessage(replyToId));
    } else {
        div.innerHTML = `<div class="reply-quote-text">Message introuvable</div>`;
    }
    return div;
}

function makeMediaElement(msg) {
    const wrap = document.createElement('div');
    wrap.className = 'msg-media';
    if (msg.media_type === 'image') {
        wrap.innerHTML = `<img src="${msg.media_url}" alt="Image" loading="lazy">`;
        wrap.querySelector('img').addEventListener('click', () => openMediaZoom(msg.media_url, 'image'));
    } else if (msg.media_type === 'video') {
        wrap.innerHTML = `<video src="${msg.media_url}" controls preload="metadata"></video>`;
        wrap.querySelector('video').addEventListener('click', (e) => { e.preventDefault(); openMediaZoom(msg.media_url,'video'); });
    } else if (msg.media_type === 'audio') {
        wrap.innerHTML = `<audio controls src="${msg.media_url}"></audio>`;
    } else if (msg.media_type === 'file') {
        const ext = msg.media_url.split('.').pop().toUpperCase();
        wrap.innerHTML = `
            <a class="msg-file-link" href="${msg.media_url}" target="_blank" download>
                <i class="fas fa-file-alt"></i>
                <span>${msg.content || 'Fichier'} <small style="opacity:0.6">.${ext}</small></span>
                <i class="fas fa-download" style="font-size:0.8rem"></i>
            </a>`;
    } else { return null; }
    return wrap;
}

function makeReactionsBar(msg) {
    const div = document.createElement('div');
    div.className = 'msg-reactions';
    const counts = {};
    for (const [uid, emoji] of Object.entries(msg.reactions || {})) {
        if (!counts[emoji]) counts[emoji] = { count:0, users:[] };
        counts[emoji].count++;
        counts[emoji].users.push(uid);
    }
    for (const [emoji, info] of Object.entries(counts)) {
        const chip = document.createElement('div');
        chip.className = `reaction-chip ${info.users.includes(currentProfile.id) ? 'my-reaction' : ''}`;
        chip.innerHTML = `${emoji} <span class="reaction-count">${info.count}</span>`;
        chip.title = `${info.count} réaction${info.count>1?'s':''}`;
        chip.addEventListener('click', () => toggleReaction(msg.id, emoji));
        div.appendChild(chip);
    }
    return div;
}

function formatMsgText(text) {
    if (!text) return '';
    return escapeHtml(text)
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="text-decoration:underline;opacity:0.85">$1</a>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ===== AJOUTER / METTRE À JOUR UN MESSAGE =====
function appendMessage(msg) {
    const container = document.getElementById('messagesContainer');
    const lastMsg   = messages[messages.length - 1];

    // Séparateur de date si besoin
    const msgDate = new Date(msg.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
    const lastDate = lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}) : null;
    if (msgDate !== lastDate) container.appendChild(makeDateSeparator(msgDate));

    const isSameSender = lastMsg && lastMsg.user_id === msg.user_id;
    const row = makeMessageRow(msg, isSameSender);
    container.appendChild(row);
    messages.push(msg);

    // Auto-scroll si en bas
    const area = document.getElementById('messagesArea');
    const atBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
    if (atBottom) {
        scrollToBottom(true);
    } else {
        // Afficher badge scroll
        showScrollBadge();
    }
}

function updateMessageInDOM(msg) {
    const row = document.querySelector(`.msg-row[data-msg-id="${msg.id}"]`);
    if (!row) { renderAllMessages(); return; }
    const idx = messages.findIndex(m => m.id === msg.id);
    if (idx >= 0) messages[idx] = { ...messages[idx], ...msg };
    const isSameSender = idx > 0 && messages[idx-1]?.user_id === msg.user_id;
    const newRow = makeMessageRow(messages[idx] || msg, isSameSender);
    row.replaceWith(newRow);
}

function removeMessageFromDOM(msgId) {
    document.querySelector(`.msg-row[data-msg-id="${msgId}"]`)?.remove();
    messages = messages.filter(m => m.id !== msgId);
}

// ===== SCROLL =====
function scrollToBottom(smooth = true) {
    const area = document.getElementById('messagesArea');
    area.scrollTo({ top: area.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
    document.getElementById('scrollBottomBtn').style.display = 'none';
    document.getElementById('scrollUnreadBadge').style.display = 'none';
}

function scrollToMessage(msgId) {
    const el = document.querySelector(`.msg-row[data-msg-id="${msgId}"]`);
    if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.querySelector('.msg-bubble')?.classList.add('highlighted'); setTimeout(()=>el.querySelector('.msg-bubble')?.classList.remove('highlighted'),1500); }
}

function showScrollBadge() {
    const btn = document.getElementById('scrollBottomBtn');
    const badge = document.getElementById('scrollUnreadBadge');
    btn.style.display = 'flex';
    const count = parseInt(badge.textContent||'0') + 1;
    badge.textContent = count;
    badge.style.display = 'block';
}

// ===== ENVOI DE MESSAGE =====
async function sendMessage() {
    const input   = document.getElementById('msgInput');
    const content = input.value.trim();
    const btn     = document.getElementById('sendBtn');

    if (!content && !pendingFile && !pendingAudio) return;

    btn.disabled = true;

    try {
        let mediaUrl = null, mediaType = null;

        // Upload fichier
        if (pendingFile) {
            const file = pendingFile;
            if (file.type.startsWith('image/'))  mediaType = 'image';
            else if (file.type.startsWith('video/')) mediaType = 'video';
            else if (file.type.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'file';

            const ext      = file.name.split('.').pop();
            const fileName = `${currentProfile.id}_${Date.now()}.${ext}`;
            const { error: upErr } = await sb.storage.from('message-attachments').upload(fileName, file);
            if (upErr) { toast('Erreur upload : ' + upErr.message, 'error'); return; }
            const { data: urlData } = sb.storage.from('message-attachments').getPublicUrl(fileName);
            mediaUrl = urlData.publicUrl;
            clearAttachmentPreview();
        }

        // Upload audio
        if (pendingAudio) {
            const fileName = `${currentProfile.id}_audio_${Date.now()}.webm`;
            const { error: upErr } = await sb.storage.from('message-attachments').upload(fileName, pendingAudio);
            if (upErr) { toast('Erreur upload audio', 'error'); return; }
            const { data: urlData } = sb.storage.from('message-attachments').getPublicUrl(fileName);
            mediaUrl  = urlData.publicUrl;
            mediaType = 'audio';
            pendingAudio = null;
            stopAudioRecorder();
        }

        if (editingMsgId) {
            // Mode édition
            const { error } = await sb.from('messages')
                .update({ content, edited: true })
                .eq('id', editingMsgId)
                .eq('user_id', currentProfile.id);
            if (error) { toast('Erreur modification','error'); return; }
            const idx = messages.findIndex(m => m.id === editingMsgId);
            if (idx >= 0) { messages[idx].content = content; messages[idx].edited = true; updateMessageInDOM(messages[idx]); }
            cancelEdit();
        } else {
            // Nouveau message
            const msgData = {
                conversation_id: currentConvId,
                user_id: currentProfile.id,
                content: content || null,
                media_url: mediaUrl,
                media_type: mediaType,
                reply_to_id: pendingReply?.id || null,
                deleted_for: [],
                reactions: {},
                edited: false,
                pinned: false,
                delivered: false,
                read_by: []
            };
            const { data: inserted, error } = await sb.from('messages').insert(msgData).select('*, profiles:user_id(id,full_name,avatar_url)').single();
            if (error) { toast('Erreur envoi : ' + error.message, 'error'); return; }
            appendMessage(inserted);
            cancelReply();

            // MAJ updated_at de la conversation
            await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', currentConvId);
        }

        input.value = '';
        autoResizeInput();
        stopTyping();
    } finally {
        btn.disabled = false;
    }
}

// ===== RÉPONSE =====
function startReply(msg) {
    pendingReply = msg;
    cancelEdit();
    document.getElementById('replyBarName').textContent = msg.profiles?.full_name || 'Utilisateur';
    document.getElementById('replyBarText').textContent = msg.content?.substring(0,60) || '📎 Média';
    document.getElementById('replyBar').style.display   = 'flex';
    document.getElementById('msgInput').focus();
}
function cancelReply() {
    pendingReply = null;
    document.getElementById('replyBar').style.display = 'none';
}

// ===== ÉDITION =====
function startEdit(msg) {
    if (msg.user_id !== currentProfile.id) return;
    editingMsgId = msg.id;
    cancelReply();
    document.getElementById('editBar').style.display = 'flex';
    const input = document.getElementById('msgInput');
    input.value = msg.content || '';
    input.focus();
    autoResizeInput();
}
function cancelEdit() {
    editingMsgId = null;
    document.getElementById('editBar').style.display = 'none';
    document.getElementById('msgInput').value = '';
    autoResizeInput();
}

// ===== SUPPRESSION =====
async function deleteMessage(msgId, forEveryone) {
    closeModal('modalConfirm');
    if (forEveryone) {
        const { error } = await sb.from('messages').delete().eq('id', msgId);
        if (error) { toast('Erreur suppression','error'); return; }
        removeMessageFromDOM(msgId);
    } else {
        const { error } = await sb.rpc('delete_message_for_user', { message_id: msgId, user_id: currentProfile.id });
        if (error) {
            // Fallback si la RPC n'existe pas encore
            const msg = messages.find(m => m.id === msgId);
            if (msg) {
                const newDeleted = [...(msg.deleted_for || []), currentProfile.id];
                await sb.from('messages').update({ deleted_for: newDeleted }).eq('id', msgId);
                removeMessageFromDOM(msgId);
            }
            return;
        }
        removeMessageFromDOM(msgId);
    }
    toast('Message supprimé','success');
}

// ===== ÉPINGLAGE =====
async function togglePin(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newPinned = !msg.pinned;
    const { error } = await sb.from('messages').update({ pinned: newPinned }).eq('id', msgId);
    if (error) { toast('Erreur épinglage','error'); return; }
    msg.pinned = newPinned;
    updateMessageInDOM(msg);
    loadPinnedMessages();
    toast(newPinned ? 'Message épinglé ✅' : 'Message désépinglé', 'success');
}

// ===== MESSAGES ÉPINGLÉS =====
async function loadPinnedMessages() {
    const { data } = await sb.from('messages').select('*, profiles:user_id(full_name)')
        .eq('conversation_id', currentConvId).eq('pinned', true).order('created_at',{ascending:false});
    pinnedMessages = data || [];

    const banner = document.getElementById('pinnedBanner');
    if (pinnedMessages.length > 0) {
        banner.style.display = 'flex';
        document.getElementById('pinnedBannerText').textContent =
            pinnedMessages[0].content?.substring(0,50) || '📎 Média';
    } else {
        banner.style.display = 'none';
    }
}

function showPinnedModal() {
    const list = document.getElementById('pinnedList');
    if (pinnedMessages.length === 0) {
        list.innerHTML = `<p style="text-align:center;color:var(--gray);padding:20px">Aucun message épinglé</p>`;
    } else {
        list.innerHTML = pinnedMessages.map(m => `
            <div class="pinned-msg-item" data-id="${m.id}">
                <div class="pinned-msg-text">${escapeHtml(m.content?.substring(0,100) || '📎 Média')}</div>
                <div class="pinned-msg-meta">${m.profiles?.full_name || ''} · ${new Date(m.created_at).toLocaleDateString()}</div>
            </div>
        `).join('');
        list.querySelectorAll('.pinned-msg-item').forEach(el => {
            el.addEventListener('click', () => { closeModal('modalPinned'); scrollToMessage(el.dataset.id); });
        });
    }
    openModal('modalPinned');
}

// ===== RÉACTIONS =====
async function toggleReaction(msgId, emoji) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    if (reactions[currentProfile.id] === emoji) {
        delete reactions[currentProfile.id];
    } else {
        reactions[currentProfile.id] = emoji;
    }
    const { error } = await sb.from('messages').update({ reactions }).eq('id', msgId);
    if (error) { toast('Erreur réaction','error'); return; }
    msg.reactions = reactions;
    updateMessageInDOM(msg);
}

// ===== TRANSFERT =====
async function loadConvsForForward() {
    const { data: parts } = await sb.from('conversation_participants')
        .select('conversation_id').eq('user_id', currentProfile.id);
    const ids = (parts||[]).map(p=>p.conversation_id);
    if (!ids.length) { document.getElementById('forwardList').innerHTML='<p style="color:var(--gray);padding:16px">Aucune conversation</p>'; return; }

    const { data: convs } = await sb.from('conversations')
        .select(`id, is_group, group_name, group_avatar,
            conversation_participants( user_id, profiles:user_id(full_name,avatar_url) )`)
        .in('id', ids).neq('id', currentConvId);

    allConversations = convs || [];
    renderForwardList(allConversations);
    document.getElementById('forwardSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderForwardList(allConversations.filter(c => getConvName(c).toLowerCase().includes(q)));
    });
}

function getConvName(conv) {
    if (conv.is_group) return conv.group_name || 'Groupe';
    const other = conv.conversation_participants?.find(p => p.user_id !== currentProfile.id);
    return other?.profiles?.full_name || 'Utilisateur';
}
function getConvAvatar(conv) {
    if (conv.is_group) return conv.group_avatar || '../img/group-default.jpg';
    const other = conv.conversation_participants?.find(p => p.user_id !== currentProfile.id);
    return other?.profiles?.avatar_url || '../img/user-default.jpg';
}

function renderForwardList(list) {
    const el = document.getElementById('forwardList');
    el.innerHTML = list.map(c => `
        <div class="forward-item" data-conv-id="${c.id}">
            <img src="${getConvAvatar(c)}" alt="" onerror="this.src='../img/user-default.jpg'">
            <span class="forward-item-name">${escapeHtml(getConvName(c))}</span>
        </div>
    `).join('');
    el.querySelectorAll('.forward-item').forEach(item => {
        item.addEventListener('click', () => forwardMessage(item.dataset.convId));
    });
}

async function forwardMessage(targetConvId) {
    const msg = messages.find(m => m.id === ctxMsgId);
    if (!msg) return;
    const { error } = await sb.from('messages').insert({
        conversation_id: targetConvId,
        user_id: currentProfile.id,
        content: msg.content || null,
        media_url: msg.media_url || null,
        media_type: msg.media_type || null,
        deleted_for: [], reactions: {}, edited: false, pinned: false,
        delivered: false, read_by: []
    });
    if (error) { toast('Erreur transfert','error'); return; }
    toast('Message transféré ✅','success');
    closeModal('modalForward');
    await sb.from('conversations').update({updated_at:new Date().toISOString()}).eq('id',targetConvId);
}

// ===== MENU CONTEXTUEL =====
function showContextMenu(e, msg) {
    e.preventDefault();
    const menu = document.getElementById('contextMenu');
    ctxMsgId   = msg.id;
    const isOwn = msg.user_id === currentProfile.id;

    document.getElementById('ctxEdit').style.display    = isOwn && msg.content ? 'flex' : 'none';
    document.getElementById('ctxDeleteAll').style.display = isOwn ? 'flex' : 'none';

    // Positionner
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    menu.style.left = `${x}px`;
    menu.style.top  = `${y}px`;
    menu.style.display = 'block';

    document.addEventListener('click', hideContextMenu, { once: true });
}
function hideContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
    document.getElementById('reactionPicker').style.display = 'none';
    ctxMsgId = null;
}

// ===== PICKER RÉACTIONS (depuis menu contextuel) =====
function showReactionPicker(e) {
    const picker = document.getElementById('reactionPicker');
    const menu   = document.getElementById('contextMenu');
    const x = Math.min(e.clientX, window.innerWidth - 300);
    const y = parseInt(menu.style.top) - 60;
    picker.style.left = `${x}px`;
    picker.style.top  = `${y}px`;
    picker.style.display = 'flex';
    menu.style.display = 'none';
}

// ===== PROFIL UTILISATEUR =====
async function showUserProfile(userId) {
    const { data, error } = await sb.from('profiles')
        .select('id, full_name, avatar_url, username, role, bio').eq('id', userId).single();
    if (error || !data) return;

    const roleKey = localStorage.getItem('hubisoccer_role') || 'player';
    const dashBase = localStorage.getItem('hubisoccer_dashboard') || '../players/dashboard.html';
    const spaceFolder = dashBase.replace('/dashboard.html','');

    document.getElementById('profileContent').innerHTML = `
        <div class="profile-card-header"></div>
        <img class="profile-card-avatar" src="${data.avatar_url||'../img/user-default.jpg'}" alt="">
        <div class="profile-card-body">
            <h3>${escapeHtml(data.full_name||'Utilisateur')}</h3>
            <p>@${escapeHtml(data.username||'')} · ${escapeHtml(data.role||'')}</p>
            ${data.bio ? `<p class="profile-card-bio">${escapeHtml(data.bio)}</p>` : ''}
            <div class="profile-card-actions">
                <a class="btn-view-profile" href="${spaceFolder}/public-profile.html?id=${userId}">
                    <i class="fas fa-user"></i> Voir le profil
                </a>
                <button class="btn-block-user" onclick="promptBlockUser('${userId}')">
                    <i class="fas fa-ban"></i> Bloquer
                </button>
            </div>
        </div>
    `;
    openModal('modalProfile');
}

async function promptBlockUser(userId) {
    closeModal('modalProfile');
    document.getElementById('confirmTitle').textContent = 'Bloquer cet utilisateur';
    document.getElementById('confirmDesc').textContent  = 'Vous ne pourrez plus vous envoyer de messages. Confirmer ?';
    const btn = document.getElementById('confirmActionBtn');
    btn.textContent = 'Bloquer';
    btn.className   = 'btn-confirm danger';
    btn.onclick     = () => blockUser(userId);
    openModal('modalConfirm');
}

async function blockUser(userId) {
    closeModal('modalConfirm');
    const { error } = await sb.from('blocked_users')
        .insert({ user_id: currentProfile.id, blocked_user_id: userId });
    if (error) { toast('Erreur blocage','error'); return; }
    toast('Utilisateur bloqué','success');
    goBack();
}

// ===== SUPPRESSION CONVERSATION =====
async function promptDeleteConv() {
    document.getElementById('confirmTitle').textContent = 'Supprimer la conversation';
    document.getElementById('confirmDesc').textContent  = 'Cette action est irréversible pour vous.';
    const btn = document.getElementById('confirmActionBtn');
    btn.textContent = 'Supprimer';
    btn.className   = 'btn-confirm danger';
    btn.onclick     = deleteConversation;
    openModal('modalConfirm');
}

async function deleteConversation() {
    closeModal('modalConfirm');
    await sb.from('conversation_participants').delete()
        .eq('conversation_id', currentConvId).eq('user_id', currentProfile.id);
    const { count } = await sb.from('conversation_participants')
        .select('*',{count:'exact',head:true}).eq('conversation_id', currentConvId);
    if ((count||0) === 0) {
        await sb.from('messages').delete().eq('conversation_id', currentConvId);
        await sb.from('conversations').delete().eq('id', currentConvId);
    }
    toast('Conversation supprimée','success');
    goBack();
}

// ===== LU / NON LU =====
async function markAsRead() {
    await sb.from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', currentConvId)
        .eq('user_id', currentProfile.id);
}

// ===== TEMPS RÉEL =====
function subscribeMessages() {
    if (msgSubscription) msgSubscription.unsubscribe();

    msgSubscription = sb.channel(`discuss:${currentConvId}`)
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${currentConvId}` },
            async (payload) => {
                const msg = payload.new;
                if (msg.user_id === currentProfile.id) return;
                if (msg.deleted_for?.includes(currentProfile.id)) return;
                const { data: author } = await sb.from('profiles').select('id,full_name,avatar_url').eq('id',msg.user_id).single();
                appendMessage({ ...msg, profiles: author });
                markAsRead();
                stopTypingIndicator();
            })
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'messages', filter:`conversation_id=eq.${currentConvId}` },
            (payload) => {
                const msg = payload.new;
                if (msg.deleted_for?.includes(currentProfile.id)) { removeMessageFromDOM(msg.id); return; }
                const existing = messages.find(m => m.id === msg.id);
                if (existing) updateMessageInDOM({ ...existing, ...msg });
                // MAJ messages épinglés
                if (msg.pinned !== undefined) loadPinnedMessages();
            })
        .on('postgres_changes', { event:'DELETE', schema:'public', table:'messages', filter:`conversation_id=eq.${currentConvId}` },
            (payload) => removeMessageFromDOM(payload.old.id))
        .subscribe();
}

// ===== INDICATEUR DE FRAPPE =====
function subscribeTyping() {
    typingSubscription = sb.channel(`typing:${currentConvId}`)
        .on('broadcast', { event:'typing' }, (payload) => {
            if (payload.payload.user_id === currentProfile.id) return;
            showTypingIndicator(payload.payload.avatar, payload.payload.name);
            clearTimeout(typingSubscription._typingHide);
            typingSubscription._typingHide = setTimeout(stopTypingIndicator, 3000);
        })
        .subscribe();
}

function sendTypingEvent() {
    typingSubscription?.send({
        type:'broadcast', event:'typing',
        payload: { user_id: currentProfile.id, name: currentProfile.full_name, avatar: currentProfile.avatar_url||'../img/user-default.jpg' }
    });
}

function showTypingIndicator(avatar, name) {
    document.getElementById('typingAvatar').src = avatar || '../img/user-default.jpg';
    document.getElementById('typingIndicator').style.display = 'flex';
    const area = document.getElementById('messagesArea');
    area.scrollTop = area.scrollHeight;
}
function stopTypingIndicator() {
    document.getElementById('typingIndicator').style.display = 'none';
}

// ===== PRÉSENCE =====
function initPresence() {
    presenceChannel = sb.channel('hubisoccer_presence');
    presenceChannel
        .on('presence', { event:'sync' }, () => {
            const state = presenceChannel.presenceState();
            onlineUsers = new Set(Object.values(state).flat().map(p => p.user_id));
            updateOnlineStatus();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ user_id: currentProfile.id, online_at: new Date().toISOString() });
            }
        });
}

function updateOnlineStatus() {
    if (!currentConv || currentConv.is_group) return;
    const other = currentConv.conversation_participants?.find(p => p.user_id !== currentProfile.id);
    if (!other) return;
    const isOnline = onlineUsers.has(other.user_id);
    const indicator = document.getElementById('onlineIndicator');
    const status    = document.getElementById('contactStatus');
    indicator.classList.toggle('online', isOnline);
    status.textContent = isOnline ? 'En ligne' : 'Hors ligne';
    status.className = `contact-status ${isOnline ? 'online' : ''}`;
}

// ===== GESTION INPUT TEXTAREA =====
function autoResizeInput() {
    const el = document.getElementById('msgInput');
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function startTyping() {
    if (!isTyping) { isTyping = true; sendTypingEvent(); }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 2500);
}
function stopTyping() {
    isTyping = false;
    clearTimeout(typingTimeout);
}

// ===== PIÈCES JOINTES =====
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { toast('Fichier trop volumineux (max 500 Mo)','warning'); return; }
    pendingFile = file;
    showAttachmentPreview(file);
}

function showAttachmentPreview(file) {
    const el   = document.getElementById('attachmentPreview');
    const size  = formatFileSize(file.size);
    let thumbHtml = '';
    if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        thumbHtml = `<img class="preview-thumb" src="${url}" alt="">`;
    } else {
        const icons = { 'video/':'fa-video', 'audio/':'fa-music', 'application/pdf':'fa-file-pdf', 'default':'fa-file' };
        const iconKey = Object.keys(icons).find(k => file.type.startsWith(k)) || 'default';
        thumbHtml = `<div class="preview-icon"><i class="fas ${icons[iconKey]}"></i></div>`;
    }
    el.innerHTML = `
        ${thumbHtml}
        <div class="preview-info">
            <div class="preview-name">${escapeHtml(file.name)}</div>
            <div class="preview-size">${size}</div>
        </div>
        <button class="preview-remove" id="removePreviewBtn"><i class="fas fa-times"></i></button>
    `;
    el.style.display = 'flex';
    document.getElementById('removePreviewBtn').addEventListener('click', clearAttachmentPreview);
}

function clearAttachmentPreview() {
    pendingFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('attachmentPreview').style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} Ko`;
    return `${(bytes/(1024*1024)).toFixed(1)} Mo`;
}

// ===== ENREGISTREMENT AUDIO =====
async function startAudioRecorder() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks   = [];
        recSeconds    = 0;
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            pendingAudio = new Blob(audioChunks, { type:'audio/webm' });
            stream.getTracks().forEach(t => t.stop());
            document.getElementById('audioRecorderBar').style.display = 'none';
            sendMessage();
        };
        mediaRecorder.start();
        document.getElementById('audioRecorderBar').style.display = 'flex';
        document.getElementById('recTime').textContent = '0:00';
        recInterval = setInterval(() => {
            recSeconds++;
            const m = Math.floor(recSeconds/60);
            const s = recSeconds % 60;
            document.getElementById('recTime').textContent = `${m}:${s.toString().padStart(2,'0')}`;
            if (recSeconds >= 300) stopAudioRecorder();
        }, 1000);
    } catch (err) {
        toast('Impossible d\'accéder au microphone','error');
    }
}

function stopAudioRecorder() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    clearInterval(recInterval);
    document.getElementById('audioRecorderBar').style.display = 'none';
}

function cancelAudioRecorder() {
    pendingAudio = null;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
    }
    clearInterval(recInterval);
    document.getElementById('audioRecorderBar').style.display = 'none';
}

// ===== EMOJI PICKER =====
function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    if (picker.style.display === 'none') {
        if (!picker.innerHTML) buildEmojiPicker();
        picker.style.display = 'flex';
    } else {
        picker.style.display = 'none';
    }
}
function buildEmojiPicker() {
    const emojis = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','🙂','🤗','🤩','🤔','😐','😶','🙄','😏','😒','😔','😕','🙃','😲','☹️','😖','😞','😟','😤','😢','😭','😦','😨','😩','😰','😱','😳','😡','😠','🤬','😷','🥴','😵','🤠','🥳','😈','👿','😺','😸','😹','🎉','🎊','👍','👎','👏','🙏','💪','🤝','❤️','🔥','⚽','🏀','🏈','⚾','🎾','🏐','🏉','🥊','⛹️','🏋️','🤸','🏆','🥇','🎯','💯','✅','❌','⚡','💫','🌟','⭐','🌙','☀️'];
    const picker = document.getElementById('emojiPicker');
    picker.innerHTML = emojis.map(e => `<span>${e}</span>`).join('');
    picker.querySelectorAll('span').forEach(el => {
        el.addEventListener('click', () => {
            document.getElementById('msgInput').value += el.textContent;
            document.getElementById('emojiPicker').style.display = 'none';
            document.getElementById('msgInput').focus();
        });
    });
}

// ===== RECHERCHE DANS LES MESSAGES =====
function toggleMsgSearch() {
    const bar = document.getElementById('msgSearchBar');
    if (bar.style.display === 'none') {
        bar.style.display = 'flex';
        document.getElementById('msgSearchInput').focus();
    } else {
        bar.style.display = 'none';
        clearMsgSearch();
    }
}

function searchInMessages(query) {
    // Retirer les highlights précédents
    document.querySelectorAll('.msg-bubble.search-match').forEach(el => el.classList.remove('search-match','current-match'));
    searchMatches = [];
    if (!query) { document.getElementById('msgSearchCount').textContent=''; return; }

    const q = query.toLowerCase();
    document.querySelectorAll('.msg-bubble').forEach(el => {
        if (el.textContent.toLowerCase().includes(q)) {
            el.classList.add('search-match');
            searchMatches.push(el);
        }
    });
    searchIdx = 0;
    document.getElementById('msgSearchCount').textContent = searchMatches.length ? `${searchIdx+1}/${searchMatches.length}` : '0 résultat';
    if (searchMatches.length) highlightSearchMatch();
}

function highlightSearchMatch() {
    document.querySelectorAll('.msg-bubble.current-match').forEach(el => el.classList.remove('current-match'));
    const el = searchMatches[searchIdx];
    if (!el) return;
    el.classList.add('current-match');
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    document.getElementById('msgSearchCount').textContent = `${searchIdx+1}/${searchMatches.length}`;
}

function clearMsgSearch() {
    document.querySelectorAll('.msg-bubble.search-match,.msg-bubble.current-match').forEach(el => el.classList.remove('search-match','current-match'));
    document.getElementById('msgSearchInput').value = '';
    document.getElementById('msgSearchCount').textContent = '';
    searchMatches = [];
}

// ===== PAGINATION (charger plus) =====
async function loadMoreMessages() {
    if (!hasMoreMsgs || !oldestMsgDate) return;
    const btn = document.getElementById('loadMoreMsgs');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
    btn.disabled = true;

    const older = await loadMessages(oldestMsgDate);
    if (older.length > 0) {
        oldestMsgDate = older[0].created_at;
        messages = [...older, ...messages];

        const container = document.getElementById('messagesContainer');
        const prevScrollHeight = container.scrollHeight;

        // Prépend
        const frag = document.createDocumentFragment();
        older.forEach((msg, i) => frag.appendChild(makeMessageRow(msg, i > 0 && older[i-1]?.user_id === msg.user_id)));
        container.insertBefore(frag, container.firstChild);

        // Garder la position de scroll
        const area = document.getElementById('messagesArea');
        area.scrollTop += container.scrollHeight - prevScrollHeight;
    }

    document.getElementById('loadMoreBtn').style.display = hasMoreMsgs ? 'block' : 'none';
    btn.innerHTML = '<i class="fas fa-arrow-up"></i> Charger les messages précédents';
    btn.disabled = false;
}

// ===== ZOOM MÉDIA =====
function openMediaZoom(url, type) {
    const viewer = document.getElementById('mediaViewer');
    viewer.innerHTML = type === 'image'
        ? `<img src="${url}" alt="Zoom">`
        : `<video src="${url}" controls autoplay></video>`;
    openModal('modalMedia');
}

// ===== MODALES =====
function openModal(id)  { const el=document.getElementById(id); if(el){el.style.display='flex'; setTimeout(()=>el.classList.add('show'),10);} }
function closeModal(id) { const el=document.getElementById(id); if(el){el.classList.remove('show'); el.style.display='none';} }

// ===== NAVIGATION RETOUR =====
function goBack() {
    window.location.href = 'messages.html';
}

// ===== INIT PRINCIPALE =====
async function init() {
    const user = await checkSession();
    if (!user) return;

    await loadProfile();

    // Récupérer l'ID de conversation depuis l'URL
    const params = new URLSearchParams(window.location.search);
    currentConvId = params.get('conv');
    if (!currentConvId) { toast('Conversation non spécifiée','error'); goBack(); return; }

    await loadConversation(currentConvId);
    await initMessages();
    initPresence();
    subscribeMessages();
    subscribeTyping();

    // ===== BOUTONS HEADER =====
    document.getElementById('backBtn').addEventListener('click', goBack);

    document.getElementById('chatContact').addEventListener('click', () => {
        if (!currentConv?.is_group) {
            const other = currentConv?.conversation_participants?.find(p => p.user_id !== currentProfile.id);
            if (other) showUserProfile(other.user_id);
        }
    });

    document.getElementById('searchMsgBtn').addEventListener('click', toggleMsgSearch);
    document.getElementById('pinnedMsgBtn').addEventListener('click', showPinnedModal);
    document.getElementById('viewPinnedBtn').addEventListener('click', showPinnedModal);

    document.getElementById('moreOptionsBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('optionsMenu').classList.toggle('show');
    });
    document.addEventListener('click', () => document.getElementById('optionsMenu')?.classList.remove('show'));

    document.getElementById('optViewProfile').addEventListener('click', () => {
        const other = currentConv?.conversation_participants?.find(p => p.user_id !== currentProfile.id);
        if (other) showUserProfile(other.user_id);
    });

    document.getElementById('optArchiveConv').addEventListener('click', async () => {
        await sb.from('archived_conversations').insert({ user_id: currentProfile.id, conversation_id: currentConvId });
        toast('Conversation archivée','success'); goBack();
    });

    document.getElementById('optBlockUser').addEventListener('click', () => {
        const other = currentConv?.conversation_participants?.find(p => p.user_id !== currentProfile.id);
        if (other) promptBlockUser(other.user_id);
    });

    document.getElementById('optDeleteConv').addEventListener('click', promptDeleteConv);

    // ===== SAISIE =====
    const input = document.getElementById('msgInput');
    input.addEventListener('input', () => { autoResizeInput(); startTyping(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('attachBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('audioBtn').addEventListener('click', startAudioRecorder);
    document.getElementById('emojiBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleEmojiPicker(); });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#emojiPicker') && !e.target.closest('#emojiBtn')) {
            document.getElementById('emojiPicker').style.display = 'none';
        }
    });

    // ===== REPLY / EDIT BARS =====
    document.getElementById('replyBarClose').addEventListener('click', cancelReply);
    document.getElementById('editBarClose').addEventListener('click', cancelEdit);

    // ===== AUDIO RECORDER =====
    document.getElementById('recStopBtn').addEventListener('click', stopAudioRecorder);
    document.getElementById('recCancelBtn').addEventListener('click', cancelAudioRecorder);

    // ===== MENU CONTEXTUEL =====
    document.getElementById('ctxReply').addEventListener('click', () => {
        const msg = messages.find(m => m.id === ctxMsgId);
        if (msg) startReply(msg);
    });
    document.getElementById('ctxReact').addEventListener('click', (e) => showReactionPicker(e));
    document.getElementById('ctxCopy').addEventListener('click', () => {
        const msg = messages.find(m => m.id === ctxMsgId);
        if (msg?.content) { navigator.clipboard.writeText(msg.content); toast('Copié !','success'); }
    });
    document.getElementById('ctxEdit').addEventListener('click', () => {
        const msg = messages.find(m => m.id === ctxMsgId);
        if (msg) startEdit(msg);
    });
    document.getElementById('ctxPin').addEventListener('click', () => { if(ctxMsgId) togglePin(ctxMsgId); });
    document.getElementById('ctxForward').addEventListener('click', () => {
        document.getElementById('forwardSearch').value = '';
        loadConvsForForward();
        openModal('modalForward');
    });
    document.getElementById('ctxDeleteMe').addEventListener('click', () => {
        if (ctxMsgId) deleteMessage(ctxMsgId, false);
    });
    document.getElementById('ctxDeleteAll').addEventListener('click', () => {
        document.getElementById('confirmTitle').textContent = 'Supprimer pour tous ?';
        document.getElementById('confirmDesc').textContent  = 'Ce message sera supprimé pour tous les participants.';
        const btn = document.getElementById('confirmActionBtn');
        btn.textContent = 'Supprimer pour tous';
        btn.className   = 'btn-confirm danger';
        btn.onclick     = () => deleteMessage(ctxMsgId, true);
        openModal('modalConfirm');
    });

    // ===== RÉACTION PICKER =====
    document.getElementById('reactionPicker').querySelectorAll('span').forEach(el => {
        el.addEventListener('click', () => {
            if (ctxMsgId) toggleReaction(ctxMsgId, el.dataset.emoji);
            document.getElementById('reactionPicker').style.display = 'none';
        });
    });

    // ===== RECHERCHE MESSAGES =====
    document.getElementById('msgSearchInput').addEventListener('input', (e) => searchInMessages(e.target.value));
    document.getElementById('msgSearchClose').addEventListener('click', () => {
        document.getElementById('msgSearchBar').style.display = 'none';
        clearMsgSearch();
    });
    document.getElementById('msgSearchPrev').addEventListener('click', () => {
        if (!searchMatches.length) return;
        searchIdx = (searchIdx - 1 + searchMatches.length) % searchMatches.length;
        highlightSearchMatch();
    });
    document.getElementById('msgSearchNext').addEventListener('click', () => {
        if (!searchMatches.length) return;
        searchIdx = (searchIdx + 1) % searchMatches.length;
        highlightSearchMatch();
    });

    // ===== SCROLL =====
    const area = document.getElementById('messagesArea');
    area.addEventListener('scroll', () => {
        const atBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
        const btn = document.getElementById('scrollBottomBtn');
        if (atBottom) {
            btn.style.display = 'none';
            document.getElementById('scrollUnreadBadge').style.display = 'none';
        }
    });
    document.getElementById('scrollBottomBtn').addEventListener('click', () => scrollToBottom(true));
    document.getElementById('loadMoreMsgs').addEventListener('click', loadMoreMessages);

    // ===== FERMER MODALES =====
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal.id); });
    });
}

// Exposer pour les onclick HTML
window.closeModal = closeModal;
window.promptBlockUser = promptBlockUser;

document.addEventListener('DOMContentLoaded', init);
