// ===== CONFIGURATION SUPABASE (nom unique) =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCertAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let certificatesData = [];
let currentCertId = null;
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
    const { data: { session }, error } = await supabaseCertAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseCertAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseCertAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DES CERTIFICATS =====
async function loadCertificates() {
    showLoader(true);
    try {
        const { data, error } = await supabaseCertAdmin
            .from('player_certifications')
            .select(`
                *,
                player:player_profiles!player_id (
                    id,
                    nom_complet,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        certificatesData = data || [];
        renderCertificates();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement certificats:', error);
        showToast('Erreur lors du chargement', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES CERTIFICATS =====
function renderCertificates() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';

    const filtered = certificatesData.filter(cert => {
        const playerName = cert.player?.nom_complet?.toLowerCase() || '';
        const title = cert.title?.toLowerCase() || '';
        const matchesSearch = playerName.includes(searchTerm) || title.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const container = document.getElementById('certsList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucun certificat trouvé.</p>';
        return;
    }

    container.innerHTML = filtered.map(cert => {
        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[cert.status] || 'Inconnu';

        const playerName = cert.player?.nom_complet || 'Joueur inconnu';
        const avatarUrl = cert.player?.avatar_url || '../../img/user-default.jpg';
        const date = new Date(cert.created_at).toLocaleDateString('fr-FR');
        let icon = 'fa-file-alt';
        if (cert.type === 'scolaire') icon = 'fa-graduation-cap';
        else if (cert.type === 'sportif') icon = 'fa-futbol';

        return `
            <div class="cert-card ${cert.status}" data-cert-id="${cert.id}">
                <img src="${avatarUrl}" class="cert-avatar">
                <div class="cert-info">
                    <div class="cert-player">${playerName}</div>
                    <div class="cert-title">${cert.title}</div>
                    <div class="cert-meta">${cert.year} · ${cert.type}</div>
                </div>
                <div class="cert-status ${cert.status}">${statusText}</div>
                <div class="cert-actions">
                    <button class="btn-action view" onclick="viewCertificate(${cert.id})"><i class="fas fa-eye"></i> Voir</button>
                    <button class="btn-action approve" onclick="updateStatus(${cert.id}, 'approved')"><i class="fas fa-check"></i> Approuver</button>
                    <button class="btn-action reject" onclick="updateStatus(${cert.id}, 'rejected')"><i class="fas fa-times"></i> Rejeter</button>
                    <button class="btn-action pending" onclick="updateStatus(${cert.id}, 'pending')"><i class="fas fa-clock"></i> En attente</button>
                    <button class="btn-action download" onclick="window.open('${cert.file_url}', '_blank')"><i class="fas fa-download"></i> Fichier</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== STATISTIQUES =====
function updateStats() {
    const pending = certificatesData.filter(c => c.status === 'pending').length;
    const approved = certificatesData.filter(c => c.status === 'approved').length;
    const rejected = certificatesData.filter(c => c.status === 'rejected').length;
    const total = certificatesData.length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('totalCount').textContent = total;
}

// ===== VOIR UN CERTIFICAT (MODALE) =====
function viewCertificate(certId) {
    const cert = certificatesData.find(c => c.id === certId);
    if (!cert) return;

    currentCertId = certId;
    const playerName = cert.player?.nom_complet || 'Inconnu';
    const statusText = {
        pending: 'En attente',
        approved: 'Validé',
        rejected: 'Rejeté'
    }[cert.status] || 'Inconnu';

    let previewHtml = '';
    if (cert.file_url) {
        if (cert.file_url.match(/\.(jpg|jpeg|png|gif)$/i)) {
            previewHtml = `<img src="${cert.file_url}" alt="Aperçu">`;
        } else if (cert.file_url.match(/\.pdf$/i)) {
            previewHtml = `<iframe src="${cert.file_url}" width="100%" height="300px"></iframe>`;
        } else {
            previewHtml = `<div class="file-icon"><i class="fas fa-file"></i></div>`;
        }
    }

    const modalBody = document.getElementById('certModalBody');
    modalBody.innerHTML = `
        <div class="file-preview">${previewHtml}</div>
        <div class="detail-row"><span class="detail-label">Joueur :</span> <span class="detail-value">${playerName}</span></div>
        <div class="detail-row"><span class="detail-label">Titre :</span> <span class="detail-value">${cert.title}</span></div>
        <div class="detail-row"><span class="detail-label">Année :</span> <span class="detail-value">${cert.year}</span></div>
        <div class="detail-row"><span class="detail-label">Type :</span> <span class="detail-value">${cert.type}</span></div>
        <div class="detail-row"><span class="detail-label">Statut :</span> <span class="detail-value" style="color: ${cert.status === 'approved' ? 'var(--success)' : cert.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'};">${statusText}</span></div>
        <div class="detail-row"><span class="detail-label">Fichier :</span> <span class="detail-value"><a href="${cert.file_url}" target="_blank">Télécharger</a></span></div>
        <div class="detail-row"><span class="detail-label">Soumis le :</span> <span class="detail-value">${new Date(cert.created_at).toLocaleString('fr-FR')}</span></div>
    `;

    document.getElementById('modalApproveBtn').onclick = () => updateStatus(certId, 'approved');
    document.getElementById('modalRejectBtn').onclick = () => updateStatus(certId, 'rejected');
    document.getElementById('modalPendingBtn').onclick = () => updateStatus(certId, 'pending');

    document.getElementById('certDetailModal').style.display = 'block';
}

// ===== CHANGEMENT DE STATUT =====
async function updateStatus(certId, newStatus) {
    const cert = certificatesData.find(c => c.id === certId);
    if (!cert) return;

    const actionText = {
        approved: 'approuver',
        rejected: 'rejeter',
        pending: 'remettre en attente'
    }[newStatus] || 'modifier';

    if (!confirm(`Êtes-vous sûr de vouloir ${actionText} ce certificat ?`)) return;

    showLoader(true);
    try {
        const { error } = await supabaseCertAdmin
            .from('player_certifications')
            .update({ status: newStatus, updated_at: new Date() })
            .eq('id', certId);

        if (error) throw error;

        showToast(`Certificat ${actionText} avec succès`, 'success');
        closeDetailModal();
        loadCertificates();
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== FERMETURE DES MODALES =====
function closeDetailModal() { document.getElementById('certDetailModal').style.display = 'none'; currentCertId = null; }
function closeConfirmModal() { document.getElementById('confirmModal').style.display = 'none'; currentAction = null; }

// ===== FILTRES =====
document.getElementById('searchInput')?.addEventListener('input', renderCertificates);
document.getElementById('statusFilter')?.addEventListener('change', renderCertificates);

// ===== RAFRAÎCHIR =====
document.getElementById('refreshBtn').addEventListener('click', loadCertificates);

// ===== DÉCONNEXION =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseCertAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    loadCertificates();
});

// Exposer les fonctions globales
window.viewCertificate = viewCertificate;
window.updateStatus = updateStatus;
window.closeDetailModal = closeDetailModal;
window.closeConfirmModal = closeConfirmModal;