// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Récupérer l'ID du joueur depuis l'URL
function getPlayerId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Charger les données du joueur
async function getPlayerData(playerId) {
    const { data: player, error } = await supabaseClient
        .from('joueurs')
        .select('*')
        .eq('id', playerId)
        .single();

    if (error) {
        console.error('Erreur chargement joueur:', error);
        return null;
    }
    return player;
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

    // Simuler des données supplémentaires (à remplacer par des vraies données plus tard)
    const stats = {
        matchs: 34,
        buts: 12,
        passes: 8,
        nationalite: player.pays,
        club: player.club,
        taille: '1,82 m',
        poids: '74 kg',
        pied: 'Droit'
    };

    const html = `
        <div class="player-card-hero">
            <div class="hero-img">
                <img src="${player.img}" alt="${player.nom}" onerror="this.src='public/img/player-placeholder.jpg'">
            </div>
            <div class="hero-details">
                <span class="hub-id">HUBI-${player.id}</span>
                <h1>${player.nom}</h1>
                <p class="country"><i class="fas fa-map-marker-alt"></i> ${player.pays}</p>
                <div class="stats-grid">
                    <div class="stat-box"><span class="stat-label">Âge</span><span class="stat-value">${player.age} ans</span></div>
                    <div class="stat-box"><span class="stat-label">Poste</span><span class="stat-value">${player.poste}</span></div>
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
            <a href="mailto:recrutement@hubisoccer.com?subject=Recrutement%20${player.nom}" class="btn-contact-pro">
                <i class="fas fa-envelope"></i> Contacter pour recrutement
            </a>
        </div>
    `;

    container.innerHTML = html;
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
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

    const player = await getPlayerData(playerId);
    renderPlayerProfile(player);
});
