// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;

// ===== DONNÉES FICTIVES POUR FAQ ET CHAT =====
const faqItems = [
    {
        question: "Comment puis-je modifier mon profil ?",
        answer: "Rendez-vous dans 'Mon CV Pro' depuis le menu. Vous pourrez y modifier toutes vos informations personnelles et sportives."
    },
    {
        question: "Comment soumettre une vidéo pour validation ?",
        answer: "Allez dans 'Mes Vidéos', cliquez sur 'Ajouter une vidéo', remplissez le formulaire et soumettez. Notre équipe l'examinera sous 48h."
    },
    {
        question: "Comment retirer de l'argent de mon portefeuille ?",
        answer: "Dans 'Mes Revenus', cliquez sur 'Retirer', indiquez le montant et la méthode de retrait. Le traitement peut prendre jusqu'à 72h."
    },
    {
        question: "Que faire si je ne reçois pas de code de vérification ?",
        answer: "Vérifiez vos spams. Si le problème persiste, contactez le support via le formulaire ci-dessous."
    }
];

let chatMessages = [
    { author: "Support", text: "Bonjour ! Comment puis-je vous aider ?", time: "10:00", isSupport: true }
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

// ===== FAQ =====
function renderFAQ() {
    const container = document.getElementById('faqList');
    container.innerHTML = '';
    faqItems.forEach((item, index) => {
        const faqDiv = document.createElement('div');
        faqDiv.className = 'faq-item';
        faqDiv.innerHTML = `
            <div class="faq-question" onclick="toggleFAQ(${index})">
                <span>${item.question}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer" id="faq-${index}">
                ${item.answer}
            </div>
        `;
        container.appendChild(faqDiv);
    });
}

window.toggleFAQ = function(index) {
    const answer = document.getElementById(`faq-${index}`);
    const question = answer.previousElementSibling;
    question.classList.toggle('active');
    answer.classList.toggle('show');
};

// ===== FORMULAIRE DE TICKET =====
document.getElementById('ticketForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const subject = document.getElementById('ticketSubject').value;
    const category = document.getElementById('ticketCategory').value;
    const description = document.getElementById('ticketDescription').value;
    const file = document.getElementById('ticketAttachment').files[0];

    // Simulation d'envoi (ici on affiche juste une alerte)
    alert(`Ticket soumis : ${subject}\nCatégorie : ${category}\nDescription : ${description}\nFichier : ${file ? file.name : 'aucun'}`);

    // Réinitialiser
    document.getElementById('ticketForm').reset();
});

// ===== CHAT =====
function openChatModal() {
    document.getElementById('chatModal').style.display = 'block';
    renderChatMessages();
}

function closeChatModal() {
    document.getElementById('chatModal').style.display = 'none';
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    chatMessages.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${msg.isSupport ? 'support' : ''}`;
        msgDiv.innerHTML = `
            <div class="author">${msg.author}</div>
            <div class="text">${msg.text}</div>
            <div class="time" style="font-size:0.6rem; color:gray;">${msg.time}</div>
        `;
        container.appendChild(msgDiv);
    });
    container.scrollTop = container.scrollHeight;
}

window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    // Message de l'utilisateur
    chatMessages.push({
        author: playerProfile.nom_complet || 'Vous',
        text: text,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        isSupport: false
    });

    // Réponse automatique du support (simulation)
    setTimeout(() => {
        chatMessages.push({
            author: 'Support',
            text: 'Merci pour votre message. Un conseiller vous répondra dans quelques instants.',
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            isSupport: true
        });
        renderChatMessages();
    }, 1000);

    renderChatMessages();
    input.value = '';
};

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
    console.log('🚀 Initialisation de la page support');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();

    renderFAQ();

    // Modale chat
    document.getElementById('openChatModal').addEventListener('click', openChatModal);
    window.closeChatModal = closeChatModal;

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});