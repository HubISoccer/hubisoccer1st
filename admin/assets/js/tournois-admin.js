// ===== DONNÉES PAR DÉFAUT =====
const defaultLive = {
    titre: "Détection en direct : Tournoi de Cotonou",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    actif: true,
    viewers: 156,
    likes: 42,
    dislikes: 3
};

const defaultTournois = [
    {
        id: 't1',
        titre: 'Édition Spéciale : Détection Cotonou 2026',
        description: 'Participez au plus grand rassemblement de talents en Afrique de l\'Ouest. Plus de 50 recruteurs internationaux présents.',
        date: '15-20 Mars 2026',
        lieu: 'Stade de l\'Amitié, Bénin',
        categories: 'U17 & 18-23 ans',
        code: 'COTONOU2026',
        image: 'public/img/tou1.jpg',
        badge: 'À venir'
    },
    {
        id: 't2',
        titre: 'Parakou Youth Cup 2026',
        description: 'Un tournoi dédié aux jeunes espoirs du football. Détection par des scouts européens.',
        date: '10-15 Avril 2026',
        lieu: 'Stade Municipal, Parakou',
        categories: 'U15 & U17',
        code: 'PARAKOU2026',
        image: 'public/img/tou2.jpg',
        badge: 'Bientôt'
    },
    {
        id: 't3',
        titre: 'Benin Elite Showcase',
        description: 'Le rendez-vous des meilleurs talents béninois. Avec la participation de clubs professionnels.',
        date: '5-10 Mai 2026',
        lieu: 'Complexe Sportif, Porto-Novo',
        categories: '18-23 ans',
        code: 'ELITE2026',
        image: 'public/img/tou3.jpg',
        badge: 'Complet'
    }
];

// Initialisation localStorage
if (!localStorage.getItem('live_data')) {
    localStorage.setItem('live_data', JSON.stringify(defaultLive));
}
if (!localStorage.getItem('tournois')) {
    localStorage.setItem('tournois', JSON.stringify(defaultTournois));
}

// ===== ÉLÉMENTS DOM =====
const liveInfo = document.getElementById('liveInfo');
const liveModal = document.getElementById('liveModal');
const liveForm = document.getElementById('liveForm');
const liveTitre = document.getElementById('liveTitre');
const liveUrl = document.getElementById('liveUrl');
const liveActif = document.getElementById('liveActif');
const liveViewers = document.getElementById('liveViewers');

const tournoisList = document.getElementById('tournoisList');
const tournoiModal = document.getElementById('tournoiModal');
const tournoiForm = document.getElementById('tournoiForm');
const tournoiId = document.getElementById('tournoiId');
const tournoiModalTitle = document.getElementById('tournoiModalTitle');
const titreInput = document.getElementById('titre');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('date');
const lieuInput = document.getElementById('lieu');
const categoriesInput = document.getElementById('categories');
const codeInput = document.getElementById('code');
const imageInput = document.getElementById('image');
const badgeSelect = document.getElementById('badge');

// ===== FONCTIONS POUR LE LIVE =====
function loadLiveInfo() {
    const live = JSON.parse(localStorage.getItem('live_data')) || defaultLive;
    const statusClass = live.actif ? 'live-active' : 'live-inactive';
    const statusText = live.actif ? 'En direct' : 'Hors ligne';
    liveInfo.innerHTML = `
        <p><strong>Titre :</strong> ${live.titre}</p>
        <p><strong>URL :</strong> <a href="${live.videoUrl}" target="_blank">${live.videoUrl}</a></p>
        <p><strong>Statut :</strong> <span class="${statusClass}">${statusText}</span></p>
        <p><strong>Viewers :</strong> ${live.viewers}</p>
        <p><strong>Likes :</strong> ${live.likes} | <strong>Dislikes :</strong> ${live.dislikes}</p>
    `;
}

function openLiveModal() {
    const live = JSON.parse(localStorage.getItem('live_data')) || defaultLive;
    liveTitre.value = live.titre;
    liveUrl.value = live.videoUrl;
    liveActif.value = live.actif ? 'true' : 'false';
    liveViewers.value = live.viewers;
    liveModal.classList.add('active');
}

window.closeLiveModal = () => {
    liveModal.classList.remove('active');
};

liveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const live = {
        titre: liveTitre.value,
        videoUrl: liveUrl.value,
        actif: liveActif.value === 'true',
        viewers: parseInt(liveViewers.value) || 0,
        likes: defaultLive.likes, // on conserve les likes/dislikes existants si on veut les préserver
        dislikes: defaultLive.dislikes
    };
    localStorage.setItem('live_data', JSON.stringify(live));
    closeLiveModal();
    loadLiveInfo();
});

// ===== FONCTIONS POUR LES TOURNOIS =====
function loadTournois() {
    const tournois = JSON.parse(localStorage.getItem('tournois')) || [];
    let html = '';
    tournois.forEach((t, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${t.titre}</strong>
                    <div class="details">
                        <span>${t.date}</span>
                        <span>${t.lieu}</span>
                        <span>${t.categories}</span>
                        <span>Code: ${t.code}</span>
                    </div>
                    <span class="badge">${t.badge}</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editTournoi(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteTournoi(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    tournoisList.innerHTML = html || '<p class="no-data">Aucun tournoi.</p>';
}

function openAddTournoiModal() {
    tournoiModalTitle.textContent = 'Ajouter un tournoi';
    tournoiId.value = '';
    titreInput.value = '';
    descriptionInput.value = '';
    dateInput.value = '';
    lieuInput.value = '';
    categoriesInput.value = '';
    codeInput.value = '';
    imageInput.value = 'public/img/tou1.jpg';
    badgeSelect.value = 'À venir';
    tournoiModal.classList.add('active');
}

window.editTournoi = (index) => {
    const tournois = JSON.parse(localStorage.getItem('tournois'));
    const t = tournois[index];
    tournoiModalTitle.textContent = 'Modifier un tournoi';
    tournoiId.value = index;
    titreInput.value = t.titre;
    descriptionInput.value = t.description;
    dateInput.value = t.date;
    lieuInput.value = t.lieu;
    categoriesInput.value = t.categories;
    codeInput.value = t.code;
    imageInput.value = t.image;
    badgeSelect.value = t.badge;
    tournoiModal.classList.add('active');
};

window.closeTournoiModal = () => {
    tournoiModal.classList.remove('active');
};

window.deleteTournoi = (index) => {
    if (!confirm('Supprimer ce tournoi ?')) return;
    let tournois = JSON.parse(localStorage.getItem('tournois'));
    tournois.splice(index, 1);
    localStorage.setItem('tournois', JSON.stringify(tournois));
    loadTournois();
};

tournoiForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = tournoiId.value;
    let tournois = JSON.parse(localStorage.getItem('tournois')) || [];

    const newTournoi = {
        id: index === '' ? 't' + Date.now() : tournois[index].id,
        titre: titreInput.value,
        description: descriptionInput.value,
        date: dateInput.value,
        lieu: lieuInput.value,
        categories: categoriesInput.value,
        code: codeInput.value,
        image: imageInput.value,
        badge: badgeSelect.value
    };

    if (index === '') {
        tournois.push(newTournoi);
    } else {
        tournois[index] = newTournoi;
    }
    localStorage.setItem('tournois', JSON.stringify(tournois));
    closeTournoiModal();
    loadTournois();
});

// ===== BOUTONS =====
document.getElementById('editLiveBtn').addEventListener('click', openLiveModal);
document.getElementById('addTournoiBtn').addEventListener('click', openAddTournoiModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadLiveInfo();
loadTournois();