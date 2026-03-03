// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let mediaList = [];
let currentFilter = 'all';

// ===== DONNÉES FICTIVES =====
const fakeMedia = [
    {
        id: 1,
        title: "But magnifique contre l'ASEC",
        description: "Un retourné acrobatique à la 89e minute",
        type: "video",
        url: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Exemple
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        status: "approved",
        created_at: "2025-02-10T14:30:00Z"
    },
    {
        id: 2,
        title: "Séance d'entraînement",
        description: "Exercices de vitesse",
        type: "video",
        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        status: "pending",
        created_at: "2025-03-01T09:15:00Z"
    },
    {
        id: 3,
        title: "Photo officielle",
        description: "Avec l'équipe nationale",
        type: "photo",
        url: "https://picsum.photos/800/600?random=1",
        thumbnail: "https://picsum.photos/300/200?random=1",
        status: "rejected",
        created_at: "2025-02-20T11:00:00Z"
    },
    {
        id: 4,
        title: "Interview après match",
        description: "Mes impressions sur la victoire",
        type: "video",
        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        status: "approved",
        created_at: "2025-01-15T18:45:00Z"
    }
];

const fakeComments = {
    1: [
        { author: "Admin", text: "Magnifique ! Publié sur la communauté.", date: "2025-02-11T10:00:00Z" },
        { author: "Coach", text: "Excellent placement.", date: "2025-02-11T09:30:00Z" }
    ],
    2: [
        { author: "Admin", text: "En attente de vérification.", date: "2025-03-01T10:00:00Z" }
    ],
    4: [
        { author: "Fan123", text: "Quel mental !", date: "2025-01-16T08:20:00Z" }
    ]
};

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

// ===== AFFICHAGE DES MÉDIAS =====
function renderMedia() {
    const grid = document.getElementById('mediaGrid');
    grid.innerHTML = '';

    const filtered = currentFilter === 'all' 
        ? mediaList 
        : mediaList.filter(m => m.status === currentFilter);

    filtered.forEach(media => {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.onclick = () => showMediaDetail(media.id);

        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[media.status] || 'En attente';

        const typeIcon = media.type === 'video' ? 'fa-video' : 'fa-image';

        card.innerHTML = `
            <div class="media-thumbnail">
                ${media.thumbnail 
                    ? `<img src="${media.thumbnail}" alt="${media.title}" style="width:100%; height:100%; object-fit:cover;">` 
                    : `<i class="fas ${typeIcon}"></i>`
                }
            </div>
            <div class="media-info">
                <div class="media-title">${media.title}</div>
                <div class="media-date">${new Date(media.created_at).toLocaleDateString('fr-FR')}</div>
                <span class="media-status ${media.status}">${statusText}</span>
                <span class="media-type"><i class="fas ${typeIcon}"></i> ${media.type}</span>
            </div>
        `;
        grid.appendChild(card);
    });
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
function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}
function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// ===== SOUMISSION DU FORMULAIRE D'UPLOAD =====
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('mediaTitle').value;
    const desc = document.getElementById('mediaDesc').value;
    const type = document.getElementById('mediaType').value;
    const file = document.getElementById('mediaFile').files[0];

    if (!file) return;

    // Simulation d'upload (en vrai, envoyer vers Supabase Storage)
    alert(`Simulation : ${type} "${title}" soumis pour examen.`);
    
    // Ajouter un élément fictif en attendant la vraie implémentation
    const newMedia = {
        id: mediaList.length + 1,
        title,
        description: desc,
        type,
        url: URL.createObjectURL(file),
        thumbnail: type === 'video' ? 'https://via.placeholder.com/300x200?text=Video' : URL.createObjectURL(file),
        status: 'pending',
        created_at: new Date().toISOString()
    };
    mediaList.push(newMedia);
    renderMedia();
    closeUploadModal();
    e.target.reset();
});

// ===== AFFICHAGE DU DÉTAIL D'UN MÉDIA =====
function showMediaDetail(mediaId) {
    const media = mediaList.find(m => m.id === mediaId);
    if (!media) return;

    const comments = fakeComments[mediaId] || [];
    const modalContent = document.getElementById('detailContent');
    const statusText = {
        pending: 'En attente',
        approved: 'Validé',
        rejected: 'Rejeté'
    }[media.status] || 'En attente';

    let mediaHtml = '';
    if (media.type === 'video') {
        mediaHtml = `<video controls src="${media.url}" style="width:100%; max-height:400px;"></video>`;
    } else {
        mediaHtml = `<img src="${media.url}" alt="${media.title}" style="max-width:100%; max-height:400px;">`;
    }

    modalContent.innerHTML = `
        <div class="media-detail">
            ${mediaHtml}
            <h2>${media.title}</h2>
            <p>${media.description}</p>
            <div class="media-meta">
                <span>Soumis le ${new Date(media.created_at).toLocaleDateString('fr-FR')}</span>
                <span class="media-status ${media.status}">${statusText}</span>
            </div>
            <div class="comments-section">
                <h3>Commentaires</h3>
                ${comments.length === 0 ? '<p>Aucun commentaire.</p>' : ''}
                ${comments.map(c => `
                    <div class="comment">
                        <div class="comment-author">${c.author}</div>
                        <div class="comment-text">${c.text}</div>
                        <div class="comment-date">${new Date(c.date).toLocaleString('fr-FR')}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.getElementById('detailModal').style.display = 'block';
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
    console.log('🚀 Initialisation de la page videos');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();

    // Charger les données fictives
    mediaList = [...fakeMedia];

    renderMedia();
    initFilters();

    // Ouvrir/fermer modales
    document.getElementById('openUploadModal').addEventListener('click', openUploadModal);
    window.closeUploadModal = closeUploadModal;
    window.closeDetailModal = closeDetailModal;

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});
