// ===== ADMIN FEED =====
let currentTab = 'posts';
let postsData = [];
let reportsData = [];
let usersData = [];

// ===== CHARGEMENT DES DONNÉES =====
async function loadPosts() {
    const search = document.getElementById('postSearch')?.value.toLowerCase() || '';
    const filter = document.getElementById('postFilter')?.value || 'all';

    let query = supabaseAdmin
        .from('feed_posts')
        .select(`
            *,
            player:player_profiles!player_id (id, nom_complet, avatar_url, hub_id),
            likes:feed_likes(count),
            comments:feed_comments(count),
            shares:feed_shares(count),
            reports:feed_reports(count)
        `)
        .order('created_at', { ascending: false });

    if (filter === 'reported') {
        query = query.gt('reports.count', 0);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erreur chargement posts:', error);
        showToast('Erreur chargement posts', 'error');
        return;
    }
    postsData = data || [];
    renderPosts();
}

function renderPosts() {
    const search = document.getElementById('postSearch')?.value.toLowerCase() || '';
    const container = document.getElementById('postsList');
    if (!container) return;

    const filtered = postsData.filter(post =>
        post.player?.nom_complet?.toLowerCase().includes(search) ||
        post.content?.toLowerCase().includes(search)
    );

    container.innerHTML = filtered.map(post => {
        const hasReports = (post.reports?.[0]?.count || 0) > 0;
        return `
            <div class="post-item ${hasReports ? 'reported' : ''}">
                <div class="post-header">
                    <span class="post-author">${post.player?.nom_complet || 'Anonyme'}</span>
                    <span class="post-date">${new Date(post.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <div class="post-content">${post.content || ''}</div>
                ${post.media_url ? `<div class="post-media"><img src="${post.media_url}" alt="media" style="max-width:100%; max-height:100px;"></div>` : ''}
                <div class="post-stats">
                    <span>❤️ ${post.likes?.[0]?.count || 0}</span>
                    <span>💬 ${post.comments?.[0]?.count || 0}</span>
                    <span>🔄 ${post.shares?.[0]?.count || 0}</span>
                    <span>🚩 ${post.reports?.[0]?.count || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="btn-action view" onclick="viewPost(${post.id})">Voir</button>
                    <button class="btn-action delete" onclick="deletePost(${post.id})">Supprimer</button>
                    ${hasReports ? `<button class="btn-action resolve" onclick="resolveReports(${post.id})">Marquer traités</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function loadReports() {
    const { data, error } = await supabaseAdmin
        .from('feed_reports')
        .select(`
            *,
            reporter:player_profiles!reporter_id (nom_complet, avatar_url),
            post:feed_posts (id, content, player_id)
        `)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement reports:', error);
        showToast('Erreur chargement signalements', 'error');
        return;
    }
    reportsData = data || [];
    renderReports();
}

function renderReports() {
    const container = document.getElementById('reportsList');
    if (!container) return;
    container.innerHTML = reportsData.map(report => `
        <div class="report-item">
            <p><strong>Signalé par :</strong> ${report.reporter?.nom_complet || 'Anonyme'}</p>
            <p><strong>Post :</strong> ${report.post?.content || '(contenu supprimé)'}</p>
            <p><strong>Raison :</strong> ${report.reason || 'Non précisée'}</p>
            <p><strong>Date :</strong> ${new Date(report.created_at).toLocaleString('fr-FR')}</p>
            <div class="post-actions">
                <button class="btn-action view" onclick="viewPost(${report.post_id})">Voir le post</button>
                <button class="btn-action delete" onclick="deletePost(${report.post_id})">Supprimer le post</button>
                <button class="btn-action resolve" onclick="resolveReport(${report.id})">Marquer traité</button>
            </div>
        </div>
    `).join('');
}

async function loadUsers() {
    const search = document.getElementById('userSearch')?.value.toLowerCase() || '';

    let query = supabaseAdmin
        .from('player_profiles')
        .select(`
            id, nom_complet, avatar_url, hub_id, email, created_at,
            posts:feed_posts(count),
            followers:feed_follows!followed_id(count),
            following:feed_follows!follower_id(count)
        `)
        .order('nom_complet');

    if (search) {
        query = query.or(`nom_complet.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erreur chargement users:', error);
        showToast('Erreur chargement utilisateurs', 'error');
        return;
    }
    usersData = data || [];
    renderUsers();
}

function renderUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    container.innerHTML = usersData.map(user => `
        <div class="user-item">
            <img src="${user.avatar_url || '../../img/user-default.jpg'}" class="user-avatar">
            <div class="user-info">
                <div class="user-name">${user.nom_complet || 'Sans nom'}</div>
                <div class="user-email">${user.email || ''}</div>
                <div class="user-stats">
                    Posts: ${user.posts?.[0]?.count || 0} | 
                    Followers: ${user.followers?.[0]?.count || 0} | 
                    Following: ${user.following?.[0]?.count || 0}
                </div>
            </div>
            <div>
                ${user.banned ? '<span class="user-badge banned">Banni</span>' : ''}
                <button class="btn-ban ${user.banned ? 'banned' : ''}" onclick="toggleBan(${user.id})">
                    ${user.banned ? 'Débannir' : 'Bannir'}
                </button>
            </div>
        </div>
    `).join('');
}

// ===== ACTIONS =====
async function deletePost(postId) {
    if (!confirm('Supprimer définitivement ce post ?')) return;
    const { error } = await supabaseAdmin
        .from('feed_posts')
        .delete()
        .eq('id', postId);
    if (error) {
        showToast('Erreur suppression: ' + error.message, 'error');
    } else {
        showToast('Post supprimé', 'success');
        loadPosts();
        loadReports();
    }
}

async function resolveReport(reportId) {
    const { error } = await supabaseAdmin
        .from('feed_reports')
        .update({ resolved: true })
        .eq('id', reportId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Signalement marqué comme traité', 'success');
        loadReports();
    }
}

async function resolveReports(postId) {
    const { error } = await supabaseAdmin
        .from('feed_reports')
        .update({ resolved: true })
        .eq('post_id', postId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Tous les signalements de ce post sont traités', 'success');
        loadPosts();
        loadReports();
    }
}

async function toggleBan(userId) {
    const user = usersData.find(u => u.id === userId);
    const newStatus = !user.banned;
    const { error } = await supabaseAdmin
        .from('player_profiles')
        .update({ banned: newStatus })
        .eq('id', userId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast(`Utilisateur ${newStatus ? 'banni' : 'débanni'}`, 'success');
        loadUsers();
    }
}

function viewPost(postId) {
    // Pourrait ouvrir une modale avec le détail, mais pour l'instant on scroll dans la liste
    const postElement = document.querySelector(`.post-item[data-post-id="${postId}"]`);
    if (postElement) postElement.scrollIntoView({ behavior: 'smooth' });
}

// ===== GESTION DES ONGLETS =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById(`tab-${tab}`).classList.add('active');
            currentTab = tab;
            if (tab === 'posts') loadPosts();
            else if (tab === 'reports') loadReports();
            else if (tab === 'users') loadUsers();
        });
    });
}

// ===== RECHERCHE =====
document.getElementById('postSearch')?.addEventListener('input', renderPosts);
document.getElementById('postFilter')?.addEventListener('change', loadPosts);
document.getElementById('userSearch')?.addEventListener('input', loadUsers);

// ===== RAFRAÎCHISSEMENT =====
document.getElementById('refreshBtn').addEventListener('click', () => {
    if (currentTab === 'posts') loadPosts();
    else if (currentTab === 'reports') loadReports();
    else if (currentTab === 'users') loadUsers();
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await initAdminPage();
    initTabs();
    loadPosts(); // onglet posts par défaut
});