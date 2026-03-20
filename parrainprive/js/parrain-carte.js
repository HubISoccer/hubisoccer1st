// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainsSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentParrain = null;
let licenseRequest = null;
let config = null;

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

// ===== LOADER GLOBAL =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseParrainsSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL PARRAIN =====
async function loadParrainProfile() {
    if (!currentUser?.id) {
        showToast('Utilisateur non connecté', 'error');
        return;
    }
    try {
        const { data, error } = await supabaseParrainsSpacePrive
            .from('parrain_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            currentParrain = null;
        } else {
            currentParrain = data;
        }
        document.getElementById('userName').textContent = currentParrain ? `${currentParrain.first_name} ${currentParrain.last_name}` : 'Parrain';
        document.getElementById('userAvatar').src = currentParrain?.avatar_url || 'img/user-default.jpg';
        console.log('✅ Profil utilisé :', currentParrain);
    } catch (err) {
        console.error('❌ Exception loadParrainProfile :', err);
        showToast('Erreur chargement profil', 'error');
    }
}

// ===== CHARGEMENT DE LA DEMANDE DE LICENCE VALIDÉE =====
async function loadLicense() {
    if (!currentParrain?.id) return;
    try {
        const { data, error } = await supabaseParrainsSpacePrive
            .from('parrain_license_requests')
            .select('*')
            .eq('parrain_id', currentParrain.id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement licence:', error);
            showToast('Erreur lors du chargement de la licence', 'error');
            return;
        }
        licenseRequest = data;
    } catch (err) {
        console.error('❌ Exception loadLicense:', err);
    }
}

// ===== CHARGEMENT DE LA CONFIGURATION =====
async function loadConfig() {
    try {
        const { data, error } = await supabaseParrainsSpacePrive
            .from('license_config')
            .select('*')
            .eq('id', 1)
            .maybeSingle();
        if (error) {
            console.error('Erreur chargement config:', error);
        } else {
            config = data || {};
        }
    } catch (err) {
        console.error('❌ Exception loadConfig:', err);
    }
}

// ===== RENDU DE LA CARTE =====
function renderCard() {
    if (!licenseRequest) {
        document.getElementById('cardFront').innerHTML = '<p style="text-align:center; padding:40px;">Aucune licence validée trouvée.</p>';
        document.getElementById('cardBack').innerHTML = '';
        return;
    }

    const formData = licenseRequest.form_data || {};
    const fullName = `${formData.prenom || ''} ${formData.nom || ''}`.trim() || 'Nom non renseigné';
    const dateNaissance = formData.date_naissance ? new Date(formData.date_naissance).toLocaleDateString('fr-FR') : '-';
    const avatarUrl = currentParrain?.avatar_url || 'img/user-default.jpg';
    const hubId = currentParrain?.hub_id || currentParrain?.id || '-';

    // QR Code URL (à adapter si vous avez une page de vérification)
    const verifyUrl = `https://hubisoccer.github.io/hubisoccer1st/verify.html?id=${hubId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;

    // Recto
    document.getElementById('cardFront').innerHTML = `
        <div class="flag-logo">
            <img src="${config?.recto_flag_url || ''}" alt="Drapeau" onerror="this.style.display='none'">
            <img src="${config?.recto_logo_url || ''}" alt="Logo" onerror="this.style.display='none'">
        </div>
        <div class="title-section">
            <h3>${config?.recto_country || ''}</h3>
            <p>${config?.recto_ministry || ''}</p>
            <h2>${config?.recto_company_name || ''}</h2>
            <h1>${config?.recto_title || ''}</h1>
        </div>
        <img src="${avatarUrl}" class="player-photo" alt="Photo">
        <div class="info-grid">
            <div class="info-item"><strong>Nom complet</strong><span>${fullName}</span></div>
            <div class="info-item"><strong>Date de naissance</strong><span>${dateNaissance}</span></div>
            <div class="info-item"><strong>Lieu de naissance</strong><span>${formData.lieu_naissance || '-'}</span></div>
            <div class="info-item"><strong>Nationalité</strong><span>${formData.nationalite || '-'}</span></div>
            <div class="info-item"><strong>Pays</strong><span>${formData.pays || '-'}</span></div>
            <div class="info-item"><strong>Téléphone</strong><span>${formData.telephone || '-'}</span></div>
            <div class="info-item"><strong>Email</strong><span>${formData.email || '-'}</span></div>
            <div class="info-item"><strong>Profession</strong><span>${formData.profession || '-'}</span></div>
        </div>
        <div class="signature-stamp">
            <img src="${licenseRequest.signature_url}" alt="Signature parrain" onerror="this.style.display='none'">
            <img src="${config?.president_stamp_url || ''}" alt="Cachet" onerror="this.style.display='none'">
        </div>
    `;

    // Verso
    document.getElementById('cardBack').innerHTML = `
        <div class="verso-content">
            <img src="${config?.verso_background_logo_url || ''}" class="watermark" alt="" onerror="this.style.display='none'">
            <div class="verso-details">
                <p><strong>ID HubISoccer :</strong> ${hubId}</p>
                <p><strong>Délivrée par :</strong> ${config?.verso_issued_by || ''}</p>
                <p>${config?.verso_legal_info || ''}</p>
                <div class="qr-code">
                    <img src="${qrCodeUrl}" alt="QR Code">
                    <p style="font-size:0.8rem; color:#6c757d;">Scannez pour vérifier</p>
                </div>
            </div>
            <div class="signature-stamp" style="border-top: 1px dashed #e9ecef; margin-top: 10px; padding-top: 10px;">
                <span><strong>${config?.president_name || ''}</strong></span>
                <img src="${config?.president_signature_url || ''}" alt="Signature président" onerror="this.style.display='none'">
            </div>
        </div>
    `;
}

// ===== GESTION DU FLIP =====
function initFlip() {
    const wrapper = document.querySelector('.card-wrapper');
    const btnFront = document.getElementById('flipToFront');
    const btnBack = document.getElementById('flipToBack');
    btnFront.addEventListener('click', () => wrapper.classList.remove('flipped'));
    btnBack.addEventListener('click', () => wrapper.classList.add('flipped'));
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
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
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
            if (e.cancelable) e.preventDefault();
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
            supabaseParrainsSpacePrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page carte parrain');

    const user = await checkSession();
    if (!user) return;

    showLoader(true);
    try {
        await loadParrainProfile();
        if (!currentParrain) {
            showToast('Profil parrain introuvable', 'error');
            return;
        }
        await loadConfig();
        await loadLicense();
        renderCard();
        initFlip();

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
    } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err);
        showToast('Erreur lors du chargement de la page', 'error');
    } finally {
        showLoader(false);
    }
});
