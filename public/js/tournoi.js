// ===== GESTION DES LIVES =====
// Données par défaut pour un live de démonstration
const defaultLive = {
    active: true,
    title: "Détection en direct : Tournoi de Cotonou",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Vidéo exemple
    likes: 42,
    dislikes: 3,
    viewers: 156,
    comments: [
        {
            id: 1,
            author: "Koffi",
            avatar: "public/img/user-default.jpg",
            text: "Quel match incroyable !",
            time: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 2,
            author: "Aminata",
            avatar: "public/img/user-default.jpg",
            text: "Allez les jeunes !",
            time: new Date(Date.now() - 1800000).toISOString()
        }
    ]
};

// Initialiser le live dans localStorage si absent
if (!localStorage.getItem('live_data')) {
    localStorage.setItem('live_data', JSON.stringify(defaultLive));
}

// Éléments DOM
const liveContainer = document.getElementById('liveContainer');
let currentLive = JSON.parse(localStorage.getItem('live_data')) || defaultLive;
let commentInterval;

// Fonction pour afficher le live
function renderLive() {
    if (!currentLive.active) {
        liveContainer.innerHTML = '<div class="no-live"><i class="fas fa-video-slash"></i> Aucun live en cours pour le moment. Revenez plus tard !</div>';
        return;
    }

    // Trier les commentaires par date (plus récents en premier)
    const comments = currentLive.comments.sort((a, b) => new Date(b.time) - new Date(a.time));

    let commentsHtml = '';
    comments.forEach(c => {
        const timeAgo = timeSince(new Date(c.time));
        commentsHtml += `
            <div class="chat-message">
                <img src="${c.avatar}" alt="${c.author}" onerror="this.src='public/img/user-default.jpg'">
                <div class="chat-content">
                    <span class="chat-author">${c.author}</span>
                    <span class="chat-text">${c.text}</span>
                    <span class="chat-time">${timeAgo}</span>
                </div>
            </div>
        `;
    });

    const html = `
        <div class="live-card">
            <div class="live-video">
                <iframe src="${currentLive.videoUrl}" allowfullscreen></iframe>
            </div>
            <div class="live-info">
                <h3 class="live-title">${currentLive.title}</h3>
                <div class="live-stats">
                    <span><i class="fas fa-eye"></i> ${currentLive.viewers}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${currentLive.likes}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${currentLive.dislikes}</span>
                    <span><i class="fas fa-comment"></i> ${currentLive.comments.length}</span>
                </div>
            </div>
            <div class="live-actions">
                <button class="like-btn" id="liveLikeBtn"><i class="fas fa-thumbs-up"></i> J'aime (${currentLive.likes})</button>
                <button class="dislike-btn" id="liveDislikeBtn"><i class="fas fa-thumbs-down"></i> Je n'aime pas (${currentLive.dislikes})</button>
                <button class="share-btn" id="liveShareBtn"><i class="fas fa-share"></i> Partager</button>
            </div>
            <div class="live-chat">
                <h3><i class="fas fa-comments"></i> Chat en direct</h3>
                <div class="chat-messages" id="chatMessages">
                    ${commentsHtml}
                </div>
                <div class="chat-input">
                    <input type="text" id="chatInput" placeholder="Votre message...">
                    <button id="sendCommentBtn"><i class="fas fa-paper-plane"></i> Envoyer</button>
                </div>
            </div>
        </div>
    `;
    liveContainer.innerHTML = html;

    // Re-attacher les événements après le rendu
    attachLiveEvents();
}

// Fonction pour attacher les événements du live
function attachLiveEvents() {
    const likeBtn = document.getElementById('liveLikeBtn');
    const dislikeBtn = document.getElementById('liveDislikeBtn');
    const shareBtn = document.getElementById('liveShareBtn');
    const sendBtn = document.getElementById('sendCommentBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (likeBtn) {
        likeBtn.addEventListener('click', () => {
            currentLive.likes++;
            localStorage.setItem('live_data', JSON.stringify(currentLive));
            renderLive();
        });
    }

    if (dislikeBtn) {
        dislikeBtn.addEventListener('click', () => {
            currentLive.dislikes++;
            localStorage.setItem('live_data', JSON.stringify(currentLive));
            renderLive();
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const liveUrl = window.location.href;
            navigator.clipboard.writeText(liveUrl).then(() => {
                alert('Lien du live copié !');
            });
        });
    }

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => {
            const text = chatInput.value.trim();
            if (text) {
                const newComment = {
                    id: Date.now(),
                    author: "Visiteur",
                    avatar: "public/img/user-default.jpg",
                    text: text,
                    time: new Date().toISOString()
                };
                currentLive.comments.push(newComment);
                localStorage.setItem('live_data', JSON.stringify(currentLive));
                chatInput.value = '';
                renderLive();
                // Scroll en bas du chat
                setTimeout(() => {
                    if (chatMessages) {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }, 100);
            }
        });
    }
}

// Fonction pour mettre à jour le nombre de viewers aléatoirement (simulation)
function updateViewers() {
    if (currentLive.active) {
        // Variation aléatoire entre -5 et +5
        currentLive.viewers += Math.floor(Math.random() * 11) - 5;
        if (currentLive.viewers < 0) currentLive.viewers = 0;
        localStorage.setItem('live_data', JSON.stringify(currentLive));
        renderLive();
    }
}

// Rafraîchir les données toutes les 10 secondes pour simuler le temps réel
function startLiveUpdates() {
    if (commentInterval) clearInterval(commentInterval);
    commentInterval = setInterval(() => {
        // Recharger depuis localStorage (au cas où d'autres onglets modifient)
        currentLive = JSON.parse(localStorage.getItem('live_data')) || defaultLive;
        updateViewers();
    }, 10000);
}

// Fonction pour le temps relatif
function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `il y a ${interval} h`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `il y a ${interval} min`;
    return `il y a ${Math.floor(seconds)} s`;
}

// Copie des codes de tournoi (fonction existante)
function attachCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const code = this.getAttribute('data-code');
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copié!';
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                });
            }
        });
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    renderLive();
    startLiveUpdates();
    attachCopyButtons();
});