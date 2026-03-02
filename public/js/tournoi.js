// public/js/tournoi.js
console.log("✅ tournoi.js chargé");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentLive = null;
let currentUser = { nom: 'Visiteur', avatar: 'public/img/user-default.jpg' }; // À remplacer par vrai utilisateur plus tard

// ===== CHARGEMENT DU LIVE ACTIF =====
async function loadLive() {
    const { data: lives, error } = await supabaseClient
        .from('lives')
        .select('*')
        .eq('actif', true)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Erreur chargement live:', error);
        return;
    }

    if (lives && lives.length > 0) {
        currentLive = lives[0];
        renderLive();
    } else {
        document.getElementById('liveContainer').innerHTML = '<div class="no-live"><i class="fas fa-video-slash"></i> Aucun live en cours pour le moment.</div>';
    }
}

// ===== RENDU DU LIVE AVEC CHAT =====
async function renderLive() {
    const container = document.getElementById('liveContainer');
    if (!container || !currentLive) return;

    // Charger les commentaires avec leurs réponses
    const { data: comments, error } = await supabaseClient
        .from('live_comments')
        .select('*')
        .eq('live_id', currentLive.id)
        .order('date', { ascending: true });

    if (error) {
        console.error('Erreur chargement commentaires:', error);
    }

    const commentsTree = buildCommentsTree(comments || []);

    container.innerHTML = `
        <div class="live-card">
            <div class="live-video">
                <iframe src="${currentLive.video_url}" allowfullscreen></iframe>
            </div>
            <div class="live-info">
                <h3 class="live-title">${currentLive.titre}</h3>
                <div class="live-stats">
                    <span><i class="fas fa-eye"></i> ${currentLive.viewers || 0}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${currentLive.likes || 0}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${currentLive.dislikes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${comments?.length || 0}</span>
                </div>
            </div>
            <div class="live-actions">
                <button class="live-like-btn"><i class="fas fa-thumbs-up"></i> J'aime</button>
                <button class="live-dislike-btn"><i class="fas fa-thumbs-down"></i> Je n'aime pas</button>
                <button class="live-share-btn"><i class="fas fa-share"></i> Partager</button>
            </div>
            <div class="live-chat">
                <h3><i class="fas fa-comments"></i> Chat en direct</h3>
                <div class="chat-messages" id="chatMessages">
                    ${renderComments(commentsTree)}
                </div>
                <div class="chat-input">
                    <input type="text" id="chatInput" placeholder="Votre message...">
                    <button id="sendChatBtn"><i class="fas fa-paper-plane"></i> Envoyer</button>
                </div>
            </div>
        </div>
    `;

    attachLiveEvents();
}

function buildCommentsTree(comments) {
    const map = {};
    const roots = [];
    comments.forEach(c => { c.replies = []; map[c.id] = c; });
    comments.forEach(c => {
        if (c.parent_id) map[c.parent_id]?.replies.push(c);
        else roots.push(c);
    });
    return roots;
}

function renderComments(comments) {
    let html = '';
    comments.forEach(c => {
        html += `
            <div class="chat-message" data-id="${c.id}">
                <img src="${c.avatar || 'public/img/user-default.jpg'}" alt="Avatar">
                <div class="chat-content">
                    <span class="chat-author">${c.auteur}</span>
                    <span class="chat-text">${c.texte}</span>
                    <span class="chat-time">${new Date(c.date).toLocaleTimeString()}</span>
                </div>
                <button class="reply-to-comment" data-id="${c.id}"><i class="fas fa-reply"></i></button>
                ${renderReplies(c.replies)}
            </div>
        `;
    });
    return html;
}

function renderReplies(replies) {
    if (!replies || replies.length === 0) return '';
    let html = '<div class="child-comment">';
    replies.forEach(r => {
        html += `
            <div class="chat-message" data-id="${r.id}">
                <img src="${r.avatar || 'public/img/user-default.jpg'}" alt="Avatar">
                <div class="chat-content">
                    <span class="chat-author">${r.auteur}</span>
                    <span class="chat-text">${r.texte}</span>
                    <span class="chat-time">${new Date(r.date).toLocaleTimeString()}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function attachLiveEvents() {
    const likeBtn = document.querySelector('.live-like-btn');
    const dislikeBtn = document.querySelector('.live-dislike-btn');
    const shareBtn = document.querySelector('.live-share-btn');
    const sendBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (likeBtn) {
        likeBtn.addEventListener('click', async () => {
            const { error } = await supabaseClient
                .from('lives')
                .update({ likes: currentLive.likes + 1 })
                .eq('id', currentLive.id);
            if (!error) {
                currentLive.likes++;
                document.querySelector('.live-stats span:nth-child(2)').innerHTML = `<i class="fas fa-thumbs-up"></i> ${currentLive.likes}`;
            }
        });
    }

    if (dislikeBtn) {
        dislikeBtn.addEventListener('click', async () => {
            const { error } = await supabaseClient
                .from('lives')
                .update({ dislikes: currentLive.dislikes + 1 })
                .eq('id', currentLive.id);
            if (!error) {
                currentLive.dislikes++;
                document.querySelector('.live-stats span:nth-child(3)').innerHTML = `<i class="fas fa-thumbs-down"></i> ${currentLive.dislikes}`;
            }
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = window.location.href;
            navigator.clipboard?.writeText(shareUrl).then(() => alert('Lien copié !'));
        });
    }

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // Répondre à un commentaire
    document.querySelectorAll('.reply-to-comment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const commentId = btn.dataset.id;
            const form = document.createElement('div');
            form.className = 'reply-form';
            form.innerHTML = `
                <input type="text" placeholder="Écrire une réponse...">
                <button data-parent="${commentId}">Répondre</button>
            `;
            btn.closest('.chat-message').appendChild(form);
            btn.style.display = 'none';
        });
    });

    // Gestion des formulaires de réponse
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.reply-form button')) {
            e.preventDefault();
            const form = e.target.closest('.reply-form');
            const input = form.querySelector('input');
            const parentId = e.target.dataset.parent;
            const texte = input.value.trim();
            if (!texte) return;

            const { error } = await supabaseClient
                .from('live_comments')
                .insert([{
                    live_id: currentLive.id,
                    auteur: currentUser.nom,
                    avatar: currentUser.avatar,
                    texte: texte,
                    parent_id: parentId
                }]);
            if (!error) {
                form.remove();
                // Recharger les commentaires
                renderLive();
            }
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const texte = input.value.trim();
    if (!texte) return;

    const { error } = await supabaseClient
        .from('live_comments')
        .insert([{
            live_id: currentLive.id,
            auteur: currentUser.nom,
            avatar: currentUser.avatar,
            texte: texte
        }]);
    if (!error) {
        input.value = '';
        // Recharger les commentaires (on pourrait optimiser en ajoutant dynamiquement)
        renderLive();
    }
}

// ===== COPIER LES CODES DES TOURNOIS =====
document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
        const code = copyBtn.dataset.code;
        navigator.clipboard?.writeText(code).then(() => {
            const original = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copié!';
            setTimeout(() => copyBtn.innerHTML = original, 2000);
        });
    }
});

// ===== INITIALISATION =====
loadLive();