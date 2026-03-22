// ==================== CONFIGURATION SUPABASE ====================
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== ÉTAT GLOBAL ====================
let currentUser = null;
let currentProfile = null;
let posts = [];
let followers = [];
let following = [];
let savedPosts = new Set();
let hiddenPosts = new Set();
let likedPosts = new Set();
let dislikedPosts = new Set();
let currentFilter = 'all';
let searchTerm = '';
let newPostsCount = 0;
let selectedUserId = null;
let showingHidden = false;
let collections = [];
let currentCollection = 'default';
let privacyLevel = 'public';
let notificationsList = [];
let previewMedia = null;
let previewMediaType = null;
let replyParentId = null;
let replyPostId = null;
let currentPostOffset = 0;
const POSTS_PER_PAGE = 20;
let hasMorePosts = true;
let loadingMore = false;
let stories = [];
let currentStoryId = null;
let storyTimer = null;
let audioCommentsEnabled = false;
let totalLoadSteps = 0;
let loadedSteps = 0;
let currentReportPostId = null;
let audioCommentPostId = null;
let observedPosts = new Set();
let currentCommentMediaPostId = null;
let pendingPinCount = 0;
let activeStoryMedia = null;
let storyDeleteBtn = null;

// ==================== TRADUCTIONS (pour les langues) ====================
const translations = {
    fr: {
        // à appliquer via data-i18n ; ici simplifié pour le sélecteur
    },
    en: {}
    // les autres langues peuvent être ajoutées, mais on ne gère que le rechargement par paramètre
};

// ==================== UTILITAIRES ====================
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

function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `il y a ${interval} an${interval > 1 ? 's' : ''}`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `il y a ${interval} mois`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `il y a ${interval} jour${interval > 1 ? 's' : ''}`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `il y a ${interval} heure${interval > 1 ? 's' : ''}`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `il y a ${interval} minute${interval > 1 ? 's' : ''}`;
    return `il y a ${seconds} seconde${seconds > 1 ? 's' : ''}`;
}

function formatPostContent(text) {
    if (!text) return '';
    text = text.replace(/@(\w+)/g, '<a href="#" onclick="openUserProfileByUsername(\'$1\')">@$1</a>');
    text = text.replace(/#(\w+)/g, '<a href="#" onclick="searchHashtag(\'$1\')">#$1</a>');
    return text;
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

// ==================== LOADER ====================
function updateLoaderProgress(stepName, increment = 1) {
    loadedSteps += increment;
    const percent = Math.min(100, Math.floor((loadedSteps / totalLoadSteps) * 100));
    const loaderDiv = document.getElementById('globalLoader');
    const progressSpan = document.getElementById('loaderProgress');
    if (progressSpan) progressSpan.textContent = `Chargement ${percent}% – ${stepName}`;
    if (percent >= 100) {
        setTimeout(() => {
            if (loaderDiv) loaderDiv.style.display = 'none';
        }, 300);
    }
}

function showLoaderWithProgress(steps) {
    totalLoadSteps = steps;
    loadedSteps = 0;
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'flex';
        const progressSpan = document.getElementById('loaderProgress');
        if (progressSpan) progressSpan.textContent = 'Chargement 0% – Initialisation';
    }
}

function showLoaderError(message) {
    const loaderDiv = document.getElementById('globalLoader');
    if (loaderDiv) {
        loaderDiv.innerHTML = `<div style="background:rgba(0,0,0,0.8); padding:20px; border-radius:12px; text-align:center;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; color:var(--danger);"></i><p style="margin-top:10px;">${message}</p><button onclick="location.reload()" style="margin-top:15px; padding:8px 20px; background:var(--primary); color:white; border:none; border-radius:30px;">Recharger</button></div>`;
    } else {
        alert(message);
    }
}

// ==================== AUTHENTIFICATION ====================
async function checkSession() {
    updateLoaderProgress('Vérification session');
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = '../auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

async function loadProfile() {
    updateLoaderProgress('Chargement profil');
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (error) {
        console.error('Erreur chargement profil:', error);
        showLoaderError('Impossible de charger votre profil. Veuillez vous reconnecter.');
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = data.full_name || 'Joueur';
    document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
    document.getElementById('publishAvatar').src = data.avatar_url || 'img/user-default.jpg';
    privacyLevel = data.privacy || 'public';
    return currentProfile;
}

async function loadSiteConfig() {
    updateLoaderProgress('Configuration');
    const { data, error } = await supabaseClient
        .from('site_config')
        .select('value')
        .eq('key', 'audio_comments')
        .single();
    if (!error && data) {
        audioCommentsEnabled = data.value?.enabled === true;
    }
}

// ==================== NOTIFICATIONS ====================
async function loadNotifications() {
    if (!currentProfile) return;
    updateLoaderProgress('Notifications');
    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', currentProfile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erreur chargement notifications:', error);
        return;
    }
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = data.length || 0;
        badge.style.display = data.length > 0 ? 'inline-block' : 'none';
    }
    notificationsList = data || [];
    const notifModal = document.getElementById('notificationsModal');
    if (notifModal && notifModal.style.display === 'block') {
        renderNotificationsModal();
    }
}

function renderNotificationsModal() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    if (notificationsList.length === 0) {
        list.innerHTML = '<li class="no-data">Aucune notification</li>';
        return;
    }
    list.innerHTML = notificationsList.map(n => {
        const timeAgo = timeSince(new Date(n.created_at));
        let icon = '';
        switch (n.type) {
            case 'like': icon = '❤️'; break;
            case 'comment': icon = '💬'; break;
            case 'share': icon = '🔄'; break;
            case 'follow': icon = '👤'; break;
            case 'mention': icon = '@'; break;
            default: icon = '🔔';
        }
        return `
            <li data-id="${n.id}" onclick="markNotificationAsRead('${n.id}')">
                <div class="notif-icon">${icon}</div>
                <div class="notif-content">
                    <p>${n.content || 'Nouvelle notification'}</p>
                    <small>${timeAgo}</small>
                </div>
                ${!n.is_read ? '<span class="notif-badge-dot"></span>' : ''}
            </li>
        `;
    }).join('');
}

async function markNotificationAsRead(notificationId) {
    await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    await loadNotifications();
}

async function markAllNotificationsAsRead() {
    await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentProfile.id)
        .eq('is_read', false);
    await loadNotifications();
    showToast('Toutes les notifications ont été marquées comme lues', 'success');
}

function openNotificationsModal() {
    renderNotificationsModal();
    document.getElementById('notificationsModal').style.display = 'block';
}

function closeNotificationsModal() {
    document.getElementById('notificationsModal').style.display = 'none';
}

// ==================== COLLECTIONS ====================
async function loadCollections() {
    updateLoaderProgress('Collections');
    const { data, error } = await supabaseClient
        .from('collections')
        .select('*')
        .eq('user_id', currentProfile.id)
        .order('name');
    if (error) {
        console.error('Erreur chargement collections:', error);
        return;
    }
    collections = data || [];
    if (!collections.find(c => c.name === 'Favoris')) {
        collections.unshift({ id: 'default', name: 'Favoris', is_default: true });
    }
    renderCollectionsUI();
}

function renderCollectionsUI() {
    const container = document.getElementById('collectionsList');
    if (!container) return;
    container.innerHTML = collections.map(c => `
        <li class="${c.id === currentCollection ? 'active' : ''}" onclick="setCurrentCollection('${c.id}')">
            <i class="fas fa-folder"></i> ${c.name}
        </li>
    `).join('');
}

function setCurrentCollection(collectionId) {
    currentCollection = collectionId;
    renderCollectionsUI();
    renderPosts();
}

function openCreateCollectionModal() {
    document.getElementById('createCollectionModal').style.display = 'block';
}

function closeCreateCollectionModal() {
    document.getElementById('createCollectionModal').style.display = 'none';
}

async function createNewCollection() {
    const name = document.getElementById('newCollectionName').value.trim();
    if (!name) {
        showToast('Veuillez saisir un nom', 'warning');
        return;
    }
    const { error } = await supabaseClient
        .from('collections')
        .insert({ user_id: currentProfile.id, name });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        await loadCollections();
        showToast('Collection créée', 'success');
        closeCreateCollectionModal();
        document.getElementById('newCollectionName').value = '';
    }
}

async function addPostToCollection(postId, collectionId) {
    const { error } = await supabaseClient
        .from('collection_items')
        .insert({ collection_id: collectionId, post_id: postId });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Post ajouté à la collection', 'success');
        if (collectionId === currentCollection) {
            await loadPosts(true);
        }
    }
}

async function removePostFromCollection(postId, collectionId) {
    const { error } = await supabaseClient
        .from('collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('post_id', postId);
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Post retiré de la collection', 'info');
        if (collectionId === currentCollection) {
            await loadPosts(true);
        }
    }
}

function showCollectionsModal(postId) {
    const modal = document.getElementById('collectionsModal');
    const list = document.getElementById('collectionsModalList');
    if (!modal || !list) return;
    list.innerHTML = collections.map(c => {
        const post = posts.find(p => p.id == postId);
        const isIn = post?.collections?.includes(c.id) || false;
        return `
            <li>
                <span>${c.name}</span>
                <button class="btn-toggle-collection" onclick="togglePostInCollection(${postId}, '${c.id}', ${isIn})">
                    ${isIn ? 'Retirer' : 'Ajouter'}
                </button>
            </li>
        `;
    }).join('');
    modal.dataset.postId = postId;
    modal.style.display = 'block';
}

function closeCollectionsModal() {
    document.getElementById('collectionsModal').style.display = 'none';
}

async function togglePostInCollection(postId, collectionId, currentlyIn) {
    if (currentlyIn) {
        await removePostFromCollection(postId, collectionId);
    } else {
        await addPostToCollection(postId, collectionId);
    }
    closeCollectionsModal();
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (postCard) {
        const icon = postCard.querySelector('.collection-icon');
        if (icon) {
            if (!currentlyIn) icon.style.display = 'inline-block';
            else icon.style.display = 'none';
        }
    }
    await loadPosts(true);
}

