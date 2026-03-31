// ============================================================
//  HUBISOCCER — MESSAGES.JS (Shared)
//  Liste des conversations — Tous rôles
// ============================================================

// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL  = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ===== ÉTAT GLOBAL =====
let currentUser    = null;
let currentProfile = null;
let conversations  = [];
let onlineUsers    = new Set();
let showArchives   = false;
let activeFilter   = 'all';
let searchQuery    = '';
let convSubscription = null;
let presenceChannel  = null;
let selectedGroupMembers = [];

// ===== CONFIGURATION PAR RÔLE =====
// Adapte les menus et les liens selon le rôle stocké dans localStorage ou profiles.role
const ROLE_CONFIG = {
    player: {
        label: 'Espace Joueur',
        dashboardPath: '../players/dashboard.html',
        profilePath: '../players/profile-edit.html',
        settingsPath: '../players/support.html',
        communityPath: '../players/feed.html',
        menuItems: [
            { icon: 'fa-tachometer-alt', label: 'Tableau de bord', href: '../players/dashboard.html' },
            { icon: 'fa-users',          label: 'Ma Communauté',   href: '../players/feed.html' },
            { icon: 'fa-shield-alt',     label: 'Vérification',    href: '../players/verification.html' },
            { icon: 'fa-file-alt',       label: 'Mon CV Pro',       href: '../players/edit-cv.html' },
            { icon: 'fa-certificate',    label: 'Diplômes & Certifs',href: '../players/certifications.html' },
            { icon: 'fa-trophy',         label: 'Tournois (Live)',  href: '../players/tournaments.html' },
            { icon: 'fa-exchange-alt',   label: 'Transferts',       href: '../players/transfers.html' },
            { icon: 'fa-video',          label: 'Mes Vidéos',       href: '../players/videos.html' },
            { icon: 'fa-coins',          label: 'Mes Revenus',      href: '../players/revenue.html' },
            { icon: 'fa-envelope',       label: 'Messages',         href: './messages.html', active: true },
            { icon: 'fa-headset',        label: 'Support',          href: '../players/support.html' },
        ]
    },
    agentfifa: {
        label: 'Espace Agent FIFA',
        dashboardPath: '../agentfifaprive/dashboard.html',
        profilePath: '../agentfifaprive/profile-edit.html',
        settingsPath: '../agentfifaprive/support.html',
        communityPath: '../agentfifaprive/feed.html',
        menuItems: [
            { icon: 'fa-tachometer-alt', label: 'Tableau de bord', href: '../agentfifaprive/dashboard.html' },
            { icon: 'fa-users',          label: 'Ma Communauté',   href: '../agentfifaprive/feed.html' },
            { icon: 'fa-envelope',       label: 'Messages',         href: './messages.html', active: true },
            { icon: 'fa-headset',        label: 'Support',          href: '../agentfifaprive/support.html' },
        ]
    },
    coach: {
        label: 'Espace Coach',
        dashboardPath: '../coach/dashboard.html',
        profilePath: '../coach/profile-edit.html',
        settingsPath: '../coach/support.html',
        communityPath: '../coach/feed.html',
        menuItems: [
            { icon: 'fa-tachometer-alt', label: 'Tableau de bord', href: '../coach/dashboard.html' },
            { icon: 'fa-users',          label: 'Ma Communauté',   href: '../coach/feed.html' },
            { icon: 'fa-envelope',       label: 'Messages',         href: './messages.html', active: true },
            { icon: 'fa-headset',        label: 'Support',          href: '../coach/support.html' },
        ]
    },
    parrain: {
        label: 'Espace Parrain',
        dashboardPath: '../parrainprive/dashboard.html',
        profilePath: '../parrainprive/profile-edit.html',
        settingsPath: '../parrainprive/support.html',
        communityPath: '../parrainprive/feed.html',
        menuItems: [
            { icon: 'fa-tachometer-alt', label: 'Tableau de bord', href: '../parrainprive/dashboard.html' },
            { icon: 'fa-users',          label: 'Ma Communauté',   href: '../parrainprive/feed.html' },
            { icon: 'fa-envelope',       label: 'Messages',         href: './messages.html', active: true },
            { icon: 'fa-headset',        label: 'Support',          href: '../parrainprive/support.html' },
        ]
    },
    // Rôle par défaut (fallback)
    default: {
        label: 'Espace Privé',
        dashboardPath: '../index.html',
        profilePath: '#',
        settingsPath: '#',
        communityPath: '#',
        menuItems: [
            { icon: 'fa-envelope', label: 'Messages', href: './messages.html', active: true },
        ]
    }
};

