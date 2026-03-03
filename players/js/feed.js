// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let posts = [];
let currentUserLikes = new Set(); // IDs des posts likés par l'utilisateur

// ===== DONNÉES FICTIVES =====
const fakeUsers = [
    { id: 1, name: "Koffi SOGLO", type: "joueur", avatar: "img/user-default.jpg" },
    { id: 2, name: "Jean-Michel Scout", type: "scout", avatar: "img/user-default.jpg" },
    { id: 3, name: "Académie Élite", type: "academie", avatar: "img/user-default.jpg" },
    { id: 4, name: "Dr. Diallo (Staff)", type: "medical", avatar: "img/user-default.jpg" },
    { id: 5, name: "Agent FIFA", type: "agent", avatar: "img/user-default.jpg" },
];

const fakePosts = [
    {
        id: 1,
        authorId: 1,
        content: "Super victoire aujourd'hui ! 2 buts et une passe décisive. #HubISoccer",
        media: null,
        time: "2025-03-03T15:30:00",
        likes: 24,
        comments: [
            { authorId: 2, text: "Félicitations !", time: "2025-03-03T15:45:00" },
            { authorId: 3, text: "Bravo !", time: "2025-03-03T16:00:00" }
        ],
        shares: 3
    },
    {
        id: 2,
        authorId: 2,
        content: "Recherche jeunes talents pour tests la semaine prochaine. Contactez-moi !",
        media: null,
        time: "2025-03-03T10:00:00",
        likes: 15,
        comments: [
            { authorId: 1, text: "Intéressé !", time: "2025-03-03T10:15:00" }
        ],
        shares: 8
    },
    {
        id: 3,
        authorId: 3,
        content: "Notre académie recherche des joueurs U15. Venez nombreux !",
        media: "https://picsum.photos/600/400?random=1",
        time: "2025-03-02T09:00:00",
        likes: 42,
        comments: [],
        shares: 12
    }
];

const fakeFollowers = [
    { id: 2, name: "Jean-Michel Scout", type: "scout" },
    { id: 3, name: "Académie Élite", type: "academie" },
    { id: 5, name: "Agent FIFA", type: "agent" },
];
const fakeFollowing = [
    { id: 2, name: "Jean-Michel Scout", type: "scout" },
    { id: 4, name: "Dr. Diallo", type: "medical" },
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
        playerProfile = { nom_complet: 'Joueur', id: 1 };
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
            playerProfile = { nom_complet: 'Joueur', id: 1 };
        } else {
            playerProfile = data || { nom_complet: 'Joueur', id: 1 };
        }
        document.getElementById('userName').textContent = playerProfile.nom_complet || 'Joueur';
    } catch (err) {
        console.error('❌ Exception loadPlayerProfile :', err);
        playerProfile = { nom_complet: 'Joueur', id: 1 };
    }
}

// ===== INITIALISATION DES DONNÉES =====
function initData() {
    posts = fakePosts.map(post => ({
        ...post,
        likesCount: post.likes,
        comments: post.comments.map(c => ({ ...c, author: fakeUsers.find(u => u.id === c.authorId) }))
    }));
    renderFeed();
    renderSidebarRight();
}

