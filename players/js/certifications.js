// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let certificates = [];

// ===== DONNÉES FICTIVES =====
const fakeCerts = [
    {
        id: 1,
        title: 'BEPC - Enseignement Général',
        issuer: 'Ministère de l\'Éducation',
        year: 2024,
        type: 'scolaire',
        status: 'verified',
        icon: 'fa-graduation-cap'
    },
    {
        id: 2,
        title: 'Certificat de Formation - Académie Élite',
        issuer: 'Centre de Formation Cotonou',
        year: 2025,
        type: 'sportif',
        status: 'pending',
        icon: 'fa-futbol'
    },
    {
        id: 3,
        title: 'Certificat d\'Anglais Sportif',
        issuer: 'British Council',
        year: 2025,
        type: 'autre',
        status: 'verified',
        icon: 'fa-language'
    }
];

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL =====
async function loadPlayerProfile() {
    if (!currentUser?.id) {
        playerProfile = { nom_complet: 'Joueur' };
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('player_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            playerProfile = { nom_complet: 'Joueur' };
        } else {
            playerProfile = data || { nom_complet: 'Joueur' };
        }
        document.getElementById('userName').textContent = playerProfile.nom_complet || 'Joueur';
    } catch (err) {
        console.error('❌ Exception loadPlayerProfile :', err);
        playerProfile = { nom_complet: 'Joueur' };
    }
}

// ===== AFFICHAGE DES CERTIFICATS =====
function renderCertificates() {
    const container = document.getElementById('certificatesList');
    container.innerHTML = '';

    certificates.forEach(cert => {
        const card = document.createElement('div');
        card.className = `cert-card ${cert.status}`;

        const statusText = {
            verified: 'Vérifié',
            pending: 'En attente',
            rejected: 'Rejeté'
        }[cert.status] || 'En attente';

        card.innerHTML = `
            <div class="cert-icon"><i class="fas ${cert.icon}"></i></div>
            <div class="cert-info">
                <h4>${cert.title}</h4>
                <p>Délivré par : ${cert.issuer} | ${cert.year}</p>
            </div>
            <span class="cert-status ${cert.status}">${statusText}</span>
        `;
        container.appendChild(card);
    });
}

// ===== GESTION DU FORMULAIRE D'AJOUT =====
function initUploadForm() {
    const dropArea = document.getElementById('fileDropArea');
    const fileInput = document.getElementById('certFile');
    const fileLabel = document.getElementById('fileLabel');

    // Clic sur la zone
    dropArea.addEventListener('click', () => fileInput.click());

    // Sélection de fichier
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileLabel.textContent = fileInput.files[0].name;
        } else {
            fileLabel.textContent = 'Cliquez ou glissez votre document ici';
        }
    });

    // Drag & drop (simple simulation)
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

    // Soumission du formulaire
    document.getElementById('certForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('certTitle').value;
        const year = document.getElementById('certYear').value;
        const type = document.getElementById('certType').value;
        const file = fileInput.files[0];

        if (!title || !year || !file) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        // Simulation d'ajout (en vrai, upload vers Supabase)
        const newCert = {
            id: Date.now(),
            title: title,
            issuer: 'En attente de vérification', // Sera rempli par l'admin
            year: year,
            type: type,
            status: 'pending',
            icon: type === 'scolaire' ? 'fa-graduation-cap' : (type === 'sportif' ? 'fa-futbol' : 'fa-file-alt')
        };

        certificates.push(newCert);
        renderCertificates();

        // Réinitialiser le formulaire
        document.getElementById('certForm').reset();
        fileLabel.textContent = 'Cliquez ou glissez votre document ici';
        alert('Document soumis avec succès ! En attente de validation.');
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

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseClient.auth.signOut().then(() => {
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

    await loadPlayerProfile();

    // Charger les données fictives
    certificates = [...fakeCerts];
    renderCertificates();

    initUploadForm();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});