// Détecte le rôle depuis localStorage ou profiles.role
function getRoleKey(profileRole) {
    const map = {
        'player': 'player', 'joueur': 'player', 'footballeur': 'player',
        'basketball': 'player', 'tennis': 'player', 'athletisme': 'player',
        'handball': 'player', 'volleyball': 'player', 'rugby': 'player',
        'natation': 'player', 'arts_martiaux': 'player', 'cyclisme': 'player',
        'agent_fifa': 'agentfifa', 'agentfifa': 'agentfifa',
        'coach': 'coach',
        'parrain': 'parrain',
    };
    const stored = localStorage.getItem('hubisoccer_role');
    return map[stored] || map[profileRole] || 'default';
}

// ===== TOAST =====
function toast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
        <span class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></span>
        <span class="toast-text">${msg}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    el.querySelector('.toast-close').addEventListener('click', () => removeToast(el));
    container.appendChild(el);
    setTimeout(() => removeToast(el), duration);
}
function removeToast(el) {
    el.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => el.remove(), 300);
}

// ===== SESSION =====
async function checkSession() {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) {
        window.location.href = '../auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== PROFIL =====
async function loadProfile() {
    const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (error) { toast('Impossible de charger le profil', 'error'); return null; }
    currentProfile = data;

    // UI Navbar
    document.getElementById('userName').textContent = data.full_name || 'Utilisateur';
    document.getElementById('userAvatar').src = data.avatar_url || '../img/user-default.jpg';

    // Sidebar selon rôle
    const roleKey = getRoleKey(data.role);
    const config  = ROLE_CONFIG[roleKey] || ROLE_CONFIG.default;
    localStorage.setItem('hubisoccer_role', roleKey);
    localStorage.setItem('hubisoccer_dashboard', config.dashboardPath);

    document.getElementById('navSpaceTitle').textContent = config.label;
    document.getElementById('sidebarTitle').textContent  = config.label;

    // Construire le menu
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = config.menuItems.map(item => `
        <a href="${item.href}" class="${item.active ? 'active' : ''}">
            <i class="fas ${item.icon}"></i> ${item.label}
        </a>
    `).join('') + `
        <hr>
        <a href="#" id="sidebarLogout" style="color:var(--danger)">
            <i class="fas fa-sign-out-alt"></i> Déconnexion
        </a>
    `;
    document.getElementById('sidebarLogout')?.addEventListener('click', logout);

    // Liens navbar dropdown
    document.getElementById('dropProfile').href    = config.profilePath;
    document.getElementById('dropDashboard').href  = config.dashboardPath;
    document.getElementById('dropSettings').href   = config.settingsPath;
    document.getElementById('emptyCommunityLink').href = config.communityPath;

    // Logo → dashboard
    document.getElementById('navLogo').onclick = () => window.location.href = config.dashboardPath;

    return currentProfile;
}

// ===== DÉCONNEXION =====
async function logout() {
    await sb.auth.signOut();
    localStorage.removeItem('hubisoccer_role');
    localStorage.removeItem('hubisoccer_dashboard');
    window.location.href = '../auth/login.html';
}

// ===== PRÉSENCE (EN LIGNE) =====
function initPresence() {
    presenceChannel = sb.channel('hubisoccer_presence');
    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            onlineUsers = new Set(Object.values(state).flat().map(p => p.user_id));
            renderConversations();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ user_id: currentProfile.id, online_at: new Date().toISOString() });
            }
        });
}

