// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const playersList = document.getElementById('playersList');
const modal = document.getElementById('playerModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('playerForm');
const playerId = document.getElementById('playerId');
const nomInput = document.getElementById('nom');
const posteInput = document.getElementById('poste');
const ageInput = document.getElementById('age');
const paysInput = document.getElementById('pays');
const continentSelect = document.getElementById('continent');
const categorieSelect = document.getElementById('categorie');
const clubInput = document.getElementById('club');
const certInput = document.getElementById('cert');
const imgInput = document.getElementById('img');

// Charger les joueurs
async function loadPlayers() {
    const { data: players, error } = await supabaseClient
        .from('joueurs')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        playersList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!players || players.length === 0) {
        playersList.innerHTML = '<p class="no-data">Aucun joueur. Cliquez sur "Ajouter" pour en créer un.</p>';
        return;
    }

    let html = '';
    players.forEach(item => {
        html += `
            <div class="list-item" data-id="${item.id}">
                <div class="info">
                    <strong>${item.nom}</strong>
                    <div class="details">
                        <span>${item.poste}</span>
                        <span>${item.age} ans</span>
                        <span>${item.pays}</span>
                        <span>${item.continent}</span>
                        <span>${item.cat === 'mineur' ? 'U17' : '18+'}</span>
                        <span>${item.club}</span>
                    </div>
                    <small>${item.cert}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editPlayer(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deletePlayer(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    playersList.innerHTML = html;
}

// Ouvrir modale ajout
function openAddModal() {
    modalTitle.textContent = 'Ajouter un joueur';
    playerId.value = '';
    nomInput.value = '';
    posteInput.value = '';
    ageInput.value = '';
    paysInput.value = '';
    continentSelect.value = '';
    categorieSelect.value = '';
    clubInput.value = '';
    certInput.value = '';
    imgInput.value = 'public/img/player-placeholder.jpg';
    modal.classList.add('active');
}

// Éditer un joueur
window.editPlayer = async (id) => {
    const { data: item, error } = await supabaseClient
        .from('joueurs')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur chargement joueur');
        return;
    }

    modalTitle.textContent = 'Modifier un joueur';
    playerId.value = item.id;
    nomInput.value = item.nom;
    posteInput.value = item.poste;
    ageInput.value = item.age;
    paysInput.value = item.pays;
    continentSelect.value = item.continent;
    categorieSelect.value = item.cat;
    clubInput.value = item.club;
    certInput.value = item.cert;
    imgInput.value = item.img;
    modal.classList.add('active');
};

// Supprimer un joueur
window.deletePlayer = async (id) => {
    if (!confirm('Supprimer ce joueur ?')) return;
    const { error } = await supabaseClient
        .from('joueurs')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadPlayers();
    }
};

// Fermer modale
window.closeModal = () => {
    modal.classList.remove('active');
};

// Soumission formulaire
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = playerId.value;
    const nom = nomInput.value;
    const poste = posteInput.value;
    const age = parseInt(ageInput.value);
    const pays = paysInput.value;
    const continent = continentSelect.value;
    const cat = categorieSelect.value;
    const club = clubInput.value;
    const cert = certInput.value;
    const img = imgInput.value;

    if (id === '') {
        // Ajout
        const { error } = await supabaseClient
            .from('joueurs')
            .insert([{ nom, poste, age, pays, continent, cat, club, cert, img }]);
        if (error) {
            alert('Erreur ajout : ' + error.message);
        } else {
            closeModal();
            loadPlayers();
        }
    } else {
        // Modification
        const { error } = await supabaseClient
            .from('joueurs')
            .update({ nom, poste, age, pays, continent, cat, club, cert, img })
            .eq('id', id);
        if (error) {
            alert('Erreur modification : ' + error.message);
        } else {
            closeModal();
            loadPlayers();
        }
    }
});

// Bouton ajout
document.getElementById('addPlayerBtn').addEventListener('click', openAddModal);

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadPlayers();