// ==================== CHARGEMENT DES DONNÉES UTILISATEUR ====================
async function loadUserMetadata() {
    updateLoaderProgress('Métadonnées');
    const { data: likesData } = await supabaseClient
        .from('unified_likes')
        .select('post_id')
        .eq('user_id', currentProfile.id);
    likedPosts = new Set(likesData?.map(l => l.post_id) || []);

    const { data: dislikesData } = await supabaseClient
        .from('unified_dislikes')
        .select('post_id')
        .eq('user_id', currentProfile.id);
    dislikedPosts = new Set(dislikesData?.map(d => d.post_id) || []);

    const { data: savedData } = await supabaseClient
        .from('collection_items')
        .select('post_id, collections!inner(name)')
        .eq('collections.user_id', currentProfile.id)
        .eq('collections.name', 'Favoris');
    savedPosts = new Set(savedData?.map(s => s.post_id) || []);

    const { data: hiddenData } = await supabaseClient
        .from('unified_hidden')
        .select('post_id')
        .eq('user_id', currentProfile.id);
    hiddenPosts = new Set(hiddenData?.map(h => h.post_id) || []);
}

// ==================== POSTS ====================
async function getCountsMap(table, column, ids) {
    if (!ids.length) return {};
    const { data, error } = await supabaseClient
        .from(table)
        .select(column)
        .in(column, ids);
    if (error) {
        console.error(`Erreur chargement comptes pour ${table}:`, error);
        return {};
    }
    const counts = {};
    data.forEach(item => {
        const id = item[column];
        counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
}

async function loadPosts(reset = true) {
    if (reset) {
        currentPostOffset = 0;
        hasMorePosts = true;
        posts = [];
        document.getElementById('postsFeed').innerHTML = '';
        document.getElementById('loadMoreBtn').style.display = 'none';
    }
    if (loadingMore) return;
    loadingMore = true;
    const feedLoader = document.getElementById('feedLoader');
    if (feedLoader && reset) feedLoader.style.display = 'flex';

    try {
        updateLoaderProgress('Chargement des publications');
        let query = supabaseClient
            .from('unified_posts')
            .select('*')
            .order('created_at', { ascending: false })
            .range(currentPostOffset, currentPostOffset + POSTS_PER_PAGE - 1);

        const { data: postsData, error: postsError } = await query;
        if (postsError) throw postsError;

        if (!postsData.length) {
            hasMorePosts = false;
            document.getElementById('loadMoreBtn').style.display = 'none';
            if (reset && posts.length === 0) {
                document.getElementById('postsFeed').innerHTML = '<p class="no-data">Aucun post à afficher.</p>';
            }
            updateLoaderProgress('Aucune publication', 0);
            return;
        }

        const authorIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: profilesData, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, full_name, avatar_url, username, role, badges, privacy, bio, contact_info')
            .in('id', authorIds);
        if (profilesError) throw profilesError;
        const profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));

        const postIds = postsData.map(p => p.id);
        const likesCounts = await getCountsMap('unified_likes', 'post_id', postIds);
const commentsCounts = await getCountsMap('unified_comments', 'post_id', postIds);
const sharesCounts = await getCountsMap('unified_shares', 'post_id', postIds);
const viewsCounts = await getCountsMap('post_views', 'post_id', postIds);

        const newPosts = postsData.map(post => {
            const author = profilesMap[post.user_id];
            if (!author) return null;
            if (author.privacy === 'private' && post.user_id !== currentProfile.id) return null;
            if (author.privacy === 'followers' && post.user_id !== currentProfile.id) {
                const isFollowing = following.some(f => f.following_id === post.user_id);
                if (!isFollowing) return null;
            }
            if (hiddenPosts.has(post.id)) return null;

            return {
                ...post,
                author,
                likesCount: likesCounts[post.id] || 0,
                commentsCount: commentsCounts[post.id] || 0,
                sharesCount: sharesCounts[post.id] || 0,
                viewsCount: viewsCounts[post.id] || 0,
                isLiked: likedPosts.has(post.id),
                isDisliked: dislikedPosts.has(post.id),
                isSaved: savedPosts.has(post.id),
                isFollowed: following.some(f => f.following_id === post.user_id),
                collections: []
            };
        }).filter(p => p !== null);

        // Récupérer les collections pour ces posts
        const { data: collItems } = await supabaseClient
            .from('collection_items')
            .select('post_id, collection_id')
            .in('post_id', newPosts.map(p => p.id));
        const collectionMap = new Map();
        (collItems || []).forEach(item => {
            if (!collectionMap.has(item.post_id)) collectionMap.set(item.post_id, []);
            collectionMap.get(item.post_id).push(item.collection_id);
        });
        newPosts.forEach(p => { p.collections = collectionMap.get(p.id) || []; });

        if (reset) {
            posts = newPosts;
        } else {
            posts = [...posts, ...newPosts];
        }
        currentPostOffset += POSTS_PER_PAGE;
        hasMorePosts = newPosts.length === POSTS_PER_PAGE;
        if (hasMorePosts) {
            document.getElementById('loadMoreBtn').style.display = 'block';
        } else {
            document.getElementById('loadMoreBtn').style.display = 'none';
        }

        applyAdvancedFilters();
        renderPosts();
        posts.forEach(post => loadComments(post.id));
        updateLoaderProgress('Publications chargées');
    } catch (error) {
        console.error('Erreur chargement posts:', error);
        showLoaderError('Erreur lors du chargement des publications. Veuillez recharger la page.');
    } finally {
        if (feedLoader) feedLoader.style.display = 'none';
        loadingMore = false;
    }
}

function loadMorePosts() {
    if (hasMorePosts && !loadingMore) {
        loadPosts(false);
    }
}

// ==================== FILTRES ====================
let dateFilter = 'all';
let popularityFilter = 'all';
let contentTypeFilter = 'all';

function applyAdvancedFilters() {
    let filtered = [...posts];
    const now = new Date();
    if (dateFilter === 'today') {
        const todayStart = new Date(now.setHours(0,0,0,0));
        filtered = filtered.filter(p => new Date(p.created_at) >= todayStart);
    } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filtered = filtered.filter(p => new Date(p.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filtered = filtered.filter(p => new Date(p.created_at) >= monthAgo);
    }

    if (contentTypeFilter === 'text') {
        filtered = filtered.filter(p => !p.media_url);
    } else if (contentTypeFilter === 'image') {
        filtered = filtered.filter(p => p.media_type === 'image');
    } else if (contentTypeFilter === 'video') {
        filtered = filtered.filter(p => p.media_type === 'video');
    }

    if (popularityFilter === 'most_liked') {
        filtered.sort((a,b) => b.likesCount - a.likesCount);
    } else if (popularityFilter === 'most_commented') {
        filtered.sort((a,b) => b.commentsCount - a.commentsCount);
    }

    // Stocker la version filtrée dans une variable séparée pour l'affichage sans altérer posts
    window.filteredPosts = filtered;
}

// ==================== RENDU DES POSTS ====================
function renderPostCard(post, isHidden = false) {
    const timeAgo = timeSince(new Date(post.created_at));
    const likedClass = post.isLiked ? 'liked' : '';
    const dislikedClass = post.isDisliked ? 'disliked' : '';
    let mediaHtml = '';
    if (post.media_url) {
        if (post.media_type === 'image') {
            mediaHtml = `<img src="${post.media_url}" alt="Post media" onclick="openMediaZoom('${post.media_url}', 'image', '${escapeHtml(post.content)}')">`;
        } else if (post.media_type === 'video') {
            mediaHtml = `<video src="${post.media_url}" controls onclick="openMediaZoom('${post.media_url}', 'video', '${escapeHtml(post.content)}')"></video>`;
        }
    }
    const authorName = post.author?.full_name || 'Anonyme';
    const roleBadge = post.author?.role ? `<span class="role-badge">${post.author.role}</span>` : '';
    const badges = post.author?.badges ? post.author.badges.map(b => `<span class="badge-mini">${b}</span>`).join('') : '';
    const followButton = post.user_id !== currentProfile?.id 
        ? `<button class="follow-btn ${post.isFollowed ? 'following' : ''}" data-user-id="${post.user_id}" onclick="toggleFollow(this)">${post.isFollowed ? 'Abonné' : 'Suivre'}</button>`
        : '';
    const collectionIcon = post.collections?.length ? '<i class="fas fa-folder collection-icon" style="color: var(--gold); margin-left:5px;" title="Dans une collection"></i>' : '';
    const menu = `
        <div class="post-menu">
            <button class="post-menu-btn" onclick="togglePostMenu(this)"><i class="fas fa-ellipsis-v"></i></button>
            <div class="post-menu-dropdown">
                ${post.user_id === currentProfile?.id ? `<button onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                ${post.user_id === currentProfile?.id ? `<button onclick="deletePost(${post.id})" class="delete"><i class="fas fa-trash-alt"></i> Supprimer</button>` : ''}
                <button onclick="showCollectionsModal(${post.id})"><i class="fas fa-folder-plus"></i> Ajouter à une collection</button>
                <button onclick="hidePost(${post.id})"><i class="fas fa-eye-slash"></i> Masquer</button>
                <button onclick="openReportModal(${post.id})"><i class="fas fa-flag"></i> Signaler</button>
                ${post.user_id !== currentProfile?.id ? `<button onclick="openBlockUserModal('${post.user_id}')"><i class="fas fa-ban"></i> Bloquer</button>` : ''}
            </div>
        </div>
    `;
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${post.author?.avatar_url || 'img/user-default.jpg'}" alt="${authorName}" onclick="openUserProfile('${post.author?.id}')">
                <div class="post-author">
                    <h4>${authorName} ${roleBadge} ${badges} ${collectionIcon}</h4>
                    <small>@${post.author?.username || 'inconnu'} · ${timeAgo}</small>
                    ${followButton}
                </div>
                ${menu}
            </div>
            <div class="post-content">${formatPostContent(post.content)}</div>
            ${post.media_url ? `<div class="post-media">${mediaHtml}</div>` : ''}
            <div class="post-stats">
                <span onclick="showLikes(${post.id})"><i class="fas fa-heart"></i> ${post.likesCount}</span>
                <span onclick="showDislikes(${post.id})"><i class="fas fa-thumbs-down"></i> ${post.dislikesCount || 0}</span>
                <span onclick="scrollToComments(${post.id})"><i class="fas fa-comment"></i> ${post.commentsCount}</span>
                <span><i class="fas fa-share"></i> ${post.sharesCount}</span>
                <span><i class="fas fa-eye"></i> ${post.viewsCount}</span>
            </div>
            <div class="post-actions">
                <button class="${likedClass}" onclick="likePost(${post.id})"><i class="fas fa-heart"></i> J'aime</button>
                <button class="${dislikedClass}" onclick="dislikePost(${post.id})"><i class="fas fa-thumbs-down"></i> Je n'aime pas</button>
                <button onclick="focusComment(${post.id})"><i class="fas fa-comment"></i> Commenter</button>
                <button onclick="repost(${post.id})"><i class="fas fa-retweet"></i> Repost</button>
                <button onclick="sharePostExternal(${post.id})"><i class="fas fa-share-alt"></i> Partager</button>
            </div>
            <div class="comments-section" id="comments-${post.id}"></div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

function renderPosts() {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;

    let filteredPosts = window.filteredPosts || [...posts];
    if (currentFilter === 'following') {
        const followingIds = following.map(f => f.following_id);
        filteredPosts = filteredPosts.filter(p => followingIds.includes(p.user_id));
    } else if (currentFilter === 'saved') {
        if (currentCollection === 'default') {
            filteredPosts = filteredPosts.filter(p => savedPosts.has(p.id));
        } else {
            const collection = collections.find(c => c.id === currentCollection);
            if (collection) {
                filteredPosts = filteredPosts.filter(p => p.collections?.includes(currentCollection));
            }
        }
    }
    if (searchTerm) {
        filteredPosts = filteredPosts.filter(p => 
            p.content?.toLowerCase().includes(searchTerm) ||
            p.author?.full_name?.toLowerCase().includes(searchTerm) ||
            p.author?.username?.toLowerCase().includes(searchTerm)
        );
    }

    if (filteredPosts.length === 0) {
        feed.innerHTML = '<p class="no-data">Aucun post à afficher.</p>';
        return;
    }

    let html = '';
    filteredPosts.forEach(post => {
        html += renderPostCard(post);
    });
    feed.innerHTML = html;
    observePostsForViews();
}

// ==================== COMMENTAIRES ====================
async function loadComments(postId) {
    const { data, error } = await supabaseClient
        .from('unified_comments')
        .select(`
            *,
            author:profiles!user_id (id, full_name, avatar_url, username)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur chargement commentaires:', error);
        return;
    }

    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (!commentsDiv) return;

    let html = '';
    for (const comment of data) {
        html += await renderComment(comment, postId);
    }

    html += `
        <div class="add-comment">
            <img src="${currentProfile?.avatar_url || 'img/user-default.jpg'}">
            <input type="text" id="commentInput-${postId}" placeholder="Écrire un commentaire..." onkeypress="if(event.key==='Enter') addComment(${postId})">
            <button onclick="addComment(${postId})">Envoyer</button>
            ${audioCommentsEnabled ? `<button class="audio-comment-btn" onclick="openAudioCommentModal(${postId})"><i class="fas fa-microphone"></i></button>` : ''}
            <button class="media-comment-btn" onclick="openCommentMediaModal(${postId})"><i class="fas fa-image"></i> Média</button>
        </div>
    `;
    commentsDiv.innerHTML = html;
}

