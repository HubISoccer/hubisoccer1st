// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de feed.js');

    const user = await checkSession();
    if (!user) return;

    await loadProfile();
    await loadPosts();
    await loadFollowers();

    // Gestion de la publication
    document.getElementById('attachMediaBtn').addEventListener('click', () => {
        document.getElementById('mediaInput').click();
    });

    document.getElementById('mediaInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const preview = document.getElementById('publishMediaPreview');
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('image/')) {
            preview.innerHTML = `<img src="${url}" alt="Aperçu">`;
        } else if (file.type.startsWith('video/')) {
            preview.innerHTML = `<video src="${url}" controls></video>`;
        }
    });

    document.getElementById('previewPostBtn').addEventListener('click', () => {
        const content = document.getElementById('postContent').value.trim();
        alert(`Aperçu : ${content || '(aucun texte)'}`);
    });

    document.getElementById('schedulePostBtn').addEventListener('click', () => {
        alert('Fonctionnalité de programmation (simulation).');
    });

    document.getElementById('publishBtn').addEventListener('click', () => {
        const content = document.getElementById('postContent').value.trim();
        const file = document.getElementById('mediaInput').files[0];
        if (!content && !file) return;
        createPost(content, file);
    });

    initSearchAndFilters();
    initUserMenu();
    initLogout();

    // 👇 AJOUT ICI : bouton pour ouvrir la sidebar droite
    const communityToggle = document.getElementById('communityToggle');
    if (communityToggle) {
        communityToggle.addEventListener('click', () => {
            document.getElementById('rightSidebar').classList.add('active');
            document.getElementById('sidebarOverlay').classList.add('active');
        });
    }

    // Realtime pour les nouvelles publications
    supabaseFeed
        .channel('feed_posts_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, payload => {
            loadPosts();
        })
        .subscribe();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});
// Rendre les fonctions globales pour les appels onclick
window.togglePostMenu = togglePostMenu;
window.likePost = likePost;
window.addComment = addComment;
window.sharePost = sharePost;
window.focusComment = focusComment;
window.showLikes = showLikes;
window.showComments = showComments;
window.editPost = editPost;
window.deletePost = deletePost;
window.pinPost = pinPost;
window.hidePost = hidePost;
window.reportPost = reportPost;
window.editBio = () => alert('Modification de la bio (simulation)');
window.editContact = () => alert('Modification des coordonnées (simulation)');