// ===== RENDU DU FIL D'ACTUALITÉ =====
function renderFeed() {
    const stream = document.getElementById('feedStream');
    stream.innerHTML = posts.map(post => {
        const author = fakeUsers.find(u => u.id === post.authorId);
        const isLiked = currentUserLikes.has(post.id);
        const time = new Date(post.time).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <img src="${author.avatar}" alt="${author.name}" class="author-avatar">
                        <div class="author-info">
                            <h4>${author.name}</h4>
                            <p>${author.type}</p>
                        </div>
                    </div>
                    <span class="post-time">${time}</span>
                    <div class="post-actions-menu">
                        <button class="post-action-btn" onclick="pinPost(${post.id})" title="Épingler"><i class="fas fa-thumbtack"></i></button>
                        <button class="post-action-btn" onclick="reportPost(${post.id})" title="Signaler"><i class="fas fa-flag"></i></button>
                        ${author.id === playerProfile.id ? `<button class="post-action-btn" onclick="editPost(${post.id})" title="Modifier"><i class="fas fa-edit"></i></button>` : ''}
                        <button class="post-action-btn" onclick="previewPost(${post.id})" title="Aperçu"><i class="fas fa-eye"></i></button>
                        <button class="post-action-btn" onclick="hidePost(${post.id})" title="Masquer"><i class="fas fa-eye-slash"></i></button>
                    </div>
                </div>
                <div class="post-content">
                    <div class="post-text">${post.content}</div>
                    ${post.media ? `<div class="post-media-content"><img src="${post.media}" alt="media"></div>` : ''}
                </div>
                <div class="post-stats">
                    <span><i class="fas fa-heart"></i> ${post.likesCount}</span>
                    <span><i class="fas fa-comment"></i> ${post.comments.length}</span>
                    <span><i class="fas fa-share"></i> ${post.shares}</span>
                </div>
                <div class="post-interactions">
                    <button class="interaction-btn ${isLiked ? 'liked' : ''}" onclick="likePost(${post.id})">
                        <i class="fas fa-heart"></i> J'aime
                    </button>
                    <button class="interaction-btn" onclick="commentPost(${post.id})">
                        <i class="fas fa-comment"></i> Commenter
                    </button>
                    <button class="interaction-btn" onclick="sharePost(${post.id})">
                        <i class="fas fa-share"></i> Partager
                    </button>
                </div>
                <div class="comments-section" id="comments-${post.id}">
                    ${post.comments.map(c => `
                        <div class="comment">
                            <img src="${c.author.avatar}" alt="${c.author.name}" class="comment-avatar">
                            <div class="comment-content">
                                <div class="comment-author">${c.author.name}</div>
                                <div class="comment-text">${c.text}</div>
                                <div class="comment-time">${new Date(c.time).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                            </div>
                        </div>
                    `).join('')}
                    <div class="add-comment">
                        <input type="text" placeholder="Écrire un commentaire..." id="comment-input-${post.id}">
                        <button onclick="addComment(${post.id})"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== RENDU DE LA SIDEBAR DROITE =====
function renderSidebarRight() {
    const followersList = document.getElementById('followersList');
    const followingList = document.getElementById('followingList');

    followersList.innerHTML = fakeFollowers.map(f => `
        <div class="follower-item">
            <div class="follower-avatar"><i class="fas fa-user"></i></div>
            <span class="follower-name">${f.name}</span>
            <span class="follower-status">${f.type}</span>
        </div>
    `).join('');

    followingList.innerHTML = fakeFollowing.map(f => `
        <div class="following-item">
            <div class="following-avatar"><i class="fas fa-user"></i></div>
            <span class="following-name">${f.name}</span>
            <span class="following-status">${f.type}</span>
        </div>
    `).join('');
}

// ===== INTERACTIONS SUR LES PUBLICATIONS =====
function likePost(postId) {
    if (currentUserLikes.has(postId)) {
        currentUserLikes.delete(postId);
        posts = posts.map(p => p.id === postId ? { ...p, likesCount: p.likesCount - 1 } : p);
    } else {
        currentUserLikes.add(postId);
        posts = posts.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p);
    }
    renderFeed();
}

function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    if (!text) return;

    const post = posts.find(p => p.id === postId);
    const newComment = {
        authorId: playerProfile.id,
        text: text,
        time: new Date().toISOString(),
        author: { id: playerProfile.id, name: playerProfile.nom_complet, avatar: "img/user-default.jpg", type: "joueur" }
    };
    post.comments.push(newComment);
    input.value = '';
    renderFeed();
}

function sharePost(postId) {
    alert(`Partage de la publication ${postId} (simulation)`);
}

function pinPost(postId) {
    alert(`Publication ${postId} épinglée (simulation)`);
}

function reportPost(postId) {
    alert(`Publication ${postId} signalée (simulation)`);
}

function editPost(postId) {
    alert(`Modification de la publication ${postId} (simulation)`);
}

function previewPost(postId) {
    alert(`Aperçu de la publication ${postId} (simulation)`);
}

function hidePost(postId) {
    if (confirm('Masquer cette publication ?')) {
        posts = posts.filter(p => p.id !== postId);
        renderFeed();
    }
}

// ===== CRÉATION DE PUBLICATION =====
function attachMedia() {
    alert('Attachement de média (simulation)');
}

function createPost() {
    const content = document.getElementById('postContent').value.trim();
    if (!content) return;

    const newPost = {
        id: Date.now(),
        authorId: playerProfile.id,
        content: content,
        media: null,
        time: new Date().toISOString(),
        likesCount: 0,
        comments: [],
        shares: 0
    };
    posts.unshift(newPost);
    document.getElementById('postContent').value = '';
    renderFeed();
}

// ===== GESTION DES SIDEBARS (SWIPE) =====
function initSidebars() {
    const leftSidebar = document.getElementById('sidebarLeft');
    const rightSidebar = document.getElementById('sidebarRight');
    const overlay = document.getElementById('sidebarOverlay');
    const closeLeft = document.getElementById('closeSidebarLeft');
    const closeRight = document.getElementById('closeSidebarRight');

    function openLeft() {
        leftSidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeLeft() {
        leftSidebar.classList.remove('active');
        if (!rightSidebar.classList.contains('active')) overlay.classList.remove('active');
    }
    function openRight() {
        rightSidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeRight() {
        rightSidebar.classList.remove('active');
        if (!leftSidebar.classList.contains('active')) overlay.classList.remove('active');
    }

    document.getElementById('menuToggle').addEventListener('click', openLeft);
    closeLeft.addEventListener('click', closeLeft);
    closeRight.addEventListener('click', closeRight);
    overlay.addEventListener('click', () => {
        closeLeft();
        closeRight();
    });

    // Swipe detection
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        const absDiff = Math.abs(diff);

        if (absDiff > minSwipeDistance) {
            if (diff > 0 && touchStartX < 50) { // Swipe droite depuis bord gauche
                openLeft();
            } else if (diff < 0 && window.innerWidth - touchStartX < 50) { // Swipe gauche depuis bord droit
                openRight();
            } else if (diff < 0 && leftSidebar.classList.contains('active')) { // Swipe gauche pour fermer gauche
                closeLeft();
            } else if (diff > 0 && rightSidebar.classList.contains('active')) { // Swipe droite pour fermer droite
                closeRight();
            }
        }
    }, { passive: true });
}

// ===== ACTIONS MENU COMMUNAUTÉ =====
function editProfile() {
    alert('Modifier la bio (simulation)');
}
function editContact() {
    alert('Modifier les coordonnées (simulation)');
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

// ===== RECHERCHE COMMUNAUTÉ =====
document.getElementById('communitySearch')?.addEventListener('input', (e) => {
    console.log('Recherche :', e.target.value);
    // Simulation, on pourrait filtrer les listes
});

// ===== INITIALISATION PRINCIPALE =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page feed');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    initData();
    initSidebars();
    initUserMenu();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});

// Rendre les fonctions globales pour les appels onclick
window.likePost = likePost;
window.addComment = addComment;
window.sharePost = sharePost;
window.pinPost = pinPost;
window.reportPost = reportPost;
window.editPost = editPost;
window.previewPost = previewPost;
window.hidePost = hidePost;
window.attachMedia = attachMedia;
window.createPost = createPost;
window.editProfile = editProfile;
window.editContact = editContact;