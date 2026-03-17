// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayerPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let posts = [];
let followers = [];
let following = [];
let savedPosts = new Set();
let hiddenPosts = new Set();
let likedPosts = new Set();
let currentFilter = 'all';
let searchTerm = '';
let newPostsCount = 0;
let selectedUserId = null;
let previewMedia = null;
let previewMediaType = null;
let replyParentId = null;
let showingHidden = false;

// ===== TOAST SYSTEM =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
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

// ===== LOADER GLOBAL =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== SPINNER UTILITY =====
async function withButtonSpinner(button, asyncFn) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner"></span>';
    try {
        await asyncFn();
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    const { data: { session }, error } = await supabasePlayerPrive.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL DEPUIS LA TABLE UNIFIÉE profiles =====
async function loadProfile() {
    const { data, error } = await supabasePlayerPrive
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error) {
        console.error('Erreur chargement profil:', error);
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = data.full_name || 'Joueur';
    document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
    document.getElementById('publishAvatar').src = data.avatar_url || 'img/user-default.jpg';
    return currentProfile;
}

// ===== CHARGEMENT DES DONNÉES UTILISATEUR =====
async function loadUserMetadata() {
    // Likes
    const { data: likesData } = await supabasePlayerPrive
        .from('unified_likes')
        .select('post_id')
        .eq('user_id', currentProfile.id);
    likedPosts = new Set(likesData?.map(l => l.post_id) || []);

    // Saved
    const { data: savedData } = await supabasePlayerPrive
        .from('unified_saved')
        .select('post_id')
        .eq('user_id', currentProfile.id);
    savedPosts = new Set(savedData?.map(s => s.post_id) || []);

    // Hidden
    const { data: hiddenData } = await supabasePlayerPrive
        .from('unified_hidden')
        .select('post_id')
        .eq('user_id', currentProfile.id);
    hiddenPosts = new Set(hiddenData?.map(h => h.post_id) || []);
}

// ===== CHARGEMENT DES POSTS =====
async function loadPosts() {
    showingHidden = false;
    document.getElementById('backToFeedBtn').style.display = 'none';
    try {
        const feedLoader = document.getElementById('feedLoader');
        if (feedLoader) feedLoader.style.display = 'flex';

        const { data: postsData, error: postsError } = await supabasePlayerPrive
            .from('unified_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const authorIds = postsData.map(p => p.user_id).filter(Boolean);
        const { data: profilesData, error: profilesError } = await supabasePlayerPrive
            .from('profiles')
            .select('id, full_name, avatar_url, username, role')
            .in('id', authorIds);

        if (profilesError) throw profilesError;

        const profilesMap = {};
        (profilesData || []).forEach(p => profilesMap[p.id] = p);

        const postsWithCounts = [];
        for (const post of postsData) {
            const { count: likesCount } = await supabasePlayerPrive
                .from('unified_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            const { count: commentsCount } = await supabasePlayerPrive
                .from('unified_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            const { count: sharesCount } = await supabasePlayerPrive
                .from('unified_shares')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

            postsWithCounts.push({
                ...post,
                author: profilesMap[post.user_id] || null,
                likes: [{ count: likesCount || 0 }],
                comments: [{ count: commentsCount || 0 }],
                shares: [{ count: sharesCount || 0 }]
            });
        }

        const visiblePosts = postsWithCounts.filter(post => !hiddenPosts.has(post.id));

        const { data: followingData } = await supabasePlayerPrive
            .from('unified_follows')
            .select('following_id')
            .eq('follower_id', currentProfile.id);
        const followingIds = followingData?.map(f => f.following_id) || [];

        posts = visiblePosts.map(post => ({
            ...post,
            isFollowed: followingIds.includes(post.user_id),
            isSaved: savedPosts.has(post.id),
            isLiked: likedPosts.has(post.id)
        }));

        renderPosts();
        posts.forEach(post => loadComments(post.id));
    } catch (error) {
        console.error('Erreur chargement posts:', error);
        showToast('Erreur lors du chargement des posts', 'error');
    } finally {
        const feedLoader = document.getElementById('feedLoader');
        if (feedLoader) feedLoader.style.display = 'none';
    }
}

// ===== CHARGEMENT DES POSTS MASQUÉS =====
async function loadHiddenPosts() {
    showingHidden = true;
    document.getElementById('backToFeedBtn').style.display = 'block';
    try {
        const feedLoader = document.getElementById('feedLoader');
        if (feedLoader) feedLoader.style.display = 'flex';

        const hiddenIds = Array.from(hiddenPosts);
        if (hiddenIds.length === 0) {
            document.getElementById('postsFeed').innerHTML = '<p class="no-data">Aucun post masqué.</p>';
            return;
        }

        const { data: postsData, error: postsError } = await supabasePlayerPrive
            .from('unified_posts')
            .select('*')
            .in('id', hiddenIds)
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const authorIds = postsData.map(p => p.user_id).filter(Boolean);
        const { data: profilesData, error: profilesError } = await supabasePlayerPrive
            .from('profiles')
            .select('id, full_name, avatar_url, username, role')
            .in('id', authorIds);

        if (profilesError) throw profilesError;

        const profilesMap = {};
        (profilesData || []).forEach(p => profilesMap[p.id] = p);

        const postsWithCounts = [];
        for (const post of postsData) {
            const { count: likesCount } = await supabasePlayerPrive
                .from('unified_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            const { count: commentsCount } = await supabasePlayerPrive
                .from('unified_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            const { count: sharesCount } = await supabasePlayerPrive
                .from('unified_shares')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

            postsWithCounts.push({
                ...post,
                author: profilesMap[post.user_id] || null,
                likes: [{ count: likesCount || 0 }],
                comments: [{ count: commentsCount || 0 }],
                shares: [{ count: sharesCount || 0 }]
            });
        }

        const hiddenPostsList = postsWithCounts.map(post => ({
            ...post,
            isFollowed: false,
            isSaved: savedPosts.has(post.id),
            isLiked: likedPosts.has(post.id)
        }));

        renderHiddenPosts(hiddenPostsList);
        hiddenPostsList.forEach(post => loadComments(post.id));
    } catch (error) {
        console.error('Erreur chargement posts masqués:', error);
        showToast('Erreur lors du chargement des posts masqués', 'error');
    } finally {
        const feedLoader = document.getElementById('feedLoader');
        if (feedLoader) feedLoader.style.display = 'none';
    }
}

// ===== RENDU DES POSTS MASQUÉS =====
function renderHiddenPosts(hiddenPostsList) {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;
    if (hiddenPostsList.length === 0) {
        feed.innerHTML = '<p class="no-data">Aucun post masqué.</p>';
        return;
    }
    let html = '';
    hiddenPostsList.forEach(post => {
        const timeAgo = timeSince(new Date(post.created_at));
        const likedClass = post.isLiked ? 'liked' : '';
        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'image') {
                mediaHtml = `<img src="${post.media_url}" alt="Post media">`;
            } else if (post.media_type === 'video') {
                mediaHtml = `<video src="${post.media_url}" controls></video>`;
            }
        }

        const authorName = post.author?.full_name || 'Anonyme';
        const roleBadge = post.author?.role ? `<span class="role-badge">${post.author.role}</span>` : '';
        const pinIcon = post.isSaved ? 'fas fa-star' : 'far fa-star';
        const pinText = post.isSaved ? 'Épinglé' : 'Épingler';

        html += `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.author?.avatar_url || 'img/user-default.jpg'}" alt="${authorName}">
                    <div class="post-author">
                        <h4>${authorName} ${roleBadge}</h4>
                        <small>@${post.author?.username || 'inconnu'} · ${timeAgo}</small>
                    </div>
                    <div class="post-menu">
                        <button class="post-menu-btn" onclick="togglePostMenu(this)"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="post-menu-dropdown">
                            <button onclick="unhidePost(${post.id})"><i class="fas fa-eye"></i> Réafficher</button>
                            <button onclick="toggleSavePost(${post.id})"><i class="${pinIcon}"></i> ${pinText}</button>
                            <button onclick="reportPost(${post.id})"><i class="fas fa-flag"></i> Signaler</button>
                        </div>
                    </div>
                </div>
                <div class="post-content">${post.content || ''}</div>
                ${post.media_url ? `<div class="post-media">${mediaHtml}</div>` : ''}
                <div class="post-stats">
                    <span onclick="showLikes(${post.id})"><i class="fas fa-heart"></i> ${post.likes?.[0]?.count || 0}</span>
                    <span onclick="scrollToComments(${post.id})"><i class="fas fa-comment"></i> ${post.comments?.[0]?.count || 0}</span>
                    <span><i class="fas fa-share"></i> ${post.shares?.[0]?.count || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="${likedClass}" onclick="likePost(${post.id})"><i class="fas fa-heart"></i> J'aime</button>
                    <button onclick="focusComment(${post.id})"><i class="fas fa-comment"></i> Commenter</button>
                    <button onclick="sharePost(${post.id})"><i class="fas fa-share"></i> Partager</button>
                </div>
                <div class="comments-section" id="comments-${post.id}"></div>
            </div>
        `;
    });
    feed.innerHTML = html;
}

// ===== RENDU DES POSTS (avec filtres) =====
function renderPosts() {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;

    let filteredPosts = posts;

    if (currentFilter === 'following') {
        const followingIds = following.map(f => f.following_id);
        filteredPosts = filteredPosts.filter(p => followingIds.includes(p.user_id));
    } else if (currentFilter === 'saved') {
        filteredPosts = filteredPosts.filter(p => savedPosts.has(p.id));
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
        const timeAgo = timeSince(new Date(post.created_at));
        const likedClass = post.isLiked ? 'liked' : '';
        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'image') {
                mediaHtml = `<img src="${post.media_url}" alt="Post media">`;
            } else if (post.media_type === 'video') {
                mediaHtml = `<video src="${post.media_url}" controls></video>`;
            }
        }

        const authorName = post.author?.full_name || 'Anonyme';
        const roleBadge = post.author?.role ? `<span class="role-badge">${post.author.role}</span>` : '';
        const followButton = post.user_id !== currentProfile?.id 
            ? `<button class="follow-btn ${post.isFollowed ? 'following' : ''}" data-user-id="${post.user_id}" onclick="toggleFollow(this)">${post.isFollowed ? 'Abonné' : 'Suivre'}</button>`
            : '';

        const pinIcon = post.isSaved ? 'fas fa-star' : 'far fa-star';
        const pinText = post.isSaved ? 'Épinglé' : 'Épingler';

        html += `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.author?.avatar_url || 'img/user-default.jpg'}" alt="${authorName}">
                    <div class="post-author">
                        <h4>${authorName} ${roleBadge}</h4>
                        <small>@${post.author?.username || 'inconnu'} · ${timeAgo}</small>
                        ${followButton}
                    </div>
                    <div class="post-menu">
                        <button class="post-menu-btn" onclick="togglePostMenu(this)"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="post-menu-dropdown">
                            ${post.user_id === currentProfile?.id ? `<button onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                            ${post.user_id === currentProfile?.id ? `<button onclick="deletePost(${post.id})" class="delete"><i class="fas fa-trash-alt"></i> Supprimer</button>` : ''}
                            <button onclick="toggleSavePost(${post.id})"><i class="${pinIcon}"></i> ${pinText}</button>
                            <button onclick="hidePost(${post.id})"><i class="fas fa-eye-slash"></i> Masquer</button>
                            <button onclick="reportPost(${post.id})"><i class="fas fa-flag"></i> Signaler</button>
                        </div>
                    </div>
                </div>
                <div class="post-content">${post.content || ''}</div>
                ${post.media_url ? `<div class="post-media">${mediaHtml}</div>` : ''}
                <div class="post-stats">
                    <span onclick="showLikes(${post.id})"><i class="fas fa-heart"></i> ${post.likes?.[0]?.count || 0}</span>
                    <span onclick="scrollToComments(${post.id})"><i class="fas fa-comment"></i> ${post.comments?.[0]?.count || 0}</span>
                    <span><i class="fas fa-share"></i> ${post.shares?.[0]?.count || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="${likedClass}" onclick="likePost(${post.id})"><i class="fas fa-heart"></i> J'aime</button>
                    <button onclick="focusComment(${post.id})"><i class="fas fa-comment"></i> Commenter</button>
                    <button onclick="sharePost(${post.id})"><i class="fas fa-share"></i> Partager</button>
                </div>
                <div class="comments-section" id="comments-${post.id}"></div>
            </div>
        `;
    });
    feed.innerHTML = html;
    filteredPosts.forEach(post => loadComments(post.id));
}

// ===== CHARGEMENT DES COMMENTAIRES =====
async function loadComments(postId) {
    const { data, error } = await supabasePlayerPrive
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
        html += await renderComment(comment);
    }

    html += `
        <div class="add-comment">
            <img src="${currentProfile?.avatar_url || 'img/user-default.jpg'}">
            <input type="text" id="commentInput-${postId}" placeholder="Écrire un commentaire...">
            <button onclick="addComment(${postId})">Envoyer</button>
        </div>
    `;
    commentsDiv.innerHTML = html;
}

async function renderComment(comment) {
    const authorName = comment.author?.full_name || 'Anonyme';
    const timeAgo = timeSince(new Date(comment.created_at));
    const { data: replies, error } = await supabasePlayerPrive
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
            repliesHtml += await renderComment(reply);
        }
    }

    return `
        <div class="comment" data-comment-id="${comment.id}">
            <img src="${comment.author?.avatar_url || 'img/user-default.jpg'}" onclick="openUserProfile('${comment.author?.id}')">
            <div class="comment-content">
                <span class="comment-author" onclick="openUserProfile('${comment.author?.id}')">${authorName}</span>
                <span class="comment-text">${comment.content}</span>
                <small>${timeAgo}</small>
                <button class="reply-btn" onclick="openReplyModal(${comment.id}, '${authorName.replace(/'/g, "\\'")}', ${comment.post_id})"><i class="fas fa-reply"></i> Répondre</button>
            </div>
        </div>
        ${repliesHtml ? `<div class="comment-reply">${repliesHtml}</div>` : ''}
    `;
}

// ===== FONCTIONS UTILITAIRES =====
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

// ===== ACTIONS SUR LES POSTS =====
function togglePostMenu(btn) {
    const dropdown = btn.nextElementSibling;
    dropdown.classList.toggle('show');
    document.addEventListener('click', function closeMenu(e) {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeMenu);
        }
    });
}

async function likePost(postId) {
    const button = event.target.closest('button');
    button.disabled = true;
    try {
        if (likedPosts.has(postId)) {
            await supabasePlayerPrive
                .from('unified_likes')
                .delete()
                .eq('user_id', currentProfile.id)
                .eq('post_id', postId);
            likedPosts.delete(postId);
        } else {
            await supabasePlayerPrive
                .from('unified_likes')
                .insert({ user_id: currentProfile.id, post_id: postId });
            likedPosts.add(postId);
        }
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.disabled = false;
    }
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) return;
    const button = input.nextElementSibling;
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="button-spinner"></span>';
    try {
        await supabasePlayerPrive
            .from('unified_comments')
            .insert({
                user_id: currentProfile.id,
                post_id: postId,
                content: content
            });
        input.value = '';
        loadComments(postId);
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
        showToast('Commentaire ajouté', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function sharePost(postId) {
    const button = event.target.closest('button');
    button.disabled = true;
    try {
        const shareUrl = `${window.location.origin}/post.html?id=${postId}`;
        await navigator.clipboard.writeText(shareUrl);
        showToast('Lien copié ! Partagez-le à vos amis.', 'success');
        await supabasePlayerPrive
            .from('unified_shares')
            .insert({ user_id: currentProfile.id, post_id: postId });
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.disabled = false;
    }
}

function focusComment(postId) {
    document.getElementById(`commentInput-${postId}`).focus();
}

function scrollToComments(postId) {
    document.getElementById(`comments-${postId}`).scrollIntoView({ behavior: 'smooth' });
}

async function showLikes(postId) {
    const { data, error } = await supabasePlayerPrive
        .from('unified_likes')
        .select('user_id, author:profiles!user_id (id, full_name, avatar_url, username)')
        .eq('post_id', postId);

    if (error) {
        showToast('Erreur lors du chargement des likes', 'error');
        return;
    }

    const modal = document.getElementById('likesModal');
    const list = document.getElementById('likesList');
    list.innerHTML = data.map(like => {
        const name = like.author?.full_name || 'Anonyme';
        return `
        <li onclick="openUserProfile('${like.author?.id}')">
            <img src="${like.author?.avatar_url || 'img/user-default.jpg'}" alt="${name}">
            <span>${name}</span>
            <small>@${like.author?.username || ''}</small>
        </li>
    `}).join('');
    modal.style.display = 'block';
}

async function editPost(postId) {
    const post = posts.find(p => p.id === postId);
    const newContent = prompt('Modifier votre message :', post.content);
    if (newContent === null) return;
    const button = event.target.closest('button');
    button.disabled = true;
    try {
        await supabasePlayerPrive
            .from('unified_posts')
            .update({ content: newContent })
            .eq('id', postId);
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
        showToast('Post modifié', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.disabled = false;
    }
}

async function deletePost(postId) {
    if (!confirm('Supprimer ce post définitivement ?')) return;
    const button = event.target.closest('button');
    button.disabled = true;
    try {
        await supabasePlayerPrive
            .from('unified_posts')
            .delete()
            .eq('id', postId);
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
        showToast('Post supprimé', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.disabled = false;
    }
}

async function toggleSavePost(postId) {
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="button-spinner"></span>';
    button.disabled = true;
    try {
        if (savedPosts.has(postId)) {
            await supabasePlayerPrive
                .from('unified_saved')
                .delete()
                .eq('user_id', currentProfile.id)
                .eq('post_id', postId);
            savedPosts.delete(postId);
            showToast('Post retiré des favoris', 'info');
        } else {
            await supabasePlayerPrive
                .from('unified_saved')
                .insert({ user_id: currentProfile.id, post_id: postId });
            savedPosts.add(postId);
            showToast('Post épinglé', 'success');
        }
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function hidePost(postId) {
    if (!confirm('Masquer ce post ? Il ne sera plus visible dans votre fil.')) return;
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="button-spinner"></span>';
    button.disabled = true;
    try {
        await supabasePlayerPrive
            .from('unified_hidden')
            .insert({ user_id: currentProfile.id, post_id: postId });
        hiddenPosts.add(postId);
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
        showToast('Post masqué', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function unhidePost(postId) {
    if (!confirm('Voulez-vous réafficher ce post dans votre fil ?')) return;
    try {
        await supabasePlayerPrive
            .from('unified_hidden')
            .delete()
            .eq('user_id', currentProfile.id)
            .eq('post_id', postId);
        hiddenPosts.delete(postId);
        showToast('Post réaffiché', 'success');
        loadHiddenPosts();
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

async function reportPost(postId) {
    const reason = prompt('Pourquoi signalez-vous ce post ? (optionnel)');
    if (reason === null) return;
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="button-spinner"></span>';
    button.disabled = true;
    try {
        await supabasePlayerPrive
            .from('unified_reports')
            .insert({ user_id: currentProfile.id, post_id: postId, reason: reason || null });
        showToast('Merci, votre signalement a été enregistré.', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function toggleFollow(button) {
    const followedId = button.dataset.userId;
    const isFollowing = button.classList.contains('following');
    const originalText = button.textContent;
    button.innerHTML = '<span class="button-spinner"></span>';
    button.disabled = true;

    try {
        if (isFollowing) {
            await supabasePlayerPrive
                .from('unified_follows')
                .delete()
                .eq('follower_id', currentProfile.id)
                .eq('following_id', followedId);
        } else {
            await supabasePlayerPrive
                .from('unified_follows')
                .insert({ follower_id: currentProfile.id, following_id: followedId });
        }
        await loadFollowers();
        if (!showingHidden) {
            await loadPosts();
        }
        showToast(isFollowing ? 'Désabonné avec succès' : 'Abonné avec succès', 'success');
    } catch (error) {
        showToast('Erreur lors de l\'opération', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// ===== PROFIL UTILISATEUR =====
async function openUserProfile(userId) {
    selectedUserId = userId;
    const { data, error } = await supabasePlayerPrive
        .from('profiles')
        .select('full_name, avatar_url, username, bio')
        .eq('id', userId)
        .single();

    if (error) {
        showToast('Erreur lors du chargement du profil', 'error');
        return;
    }

    document.getElementById('profileName').textContent = data.full_name || 'Anonyme';
    document.getElementById('profileHubId').textContent = `@${data.username || ''}`;
    document.getElementById('profileAvatar').src = data.avatar_url || 'img/user-default.jpg';
    document.getElementById('profileBio').textContent = data.bio || '';
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

// ===== CRÉATION D'UN NOUVEAU POST (version corrigée) =====
async function createPost(content, file) {
    let mediaUrl = null;
    let mediaType = null;

    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
        const bucket = 'player-posts'; // ou 'parrain-posts' si bucket commun

        const { error: uploadError } = await supabasePlayerPrive.storage
            .from(bucket)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Erreur upload:', uploadError);
            showToast('Erreur lors de l\'upload : ' + uploadError.message, 'error');
            return;
        }

        const { data: urlData } = supabasePlayerPrive.storage
            .from(bucket)
            .getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
        mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    }

    const { error } = await supabasePlayerPrive
        .from('unified_posts')
        .insert({
            user_id: currentProfile.id,
            content: content,
            media_url: mediaUrl,
            media_type: mediaType
        });

    if (error) {
        showToast('Erreur publication : ' + error.message, 'error');
    } else {
        document.getElementById('postContent').value = '';
        document.getElementById('publishMediaPreview').innerHTML = '';
        document.getElementById('mediaInput').value = '';
        document.getElementById('mediaCancel').style.display = 'none';
        previewMedia = null;
        previewMediaType = null;
        if (showingHidden) {
            loadPosts();
        } else {
            loadPosts();
        }
        showToast('Publication réussie !', 'success');
    }
}

function openPreview() {
    const content = document.getElementById('postContent').value.trim();
    if (!content && !previewMedia) {
        showToast('Veuillez écrire quelque chose ou ajouter un média', 'warning');
        return;
    }
    document.getElementById('previewModal').classList.add('active');
    document.getElementById('previewAuthorName').textContent = currentProfile.full_name || 'Joueur';
    document.getElementById('previewAuthorAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    document.getElementById('previewText').textContent = content || '(aucun texte)';
    const previewMediaDiv = document.getElementById('previewMedia');
    if (previewMedia) {
        if (previewMediaType.startsWith('image/')) {
            previewMediaDiv.innerHTML = `<img src="${previewMedia}" alt="Aperçu">`;
        } else {
            previewMediaDiv.innerHTML = `<video src="${previewMedia}" controls></video>`;
        }
    } else {
        previewMediaDiv.innerHTML = '';
    }
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

async function publishFromPreview() {
    const content = document.getElementById('postContent').value.trim();
    closePreview();
    const publishBtn = document.getElementById('publishBtn');
    await withButtonSpinner(publishBtn, () => createPost(content, document.getElementById('mediaInput').files[0]));
}

// ===== GESTION DES MÉDIAS =====
function cancelMedia() {
    document.getElementById('mediaInput').value = '';
    document.getElementById('publishMediaPreview').innerHTML = '';
    document.getElementById('mediaCancel').style.display = 'none';
    previewMedia = null;
    previewMediaType = null;
}

// ===== RÉPONSE AUX COMMENTAIRES =====
function openReplyModal(commentId, authorName, postId) {
    replyParentId = commentId;
    document.getElementById('originalComment').innerHTML = `Répondre à ${authorName}`;
    document.getElementById('replyContent').value = '';
    document.getElementById('replyModal').style.display = 'block';
    document.getElementById('replyModal').dataset.postId = postId;
}

function closeReplyModal() {
    document.getElementById('replyModal').style.display = 'none';
    replyParentId = null;
}

async function sendReply() {
    const content = document.getElementById('replyContent').value.trim();
    if (!content) return;
    const postId = document.getElementById('replyModal').dataset.postId;
    const button = document.querySelector('.btn-send-reply');
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="button-spinner"></span>';
    try {
        await supabasePlayerPrive
            .from('unified_comments')
            .insert({
                user_id: currentProfile.id,
                post_id: postId,
                parent_id: replyParentId,
                content: content
            });
        closeReplyModal();
        loadComments(postId);
        if (showingHidden) {
            loadHiddenPosts();
        } else {
            loadPosts();
        }
        showToast('Réponse envoyée', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
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
    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const diff = touchEndX - touchStartX;

    if (diff > swipeThreshold && touchStartX < 50) {
        leftSidebar.classList.add('active');
        overlay.classList.add('active');
    } else if (diff < -swipeThreshold && touchStartX > window.innerWidth - 50) {
        rightSidebar.classList.add('active');
        overlay.classList.add('active');
    }
}

// Fermeture des sidebars
document.getElementById('closeLeftSidebar').addEventListener('click', () => {
    document.getElementById('leftSidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
});

document.getElementById('closeRightSidebar').addEventListener('click', () => {
    document.getElementById('rightSidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
});

document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('leftSidebar').classList.remove('active');
    document.getElementById('rightSidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
});

// Boutons pour ouvrir les sidebars
document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('leftSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
});

document.getElementById('rightSidebarToggle')?.addEventListener('click', () => {
    document.getElementById('rightSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
});

// ===== RENDU DE LA SIDEBAR DROITE =====
async function loadFollowers() {
    // Abonnés
    const { data: followersData } = await supabasePlayerPrive
        .from('unified_follows')
        .select('follower_id, follower:profiles!follower_id (id, full_name, avatar_url, username)')
        .eq('following_id', currentProfile.id);
    followers = followersData || [];
    const followersList = document.getElementById('followersList');
    followersList.innerHTML = followers.map(f => `
        <li onclick="openUserProfile('${f.follower_id}')">
            <img src="${f.follower?.avatar_url || 'img/user-default.jpg'}">
            <span>${f.follower?.full_name || 'Anonyme'}</span>
            <small>@${f.follower?.username || ''}</small>
        </li>
    `).join('');

    // Abonnements
    const { data: followingData } = await supabasePlayerPrive
        .from('unified_follows')
        .select('following_id, followed:profiles!following_id (id, full_name, avatar_url, username)')
        .eq('follower_id', currentProfile.id);
    following = followingData || [];
    const followingList = document.getElementById('followingList');
    followingList.innerHTML = following.map(f => `
        <li onclick="openUserProfile('${f.following_id}')">
            <img src="${f.followed?.avatar_url || 'img/user-default.jpg'}">
            <span>${f.followed?.full_name || 'Anonyme'}</span>
            <small>@${f.followed?.username || ''}</small>
        </li>
    `).join('');

    // Insights
    document.getElementById('insightReach').textContent = (followers.length * 10).toLocaleString();
    document.getElementById('insightEngagement').textContent = '12%';
    document.getElementById('insightNewFollowers').textContent = `+${Math.floor(Math.random() * 10)}`;

    // Suggestions
    const { data: suggestionsData } = await supabasePlayerPrive
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

    // Tendances
    const { data: trendsData } = await supabasePlayerPrive
        .from('unified_posts')
        .select('id, content, user_id')
        .order('created_at', { ascending: false })
        .limit(3);
    const trendsList = document.getElementById('trendsList');
    if (trendsList) {
        trendsList.innerHTML = (trendsData || []).map(t => `
            <li onclick="scrollToPost(${t.id})">
                <i class="fas fa-fire" style="color: var(--primary);"></i>
                <span>${t.content?.substring(0, 30)}...</span>
            </li>
        `).join('');
    }
}

function scrollToPost(postId) {
    const postElement = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ===== RECHERCHE ET FILTRES =====
function initSearchAndFilters() {
    const searchInput = document.getElementById('communitySearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            if (!showingHidden) {
                renderPosts();
            }
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            if (!showingHidden) {
                renderPosts();
            }
        });
    });

    // Filtres par rôle
    document.querySelectorAll('.role-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Implémenter filtrage si nécessaire
        });
    });
}

// ===== MENU UTILISATEUR =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');
    if (userMenu) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => {
            userDropdown.classList.remove('show');
        });
    }
}

// ===== DÉCONNEXION =====
function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabasePlayerPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== ÉDITION DU PROFIL =====
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;

    document.getElementById('editBio').value = currentProfile.bio || '';
    document.getElementById('editPhone').value = currentProfile.contact_info?.phone || '';
    document.getElementById('editEmail').value = currentProfile.contact_info?.email || '';
    document.getElementById('editCountry').value = currentProfile.contact_info?.country || '';
    document.getElementById('editAddress').value = currentProfile.contact_info?.address || '';

    const countrySelect = document.getElementById('editCountry');
    if (countrySelect.options.length <= 1) {
        const countries = [
            "Bénin", "Burkina Faso", "Burundi", "Cameroun", "Cap-Vert", "République centrafricaine", "Comores", "Congo",
            "République démocratique du Congo", "Côte d'Ivoire", "Djibouti", "Égypte", "Érythrée", "Eswatini", "Éthiopie",
            "Gabon", "Gambie", "Ghana", "Guinée", "Guinée-Bissau", "Guinée équatoriale", "Kenya", "Lesotho", "Liberia",
            "Libye", "Madagascar", "Malawi", "Mali", "Maroc", "Maurice", "Mauritanie", "Mozambique", "Namibie", "Niger",
            "Nigeria", "Ouganda", "Rwanda", "Sahara occidental", "Sao Tomé-et-Principe", "Sénégal", "Seychelles",
            "Sierra Leone", "Somalie", "Soudan", "Soudan du Sud", "Tanzanie", "Tchad", "Togo", "Tunisie", "Zambie",
            "Zimbabwe"
        ].sort();
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    }

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

    const updates = {};
    if (bio !== currentProfile.bio) updates.bio = bio;

    const contactInfo = { ...(currentProfile.contact_info || {}) };
    if (phone !== contactInfo.phone) contactInfo.phone = phone;
    if (email !== contactInfo.email) contactInfo.email = email;
    if (country !== contactInfo.country) contactInfo.country = country;
    if (address !== contactInfo.address) contactInfo.address = address;
    updates.contact_info = contactInfo;

    if (Object.keys(updates).length === 0) {
        closeEditProfileModal();
        return;
    }

    const saveBtn = document.querySelector('#editProfileForm button[type="submit"]');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="button-spinner"></span> Enregistrement...';

    try {
        const { error } = await supabasePlayerPrive
            .from('profiles')
            .update(updates)
            .eq('id', currentProfile.id);

        if (error) throw error;

        currentProfile = { ...currentProfile, ...updates };
        showToast('Profil mis à jour avec succès', 'success');
        closeEditProfileModal();
    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// ===== INDICATEUR DE NOUVEAUX POSTS =====
function showNewPostsIndicator() {
    const indicator = document.getElementById('newPostsIndicator');
    if (indicator) {
        document.getElementById('newPostsCount').textContent = newPostsCount;
        indicator.style.display = 'block';
    }
}

function hideNewPostsIndicator() {
    document.getElementById('newPostsIndicator').style.display = 'none';
    newPostsCount = 0;
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de feed.js (joueur, unifié)');

    const user = await checkSession();
    if (!user) return;

    showLoader(true);

    try {
        await loadProfile();
        await loadUserMetadata();
        await loadPosts();
        await loadFollowers();

        // Gestion de la publication
        document.getElementById('attachMediaBtn').addEventListener('click', () => {
            document.getElementById('mediaInput').click();
        });

        document.getElementById('mediaInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const preview = document.getElementById('publishMediaPreview');
            const url = URL.createObjectURL(file);
            if (file.type.startsWith('image/')) {
                preview.innerHTML = `<img src="${url}" alt="Aperçu">`;
            } else {
                preview.innerHTML = `<video src="${url}" controls></video>`;
            }
            previewMedia = url;
            previewMediaType = file.type;
            document.getElementById('mediaCancel').style.display = 'flex';
            document.getElementById('mediaFileName').textContent = file.name;
        });

        document.getElementById('previewPostBtn').addEventListener('click', openPreview);

        document.getElementById('schedulePostBtn').addEventListener('click', () => {
            showToast('Fonctionnalité de programmation bientôt disponible', 'info');
        });

        document.getElementById('publishBtn').addEventListener('click', async () => {
            const content = document.getElementById('postContent').value.trim();
            const file = document.getElementById('mediaInput').files[0];
            if (!content && !file) {
                showToast('Veuillez écrire quelque chose ou ajouter un média', 'warning');
                return;
            }
            await withButtonSpinner(document.getElementById('publishBtn'), () => createPost(content, file));
        });

        document.getElementById('mediaCancel').addEventListener('click', cancelMedia);

        // Lien vers les posts masqués (si présent)
        const hiddenLink = document.getElementById('showHiddenPosts');
        if (hiddenLink) {
            hiddenLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadHiddenPosts();
            });
        }

        // Retour au fil
        const backBtn = document.querySelector('#backToFeedBtn button');
        if (backBtn) {
            backBtn.addEventListener('click', loadPosts);
        }

        // Édition de profil
        document.getElementById('editProfileForm').addEventListener('submit', saveProfileChanges);

        initSearchAndFilters();
        initUserMenu();
        initLogout();

        // Realtime pour les nouvelles publications
        supabasePlayerPrive
            .channel('unified_posts_changes_player')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unified_posts' }, payload => {
                newPostsCount++;
                showNewPostsIndicator();
            })
            .subscribe();

        // Clic sur l'indicateur
        const indicator = document.getElementById('newPostsIndicator');
        if (indicator) {
            indicator.addEventListener('click', async () => {
                hideNewPostsIndicator();
                await loadPosts();
            });
        }

        document.getElementById('languageLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Changement de langue bientôt disponible', 'info');
        });

        console.log('✅ Initialisation terminée');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showToast('Erreur lors du chargement de la page', 'error');
    } finally {
        showLoader(false);
    }
});

// Rendre les fonctions globales
window.togglePostMenu = togglePostMenu;
window.likePost = likePost;
window.addComment = addComment;
window.sharePost = sharePost;
window.focusComment = focusComment;
window.showLikes = showLikes;
window.scrollToComments = scrollToComments;
window.editPost = editPost;
window.deletePost = deletePost;
window.toggleSavePost = toggleSavePost;
window.hidePost = hidePost;
window.reportPost = reportPost;
window.toggleFollow = toggleFollow;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfileChanges = saveProfileChanges;
window.openUserProfile = openUserProfile;
window.closeUserProfileModal = closeUserProfileModal;
window.sendMessageToUser = sendMessageToUser;
window.closeLikesModal = () => document.getElementById('likesModal').style.display = 'none';
window.openPreview = openPreview;
window.closePreview = closePreview;
window.publishFromPreview = publishFromPreview;
window.cancelMedia = cancelMedia;
window.openReplyModal = openReplyModal;
window.closeReplyModal = closeReplyModal;
window.sendReply = sendReply;
window.unhidePost = unhidePost;