// ===== CHARGEMENT DES CONVERSATIONS =====
// Utilise une seule requête optimisée avec jointures
async function loadConversations() {
    showSkeleton(true);
    try {
        // 1. Récupère les IDs de conversations de l'utilisateur
        const { data: participations, error: pErr } = await sb
            .from('conversation_participants')
            .select('conversation_id, last_read_at')
            .eq('user_id', currentProfile.id);
        if (pErr) throw pErr;

        if (!participations || participations.length === 0) {
            conversations = [];
            renderConversations();
            return;
        }

        const allConvIds = participations.map(p => p.conversation_id);
        const readMap = Object.fromEntries(participations.map(p => [p.conversation_id, p.last_read_at]));

        // 2. Filtre archives
        let convIds = allConvIds;
        const { data: archived } = await sb
            .from('archived_conversations')
            .select('conversation_id')
            .eq('user_id', currentProfile.id);
        const archivedIds = new Set((archived || []).map(a => a.conversation_id));

        if (showArchives) {
            convIds = allConvIds.filter(id => archivedIds.has(id));
        } else {
            convIds = allConvIds.filter(id => !archivedIds.has(id));
        }

        if (convIds.length === 0) {
            conversations = [];
            renderConversations();
            return;
        }

        // 3. Récupère les conversations + participants (jointure)
        const { data: convData, error: cErr } = await sb
            .from('conversations')
            .select(`
                id, is_group, group_name, group_avatar, created_at, updated_at,
                conversation_participants (
                    user_id,
                    profiles:user_id ( id, full_name, avatar_url, username, role )
                )
            `)
            .in('id', convIds)
            .order('updated_at', { ascending: false });
        if (cErr) throw cErr;

        // 4. Récupère le dernier message de chaque conversation en une seule requête
        const { data: lastMsgs } = await sb
            .from('messages')
            .select('id, conversation_id, content, media_type, created_at, user_id')
            .in('conversation_id', convIds)
            .not('deleted_for', 'cs', `{${currentProfile.id}}`)
            .order('created_at', { ascending: false });

        // Mappe le dernier message par conversation_id
        const lastMsgMap = {};
        if (lastMsgs) {
            for (const msg of lastMsgs) {
                if (!lastMsgMap[msg.conversation_id]) {
                    lastMsgMap[msg.conversation_id] = msg;
                }
            }
        }

        // 5. Compte les non-lus par conversation
        const unreadCounts = {};
        for (const cid of convIds) {
            const lastRead = readMap[cid];
            const { count } = await sb
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', cid)
                .neq('user_id', currentProfile.id)
                .not('deleted_for', 'cs', `{${currentProfile.id}}`)
                .gt('created_at', lastRead || '1970-01-01');
            unreadCounts[cid] = count || 0;
        }

        // 6. Assemble les conversations
        conversations = (convData || []).map(conv => {
            const participants = conv.conversation_participants || [];
            let name, avatar, otherUserId = null;

            if (conv.is_group) {
                name   = conv.group_name || 'Groupe';
                avatar = conv.group_avatar || '../img/group-default.jpg';
            } else {
                const other = participants.find(p => p.user_id !== currentProfile.id);
                name   = other?.profiles?.full_name || 'Utilisateur';
                avatar = other?.profiles?.avatar_url || '../img/user-default.jpg';
                otherUserId = other?.user_id || null;
            }

            const lastMsg = lastMsgMap[conv.id];
            return {
                id: conv.id,
                is_group: conv.is_group,
                group_name: conv.group_name,
                name,
                avatar,
                otherUserId,
                participants,
                lastMsg,
                lastMsgTime: lastMsg?.created_at || conv.updated_at,
                unreadCount: unreadCounts[conv.id] || 0,
                archived: archivedIds.has(conv.id),
            };
        });

        renderConversations();
    } catch (err) {
        console.error('Erreur chargement conversations:', err);
        toast('Erreur lors du chargement des conversations', 'error');
    } finally {
        showSkeleton(false);
    }
}

