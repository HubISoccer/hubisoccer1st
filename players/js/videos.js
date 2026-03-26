const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let mediaList = [];
let currentFilter = 'all';

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${escapeHtml(message)}</div>
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

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

async function checkSession() {
    showLoader();
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error(err);
        window.location.href = '../auth/login.html';
        return null;
    } finally {
        hideLoader();
    }
}

async function loadProfile() {
    if (!currentUser) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();
        if (error) throw error;
        currentProfile = data;
        document.getElementById('userName').textContent = currentProfile.full_name || 'Joueur';
        updateAvatarDisplay();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement profil', 'error');
    } finally {
        hideLoader();
    }
}

function updateAvatarDisplay() {
    const userAvatar = document.getElementById('userAvatar');
    const userInitials = document.getElementById('userAvatarInitials');
    if (currentProfile?.avatar_url) {
        userAvatar.src = currentProfile.avatar_url;
        userAvatar.style.display = 'block';
        if (userInitials) userInitials.style.display = 'none';
    } else {
        const initials = (currentProfile?.full_name || 'J').charAt(0).toUpperCase();
        if (userInitials) {
            userInitials.textContent = initials;
            userInitials.style.display = 'flex';
        }
        userAvatar.style.display = 'none';
    }
}

async function loadMedia() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_media')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        mediaList = data || [];
        renderMedia();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement médias', 'error');
    } finally {
        hideLoader();
    }
}

function renderMedia() {
    const grid = document.getElementById('mediaGrid');
    if (!grid) return;

    const filtered = currentFilter === 'all' ? mediaList : mediaList.filter(m => m.status === currentFilter);

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-message">Aucun média pour le moment.</p>';
        return;
    }

    grid.innerHTML = filtered.map(media => {
        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[media.status] || 'En attente';

        const typeIcon = media.type === 'video' ? 'fa-video' : 'fa-image';
        const thumbnailHtml = media.thumbnail_url 
            ? `<img src="${media.thumbnail_url}" alt="${escapeHtml(media.title)}">` 
            : `<i class="fas ${typeIcon}"></i>`;

        return `
            <div class="media-card" onclick="showMediaDetail(${media.id})">
                <div class="media-thumbnail">${thumbnailHtml}</div>
                <div class="media-info">
                    <div class="media-title">${escapeHtml(media.title)}</div>
                    <div class="media-date">${new Date(media.created_at).toLocaleDateString('fr-FR')}</div>
                    <span class="media-status ${media.status}">${statusText}</span>
                    <span class="media-type"><i class="fas ${typeIcon}"></i> ${media.type}</span>
                </div>
            </div>
        `;
    }).join('');
}

function initFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderMedia();
        });
    });
}

function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
    document.getElementById('mediaFile').value = '';
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('videoPreview').style.display = 'none';
}
function closeUploadModal() { document.getElementById('uploadModal').style.display = 'none'; }
function closeDetailModal() { document.getElementById('detailModal').style.display = 'none'; }

function previewFile() {
    const file = document.getElementById('mediaFile').files[0];
    if (!file) return;
    const previewContainer = document.getElementById('previewContainer');
    const imgPreview = document.getElementById('imagePreview');
    const videoPreview = document.getElementById('videoPreview');

    imgPreview.style.display = 'none';
    videoPreview.style.display = 'none';

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imgPreview.src = e.target.result;
            imgPreview.style.display = 'block';
            videoPreview.style.display = 'none';
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        videoPreview.style.display = 'block';
        imgPreview.style.display = 'none';
        previewContainer.style.display = 'block';
        videoPreview.onloadeddata = () => URL.revokeObjectURL(url);
    } else {
        previewContainer.style.display = 'none';
    }
}

