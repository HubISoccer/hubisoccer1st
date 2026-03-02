// public/js/public-feed.js
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Gestion du compteur de commentaires pour les visiteurs
let commentCount = parseInt(localStorage.getItem('visitor_comment_count')) || 0;

// Pour l'instant, on simule un utilisateur connecté (ID 1) – à remplacer par une vraie auth plus tard
let currentUser = null; // Sera défini après connexion

// Fonction pour récupérer l'utilisateur courant (à implémenter avec Supabase Auth plus tard)
async function getCurrentUser() {
    // Simulation : on prend l'utilisateur avec ID 1 (admin test)
    const { data: user, error } = await supabaseClient
        .from('users')
        .select('id, nom')
        .eq('id', 1)
        .single();
    if (!error && user) {
        currentUser = user;
    }
}
getCurrentUser();

// ===== CHARGEMENT DES POSTS =====
async function loadPosts() {
    const feed = document.getElementById('publicPostsFeed');
    if (!feed) return;

    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            users (id, nom, avatar_url),
            comments (
                id,
                user_id,
                content,
                created_at,
                parent_id,
                users (id, nom, avatar_url)
            ),
            likes (user_id)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        feed.innerHTML = '<p>Erreur chargement posts.</p>';
        return;
    }

    let html = '';
    for (const post of posts) {
        const userLiked = currentUser ? post.likes.some(l => l.user_id === currentUser.id) : false;
        const commentsTree = buildCommentsTree(post.comments || []);
        html += `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${post.users?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="post-author">
                        <h4>${post.users?.nom || 'Anonyme'}</h4>
                        <small>${formatDate(post.created_at)}</small>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.media_url ? renderMedia(post.media_url) : ''}
                <div class="post-stats">
                    <span><i class="fas fa-thumbs-up"></i> ${post.likes_count || 0}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${post.dislikes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${countComments(post.comments)}</span>
                    <span><i class="fas fa-share"></i> ${post.shares || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="like-btn ${userLiked ? 'liked' : ''}" data-id="${post.id}"><i class="fas fa-thumbs-up"></i> J'aime</button>
                    <button class="dislike-btn" data-id="${post.id}"><i class="fas fa-thumbs-down"></i> Je n'aime pas</button>
                    <button class="share-btn" data-id="${post.id}"><i class="fas fa-share"></i> Partager</button>
                </div>
                <div class="comments-section">
                    ${renderComments(commentsTree, post.id)}
                    ${commentCount >= 10 ? renderLimitMessage() : renderAddComment(post.id)}
                </div>
            </div>
        `;
    }
    feed.innerHTML = html;
}

// ===== GESTION DES LIKES =====
async function toggleLike(postId) {
    if (!currentUser) {
        alert('Connectez-vous pour aimer ce post.');
        return;
    }
    try {
        const { error } = await supabaseClient.rpc('toggle_post_like', {
            p_post_id: postId,
            p_user_id: currentUser.id
        });
        if (error) throw error;
        loadPosts(); // Recharger les posts
    } catch (e) {
        console.error('Erreur like:', e);
        alert('Erreur : ' + e.message);
    }
}

// ===== GESTION DES DISLIKES =====
async function toggleDislike(postId) {
    if (!currentUser) {
        alert('Connectez-vous pour ne pas aimer ce post.');
        return;
    }
    try {
        const { error } = await supabaseClient.rpc('toggle_post_dislike', {
            p_post_id: postId,
            p_user_id: currentUser.id
        });
        if (error) throw error;
        loadPosts();
    } catch (e) {
        console.error('Erreur dislike:', e);
        alert('Erreur : ' + e.message);
    }
}

// ===== GESTION DES PARTAGES =====
async function sharePost(postId) {
    try {
        const { error } = await supabaseClient.rpc('increment_post_shares', {
            p_post_id: postId
        });
        if (error) throw error;
        const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Lien de partage copié !');
        loadPosts();
    } catch (e) {
        console.error('Erreur partage:', e);
        alert('Erreur : ' + e.message);
    }
}

// ===== GESTION DES COMMENTAIRES =====
function buildCommentsTree(comments) {
    const map = {}; const roots = [];
    comments.forEach(c => { c.replies = []; map[c.id] = c; });
    comments.forEach(c => {
        if (c.parent_id) map[c.parent_id]?.replies.push(c);
        else roots.push(c);
    });
    return roots;
}

function renderComments(comments, postId) {
    let html = '';
    comments.forEach(c => {
        html += `
            <div class="comment" data-id="${c.id}">
                <div class="comment-main">
                    <img src="${c.users?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="comment-content">
                        <span class="comment-author">${c.users?.nom || 'Anonyme'}</span>
                        <span class="comment-text">${c.content}</span>
                    </div>
                </div>
                <div class="comment-footer">
                    <button class="reply-btn" data-id="${c.id}" data-post="${postId}">Répondre</button>
                    <span class="reply-count">${c.replies?.length || 0} réponse(s)</span>
                </div>
                ${renderReplies(c.replies, postId)}
            </div>
        `;
    });
    return html;
}

