// ===== DONNÉES DES JOUEURS =====
const defaultPlayers = [
    {
        id: 'j1',
        name: 'Koffi B.',
        pos: 'Attaquant',
        age: 19,
        country: 'Bénin',
        continent: 'Afrique',
        cat: 'adulte',
        club: 'AS Dragons',
        cert: 'BEPC validé',
        img: 'public/img/pas1.jpg'
    },
    {
        id: 'j2',
        name: 'Moussa D.',
        pos: 'Milieu',
        age: 17,
        country: 'Sénégal',
        continent: 'Afrique',
        cat: 'mineur',
        club: 'Diambars',
        cert: 'Formation académique',
        img: 'public/img/pas2.jpg'
    },
    {
        id: 'j3',
        name: 'Aminata Diallo',
        pos: 'Défenseur',
        age: 22,
        country: 'Côte d\'Ivoire',
        continent: 'Afrique',
        cat: 'adulte',
        club: 'ASEC Mimosas',
        cert: 'BAC + études sport',
        img: 'public/img/pas3.jpg'
    }
];

if (!localStorage.getItem('scouting_players')) {
    localStorage.setItem('scouting_players', JSON.stringify(defaultPlayers));
}

// Éléments DOM
const playersGrid = document.getElementById('playersGrid');
const resultCount = document.getElementById('resultCount');
const continentFilter = document.getElementById('continentFilter');
const categoryFilter = document.getElementById('categoryFilter');
const countrySearch = document.getElementById('countrySearch');
const searchBtn = document.getElementById('searchBtn');

// Fonction de rendu
function renderPlayers(players) {
    if (players.length === 0) {
        playersGrid.innerHTML = '<p class="no-results">Aucun joueur trouvé.</p>';
        resultCount.textContent = '0 joueur';
        return;
    }

    let html = '';
    players.forEach(p => {
        const badgeClass = p.cat === 'mineur' ? 'mineur' : 'adulte';
        const badgeText = p.cat === 'mineur' ? 'U17' : '18+';
        html += `
            <div class="player-card">
                <div class="card-image">
                    <img src="${p.img}" alt="${p.name}" onerror="this.src='public/img/player-placeholder.jpg'">
                    <span class="card-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="card-content">
                    <h3>${p.name}</h3>
                    <p>${p.pos}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${p.country}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${p.age} ans</span>
                        <span><i class="fas fa-futbol"></i> ${p.club}</span>
                    </div>
                    <div class="card-cert">
                        <i class="fas fa-graduation-cap"></i> ${p.cert}
                    </div>
                    <a href="profil.html?id=${p.id}" class="btn-view">Voir le profil</a>
                </div>
            </div>
        `;
    });
    playersGrid.innerHTML = html;
    resultCount.textContent = `${players.length} joueur${players.length > 1 ? 's' : ''}`;
}

// Charger tous les joueurs
function loadAllPlayers() {
    const players = JSON.parse(localStorage.getItem('scouting_players')) || [];
    renderPlayers(players);
}

// Filtrer les joueurs
function filterPlayers() {
    const continent = continentFilter.value;
    const category = categoryFilter.value;
    const search = countrySearch.value.toLowerCase().trim();
    const players = JSON.parse(localStorage.getItem('scouting_players')) || [];

    const filtered = players.filter(p => {
        const matchContinent = continent === 'all' || p.continent === continent;
        const matchCategory = category === 'all' || p.cat === category;
        const matchSearch = !search || p.country.toLowerCase().includes(search) || p.name.toLowerCase().includes(search);
        return matchContinent && matchCategory && matchSearch;
    });

    renderPlayers(filtered);
}

// Écouteurs d'événements
searchBtn.addEventListener('click', filterPlayers);
continentFilter.addEventListener('change', filterPlayers);
categoryFilter.addEventListener('change', filterPlayers);
countrySearch.addEventListener('input', filterPlayers);

// Initialisation
loadAllPlayers();