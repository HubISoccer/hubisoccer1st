import * as THREE from 'three';

const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let scoutingDetail = null; // données du rapport
let playerData = null; // données du joueur (profil + santé)

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

// Récupérer les données du joueur (pour l'affichage du rapport)
async function loadPlayerData(playerId) {
    // Dans un vrai scénario, playerId serait passé en paramètre d'URL.
    // Pour la démo, on utilise l'ID de l'utilisateur connecté.
    if (!currentUser) return;
    showLoader();
    try {
        // Récupérer les infos de base
        const { data: profile, error: profileError } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        if (profileError) throw profileError;
        playerData = profile;

        // Récupérer les données scouting (ex: depuis player_scouting)
        const { data: scouting, error: scoutingError } = await supabasePlayersSpacePrive
            .from('player_scouting')
            .select('*')
            .eq('player_id', currentUser.id)
            .maybeSingle();
        if (scoutingError) throw scoutingError;
        scoutingDetail = scouting;

        // Récupérer les données santé/physique (table à créer : player_health)
        // Pour l'exemple, on utilise des données factices
        const healthData = {
            skin_color: 'Métissé',
            morphology: 'Athlétique, corps compact',
            physical_strengths: 'Explosivité, endurance, puissance',
            physiology: 'Endomorphique, bonne récupération',
            health_status: 'Aucune blessure, apte à 100%',
            condition: 'excellente' // excellente, normale, incertaine, blessure, piteuse
        };
        // Si une table player_health existe, on pourrait la charger ici

        renderUI(healthData);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement données joueur', 'error');
    } finally {
        hideLoader();
    }
}

function renderUI(healthData) {
    // Informations générales
    document.getElementById('playerName').textContent = playerData.full_name || '-';
    if (playerData.date_of_birth) {
        const age = new Date().getFullYear() - new Date(playerData.date_of_birth).getFullYear();
        document.getElementById('playerAge').textContent = age;
    } else {
        document.getElementById('playerAge').textContent = '-';
    }
    document.getElementById('playerPosition').textContent = playerData.position || '-';
    document.getElementById('playerClub').textContent = playerData.club || '-';
    document.getElementById('playerNationality').textContent = playerData.nationality || '-';
    document.getElementById('playerHeight').textContent = playerData.height || '-';
    document.getElementById('playerWeight').textContent = playerData.weight || '-';
    document.getElementById('playerFoot').textContent = playerData.preferred_foot || '-';

    // État de forme
    const condition = healthData.condition;
    const conditionMap = {
        excellente: { label: 'Forme excellente ⬆️', class: 'excellente' },
        normale: { label: 'Forme normale ➡️', class: 'normale' },
        incertaine: { label: 'Forme incertaine ℹ️', class: 'incertaine' },
        blessure: { label: 'Blessure (arrêt maladie) ➕', class: 'blessure' },
        piteuse: { label: 'Forme piteuse ⬇️', class: 'piteuse' }
    };
    const conditionInfo = conditionMap[condition] || conditionMap.normale;
    const badge = document.getElementById('conditionBadge');
    badge.textContent = conditionInfo.label;
    badge.className = `condition-badge ${conditionInfo.class}`;
    document.getElementById('conditionDetails').innerHTML = `<i class="fas fa-notes-medical"></i> Détails : ${healthData.health_status || 'Non renseigné'}`;

    // Informations médicales & physiques
    const healthGrid = document.getElementById('healthGrid');
    healthGrid.innerHTML = `
        <div class="health-item"><strong>Couleur de peau :</strong> ${healthData.skin_color}</div>
        <div class="health-item"><strong>Physionomie :</strong> ${healthData.morphology}</div>
        <div class="health-item"><strong>Forces physiques :</strong> ${healthData.physical_strengths}</div>
        <div class="health-item"><strong>Physiologie :</strong> ${healthData.physiology}</div>
        <div class="health-item"><strong>État de santé :</strong> ${healthData.health_status}</div>
    `;

    // Rapport scouting (contenu existant ou exemple)
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = scoutingDetail?.rapport_recruteurs || 'Aucun rapport disponible pour le moment.';
}

// Three.js : créer un modèle 3D simple (sphère avec texture)
let scene, camera, renderer, model;

function init3D(avatarUrl) {
    const container = document.getElementById('threeCanvas');
    if (!container) return;

    // Nettoyer l'ancien renderer si présent
    if (renderer) {
        renderer.dispose();
        container.innerHTML = '';
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lumière
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 1);
    scene.add(directionalLight);
    const backLight = new THREE.PointLight(0xccaa88, 0.5);
    backLight.position.set(0, 2, -2);
    scene.add(backLight);

    // Corps (sphère + cylindre pour le torse)
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c }); // peau claire par défaut
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    scene.add(body);

    // Tête (sphère)
    const headGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.1;
    scene.add(head);

    // Yeux
    const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 1.2, 0.4);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 1.2, 0.4);
    scene.add(leftEye);
    scene.add(rightEye);
    const pupilGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.15, 1.2, 0.45);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.15, 1.2, 0.45);
    scene.add(leftPupil);
    scene.add(rightPupil);

    // Optionnel : charger une texture d'avatar sur la tête
    if (avatarUrl && avatarUrl !== '') {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(avatarUrl, (texture) => {
            headMat.map = texture;
            headMat.needsUpdate = true;
            // Ajuster la couleur du corps pour correspondre (simple simulation)
            bodyMat.color.setHex(0xcca37e);
        }, undefined, (err) => console.error(err));
    }

    // Animation
    function animate() {
        requestAnimationFrame(animate);
        head.rotation.y += 0.005;
        leftEye.rotation.y += 0.005;
        rightEye.rotation.y += 0.005;
        leftPupil.rotation.y += 0.005;
        rightPupil.rotation.y += 0.005;
        renderer.render(scene, camera);
    }
    animate();

    // Gérer le redimensionnement
    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
}

// Gestion de la modale 3D
document.getElementById('voirPlusBtn').addEventListener('click', () => {
    const modal = document.getElementById('modal3d');
    modal.style.display = 'block';
    // Initialiser Three.js si ce n'est pas déjà fait
    const avatarUrl = playerData?.avatar_url || '';
    init3D(avatarUrl);
});

document.getElementById('closeModal3d').addEventListener('click', () => {
    const modal = document.getElementById('modal3d');
    modal.style.display = 'none';
    // Nettoyer le canvas pour éviter les fuites mémoire
    if (renderer) {
        renderer.dispose();
        const canvas = document.querySelector('#threeCanvas canvas');
        if (canvas) canvas.remove();
    }
});

// Fermer la modale en cliquant à l'extérieur
window.addEventListener('click', (e) => {
    const modal = document.getElementById('modal3d');
    if (e.target === modal) {
        modal.style.display = 'none';
        if (renderer) {
            renderer.dispose();
            const canvas = document.querySelector('#threeCanvas canvas');
            if (canvas) canvas.remove();
        }
    }
});

// UI commun
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation scouting-detail');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadPlayerData(currentUser.id);
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
