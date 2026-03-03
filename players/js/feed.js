// ===== DONNÉES SIMULÉES =====
const currentUser = {
    uid: 'user123',
    name: 'Koffi B. SOGLO',
    handle: '@koffi_elite_229',
    avatar: 'img/user-default.jpg', // chemin relatif
    role: 'joueur',
    followers: 1200,
    following: 450,
    points: 1250
};

// Utilisateurs simulés
const users = [
    { uid: 'user456', name: 'Moussa Diop', handle: '@moussa_diop', avatar: 'img/user-default.jpg', role: 'joueur' },
    { uid: 'user789', name: 'Aminata Diallo', handle: '@amina_foot', avatar: 'img/user-default.jpg', role: 'joueur' },
    { uid: 'user101', name: 'Coach Mensah', handle: '@coach_mensah', avatar: 'img/user-default.jpg', role: 'coach' },
    { uid: 'user102', name: 'Académie Élite', handle: '@academie_elite', avatar: 'img/user-default.jpg', role: 'academie' },
    { uid: 'user103', name: 'Agent FIFA', handle: '@agent_fifa', avatar: 'img/user-default.jpg', role: 'agent' }
];

// Abonnés et abonnements (simulés)
const followers = users.slice(0, 3);
const following = users.slice(1, 4);

// Posts simulés
let posts = [ /* ... votre tableau de posts ... */ ]; // (identique à votre code)

