// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseVideosAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let mediaData = [];
let currentMediaId = null;
let currentAction = null;

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ===== LOADER =====
function showLoader(show) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION ADMIN =====
async function checkAdmin() {
    showLoader(true);
    const { data: { session }, error } = await supabaseVideosAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseVideosAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseVideosAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DES MÉDIAS =====
async function loadMedia() {
    showLoader(true);
    try {
        const { data, error } = await supabaseVideosAdmin
            .from('player_media')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Récupérer les noms des joueurs
        const playerIds = [...new Set(data.map(m => m.player_id))];
        const { data: players, error: playersError } = await supabaseVideosAdmin
            .from('player_profiles')
            .select('id, nom_complet')
            .in('id', playerIds);

        if (playersError) throw playersError;

        const playersMap = {};
        (players || []).forEach(p => playersMap[p.id] = p.nom_complet);

        mediaData = (data || []).map(m => ({
            ...m,
            player_name: playersMap[m.player_id] || 'Joueur inconnu'
        }));

        renderMedia();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement médias:', error);
        showToast('Erreur lors du chargement des médias', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES MÉDIAS =====
function renderMedia() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    const filtered = mediaData.filter(m => {
        const matchesSearch = m.title?.toLowerCase().includes(search) || m.player_name?.toLowerCase().includes(search);
        const matchesType = !typeFilter || m.type === typeFilter;
        const matchesStatus = !statusFilter || m.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const container = document.getElementById('mediaGrid');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px; grid-column: 1/-1;">Aucun média trouvé.</p>';
        return;
    }

    container.innerHTML = filtered.map(m => {
        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[m.status] || 'Inconnu';

        const typeIcon = m.type === 'video' ? 'fa-video' : 'fa-image';
        const thumbnailHtml = m.thumbnail_url
            ? `<img src="${m.thumbnail_url}" class="media-thumbnail">`
            : `<div class="media-thumbnail"><i class="fas ${typeIcon}"></i></div>`;

        return `
            <div class="media-card ${m.status}">
                ${thumbnailHtml}
                <div class="media-info">
                    <div class="media-title">${m.title}</div>
                    <div class="media-player">${m.player_name}</div>
                    <div class="media-date">${new Date(m.created_at).toLocaleDateString('fr-FR')}</div>
                    <span class="media-status ${m.status}">${statusText}</span>
                    <span class="media-type"><i class="fas ${typeIcon}"></i> ${m.type}</span>
                </div>
                <div class="media-actions">
                    <button class="btn-action view" onclick="viewMedia(${m.id})"><i class="fas fa-eye"></i> Voir</button>
                    <button class="btn-action approve" onclick="updateStatus(${m.id}, 'approved')"><i class="fas fa-check"></i> Approuver</button>
                    <button class="btn-action reject" onclick="updateStatus(${m.id}, 'rejected')"><i class="fas fa-times"></i> Rejeter</button>
                    <button class="btn-action pending" onclick="updateStatus(${m.id}, 'pending')"><i class="fas fa-clock"></i> En attente</button>
                    <button class="btn-action delete" onclick="confirmDeleteMedia(${m.id})"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== STATISTIQUES =====
function updateStats() {
    const pending = mediaData.filter(m => m.status === 'pending').length;
    const approved = mediaData.filter(m => m.status === 'approved').length;
    const rejected = mediaData.filter(m => m.status === 'rejected').length;
    const total = mediaData.length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('totalCount').textContent = total;
}

// ===== VOIR UN MÉDIA (MODALE) =====
async function viewMedia(mediaId) {
    const media = mediaData.find(m => m.id === mediaId);
    if (!media) return;

    currentMediaId = mediaId;

    // Charger les commentaires avec les noms des auteurs
    const { data: comments, error: commentsError } = await supabaseVideosAdmin
        .from('media_comments')
        .select('*')
        .eq('media_id', mediaId)
        .order('created_at', { ascending: true });

    if (commentsError) {
        console.error('Erreur chargement commentaires:', commentsError);
        showToast('Erreur lors du chargement des commentaires', 'error');
        return;
    }

    // Récupérer les noms des auteurs
    const authorIds = [...new Set(comments.map(c => c.author_id))];
    const { data: authors, error: authorsError } = await supabaseVideosAdmin
        .from('player_profiles')
        .select('id, nom_complet')
        .in('id', authorIds);

    const authorsMap = {};
    (authors || []).forEach(a => authorsMap[a.id] = a.nom_complet);

    const statusText = {
        pending: 'En attente',
        approved: 'Validé',
        rejected: 'Rejeté'
    }[media.status] || 'Inconnu';

    const mediaHtml = media.type === 'video'
        ? `<video controls src="${media.url}" style="max-width:100%; max-height:300px;"></video>`
        : `<img src="${media.url}" style="max-width:100%; max-height:300px;">`;

    const commentsHtml = (comments || []).map(c => `
        <div class="comment-item">
            <div>
                <div class="comment-author">${authorsMap[c.author_id] || 'Anonyme'}</div>
                <div class="comment-text">${c.content}</div>
                <div class="comment-date">${new Date(c.created_at).toLocaleString('fr-FR')}</div>
            </div>
            <button class="btn-delete-comment" onclick="deleteComment(${c.id})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') || '<p>Aucun commentaire.</p>';

    const modalBody = document.getElementById('detailModalBody');
    modalBody.innerHTML = `
        <div class="detail-media">${mediaHtml}</div>
        <div class="detail-info">
            <div class="detail-row"><span class="detail-label">Titre :</span> <span class="detail-value">${media.title}</span></div>
            <div class="detail-row"><span class="detail-label">Joueur :</span> <span class="detail-value">${media.player_name}</span></div>
            <div class="detail-row"><span class="detail-label">Type :</span> <span class="detail-value">${media.type}</span></div>
            <div class="detail-row"><span class="detail-label">Statut :</span> <span class="detail-value" style="color: ${media.status === 'approved' ? 'var(--success)' : media.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'};">${statusText}</span></div>
            <div class="detail-row"><span class="detail-label">Description :</span> <span class="detail-value">${media.description || 'Aucune'}</span></div>
            <div class="detail-row"><span class="detail-label">Soumis le :</span> <span class="detail-value">${new Date(media.created_at).toLocaleString('fr-FR')}</span></div>
        </div>
        <div class="comments-section">
            <h3>Commentaires (${comments.length})</h3>
            ${commentsHtml}
        </div>
    `;

    document.getElementById('modalApproveBtn').onclick = () => updateStatus(mediaId, 'approved');
    document.getElementById('modalRejectBtn').onclick = () => updateStatus(mediaId, 'rejected');
    document.getElementById('modalPendingBtn').onclick = () => updateStatus(mediaId, 'pending');
    document.getElementById('modalDeleteBtn').onclick = () => confirmDeleteMedia(mediaId);

    document.getElementById('detailModal').style.display = 'block';
}

// ===== CHANGEMENT DE STATUT =====
async function updateStatus(mediaId, newStatus) {
    const media = mediaData.find(m => m.id === mediaId);
    if (!media) return;

    const actionText = {
        approved: 'approuver',
        rejected: 'rejeter',
        pending: 'remettre en attente'
    }[newStatus] || 'modifier';

    if (!confirm(`Êtes-vous sûr de vouloir ${actionText} ce média ?`)) return;

    showLoader(true);
    try {
        const { error } = await supabaseVideosAdmin
            .from('player_media')
            .update({ status: newStatus, updated_at: new Date() })
            .eq('id', mediaId);

        if (error) throw error;

        showToast(`Média ${actionText} avec succès`, 'success');
        closeDetailModal();
        loadMedia();
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== SUPPRESSION D'UN MÉDIA =====
async function deleteMedia(mediaId) {
    showLoader(true);
    try {
        // Les commentaires seront supprimés automatiquement par ON DELETE CASCADE
        const { error } = await supabaseVideosAdmin
            .from('player_media')
            .delete()
            .eq('id', mediaId);

        if (error) throw error;

        showToast('Média supprimé', 'success');
        closeConfirmModal();
        closeDetailModal();
        loadMedia();
    } catch (error) {
        console.error('Erreur suppression média:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmDeleteMedia(mediaId) {
    currentAction = { type: 'deleteMedia', id: mediaId };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer ce média ? Cette action supprimera également tous ses commentaires.</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

// ===== SUPPRESSION D'UN COMMENTAIRE =====
async function deleteComment(commentId) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    showLoader(true);
    try {
        const { error } = await supabaseVideosAdmin
            .from('media_comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;

        showToast('Commentaire supprimé', 'success');
        // Recharger la modale actuelle
        if (currentMediaId) viewMedia(currentMediaId);
    } catch (error) {
        console.error('Erreur suppression commentaire:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== FERMETURE DES MODALES =====
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
    currentMediaId = null;
}
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}
function executeAction() {
    if (!currentAction) return;
    if (currentAction.type === 'deleteMedia') {
        deleteMedia(currentAction.id);
    }
}

// ===== FILTRES =====
document.getElementById('searchInput')?.addEventListener('input', renderMedia);
document.getElementById('typeFilter')?.addEventListener('change', renderMedia);
document.getElementById('statusFilter')?.addEventListener('change', renderMedia);

// ===== RAFRAÎCHIR =====
document.getElementById('refreshBtn').addEventListener('click', loadMedia);

// ===== DÉCONNEXION =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseVideosAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    await loadMedia();
});

// Exposer les fonctions globales
window.viewMedia = viewMedia;
window.updateStatus = updateStatus;
window.confirmDeleteMedia = confirmDeleteMedia;
window.deleteComment = deleteComment;
window.closeDetailModal = closeDetailModal;
window.closeConfirmModal = closeConfirmModal;
window.executeAction = executeAction;