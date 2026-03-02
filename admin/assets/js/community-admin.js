// ===== ADMIN COMMUNITY - GESTION DES POSTS ET COMMENTAIRES =====

// Vérification que le CDN Supabase est chargé
if (typeof window.supabase === 'undefined') {
    console.error('❌ ERREUR CRITIQUE : Le CDN Supabase n\'est pas chargé. Vérifiez que la balise <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> est présente dans le HTML avant ce script.');
} else {
    console.log('✅ CDN Supabase chargé avec succès.');
}

// Configuration Supabase
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';

// Création du client (en utilisant la variable globale window.supabase)
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Test rapide de connexion (optionnel)
(async () => {
    try {
        const { error } = await supabaseClient.from('posts').select('id').limit(1);
        if (error) throw error;
        console.log('✅ Connexion à Supabase établie.');
    } catch (e) {
        console.error('❌ Échec de connexion à Supabase :', e.message);
    }
})();

// Éléments DOM
const postsList = document.getElementById('postsList');
const commentsList = document.getElementById('commentsList');
const modal = document.getElementById('itemModal');
const modalTitle = document.getElementById('modalTitle');
const itemForm = document.getElementById('itemForm');
const itemType = document.getElementById('itemType');
const itemId = document.getElementById('itemId');
const dynamicFields = document.getElementById('dynamicFields');

// ===== CHARGEMENT DES POSTS =====
async function loadPosts() {
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            users (nom),
            comments (count)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement posts:', error);
        postsList.innerHTML = '<p class="no-data">Erreur de chargement : ' + error.message + '</p>';
        return;
    }

    let html = '';
    posts.forEach((post) => {
        html += `
            <div class="list-item" data-id="${post.id}">
                <div class="info">
                    <strong>${post.users?.nom || 'Anonyme'}</strong>
                    <div class="details">${post.content.substring(0, 100)}...</div>
                    <div class="meta">
                        <span><i class="fas fa-thumbs-up"></i> ${post.likes_count || 0}</span>
                        <span><i class="fas fa-comment"></i> ${post.comments?.length || 0}</span>
                        <span><i class="fas fa-share"></i> ${post.shares || 0}</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editPost('${post.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deletePost('${post.id}')"><i class="fas fa-trash"></i></button>
                    <button class="comments" onclick="viewComments('${post.id}')" title="Voir les commentaires"><i class="fas fa-comments"></i></button>
                </div>
            </div>
        `;
    });
    postsList.innerHTML = html || '<p class="no-data">Aucun post.</p>';
}