async function renderComment(comment, postId) {
    const authorName = comment.author?.full_name || 'Anonyme';
    const timeAgo = timeSince(new Date(comment.created_at));
    const { data: replies, error } = await supabaseClient
        .from('unified_comments')
        .select(`
            *,
            author:profiles!user_id (id, full_name, avatar_url, username)
        `)
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true });
    let repliesHtml = '';
    if (replies && replies.length > 0) {
        for (const reply of replies) {
            repliesHtml += await renderComment(reply, postId);
        }
    }
    const isAuthor = comment.user_id === currentProfile?.id;
    let audioHtml = '';
    if (comment.audio_url) {
        audioHtml = `<audio controls src="${comment.audio_url}" style="width:100%; margin-top:5px;"></audio>`;
    }
    let mediaHtml = '';
    if (comment.media_url) {
        if (comment.media_type === 'image') {
            mediaHtml = `<img src="${comment.media_url}" alt="media" style="max-width:100%; max-height:200px; border-radius:8px; margin-top:5px;">`;
        } else if (comment.media_type === 'video') {
            mediaHtml = `<video src="${comment.media_url}" controls style="max-width:100%; max-height:200px; border-radius:8px; margin-top:5px;"></video>`;
        }
    }
    return `
        <div class="comment" data-comment-id="${comment.id}">
            <img src="${comment.author?.avatar_url || 'img/user-default.jpg'}" onclick="openUserProfile('${comment.author?.id}')">
            <div class="comment-content">
                <span class="comment-author" onclick="openUserProfile('${comment.author?.id}')">${authorName}</span>
                <span class="comment-text">${formatPostContent(comment.content)}</span>
                ${audioHtml}
                ${mediaHtml}
                <small>${timeAgo}</small>
                <div class="comment-actions">
                    <button class="reply-btn" onclick="openReplyModal(${comment.id}, '${authorName.replace(/'/g, "\\'")}', ${postId})"><i class="fas fa-reply"></i> Répondre</button>
                    ${isAuthor ? `
                        <button class="edit-comment-btn" onclick="editComment(${comment.id}, ${postId})"><i class="fas fa-edit"></i> Modifier</button>
                        <button class="delete-comment-btn" onclick="deleteComment(${comment.id}, ${postId})"><i class="fas fa-trash-alt"></i> Supprimer</button>
                    ` : ''}
                    <button class="report-comment-btn" onclick="reportComment(${comment.id}, ${postId})"><i class="fas fa-flag"></i> Signaler</button>
                </div>
            </div>
        </div>
        ${repliesHtml ? `<div class="comment-reply">${repliesHtml}</div>` : ''}
    `;
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) return;
    const button = input.nextElementSibling;
    withButtonSpinner(button, async () => {
        const { error } = await supabaseClient
            .from('unified_comments')
            .insert({
                user_id: currentProfile.id,
                post_id: postId,
                content: content,
                parent_id: replyParentId || null
            });
        if (error) {
            showToast('Erreur : ' + error.message, 'error');
        } else {
            input.value = '';
            replyParentId = null;
            await loadComments(postId);
            const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
            if (postCard) {
                const commentSpan = postCard.querySelector('.post-stats span:nth-child(3)');
                if (commentSpan) {
                    let curr = parseInt(commentSpan.textContent) || 0;
                    commentSpan.innerHTML = `<i class="fas fa-comment"></i> ${curr + 1}`;
                }
            }
            showToast('Commentaire ajouté', 'success');
        }
    });
}

function focusComment(postId) {
    document.getElementById(`commentInput-${postId}`).focus();
}

function scrollToComments(postId) {
    document.getElementById(`comments-${postId}`).scrollIntoView({ behavior: 'smooth' });
}

function openReplyModal(commentId, authorName, postId) {
    replyParentId = commentId;
    replyPostId = postId;
    document.getElementById('originalComment').innerHTML = `<strong>${authorName}</strong><br>${document.querySelector(`.comment[data-comment-id="${commentId}"] .comment-text`).innerHTML}`;
    document.getElementById('replyModal').style.display = 'block';
}

function closeReplyModal() {
    document.getElementById('replyModal').style.display = 'none';
    replyParentId = null;
}

async function sendReply() {
    const content = document.getElementById('replyContent').value.trim();
    if (!content) return;
    const button = document.querySelector('#replyModal .btn-send-reply');
    withButtonSpinner(button, async () => {
        const { error } = await supabaseClient
            .from('unified_comments')
            .insert({
                user_id: currentProfile.id,
                post_id: replyPostId,
                content: content,
                parent_id: replyParentId
            });
        if (error) {
            showToast('Erreur : ' + error.message, 'error');
        } else {
            document.getElementById('replyContent').value = '';
            closeReplyModal();
            await loadComments(replyPostId);
            showToast('Réponse envoyée', 'success');
        }
    });
}

async function editComment(commentId, postId) {
    const newContent = prompt('Modifier votre commentaire :');
    if (!newContent) return;
    const { error } = await supabaseClient
        .from('unified_comments')
        .update({ content: newContent })
        .eq('id', commentId);
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Commentaire modifié', 'success');
        loadComments(postId);
    }
}

async function deleteComment(commentId, postId) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    const { error } = await supabaseClient
        .from('unified_comments')
        .delete()
        .eq('id', commentId);
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Commentaire supprimé', 'success');
        loadComments(postId);
        const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (postCard) {
            const commentSpan = postCard.querySelector('.post-stats span:nth-child(3)');
            if (commentSpan) {
                let curr = parseInt(commentSpan.textContent) || 0;
                commentSpan.innerHTML = `<i class="fas fa-comment"></i> ${Math.max(0, curr - 1)}`;
            }
        }
    }
}

async function reportComment(commentId, postId) {
    const reason = prompt('Pourquoi signalez-vous ce commentaire ? (optionnel)');
    const { error } = await supabaseClient
        .from('comment_reports')
        .insert({ user_id: currentProfile.id, comment_id: commentId, reason: reason || null });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Commentaire signalé, merci', 'success');
    }
}

