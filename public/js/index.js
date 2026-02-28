// ===== DONNÉES STATIQUES (à remplacer par des appels API) =====
const engagementsData = [
    { titre: "Vérification Académique", description: "Obligation de diplôme ou d'apprentissage. Nous luttons contre la précarité des sportifs en fin de carrière." },
    { titre: "Protection FIFA", description: "Intermédiation exclusive via des agents licenciés. Respect strict du règlement sur le transfert des mineurs." },
    { titre: "Audit APDP", description: "Vos données et celles des joueurs sont protégées selon les lois de la République du Bénin." }
];

const rolesData = [
    { titre: "Espace Joueur", description: "Gérez votre CV, vos stats et votre visibilité.", lien: "premier-pas.html", icone: "🏃" },
    { titre: "Scouting", description: "Découvrez les talents vérifiés par nos soins.", lien: "scouting.html", icone: "💼" },
    { titre: "Le Processus", description: "Comment nous sécurisons votre avenir pro.", lien: "processus.html", icone: "🛡️" }
];

// ===== FONCTIONS D'AFFICHAGE =====
function loadEngagements() {
    const container = document.getElementById('engagementsContainer');
    if (!container) return;

    // Simule un appel API (remplacer par fetch plus tard)
    const engagements = engagementsData;

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

function loadRoles() {
    const container = document.getElementById('rolesContainer');
    if (!container) return;

    // Simule un appel API
    const roles = rolesData;

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

// ===== CHARGEMENT AU DÉMARRAGE =====
document.addEventListener('DOMContentLoaded', () => {
    loadEngagements();
    loadRoles();
});