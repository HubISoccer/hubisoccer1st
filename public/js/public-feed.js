// Initialisation Supabase
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Gestion du compteur de commentaires pour les visiteurs
let commentCount = parseInt(localStorage.getItem('visitor_comment_count')) || 0;

// Fonction pour charger tous les posts
async function loadPosts() {
    const feed = document.getElementById('publicPostsFeed');
    
    // Charger les posts avec leurs commentaires et likes
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            comments (
                id,
                user_id,
                content,
                created_at,
                parent_id,
                users (nom, avatar_url)
            ),
            likes (user_id)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement posts:', error);
        feed.innerHTML = '<p>Erreur de chargement des posts.</p>';
        return;
    }

    let html = '';
    for (const post of posts) {
        // Construire l'arbre des commentaires
        const commentsTree = buildCommentsTree(post.comments || []);
        
        html += `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${post.user?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="post-author">
                        <h4>${post.user?.nom || 'Anonyme'}</h4>
                        <small>${formatDate(post.created_at)}</small>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.media_url ? renderMedia(post.media_url) : ''}
                <div class="post-stats">
                    <span><i class="fas fa-thumbs-up"></i> ${post.likes?.length || 0}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${post.dislikes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${countComments(post.comments)}</span>
                    <span><i class="fas fa-share"></i> ${post.shares || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="like-btn ${post.userLiked ? 'liked' : ''}" data-id="${post.id}"><i class="fas fa-thumbs-up"></i> J'aime</button>
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

// Fonction pour construire l'arbre des commentaires
function buildCommentsTree(comments) {
    const map = {};
    const roots = [];
    
    comments.forEach(comment => {
        comment.replies = [];
        map[comment.id] = comment;
    });
    
    comments.forEach(comment => {
        if (comment.parent_id) {
            map[comment.parent_id]?.replies.push(comment);
        } else {
            roots.push(comment);
        }
    });
    
    return roots;
}

// Fonction pour afficher les commentaires récursivement
function renderComments(comments, postId, level = 0) {
    let html = '';
    comments.forEach(comment => {
        html += `
            <div class="comment" data-id="${comment.id}">
                <div class="comment-main">
                    <img src="${comment.users?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="comment-content">
                        <span class="comment-author">${comment.users?.nom || 'Anonyme'}</span>
                        <span class="comment-text">${comment.content}</span>
                    </div>
                </div>
                <div class="comment-footer">
                    <button class="reply-btn" data-id="${comment.id}" data-post="${postId}">Répondre</button>
                    <button class="like-comment-btn" data-id="${comment.id}">J'aime</button>
                    <span class="reply-count">${comment.replies?.length || 0} réponse(s)</span>
                </div>
                ${renderReplies(comment.replies, postId, level + 1)}
            </div>
        `;
    });
    return html;
}

// Fonction pour afficher les réponses
function renderReplies(replies, postId, level) {
    if (!replies?.length) return '';
    let html = '<div class="comment-child">';
    replies.forEach(reply => {
        html += `
            <div class="comment" data-id="${reply.id}">
                <div class="comment-main">
                    <img src="${reply.users?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="comment-content">
                        <span class="comment-author">${reply.users?.nom || 'Anonyme'}</span>
                        <span class="comment-text">${reply.content}</span>
                    </div>
                </div>
                <div class="comment-footer">
                    <button class="reply-btn" data-id="${reply.id}" data-post="${postId}">Répondre</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

// Fonction pour ajouter un commentaire
async function addComment(postId, content, parentId = null) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const newComment = {
        post_id: postId,
        user_id: user?.id || null,
        content: content,
        parent_id: parentId
    };

    const { error } = await supabase
        .from('comments')
        .insert([newComment]);

    if (error) {
        console.error('Erreur ajout commentaire:', error);
        alert('Erreur lors de l\'ajout du commentaire.');
        return false;
    }

    if (!user) {
        commentCount++;
        localStorage.setItem('visitor_comment_count', commentCount);
    }

    loadPosts(); // Recharger les posts
    return true;
}

// Fonction pour gérer les likes
async function toggleLike(postId) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Connectez-vous pour aimer ce post.');
        return;
    }

    const { error } = await supabase
        .rpc('toggle_post_like', { p_post_id: postId, p_user_id: user.id });

    if (error) {
        console.error('Erreur like:', error);
    } else {
        loadPosts();
    }
}

// Fonction pour gérer les dislikes
async function toggleDislike(postId) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Connectez-vous pour ne pas aimer ce post.');
        return;
    }

    const { error } = await supabase
        .rpc('toggle_post_dislike', { p_post_id: postId, p_user_id: user.id });

    if (error) {
        console.error('Erreur dislike:', error);
    } else {
        loadPosts();
    }
}

// Fonction pour partager
async function sharePost(postId) {
    const { error } = await supabase
        .rpc('increment_post_shares', { p_post_id: postId });

    if (!error) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Lien de partage copié !');
        });
        loadPosts();
    }
}

// Utilitaires
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
    comments.forEach(c => {
        if (c.replies) count += c.replies.length;
    });
    return count;
}

function renderMedia(media) {
    if (media.type === 'image') {
        return `<div class="post-media"><img src="${media.url}" alt="Post media"></div>`;
    } else if (media.type === 'video') {
        return `<div class="post-media"><video src="${media.url}" controls></video></div>`;
    }
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

// Événements
document.addEventListener('click', async (e) => {
    // Like post
    if (e.target.closest('.like-btn')) {
        const btn = e.target.closest('.like-btn');
        await toggleLike(btn.dataset.id);
    }
    
    // Dislike post
    else if (e.target.closest('.dislike-btn')) {
        const btn = e.target.closest('.dislike-btn');
        await toggleDislike(btn.dataset.id);
    }
    
    // Partager
    else if (e.target.closest('.share-btn')) {
        const btn = e.target.closest('.share-btn');
        await sharePost(btn.dataset.id);
    }
    
    // Répondre
    else if (e.target.closest('.reply-btn')) {
        const btn = e.target.closest('.reply-btn');
        const postId = btn.dataset.post;
        const commentId = btn.dataset.id;
        const parent = btn.closest('.comment');
        const form = document.createElement('div');
        form.className = 'reply-form';
        form.innerHTML = `
            <input type="text" placeholder="Écrire une réponse...">
            <button data-post="${postId}" data-parent="${commentId}">Répondre</button>
        `;
        parent.appendChild(form);
        btn.style.display = 'none';
    }
    
    // Envoyer une réponse
    else if (e.target.closest('.reply-form button')) {
        const btn = e.target.closest('.reply-form button');
        const input = btn.previousElementSibling;
        const content = input.value.trim();
        if (content) {
            await addComment(btn.dataset.post, content, btn.dataset.parent);
        }
    }
    
    // Envoyer un commentaire principal
    else if (e.target.closest('.send-comment')) {
        const btn = e.target.closest('.send-comment');
        const input = document.querySelector(`.comment-input[data-id="${btn.dataset.id}"]`);
        const content = input.value.trim();
        if (content) {
            const success = await addComment(btn.dataset.id, content);
            if (success) input.value = '';
        }
    }
});

// Chargement initial
document.addEventListener('DOMContentLoaded', loadPosts);