// ==================== COMMENTAIRE MÉDIA ====================
function openCommentMediaModal(postId) {
    currentCommentMediaPostId = postId;
    document.getElementById('commentMediaModal').style.display = 'block';
}
function closeCommentMediaModal() {
    document.getElementById('commentMediaModal').style.display = 'none';
    currentCommentMediaPostId = null;
}
async function uploadCommentMedia() {
    const fileInput = document.getElementById('commentMediaFile');
    const file = fileInput.files[0];
    if (!file) {
        showToast('Sélectionnez un fichier', 'warning');
        return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentProfile.id}_comment_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage
        .from('player-posts')
        .upload(fileName, file);
    if (uploadError) {
        showToast('Erreur upload : ' + uploadError.message, 'error');
        return;
    }
    const { data: urlData } = supabaseClient.storage.from('player-posts').getPublicUrl(fileName);
    const mediaUrl = urlData.publicUrl;
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    const { error } = await supabaseClient
        .from('unified_comments')
        .insert({
            user_id: currentProfile.id,
            post_id: currentCommentMediaPostId,
            media_url: mediaUrl,
            media_type: mediaType,
            content: ''
        });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Média ajouté au commentaire', 'success');
        closeCommentMediaModal();
        await loadComments(currentCommentMediaPostId);
    }
}

// ==================== LIKES, DISLIKES ====================
async function likePost(postId) {
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const likeBtn = postCard?.querySelector('.post-actions button:first-child');
    const likeCountSpan = postCard?.querySelector('.post-stats span:first-child');
    let currentCount = parseInt(likeCountSpan?.innerHTML.match(/\d+/) || 0);
    if (likedPosts.has(postId)) {
        const { error } = await supabaseClient
            .from('unified_likes')
            .delete()
            .eq('user_id', currentProfile.id)
            .eq('post_id', postId);
        if (error) {
            showToast('Erreur', 'error');
            return;
        }
        likedPosts.delete(postId);
        if (likeBtn) likeBtn.classList.remove('liked');
        if (likeCountSpan) likeCountSpan.innerHTML = `<i class="fas fa-heart"></i> ${currentCount - 1}`;
    } else {
        const { error } = await supabaseClient
            .from('unified_likes')
            .insert({ user_id: currentProfile.id, post_id: postId });
        if (error) {
            showToast('Erreur', 'error');
            return;
        }
        likedPosts.add(postId);
        if (likeBtn) likeBtn.classList.add('liked');
        if (likeCountSpan) likeCountSpan.innerHTML = `<i class="fas fa-heart"></i> ${currentCount + 1}`;
        if (dislikedPosts.has(postId)) {
            await dislikePost(postId);
        }
    }
    const postIndex = posts.findIndex(p => p.id == postId);
    if (postIndex !== -1) {
        posts[postIndex].isLiked = likedPosts.has(postId);
        posts[postIndex].likesCount = likedPosts.has(postId) ? posts[postIndex].likesCount + 1 : posts[postIndex].likesCount - 1;
    }
}

async function dislikePost(postId) {
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const dislikeBtn = postCard?.querySelector('.post-actions button:nth-child(2)');
    const dislikeCountSpan = postCard?.querySelector('.post-stats span:nth-child(2)');
    let currentDislikes = parseInt(dislikeCountSpan?.innerHTML.match(/\d+/) || 0);
    if (dislikedPosts.has(postId)) {
        const { error } = await supabaseClient
            .from('unified_dislikes')
            .delete()
            .eq('user_id', currentProfile.id)
            .eq('post_id', postId);
        if (error) {
            showToast('Erreur', 'error');
            return;
        }
        dislikedPosts.delete(postId);
        if (dislikeBtn) dislikeBtn.classList.remove('disliked');
        if (dislikeCountSpan) dislikeCountSpan.innerHTML = `<i class="fas fa-thumbs-down"></i> ${currentDislikes - 1}`;
    } else {
        const { error } = await supabaseClient
            .from('unified_dislikes')
            .insert({ user_id: currentProfile.id, post_id: postId });
        if (error) {
            showToast('Erreur', 'error');
            return;
        }
        dislikedPosts.add(postId);
        if (dislikeBtn) dislikeBtn.classList.add('disliked');
        if (dislikeCountSpan) dislikeCountSpan.innerHTML = `<i class="fas fa-thumbs-down"></i> ${currentDislikes + 1}`;
        if (likedPosts.has(postId)) {
            await likePost(postId);
        }
    }
}

async function showLikes(postId) {
    const { data, error } = await supabaseClient
        .from('unified_likes')
        .select('user_id, profiles(id, full_name, avatar_url, username)')
        .eq('post_id', postId);
    if (error) {
        showToast('Erreur', 'error');
        return;
    }
    const list = document.getElementById('likesList');
    list.innerHTML = data.map(like => `
        <li onclick="openUserProfile('${like.profiles.id}')">
            <img src="${like.profiles.avatar_url || 'img/user-default.jpg'}">
            <span>${like.profiles.full_name || 'Anonyme'}</span>
            <small>@${like.profiles.username || ''}</small>
        </li>
    `).join('');
    document.getElementById('likesModal').style.display = 'block';
}
function closeLikesModal() {
    document.getElementById('likesModal').style.display = 'none';
}

async function showDislikes(postId) {
    const { data, error } = await supabaseClient
        .from('unified_dislikes')
        .select('user_id, profiles(id, full_name, avatar_url, username)')
        .eq('post_id', postId);
    if (error) {
        showToast('Erreur', 'error');
        return;
    }
    const list = document.getElementById('dislikesList');
    list.innerHTML = data.map(dislike => `
        <li onclick="openUserProfile('${dislike.profiles.id}')">
            <img src="${dislike.profiles.avatar_url || 'img/user-default.jpg'}">
            <span>${dislike.profiles.full_name || 'Anonyme'}</span>
            <small>@${dislike.profiles.username || ''}</small>
        </li>
    `).join('');
    document.getElementById('dislikesModal').style.display = 'block';
}
function closeDislikesModal() {
    document.getElementById('dislikesModal').style.display = 'none';
}

// ==================== REPOST ====================
async function repost(originalPostId) {
    const originalPost = posts.find(p => p.id == originalPostId);
    if (!originalPost) return;
    const content = prompt(`Republier "${originalPost.content?.substring(0,50)}..." ? (ajoutez un commentaire si vous le souhaitez)`);
    const { error } = await supabaseClient
        .from('unified_posts')
        .insert({
            user_id: currentProfile.id,
            content: content || null,
            original_post_id: originalPostId,
            post_type: 'repost'
        });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Repost effectué', 'success');
        loadPosts(true);
    }
}

// ==================== PARTAGE EXTERNE ====================
function sharePostExternal(postId) {
    const modal = document.getElementById('shareModal');
    modal.dataset.postId = postId;
    modal.style.display = 'block';
}
function closeShareModal() { document.getElementById('shareModal').style.display = 'none'; }
function shareOn(platform) {
    const postId = document.getElementById('shareModal').dataset.postId;
    const post = posts.find(p => p.id == postId);
    const url = encodeURIComponent(`${window.location.origin}/post.html?id=${postId}`);
    const text = encodeURIComponent(post.content || 'Regarde ce post sur HubISoccer !');
    let shareUrl = '';
    switch (platform) {
        case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break;
        case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break;
        case 'whatsapp': shareUrl = `https://wa.me/?text=${text}%20${url}`; break;
        case 'email': shareUrl = `mailto:?subject=HubISoccer&body=${text}%20${url}`; break;
    }
    if (shareUrl) window.open(shareUrl, '_blank');
    closeShareModal();
}

// ==================== STORIES ====================
async function loadStories() {
    updateLoaderProgress('Stories');
    const now = new Date().toISOString();
    const { data, error } = await supabaseClient
        .from('user_stories')
        .select('*, profiles:user_id (id, full_name, avatar_url)')
        .gte('expires_at', now)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erreur chargement stories:', error);
        return;
    }
    stories = data || [];
    renderStories();
}

function renderStories() {
    const myStoriesList = document.getElementById('myStoriesList');
    const moodStoriesList = document.getElementById('hubisMoodList');
    if (!myStoriesList || !moodStoriesList) return;

    const myStories = stories.filter(s => s.user_id === currentProfile.id);
    const moodStories = stories.filter(s => s.user_id !== currentProfile.id && following.some(f => f.following_id === s.user_id));

    myStoriesList.innerHTML = myStories.map(s => `
        <div class="story-item" onclick="openStory(${s.id})">
            <div class="story-ring"><img src="${s.profiles?.avatar_url || 'img/user-default.jpg'}" alt="${s.profiles?.full_name}"></div>
            <div class="story-name">${s.profiles?.full_name?.split(' ')[0] || ''}</div>
        </div>
    `).join('');

    moodStoriesList.innerHTML = moodStories.map(s => `
        <div class="story-item" onclick="openStory(${s.id})">
            <div class="story-ring"><img src="${s.profiles?.avatar_url || 'img/user-default.jpg'}" alt="${s.profiles?.full_name}"></div>
            <div class="story-name">${s.profiles?.full_name?.split(' ')[0] || ''}</div>
        </div>
    `).join('');
}

function openStoryUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'tempStoryModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header"><h2>Ajouter une story</h2><span class="close-modal" onclick="this.closest('.modal').remove()">×</span></div>
            <div class="modal-body">
                <div class="form-group"><label>Type</label><select id="storyType"><option value="image">Image</option><option value="video">Vidéo</option><option value="text">Texte</option></select></div>
                <div class="form-group"><label>Fichier (si image/vidéo)</label><input type="file" id="storyFile" accept="image/*,video/*"></div>
                <div class="form-group"><label>Texte (si texte)</label><textarea id="storyText" rows="3"></textarea></div>
                <button class="btn-create-story" onclick="uploadStory()">Publier la story</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

async function uploadStory() {
    const type = document.getElementById('storyType').value;
    const fileInput = document.getElementById('storyFile');
    const text = document.getElementById('storyText').value.trim();
    let mediaUrl = null;
    if (type !== 'text' && fileInput.files.length) {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_story_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('player-posts')
            .upload(fileName, file);
        if (uploadError) {
            showToast('Erreur upload : ' + uploadError.message, 'error');
            return;
        }
        const { data: urlData } = supabaseClient.storage.from('player-posts').getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
    }
    const content = type === 'text' ? text : null;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseClient
        .from('user_stories')
        .insert({
            user_id: currentProfile.id,
            content_type: type,
            content: content,
            media_url: mediaUrl,
            expires_at: expiresAt
        });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Story publiée', 'success');
        document.querySelector('#tempStoryModal').remove();
        await loadStories();
    }
}

