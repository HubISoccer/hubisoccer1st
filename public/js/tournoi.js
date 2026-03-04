// public/js/tournoi.js – Version avec paiements FedaPay
console.log("✅ tournoi.js chargé");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentLive = null;
let currentUser = { nom: 'Visiteur', avatar: 'public/img/user-default.jpg' };

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

    const { data: comments, error } = await supabaseClient
        .from('live_comments')
        .select('*')
        .eq('live_id', currentLive.id)
        .order('date', { ascending: true });

    if (error) console.error('Erreur chargement commentaires:', error);

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
    const map = {}; const roots = [];
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
    if (!replies?.length) return '';
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

    likeBtn?.addEventListener('click', async () => {
        const { error } = await supabaseClient
            .from('lives')
            .update({ likes: currentLive.likes + 1 })
            .eq('id', currentLive.id);
        if (!error) {
            currentLive.likes++;
            document.querySelector('.live-stats span:nth-child(2)').innerHTML = `<i class="fas fa-thumbs-up"></i> ${currentLive.likes}`;
        }
    });

    dislikeBtn?.addEventListener('click', async () => {
        const { error } = await supabaseClient
            .from('lives')
            .update({ dislikes: currentLive.dislikes + 1 })
            .eq('id', currentLive.id);
        if (!error) {
            currentLive.dislikes++;
            document.querySelector('.live-stats span:nth-child(3)').innerHTML = `<i class="fas fa-thumbs-down"></i> ${currentLive.dislikes}`;
        }
    });

    shareBtn?.addEventListener('click', () => {
        navigator.clipboard?.writeText(window.location.href).then(() => alert('Lien copié !'));
    });

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }

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
        renderLive();
    }
}

// ===== CHARGEMENT DES TOURNOIS =====
// ===== CHARGEMENT DES TOURNOIS AVEC INTÉGRATION FEDAPAY =====
async function loadTournois() {
    const grid = document.getElementById('tournoiGrid');
    if (!grid) return;

    const { data: tournois, error } = await supabaseClient
        .from('tournois')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement tournois:', error);
        grid.innerHTML = '<p>Erreur de chargement des tournois.</p>';
        return;
    }

    if (!tournois || tournois.length === 0) {
        grid.innerHTML = '<p>Aucun tournoi pour le moment.</p>';
        return;
    }

    let html = '';

    tournois.forEach(t => {
        // Vérifier si un paiement a été effectué (via paramètre dans l'URL)
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const paidTournoiId = urlParams.get('tournoi_id');
        let codeDisplay = '';

        // Lien de paiement (pour l'instant fixe, à remplacer par un lien par tournoi si tu le souhaites)
        const paymentUrl = t.prix > 0 ? 'https://me.fedapay.com/hubisoccer.com' : '';

        if (t.prix > 0) {
            if (success && paidTournoiId == t.id) {
                // Après paiement, afficher le code
                codeDisplay = `
                    <div class="code-box success">
                        <span class="code">${t.code}</span>
                        <button class="copy-btn" data-code="${t.code}"><i class="fas fa-copy"></i> Copier</button>
                    </div>
                `;
            } else {
                // Afficher le bouton d'achat
                codeDisplay = `
                    <div class="code-box blurred">
                        <span class="code blurred-code">•••••••••••</span>
                        <button class="btn-buy-code" data-url="${paymentUrl}" data-tournoi="${t.id}" data-prix="${t.prix}">
                            <i class="fas fa-shopping-cart"></i> Obtenir le code (${t.prix} FCFA)
                        </button>
                    </div>
                `;
            }
        } else {
            // Tournoi gratuit : afficher le code directement
            codeDisplay = `
                <div class="code-box">
                    <span class="code">${t.code}</span>
                    <button class="copy-btn" data-code="${t.code}"><i class="fas fa-copy"></i> Copier</button>
                </div>
            `;
        }

        // Construction de la carte du tournoi
        html += `
            <div class="tournoi-card" data-id="${t.id}">
                <div class="card-image">
                    <img src="${t.image}" alt="${t.titre}">
                    <div class="card-badge">${t.badge}</div>
                </div>
                <div class="card-content">
                    <h3>${t.titre}</h3>
                    <p class="tournoi-desc">${t.description}</p>
                    <div class="tournoi-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${t.date}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${t.lieu}</span>
                        <span><i class="fas fa-users"></i> ${t.categories}</span>
                    </div>
                    <div class="tournoi-code">
                        <span class="code-label">Code d'inscription :</span>
                        ${codeDisplay}
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;

    // Gestion des clics sur les boutons d'achat
    document.querySelectorAll('.btn-buy-code').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const url = btn.dataset.url;
            const tournoiId = btn.dataset.tournoi;
            // Rediriger vers le lien de paiement en ajoutant l'ID du tournoi
            window.location.href = url + (url.includes('?') ? '&' : '?') + 'tournoi_id=' + tournoiId;
        });
    });

    // Gestion des boutons de copie
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const code = btn.dataset.code;
            navigator.clipboard?.writeText(code).then(() => {
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copié!';
                setTimeout(() => btn.innerHTML = original, 2000);
            });
        });
    });
}

// ===== INITIALISATION =====
loadLive();
loadTournois();