// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let mediaList = [];
let currentFilter = 'all';

// ===== TOAST =====
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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession:', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur lors du chargement du profil', 'error');
            return null;
        }
        currentProfile = data;
        document.getElementById('userName').textContent = currentProfile.nom_complet || 'Joueur';
        document.getElementById('userAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
        return currentProfile;
    } catch (err) {
        console.error('❌ Exception loadProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DES MÉDIAS =====
async function loadMedia() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_media')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur chargement médias:', error);
            showToast('Erreur lors du chargement des médias', 'error');
            return;
        }
        mediaList = data || [];
        renderMedia();
    } catch (err) {
        console.error('❌ Exception loadMedia:', err);
    }
}

// ===== RENDU DES MÉDIAS =====
function renderMedia() {
    const grid = document.getElementById('mediaGrid');
    if (!grid) return;

    const filtered = currentFilter === 'all' 
        ? mediaList 
        : mediaList.filter(m => m.status === currentFilter);

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
            ? `<img src="${media.thumbnail_url}" alt="${media.title}">` 
            : `<i class="fas ${typeIcon}"></i>`;

        return `
            <div class="media-card" onclick="showMediaDetail(${media.id})">
                <div class="media-thumbnail">${thumbnailHtml}</div>
                <div class="media-info">
                    <div class="media-title">${media.title}</div>
                    <div class="media-date">${new Date(media.created_at).toLocaleDateString('fr-FR')}</div>
                    <span class="media-status ${media.status}">${statusText}</span>
                    <span class="media-type"><i class="fas ${typeIcon}"></i> ${media.type}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FILTRAGE =====
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

// ===== MODALES =====
function openUploadModal() { document.getElementById('uploadModal').style.display = 'block'; }
function closeUploadModal() { document.getElementById('uploadModal').style.display = 'none'; }
function closeDetailModal() { document.getElementById('detailModal').style.display = 'none'; }

// ===== UPLOAD D'UN MÉDIA =====
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

    // Upload du fichier vers le bucket 'media'
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
    const filePath = `player_media/${fileName}`;

    const { error: uploadError } = await supabasePlayersSpacePrive.storage
        .from('media')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Erreur upload:', uploadError);
        showToast('Erreur lors de l\'upload du fichier.', 'error');
        return;
    }

    const { data: urlData } = supabasePlayersSpacePrive.storage
        .from('media')
        .getPublicUrl(filePath);
    const mediaUrl = urlData.publicUrl;

    // Générer une miniature pour les vidéos (optionnel – ici on utilise la même URL)
    const thumbnailUrl = type === 'video' ? null : mediaUrl;

    // Insérer dans la table player_media
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

    if (insertError) {
        console.error('Erreur insertion:', insertError);
        showToast('Erreur lors de l\'enregistrement.', 'error');
        return;
    }

    showToast('Média soumis avec succès ! En attente de validation.', 'success');
    closeUploadModal();
    document.getElementById('uploadForm').reset();
    await loadMedia(); // Recharger la liste
});

// ===== AFFICHAGE DU DÉTAIL AVEC COMMENTAIRES =====
async function showMediaDetail(mediaId) {
    // Charger le média
    const { data: media, error: mediaError } = await supabasePlayersSpacePrive
        .from('player_media')
        .select('*')
        .eq('id', mediaId)
        .single();

    if (mediaError) {
        console.error('Erreur chargement média:', mediaError);
        showToast('Erreur lors du chargement du média', 'error');
        return;
    }

    // Charger les commentaires avec les infos de l'auteur
    const { data: comments, error: commentsError } = await supabasePlayersSpacePrive
        .from('media_comments')
        .select(`
            *,
            author:player_profiles!author_id (nom_complet, avatar_url)
        `)
        .eq('media_id', mediaId)
        .order('created_at', { ascending: true });

    if (commentsError) {
        console.error('Erreur chargement commentaires:', commentsError);
        showToast('Erreur lors du chargement des commentaires', 'error');
        return;
    }

    const modalContent = document.getElementById('detailContent');
    const statusText = {
        pending: 'En attente',
        approved: 'Validé',
        rejected: 'Rejeté'
    }[media.status] || 'En attente';

    const mediaHtml = media.type === 'video'
        ? `<video controls src="${media.url}" style="width:100%; max-height:400px;"></video>`
        : `<img src="${media.url}" alt="${media.title}" style="max-width:100%; max-height:400px;">`;

    const commentsHtml = (comments || []).map(c => `
        <div class="comment">
            <div class="comment-author">
                <img src="${c.author?.avatar_url || 'img/user-default.jpg'}" alt="${c.author?.nom_complet}">
                <span>${c.author?.nom_complet || 'Anonyme'}</span>
            </div>
            <div class="comment-text">${c.content}</div>
            <div class="comment-date">${new Date(c.created_at).toLocaleString('fr-FR')}</div>
        </div>
    `).join('');

    modalContent.innerHTML = `
        <div class="media-detail">
            ${mediaHtml}
            <h2>${media.title}</h2>
            <p>${media.description || ''}</p>
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
}

// ===== AJOUTER UN COMMENTAIRE =====
async function addComment(mediaId) {
    const textarea = document.getElementById('newComment');
    const content = textarea.value.trim();
    if (!content) return;

    const { error } = await supabasePlayersSpacePrive
        .from('media_comments')
        .insert([{
            media_id: mediaId,
            author_id: currentProfile.id,
            content
        }]);

    if (error) {
        console.error('Erreur ajout commentaire:', error);
        showToast('Erreur lors de l\'ajout du commentaire', 'error');
    } else {
        showToast('Commentaire ajouté', 'success');
        textarea.value = '';
        showMediaDetail(mediaId); // Recharger le détail pour afficher le nouveau commentaire
    }
}

// ===== FONCTIONS UI =====
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

    // Swipe avec correction
    let touchStartX = 0, touchStartY = 0, touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) {
                e.preventDefault();
            }
            if (diffX > 0 && touchStartX < 50) {
                openSidebar();
            } else if (diffX < 0 && sidebar.classList.contains('active')) {
                closeSidebarFunc();
            }
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

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation videos.js');

    const user = await checkSession();
    if (!user) return;

    await loadProfile();
    if (!currentProfile) {
        console.error('Impossible de charger le profil');
        return;
    }

    await loadMedia();

    initFilters();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('openUploadModal').addEventListener('click', openUploadModal);
    // Exposer les fonctions pour les attributs onclick dans le HTML
    window.closeUploadModal = closeUploadModal;
    window.closeDetailModal = closeDetailModal;
    window.showMediaDetail = showMediaDetail;
    window.addComment = addComment;

    // Sélecteur de langue
    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang = e.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
        // Plus tard, implémenter la traduction
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});
