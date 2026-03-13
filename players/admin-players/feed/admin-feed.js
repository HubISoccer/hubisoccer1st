// ===== ADMIN FEED (CORRIGÉ) =====

// ===== ÉTAT GLOBAL =====
let currentTab = 'posts';
let postsData = [];
let reportsData = [];
let usersData = [];
let currentAction = null; // pour les confirmations

// ===== CHARGEMENT DES POSTS =====
async function loadPosts() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('feed_posts')
            .select(`
                id,
                content,
                media_url,
                media_type,
                created_at,
                player_id,
                player:player_profiles!feed_posts_player_id_fkey (
                    id,
                    nom_complet,
                    avatar_url,
                    hub_id
                ),
                likes:feed_likes(count),
                comments:feed_comments(count),
                shares:feed_shares(count),
                reports:feed_reports(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        postsData = data || [];
        renderPosts();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement posts:', error);
        showToast('Erreur lors du chargement des posts', 'error');
    } finally {
        showLoader(false);
    }
}

function renderPosts() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const container = document.getElementById('postsList');
    if (!container) return;

    const filtered = postsData.filter(post =>
        post.player?.nom_complet?.toLowerCase().includes(searchTerm) ||
        post.content?.toLowerCase().includes(searchTerm)
    );

    container.innerHTML = filtered.map(post => {
        const hasReports = (post.reports?.[0]?.count || 0) > 0;
        const mediaHtml = post.media_url ? `
            <div class="post-media">
                ${post.media_type === 'video' 
                    ? `<video src="${post.media_url}" controls></video>` 
                    : `<img src="${post.media_url}" alt="media">`}
            </div>
        ` : '';

        return `
            <div class="post-card ${hasReports ? 'reported' : ''}" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <img src="${post.player?.avatar_url || '../../img/user-default.jpg'}">
                        <span class="author-name">${post.player?.nom_complet || 'Anonyme'}</span>
                    </div>
                    <span class="post-date">${new Date(post.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <div class="post-content">${post.content || ''}</div>
                ${mediaHtml}
                <div class="post-stats">
                    <span><i class="fas fa-heart" style="color: #dc3545;"></i> ${post.likes?.[0]?.count || 0}</span>
                    <span><i class="fas fa-comment" style="color: var(--primary);"></i> ${post.comments?.[0]?.count || 0}</span>
                    <span><i class="fas fa-share" style="color: var(--gold);"></i> ${post.shares?.[0]?.count || 0}</span>
                    <span><i class="fas fa-flag" style="color: #ffc107;"></i> ${post.reports?.[0]?.count || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="btn-action view" onclick="viewPost(${post.id})"><i class="fas fa-eye"></i> Voir</button>
                    <button class="btn-action delete" onclick="confirmDeletePost(${post.id})"><i class="fas fa-trash"></i> Supprimer</button>
                    ${hasReports ? `<button class="btn-action resolve" onclick="resolvePostReports(${post.id})"><i class="fas fa-check"></i> Traiter reports</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const total = postsData.length;
    const reported = postsData.filter(p => (p.reports?.[0]?.count || 0) > 0).length;
    document.getElementById('totalPosts').textContent = total;
    document.getElementById('reportedPosts').textContent = reported;
}

// ===== CHARGEMENT DES SIGNALEMENTS =====
async function loadReports() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('feed_reports')
            .select(`
                id,
                reason,
                created_at,
                resolved,
                reporter_id,
                post_id,
                reporter:player_profiles!feed_reports_reporter_id_fkey (
                    nom_complet,
                    avatar_url
                ),
                post:feed_posts!feed_reports_post_id_fkey (
                    id,
                    content,
                    player_id
                )
            `)
            .eq('resolved', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        reportsData = data || [];
        renderReports();
    } catch (error) {
        console.error('Erreur chargement reports:', error);
        showToast('Erreur lors du chargement des signalements', 'error');
    } finally {
        showLoader(false);
    }
}

function renderReports() {
    const container = document.getElementById('reportsList');
    if (!container) return;

    if (reportsData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucun signalement en attente.</p>';
        return;
    }

    container.innerHTML = reportsData.map(report => `
        <div class="report-card">
            <div class="report-header">
                <span class="report-reporter">
                    <img src="${report.reporter?.avatar_url || '../../img/user-default.jpg'}" style="width: 25px; height: 25px; border-radius: 50%; margin-right: 5px;">
                    ${report.reporter?.nom_complet || 'Anonyme'}
                </span>
                <span class="report-date">${new Date(report.created_at).toLocaleString('fr-FR')}</span>
            </div>
            <div class="report-reason">
                <strong>Raison :</strong> ${report.reason || 'Non précisée'}
            </div>
            <div class="report-preview">
                <strong>Post concerné :</strong> ${report.post?.content?.substring(0, 100)}${report.post?.content?.length > 100 ? '…' : ''}
            </div>
            <div class="report-actions">
                <button class="btn-action view" onclick="viewPost(${report.post_id})"><i class="fas fa-eye"></i> Voir post</button>
                <button class="btn-action delete" onclick="confirmDeletePost(${report.post_id})"><i class="fas fa-trash"></i> Supprimer post</button>
                <button class="btn-action resolve" onclick="resolveReport(${report.id})"><i class="fas fa-check"></i> Marquer traité</button>
            </div>
        </div>
    `).join('');
}

// ===== CHARGEMENT DES UTILISATEURS =====
async function loadUsers() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('player_profiles')
            .select(`
                id,
                nom_complet,
                avatar_url,
                hub_id,
                email,
                banned,
                created_at,
                posts:feed_posts!player_id(count),
                followers:feed_follows!followed_id(count),
                following:feed_follows!follower_id(count)
            `)
            .order('nom_complet');

        if (error) throw error;

        usersData = data || [];
        renderUsers();
    } catch (error) {
        console.error('Erreur chargement users:', error);
        showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
        showLoader(false);
    }
}

function renderUsers() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const container = document.getElementById('usersList');
    if (!container) return;

    const filtered = usersData.filter(user =>
        user.nom_complet?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
    );

    container.innerHTML = filtered.map(user => `
        <div class="user-card">
            <img src="${user.avatar_url || '../../img/user-default.jpg'}" class="user-avatar">
            <div class="user-info">
                <div class="user-name">${user.nom_complet || 'Sans nom'}</div>
                <div class="user-email">${user.email || ''}</div>
                <div class="user-stats">
                    <span><i class="fas fa-pencil-alt"></i> ${user.posts?.[0]?.count || 0}</span>
                    <span><i class="fas fa-users"></i> ${user.followers?.[0]?.count || 0}</span>
                    <span><i class="fas fa-user-friends"></i> ${user.following?.[0]?.count || 0}</span>
                </div>
            </div>
            <div>
                <span class="user-badge ${user.banned ? 'banned' : 'active'}">
                    ${user.banned ? 'Banni' : 'Actif'}
                </span>
            </div>
            <button class="btn-ban ${user.banned ? 'banned' : ''}" onclick="toggleBan(${user.id})">
                ${user.banned ? 'Débannir' : 'Bannir'}
            </button>
        </div>
    `).join('');
}

// ===== ACTIONS =====
async function viewPost(postId) {
    const post = postsData.find(p => p.id === postId);
    if (!post) {
        showToast('Post introuvable', 'error');
        return;
    }

    // Charger les commentaires
    const { data: comments, error } = await supabaseAdmin
        .from('feed_comments')
        .select(`
            id,
            content,
            created_at,
            player:player_profiles!feed_comments_player_id_fkey (
                nom_complet,
                avatar_url
            )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur chargement commentaires:', error);
    }

    const modalBody = document.getElementById('postModalBody');
    const mediaHtml = post.media_url ? `
        <div style="margin: 15px 0; text-align: center;">
            ${post.media_type === 'video' 
                ? `<video src="${post.media_url}" controls style="max-width:100%; max-height:300px;"></video>` 
                : `<img src="${post.media_url}" alt="media" style="max-width:100%; max-height:300px; border-radius:10px;">`}
        </div>
    ` : '';

    const commentsHtml = (comments || []).map(c => `
        <div style="background: var(--bg-light); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <img src="${c.player?.avatar_url || '../../img/user-default.jpg'}" style="width: 25px; height: 25px; border-radius: 50%;">
                <strong>${c.player?.nom_complet || 'Anonyme'}</strong>
                <small style="color: var(--gray);">${new Date(c.created_at).toLocaleString('fr-FR')}</small>
            </div>
            <div>${c.content}</div>
        </div>
    `).join('') || '<p style="color: var(--gray);">Aucun commentaire.</p>';

    modalBody.innerHTML = `
        <div style="border-bottom: 1px solid var(--light-gray); padding-bottom: 15px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <img src="${post.player?.avatar_url || '../../img/user-default.jpg'}" style="width: 40px; height: 40px; border-radius: 50%;">
                <div>
                    <strong>${post.player?.nom_complet || 'Anonyme'}</strong>
                    <div style="font-size: 0.8rem; color: var(--gray);">${new Date(post.created_at).toLocaleString('fr-FR')}</div>
                </div>
            </div>
            <div style="margin-bottom: 10px;">${post.content || ''}</div>
            ${mediaHtml}
            <div style="display: flex; gap: 15px; margin-top: 10px;">
                <span><i class="fas fa-heart" style="color: #dc3545;"></i> ${post.likes?.[0]?.count || 0}</span>
                <span><i class="fas fa-comment" style="color: var(--primary);"></i> ${post.comments?.[0]?.count || 0}</span>
                <span><i class="fas fa-share" style="color: var(--gold);"></i> ${post.shares?.[0]?.count || 0}</span>
            </div>
        </div>
        <h3 style="color: var(--primary); margin-bottom: 10px;">Commentaires</h3>
        <div style="max-height: 300px; overflow-y: auto;">
            ${commentsHtml}
        </div>
    `;

    document.getElementById('postModal').style.display = 'block';
}

function closePostModal() {
    document.getElementById('postModal').style.display = 'none';
}

async function deletePost(postId) {
    const { error } = await supabaseAdmin
        .from('feed_posts')
        .delete()
        .eq('id', postId);

    if (error) {
        showToast('Erreur suppression: ' + error.message, 'error');
    } else {
        showToast('Post supprimé avec succès', 'success');
        closeConfirmModal();
        loadPosts();
        loadReports();
    }
}

function confirmDeletePost(postId) {
    currentAction = { type: 'deletePost', postId };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible.</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
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
        loadPosts();
    }
}

async function resolvePostReports(postId) {
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

function executeAction() {
    if (!currentAction) return;

    if (currentAction.type === 'deletePost') {
        deletePost(currentAction.postId);
    }
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

// ===== GESTION DES ONGLETS ET RECHERCHE =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById(`tab-${tab}`).classList.add('active');
            currentTab = tab;

            // Réinitialiser la recherche
            document.getElementById('searchInput').value = '';

            // Charger les données
            if (tab === 'posts') {
                document.getElementById('filterSelect').style.display = 'none';
                loadPosts();
            } else if (tab === 'reports') {
                document.getElementById('filterSelect').style.display = 'none';
                loadReports();
            } else if (tab === 'users') {
                document.getElementById('filterSelect').style.display = 'none';
                loadUsers();
            }
        });
    });
}

// ===== RECHERCHE =====
document.getElementById('searchInput')?.addEventListener('input', () => {
    if (currentTab === 'posts') renderPosts();
    else if (currentTab === 'users') renderUsers();
});

// ===== RAFRAÎCHISSEMENT =====
document.getElementById('refreshBtn').addEventListener('click', () => {
    if (currentTab === 'posts') loadPosts();
    else if (currentTab === 'reports') loadReports();
    else if (currentTab === 'users') loadUsers();
});

// ===== LOADER =====
function showLoader(show) {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'global-loader';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }
    loader.style.display = show ? 'flex' : 'none';
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await initAdminPage();
    initTabs();
    loadPosts(); // onglet posts par défaut
});

// Exposer les fonctions globales
window.viewPost = viewPost;
window.closePostModal = closePostModal;
window.confirmDeletePost = confirmDeletePost;
window.resolveReport = resolveReport;
window.resolvePostReports = resolvePostReports;
window.toggleBan = toggleBan;
window.executeAction = executeAction;
window.closeConfirmModal = closeConfirmModal;