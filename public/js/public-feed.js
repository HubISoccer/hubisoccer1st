// public/js/public-feed.js – Version finale avec commentaires et likes fonctionnels
console.log("✅ public-feed.js chargé");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Utiliser un ID fixe pour les visiteurs (à créer dans Supabase)
const VISITOR_ID = 9999;
let currentUser = null;

// Pour les commentaires, on garde un compteur par visiteur
let commentCount = parseInt(localStorage.getItem('visitor_comment_count')) || 0;

// Essayer de récupérer un utilisateur connecté (simulé pour l'instant)
async function getCurrentUser() {
    // On utilise le visiteur par défaut
    const { data: user, error } = await supabaseClient
        .from('users')
        .select('id, nom')
        .eq('id', VISITOR_ID)
        .single();
    if (!error && user) {
        currentUser = user;
        console.log("✅ Utilisateur visiteur actif");
    } else {
        console.error("❌ Utilisateur visiteur introuvable, exécutez la commande SQL");
    }
    loadPosts();
}
getCurrentUser();

// ===== CONSTRUCTION DE L'ARBRE DE COMMENTAIRES =====
function buildCommentsTree(comments) {
    const map = {};
    const roots = [];
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

function renderAddComment(postId) {
    return `
        <div class="add-comment">
            <img src="public/img/user-default.jpg" alt="Visiteur">
            <input type="text" class="comment-input" data-id="${postId}" placeholder="Écrire un commentaire...">
            <button class="send-comment" data-id="${postId}">Envoyer</button>
        </div>
    `;
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

async function addComment(postId, content, parentId = null) {
    if (!content.trim()) return false;
    const newComment = {
        post_id: postId,
        user_id: currentUser ? currentUser.id : VISITOR_ID,
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
        console.error("❌ Erreur chargement posts :", error);
        feed.innerHTML = '<p>Erreur de chargement des posts.</p>';
        return;
    }

    if (!posts.length) {
        feed.innerHTML = '<p>Aucun post pour le moment.</p>';
        return;
    }

    let html = '';
    posts.forEach(post => {
        const userLiked = post.likes.some(l => l.user_id == (currentUser ? currentUser.id : VISITOR_ID));
        const commentsTree = buildCommentsTree(post.comments || []);
        html += `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${post.users?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="post-author">
                        <h4>${post.users?.nom || 'Anonyme'}</h4>
                        <small>${new Date(post.created_at).toLocaleDateString('fr-FR')}</small>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-stats">
                    <span><i class="fas fa-thumbs-up"></i> ${post.likes_count || 0}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${post.dislikes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${countComments(post.comments)}</span>
                    <span><i class="fas fa-share"></i> ${post.shares || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="like-btn ${userLiked ? 'liked' : ''}" data-id="${post.id}" ${userLiked ? 'disabled' : ''}><i class="fas fa-thumbs-up"></i> J'aime</button>
                    <button class="dislike-btn" data-id="${post.id}"><i class="fas fa-thumbs-down"></i> Je n'aime pas</button>
                    <button class="share-btn" data-id="${post.id}"><i class="fas fa-share"></i> Partager</button>
                </div>
                <div class="comments-section">
                    ${renderComments(commentsTree, post.id)}
                    ${commentCount >= 10 ? renderLimitMessage() : renderAddComment(post.id)}
                </div>
            </div>
        `;
    });
    feed.innerHTML = html;
}

function countComments(comments) {
    if (!comments) return 0;
    let count = comments.length;
    comments.forEach(c => { if (c.replies) count += c.replies.length; });
    return count;
}

// ===== GESTION DES BOUTONS =====
document.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn && !likeBtn.disabled) {
        e.preventDefault();
        const postId = likeBtn.dataset.id;
        const userId = currentUser ? currentUser.id : VISITOR_ID;
        const { error } = await supabaseClient.rpc('add_post_like', { p_post_id: postId, p_user_id: userId });
        if (error) {
            console.error(error);
            alert('Erreur : ' + error.message);
        } else {
            loadPosts();
        }
        return;
    }

    const dislikeBtn = e.target.closest('.dislike-btn');
    if (dislikeBtn) {
        e.preventDefault();
        const postId = dislikeBtn.dataset.id;
        const { error } = await supabaseClient.rpc('add_post_dislike', { p_post_id: postId });
        if (error) {
            console.error(error);
            alert('Erreur : ' + error.message);
        } else {
            loadPosts();
        }
        return;
    }

    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        e.preventDefault();
        const postId = shareBtn.dataset.id;
        const { error } = await supabaseClient.rpc('increment_post_shares', { p_post_id: postId });
        if (!error) {
            navigator.clipboard?.writeText(window.location.href).then(() => alert('Lien copié !'));
            loadPosts();
        } else {
            alert('Erreur partage');
        }
        return;
    }

    // Répondre
    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn) {
        e.preventDefault();
        const parent = replyBtn.closest('.comment');
        const postId = replyBtn.dataset.post;
        const commentId = replyBtn.dataset.id;
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
            loadPosts();
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
loadPosts();
