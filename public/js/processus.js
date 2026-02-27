// Données par défaut pour les étapes
const defaultEtapes = [
    {
        titre: "Inscription & Création du Passeport",
        description: "Le joueur crée son profil numérique complet (mensurations, poste, vidéos, parcours scolaire). C'est le début de sa visibilité sur le Hub.",
        icone: "fa-user-plus"
    },
    {
        titre: "Évaluation & Scouting",
        description: "Nos scouts certifiés analysent les performances sur le terrain et via les données. Les meilleurs profils sont labellisés 'Elite HubISoccer'.",
        icone: "fa-search"
    },
    {
        titre: "Double Projet (Sport-Études)",
        description: "Nous veillons à ce que chaque talent suive une formation académique ou professionnelle. Pas de réussite sportive sans sécurité intellectuelle.",
        icone: "fa-graduation-cap"
    },
    {
        titre: "Exposition & Placement",
        description: "Mise en relation directe avec les clubs partenaires, les centres de formation et les universités aux USA et en Europe.",
        icone: "fa-globe-africa"
    }
];

// Données par défaut pour les statistiques
const defaultStats = [
    { nombre: "500+", label: "Talents détectés" },
    { nombre: "120+", label: "Clubs partenaires" },
    { nombre: "30+", label: "Pays représentés" },
    { nombre: "85%", label: "de placement" }
];

// Initialiser localStorage si vide
if (!localStorage.getItem('processus_etapes')) {
    localStorage.setItem('processus_etapes', JSON.stringify(defaultEtapes));
}
if (!localStorage.getItem('processus_stats')) {
    localStorage.setItem('processus_stats', JSON.stringify(defaultStats));
}

// Charger et afficher la timeline
function loadTimeline() {
    const container = document.getElementById('timelineContainer');
    const etapes = JSON.parse(localStorage.getItem('processus_etapes')) || [];
    let html = '';
    etapes.forEach(e => {
        html += `
            <div class="timeline-item">
                <div class="timeline-icon">
                    <i class="fas ${e.icone}"></i>
                </div>
                <div class="timeline-content">
                    <h2>${e.titre}</h2>
                    <p>${e.description}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Charger et afficher les statistiques
function loadStats() {
    const container = document.getElementById('statsContainer');
    const stats = JSON.parse(localStorage.getItem('processus_stats')) || [];
    let html = '';
    stats.forEach(s => {
        html += `
            <div class="stat-item">
                <span class="stat-number">${s.nombre}</span>
                <span class="stat-label">${s.label}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadTimeline();
    loadStats();
});