function renderReplies(replies, postId) {
    if (!replies?.length) return '';
    let html = '<div class="comment-child">';
    replies.forEach(r => {
        html += `
            <div class="comment">
                <div class="comment-main">
                    <img src="${r.users?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="comment-content">
                        <span class="comment-author">${r.users?.nom || 'Anonyme'}</span>
                        <span class="comment-text">${r.content}</span>
                    </div>
                </div>
                <div class="comment-footer">
                    <button class="reply-btn" data-id="${r.id}" data-post="${postId}">Répondre</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

async function addComment(postId, content, parentId = null) {
    if (!content.trim()) return;
    const newComment = {
        post_id: postId,
        user_id: currentUser ? currentUser.id : null,
        content: content,
        parent_id: parentId
    };
    const { error } = await supabaseClient.from('comments').insert([newComment]);
    if (error) {
        console.error('Erreur ajout commentaire:', error);
        alert('Erreur : ' + error.message);
        return false;
    }
    if (!currentUser) {
        commentCount++;
        localStorage.setItem('visitor_comment_count', commentCount);
    }
    loadPosts();
    return true;
}

// ===== UTILITAIRES =====
function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return `il y a ${diff} secondes`;
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} minutes`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} heures`;
    return d.toLocaleDateString('fr-FR');
}

function countComments(comments) {
    if (!comments) return 0;
    let count = comments.length;
    comments.forEach(c => { if (c.replies) count += c.replies.length; });
    return count;
}

function renderMedia(media) {
    if (media?.type === 'image') return `<div class="post-media"><img src="${media.url}" alt="Post media"></div>`;
    if (media?.type === 'video') return `<div class="post-media"><video src="${media.url}" controls></video></div>`;
    return '';
}

function renderLimitMessage() {
    return `
        <div class="comment-limit-message">
            <p>Vous avez atteint la limite de 10 commentaires. Pour continuer, veuillez vous inscrire.</p>
            <a href="public/auth/login.html" class="btn-auth">Se connecter</a>
            <a href="public/auth/signup.html" class="btn-auth gold">S'inscrire</a>
        </div>
    `;
}

function renderAddComment(postId) {
    return `
        <div class="add-comment">
            <img src="public/img/user-default.jpg" alt="Visiteur">
            <input type="text" class="comment-input" data-id="${postId}" placeholder="Écrire un commentaire...">
            <button class="send-comment" data-id="${postId}">Envoyer</button>
        </div>
    `;
}

// ===== ÉVÉNEMENTS =====
document.addEventListener('click', async (e) => {
    // Like
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
        e.preventDefault();
        await toggleLike(likeBtn.dataset.id);
        return;
    }
    // Dislike
    const dislikeBtn = e.target.closest('.dislike-btn');
    if (dislikeBtn) {
        e.preventDefault();
        await toggleDislike(dislikeBtn.dataset.id);
        return;
    }
    // Share
    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        e.preventDefault();
        await sharePost(shareBtn.dataset.id);
        return;
    }
    // Répondre
    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn) {
        e.preventDefault();
        const parent = replyBtn.closest('.comment');
        const postId = replyBtn.dataset.post;
        const commentId = replyBtn.dataset.id;
        // Créer un formulaire de réponse
        const form = document.createElement('div');
        form.className = 'reply-form';
        form.innerHTML = `
            <input type="text" placeholder="Écrire une réponse...">
            <button data-post="${postId}" data-parent="${commentId}">Répondre</button>
        `;
        parent.appendChild(form);
        replyBtn.style.display = 'none';
        return;
    }
    // Envoyer une réponse
    const replyFormBtn = e.target.closest('.reply-form button');
    if (replyFormBtn) {
        e.preventDefault();
        const form = replyFormBtn.closest('.reply-form');
        const input = form.querySelector('input');
        const content = input.value.trim();
        if (content) {
            await addComment(replyFormBtn.dataset.post, content, replyFormBtn.dataset.parent);
            form.remove();
            // Rétablir le bouton "Répondre" (à améliorer)
        }
        return;
    }
    // Envoyer un commentaire principal
    const sendCommentBtn = e.target.closest('.send-comment');
    if (sendCommentBtn) {
        e.preventDefault();
        const input = document.querySelector(`.comment-input[data-id="${sendCommentBtn.dataset.id}"]`);
        if (input.value.trim()) {
            await addComment(sendCommentBtn.dataset.id, input.value.trim());
            input.value = '';
        }
        return;
    }
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', loadPosts);
