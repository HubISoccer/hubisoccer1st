// ===== DONNÉES UTILISATEUR SIMULÉES (en attendant l'auth) =====
const fakeUser = {
    userName: 'Koffi B. SOGLO',
    userId: '266HU028BIBJ16022026',
    userRole: 'Ailier Droit - U17'
};

// ===== CHARGEMENT DES DONNÉES UTILISATEUR =====
function loadUserData() {
    const nameElement = document.getElementById('dashboardName');
    const idElement = document.getElementById('playerID');
    const roleElement = document.getElementById('dashboardRole');
    const userName = document.getElementById('userName');

    if (nameElement) nameElement.textContent = fakeUser.userName;
    if (idElement) idElement.innerHTML = `ID: ${fakeUser.userId}`;
    if (roleElement) roleElement.textContent = fakeUser.userRole;
    if (userName) userName.textContent = fakeUser.userName;
}

// ===== GESTION DU MENU UTILISATEUR =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!userMenu || !dropdown) return;

    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });
}

// ===== GESTION DE LA SIDEBAR =====
function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            if (overlay) overlay.classList.add('active');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// ===== DÉCONNEXION SIMULÉE (redirige vers l'accueil) =====
function initLogout() {
    const logoutLinks = document.querySelectorAll('#logoutLink, #logoutLinkSidebar');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/index.html';
        });
    });
}

// ===== UPLOAD AVATAR =====
function triggerUpload() {
    document.getElementById('fileInput')?.click();
}

document.addEventListener('change', function(e) {
    if (e.target.matches('#fileInput')) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.getElementById('profileDisplay');
                if (img) img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
});

// ===== COPIER ID =====
function copyID(text) {
    navigator.clipboard.writeText(text).then(() => {
        const span = document.getElementById('playerID');
        if (span) {
            const oldText = span.innerText;
            span.innerText = "Copié ! ✅";
            setTimeout(() => span.innerText = oldText, 2000);
        }
    }).catch(() => {
        alert('Erreur de copie. Veuillez copier manuellement.');
    });
}

// ===== GESTION DES ONGLETS =====
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    if (tabs.length === 0 || contents.length === 0) return;

    tabs.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ===== SAUVEGARDE SIMULÉE =====
function saveProfile() {
    alert('Profil sauvegardé (simulation).');
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    initUserMenu();
    initSidebar();
    initLogout();

    // Exposer les fonctions globales
    window.triggerUpload = triggerUpload;
    window.copyID = copyID;
    window.showTab = showTab;
    window.saveProfile = saveProfile;
});