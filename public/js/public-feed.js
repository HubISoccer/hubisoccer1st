// public/js/public-feed.js – Version finale avec session utilisateur
console.log("✅ public-feed.js chargé");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Gestion de l'identifiant unique du visiteur (stocké dans localStorage)
let userId = localStorage.getItem('hubi_visitor_id');
if (!userId) {
    userId = Date.now(); // nombre unique (timestamp)
    localStorage.setItem('hubi_visitor_id', userId);
    // Optionnel : insérer cet utilisateur dans la table users ? Non, on utilise juste cet ID pour les likes
}
console.log("👤 ID visiteur :", userId);

// Variable pour stocker les likes déjà effectués (pour désactiver le bouton)
let userLikedPosts = new Set();

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

    // Mettre à jour l'ensemble des posts likés par cet utilisateur
    userLikedPosts.clear();
    posts.forEach(post => {
        if (post.likes.some(l => l.user_id == userId)) {
            userLikedPosts.add(post.id);
        }
    });

    let html = '';
    posts.forEach(post => {
        const userLiked = userLikedPosts.has(post.id);
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
                    <span><i class="fas fa-comment"></i> ${post.comments?.length || 0}</span>
                    <span><i class="fas fa-share"></i> ${post.shares || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="like-btn ${userLiked ? 'liked' : ''}" data-id="${post.id}" ${userLiked ? 'disabled' : ''}><i class="fas fa-thumbs-up"></i> J'aime</button>
                    <button class="dislike-btn" data-id="${post.id}"><i class="fas fa-thumbs-down"></i> Je n'aime pas</button>
                    <button class="share-btn" data-id="${post.id}"><i class="fas fa-share"></i> Partager</button>
                </div>
            </div>
        `;
    });
    feed.innerHTML = html;
}

// ===== GESTION DES BOUTONS =====
document.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn && !likeBtn.disabled) {
        e.preventDefault();
        const postId = likeBtn.dataset.id;
        const { error } = await supabaseClient.rpc('add_post_like', { p_post_id: postId, p_user_id: userId });
        if (error) {
            console.error(error);
            alert('Erreur : ' + error.message);
        } else {
            // Marquer comme liké et recharger
            userLikedPosts.add(postId);
            loadPosts(); // recharge pour mettre à jour compteur et état du bouton
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
});

// Chargement initial
loadPosts();