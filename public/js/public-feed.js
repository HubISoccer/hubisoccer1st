// public/js/public-feed.js
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let commentCount = parseInt(localStorage.getItem('visitor_comment_count')) || 0;

async function loadPosts() {
    const feed = document.getElementById('publicPostsFeed');
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            users (nom),
            comments (
                id,
                user_id,
                content,
                created_at,
                parent_id,
                users (nom)
            )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

    if (error) {
        feed.innerHTML = '<p>Erreur chargement posts.</p>';
        return;
    }

    let html = '';
    for (const post of posts) {
        const commentsTree = buildCommentsTree(post.comments || []);
        html += `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="public/img/user-default.jpg" alt="Avatar">
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
                    <button class="like-btn" data-id="${post.id}"><i class="fas fa-thumbs-up"></i> J'aime</button>
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
                    <img src="public/img/user-default.jpg" alt="Avatar">
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
                    <img src="public/img/user-default.jpg" alt="Avatar">
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
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const newComment = {
        post_id: postId,
        user_id: user?.id || null,
        content: content,
        parent_id: parentId
    };
    const { error } = await supabaseClient.from('comments').insert([newComment]);
    if (error) {
        alert('Erreur : ' + error.message);
        return false;
    }
    if (!user) {
        commentCount++;
        localStorage.setItem('visitor_comment_count', commentCount);
    }
    loadPosts();
    return true;
}

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
    return `<div class="comment-limit-message"><p>Limite de 10 commentaires atteinte. <a href="public/auth/login.html">Connectez-vous</a> pour continuer.</p></div>`;
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

document.addEventListener('click', async (e) => {
    if (e.target.closest('.send-comment')) {
        const btn = e.target.closest('.send-comment');
        const input = document.querySelector(`.comment-input[data-id="${btn.dataset.id}"]`);
        if (input.value.trim()) {
            await addComment(btn.dataset.id, input.value.trim());
            input.value = '';
        }
    }
    // Gérer les réponses (similaire, à ajouter si besoin)
});

document.addEventListener('DOMContentLoaded', loadPosts);