async function openStory(storyId) {
    currentStoryId = storyId;
    const story = stories.find(s => s.id == storyId);
    if (!story) return;
    const modal = document.getElementById('storyModal');
    const viewer = document.getElementById('storyViewer');
    let contentHtml = '';
    if (story.content_type === 'text') {
        contentHtml = `<div class="story-text">${story.content}</div>`;
    } else if (story.media_url) {
        if (story.content_type === 'image') {
            contentHtml = `<img src="${story.media_url}" alt="Story">`;
        } else if (story.content_type === 'video') {
            contentHtml = `<video src="${story.media_url}" controls autoplay></video>`;
        }
    }
    viewer.innerHTML = `
        <div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div>
        <button class="story-close" onclick="closeStoryModal()">×</button>
        <button class="story-prev" onclick="prevStory()"><i class="fas fa-chevron-left"></i></button>
        <button class="story-next" onclick="nextStory()"><i class="fas fa-chevron-right"></i></button>
        ${contentHtml}
    `;
    // Ajouter bouton de suppression si propriétaire
    if (story.user_id === currentProfile.id) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'story-delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Supprimer';
        deleteBtn.onclick = () => deleteStory(story.id);
        viewer.appendChild(deleteBtn);
    }
    modal.style.display = 'flex';
    startStoryTimer(story);
}

async function deleteStory(storyId) {
    if (!confirm('Supprimer cette story ?')) return;
    const { error } = await supabaseClient
        .from('user_stories')
        .delete()
        .eq('id', storyId);
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Story supprimée', 'success');
        closeStoryModal();
        await loadStories();
    }
}

function closeStoryModal() {
    if (storyTimer) clearTimeout(storyTimer);
    document.getElementById('storyModal').style.display = 'none';
}

function nextStory() {
    const index = stories.findIndex(s => s.id == currentStoryId);
    if (index < stories.length - 1) {
        openStory(stories[index + 1].id);
    } else {
        closeStoryModal();
    }
}

function prevStory() {
    const index = stories.findIndex(s => s.id == currentStoryId);
    if (index > 0) {
        openStory(stories[index - 1].id);
    }
}

function startStoryTimer(story) {
    if (storyTimer) clearTimeout(storyTimer);
    const bar = document.getElementById('storyProgressBar');
    if (!bar) return;

    // Si c'est une vidéo, on écoute la fin et on ne lance pas de timer
    const video = document.querySelector('#storyViewer video');
    if (video && story.content_type === 'video') {
        video.addEventListener('ended', () => nextStory());
        video.play();
        return;
    }

    // Pour image ou texte : timer de 10 minutes (600000 ms)
    bar.style.width = '0%';
    bar.style.transition = 'none';
    setTimeout(() => {
        bar.style.transition = 'width 600s linear';
        bar.style.width = '100%';
    }, 10);
    storyTimer = setTimeout(() => {
        nextStory();
    }, 600000);
}

// ==================== MENTIONS & HASHTAGS ====================
function searchHashtag(tag) {
    searchTerm = '#' + tag;
    document.getElementById('communitySearch').value = searchTerm;
    renderPosts();
}
async function openUserProfileByUsername(username) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();
    if (data) openUserProfile(data.id);
    else showToast('Utilisateur introuvable', 'error');
}

// ==================== ZOOM MÉDIA ====================
function openMediaZoom(url, type, caption = '') {
    const modal = document.getElementById('mediaZoomModal');
    const viewer = document.getElementById('mediaViewer');
    const captionDiv = document.getElementById('mediaCaption');
    if (type === 'image') viewer.innerHTML = `<img src="${url}" alt="Zoom">`;
    else viewer.innerHTML = `<video src="${url}" controls autoplay></video>`;
    if (captionDiv) captionDiv.innerHTML = caption;
    modal.style.display = 'block';
}
function closeMediaZoom() {
    document.getElementById('mediaZoomModal').style.display = 'none';
}

// ==================== ÉVÉNEMENTS ====================
function openEventModal() {
    document.getElementById('createEventModal').style.display = 'block';
}
function closeEventModal() {
    document.getElementById('createEventModal').style.display = 'none';
}
async function createEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const location = document.getElementById('eventLocation').value.trim();
    const desc = document.getElementById('eventDesc').value.trim();
    if (!title || !date) {
        showToast('Titre et date obligatoires', 'warning');
        return;
    }
    const { data: event, error } = await supabaseClient
        .from('events')
        .insert({
            user_id: currentProfile.id,
            title,
            description: desc,
            event_date: date,
            location
        })
        .select()
        .single();
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
        return;
    }
    const content = `📅 Événement : ${title}\n📍 ${location}\n📆 ${new Date(date).toLocaleString()}\n\n${desc}`;
    const { error: postError } = await supabaseClient
        .from('unified_posts')
        .insert({
            user_id: currentProfile.id,
            content,
            post_type: 'event',
            event_id: event.id
        });
    if (postError) {
        showToast('Erreur publication événement', 'error');
    } else {
        showToast('Événement créé et publié', 'success');
        closeEventModal();
        loadPosts(true);
    }
}

// ==================== PROGRAMMATION ====================
function openScheduleModal() {
    document.getElementById('schedulePostModal').style.display = 'block';
}
function closeScheduleModal() {
    document.getElementById('schedulePostModal').style.display = 'none';
}
async function schedulePost() {
    const scheduledAt = document.getElementById('scheduleDateTime').value;
    if (!scheduledAt) {
        showToast('Veuillez choisir une date', 'warning');
        return;
    }
    const content = document.getElementById('postContent').value.trim();
    const file = document.getElementById('mediaInput').files[0];
    let mediaUrl = null, mediaType = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('player-posts')
            .upload(fileName, file);
        if (uploadError) {
            showToast('Erreur upload : ' + uploadError.message, 'error');
            return;
        }
        const { data: urlData } = supabaseClient.storage.from('player-posts').getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
        mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    }
    const { error } = await supabaseClient
        .from('scheduled_posts')
        .insert({
            user_id: currentProfile.id,
            content,
            media_url: mediaUrl,
            media_type: mediaType,
            scheduled_at: new Date(scheduledAt).toISOString(),
            status: 'pending'
        });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Publication programmée', 'success');
        closeScheduleModal();
        document.getElementById('postContent').value = '';
        document.getElementById('mediaInput').value = '';
        cancelMedia();
    }
}

// ==================== APERÇU ====================
function openPreview() {
    const content = document.getElementById('postContent').value.trim();
    const file = document.getElementById('mediaInput').files[0];
    const previewModal = document.getElementById('previewModal');
    document.getElementById('previewAuthorAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    document.getElementById('previewAuthorName').textContent = currentProfile.full_name;
    document.getElementById('previewText').innerHTML = formatPostContent(content);
    const previewMediaDiv = document.getElementById('previewMedia');
    if (file) {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('image/')) {
            previewMediaDiv.innerHTML = `<img src="${url}" alt="Aperçu">`;
        } else {
            previewMediaDiv.innerHTML = `<video src="${url}" controls></video>`;
        }
    } else {
        previewMediaDiv.innerHTML = '';
    }
    previewModal.style.display = 'block';
}
function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
}
function publishFromPreview() {
    document.getElementById('publishBtn').click();
    closePreview();
}

// ==================== PUBLICATION (avec progression) ====================
async function createPost(content, file) {
    let mediaUrl = null, mediaType = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('player-posts')
            .upload(fileName, file);
        if (uploadError) {
            showToast('Erreur upload : ' + uploadError.message, 'error');
            return;
        }
        const { data: urlData } = supabaseClient.storage.from('player-posts').getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
        mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    }
    const { data, error } = await supabaseClient
        .from('unified_posts')
        .insert({
            user_id: currentProfile.id,
            content: content,
            media_url: mediaUrl,
            media_type: mediaType,
            post_type: 'text'
        })
        .select()
        .single();
    if (error) {
        showToast('Erreur publication : ' + error.message, 'error');
    } else {
        showToast('Publication réussie !', 'success');
        document.getElementById('postContent').value = '';
        document.getElementById('mediaInput').value = '';
        cancelMedia();
        // Ajouter localement le nouveau post en haut du fil
        const newPost = {
            ...data,
            author: currentProfile,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            isLiked: false,
            isDisliked: false,
            isSaved: false,
            isFollowed: false,
            collections: []
        };
        posts.unshift(newPost);
        renderPosts();
    }
}
function cancelMedia() {
    document.getElementById('publishMediaPreview').innerHTML = '';
    document.getElementById('mediaCancel').style.display = 'none';
    document.getElementById('mediaInput').value = '';
}

// ==================== SONDAGE ====================
function openPollModal() {
    document.getElementById('pollModal').style.display = 'block';
}
function closePollModal() {
    document.getElementById('pollModal').style.display = 'none';
}
async function createPoll() {
    const question = document.getElementById('pollQuestion').value.trim();
    const options = document.getElementById('pollOptions').value.split('\n').filter(o => o.trim());
    if (!question || options.length < 2) {
        showToast('Question et au moins 2 options', 'warning');
        return;
    }
    const content = `📊 Sondage : ${question}\n\n${options.map((o,i)=>`${i+1}. ${o}`).join('\n')}`;
    const { error } = await supabaseClient
        .from('unified_posts')
        .insert({
            user_id: currentProfile.id,
            content,
            post_type: 'poll',
            poll_data: { question, options }
        });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Sondage publié', 'success');
        closePollModal();
        loadPosts(true);
    }
}

