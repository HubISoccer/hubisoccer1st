// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;
let certificates = [];

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
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL (depuis profiles) =====
async function loadProfile() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            return null;
        }
        currentProfile = data;
        document.getElementById('userName').textContent = currentProfile.full_name || 'Joueur';
        document.getElementById('userAvatar').src = currentProfile.avatar_url || 'img/user-default.jpg';
        return currentProfile;
    } catch (err) {
        console.error('❌ Exception loadProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DES CERTIFICATS =====
async function loadCertificates() {
    if (!currentProfile) return;
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
        console.error('Erreur chargement certificats:', err);
        showToast('Erreur lors du chargement des certificats', 'error');
    }
}

// ===== RENDU DES CERTIFICATS =====
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

// ===== GESTION DU FORMULAIRE D'AJOUT =====
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
        const year = document.getElementById('certYear').value.trim();
        const type = document.getElementById('certType').value;
        const file = fileInput.files[0];

        if (!title || !year || !file) {
            showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
            return;
        }

        // 1. Upload du fichier vers le bucket 'documents'
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentProfile.id}_${Date.now()}.${fileExt}`;
        const filePath = `certifications/${fileName}`;

        const { error: uploadError } = await supabasePlayersSpacePrive.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Erreur upload:', uploadError);
            showToast('Erreur lors de l\'upload du fichier.', 'error');
            return;
        }

        const { data: urlData } = supabasePlayersSpacePrive.storage
            .from('documents')
            .getPublicUrl(filePath);
        const fileUrl = urlData.publicUrl;

        // 2. Insertion dans la table player_certifications
        const { error: insertError } = await supabasePlayersSpacePrive
            .from('player_certifications')
            .insert([{
                player_id: currentProfile.id,
                title: title,
                year: parseInt(year),
                type: type,
                file_url: fileUrl,
                file_name: file.name,
                status: 'pending'
            }]);

        if (insertError) {
            console.error('Erreur insertion:', insertError);
            showToast('Erreur lors de l\'enregistrement.', 'error');
            return;
        }

        showToast('Document soumis avec succès ! En attente de validation.', 'success');
        document.getElementById('certForm').reset();
        fileLabel.textContent = 'Cliquez ou glissez votre document ici';
        await loadCertificates(); // recharger la liste
    });
}

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!userMenu || !dropdown) return;
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
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
            if (e.cancelable) {
                e.preventDefault();
            }
            if (diffX > 0 && touchStartX < 50) {
                openSidebar();
            } else if (diffX < 0) {
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
    console.log('🚀 Initialisation de la page certifications');

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
        const lang = e.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});