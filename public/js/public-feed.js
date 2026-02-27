// Données par défaut
const defaultPosts = [
    {
        id: 'post1',
        author: 'Koffi B. SOGLO',
        authorHandle: '@koffi_elite_229',
        authorAvatar: 'public/img/user-default.jpg', // Chemin depuis la racine
        content: 'Superbe entraînement aujourd’hui ! Prêt pour le prochain match. 🔥⚽',
        media: null,
        date: new Date(Date.now() - 86400000).toISOString(),
        likes: 2,
        dislikes: 0,
        comments: [
            { id: 'c1', author: 'Moussa Diop', avatar: 'public/img/user-default.jpg', text: 'Bravo champion !', date: new Date(Date.now() - 3600000).toISOString() }
        ],
        shares: 2
    },
    {
        id: 'post2',
        author: 'Moussa Diop',
        authorHandle: '@moussa_diop',
        authorAvatar: 'public/img/user-default.jpg',
        content: 'Petite reprise vidéo de mon dernier but !',
        media: { type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        date: new Date(Date.now() - 172800000).toISOString(),
        likes: 1,
        dislikes: 0,
        comments: [],
        shares: 1
    }
];

// Initialisation
if (!localStorage.getItem('community_posts')) {
    localStorage.setItem('community_posts', JSON.stringify(defaultPosts));
}

let commentCount = parseInt(localStorage.getItem('visitor_comment_count')) || 0;

function timeSince(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
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

function renderPosts() {
    const feed = document.getElementById('publicPostsFeed');
    const posts = JSON.parse(localStorage.getItem('community_posts')) || [];

    let html = '';
    posts.forEach(post => {
        const timeAgo = timeSince(post.date);
        let mediaHtml = '';
        if (post.media) {
            if (post.media.type === 'image') {
                mediaHtml = `<img src="${post.media.url}" alt="Post media">`;
            } else if (post.media.type === 'video') {
                if (post.media.url.includes('youtube.com') || post.media.url.includes('youtu.be')) {
                    mediaHtml = `<iframe src="${post.media.url}" frameborder="0" allowfullscreen></iframe>`;
                } else {
                    mediaHtml = `<video src="${post.media.url}" controls></video>`;
                }
            }
        }

        let commentsHtml = '';
        post.comments.forEach(comment => {
            const commentTime = timeSince(comment.date);
            commentsHtml += `
                <div class="comment">
                    <img src="${comment.avatar}" alt="${comment.author}">
                    <div class="comment-content">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-text">${comment.text}</span>
                        <small>${commentTime}</small>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${post.authorAvatar}" alt="${post.author}">
                    <div class="post-author">
                        <h4>${post.author}</h4>
                        <small>${post.authorHandle} · ${timeAgo}</small>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.media ? `<div class="post-media">${mediaHtml}</div>` : ''}
                <div class="post-stats">
                    <span><i class="fas fa-thumbs-up"></i> ${post.likes}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${post.dislikes}</span>
                    <span><i class="fas fa-comment"></i> ${post.comments.length}</span>
                    <span><i class="fas fa-share"></i> ${post.shares}</span>
                </div>
                <div class="post-actions">
                    <button class="like-btn" data-id="${post.id}"><i class="fas fa-thumbs-up"></i> J'aime</button>
                    <button class="dislike-btn" data-id="${post.id}"><i class="fas fa-thumbs-down"></i> Je n'aime pas</button>
                    <button class="comment-focus-btn" data-id="${post.id}"><i class="fas fa-comment"></i> Commenter</button>
                    <button class="share-btn" data-id="${post.id}"><i class="fas fa-share"></i> Partager</button>
                </div>
                <div class="comments-section">
                    ${commentsHtml}
                    ${commentCount >= 3 ? `
                        <div class="comment-limit-message">
                            <p>Vous avez atteint la limite de 3 commentaires. Pour continuer, veuillez vous inscrire.</p>
                            <a href="public/auth/login.html" class="btn-auth">Se connecter</a>
                            <a href="public/auth/signup.html" class="btn-auth gold">S'inscrire</a>
                        </div>
                    ` : `
                        <div class="add-comment">
                            <img src="public/img/user-default.jpg" alt="Visiteur">
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

// Fonctions de gestion des interactions
function likePost(postId) {
    const posts = JSON.parse(localStorage.getItem('community_posts'));
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.likes++;
        localStorage.setItem('community_posts', JSON.stringify(posts));
        renderPosts();
    }
}

function dislikePost(postId) {
    const posts = JSON.parse(localStorage.getItem('community_posts'));
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.dislikes++;
        localStorage.setItem('community_posts', JSON.stringify(posts));
        renderPosts();
    }
}

function addComment(postId, text) {
    const posts = JSON.parse(localStorage.getItem('community_posts'));
    const post = posts.find(p => p.id === postId);
    if (post && text.trim()) {
        const newComment = {
            id: Date.now().toString(),
            author: 'Visiteur',
            avatar: 'public/img/user-default.jpg',
            text: text,
            date: new Date().toISOString()
        };
        post.comments.push(newComment);
        localStorage.setItem('community_posts', JSON.stringify(posts));
        commentCount++;
        localStorage.setItem('visitor_comment_count', commentCount);
        renderPosts();
    }
}

function sharePost(postId) {
    const posts = JSON.parse(localStorage.getItem('community_posts'));
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.shares++;
        localStorage.setItem('community_posts', JSON.stringify(posts));
        renderPosts();
        const shareUrl = window.location.href + '?post=' + postId;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Lien de partage copié !');
        }).catch(() => {
            prompt('Copiez ce lien :', shareUrl);
        });
    }
}

// Écouteurs d'événements globaux
document.addEventListener('click', (e) => {
    const target = e.target;
    const likeBtn = target.closest('.like-btn');
    if (likeBtn) {
        likePost(likeBtn.dataset.id);
        return;
    }
    const dislikeBtn = target.closest('.dislike-btn');
    if (dislikeBtn) {
        dislikePost(dislikeBtn.dataset.id);
        return;
    }
    const commentFocusBtn = target.closest('.comment-focus-btn');
    if (commentFocusBtn) {
        const input = document.querySelector(`.comment-input[data-id="${commentFocusBtn.dataset.id}"]`);
        if (input) input.focus();
        return;
    }
    const sendComment = target.closest('.send-comment');
    if (sendComment) {
        const input = document.querySelector(`.comment-input[data-id="${sendComment.dataset.id}"]`);
        if (input) {
            addComment(sendComment.dataset.id, input.value);
            input.value = '';
        }
        return;
    }
    const shareBtn = target.closest('.share-btn');
    if (shareBtn) {
        sharePost(shareBtn.dataset.id);
    }
});

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    renderPosts();
});