document.getElementById('mediaFile').addEventListener('change', previewFile);

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('mediaTitle').value.trim();
    const description = document.getElementById('mediaDesc').value.trim();
    const type = document.getElementById('mediaType').value;
    const file = document.getElementById('mediaFile').files[0];

    if (!title || !file) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Type de fichier non autorisé. Utilisez MP4, JPEG, PNG ou GIF.', 'error');
        return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('Le fichier ne doit pas dépasser 500 Mo.', 'error');
        return;
    }

    // Désactiver le bouton et afficher le spinner local
    const submitBtn = document.querySelector('#uploadForm .btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
        const filePath = `player_media/${fileName}`;

        const { error: uploadError } = await supabasePlayersSpacePrive.storage
            .from('media')
            .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabasePlayersSpacePrive.storage
            .from('media')
            .getPublicUrl(filePath);
        const mediaUrl = urlData.publicUrl;

        const thumbnailUrl = type === 'video' ? null : mediaUrl;

        const { error: insertError } = await supabasePlayersSpacePrive
            .from('player_media')
            .insert([{
                player_id: currentProfile.id,
                title,
                description,
                type,
                url: mediaUrl,
                thumbnail_url: thumbnailUrl,
                status: 'pending'
            }]);
        if (insertError) throw insertError;

        showToast('Média soumis avec succès ! En attente de validation.', 'success');
        closeUploadModal();
        document.getElementById('uploadForm').reset();
        document.getElementById('previewContainer').style.display = 'none';
        await loadMedia();
    } catch (err) {
        console.error(err);
        showToast('Erreur : ' + err.message, 'error');
    } finally {
        // Réactiver le bouton et restaurer le texte
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

async function showMediaDetail(mediaId) {
    showLoader();
    try {
        const { data: media, error: mediaError } = await supabasePlayersSpacePrive
            .from('player_media')
            .select('*')
            .eq('id', mediaId)
            .single();
        if (mediaError) throw mediaError;

        const { data: comments, error: commentsError } = await supabasePlayersSpacePrive
            .from('media_comments')
            .select(`
                *,
                author:profiles!author_id (full_name, avatar_url)
            `)
            .eq('media_id', mediaId)
            .order('created_at', { ascending: true });
        if (commentsError) throw commentsError;

        const modalContent = document.getElementById('detailContent');
        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[media.status] || 'En attente';

        const mediaHtml = media.type === 'video'
            ? `<video controls src="${media.url}" style="width:100%; max-height:400px;"></video>`
            : `<img src="${media.url}" alt="${escapeHtml(media.title)}" style="max-width:100%; max-height:400px;">`;

        const commentsHtml = (comments || []).map(c => `
            <div class="comment">
                <div class="comment-author">
                    <img src="${c.author?.avatar_url || 'img/user-default.jpg'}" alt="${escapeHtml(c.author?.full_name)}">
                    <span>${escapeHtml(c.author?.full_name || 'Anonyme')}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.content)}</div>
                <div class="comment-date">${new Date(c.created_at).toLocaleString('fr-FR')}</div>
            </div>
        `).join('');

        modalContent.innerHTML = `
            <div class="media-detail">
                ${mediaHtml}
                <h2>${escapeHtml(media.title)}</h2>
                <p>${escapeHtml(media.description || '')}</p>
                <div class="media-meta">
                    <span>Soumis le ${new Date(media.created_at).toLocaleDateString('fr-FR')}</span>
                    <span class="media-status ${media.status}">${statusText}</span>
                </div>
                <div class="comments-section">
                    <h3>Commentaires</h3>
                    <div id="commentsList">${commentsHtml || '<p>Aucun commentaire.</p>'}</div>
                    <div class="add-comment">
                        <textarea id="newComment" placeholder="Ajouter un commentaire..." rows="2"></textarea>
                        <button onclick="addComment(${media.id})">Envoyer</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('detailModal').style.display = 'block';
    } catch (err) {
        console.error(err);
        showToast('Erreur lors du chargement du média', 'error');
    } finally {
        hideLoader();
    }
}

async function addComment(mediaId) {
    const textarea = document.getElementById('newComment');
    const content = textarea.value.trim();
    if (!content) return;

    showLoader();
    try {
        const { error } = await supabasePlayersSpacePrive
            .from('media_comments')
            .insert([{
                media_id: mediaId,
                author_id: currentProfile.id,
                content
            }]);
        if (error) throw error;
        showToast('Commentaire ajouté', 'success');
        textarea.value = '';
        await showMediaDetail(mediaId);
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'ajout du commentaire', 'error');
    } finally {
        hideLoader();
    }
}

// ===== UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
}

function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    let touchStartX = 0, touchStartY = 0;
    const swipeThreshold = 50;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0) closeSidebarFunc();
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabasePlayersSpacePrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation videos');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadMedia();
    initFilters();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('openUploadModal').addEventListener('click', openUploadModal);
    window.closeUploadModal = closeUploadModal;
    window.closeDetailModal = closeDetailModal;
    window.showMediaDetail = showMediaDetail;
    window.addComment = addComment;

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    console.log('✅ Initialisation terminée');
});
