// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null; // plus tard avec l'auth
let visitorCommentCount = parseInt(localStorage.getItem('visitorCommentCount')) || 0;

// Charger tous les posts avec leurs commentaires
async function loadPosts() {
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            comments (*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement posts:', error);
        return;
    }

    renderPosts(posts);
}

// Afficher les posts
function renderPosts(posts) {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;

    let html = '';
    posts.forEach(post => {
        const timeAgo = timeSince(new Date(post.created_at));
        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'image') {
                mediaHtml = `<img src="${post.media_url}" alt="media">`;
            } else if (post.media_type === 'youtube') {
                mediaHtml = `<iframe src="${post.media_url}" frameborder="0" allowfullscreen></iframe>`;
            } else if (post.media_type === 'video') {
                mediaHtml = `<video src="${post.media_url}" controls></video>`;
            }
        }

        // Commentaires
        let commentsHtml = '';
        post.comments.forEach(comment => {
            commentsHtml += renderComment(comment);
        });

        html += `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${post.author_avatar || 'public/img/user-default.jpg'}" alt="${post.author_name}">
                    <div class="post-author">
                        <h4>${post.author_name}</h4>
                        <small>${post.author_handle || ''} · ${timeAgo}</small>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.media_url ? `<div class="post-media">${mediaHtml}</div>` : ''}
                <div class="post-stats">
                    <span><i class="fas fa-thumbs-up"></i> ${post.likes_count}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${post.dislikes_count}</span>
                    <span><i class="fas fa-comment"></i> ${post.comments_count}</span>
                    <span><i class="fas fa-share"></i> ${post.shares_count}</span>
                </div>
                <div class="post-actions">
                    <button class="like-btn" data-id="${post.id}"><i class="fas fa-thumbs-up"></i> J'aime</button>
                    <button class="dislike-btn" data-id="${post.id}"><i class="fas fa-thumbs-down"></i> Je n'aime pas</button>
                    <button class="comment-focus-btn" data-id="${post.id}"><i class="fas fa-comment"></i> Commenter</button>
                    <button class="share-btn" data-id="${post.id}"><i class="fas fa-share"></i> Partager</button>
                </div>
                <div class="comments-section">
                    ${commentsHtml}
                    ${visitorCommentCount >= 3 && !currentUser ? `
                        <div class="comment-limit-message">
                            <p>Vous avez atteint la limite de 3 commentaires. Pour continuer, inscrivez-vous.</p>
                            <a href="public/auth/signup.html" class="btn-auth gold">S'inscrire</a>
                        </div>
                    ` : `
                        <div class="add-comment">
                            <img src="public/img/user-default.jpg" alt="visiteur">
                            <input type="text" class="comment-input" data-id="${post.id}" placeholder="Écrire un commentaire...">
                            <button class="send-comment" data-id="${post.id}">Envoyer</button>
                        </div>
                    `}
                </div>
            </div>
        `;
    });
    feed.innerHTML = html;
}

function renderComment(comment) {
    const timeAgo = timeSince(new Date(comment.created_at));
    return `
        <div class="comment" data-id="${comment.id}">
            <img src="${comment.author_avatar || 'public/img/user-default.jpg'}" alt="${comment.author_name}">
            <div class="comment-content">
                <span class="comment-author">${comment.author_name}</span>
                <span class="comment-text">${comment.content}</span>
                <small>${timeAgo}</small>
            </div>
        </div>
        <div class="comment-actions">
            <button class="reply-btn" data-comment-id="${comment.id}"><i class="fas fa-reply"></i> Répondre</button>
            <button class="like-comment-btn" data-comment-id="${comment.id}"><i class="fas fa-thumbs-up"></i> J'aime</button>
        </div>
        <div class="replies" id="replies-${comment.id}"></div>
    `;
}

