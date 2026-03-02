// ===== Afficher/masquer mot de passe =====
function togglePass(id) {
    const input = document.getElementById(id);
    if (input) {
        input.type = input.type === "password" ? "text" : "password";
    }
}

// ===== GESTION DE SESSION AVEC EXPIRATION (2 heures) =====
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 heures en millisecondes

function setSession(userData) {
    const now = Date.now();
    const session = {
        userLoggedIn: true,
        userId: userData.userId,
        userName: userData.userName,
        userRole: userData.userRole || 'joueur',
        lastActivity: now
    };
    sessionStorage.setItem('hubiSession', JSON.stringify(session));
}

function getSession() {
    const sessionStr = sessionStorage.getItem('hubiSession');
    if (!sessionStr) return null;
    try {
        const session = JSON.parse(sessionStr);
        const now = Date.now();
        // Vérifier l'expiration (2h)
        if (now - session.lastActivity > SESSION_DURATION) {
            sessionStorage.removeItem('hubiSession');
            return null;
        }
        // Mettre à jour l'activité
        session.lastActivity = now;
        sessionStorage.setItem('hubiSession', JSON.stringify(session));
        return session;
    } catch (e) {
        return null;
    }
}

function updateActivity() {
    const session = getSession();
    if (session) {
        session.lastActivity = Date.now();
        sessionStorage.setItem('hubiSession', JSON.stringify(session));
    }
}

function requireAuth() {
    const session = getSession();
    if (!session) {
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = '/players/auth/login.html';
        return false;
    }
    return session;
}

// ===== DÉCONNEXION =====
function logout() {
    sessionStorage.removeItem('hubiSession');
    window.location.href = '/index.html';
}

// ===== GESTION DE LA CONNEXION =====
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const identifier = document.getElementById('loginIdentifier')?.value.trim();
            const password = document.getElementById('loginPass')?.value.trim();
            if (!identifier || !password) {
                alert('Veuillez remplir tous les champs.');
                return;
            }
            // Simulation de connexion réussie (à remplacer par appel API)
            // Ici, on considère que tout identifiant non vide est valide.
            const userName = identifier.includes('@') ? identifier.split('@')[0] : identifier;
            setSession({
                userId: identifier,
                userName: userName,
                userRole: 'joueur'
            });
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/players/dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        });
    }

    // Pour les pages protégées, on peut appeler requireAuth() au chargement
    // (à faire dans les scripts spécifiques de chaque page)
});

// ===== SUR TOUTES LES PAGES, METTRE À JOUR L'ACTIVITÉ =====
// Cette fonction doit être appelée régulièrement, par exemple à chaque clic ou toutes les minutes.
// On peut l'appeler via un écouteur global.
document.addEventListener('click', () => {
    updateActivity();
});
document.addEventListener('keypress', () => {
    updateActivity();
});
// Mise à jour périodique (toutes les minutes) pour éviter de perdre la session si l'utilisateur reste inactif mais pas trop longtemps
setInterval(() => {
    updateActivity();
}, 60000); // 60 secondes