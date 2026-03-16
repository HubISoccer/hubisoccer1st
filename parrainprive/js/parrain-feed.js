// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let posts = [];
let followers = [];
let following = [];
let savedPosts = new Set();      // IDs des posts épinglés
let hiddenPosts = new Set();     // IDs des posts masqués
let currentFilter = 'all';
let searchTerm = '';
let newPostsCount = 0;
let selectedUserId = null;       // Pour la modale de profil
let previewMedia = null;         // Pour l'aperçu avant publication
let previewMediaType = null;
let replyParentId = null;        // Pour la réponse à un commentaire

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
    const { data: { session }, error } = await supabaseParrainPrive.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    const { data, error } = await supabaseParrainPrive
        .from('parrain_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (error) {
        console.error('Erreur chargement profil:', error);
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = currentProfile.first_name + ' ' + currentProfile.last_name;
    document.getElementById('userAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    document.getElementById('publishAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
    return currentProfile;
}

// ===== CHARGEMENT DES ÉPINGLES ET MASQUÉS =====
async function loadUserMetadata() {
    const { data: savedData } = await supabaseParrainPrive
        .from('parrain_saved')
        .select('post_id')
        .eq('parrain_id', currentProfile.id);
    savedPosts = new Set(savedData?.map(s => s.post_id) || []);

    const { data: hiddenData } = await supabaseParrainPrive
        .from('parrain_hidden')
        .select('post_id')
        .eq('parrain_id', currentProfile.id);
    hiddenPosts = new Set(hiddenData?.map(h => h.post_id) || []);
}

// ===== CHARGEMENT DES POSTS (avec compteurs) =====
async function loadPosts() {
    try {
        const feedLoader = document.getElementById('feedLoader');
        if (feedLoader) feedLoader.style.display = 'flex';

        const { data: postsData, error: postsError } = await supabaseParrainPrive
            .from('parrain_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const authorIds = postsData.map(p => p.author_id).filter(Boolean);
        const { data: profilesData, error: profilesError } = await supabaseParrainPrive
            .from('parrain_profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', authorIds);

        if (profilesError) throw profilesError;

        const profilesMap = {};
        (profilesData || []).forEach(p => profilesMap[p.id] = p);

        const postsWithCounts = [];
        for (const post of postsData) {
            const { count: likesCount } = await supabaseParrainPrive
                .from('parrain_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            const { count: commentsCount } = await supabaseParrainPrive
                .from('parrain_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            const { count: sharesCount } = await supabaseParrainPrive
                .from('parrain_shares')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

            postsWithCounts.push({
                ...post,
                author: profilesMap[post.author_id] || null,
                likes: [{ count: likesCount || 0 }],
                comments: [{ count: commentsCount || 0 }],
                shares: [{ count: sharesCount || 0 }]
            });
        }

        const visiblePosts = postsWithCounts.filter(post => !hiddenPosts.has(post.id));

        const { data: followingData } = await supabaseParrainPrive
            .from('parrain_follows')
            .select('followed_id')
            .eq('follower_id', currentProfile.id);
        const followingIds = followingData?.map(f => f.followed_id) || [];

        posts = visiblePosts.map(post => ({
            ...post,
            isFollowed: followingIds.includes(post.author_id),
            isSaved: savedPosts.has(post.id)
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

// ===== RENDU DES POSTS =====
function renderPosts() {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;
    let html = '';
    posts.forEach(post => {
        const timeAgo = timeSince(new Date(post.created_at));
        const isLiked = false; // On pourrait le vérifier mais on laisse pour l'instant
        const likedClass = isLiked ? 'liked' : '';
        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'image') {
                mediaHtml = `<img src="${post.media_url}" alt="Post media">`;
            } else if (post.media_type === 'video') {
                mediaHtml = `<video src="${post.media_url}" controls></video>`;
            }
        }

        const authorName = post.author ? `${post.author.first_name} ${post.author.last_name}` : 'Anonyme';
        const followButton = post.author_id !== currentProfile?.id 
            ? `<button class="follow-btn ${post.isFollowed ? 'following' : ''}" data-user-id="${post.author_id}" onclick="toggleFollow(this)">${post.isFollowed ? 'Abonné' : 'Suivre'}</button>`
            : '';

        const pinIcon = post.isSaved ? 'fas fa-star' : 'far fa-star';
        const pinText = post.isSaved ? 'Épinglé' : 'Épingler';

        html += `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.author?.avatar_url || 'img/user-default.jpg'}" alt="${authorName}">
                    <div class="post-author">
                        <h4>${authorName} <span class="role-badge">Parrain</span></h4>
                        <small>@${post.author?.id || 'inconnu'} · ${timeAgo}</small>
                        ${followButton}
                    </div>
                    <div class="post-menu">
                        <button class="post-menu-btn" onclick="togglePostMenu(this)"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="post-menu-dropdown">
                            ${post.author_id === currentProfile?.id ? `<button onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                            ${post.author_id === currentProfile?.id ? `<button onclick="deletePost(${post.id})" class="delete"><i class="fas fa-trash-alt"></i> Supprimer</button>` : ''}
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
                <div class="comments-section" id="comments-${post.id}">
                    <!-- Les commentaires seront chargés dynamiquement -->
                </div>
            </div>
        `;
    });
    feed.innerHTML = html;
}

// ===== CHARGEMENT DES COMMENTAIRES (avec réponses) =====
async function loadComments(postId) {
    const { data, error } = await supabaseParrainPrive
        .from('parrain_comments')
        .select(`
            *,
            author:parrain_profiles!author_id (id, first_name, last_name, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)  // commentaires principaux
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur chargement commentaires:', error);
        return;
    }

    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (!commentsDiv) return;

    let html = '';
    for (const comment of data) {
        const commentHtml = await renderComment(comment);
        html += commentHtml;
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
    const authorName = comment.author ? `${comment.author.first_name} ${comment.author.last_name}` : 'Anonyme';
    const timeAgo = timeSince(new Date(comment.created_at));
    // Charger les réponses
    const { data: replies, error } = await supabaseParrainPrive
        .from('parrain_comments')
        .select(`
            *,
            author:parrain_profiles!author_id (id, first_name, last_name, avatar_url)
        `)
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true });

    let repliesHtml = '';
    if (replies && replies.length > 0) {
        for (const reply of replies) {
            repliesHtml += await renderComment(reply); // récursif pour les sous-réponses
        }
    }

    return `
        <div class="comment" data-comment-id="${comment.id}">
            <img src="${comment.author?.avatar_url || 'img/user-default.jpg'}" onclick="openUserProfile(${comment.author?.id})">
            <div class="comment-content">
                <span class="comment-author" onclick="openUserProfile(${comment.author?.id})">${authorName}</span>
                <span class="comment-text">${comment.content}</span>
                <small>${timeAgo}</small>
                <button class="reply-btn" onclick="openReplyModal(${comment.id}, '${authorName}', ${comment.post_id})"><i class="fas fa-reply"></i> Répondre</button>
            </div>
        </div>
        ${repliesHtml ? `<div class="comment-reply">${repliesHtml}</div>` : ''}
    `;
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
        const { data: existing } = await supabaseParrainPrive
            .from('parrain_likes')
            .select()
            .eq('parrain_id', currentProfile.id)
            .eq('post_id', postId)
            .maybeSingle();

        if (existing) {
            await supabaseParrainPrive.from('parrain_likes').delete().eq('parrain_id', currentProfile.id).eq('post_id', postId);
        } else {
            await supabaseParrainPrive.from('parrain_likes').insert({ parrain_id: currentProfile.id, post_id: postId });
        }
        loadPosts();
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
        await supabaseParrainPrive.from('parrain_comments').insert({
            author_id: currentProfile.id,
            post_id: postId,
            content: content
        });
        input.value = '';
        loadComments(postId);
        loadPosts(); // pour mettre à jour le compteur
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
        // Générer un lien de partage (ex: URL du post)
        const shareUrl = `${window.location.origin}/post.html?id=${postId}`; // à adapter
        await navigator.clipboard.writeText(shareUrl);
        showToast('Lien copié ! Partagez-le à vos amis.', 'success');
        // Optionnel : enregistrer le partage dans la table parrain_shares
        await supabaseParrainPrive.from('parrain_shares').insert({ parrain_id: currentProfile.id, post_id: postId });
        loadPosts();
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
    const { data, error } = await supabaseParrainPrive
        .from('parrain_likes')
        .select('parrain_id, author:parrain_profiles!parrain_id (id, first_name, last_name, avatar_url)')
        .eq('post_id', postId);

    if (error) {
        showToast('Erreur lors du chargement des likes', 'error');
        return;
    }

    const modal = document.getElementById('likesModal');
    const list = document.getElementById('likesList');
    list.innerHTML = data.map(like => {
        const name = like.author ? `${like.author.first_name} ${like.author.last_name}` : 'Anonyme';
        return `
        <li onclick="openUserProfile(${like.author?.id})">
            <img src="${like.author?.avatar_url || 'img/user-default.jpg'}" alt="${name}">
            <span>${name}</span>
            <small>@${like.author?.id}</small>
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
        await supabaseParrainPrive.from('parrain_posts').update({ content: newContent }).eq('id', postId);
        loadPosts();
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
        await supabaseParrainPrive.from('parrain_posts').delete().eq('id', postId);
        loadPosts();
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
            await supabaseParrainPrive
                .from('parrain_saved')
                .delete()
                .eq('parrain_id', currentProfile.id)
                .eq('post_id', postId);
            savedPosts.delete(postId);
            showToast('Post retiré des favoris', 'info');
        } else {
            await supabaseParrainPrive
                .from('parrain_saved')
                .insert({ parrain_id: currentProfile.id, post_id: postId });
            savedPosts.add(postId);
            showToast('Post épinglé', 'success');
        }
        loadPosts();
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
        await supabaseParrainPrive
            .from('parrain_hidden')
            .insert({ parrain_id: currentProfile.id, post_id: postId });
        hiddenPosts.add(postId);
        loadPosts();
        showToast('Post masqué', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
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
        await supabaseParrainPrive
            .from('parrain_reports')
            .insert({ reporter_id: currentProfile.id, post_id: postId, reason: reason || null });
        showToast('Merci, votre signalement a été enregistré.', 'success');
    } catch (error) {
        showToast('Erreur', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function toggleFollow(button) {
    const followedId = parseInt(button.dataset.userId);
    const isFollowing = button.classList.contains('following');
    const originalText = button.textContent;
    button.innerHTML = '<span class="button-spinner"></span>';
    button.disabled = true;

    try {
        if (isFollowing) {
            await supabaseParrainPrive
                .from('parrain_follows')
                .delete()
                .eq('follower_id', currentProfile.id)
                .eq('followed_id', followedId);
        } else {
            await supabaseParrainPrive
                .from('parrain_follows')
                .insert({ follower_id: currentProfile.id, followed_id: followedId });
        }
        await loadFollowers();
        await loadPosts();
        showToast(isFollowing ? 'Désabonné avec succès' : 'Abonné avec succès', 'success');
    } catch (error) {
        showToast('Erreur lors de l\'opération', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// ===== PROFIL UTILISATEUR (MODALE) =====
async function openUserProfile(userId) {
    selectedUserId = userId;
    const { data, error } = await supabaseParrainPrive
        .from('parrain_profiles')
        .select('first_name, last_name, avatar_url, bio')
        .eq('id', userId)
        .single();

    if (error) {
        showToast('Erreur lors du chargement du profil', 'error');
        return;
    }

    document.getElementById('profileName').textContent = `${data.first_name} ${data.last_name}`;
    document.getElementById('profileHubId').textContent = `@${userId}`;
    document.getElementById('profileAvatar').src = data.avatar_url || 'img/user-default.jpg';
    document.getElementById('profileBio').textContent = data.bio || 'Aucune bio renseignée.';
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

// ===== CRÉATION D'UN NOUVEAU POST AVEC APERÇU =====
async function createPost(content, file) {
    let mediaUrl = null;
    let mediaType = null;
    if (file) {
        // Upload avec progression
        const formData = new FormData();
        formData.append('file', file);
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
        const bucket = 'parrain-posts';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, true);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);

        const publishBtn = document.getElementById('publishBtn');
        const originalText = publishBtn.innerHTML;
        publishBtn.disabled = true;
        publishBtn.innerHTML = 'Upload 0%';

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                publishBtn.innerHTML = `Upload ${percent}%`;
            }
        });

        await new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve();
                } else {
                    reject(new Error('Upload failed'));
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
        });

        const { data: urlData } = supabaseParrainPrive.storage.from(bucket).getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
        mediaType = file.type.startsWith('image/') ? 'image' : 'video';

        publishBtn.innerHTML = originalText;
        publishBtn.disabled = false;
    }

    const { error } = await supabaseParrainPrive.from('parrain_posts').insert({
        author_id: currentProfile.id,
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
        loadPosts();
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
    document.getElementById('previewAuthorName').textContent = currentProfile.first_name + ' ' + currentProfile.last_name;
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
    // On stocke le postId dans un attribut data pour l'utiliser dans sendReply
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
        await supabaseParrainPrive.from('parrain_comments').insert({
            author_id: currentProfile.id,
            post_id: postId,
            parent_id: replyParentId,
            content: content
        });
        closeReplyModal();
        loadComments(postId);
        loadPosts();
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

document.getElementById('rightSidebarToggle').addEventListener('click', () => {
    document.getElementById('rightSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
});

// ===== RENDU DE LA SIDEBAR DROITE =====
async function loadFollowers() {
    const { data: followersData } = await supabaseParrainPrive
        .from('parrain_follows')
        .select('follower_id, author:parrain_profiles!follower_id (id, first_name, last_name, avatar_url)')
        .eq('followed_id', currentProfile.id);
    followers = followersData || [];
    const followersList = document.getElementById('followersList');
    followersList.innerHTML = followers.map(f => `
        <li onclick="openUserProfile(${f.follower_id})">
            <img src="${f.author?.avatar_url || 'img/user-default.jpg'}">
            <span>${f.author ? f.author.first_name + ' ' + f.author.last_name : 'Anonyme'}</span>
            <small>@${f.follower_id}</small>
        </li>
    `).join('');

    const { data: followingData } = await supabaseParrainPrive
        .from('parrain_follows')
        .select('followed_id, author:parrain_profiles!followed_id (id, first_name, last_name, avatar_url)')
        .eq('follower_id', currentProfile.id);
    following = followingData || [];
    const followingList = document.getElementById('followingList');
    followingList.innerHTML = following.map(f => `
        <li onclick="openUserProfile(${f.followed_id})">
            <img src="${f.author?.avatar_url || 'img/user-default.jpg'}">
            <span>${f.author ? f.author.first_name + ' ' + f.author.last_name : 'Anonyme'}</span>
            <small>@${f.followed_id}</small>
        </li>
    `).join('');

    document.getElementById('insightReach').textContent = (followers.length * 10).toLocaleString();
    document.getElementById('insightEngagement').textContent = '12%';
    document.getElementById('insightNewFollowers').textContent = `+${Math.floor(Math.random() * 10)}`;
}

// ===== RECHERCHE ET FILTRES =====
function initSearchAndFilters() {
    document.getElementById('communitySearch').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        // À implémenter : filtrage des membres dans la sidebar
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            // À implémenter : filtrage des posts par type d'auteur
            loadPosts();
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
            await supabaseParrainPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== ÉDITION DU PROFIL =====
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;

    document.getElementById('editBio').value = currentProfile.bio || '';
    document.getElementById('editPhone').value = currentProfile.phone || '';
    document.getElementById('editEmail').value = currentProfile.email || '';
    document.getElementById('editCountry').value = currentProfile.country || '';
    document.getElementById('editAddress').value = currentProfile.address || '';

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
    if (phone !== currentProfile.phone) updates.phone = phone;
    if (email !== currentProfile.email) updates.email = email;
    if (country !== currentProfile.country) updates.country = country;
    if (address !== currentProfile.address) updates.address = address;

    if (Object.keys(updates).length === 0) {
        closeEditProfileModal();
        return;
    }

    const saveBtn = document.querySelector('#editProfileForm button[type="submit"]');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="button-spinner"></span> Enregistrement...';

    try {
        const { error } = await supabaseParrainPrive
            .from('parrain_profiles')
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
    console.log('🚀 Initialisation de parrain-feed.js');

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

        // Édition de profil
        document.getElementById('editProfileForm').addEventListener('submit', saveProfileChanges);

        initSearchAndFilters();
        initUserMenu();
        initLogout();

        // Realtime pour les nouvelles publications
        supabaseParrainPrive
            .channel('parrain_posts_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parrain_posts' }, payload => {
                newPostsCount++;
                showNewPostsIndicator();
            })
            .subscribe();

        // Clic sur l'indicateur pour recharger
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

// Rendre les fonctions globales pour les appels onclick
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