// ===== RENDU DE LA LISTE =====
function renderConversations() {
    const list      = document.getElementById('conversationsList');
    const skeleton  = document.getElementById('skeletonList');
    const emptyEl   = document.getElementById('emptyState');
    const totalBadge = document.getElementById('totalConvBadge');

    skeleton.style.display = 'none';
    list.style.display = 'flex';

    // Filtre
    let filtered = conversations.filter(conv => {
        if (searchQuery && !conv.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (activeFilter === 'unread' && conv.unreadCount === 0) return false;
        if (activeFilter === 'groups' && !conv.is_group) return false;
        if (activeFilter === 'direct' && conv.is_group) return false;
        return true;
    });

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    totalBadge.textContent = `${filtered.length} conversation${filtered.length !== 1 ? 's' : ''}`;

    // Badge global
    const notifBadge = document.getElementById('notifBadge');
    if (totalUnread > 0) {
        notifBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
        notifBadge.style.display = 'block';
        document.title = `(${totalUnread}) Messages | HubISoccer`;
    } else {
        notifBadge.style.display = 'none';
        document.title = 'Messages | HubISoccer';
    }

    if (filtered.length === 0) {
        list.style.display = 'none';
        emptyEl.style.display = 'block';
        document.getElementById('emptyTitle').textContent = showArchives ? 'Aucune conversation archivée' : 'Aucune conversation';
        document.getElementById('emptyDesc').textContent  = showArchives ? 'Vous n\'avez pas encore archivé de conversations.' : 'Allez sur la communauté et envoyez un message à quelqu\'un !';
        return;
    }

    emptyEl.style.display = 'none';
    list.style.display    = 'flex';

    list.innerHTML = filtered.map(conv => {
        const isOnline = conv.otherUserId && onlineUsers.has(conv.otherUserId);
        const lastMsgText = getLastMsgPreview(conv.lastMsg);
        const timeText    = conv.lastMsgTime ? formatTime(conv.lastMsgTime) : '';
        const hasUnread   = conv.unreadCount > 0;

        return `
        <div class="conv-item ${hasUnread ? 'unread' : ''}" data-conv-id="${conv.id}">
            <div class="conv-avatar-wrap">
                <img class="conv-avatar" src="${conv.avatar}" alt="${conv.name}" onerror="this.src='../img/user-default.jpg'">
                ${conv.is_group
                    ? `<div class="group-icon"><i class="fas fa-users"></i></div>`
                    : `<div class="online-dot ${isOnline ? 'visible' : ''}"></div>`
                }
            </div>
            <div class="conv-info">
                <div class="conv-name-row">
                    <span class="conv-name">${escapeHtml(conv.name)}</span>
                    <span class="conv-time">${timeText}</span>
                </div>
                <div class="conv-last-row">
                    <span class="conv-last">${lastMsgText}</span>
                    ${hasUnread ? `<span class="unread-count">${conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>` : ''}
                </div>
            </div>
            <div class="conv-actions">
                <button class="conv-action-btn archive-btn" data-conv-id="${conv.id}"
                    title="${showArchives ? 'Désarchiver' : 'Archiver'}">
                    <i class="fas ${showArchives ? 'fa-undo' : 'fa-archive'}"></i>
                </button>
                <button class="conv-action-btn danger delete-btn" data-conv-id="${conv.id}" title="Supprimer">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function getLastMsgPreview(msg) {
    if (!msg) return '<em>Aucun message</em>';
    if (msg.media_type === 'image')  return '<i class="fas fa-image"></i> Photo';
    if (msg.media_type === 'video')  return '<i class="fas fa-video"></i> Vidéo';
    if (msg.media_type === 'audio')  return '<i class="fas fa-microphone"></i> Message vocal';
    if (msg.media_type === 'file')   return '<i class="fas fa-file"></i> Fichier';
    return escapeHtml(msg.content?.substring(0, 60) || '');
}

function formatTime(isoString) {
    const date = new Date(isoString);
    const now  = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60)        return 'À l\'instant';
    if (diff < 3600)      return `${Math.floor(diff / 60)} min`;
    if (diff < 86400)     return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800)    return ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][date.getDay()];
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showSkeleton(show) {
    document.getElementById('skeletonList').style.display    = show ? 'flex' : 'none';
    document.getElementById('conversationsList').style.display = show ? 'none' : 'flex';
    document.getElementById('emptyState').style.display      = 'none';
}

// ===== NAVIGATION VERS LE CHAT =====
function openConversation(convId) {
    window.location.href = `discuss.html?conv=${convId}`;
}

// ===== ARCHIVAGE =====
async function toggleArchive(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    if (conv.archived) {
        const { error } = await sb.from('archived_conversations').delete()
            .eq('user_id', currentProfile.id).eq('conversation_id', convId);
        if (error) { toast('Erreur désarchivage', 'error'); return; }
        toast('Conversation désarchivée', 'success');
    } else {
        const { error } = await sb.from('archived_conversations')
            .insert({ user_id: currentProfile.id, conversation_id: convId });
        if (error) { toast('Erreur archivage', 'error'); return; }
        toast('Conversation archivée', 'success');
    }
    await loadConversations();
}

// ===== SUPPRESSION D'UNE CONVERSATION =====
function promptDeleteConv(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    document.getElementById('convOptionsTitle').textContent = 'Supprimer la conversation';
    document.getElementById('convOptionsDesc').textContent  = `Voulez-vous vraiment supprimer la conversation avec ${conv.name} ? Cette action est irréversible.`;
    const btn = document.getElementById('convOptionsConfirm');
    btn.textContent = 'Supprimer';
    btn.className   = 'btn-confirm danger';
    btn.onclick     = () => deleteConversation(convId);
    openModal('modalConvOptions');
}

async function deleteConversation(convId) {
    closeModal('modalConvOptions');
    // Retire le participant
    await sb.from('conversation_participants').delete()
        .eq('conversation_id', convId).eq('user_id', currentProfile.id);
    // Si plus personne dans la conversation → supprime tout
    const { count } = await sb.from('conversation_participants')
        .select('*', { count: 'exact', head: true }).eq('conversation_id', convId);
    if ((count || 0) === 0) {
        await sb.from('messages').delete().eq('conversation_id', convId);
        await sb.from('conversations').delete().eq('id', convId);
    }
    toast('Conversation supprimée', 'success');
    await loadConversations();
}

// ===== TEMPS RÉEL : MAJ liste quand nouveau message =====
function subscribeToConversationUpdates() {
    if (convSubscription) convSubscription.unsubscribe();
    const myConvIds = conversations.map(c => c.id);
    if (myConvIds.length === 0) return;

    convSubscription = sb
        .channel('conv_updates')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
        }, async (payload) => {
            const msg = payload.new;
            // Concerne une de mes conversations ?
            if (!myConvIds.includes(msg.conversation_id)) return;
            // Recharge pour avoir les vrais counts
            await loadConversations();
        })
        .subscribe();
}

// ===== BLOCAGE =====
async function loadBlockedUsers() {
    const { data, error } = await sb
        .from('blocked_users')
        .select('blocked_user_id, profiles:blocked_user_id ( full_name, avatar_url )')
        .eq('user_id', currentProfile.id);

    const listEl = document.getElementById('blockedList');
    if (error || !data || data.length === 0) {
        listEl.innerHTML = `<div class="blocked-empty"><i class="fas fa-check-circle"></i> Aucun utilisateur bloqué</div>`;
        return;
    }
    listEl.innerHTML = data.map(b => `
        <div class="blocked-item">
            <img src="${b.profiles?.avatar_url || '../img/user-default.jpg'}" alt="">
            <span class="blocked-name">${escapeHtml(b.profiles?.full_name || 'Utilisateur')}</span>
            <button class="btn-unblock" data-uid="${b.blocked_user_id}">
                <i class="fas fa-unlock"></i> Débloquer
            </button>
        </div>
    `).join('');

    listEl.querySelectorAll('.btn-unblock').forEach(btn => {
        btn.addEventListener('click', () => unblockUser(btn.dataset.uid, btn));
    });
}

async function unblockUser(userId, btn) {
    btn.disabled = true;
    const { error } = await sb.from('blocked_users').delete()
        .eq('user_id', currentProfile.id).eq('blocked_user_id', userId);
    if (error) { toast('Erreur déblocage', 'error'); btn.disabled = false; return; }
    toast('Utilisateur débloqué', 'success');
    loadBlockedUsers();
}

// ===== CRÉATION DE GROUPE =====
async function loadFollowersForGroup() {
    const { data, error } = await sb
        .from('unified_follows')
        .select('following_id, profiles:following_id ( id, full_name, avatar_url, username )')
        .eq('follower_id', currentProfile.id);

    const listEl = document.getElementById('membersList');
    if (error || !data || data.length === 0) {
        listEl.innerHTML = `<div class="members-loading">Aucun abonné trouvé</div>`;
        return;
    }

    let followers = data.map(f => ({
        id: f.following_id,
        name: f.profiles?.full_name || 'Utilisateur',
        avatar: f.profiles?.avatar_url || '../img/user-default.jpg',
        username: f.profiles?.username || ''
    }));

    renderMembersList(followers, '');
    document.getElementById('memberSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderMembersList(followers, q);
    });
}

function renderMembersList(followers, query) {
    const filtered = query
        ? followers.filter(f => f.name.toLowerCase().includes(query) || f.username.toLowerCase().includes(query))
        : followers;

    const listEl = document.getElementById('membersList');
    if (filtered.length === 0) {
        listEl.innerHTML = `<div class="members-loading">Aucun résultat</div>`;
        return;
    }
    listEl.innerHTML = filtered.map(f => `
        <div class="member-item ${selectedGroupMembers.some(m => m.id === f.id) ? 'selected' : ''}" data-uid="${f.id}">
            <img src="${f.avatar}" alt="" onerror="this.src='../img/user-default.jpg'">
            <span class="member-name">${escapeHtml(f.name)}</span>
            <i class="fas fa-check member-check"></i>
        </div>
    `).join('');

    listEl.querySelectorAll('.member-item').forEach(el => {
        el.addEventListener('click', () => toggleMemberSelection(el, filtered.find(f => f.id === el.dataset.uid)));
    });
}

function toggleMemberSelection(el, member) {
    if (!member) return;
    const idx = selectedGroupMembers.findIndex(m => m.id === member.id);
    if (idx >= 0) {
        selectedGroupMembers.splice(idx, 1);
        el.classList.remove('selected');
    } else {
        selectedGroupMembers.push(member);
        el.classList.add('selected');
    }
    renderSelectedChips();
}

function renderSelectedChips() {
    const container = document.getElementById('selectedMembers');
    container.innerHTML = selectedGroupMembers.map(m => `
        <div class="selected-chip" data-uid="${m.id}">
            <img src="${m.avatar}" alt="" onerror="this.src='../img/user-default.jpg'">
            <span>${escapeHtml(m.name)}</span>
            <i class="fas fa-times chip-remove"></i>
        </div>
    `).join('');
    container.querySelectorAll('.chip-remove').forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = btn.parentElement.dataset.uid;
            selectedGroupMembers = selectedGroupMembers.filter(m => m.id !== uid);
            renderSelectedChips();
            // Désélectionner dans la liste
            document.querySelector(`.member-item[data-uid="${uid}"]`)?.classList.remove('selected');
        });
    });
}

async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const btn = document.getElementById('createGroupBtn');

    if (!groupName) { toast('Donnez un nom au groupe', 'warning'); return; }
    if (selectedGroupMembers.length < 2) { toast('Sélectionnez au moins 2 participants', 'warning'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';

    try {
        // Gérer la photo du groupe si sélectionnée
        let groupAvatarUrl = null;
        const avatarFile = document.getElementById('groupAvatarInput').files[0];
        if (avatarFile) {
            const fileName = `group_${currentProfile.id}_${Date.now()}.${avatarFile.name.split('.').pop()}`;
            const { error: upErr } = await sb.storage.from('avatars').upload(fileName, avatarFile);
            if (!upErr) {
                const { data: urlData } = sb.storage.from('avatars').getPublicUrl(fileName);
                groupAvatarUrl = urlData.publicUrl;
            }
        }

        // Créer la conversation groupe
        const { data: conv, error: convErr } = await sb
            .from('conversations')
            .insert({ is_group: true, group_name: groupName, group_avatar: groupAvatarUrl })
            .select().single();
        if (convErr) throw convErr;

        // Ajouter les participants
        const participants = [...selectedGroupMembers.map(m => m.id), currentProfile.id];
        const { error: partErr } = await sb.from('conversation_participants')
            .insert(participants.map(uid => ({ conversation_id: conv.id, user_id: uid })));
        if (partErr) throw partErr;

        // Message de bienvenue
        await sb.from('messages').insert({
            conversation_id: conv.id,
            user_id: currentProfile.id,
            content: `👋 Groupe "${groupName}" créé ! Bienvenue à tous.`,
            deleted_for: []
        });

        toast(`Groupe "${groupName}" créé avec succès`, 'success');
        closeModal('modalGroup');
        selectedGroupMembers = [];
        document.getElementById('groupName').value = '';
        await loadConversations();
    } catch (err) {
        console.error('Erreur création groupe:', err);
        toast('Erreur lors de la création du groupe', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Créer le groupe';
    }
}

// ===== MODALES =====
function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('show'); el.style.display = 'flex'; }
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); el.style.display = 'none'; }
}

// ===== INITIALISATION =====
async function init() {
    const user = await checkSession();
    if (!user) return;

    await loadProfile();
    await loadConversations();
    initPresence();
    subscribeToConversationUpdates();

    // Conversation de bienvenue support si aucune conversation
    if (conversations.length === 0) {
        await createWelcomeConversation();
    }

    // Paramètre ?to=userId (depuis bouton "Envoyer un message" du feed)
    const params = new URLSearchParams(window.location.search);
    const toUserId = params.get('to');
    if (toUserId) {
        await openOrCreateDirectConversation(toUserId);
    }

    // Événements délégués sur la liste
    const listEl = document.getElementById('conversationsList');
    listEl.addEventListener('click', (e) => {
        // Archivage
        const archiveBtn = e.target.closest('.archive-btn');
        if (archiveBtn) {
            e.stopPropagation();
            toggleArchive(archiveBtn.dataset.convId);
            return;
        }
        // Suppression
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            promptDeleteConv(deleteBtn.dataset.convId);
            return;
        }
        // Ouvrir la conversation
        const item = e.target.closest('.conv-item');
        if (item) {
            openConversation(item.dataset.convId);
        }
    });

    // Recherche
    const searchInput = document.getElementById('searchInput');
    const clearBtn    = document.getElementById('clearSearch');
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        clearBtn.style.display = searchQuery ? 'block' : 'none';
        renderConversations();
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.style.display = 'none';
        renderConversations();
    });

    // Filtres rapides
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            renderConversations();
        });
    });

    // Archives toggle
    document.getElementById('archiveToggleBtn').addEventListener('click', async () => {
        showArchives = !showArchives;
        const btn = document.getElementById('archiveToggleBtn');
        document.getElementById('archiveToggleText').textContent = showArchives ? 'Conversations' : 'Archives';
        btn.classList.toggle('active-archive', showArchives);
        await loadConversations();
    });

    // Bloqués
    document.getElementById('blockedBtn').addEventListener('click', () => {
        loadBlockedUsers();
        openModal('modalBlocked');
    });

    // Nouveau groupe
    document.getElementById('newGroupBtn').addEventListener('click', () => {
        selectedGroupMembers = [];
        document.getElementById('groupName').value = '';
        document.getElementById('selectedMembers').innerHTML = '';
        openModal('modalGroup');
        loadFollowersForGroup();
    });
    document.getElementById('createGroupBtn').addEventListener('click', createGroup);

    // Photo groupe
    document.getElementById('groupAvatarPicker').addEventListener('click', () => {
        document.getElementById('groupAvatarInput').click();
    });
    document.getElementById('groupAvatarInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const picker = document.getElementById('groupAvatarPicker');
            picker.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> <span>${file.name}</span>`;
        }
    });

    // Fermer les modales en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // Navbar dropdown
    document.getElementById('userMenu').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('userDropdown').classList.toggle('show');
    });
    document.addEventListener('click', () => document.getElementById('userDropdown')?.classList.remove('show'));
    document.getElementById('dropLogout').addEventListener('click', logout);

    // Sidebar mobile
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('show');
    });
    const closeSidebar = () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    };
    document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    // Rafraîchissement auto toutes les 30 secondes
    setInterval(loadConversations, 30000);
}