// ==================== MODALES PROFIL, CONFIDENTIALITÉ, INVITATION ====================
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    document.getElementById('editBio').value = currentProfile.bio || '';
    document.getElementById('editPhone').value = currentProfile.contact_info?.phone || '';
    document.getElementById('editEmail').value = currentProfile.contact_info?.email || '';
    document.getElementById('editCountry').value = currentProfile.contact_info?.country || '';
    document.getElementById('editAddress').value = currentProfile.contact_info?.address || '';
    document.getElementById('editInterests').value = currentProfile.contact_info?.interests || '';
    document.getElementById('editReason').value = currentProfile.contact_info?.reason || '';
    document.getElementById('editVision').value = currentProfile.contact_info?.vision || '';
    modal.style.display = 'block';
}
function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
}
async function saveProfileChanges(e) {
    e.preventDefault();
    const bio = document.getElementById('editBio').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const country = document.getElementById('editCountry').value;
    const address = document.getElementById('editAddress').value.trim();
    const interests = document.getElementById('editInterests').value.trim();
    const reason = document.getElementById('editReason').value.trim();
    const vision = document.getElementById('editVision').value.trim();
    const updates = {};
    if (bio !== currentProfile.bio) updates.bio = bio;
    const contactInfo = { ...(currentProfile.contact_info || {}) };
    if (phone !== contactInfo.phone) contactInfo.phone = phone;
    if (email !== contactInfo.email) contactInfo.email = email;
    if (country !== contactInfo.country) contactInfo.country = country;
    if (address !== contactInfo.address) contactInfo.address = address;
    if (interests !== contactInfo.interests) contactInfo.interests = interests;
    if (reason !== contactInfo.reason) contactInfo.reason = reason;
    if (vision !== contactInfo.vision) contactInfo.vision = vision;
    updates.contact_info = contactInfo;
    const btn = e.target.querySelector('button[type="submit"]');
    withButtonSpinner(btn, async () => {
        const { error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', currentProfile.id);
        if (error) {
            showToast('Erreur : ' + error.message, 'error');
        } else {
            currentProfile = { ...currentProfile, ...updates };
            showToast('Profil mis à jour', 'success');
            closeEditProfileModal();
        }
    });
}
function openPrivacyModal() {
    document.getElementById('privacyModal').style.display = 'block';
    document.querySelector(`input[name="privacy"][value="${privacyLevel}"]`).checked = true;
}
function closePrivacyModal() {
    document.getElementById('privacyModal').style.display = 'none';
}
async function savePrivacy() {
    const selected = document.querySelector('input[name="privacy"]:checked').value;
    const { error } = await supabaseClient
        .from('profiles')
        .update({ privacy: selected })
        .eq('id', currentProfile.id);
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        privacyLevel = selected;
        showToast('Paramètres enregistrés', 'success');
        closePrivacyModal();
        loadPosts(true);
    }
}
function openInviteModal() {
    document.getElementById('inviteModal').style.display = 'block';
}
function closeInviteModal() {
    document.getElementById('inviteModal').style.display = 'none';
}
async function sendInvite() {
    const email = document.getElementById('inviteEmail').value.trim();
    if (!email) return;
    // Simuler envoi (à implémenter avec un vrai service)
    showToast(`Invitation envoyée à ${email}`, 'success');
    closeInviteModal();
}
function showPersonalHistory() {
    // Ouvrir la modale d'historique avec les données de l'utilisateur
    openHistoryModal();
}
async function openHistoryModal() {
    // Récupérer les 20 dernières actions
    const { data, error } = await supabaseClient
        .from('user_activities')
        .select('*')
        .eq('user_id', currentProfile.id)
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) {
        showToast('Erreur chargement historique', 'error');
        return;
    }
    let html = '<ul class="history-list">';
    data.forEach(act => {
        html += `<li>${act.description} – ${timeSince(new Date(act.created_at))}</li>`;
    });
    html += '</ul>';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'historyModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header"><h2>Mon historique</h2><span class="close-modal" onclick="this.closest('.modal').remove()">×</span></div>
            <div class="modal-body">${html}</div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// ==================== SIGNALEMENT ====================
function openReportModal(postId) {
    currentReportPostId = postId;
    document.getElementById('reportModal').style.display = 'block';
}
function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
    currentReportPostId = null;
}
async function submitReport() {
    const reason = document.getElementById('reportReason').value.trim();
    const { error } = await supabaseClient
        .from('unified_reports')
        .insert({
            user_id: currentProfile.id,
            post_id: currentReportPostId,
            reason: reason || null
        });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Signalement envoyé', 'success');
        closeReportModal();
    }
}

// ==================== AUDIO COMMENTAIRES ====================
function openAudioCommentModal(postId) {
    if (!audioCommentsEnabled) return;
    audioCommentPostId = postId;
    document.getElementById('audioCommentModal').style.display = 'block';
}
function closeAudioModal() {
    document.getElementById('audioCommentModal').style.display = 'none';
    audioCommentPostId = null;
}
async function uploadAudioComment() {
    const fileInput = document.getElementById('audioFileInput');
    const file = fileInput.files[0];
    if (!file) {
        showToast('Sélectionnez un fichier audio', 'warning');
        return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentProfile.id}_audio_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage
        .from('audio_comments')
        .upload(fileName, file);
    if (uploadError) {
        showToast('Erreur upload : ' + uploadError.message, 'error');
        return;
    }
    const { data: urlData } = supabaseClient.storage.from('audio_comments').getPublicUrl(fileName);
    const audioUrl = urlData.publicUrl;
    const { error } = await supabaseClient
        .from('unified_comments')
        .insert({
            user_id: currentProfile.id,
            post_id: audioCommentPostId,
            audio_url: audioUrl,
            audio_duration: 0,
            content: ''
        });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Commentaire audio ajouté', 'success');
        closeAudioModal();
        await loadComments(audioCommentPostId);
    }
}

// ==================== VUES ====================
function observePostsForViews() {
    const postsElements = document.querySelectorAll('.post-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const postId = parseInt(entry.target.dataset.postId);
                if (!observedPosts.has(postId)) {
                    observedPosts.add(postId);
                    recordView(postId);
                }
            }
        });
    }, { threshold: 0.5 });
    postsElements.forEach(el => observer.observe(el));
}
async function recordView(postId) {
    const { error } = await supabaseClient
        .from('post_views')
        .insert({
            post_id: postId,
            user_id: currentProfile.id,
            session_id: null
        });
    if (error) console.error('Erreur enregistrement vue:', error);
}

// ==================== POSTS MASQUÉS ====================
async function hidePost(postId) {
    const { error } = await supabaseClient
        .from('unified_hidden')
        .insert({ user_id: currentProfile.id, post_id: postId });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
        return;
    }
    hiddenPosts.add(postId);
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (postCard) postCard.remove();
    showToast('Post masqué', 'success');
}
async function loadHiddenPosts() {
    showingHidden = true;
    document.getElementById('backToFeedBtn').style.display = 'block';
    try {
        const hiddenIds = Array.from(hiddenPosts);
        if (hiddenIds.length === 0) {
            document.getElementById('postsFeed').innerHTML = '<p class="no-data">Aucun post masqué.</p>';
            return;
        }
        const { data: postsData, error } = await supabaseClient
            .from('unified_posts')
            .select('*')
            .in('id', hiddenIds)
            .order('created_at', { ascending: false });
        if (error) throw error;

        const authorIds = postsData.map(p => p.user_id).filter(Boolean);
        const { data: profilesData } = await supabaseClient
            .from('profiles')
            .select('id, full_name, avatar_url, username, role, badges')
            .in('id', authorIds);
        const profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));

        const hiddenPostsList = await Promise.all(postsData.map(async post => {
            const author = profilesMap[post.user_id];
            const { count: likesCount } = await supabaseClient
                .from('unified_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            const { count: commentsCount } = await supabaseClient
                .from('unified_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            return {
                ...post,
                author,
                likesCount: likesCount || 0,
                commentsCount: commentsCount || 0,
                isLiked: likedPosts.has(post.id),
                isSaved: savedPosts.has(post.id)
            };
        }));
        renderHiddenPosts(hiddenPostsList);
        hiddenPostsList.forEach(post => loadComments(post.id));
    } catch (error) {
        console.error('Erreur chargement posts masqués:', error);
        showToast('Erreur lors du chargement des posts masqués', 'error');
    }
}
function renderHiddenPosts(hiddenPostsList) {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;
    if (hiddenPostsList.length === 0) {
        feed.innerHTML = '<p class="no-data">Aucun post masqué.</p>';
        return;
    }
    let html = '';
    hiddenPostsList.forEach(post => {
        html += renderPostCard(post, true);
    });
    feed.innerHTML = html;
}
function backToFeed() {
    showingHidden = false;
    document.getElementById('backToFeedBtn').style.display = 'none';
    loadPosts(true);
}

// ==================== GESTION DES POSTS (MODIFIER, SUPPRIMER) ====================
async function editPost(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    const newContent = prompt('Modifier votre publication :', post.content);
    if (newContent === null) return;
    const { error } = await supabaseClient
        .from('unified_posts')
        .update({ content: newContent })
        .eq('id', postId);
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Publication modifiée', 'success');
        post.content = newContent;
        const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (postCard) {
            const contentDiv = postCard.querySelector('.post-content');
            if (contentDiv) contentDiv.innerHTML = formatPostContent(newContent);
        }
    }
}
async function deletePost(postId) {
    if (!confirm('Supprimer cette publication ?')) return;
    const { error } = await supabaseClient
        .from('unified_posts')
        .delete()
        .eq('id', postId);
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Publication supprimée', 'success');
        const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (postCard) postCard.remove();
        const index = posts.findIndex(p => p.id == postId);
        if (index !== -1) posts.splice(index, 1);
    }
}