// Fonctions d'interaction
async function likePost(postId) {
    const { data: post } = await supabaseClient
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

    await supabaseClient
        .from('posts')
        .update({ likes_count: (post.likes_count || 0) + 1 })
        .eq('id', postId);

    loadPosts(); // recharger
}

async function dislikePost(postId) {
    const { data: post } = await supabaseClient
        .from('posts')
        .select('dislikes_count')
        .eq('id', postId)
        .single();

    await supabaseClient
        .from('posts')
        .update({ dislikes_count: (post.dislikes_count || 0) + 1 })
        .eq('id', postId);

    loadPosts();
}

async function addComment(postId, text) {
    if (!text.trim()) return;
    if (visitorCommentCount >= 3 && !currentUser) {
        alert('Limite de 3 commentaires atteinte. Inscrivez-vous pour continuer.');
        return;
    }

    const newComment = {
        post_id: postId,
        author_name: 'Visiteur',
        author_avatar: 'public/img/user-default.jpg',
        content: text,
        created_at: new Date()
    };

    const { error } = await supabaseClient
        .from('comments')
        .insert([newComment]);

    if (error) {
        console.error('Erreur ajout commentaire:', error);
        return;
    }

    // Incrémenter le compteur de commentaires du post
    const { data: post } = await supabaseClient
        .from('posts')
        .select('comments_count')
        .eq('id', postId)
        .single();

    await supabaseClient
        .from('posts')
        .update({ comments_count: (post.comments_count || 0) + 1 })
        .eq('id', postId);

    if (!currentUser) {
        visitorCommentCount++;
        localStorage.setItem('visitorCommentCount', visitorCommentCount);
    }

    loadPosts();
}

async function sharePost(postId) {
    const { data: post } = await supabaseClient
        .from('posts')
        .select('shares_count')
        .eq('id', postId)
        .single();

    await supabaseClient
        .from('posts')
        .update({ shares_count: (post.shares_count || 0) + 1 })
        .eq('id', postId);

    // Copier le lien
    const url = `${window.location.origin}/hubisoccer1st/hub-community.html?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('Lien copié !');
    }).catch(() => {
        prompt('Copiez ce lien :', url);
    });

    loadPosts();
}

// Écouteurs d'événements
document.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
        likePost(likeBtn.dataset.id);
        return;
    }
    const dislikeBtn = e.target.closest('.dislike-btn');
    if (dislikeBtn) {
        dislikePost(dislikeBtn.dataset.id);
        return;
    }
    const commentFocus = e.target.closest('.comment-focus-btn');
    if (commentFocus) {
        const input = document.querySelector(`.comment-input[data-id="${commentFocus.dataset.id}"]`);
        if (input) input.focus();
        return;
    }
    const sendComment = e.target.closest('.send-comment');
    if (sendComment) {
        const input = document.querySelector(`.comment-input[data-id="${sendComment.dataset.id}"]`);
        if (input) {
            addComment(sendComment.dataset.id, input.value);
            input.value = '';
        }
        return;
    }
    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        sharePost(shareBtn.dataset.id);
        return;
    }
    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn) {
        openReplyModal(replyBtn.dataset.commentId);
    }
});

function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `il y a ${interval} jour${interval > 1 ? 's' : ''}`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `il y a ${interval} heure${interval > 1 ? 's' : ''}`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `il y a ${interval} minute${interval > 1 ? 's' : ''}`;
    return `il y a ${seconds} seconde${seconds > 1 ? 's' : ''}`;
}

// Pour les réponses (à implémenter plus tard si besoin)
let currentReplyCommentId = null;
function openReplyModal(commentId) {
    currentReplyCommentId = commentId;
    document.getElementById('replyModal').classList.add('active');
}
window.closeReplyModal = () => {
    document.getElementById('replyModal').classList.remove('active');
};
window.submitReply = () => {
    const text = document.getElementById('replyText').value;
    alert('Fonction de réponse à implémenter (nécessite une table replies)');
    closeReplyModal();
};

// Chargement initial
loadPosts();