// ===== OUVRIR OU CRÉER UNE CONVERSATION DIRECTE =====
async function openOrCreateDirectConversation(targetUserId) {
    // Cherche une conversation existante à 2 personnes
    const { data: myParts } = await sb.from('conversation_participants')
        .select('conversation_id').eq('user_id', currentProfile.id);
    const myIds = (myParts || []).map(p => p.conversation_id);

    for (const cid of myIds) {
        const { data: parts } = await sb.from('conversation_participants')
            .select('user_id').eq('conversation_id', cid);
        if (parts?.length === 2 && parts.some(p => p.user_id === targetUserId)) {
            // Conversation trouvée → ouvrir directement
            window.location.href = `discuss.html?conv=${cid}`;
            return;
        }
    }

    // Pas trouvée → créer
    const { data: newConv, error } = await sb.from('conversations')
        .insert({ is_group: false }).select().single();
    if (error) { toast('Erreur création conversation', 'error'); return; }

    await sb.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: currentProfile.id },
        { conversation_id: newConv.id, user_id: targetUserId }
    ]);

    window.location.href = `discuss.html?conv=${newConv.id}`;
}

// ===== CONVERSATION DE BIENVENUE SUPPORT =====
async function createWelcomeConversation() {
    const supportId = '2c6c8e5b-2d13-4648-b656-8ca782806bdb';
    const { data: supportExists } = await sb.from('profiles')
        .select('id').eq('id', supportId).maybeSingle();
    if (!supportExists) return;

    const { data: newConv, error } = await sb.from('conversations')
        .insert({ is_group: false }).select().single();
    if (error) return;

    await sb.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: currentProfile.id },
        { conversation_id: newConv.id, user_id: supportId }
    ]);
    await sb.from('messages').insert({
        conversation_id: newConv.id,
        user_id: supportId,
        content: "👋 Bienvenue sur HubISoccer ! Je suis l'assistant support. N'hésitez pas à m'écrire si vous avez des questions. Bonne aventure sportive ! ⚽",
        deleted_for: []
    });
    await loadConversations();
}

// ===== DÉMARRAGE =====
document.addEventListener('DOMContentLoaded', init);
