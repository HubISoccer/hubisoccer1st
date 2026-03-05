// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseFeed = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let posts = [];
let followers = [];
let following = [];
let savedPosts = new Set();
let hiddenPosts = new Set();
let currentFilter = 'all';
let searchTerm = '';

// ===== SYSTÈME DE NOTIFICATION (TOAST) =====
function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ===== INDICATEURS DE CHARGEMENT =====
function showLoading(button) {
    button.classList.add('btn-loading');
    button.disabled = true;
}
function hideLoading(button) {
    button.classList.remove('btn-loading');
    button.disabled = false;
}
function showFeedLoading() {
    document.getElementById('feedLoading').style.display = 'flex';
}
function hideFeedLoading() {
    document.getElementById('feedLoading').style.display = 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    const { data: { session }, error } = await supabaseFeed.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    const { data, error } = await supabaseFeed
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (error) {
        console.error('Erreur chargement profil:', error);
        showToast('Erreur lors du chargement du profil', 'error', 'Oups !');
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = currentProfile.nom_complet || 'Joueur';
    document.getElementById('userAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    document.getElementById('publishAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    return currentProfile;
}

// ===== CHARGEMENT DES ÉPINGLES ET MASQUÉS =====
async function loadUserMetadata() {
    const { data: savedData } = await supabaseFeed
        .from('feed_saved')
        .select('post_id')
        .eq('player_id', currentProfile.id);
    savedPosts = new Set(savedData?.map(s => s.post_id) || []);

    const { data: hiddenData } = await supabaseFeed
        .from('feed_hidden')
        .select('post_id')
        .eq('player_id', currentProfile.id);
    hiddenPosts = new Set(hiddenData?.map(h => h.post_id) || []);
}

// ===== CHARGEMENT DES POSTS =====
async function loadPosts() {
    showFeedLoading();
    try {
        // Récupérer les posts
        const { data: postsData, error: postsError } = await supabaseFeed
            .from('feed_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        // Récupérer les profils des auteurs
        const playerIds = postsData.map(p => p.player_id).filter(Boolean);
        const { data: profilesData, error: profilesError } = await supabaseFeed
            .from('player_profiles')
            .select('id, nom_complet, avatar_url, hub_id')
            .in('id', playerIds);

        if (profilesError) throw profilesError;

        const profilesMap = {};
        (profilesData || []).forEach(p => profilesMap[p.id] = p);

        // Récupérer les compteurs
        const postsWithCounts = [];
        for (const post of postsData) {
            const { count: likesCount } = await supabaseFeed
                .from('feed_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

            const { count: commentsCount } = await supabaseFeed
                .from('feed_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

            const { count: sharesCount } = await supabaseFeed
                .from('feed_shares')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

            postsWithCounts.push({
                ...post,
                player: profilesMap[post.player_id] || null,
                likes: [{ count: likesCount || 0 }],
                comments: [{ count: commentsCount || 0 }],
                shares: [{ count: sharesCount || 0 }]
            });
        }

        // Filtrer les posts masqués
        const visiblePosts = postsWithCounts.filter(post => !hiddenPosts.has(post.id));

        // Récupérer les IDs des personnes suivies
        const { data: followingData } = await supabaseFeed
            .from('feed_follows')
            .select('followed_id')
            .eq('follower_id', currentProfile.id);
        const followingIds = followingData?.map(f => f.followed_id) || [];

        posts = visiblePosts.map(post => ({
            ...post,
            isFollowed: followingIds.includes(post.player_id),
            isSaved: savedPosts.has(post.id)
        }));

        renderPosts();
        posts.forEach(post => loadComments(post.id));
    } catch (error) {
        console.error('Erreur chargement posts:', error);
        showToast('Erreur lors du chargement des posts', 'error', 'Oups !');
    } finally {
        hideFeedLoading();
    }
}

// ===== RENDU DES POSTS =====
function renderPosts() {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;
    let html = '';
    posts.forEach(post => {
        const timeAgo = timeSince(new Date(post.created_at));
        const isLiked = false; // À implémenter plus tard
        const likedClass = isLiked ? 'liked' : '';
        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'image') {
                mediaHtml = `<img src="${post.media_url}" alt="Post media">`;
            } else if (post.media_type === 'video') {
                mediaHtml = `<video src="${post.media_url}" controls></video>`;
            }
        }

        const followButton = post.player_id !== currentProfile?.id 
            ? `<button class="follow-btn ${post.isFollowed ? 'following' : ''}" data-user-id="${post.player_id}" onclick="toggleFollow(this)">${post.isFollowed ? 'Abonné' : 'Suivre'}</button>`
            : '';

        const pinIcon = post.isSaved ? 'fas fa-star' : 'far fa-star';
        const pinText = post.isSaved ? 'Épinglé' : 'Épingler';

        html += `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.player?.avatar_url || 'img/user-default.jpg'}" alt="${post.player?.nom_complet}">
                    <div class="post-author">
                        <h4>${post.player?.nom_complet || 'Anonyme'}</h4>
                        <small>@${post.player?.hub_id || 'inconnu'} · ${timeAgo}</small>
                        ${followButton}
                    </div>
                    <div class="post-menu">
                        <button class="post-menu-btn" onclick="togglePostMenu(this)"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="post-menu-dropdown">
                            ${post.player_id === currentProfile?.id ? `<button onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                            ${post.player_id === currentProfile?.id ? `<button onclick="deletePost(${post.id})" class="delete"><i class="fas fa-trash-alt"></i> Supprimer</button>` : ''}
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
                    <span onclick="showComments(${post.id})"><i class="fas fa-comment"></i> ${post.comments?.[0]?.count || 0}</span>
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

// ===== CHARGEMENT DES COMMENTAIRES =====
async function loadComments(postId) {
    const { data, error } = await supabaseFeed
        .from('feed_comments')
        .select(`
            *,
            player:player_profiles!player_id (nom_complet, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur chargement commentaires:', error);
        return;
    }
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (!commentsDiv) return;
    let html = '';
    data.forEach(comment => {
        html += `
            <div class="comment">
                <img src="${comment.player?.avatar_url || 'img/user-default.jpg'}">
                <div class="comment-content">
                    <span class="comment-author">${comment.player?.nom_complet || 'Anonyme'}</span>
                    <span class="comment-text">${comment.content}</span>
                    <small>${timeSince(new Date(comment.created_at))}</small>
                </div>
            </div>
        `;
    });
    html += `
        <div class="add-comment">
            <img src="${currentProfile?.avatar_url || 'img/user-default.jpg'}">
            <input type="text" id="commentInput-${postId}" placeholder="Écrire un commentaire...">
            <button onclick="addComment(${postId})">Envoyer</button>
        </div>
    `;
    commentsDiv.innerHTML = html;
}

// ===== FONCTIONS UTILITAIRES =====
function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `il y a ${interval} ans`;
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `il y a ${interval} mois`;
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `il y a ${interval} jours`;
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `il y a ${interval} heures`;
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `il y a ${interval} minutes`;
    return `il y a ${Math.floor(seconds)} secondes`;
}

// ===== ACTIONS =====
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

async function toggleFollow(button) {
    showLoading(button);
    const followedId = parseInt(button.dataset.userId);
    const isFollowing = button.classList.contains('following');
    try {
        if (isFollowing) {
            await supabaseFeed
                .from('feed_follows')
                .delete()
                .eq('follower_id', currentProfile.id)
                .eq('followed_id', followedId);
            showToast('Vous ne suivez plus cet utilisateur', 'success', 'Désabonné');
        } else {
            await supabaseFeed
                .from('feed_follows')
                .insert({ follower_id: currentProfile.id, followed_id: followedId });
            showToast('Vous suivez maintenant cet utilisateur', 'success', 'Abonné');
        }
        await loadFollowers();
        await loadPosts();
    } catch (error) {
        showToast('Erreur lors de l\'opération', 'error', 'Oups !');
    } finally {
        hideLoading(button);
    }
}

async function toggleSavePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    try {
        if (savedPosts.has(postId)) {
            await supabaseFeed
                .from('feed_saved')
                .delete()
                .eq('player_id', currentProfile.id)
                .eq('post_id', postId);
            savedPosts.delete(postId);
            showToast('Post retiré des favoris', 'success', 'Favori');
        } else {
            await supabaseFeed
                .from('feed_saved')
                .insert({ player_id: currentProfile.id, post_id: postId });
            savedPosts.add(postId);
            showToast('Post ajouté aux favoris', 'success', 'Favori');
        }
        await loadPosts();
    } catch (error) {
        showToast('Erreur lors de l\'opération', 'error', 'Oups !');
    }
}

async function hidePost(postId) {
    if (!confirm('Masquer ce post ? Il ne sera plus visible dans votre fil.')) return;
    try {
        await supabaseFeed
            .from('feed_hidden')
            .insert({ player_id: currentProfile.id, post_id: postId });
        hiddenPosts.add(postId);
        showToast('Post masqué', 'success', 'Masqué');
        await loadPosts();
    } catch (error) {
        showToast('Erreur lors du masquage', 'error', 'Oups !');
    }
}

async function reportPost(postId) {
    const reason = prompt('Pourquoi signalez-vous ce post ? (optionnel)');
    try {
        await supabaseFeed
            .from('feed_reports')
            .insert({ reporter_id: currentProfile.id, post_id: postId, reason: reason || null });
        showToast('Signalement envoyé, merci', 'success', 'Signalé');
    } catch (error) {
        showToast('Erreur lors du signalement', 'error', 'Oups !');
    }
}

async function likePost(postId) {
    try {
        const { data: existing } = await supabaseFeed
            .from('feed_likes')
            .select()
            .eq('player_id', currentProfile.id)
            .eq('post_id', postId)
            .maybeSingle();

        if (existing) {
            await supabaseFeed.from('feed_likes').delete().eq('player_id', currentProfile.id).eq('post_id', postId);
        } else {
            await supabaseFeed.from('feed_likes').insert({ player_id: currentProfile.id, post_id: postId });
        }
        loadPosts();
    } catch (error) {
        showToast('Erreur lors du like', 'error', 'Oups !');
    }
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) return;
    try {
        await supabaseFeed.from('feed_comments').insert({
            player_id: currentProfile.id,
            post_id: postId,
            content: content
        });
        input.value = '';
        loadComments(postId);
        loadPosts();
        showToast('Commentaire ajouté', 'success');
    } catch (error) {
        showToast('Erreur lors de l\'ajout du commentaire', 'error', 'Oups !');
    }
}

async function sharePost(postId) {
    try {
        await supabaseFeed.from('feed_shares').insert({ player_id: currentProfile.id, post_id: postId });
        showToast('Post partagé !', 'success');
        loadPosts();
    } catch (error) {
        showToast('Erreur lors du partage', 'error', 'Oups !');
    }
}

function focusComment(postId) {
    document.getElementById(`commentInput-${postId}`).focus();
}

function showLikes(postId) {
    showToast('Fonctionnalité à venir : liste des likes', 'info');
}

function showComments(postId) {
    document.getElementById(`comments-${postId}`).scrollIntoView({ behavior: 'smooth' });
}

async function editPost(postId) {
    const post = posts.find(p => p.id === postId);
    const newContent = prompt('Modifier votre message :', post.content);
    if (newContent !== null) {
        try {
            await supabaseFeed.from('feed_posts').update({ content: newContent }).eq('id', postId);
            showToast('Post modifié', 'success');
            loadPosts();
        } catch (error) {
            showToast('Erreur lors de la modification', 'error', 'Oups !');
        }
    }
}

async function deletePost(postId) {
    if (!confirm('Supprimer ce post définitivement ?')) return;
    try {
        await supabaseFeed.from('feed_posts').delete().eq('id', postId);
        showToast('Post supprimé', 'success');
        loadPosts();
    } catch (error) {
        showToast('Erreur lors de la suppression', 'error', 'Oups !');
    }
}

// ===== CRÉATION D'UN NOUVEAU POST =====
async function createPost(content, file) {
    const publishBtn = document.getElementById('publishBtn');
    showLoading(publishBtn);
    try {
        let mediaUrl = null;
        let mediaType = null;
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
            const filePath = `posts/${fileName}`;
            const { error: uploadError } = await supabaseFeed.storage
                .from('media')
                .upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabaseFeed.storage.from('media').getPublicUrl(filePath);
            mediaUrl = urlData.publicUrl;
            mediaType = file.type.startsWith('image/') ? 'image' : 'video';
        }
        const { error } = await supabaseFeed.from('feed_posts').insert({
            player_id: currentProfile.id,
            content: content,
            media_url: mediaUrl,
            media_type: mediaType
        });
        if (error) throw error;
        showToast('Publication réussie !', 'success');
        document.getElementById('postContent').value = '';
        document.getElementById('publishMediaPreview').innerHTML = '';
        document.getElementById('mediaInput').value = '';
        loadPosts();
    } catch (error) {
        showToast('Erreur lors de la publication : ' + error.message, 'error', 'Oups !');
    } finally {
        hideLoading(publishBtn);
    }
}

// ===== FONCTION D'APERÇU AMÉLIORÉE =====
function previewPost() {
    const content = document.getElementById('postContent').value.trim();
    const file = document.getElementById('mediaInput').files[0];
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    let mediaHtml = '';
    if (file) {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('image/')) {
            mediaHtml = `<img src="${url}" alt="Aperçu">`;
        } else if (file.type.startsWith('video/')) {
            mediaHtml = `<video src="${url}" controls></video>`;
        }
    }
    modal.innerHTML = `
        <div class="preview-modal-content">
            <div class="preview-modal-header">
                <h3>Aperçu de votre publication</h3>
                <button class="close-preview" onclick="this.closest('.preview-modal').remove()"><i class="fas fa-times"></i></button>
            </div>
            <div class="preview-content">
                <p>${content || '(aucun texte)'}</p>
                ${mediaHtml ? `<div class="preview-media">${mediaHtml}</div>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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

// ===== RENDU DE LA SIDEBAR DROITE =====
async function loadFollowers() {
    const { data: followersData } = await supabaseFeed
        .from('feed_follows')
        .select('follower_id, player:player_profiles!follower_id (nom_complet, avatar_url, hub_id)')
        .eq('followed_id', currentProfile.id);
    followers = followersData || [];
    const followersList = document.getElementById('followersList');
    followersList.innerHTML = followers.map(f => `
        <li><img src="${f.player?.avatar_url || 'img/user-default.jpg'}"><span>${f.player?.nom_complet || 'Anonyme'}</span> <small>@${f.player?.hub_id || ''}</small></li>
    `).join('');

    const { data: followingData } = await supabaseFeed
        .from('feed_follows')
        .select('followed_id, player:player_profiles!followed_id (nom_complet, avatar_url, hub_id)')
        .eq('follower_id', currentProfile.id);
    following = followingData || [];
    const followingList = document.getElementById('followingList');
    followingList.innerHTML = following.map(f => `
        <li><img src="${f.player?.avatar_url || 'img/user-default.jpg'}"><span>${f.player?.nom_complet || 'Anonyme'}</span> <small>@${f.player?.hub_id || ''}</small></li>
    `).join('');

    document.getElementById('insightReach').textContent = (followers.length * 10).toLocaleString();
    document.getElementById('insightEngagement').textContent = '12%';
    document.getElementById('insightNewFollowers').textContent = `+${Math.floor(Math.random() * 10)}`;
}

// ===== RECHERCHE ET FILTRES =====
function initSearchAndFilters() {
    document.getElementById('communitySearch').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
        });
    });
}

// ===== MENU UTILISATEUR =====
function initUserMenu() {
    document.getElementById('userMenu').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('userDropdown').classList.toggle('show');
    });
    document.addEventListener('click', () => {
        document.getElementById('userDropdown').classList.remove('show');
    });
}

// ===== DÉCONNEXION =====
function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseFeed.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de feed.js');

    const user = await checkSession();
    if (!user) return;

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
        } else if (file.type.startsWith('video/')) {
            preview.innerHTML = `<video src="${url}" controls></video>`;
        }
    });

    document.getElementById('previewPostBtn').addEventListener('click', previewPost);
    document.getElementById('schedulePostBtn').addEventListener('click', () => {
        showToast('Fonctionnalité de programmation (simulation)', 'info');
    });
    document.getElementById('publishBtn').addEventListener('click', () => {
        const content = document.getElementById('postContent').value.trim();
        const file = document.getElementById('mediaInput').files[0];
        if (!content && !file) return;
        createPost(content, file);
    });

    initSearchAndFilters();
    initUserMenu();
    initLogout();

    // Realtime pour les nouvelles publications
    supabaseFeed
        .channel('feed_posts_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, payload => {
            loadPosts();
        })
        .subscribe();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});

// Rendre les fonctions globales
window.togglePostMenu = togglePostMenu;
window.likePost = likePost;
window.addComment = addComment;
window.sharePost = sharePost;
window.focusComment = focusComment;
window.showLikes = showLikes;
window.showComments = showComments;
window.editPost = editPost;
window.deletePost = deletePost;
window.toggleSavePost = toggleSavePost;
window.hidePost = hidePost;
window.reportPost = reportPost;
window.toggleFollow = toggleFollow;
window.editBio = () => showToast('Modification de la bio (simulation)', 'info');
window.editContact = () => showToast('Modification des coordonnées (simulation)', 'info');