// ==================== PROFIL UTILISATEUR ====================
async function openUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) {
        showToast('Erreur chargement profil', 'error');
        return;
    }
    selectedUserId = userId;
    document.getElementById('profileAvatar').src = data.avatar_url || 'img/user-default.jpg';
    document.getElementById('profileName').textContent = data.full_name;
    document.getElementById('profileHubId').textContent = `@${data.username || 'utilisateur'}`;
    const badgesHtml = (data.badges || []).map(b => `<span class="badge-mini">${b}</span>`).join('');
    document.getElementById('profileBadges').innerHTML = badgesHtml;
    document.getElementById('profileBio').textContent = data.bio || 'Aucune bio.';
    document.getElementById('profileInterests').textContent = data.contact_info?.interests || 'Non renseigné';
    document.getElementById('profileReason').textContent = data.contact_info?.reason || 'Non renseigné';
    document.getElementById('profileVision').textContent = data.contact_info?.vision || 'Non renseigné';
    document.getElementById('userProfileModal').style.display = 'block';
}
function closeUserProfileModal() {
    document.getElementById('userProfileModal').style.display = 'none';
}
function sendMessageToUser() {
    if (selectedUserId) {
        window.location.href = `messages.html?to=${selectedUserId}`;
    } else {
        showToast('Aucun utilisateur sélectionné', 'warning');
    }
}

// ==================== BLOCAGE UTILISATEUR ====================
let blockUserId = null;
function openBlockUserModal(userId) {
    blockUserId = userId;
    document.getElementById('blockUserModal').style.display = 'block';
}
function closeBlockUserModal() {
    document.getElementById('blockUserModal').style.display = 'none';
    blockUserId = null;
}
async function confirmBlockUser() {
    if (!blockUserId) return;
    const { error } = await supabaseClient
        .from('blocked_users')
        .insert({ blocker_id: currentProfile.id, blocked_id: blockUserId });
    if (error) {
        showToast('Erreur : ' + error.message, 'error');
    } else {
        showToast('Utilisateur bloqué', 'success');
        closeBlockUserModal();
        // Supprimer les commentaires de cet utilisateur sur les posts de l'utilisateur courant
        // (à implémenter selon besoin)
    }
}

// ==================== FOLLOWERS / FOLLOWING ====================
async function loadFollowers() {
    updateLoaderProgress('Chargement des abonnés');
    const { data: followersData } = await supabaseClient
        .from('unified_follows')
        .select('follower_id, follower:profiles!follower_id (id, full_name, avatar_url, username)')
        .eq('following_id', currentProfile.id);
    followers = followersData || [];
    const followersList = document.getElementById('followersList');
    if (followersList) {
        followersList.innerHTML = followers.slice(0, 5).map(f => `
            <li onclick="openUserProfile('${f.follower_id}')">
                <img src="${f.follower?.avatar_url || 'img/user-default.jpg'}">
                <span>${f.follower?.full_name || 'Anonyme'}</span>
                <small>@${f.follower?.username || ''}</small>
            </li>
        `).join('');
        if (followers.length === 0) followersList.innerHTML = '<li>Aucun abonné</li>';
    }

    const { data: followingData } = await supabaseClient
        .from('unified_follows')
        .select('following_id, followed:profiles!following_id (id, full_name, avatar_url, username)')
        .eq('follower_id', currentProfile.id);
    following = followingData || [];
    const followingList = document.getElementById('followingList');
    if (followingList) {
        followingList.innerHTML = following.slice(0, 5).map(f => `
            <li onclick="openUserProfile('${f.following_id}')">
                <img src="${f.followed?.avatar_url || 'img/user-default.jpg'}">
                <span>${f.followed?.full_name || 'Anonyme'}</span>
                <small>@${f.followed?.username || ''}</small>
            </li>
        `).join('');
        if (following.length === 0) followingList.innerHTML = '<li>Aucun abonnement</li>';
    }

    // Suggestions : profils non suivis
    const { data: suggestionsData } = await supabaseClient
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .neq('id', currentProfile.id)
        .limit(5);
    const suggestionsList = document.getElementById('suggestionsList');
    if (suggestionsList) {
        suggestionsList.innerHTML = (suggestionsData || []).map(s => `
            <li onclick="openUserProfile('${s.id}')">
                <img src="${s.avatar_url || 'img/user-default.jpg'}">
                <span>${s.full_name || 'Anonyme'}</span>
                <small>@${s.username || ''}</small>
            </li>
        `).join('');
    }

    // Tendances : hashtags populaires (simplifié)
    const { data: trendsData } = await supabaseClient
        .from('unified_posts')
        .select('content')
        .limit(100);
    const hashtags = {};
    (trendsData || []).forEach(post => {
        const matches = post.content?.match(/#\w+/g) || [];
        matches.forEach(tag => {
            hashtags[tag] = (hashtags[tag] || 0) + 1;
        });
    });
    const sorted = Object.entries(hashtags).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const trendsList = document.getElementById('trendsList');
    if (trendsList) {
        trendsList.innerHTML = sorted.map(([tag, count]) => `
            <li onclick="searchHashtag('${tag.substring(1)}')">
                <i class="fas fa-hashtag"></i> ${tag} <small>${count} posts</small>
            </li>
        `).join('');
        if (sorted.length === 0) trendsList.innerHTML = '<li>Aucune tendance</li>';
    }

    updateLoaderProgress('Abonnés chargés');
}

async function toggleFollow(button) {
    const followedId = button.dataset.userId;
    const isFollowing = button.classList.contains('following');
    withButtonSpinner(button, async () => {
        if (isFollowing) {
            await supabaseClient
                .from('unified_follows')
                .delete()
                .eq('follower_id', currentProfile.id)
                .eq('following_id', followedId);
            button.classList.remove('following');
            button.textContent = 'Suivre';
        } else {
            await supabaseClient
                .from('unified_follows')
                .insert({ follower_id: currentProfile.id, following_id: followedId });
            button.classList.add('following');
            button.textContent = 'Abonné';
        }
        await loadFollowers();
        await loadPosts(true);
    });
}

// ==================== ÉPINGLAGE (PIN) ====================
let pinCount = 0;
async function checkPinLimit() {
    const { data, error } = await supabaseClient
        .from('user_pins')
        .select('used_count')
        .eq('user_id', currentProfile.id)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error(error);
        return 2;
    }
    if (!data) {
        // Initialiser
        await supabaseClient.from('user_pins').insert({ user_id: currentProfile.id, used_count: 0 });
        return 0;
    }
    return data.used_count;
}
async function pinPost() {
    const used = await checkPinLimit();
    if (used >= 2) {
        showToast('Vous avez utilisé vos 2 épinglages. Contactez l’administrateur pour débloquer la fonction VIP.', 'warning');
        return;
    }
    const content = document.getElementById('postContent').value.trim();
    const file = document.getElementById('mediaInput').files[0];
    if (!content && !file) {
        showToast('Écrivez quelque chose ou ajoutez un média', 'warning');
        return;
    }
    // Publier le post avec flag is_pinned
    let mediaUrl = null, mediaType = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_pin_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('player-posts')
            .upload(fileName, file);
        if (uploadError) {
            showToast('Erreur upload : ' + uploadError.message, 'error');
            return;
        }
        const { data: urlData } = supabaseClient.storage.from('player-posts').getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
        mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    }
    const { data: postData, error: postError } = await supabaseClient
        .from('unified_posts')
        .insert({
            user_id: currentProfile.id,
            content,
            media_url: mediaUrl,
            media_type: mediaType,
            post_type: 'text',
            is_pinned: true
        })
        .select()
        .single();
    if (postError) {
        showToast('Erreur publication : ' + postError.message, 'error');
        return;
    }
    // Incrémenter le compteur
    await supabaseClient
        .from('user_pins')
        .update({ used_count: used + 1 })
        .eq('user_id', currentProfile.id);
    showToast('Post épinglé avec succès (VIP). Il apparaîtra en 3e position.', 'success');
    document.getElementById('postContent').value = '';
    document.getElementById('mediaInput').value = '';
    cancelMedia();
    // Ajouter le post localement et repositionner les 3 premiers posts
    const newPost = {
        ...postData,
        author: currentProfile,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        isLiked: false,
        isDisliked: false,
        isSaved: false,
        isFollowed: false,
        collections: []
    };
    // Insérer en 3e position (index 2) si le fil a au moins 2 posts
    if (posts.length >= 2) {
        posts.splice(2, 0, newPost);
    } else {
        posts.push(newPost);
    }
    renderPosts();
}

// ==================== RECHERCHE ET FILTRES ====================
function initSearchAndFilters() {
    const searchInput = document.getElementById('communitySearch');
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderPosts();
    });
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderPosts();
        });
    });
    document.getElementById('dateFilter').addEventListener('change', (e) => {
        dateFilter = e.target.value;
        loadPosts(true);
    });
    document.getElementById('popularityFilter').addEventListener('change', (e) => {
        popularityFilter = e.target.value;
        loadPosts(true);
    });
    document.getElementById('contentTypeFilter').addEventListener('change', (e) => {
        contentTypeFilter = e.target.value;
        loadPosts(true);
    });
}

// ==================== MENU UTILISATEUR ====================
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => userDropdown.classList.remove('show'));
}
function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ==================== SIDEBARS ====================
function initSidebars() {
    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    document.getElementById('menuToggle').addEventListener('click', () => {
        leftSidebar.classList.add('active');
        overlay.classList.add('active');
    });
    document.getElementById('rightSidebarToggle').addEventListener('click', () => {
        rightSidebar.classList.add('active');
        overlay.classList.add('active');
    });
    document.getElementById('closeLeftSidebar').addEventListener('click', () => {
        leftSidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    document.getElementById('closeRightSidebar').addEventListener('click', () => {
        rightSidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    overlay.addEventListener('click', () => {
        leftSidebar.classList.remove('active');
        rightSidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    document.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && touchStartX < 50) {
                leftSidebar.classList.add('active');
                overlay.classList.add('active');
            } else if (diff < 0 && touchStartX > window.innerWidth - 50) {
                rightSidebar.classList.add('active');
                overlay.classList.add('active');
            }
        }
    });
}

// ==================== NOUVEAUX POSTS (Realtime) ====================
function subscribeToNewPosts() {
    supabaseClient
        .channel('unified_posts_changes_player')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unified_posts' }, payload => {
            // Ignorer si c'est l'utilisateur lui-même (déjà géré localement)
            if (payload.new.user_id === currentProfile.id) return;
            newPostsCount++;
            const indicator = document.getElementById('newPostsIndicator');
            document.getElementById('newPostsCount').textContent = newPostsCount;
            indicator.style.display = 'block';
        })
        .subscribe();
}
function hideNewPostsIndicator() {
    document.getElementById('newPostsIndicator').style.display = 'none';
    newPostsCount = 0;
}

