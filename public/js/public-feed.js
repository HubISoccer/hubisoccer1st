// public/js/public-feed.js – Version fonctionnelle
console.log("✅ public-feed.js chargé, initialisation...");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;

// Récupérer l'utilisateur test (ID 1) – À CHANGER PLUS TARD
async function getCurrentUser() {
    const { data: user, error } = await supabase
        .from('users')
        .select('id, nom')
        .eq('id', 1)
        .single();
    if (!error && user) {
        currentUser = user;
        console.log("✅ Utilisateur connecté :", user.nom);
    } else {
        console.log("⚠️ Utilisateur non trouvé, mode visiteur");
    }
    loadPosts(); // Lancer le chargement après avoir l'utilisateur
}
getCurrentUser();

async function loadPosts() {
    const feed = document.getElementById('publicPostsFeed');
    if (!feed) return;

    const { data: posts, error } = await supabase
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

    if (posts.length === 0) {
        feed.innerHTML = '<p>Aucun post pour le moment.</p>';
        return;
    }

    let html = '';
    posts.forEach(post => {
        const userLiked = currentUser ? post.likes?.some(l => l.user_id == currentUser.id) : false;
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
                    <button class="like-btn ${userLiked ? 'liked' : ''}" data-id="${post.id}"><i class="fas fa-thumbs-up"></i> J'aime</button>
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
    if (likeBtn) {
        e.preventDefault();
        if (!currentUser) { alert('Connectez-vous pour aimer.'); return; }
        const { error } = await supabase.rpc('toggle_post_like', { p_post_id: likeBtn.dataset.id, p_user_id: currentUser.id });
        if (error) alert('Erreur : ' + error.message);
        else loadPosts();
        return;
    }
    const dislikeBtn = e.target.closest('.dislike-btn');
    if (dislikeBtn) {
        e.preventDefault();
        const { error } = await supabase.rpc('toggle_post_dislike', { p_post_id: dislikeBtn.dataset.id, p_user_id: 1 });
        if (error) alert('Erreur : ' + error.message);
        else loadPosts();
        return;
    }
    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        e.preventDefault();
        const { error } = await supabase.rpc('increment_post_shares', { p_post_id: shareBtn.dataset.id });
        if (!error) {
            navigator.clipboard?.writeText(window.location.href).then(() => alert('Lien copié !'));
            loadPosts();
        }
        return;
    }
});