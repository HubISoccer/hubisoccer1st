// ===== DONNÉES PAR DÉFAUT =====
const defaultPosts = [
    {
        id: 'post1',
        author: 'Koffi B. SOGLO',
        authorHandle: '@koffi_elite_229',
        authorAvatar: '../public/img/user-default.jpg',
        content: 'Superbe entraînement aujourd’hui ! Prêt pour le prochain match. 🔥⚽',
        media: null,
        date: new Date(Date.now() - 86400000).toISOString(),
        likes: 2,
        dislikes: 0,
        comments: [
            { id: 'c1', author: 'Moussa Diop', avatar: '../public/img/user-default.jpg', text: 'Bravo champion !', date: new Date(Date.now() - 3600000).toISOString() }
        ],
        shares: 2
    },
    {
        id: 'post2',
        author: 'Moussa Diop',
        authorHandle: '@moussa_diop',
        authorAvatar: '../public/img/user-default.jpg',
        content: 'Petite reprise vidéo de mon dernier but !',
        media: { type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        date: new Date(Date.now() - 172800000).toISOString(),
        likes: 1,
        dislikes: 0,
        comments: [],
        shares: 1
    }
];

// Initialisation localStorage
if (!localStorage.getItem('community_posts')) {
    localStorage.setItem('community_posts', JSON.stringify(defaultPosts));
}

// ===== ÉLÉMENTS DOM =====
const postsList = document.getElementById('postsList');
const commentsList = document.getElementById('commentsList');
const modal = document.getElementById('itemModal');
const modalTitle = document.getElementById('modalTitle');
const itemForm = document.getElementById('itemForm');
const itemType = document.getElementById('itemType');
const itemId = document.getElementById('itemId');
const dynamicFields = document.getElementById('dynamicFields');

// ===== FONCTIONS D'AFFICHAGE =====
function loadPosts() {
    const posts = JSON.parse(localStorage.getItem('community_posts')) || [];
    let html = '';
    posts.forEach((post, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${post.author}</strong> <small>${post.authorHandle}</small>
                    <div class="details">${post.content.substring(0, 100)}...</div>
                    <div class="meta">
                        <span><i class="fas fa-thumbs-up"></i> ${post.likes}</span>
                        <span><i class="fas fa-thumbs-down"></i> ${post.dislikes}</span>
                        <span><i class="fas fa-comment"></i> ${post.comments.length}</span>
                        <span><i class="fas fa-share"></i> ${post.shares}</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('post', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('post', ${index})"><i class="fas fa-trash"></i></button>
                    <button class="comments" onclick="viewComments(${index})" title="Voir les commentaires"><i class="fas fa-comments"></i></button>
                </div>
            </div>
        `;
    });
    postsList.innerHTML = html || '<p class="no-data">Aucun post.</p>';
}

function loadComments() {
    const posts = JSON.parse(localStorage.getItem('community_posts')) || [];
    let allComments = [];
    posts.forEach((post, postIndex) => {
        post.comments.forEach((comment, commentIndex) => {
            allComments.push({
                postId: post.id,
                postIndex: postIndex,
                commentIndex: commentIndex,
                comment: comment
            });
        });
    });
    let html = '';
    allComments.forEach((item, idx) => {
        html += `
            <div class="list-item" data-idx="${idx}">
                <div class="info">
                    <strong>${item.comment.author}</strong>
                    <div class="details">${item.comment.text}</div>
                    <small>Post: ${item.postId}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editComment(${item.postIndex}, ${item.commentIndex})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteComment(${item.postIndex}, ${item.commentIndex})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    commentsList.innerHTML = html || '<p class="no-data">Aucun commentaire.</p>';
}

// ===== OUVERTURE MODALE (AJOUT) =====
window.openModal = (type) => {
    itemType.value = type;
    itemId.value = '';
    let title = '';
    let fields = '';

    if (type === 'post') {
        title = 'Ajouter un post';
        fields = `
            <div class="form-group"><label>Auteur</label><input type="text" id="author" required></div>
            <div class="form-group"><label>Handle (ex: @koffi_elite)</label><input type="text" id="handle" required></div>
            <div class="form-group"><label>Avatar (chemin)</label><input type="text" id="avatar" value="../public/img/user-default.jpg" required></div>
            <div class="form-group"><label>Contenu</label><textarea id="content" rows="3" required></textarea></div>
            <div class="form-group"><label>Média (type:url, optionnel)</label><input type="text" id="media" placeholder="video:https://..."></div>
        `;
    } else if (type === 'comment') {
        title = 'Ajouter un commentaire';
        // Il faudrait choisir un post. Pour simplifier, on le fera via un select.
        const posts = JSON.parse(localStorage.getItem('community_posts')) || [];
        let options = '<option value="">Choisissez un post</option>';
        posts.forEach((p, i) => {
            options += `<option value="${i}">${p.author} : ${p.content.substring(0, 30)}...</option>`;
        });
        fields = `
            <div class="form-group"><label>Post</label><select id="postSelect" required>${options}</select></div>
            <div class="form-group"><label>Auteur</label><input type="text" id="commentAuthor" required></div>
            <div class="form-group"><label>Avatar (chemin)</label><input type="text" id="commentAvatar" value="../public/img/user-default.jpg" required></div>
            <div class="form-group"><label>Texte</label><textarea id="commentText" rows="3" required></textarea></div>
        `;
    }

    modalTitle.textContent = title;
    dynamicFields.innerHTML = fields;
    modal.classList.add('active');
};

// ===== ÉDITION POST =====
window.editItem = (type, index) => {
    if (type === 'post') {
        const posts = JSON.parse(localStorage.getItem('community_posts'));
        const post = posts[index];
        itemType.value = type;
        itemId.value = index;
        modalTitle.textContent = 'Modifier un post';
        dynamicFields.innerHTML = `
            <div class="form-group"><label>Auteur</label><input type="text" id="author" value="${post.author}" required></div>
            <div class="form-group"><label>Handle</label><input type="text" id="handle" value="${post.authorHandle}" required></div>
            <div class="form-group"><label>Avatar</label><input type="text" id="avatar" value="${post.authorAvatar}" required></div>
            <div class="form-group"><label>Contenu</label><textarea id="content" rows="3" required>${post.content}</textarea></div>
            <div class="form-group"><label>Média</label><input type="text" id="media" value="${post.media ? post.media.type + ':' + post.media.url : ''}"></div>
        `;
        modal.classList.add('active');
    }
};

// ===== ÉDITION COMMENTAIRE =====
window.editComment = (postIndex, commentIndex) => {
    const posts = JSON.parse(localStorage.getItem('community_posts'));
    const comment = posts[postIndex].comments[commentIndex];
    itemType.value = 'comment';
    itemId.value = JSON.stringify({postIndex, commentIndex});
    modalTitle.textContent = 'Modifier un commentaire';
    // On garde le select mais on pré-remplit avec le post
    const postsList = JSON.parse(localStorage.getItem('community_posts')) || [];
    let options = '<option value="">Choisissez un post</option>';
    postsList.forEach((p, i) => {
        options += `<option value="${i}" ${i === postIndex ? 'selected' : ''}>${p.author}</option>`;
    });
    dynamicFields.innerHTML = `
        <div class="form-group"><label>Post</label><select id="postSelect" required>${options}</select></div>
        <div class="form-group"><label>Auteur</label><input type="text" id="commentAuthor" value="${comment.author}" required></div>
        <div class="form-group"><label>Avatar</label><input type="text" id="commentAvatar" value="${comment.avatar}" required></div>
        <div class="form-group"><label>Texte</label><textarea id="commentText" rows="3" required>${comment.text}</textarea></div>
    `;
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deleteItem = (type, index) => {
    if (type === 'post') {
        if (!confirm('Supprimer ce post ?')) return;
        let posts = JSON.parse(localStorage.getItem('community_posts'));
        posts.splice(index, 1);
        localStorage.setItem('community_posts', JSON.stringify(posts));
        loadPosts();
        loadComments();
    }
};

window.deleteComment = (postIndex, commentIndex) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    let posts = JSON.parse(localStorage.getItem('community_posts'));
    posts[postIndex].comments.splice(commentIndex, 1);
    localStorage.setItem('community_posts', JSON.stringify(posts));
    loadComments();
};

// ===== GESTION DU FORMULAIRE =====
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = itemType.value;
    const id = itemId.value;

    if (type === 'post') {
        const author = document.getElementById('author').value;
        const handle = document.getElementById('handle').value;
        const avatar = document.getElementById('avatar').value;
        const content = document.getElementById('content').value;
        const mediaStr = document.getElementById('media').value;
        let media = null;
        if (mediaStr) {
            const parts = mediaStr.split(':');
            if (parts.length === 2) {
                media = { type: parts[0], url: parts[1] };
            }
        }
        const newPost = {
            id: id === '' ? 'post' + Date.now() : JSON.parse(localStorage.getItem('community_posts'))[id].id,
            author,
            authorHandle: handle,
            authorAvatar: avatar,
            content,
            media,
            date: new Date().toISOString(),
            likes: id === '' ? 0 : JSON.parse(localStorage.getItem('community_posts'))[id].likes,
            dislikes: id === '' ? 0 : JSON.parse(localStorage.getItem('community_posts'))[id].dislikes,
            comments: id === '' ? [] : JSON.parse(localStorage.getItem('community_posts'))[id].comments,
            shares: id === '' ? 0 : JSON.parse(localStorage.getItem('community_posts'))[id].shares
        };
        let posts = JSON.parse(localStorage.getItem('community_posts')) || [];
        if (id === '') {
            posts.push(newPost);
        } else {
            posts[id] = newPost;
        }
        localStorage.setItem('community_posts', JSON.stringify(posts));
    } else if (type === 'comment') {
        const postSelect = document.getElementById('postSelect');
        const postIndex = parseInt(postSelect.value);
        const author = document.getElementById('commentAuthor').value;
        const avatar = document.getElementById('commentAvatar').value;
        const text = document.getElementById('commentText').value;

        if (isNaN(postIndex)) {
            alert('Veuillez choisir un post');
            return;
        }

        let posts = JSON.parse(localStorage.getItem('community_posts'));
        if (!posts[postIndex]) return;

        let newComment;
        if (id === '') {
            // Ajout
            newComment = {
                id: Date.now().toString(),
                author,
                avatar,
                text,
                date: new Date().toISOString()
            };
            posts[postIndex].comments.push(newComment);
        } else {
            // Modification
            const ids = JSON.parse(id);
            newComment = {
                id: posts[ids.postIndex].comments[ids.commentIndex].id,
                author,
                avatar,
                text,
                date: new Date().toISOString()
            };
            posts[ids.postIndex].comments[ids.commentIndex] = newComment;
        }
        localStorage.setItem('community_posts', JSON.stringify(posts));
    }

    closeModal();
    loadPosts();
    loadComments();
});

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadPosts();
loadComments();

// Fonction pour visualiser les commentaires (optionnel)
window.viewComments = (postIndex) => {
    // On pourrait ouvrir une modale avec les commentaires, mais pour l'instant on se contente de les afficher dans la section commentaires
    alert('Les commentaires de ce post sont listés dans la section "Commentaires" ci-dessous.');
};