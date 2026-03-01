// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const postsList = document.getElementById('postsList');
const commentsList = document.getElementById('commentsList');
const postModal = document.getElementById('postModal');
const modalTitle = document.getElementById('modalTitle');
const postForm = document.getElementById('postForm');
const postId = document.getElementById('postId');
const authorName = document.getElementById('authorName');
const authorHandle = document.getElementById('authorHandle');
const authorAvatar = document.getElementById('authorAvatar');
const content = document.getElementById('content');
const mediaUrl = document.getElementById('mediaUrl');
const mediaType = document.getElementById('mediaType');

// Charger les posts
async function loadPosts() {
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement posts:', error);
        postsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!posts || posts.length === 0) {
        postsList.innerHTML = '<p class="no-data">Aucun post.</p>';
        return;
    }

    let html = '';
    posts.forEach(p => {
        html += `
            <div class="list-item" data-id="${p.id}">
                <div class="info">
                    <strong>${p.author_name}</strong> ${p.author_handle ? `(${p.author_handle})` : ''}
                    <div class="details">
                        <span>${p.content.substring(0, 60)}...</span>
                    </div>
                    <div class="meta">
                        Likes: ${p.likes_count} | Dislikes: ${p.dislikes_count} | Commentaires: ${p.comments_count}
                    </div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editPost(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deletePost(${p.id})"><i class="fas fa-trash"></i></button>
                    <button class="view-comments" onclick="viewComments(${p.id})" title="Voir commentaires"><i class="fas fa-comments"></i></button>
                </div>
            </div>
        `;
    });
    postsList.innerHTML = html;
}

// Charger tous les commentaires (ou ceux d'un post spécifique)
async function loadComments(postId = null) {
    let query = supabaseClient
        .from('comments')
        .select('*, posts(author_name)')
        .order('created_at', { ascending: false });

    if (postId) {
        query = query.eq('post_id', postId);
    }

    const { data: comments, error } = await query;

    if (error) {
        console.error('Erreur chargement commentaires:', error);
        commentsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="no-data">Aucun commentaire.</p>';
        return;
    }

    let html = '';
    comments.forEach(c => {
        html += `
            <div class="list-item" data-id="${c.id}">
                <div class="info">
                    <strong>${c.author_name}</strong> sur le post de ${c.posts?.author_name || 'inconnu'}
                    <div class="details">${c.content}</div>
                    <small>${new Date(c.created_at).toLocaleString('fr-FR')}</small>
                </div>
                <div class="actions">
                    <button class="delete" onclick="deleteComment(${c.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    commentsList.innerHTML = html;
}

// Ouvrir modale ajout post
function openAddPostModal() {
    modalTitle.textContent = 'Ajouter un post';
    postId.value = '';
    authorName.value = '';
    authorHandle.value = '';
    authorAvatar.value = '../public/img/user-default.jpg';
    content.value = '';
    mediaUrl.value = '';
    mediaType.value = '';
    postModal.classList.add('active');
}

// Éditer un post
window.editPost = async (id) => {
    const { data: p, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur chargement post');
        return;
    }

    modalTitle.textContent = 'Modifier un post';
    postId.value = p.id;
    authorName.value = p.author_name;
    authorHandle.value = p.author_handle || '';
    authorAvatar.value = p.author_avatar || '../public/img/user-default.jpg';
    content.value = p.content;
    mediaUrl.value = p.media_url || '';
    mediaType.value = p.media_type || '';
    postModal.classList.add('active');
};

// Supprimer un post
window.deletePost = async (id) => {
    if (!confirm('Supprimer ce post ?')) return;
    const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('id', id);
    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadPosts();
        loadComments(); // recharger les commentaires
    }
};

// Voir les commentaires d'un post
window.viewComments = (postId) => {
    loadComments(postId);
    // Optionnel : faire défiler jusqu'à la section commentaires
};

// Supprimer un commentaire
window.deleteComment = async (id) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', id);
    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadComments();
    }
};

// Fermer modale
window.closeModal = () => {
    postModal.classList.remove('active');
};

// Soumission formulaire post
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = postId.value;
    const postData = {
        author_name: authorName.value,
        author_handle: authorHandle.value || null,
        author_avatar: authorAvatar.value,
        content: content.value,
        media_url: mediaUrl.value || null,
        media_type: mediaType.value || null,
        likes_count: 0,
        dislikes_count: 0,
        comments_count: 0,
        shares_count: 0
    };

    if (id === '') {
        // Ajout
        const { error } = await supabaseClient
            .from('posts')
            .insert([postData]);
        if (error) {
            alert('Erreur ajout : ' + error.message);
        } else {
            closeModal();
            loadPosts();
        }
    } else {
        // Modification
        const { error } = await supabaseClient
            .from('posts')
            .update(postData)
            .eq('id', id);
        if (error) {
            alert('Erreur modification : ' + error.message);
        } else {
            closeModal();
            loadPosts();
        }
    }
});

// Bouton ajout
document.getElementById('addPostBtn').addEventListener('click', openAddPostModal);

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadPosts();
loadComments();