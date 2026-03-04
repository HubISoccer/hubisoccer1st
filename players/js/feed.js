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
let savedPosts = new Set(); // IDs des posts épinglés
let hiddenPosts = new Set(); // IDs des posts masqués
let currentFilter = 'all';
let searchTerm = '';

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
    // Épinglés (feed_saved)
    const { data: savedData } = await supabaseFeed
        .from('feed_saved')
        .select('post_id')
        .eq('player_id', currentProfile.id);
    savedPosts = new Set(savedData?.map(s => s.post_id) || []);

    // Masqués (feed_hidden)
    const { data: hiddenData } = await supabaseFeed
        .from('feed_hidden')
        .select('post_id')
        .eq('player_id', currentProfile.id);
    hiddenPosts = new Set(hiddenData?.map(h => h.post_id) || []);
}

// ===== CHARGEMENT DES POSTS (avec compteurs et profils) =====
async function loadPosts() {
    // Récupérer les posts
    const { data: postsData, error: postsError } = await supabaseFeed
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (postsError) {
        console.error('Erreur chargement posts:', postsError);
        return;
    }

    // Récupérer les profils des auteurs
    const playerIds = postsData.map(p => p.player_id).filter(Boolean);
    const { data: profilesData, error: profilesError } = await supabaseFeed
        .from('player_profiles')
        .select('id, nom_complet, avatar_url, hub_id')
        .in('id', playerIds);

    if (profilesError) {
        console.error('Erreur chargement profils:', profilesError);
        return;
    }

    const profilesMap = {};
    (profilesData || []).forEach(p => profilesMap[p.id] = p);

    // Récupérer les compteurs pour chaque post
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

        // Icône et texte pour Épingler
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
                <div class="comments-section" id="comments-${post.id}">
                    <!-- Les commentaires seront chargés dynamiquement -->
                </div>
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

// ===== ACTIONS RÉELLES =====

// Follow / Unfollow (déjà présent)
async function toggleFollow(button) {
    const followedId = parseInt(button.dataset.userId);
    const isFollowing = button.classList.contains('following');

    if (isFollowing) {
        await supabaseFeed
            .from('feed_follows')
            .delete()
            .eq('follower_id', currentProfile.id)
            .eq('followed_id', followedId);
    } else {
        await supabaseFeed
            .from('feed_follows')
            .insert({ follower_id: currentProfile.id, followed_id: followedId });
    }
    await loadFollowers();
    await loadPosts();
}

// Épingler / Désépingler
async function toggleSavePost(postId) {
    if (savedPosts.has(postId)) {
        await supabaseFeed
            .from('feed_saved')
            .delete()
            .eq('player_id', currentProfile.id)
            .eq('post_id', postId);
        savedPosts.delete(postId);
    } else {
        await supabaseFeed
            .from('feed_saved')
            .insert({ player_id: currentProfile.id, post_id: postId });
        savedPosts.add(postId);
    }
    await loadPosts(); // Recharge pour mettre à jour l'icône
}

// Masquer un post
async function hidePost(postId) {
    if (confirm('Masquer ce post ? Il ne sera plus visible dans votre fil.')) {
        await supabaseFeed
            .from('feed_hidden')
            .insert({ player_id: currentProfile.id, post_id: postId });
        hiddenPosts.add(postId);
        await loadPosts(); // Recharge sans le post masqué
    }
}

// Signaler un post
async function reportPost(postId) {
    const reason = prompt('Pourquoi signalez-vous ce post ? (optionnel)');
    await supabaseFeed
        .from('feed_reports')
        .insert({ reporter_id: currentProfile.id, post_id: postId, reason: reason || null });
    alert('Merci, votre signalement a été enregistré.');
}

// ===== AUTRES ACTIONS SUR LES POSTS (inchangées) =====
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
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) return;
    await supabaseFeed.from('feed_comments').insert({
        player_id: currentProfile.id,
        post_id: postId,
        content: content
    });
    input.value = '';
    loadComments(postId);
    loadPosts();
}

async function sharePost(postId) {
    await supabaseFeed.from('feed_shares').insert({ player_id: currentProfile.id, post_id: postId });
    alert('Post partagé !');
    loadPosts();
}

function focusComment(postId) {
    document.getElementById(`commentInput-${postId}`).focus();
}

function showLikes(postId) {
    alert('Fonctionnalité à venir : liste des likes');
}

function showComments(postId) {
    document.getElementById(`comments-${postId}`).scrollIntoView({ behavior: 'smooth' });
}

function editPost(postId) {
    const post = posts.find(p => p.id === postId);
    const newContent = prompt('Modifier votre message :', post.content);
    if (newContent !== null) {
        supabaseFeed.from('feed_posts').update({ content: newContent }).eq('id', postId).then(() => loadPosts());
    }
}

function deletePost(postId) {
    if (confirm('Supprimer ce post définitivement ?')) {
        supabaseFeed.from('feed_posts').delete().eq('id', postId).then(() => loadPosts());
    }
}

// ===== CRÉATION D'UN NOUVEAU POST =====
async function createPost(content, file) {
    let mediaUrl = null;
    let mediaType = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
        const filePath = `posts/${fileName}`;
        const { error: uploadError } = await supabaseFeed.storage
            .from('media')
            .upload(filePath, file);
        if (uploadError) {
            alert('Erreur upload : ' + uploadError.message);
            return;
        }
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
    if (error) {
        alert('Erreur publication : ' + error.message);
    } else {
        document.getElementById('postContent').value = '';
        document.getElementById('publishMediaPreview').innerHTML = '';
        document.getElementById('mediaInput').value = '';
        loadPosts();
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
        // Implémentez le filtrage ici
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            // Implémentez le filtrage ici
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
    await loadUserMetadata(); // charge savedPosts et hiddenPosts
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

    document.getElementById('previewPostBtn').addEventListener('click', () => {
        const content = document.getElementById('postContent').value.trim();
        alert(`Aperçu : ${content || '(aucun texte)'}`);
    });

    document.getElementById('schedulePostBtn').addEventListener('click', () => {
        alert('Fonctionnalité de programmation (simulation).');
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
        alert('Changement de langue bientôt disponible');
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
window.editBio = () => alert('Modification de la bio (simulation)');
window.editContact = () => alert('Modification des coordonnées (simulation)');