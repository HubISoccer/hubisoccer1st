// Données par défaut pour les engagements
const defaultEngagements = [
    { titre: "Vérification Académique", description: "Obligation de diplôme ou d'apprentissage. Nous luttons contre la précarité des sportifs en fin de carrière." },
    { titre: "Protection FIFA", description: "Intermédiation exclusive via des agents licenciés. Respect strict du règlement sur le transfert des mineurs." },
    { titre: "Audit APDP", description: "Vos données et celles des joueurs sont protégées selon les lois de la République du Bénin." }
];

// Données par défaut pour les rôles (liens vers les pages à la racine)
const defaultRoles = [
    { titre: "Espace Joueur", description: "Gérez votre CV, vos stats et votre visibilité.", lien: "premier-pas.html", icone: "🏃" },
    { titre: "Scouting", description: "Découvrez les talents vérifiés par nos soins.", lien: "scouting.html", icone: "💼" },
    { titre: "Le Processus", description: "Comment nous sécurisons votre avenir pro.", lien: "processus.html", icone: "🛡️" }
];

// Initialiser localStorage avec les valeurs par défaut si vides
if (!localStorage.getItem('engagements')) {
    localStorage.setItem('engagements', JSON.stringify(defaultEngagements));
}
if (!localStorage.getItem('roles')) {
    localStorage.setItem('roles', JSON.stringify(defaultRoles));
}

// Fonction pour afficher les engagements
function loadEngagements() {
    const container = document.getElementById('engagementsContainer');
    if (!container) return;
    const engagements = JSON.parse(localStorage.getItem('engagements')) || [];
    let html = '';
    engagements.forEach(e => {
        html += `
            <div class="concept-card">
                <h3>${e.titre}</h3>
                <p>${e.description}</p>
            </div>
        `;
    });
    container.innerHTML = html || '<p>Aucun engagement.</p>';
}

// Fonction pour afficher les rôles
function loadRoles() {
    const container = document.getElementById('rolesContainer');
    if (!container) return;
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    let html = '';
    roles.forEach(r => {
        html += `
            <a href="${r.lien}" class="role-card">
                <div class="role-icon">${r.icone}</div>
                <h3>${r.titre}</h3>
                <p>${r.description}</p>
            </a>
        `;
    });
    container.innerHTML = html || '<p>Aucun rôle.</p>';
}

// Chargement au démarrage
document.addEventListener('DOMContentLoaded', () => {
    loadEngagements();
    loadRoles();
});