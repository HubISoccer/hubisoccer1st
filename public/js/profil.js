// Récupérer l'ID du joueur depuis l'URL
function getPlayerId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Charger les données du joueur depuis localStorage
function getPlayerData(playerId) {
    const players = JSON.parse(localStorage.getItem('scouting_players')) || [];
    return players.find(p => p.id === playerId) || null;
}

// Construire l'affichage du profil
function renderPlayerProfile(player) {
    const container = document.getElementById('profilContent');
    if (!player) {
        container.innerHTML = `
            <div class="error-message">
                <p>❌ Joueur introuvable.</p>
                <a href="scouting.html">Retour au scouting</a>
            </div>
        `;
        return;
    }

    // Simuler des données supplémentaires (à remplacer par des vraies données)
    const stats = {
        matchs: 34,
        buts: 12,
        passes: 8,
        nationalite: player.country,
        club: player.club || 'Non renseigné',
        taille: '1,82 m',
        poids: '74 kg',
        pied: 'Droit'
    };

    const html = `
        <div class="player-card-hero">
            <div class="hero-img">
                <img src="${player.img}" alt="${player.name}" onerror="this.src='public/img/player-placeholder.jpg'">
            </div>
            <div class="hero-details">
                <span class="hub-id">HUBI-${player.id}</span>
                <h1>${player.name}</h1>
                <p class="country"><i class="fas fa-map-marker-alt"></i> ${player.country}</p>
                <div class="stats-grid">
                    <div class="stat-box"><span class="stat-label">Âge</span><span class="stat-value">${player.age} ans</span></div>
                    <div class="stat-box"><span class="stat-label">Poste</span><span class="stat-value">${player.pos}</span></div>
                    <div class="stat-box"><span class="stat-label">Club</span><span class="stat-value">${stats.club}</span></div>
                    <div class="stat-box"><span class="stat-label">Nationalité</span><span class="stat-value">${stats.nationalite}</span></div>
                </div>
            </div>
        </div>

        <div class="stats-secondary">
            <div class="stat-box"><span class="stat-label">Taille / Poids</span><span class="stat-value">${stats.taille} / ${stats.poids}</span></div>
            <div class="stat-box"><span class="stat-label">Pied fort</span><span class="stat-value">${stats.pied}</span></div>
            <div class="stat-box"><span class="stat-label">Matchs joués</span><span class="stat-value">${stats.matchs}</span></div>
            <div class="stat-box"><span class="stat-label">Buts</span><span class="stat-value">${stats.buts}</span></div>
            <div class="stat-box"><span class="stat-label">Passes décisives</span><span class="stat-value">${stats.passes}</span></div>
        </div>

        <div class="cert-section">
            <h2>Certification HubISoccer</h2>
            <div class="cert-item">
                <span>🎓</span>
                <div>
                    <strong>Diplôme professionnel certifié</strong><br>
                    <span>${player.cert}</span>
                </div>
            </div>
            <a href="mailto:recrutement@hubisoccer.com?subject=Recrutement%20${player.name}" class="btn-contact-pro">
                <i class="fas fa-envelope"></i> Contacter pour recrutement
            </a>
        </div>
    `;

    container.innerHTML = html;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const playerId = getPlayerId();
    if (!playerId) {
        document.getElementById('profilContent').innerHTML = `
            <div class="error-message">
                <p>❌ Aucun joueur spécifié.</p>
                <a href="scouting.html">Retour au scouting</a>
            </div>
        `;
        return;
    }

    const player = getPlayerData(playerId);
    renderPlayerProfile(player);
});