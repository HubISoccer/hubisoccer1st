// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const playersGrid = document.getElementById('playersGrid');
const resultCount = document.getElementById('resultCount');
const continentFilter = document.getElementById('continentFilter');
const categoryFilter = document.getElementById('categoryFilter');
const countrySearch = document.getElementById('countrySearch');
const searchBtn = document.getElementById('searchBtn');

let allPlayers = []; // Pour stocker tous les joueurs

// Charger tous les joueurs
async function loadAllPlayers() {
    const { data: players, error } = await supabaseClient
        .from('joueurs')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        playersGrid.innerHTML = '<p class="no-results">Erreur de chargement.</p>';
        return;
    }

    allPlayers = players || [];
    renderPlayers(allPlayers);
}

// Filtrer les joueurs
function filterPlayers() {
    const continent = continentFilter.value;
    const category = categoryFilter.value;
    const search = countrySearch.value.toLowerCase().trim();

    const filtered = allPlayers.filter(p => {
        const matchContinent = continent === 'all' || p.continent === continent;
        const matchCategory = category === 'all' || p.cat === category;
        const matchSearch = !search || p.pays.toLowerCase().includes(search) || p.nom.toLowerCase().includes(search);
        return matchContinent && matchCategory && matchSearch;
    });

    renderPlayers(filtered);
}

// Afficher les joueurs
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
                    <img src="${p.img}" alt="${p.nom}" onerror="this.src='public/img/player-placeholder.jpg'">
                    <span class="card-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="card-content">
                    <h3>${p.nom}</h3>
                    <p>${p.poste}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${p.pays}</span>
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

// Écouteurs d'événements
searchBtn.addEventListener('click', filterPlayers);
continentFilter.addEventListener('change', filterPlayers);
categoryFilter.addEventListener('change', filterPlayers);
countrySearch.addEventListener('input', filterPlayers);

// Chargement initial
loadAllPlayers();
