// ===== DONNÉES PAR DÉFAUT =====
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

// Initialisation localStorage
if (!localStorage.getItem('scouting_players')) {
    localStorage.setItem('scouting_players', JSON.stringify(defaultPlayers));
}

// ===== ÉLÉMENTS DOM =====
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
const imageInput = document.getElementById('image');

// ===== FONCTIONS D'AFFICHAGE =====
function loadPlayers() {
    const players = JSON.parse(localStorage.getItem('scouting_players')) || [];
    let html = '';
    players.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.name}</strong>
                    <div class="details">
                        <span>${item.pos}</span>
                        <span>${item.age} ans</span>
                        <span>${item.country}</span>
                        <span>${item.continent}</span>
                        <span>${item.cat === 'mineur' ? 'U17' : '18+'}</span>
                        <span>${item.club}</span>
                        <span>${item.cert}</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editPlayer(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deletePlayer(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    playersList.innerHTML = html || '<p class="no-data">Aucun joueur.</p>';
}

// ===== OUVERTURE MODALE AJOUT =====
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
    imageInput.value = 'public/img/player-placeholder.jpg';
    modal.classList.add('active');
}

// ===== ÉDITION =====
window.editPlayer = (index) => {
    const players = JSON.parse(localStorage.getItem('scouting_players'));
    const item = players[index];
    modalTitle.textContent = 'Modifier un joueur';
    playerId.value = index;
    nomInput.value = item.name;
    posteInput.value = item.pos;
    ageInput.value = item.age;
    paysInput.value = item.country;
    continentSelect.value = item.continent;
    categorieSelect.value = item.cat;
    clubInput.value = item.club;
    certInput.value = item.cert;
    imageInput.value = item.img;
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deletePlayer = (index) => {
    if (!confirm('Supprimer ce joueur ?')) return;
    const players = JSON.parse(localStorage.getItem('scouting_players'));
    players.splice(index, 1);
    localStorage.setItem('scouting_players', JSON.stringify(players));
    loadPlayers();
};

// ===== GESTION DU FORMULAIRE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = playerId.value;
    const players = JSON.parse(localStorage.getItem('scouting_players')) || [];

    const newPlayer = {
        id: index === '' ? 'j' + Date.now() : players[index].id,
        name: nomInput.value,
        pos: posteInput.value,
        age: parseInt(ageInput.value),
        country: paysInput.value,
        continent: continentSelect.value,
        cat: categorieSelect.value,
        club: clubInput.value,
        cert: certInput.value,
        img: imageInput.value
    };

    if (index === '') {
        players.push(newPlayer);
    } else {
        players[index] = newPlayer;
    }

    localStorage.setItem('scouting_players', JSON.stringify(players));
    closeModal();
    loadPlayers();
});

// ===== BOUTON D'AJOUT =====
document.getElementById('addPlayerBtn').addEventListener('click', openAddModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadPlayers();