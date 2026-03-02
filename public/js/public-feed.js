console.log("✅ public-feed.js démarré");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;

async function getCurrentUser() {
    const { data: user, error } = await supabaseClient
        .from('users')
        .select('id, nom')
        .eq('id', 1)
        .single();
    if (!error && user) currentUser = user;
    loadPosts();
}
getCurrentUser();

async function loadPosts() {
    const feed = document.getElementById('publicPostsFeed');
    if (!feed) return;

    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            users (id, nom, avatar_url),
            comments (id, user_id, content, created_at, parent_id, users (id, nom, avatar_url)),
            likes (user_id)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

    if (error) {
        feed.innerHTML = '<p>Erreur chargement.</p>';
        return;
    }
    if (!posts.length) {
        feed.innerHTML = '<p>Aucun post.</p>';
        return;
    }

    let html = '';
    posts.forEach(p => {
        const liked = currentUser ? p.likes?.some(l => l.user_id == currentUser.id) : false;
        html += `
            <div class="post-card" data-id="${p.id}">
                <div class="post-header">
                    <img src="${p.users?.avatar_url || 'public/img/user-default.jpg'}" alt="Avatar">
                    <div class="post-author">
                        <h4>${p.users?.nom || 'Anonyme'}</h4>
                        <small>${new Date(p.created_at).toLocaleDateString('fr-FR')}</small>
                    </div>
                </div>
                <div class="post-content">${p.content}</div>
                <div class="post-stats">
                    <span><i class="fas fa-thumbs-up"></i> ${p.likes_count || 0}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${p.dislikes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${p.comments?.length || 0}</span>
                    <span><i class="fas fa-share"></i> ${p.shares || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="like-btn ${liked ? 'liked' : ''}" data-id="${p.id}">J'aime</button>
                    <button class="dislike-btn" data-id="${p.id}">Je n'aime pas</button>
                    <button class="share-btn" data-id="${p.id}">Partager</button>
                </div>
            </div>
        `;
    });
    feed.innerHTML = html;
}

document.addEventListener('click', async e => {
    const like = e.target.closest('.like-btn');
    if (like && currentUser) {
        await supabaseClient.rpc('toggle_post_like', { p_post_id: like.dataset.id, p_user_id: currentUser.id });
        loadPosts();
    }
    const dislike = e.target.closest('.dislike-btn');
    if (dislike) {
        await supabaseClient.rpc('toggle_post_dislike', { p_post_id: dislike.dataset.id, p_user_id: 1 });
        loadPosts();
    }
    const share = e.target.closest('.share-btn');
    if (share) {
        await supabaseClient.rpc('increment_post_shares', { p_post_id: share.dataset.id });
        navigator.clipboard?.writeText(window.location.href).then(() => alert('Lien copié'));
        loadPosts();
    }
});