// ===== FONCTIONS COMMUNES =====
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

    // Swipe droite depuis bord gauche
    if (diff > swipeThreshold && touchStartX < 50) {
        leftSidebar.classList.add('active');
        overlay.classList.add('active');
    }
    // Swipe gauche depuis bord droit
    else if (diff < -swipeThreshold && touchStartX > window.innerWidth - 50) {
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

// ===== RENDU DES SIDEBARS DROITE =====
function renderRightSidebar() {
    const followersList = document.getElementById('followersList');
    if (followersList) {
        followersList.innerHTML = followers.map(f => `
            <li><img src="${f.avatar}"><span>${f.name}</span> <small>${f.handle}</small></li>
        `).join('');
    }

    const followingList = document.getElementById('followingList');
    if (followingList) {
        followingList.innerHTML = following.map(f => `
            <li><img src="${f.avatar}"><span>${f.name}</span> <small>${f.handle}</small></li>
        `).join('');
    }
}

// ===== RENDU DES POSTS =====
function renderPosts() {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;
    let html = '';
    posts.forEach(post => {
        const timeAgo = timeSince(new Date(post.date));
        const likedClass = post.likes.includes(currentUser.uid) ? 'liked' : '';
        let mediaHtml = '';
        if (post.media) {
            if (post.media.type === 'image') {
                mediaHtml = `<img src="${post.media.url}" alt="Post media">`;
            } else if (post.media.type === 'video') {
                mediaHtml = `<video src="${post.media.url}" controls></video>`;
            }
        }

        let roleIcon = '';
        switch(post.role) {
            case 'joueur': roleIcon = '⚽'; break;
            case 'coach': roleIcon = '🧑‍🏫'; break;
            case 'agent': roleIcon = '💼'; break;
            case 'academie': roleIcon = '🏫'; break;
            default: roleIcon = '👤';
        }

        let commentsHtml = '';
        post.comments.forEach(comment => {
            commentsHtml += `
                <div class="comment">
                    <img src="${comment.avatar}">
                    <div class="comment-content">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-text">${comment.text}</span>
                        <small>${timeSince(new Date(comment.date))}</small>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <img src="${post.authorAvatar}" alt="${post.author}">
                    <div class="post-author">
                        <h4>${post.author} ${roleIcon}</h4>
                        <small>${post.authorHandle} · ${timeAgo}</small>
                    </div>
                    <div class="post-menu">
                        <button class="post-menu-btn" onclick="togglePostMenu(this)"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="post-menu-dropdown">
                            <button onclick="pinPost(${post.id})"><i class="fas fa-thumbtack"></i> Épingler</button>
                            <button onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Modifier</button>
                            <button onclick="hidePost(${post.id})"><i class="fas fa-eye-slash"></i> Masquer</button>
                            <button onclick="deletePost(${post.id})" class="delete"><i class="fas fa-trash-alt"></i> Supprimer</button>
                            <button onclick="blockUser('${post.uid}')"><i class="fas fa-ban"></i> Bloquer</button>
                            <button onclick="reportPost(${post.id})"><i class="fas fa-exclamation-triangle"></i> Signaler</button>
                            <button onclick="viewAnalytics(${post.id})"><i class="fas fa-chart-bar"></i> Analytics</button>
                        </div>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.media ? `<div class="post-media">${mediaHtml}</div>` : ''}
                <div class="post-stats">
                    <span onclick="showLikes(${post.id})"><i class="fas fa-thumbs-up"></i> ${post.likes.length}</span>
                    <span onclick="showDislikes(${post.id})"><i class="fas fa-thumbs-down"></i> ${post.dislikes.length}</span>
                    <span onclick="showComments(${post.id})"><i class="fas fa-comment"></i> ${post.comments.length}</span>
                    <span><i class="fas fa-share"></i> ${post.shares}</span>
                </div>
                <div class="post-actions">
                    <button class="${likedClass}" onclick="likePost(${post.id})"><i class="fas fa-thumbs-up"></i> J'aime</button>
                    <button onclick="focusComment(${post.id})"><i class="fas fa-comment"></i> Commenter</button>
                    <button onclick="sharePost(${post.id})"><i class="fas fa-share"></i> Partager</button>
                </div>
                <div class="comments-section" id="comments-${post.id}">
                    ${commentsHtml}
                    <div class="add-comment">
                        <img src="${currentUser.avatar}">
                        <input type="text" id="commentInput-${post.id}" placeholder="Écrire un commentaire...">
                        <button onclick="addComment(${post.id})">Envoyer</button>
                    </div>
                </div>
            </div>
        `;
    });
    feed.innerHTML = html;
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

function pinPost(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.pinned = !post.pinned;
        alert(`Post ${post.pinned ? 'épinglé' : 'désépinglé'} (simulation).`);
        renderPosts();
    }
}

function editPost(postId) {
    const post = posts.find(p => p.id === postId);
    const newContent = prompt('Modifier votre message :', post.content);
    if (newContent !== null) {
        post.content = newContent;
        renderPosts();
        alert('Post modifié (simulation).');
    }
}

function hidePost(postId) {
    if (confirm('Masquer ce post ?')) {
        posts = posts.filter(p => p.id !== postId);
        renderPosts();
    }
}

function deletePost(postId) {
    if (confirm('Supprimer ce post définitivement ?')) {
        posts = posts.filter(p => p.id !== postId);
        renderPosts();
    }
}

function blockUser(userId) {
    if (confirm('Bloquer cet utilisateur ?')) {
        posts = posts.filter(p => p.uid !== userId);
        renderPosts();
    }
}

function reportPost(postId) {
    alert('Post signalé à la modération (simulation).');
}

function viewAnalytics(postId) {
    const post = posts.find(p => p.id === postId);
    alert(`Analytics du post :\nLikes: ${post.likes.length}\nDislikes: ${post.dislikes.length}\nCommentaires: ${post.comments.length}\nPartages: ${post.shares}`);
}

function likePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        if (post.likes.includes(currentUser.uid)) {
            post.likes = post.likes.filter(id => id !== currentUser.uid);
        } else {
            post.likes.push(currentUser.uid);
            post.dislikes = post.dislikes.filter(id => id !== currentUser.uid);
        }
        renderPosts();
    }
}

function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    post.shares++;
    renderPosts();
    alert('Lien de partage copié ! (simulation)');
}

