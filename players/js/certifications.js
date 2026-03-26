// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let certificates = [];

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

async function loadCertificates() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_certifications')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        certificates = data || [];
        renderCertificates();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement certificats', 'error');
    } finally {
        hideLoader();
    }
}

function renderCertificates() {
    const container = document.getElementById('certificatesList');
    if (!container) return;
    if (certificates.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun document soumis pour le moment.</p>';
        return;
    }
    container.innerHTML = certificates.map(cert => {
        const statusText = {
            approved: 'Vérifié',
            pending: 'En attente',
            rejected: 'Rejeté'
        }[cert.status] || 'En attente';
        let icon = 'fa-file-alt';
        if (cert.type === 'scolaire') icon = 'fa-graduation-cap';
        else if (cert.type === 'sportif') icon = 'fa-futbol';
        return `
            <div class="cert-card ${cert.status}">
                <div class="cert-icon"><i class="fas ${icon}"></i></div>
                <div class="cert-info">
                    <h4>${escapeHtml(cert.title)}</h4>
                    <p>${cert.year}</p>
                </div>
                <span class="cert-status ${cert.status}">${statusText}</span>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function initUploadForm() {
    const dropArea = document.getElementById('fileDropArea');
    const fileInput = document.getElementById('certFile');
    const fileLabel = document.getElementById('fileLabel');

    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        fileLabel.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'Cliquez ou glissez votre document ici';
    });
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.background = 'rgba(85,27,140,0.1)';
    });
    dropArea.addEventListener('dragleave', () => {
        dropArea.style.background = '';
    });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.background = '';
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            fileLabel.textContent = e.dataTransfer.files[0].name;
        }
    });

    document.getElementById('certForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('certTitle').value.trim();
        const year = parseInt(document.getElementById('certYear').value);
        const type = document.getElementById('certType').value;
        const file = fileInput.files[0];

        // Validation des champs
        if (!title || !year || !file) {
            showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
            return;
        }
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 1) {
            showToast(`L'année doit être comprise entre 1900 et ${currentYear + 1}.`, 'warning');
            return;
        }
        const maxSize = 5 * 1024 * 1024; // 5 Mo
        if (file.size > maxSize) {
            showToast('Le fichier ne doit pas dépasser 5 Mo.', 'warning');
            return;
        }

        showLoader();
        try {
            // 1. Upload du fichier
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
            const filePath = `certifications/${fileName}`;
            const { error: uploadError } = await supabasePlayersSpacePrive.storage
                .from('documents')
                .upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabasePlayersSpacePrive.storage
                .from('documents')
                .getPublicUrl(filePath);
            const fileUrl = urlData.publicUrl;

            // 2. Insertion dans la table
            const { error: insertError } = await supabasePlayersSpacePrive
                .from('player_certifications')
                .insert([{
                    player_id: currentProfile.id,
                    title: title,
                    year: year,
                    type: type,
                    file_url: fileUrl,
                    file_name: file.name,
                    status: 'pending'
                }]);
            if (insertError) throw insertError;

            showToast('Document soumis avec succès ! En attente de validation.', 'success');
            document.getElementById('certForm').reset();
            fileLabel.textContent = 'Cliquez ou glissez votre document ici';
            await loadCertificates();
        } catch (err) {
            console.error(err);
            showToast('Erreur : ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    });
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

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation certifications');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadCertificates();
    initUploadForm();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();
    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    console.log('✅ Initialisation terminée');
});