// ==================== LANGUES (rechargement avec paramètre) ====================
function initLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || localStorage.getItem('hubisoccer_lang') || 'fr';
    localStorage.setItem('hubisoccer_lang', lang);
    const select = document.getElementById('langSelect');
    if (select) select.value = lang;
    select?.addEventListener('change', (e) => {
        const newLang = e.target.value;
        localStorage.setItem('hubisoccer_lang', newLang);
        window.location.href = `${window.location.pathname}?lang=${newLang}`;
    });
    const languageLink = document.getElementById('languageLink');
    if (languageLink) {
        languageLink.addEventListener('click', (e) => {
            e.preventDefault();
            select?.dispatchEvent(new Event('change'));
        });
    }
    // Appliquer les textes statiques si besoin (simplifié, on recharge la page)
}

// ==================== EMARKET ====================
function openEmarketModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'emarketModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header"><h2>Emarket HubISoccer</h2><span class="close-modal" onclick="this.closest('.modal').remove()">×</span></div>
            <div class="modal-body">
                <p>Découvrez nos produits dérivés, équipements et offres partenaires.</p>
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:15px;">
                    <div style="border:1px solid #ddd; border-radius:8px; padding:10px; text-align:center; flex:1;"><img src="img/product1.jpg" style="width:100%; max-width:100px;"><p>Maillot officiel</p><button onclick="showToast('Fonctionnalité à venir', 'info')">Acheter</button></div>
                    <div style="border:1px solid #ddd; border-radius:8px; padding:10px; text-align:center; flex:1;"><img src="img/product2.jpg" style="width:100%; max-width:100px;"><p>Ballon signature</p><button onclick="showToast('Fonctionnalité à venir', 'info')">Acheter</button></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// ==================== INITIALISATION PRINCIPALE ====================
async function init() {
    showLoaderWithProgress(12);
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadSiteConfig();
    await loadFollowers();
    await loadCollections();
    await loadUserMetadata();
    await loadNotifications();
    await loadStories();
    await loadPosts(true);
    initSearchAndFilters();
    initUserMenu();
    initLogout();
    initSidebars();
    subscribeToNewPosts();
    initLanguage();

    // Boutons de la zone de publication
    const attachMediaBtn = document.getElementById('attachMediaBtn');
    if (attachMediaBtn) {
        attachMediaBtn.addEventListener('click', () => {
            const mediaInput = document.getElementById('mediaInput');
            if (mediaInput) mediaInput.click();
        });
    }
    
    const mediaInput = document.getElementById('mediaInput');
    if (mediaInput) {
        mediaInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const preview = document.getElementById('publishMediaPreview');
            const url = URL.createObjectURL(file);
            if (file.type.startsWith('image/')) preview.innerHTML = `<img src="${url}" alt="Aperçu">`;
            else preview.innerHTML = `<video src="${url}" controls></video>`;
            const mediaCancel = document.getElementById('mediaCancel');
            const mediaFileName = document.getElementById('mediaFileName');
            if (mediaCancel) mediaCancel.style.display = 'flex';
            if (mediaFileName) mediaFileName.textContent = file.name;
        });
    }
    
    const previewPostBtn = document.getElementById('previewPostBtn');
    if (previewPostBtn) previewPostBtn.addEventListener('click', openPreview);
    
    const schedulePostBtn = document.getElementById('schedulePostBtn');
    if (schedulePostBtn) schedulePostBtn.addEventListener('click', openScheduleModal);
    
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            const content = document.getElementById('postContent').value.trim();
            const file = document.getElementById('mediaInput')?.files[0];
            if (!content && !file) {
                showToast('Écrivez quelque chose ou ajoutez un média', 'warning');
                return;
            }
            await withButtonSpinner(publishBtn, () => createPost(content, file));
        });
    }
    
    const mediaCancel = document.getElementById('mediaCancel');
    if (mediaCancel) mediaCancel.addEventListener('click', cancelMedia);
    
    const pinPostBtn = document.getElementById('pinPostBtn');
    if (pinPostBtn) pinPostBtn.addEventListener('click', pinPost);

    // Posts masqués
    document.getElementById('showHiddenPosts').addEventListener('click', (e) => {
        e.preventDefault();
        loadHiddenPosts();
    });
    document.getElementById('backToFeedBtn').querySelector('button').addEventListener('click', backToFeed);

    // Édition du profil
    document.getElementById('editProfileForm').addEventListener('submit', saveProfileChanges);
    // document.getElementById('editProfileBtn').addEventListener('click', openEditProfileModal);

    // Notifications
    document.getElementById('notifIcon').addEventListener('click', openNotificationsModal);
    document.getElementById('markAllRead').addEventListener('click', markAllNotificationsAsRead);

    // Collections
    document.getElementById('createCollectionBtn').addEventListener('click', openCreateCollectionModal);

    // Sondage
    document.getElementById('pollBtn').addEventListener('click', openPollModal);
    document.getElementById('submitPoll').addEventListener('click', createPoll);

    // Confidentialité
    document.getElementById('privacyBtn').addEventListener('click', openPrivacyModal);
    document.getElementById('savePrivacy').addEventListener('click', savePrivacy);

    // Invitations
    document.getElementById('inviteBtn').addEventListener('click', openInviteModal);
    document.getElementById('sendInvite').addEventListener('click', sendInvite);

    // Historique
    document.getElementById('historyBtn').addEventListener('click', showPersonalHistory);

    // Événement
    document.getElementById('eventBtn').addEventListener('click', openEventModal);
    // Le bouton createEvent est dans la modale, déjà relié par onclick

    // Charger plus
    document.getElementById('loadMoreBtn').addEventListener('click', loadMorePosts);

    // Modale de zoom média
    const closeZoom = document.querySelector('#mediaZoomModal .close-modal');
    if (closeZoom) closeZoom.addEventListener('click', closeMediaZoom);

    // Emarket (dans la sidebar droite)
    const emarketSection = document.querySelector('.community-section:last-child .view-all');
    if (emarketSection) emarketSection.addEventListener('click', (e) => {
        e.preventDefault();
        openEmarketModal();
    });

    // Exposer les fonctions globales
    window.closePreview = closePreview;
    window.publishFromPreview = publishFromPreview;
    window.openUserProfile = openUserProfile;
    window.closeUserProfileModal = closeUserProfileModal;
    window.sendMessageToUser = sendMessageToUser;
    window.closeLikesModal = closeLikesModal;
    window.closeDislikesModal = closeDislikesModal;
    window.closeReplyModal = closeReplyModal;
    window.sendReply = sendReply;
    window.closeNotificationsModal = closeNotificationsModal;
    window.markAllNotificationsAsRead = markAllNotificationsAsRead;
    window.closeCollectionsModal = closeCollectionsModal;
    window.togglePostInCollection = togglePostInCollection;
    window.closePollModal = closePollModal;
    window.closeShareModal = closeShareModal;
    window.closePrivacyModal = closePrivacyModal;
    window.closeInviteModal = closeInviteModal;
    window.closeMediaZoom = closeMediaZoom;
    window.openMediaZoom = openMediaZoom;
    window.closeEventModal = closeEventModal;
    window.closeScheduleModal = closeScheduleModal;
    window.closeReportModal = closeReportModal;
    window.closeAudioModal = closeAudioModal;
    window.closeCommentMediaModal = closeCommentMediaModal;
    window.openStoryUploadModal = openStoryUploadModal;
    window.uploadStory = uploadStory;
    window.openStory = openStory;
    window.closeStoryModal = closeStoryModal;
    window.nextStory = nextStory;
    window.prevStory = prevStory;
    window.toggleFollow = toggleFollow;
    window.likePost = likePost;
    window.dislikePost = dislikePost;
    window.addComment = addComment;
    window.focusComment = focusComment;
    window.scrollToComments = scrollToComments;
    window.openReplyModal = openReplyModal;
    window.editComment = editComment;
    window.deleteComment = deleteComment;
    window.reportComment = reportComment;
    window.repost = repost;
    window.sharePostExternal = sharePostExternal;
    window.shareOn = shareOn;
    window.openEventModal = openEventModal;
    window.createEvent = createEvent;
    window.openScheduleModal = openScheduleModal;
    window.schedulePost = schedulePost;
    window.openReportModal = openReportModal;
    window.submitReport = submitReport;
    window.openAudioCommentModal = openAudioCommentModal;
    window.uploadAudioComment = uploadAudioComment;
    window.openCommentMediaModal = openCommentMediaModal;
    window.uploadCommentMedia = uploadCommentMedia;
    window.editPost = editPost;
    window.deletePost = deletePost;
    window.hidePost = hidePost;
    window.showLikes = showLikes;
    window.showDislikes = showDislikes;
    window.openEditProfileModal = openEditProfileModal;
    window.closeEditProfileModal = closeEditProfileModal;
    window.createNewCollection = createNewCollection;
    window.closeCreateCollectionModal = closeCreateCollectionModal;
    window.setCurrentCollection = setCurrentCollection;
    window.searchHashtag = searchHashtag;
    window.openUserProfileByUsername = openUserProfileByUsername;
    window.cancelMedia = cancelMedia;
    window.loadMorePosts = loadMorePosts;
    window.loadPosts = loadPosts;
    window.openBlockUserModal = openBlockUserModal;
    window.closeBlockUserModal = closeBlockUserModal;
    window.confirmBlockUser = confirmBlockUser;
    window.openEmarketModal = openEmarketModal;

    updateLoaderProgress('Initialisation terminée');
}

// Lancer l'initialisation
init();