// ===== CHARGEMENT DES COMMENTAIRES =====
async function loadComments() {
    const { data: comments, error } = await supabaseClient
        .from('comments')
        .select(`
            *,
            users (nom),
            posts (id, content)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement commentaires:', error);
        commentsList.innerHTML = '<p class="no-data">Erreur de chargement : ' + error.message + '</p>';
        return;
    }

    let html = '';
    comments.forEach((comment) => {
        html += `
            <div class="list-item" data-id="${comment.id}">
                <div class="info">
                    <strong>${comment.users?.nom || 'Anonyme'}</strong>
                    <div class="details">${comment.content}</div>
                    <small>Post: ${comment.posts?.content?.substring(0, 50)}...</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editComment('${comment.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteComment('${comment.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    commentsList.innerHTML = html || '<p class="no-data">Aucun commentaire.</p>';
}

// ===== OUVERTURE MODALE AJOUT POST =====
function openAddPostModal() {
    itemType.value = 'post';
    itemId.value = '';
    modalTitle.textContent = 'Ajouter un post';
    dynamicFields.innerHTML = `
        <div class="form-group"><label>Auteur (ID utilisateur)</label><input type="number" id="userId" required></div>
        <div class="form-group"><label>Contenu</label><textarea id="content" rows="4" required></textarea></div>
        <div class="form-group"><label>Média (JSON, optionnel)</label><input type="text" id="media" placeholder='{"type":"image","url":"..."}'></div>
    `;
    modal.classList.add('active');
}

// ===== OUVERTURE MODALE AJOUT COMMENTAIRE =====
function openAddCommentModal() {
    itemType.value = 'comment';
    itemId.value = '';
    modalTitle.textContent = 'Ajouter un commentaire';
    dynamicFields.innerHTML = `
        <div class="form-group"><label>Post ID</label><input type="number" id="postId" required></div>
        <div class="form-group"><label>Auteur (ID utilisateur)</label><input type="number" id="userId" required></div>
        <div class="form-group"><label>Contenu</label><textarea id="content" rows="3" required></textarea></div>
        <div class="form-group"><label>Parent ID (pour répondre)</label><input type="number" id="parentId" placeholder="Optionnel"></div>
    `;
    modal.classList.add('active');
}

// ===== ÉDITION POST =====
window.editPost = async (postId) => {
    const { data: post, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (error) {
        console.error('Erreur chargement post:', error);
        return;
    }

    itemType.value = 'post';
    itemId.value = postId;
    modalTitle.textContent = 'Modifier un post';
    dynamicFields.innerHTML = `
        <div class="form-group"><label>Auteur (ID utilisateur)</label><input type="number" id="userId" value="${post.user_id}" required></div>
        <div class="form-group"><label>Contenu</label><textarea id="content" rows="4" required>${post.content}</textarea></div>
        <div class="form-group"><label>Média (JSON)</label><input type="text" id="media" value='${JSON.stringify(post.media_url) || ''}'></div>
    `;
    modal.classList.add('active');
};

// ===== ÉDITION COMMENTAIRE =====
window.editComment = async (commentId) => {
    const { data: comment, error } = await supabaseClient
        .from('comments')
        .select('*')
        .eq('id', commentId)
        .single();

    if (error) {
        console.error('Erreur chargement commentaire:', error);
        return;
    }

    itemType.value = 'comment';
    itemId.value = commentId;
    modalTitle.textContent = 'Modifier un commentaire';
    dynamicFields.innerHTML = `
        <div class="form-group"><label>Post ID</label><input type="number" id="postId" value="${comment.post_id}" required></div>
        <div class="form-group"><label>Auteur (ID utilisateur)</label><input type="number" id="userId" value="${comment.user_id}" required></div>
        <div class="form-group"><label>Contenu</label><textarea id="content" rows="3" required>${comment.content}</textarea></div>
        <div class="form-group"><label>Parent ID</label><input type="number" id="parentId" value="${comment.parent_id || ''}"></div>
    `;
    modal.classList.add('active');
};

// ===== SUPPRESSION =====
window.deletePost = async (postId) => {
    if (!confirm('Supprimer ce post et tous ses commentaires ?')) return;
    const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('id', postId);
    if (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur : ' + error.message);
    } else {
        loadPosts();
    }
};

window.deleteComment = async (commentId) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', commentId);
    if (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur : ' + error.message);
    } else {
        loadComments();
    }
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== GESTION DU FORMULAIRE =====
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = itemType.value;
    const id = itemId.value;
    const userId = document.getElementById('userId')?.value;
    const content = document.getElementById('content')?.value;

    if (type === 'post') {
        const media = document.getElementById('media')?.value;
        let mediaUrl = null;
        if (media && media.trim() !== '') {
            try {
                mediaUrl = JSON.parse(media);
            } catch (parseError) {
                alert('Le format JSON du média est invalide.');
                return;
            }
        }

        if (id === '') {
            // Ajout
            const { error } = await supabaseClient
                .from('posts')
                .insert([{
                    user_id: userId,
                    content: content,
                    media_url: mediaUrl
                }]);
            if (error) {
                console.error('Erreur ajout post:', error);
                alert('Erreur : ' + error.message);
            }
        } else {
            // Modification
            const { error } = await supabaseClient
                .from('posts')
                .update({
                    content: content,
                    media_url: mediaUrl
                })
                .eq('id', id);
            if (error) {
                console.error('Erreur modification post:', error);
                alert('Erreur : ' + error.message);
            }
        }
        closeModal();
        loadPosts();
    } else if (type === 'comment') {
        const postId = document.getElementById('postId')?.value;
        const parentId = document.getElementById('parentId')?.value || null;

        if (id === '') {
            // Ajout
            const { error } = await supabaseClient
                .from('comments')
                .insert([{
                    post_id: postId,
                    user_id: userId,
                    content: content,
                    parent_id: parentId
                }]);
            if (error) {
                console.error('Erreur ajout commentaire:', error);
                alert('Erreur : ' + error.message);
            }
        } else {
            // Modification
            const { error } = await supabaseClient
                .from('comments')
                .update({
                    content: content,
                    parent_id: parentId
                })
                .eq('id', id);
            if (error) {
                console.error('Erreur modification commentaire:', error);
                alert('Erreur : ' + error.message);
            }
        }
        closeModal();
        loadComments();
    }
});

// ===== BOUTONS D'AJOUT =====
document.getElementById('addPostBtn').addEventListener('click', openAddPostModal);
document.getElementById('addCommentBtn').addEventListener('click', openAddCommentModal);

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

// Fonction pour visualiser les commentaires (peut être améliorée)
window.viewComments = (postId) => {
    alert('Les commentaires de ce post sont listés dans la section "Commentaires" ci-dessous.');
};