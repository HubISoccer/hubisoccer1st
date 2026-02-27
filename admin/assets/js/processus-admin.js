// ===== DONNÉES PAR DÉFAUT =====
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

const defaultStats = [
    { nombre: "500+", label: "Talents détectés" },
    { nombre: "120+", label: "Clubs partenaires" },
    { nombre: "30+", label: "Pays représentés" },
    { nombre: "85%", label: "de placement" }
];

// Initialisation localStorage
if (!localStorage.getItem('processus_etapes')) {
    localStorage.setItem('processus_etapes', JSON.stringify(defaultEtapes));
}
if (!localStorage.getItem('processus_stats')) {
    localStorage.setItem('processus_stats', JSON.stringify(defaultStats));
}

// ===== ÉLÉMENTS DOM =====
const etapesList = document.getElementById('etapesList');
const statsList = document.getElementById('statsList');
const modal = document.getElementById('itemModal');
const modalTitle = document.getElementById('modalTitle');
const itemForm = document.getElementById('itemForm');
const itemType = document.getElementById('itemType');
const itemId = document.getElementById('itemId');
const dynamicFields = document.getElementById('dynamicFields');

// ===== FONCTIONS D'AFFICHAGE =====
function loadEtapes() {
    const etapes = JSON.parse(localStorage.getItem('processus_etapes')) || [];
    let html = '';
    etapes.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.titre}</strong>
                    <small>${item.description}</small>
                    <div class="stat-details">Icône: ${item.icone}</div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('etape', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('etape', ${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    etapesList.innerHTML = html || '<p class="no-data">Aucune étape.</p>';
}

function loadStats() {
    const stats = JSON.parse(localStorage.getItem('processus_stats')) || [];
    let html = '';
    stats.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.nombre}</strong>
                    <small>${item.label}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('stat', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('stat', ${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    statsList.innerHTML = html || '<p class="no-data">Aucune statistique.</p>';
}

// ===== OUVERTURE MODALE (AJOUT) =====
window.openModal = (type) => {
    itemType.value = type;
    itemId.value = '';
    let title = '';
    let fields = '';

    if (type === 'etape') {
        title = 'Ajouter une étape';
        fields = `
            <div class="form-group">
                <label>Titre</label>
                <input type="text" id="titre" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="description" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>Icône (classe FontAwesome, ex: fa-user-plus)</label>
                <input type="text" id="icone" value="fa-user-plus" required>
            </div>
        `;
    } else if (type === 'stat') {
        title = 'Ajouter une statistique';
        fields = `
            <div class="form-group">
                <label>Valeur (ex: 500+)</label>
                <input type="text" id="nombre" required>
            </div>
            <div class="form-group">
                <label>Label (ex: Talents détectés)</label>
                <input type="text" id="label" required>
            </div>
        `;
    }

    modalTitle.textContent = title;
    dynamicFields.innerHTML = fields;
    modal.classList.add('active');
};

// ===== ÉDITION =====
window.editItem = (type, index) => {
    let data;
    if (type === 'etape') {
        data = JSON.parse(localStorage.getItem('processus_etapes'))[index];
    } else {
        data = JSON.parse(localStorage.getItem('processus_stats'))[index];
    }

    itemType.value = type;
    itemId.value = index;
    let title = type === 'etape' ? 'Modifier une étape' : 'Modifier une statistique';
    let fields = '';

    if (type === 'etape') {
        fields = `
            <div class="form-group">
                <label>Titre</label>
                <input type="text" id="titre" value="${data.titre}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="description" rows="3" required>${data.description}</textarea>
            </div>
            <div class="form-group">
                <label>Icône</label>
                <input type="text" id="icone" value="${data.icone}" required>
            </div>
        `;
    } else {
        fields = `
            <div class="form-group">
                <label>Valeur</label>
                <input type="text" id="nombre" value="${data.nombre}" required>
            </div>
            <div class="form-group">
                <label>Label</label>
                <input type="text" id="label" value="${data.label}" required>
            </div>
        `;
    }

    modalTitle.textContent = title;
    dynamicFields.innerHTML = fields;
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deleteItem = (type, index) => {
    if (!confirm('Supprimer cet élément ?')) return;
    let key = type === 'etape' ? 'processus_etapes' : 'processus_stats';
    let data = JSON.parse(localStorage.getItem(key));
    data.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(data));
    loadEtapes();
    loadStats();
};

// ===== GESTION DU FORMULAIRE =====
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = itemType.value;
    const index = itemId.value;
    let key = type === 'etape' ? 'processus_etapes' : 'processus_stats';
    let data = JSON.parse(localStorage.getItem(key)) || [];

    if (type === 'etape') {
        const titre = document.getElementById('titre').value;
        const description = document.getElementById('description').value;
        const icone = document.getElementById('icone').value;
        const newItem = { titre, description, icone };

        if (index === '') {
            data.push(newItem);
        } else {
            data[index] = newItem;
        }
    } else {
        const nombre = document.getElementById('nombre').value;
        const label = document.getElementById('label').value;
        const newItem = { nombre, label };

        if (index === '') {
            data.push(newItem);
        } else {
            data[index] = newItem;
        }
    }

    localStorage.setItem(key, JSON.stringify(data));
    closeModal();
    loadEtapes();
    loadStats();
});

// ===== BOUTONS D'AJOUT =====
document.getElementById('addEtapeBtn').addEventListener('click', () => openModal('etape'));
document.getElementById('addStatBtn').addEventListener('click', () => openModal('stat'));

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadEtapes();
loadStats();