function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const text = input.value.trim();
    if (!text) return;
    const post = posts.find(p => p.id === postId);
    const newComment = {
        id: 'c' + Date.now(),
        uid: currentUser.uid,
        author: currentUser.name,
        avatar: currentUser.avatar,
        text: text,
        date: new Date().toISOString()
    };
    post.comments.push(newComment);
    input.value = '';
    renderPosts();
}

function focusComment(postId) {
    document.getElementById(`commentInput-${postId}`).focus();
}

function showLikes(postId) {
    const post = posts.find(p => p.id === postId);
    alert(`Personnes qui aiment : ${post.likes.length} (simulation)`);
}

function showDislikes(postId) {
    const post = posts.find(p => p.id === postId);
    alert(`Personnes qui n'aiment pas : ${post.dislikes.length} (simulation)`);
}

function showComments(postId) {
    document.getElementById(`comments-${postId}`).scrollIntoView({ behavior: 'smooth' });
}

// ===== GESTION DE LA PUBLICATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('feed.js chargé');

    // Attacher les événements après le chargement du DOM
    const attachMediaBtn = document.getElementById('attachMediaBtn');
    if (attachMediaBtn) {
        attachMediaBtn.addEventListener('click', () => {
            document.getElementById('mediaInput').click();
        });
    }

    const mediaInput = document.getElementById('mediaInput');
    if (mediaInput) {
        mediaInput.addEventListener('change', function(e) {
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
    }

    const previewPostBtn = document.getElementById('previewPostBtn');
    if (previewPostBtn) {
        previewPostBtn.addEventListener('click', () => {
            const content = document.getElementById('postContent').value.trim();
            alert(`Aperçu : ${content || '(aucun texte)'}`);
        });
    }

    const schedulePostBtn = document.getElementById('schedulePostBtn');
    if (schedulePostBtn) {
        schedulePostBtn.addEventListener('click', () => {
            alert('Fonctionnalité de programmation (simulation).');
        });
    }

    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => {
            const content = document.getElementById('postContent').value.trim();
            const mediaInput = document.getElementById('mediaInput');
            const file = mediaInput.files[0];
            if (!content && !file) return;
            let media = null;
            if (file) {
                const url = URL.createObjectURL(file);
                media = { type: file.type.startsWith('image/') ? 'image' : 'video', url };
            }
            const newPost = {
                id: posts.length + 1,
                uid: currentUser.uid,
                author: currentUser.name,
                authorHandle: currentUser.handle,
                authorAvatar: currentUser.avatar,
                role: currentUser.role,
                content: content,
                media: media,
                date: new Date().toISOString(),
                likes: [],
                dislikes: [],
                comments: [],
                shares: 0,
                pinned: false
            };
            posts.unshift(newPost);
            renderPosts();
            document.getElementById('postContent').value = '';
            document.getElementById('publishMediaPreview').innerHTML = '';
            mediaInput.value = '';
        });
    }

    // Recherche et filtres
    const communitySearch = document.getElementById('communitySearch');
    if (communitySearch) {
        communitySearch.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            console.log('Recherche :', search);
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            alert(`Filtre par : ${filter} (simulation)`);
        });
    });

    // Initial rendering
    renderPosts();
    renderRightSidebar();

    // Exposer les fonctions globales
    window.togglePostMenu = togglePostMenu;
    window.pinPost = pinPost;
    window.editPost = editPost;
    window.hidePost = hidePost;
    window.deletePost = deletePost;
    window.blockUser = blockUser;
    window.reportPost = reportPost;
    window.viewAnalytics = viewAnalytics;
    window.likePost = likePost;
    window.sharePost = sharePost;
    window.addComment = addComment;
    window.focusComment = focusComment;
    window.showLikes = showLikes;
    window.showDislikes = showDislikes;
    window.showComments = showComments;
    window.editBio = editBio;
    window.editContact = editContact;
});

// Fonctions pour la sidebar droite
function editBio() {
    alert('Modification de la bio (simulation).');
}

function editContact() {
    alert('Modification des informations de contact (simulation).');
}