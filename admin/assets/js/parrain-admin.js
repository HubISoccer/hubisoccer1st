// ===== DONNÉES PAR DÉFAUT =====
const defaultJoueurs = [
    {
        id: 'j1',
        nom: 'Koffi B.',
        poste: 'Attaquant',
        region: 'Bénin',
        image: '../public/img/pas1.jpg',
        description: 'Je cherche un parrain pour m’aider à financer ma formation et mon équipement. Objectif : intégrer un centre professionnel.',
        besoin: 'Équipement + frais de formation',
        montant: '150 000 FCFA'
    },
    {
        id: 'j2',
        nom: 'Moussa D.',
        poste: 'Milieu',
        region: 'Sénégal',
        image: '../public/img/pas2.jpg',
        description: 'Je veux participer à un tournoi international mais je n’ai pas les moyens. Aidez-moi à réaliser mon rêve.',
        besoin: 'Frais de voyage et inscription',
        montant: '250 000 FCFA'
    },
    {
        id: 'j3',
        nom: 'Aminata Diallo',
        poste: 'Défenseur',
        region: 'Côte d\'Ivoire',
        image: '../public/img/pas3.jpg',
        description: 'Je suis une jeune footballeuse avec du talent, mais je manque de soutien. Rejoignez-moi dans cette aventure.',
        besoin: 'Soutien financier et moral',
        montant: '100 000 FCFA'
    }
];

const defaultDons = [
    {
        id: 'd1',
        titre: 'Organisation du tournoi de Cotonou',
        region: 'Bénin',
        image: '../public/img/tou1.jpg',
        description: 'Nous organisons un grand tournoi de détection et avons besoin de fonds pour les infrastructures, les repas et l’hébergement des jeunes.',
        besoin: 'Financement partiel',
        objectif: '5 000 000 FCFA',
        collecte: '2 300 000 FCFA'
    },
    {
        id: 'd2',
        titre: 'Rénovation du terrain de Parakou',
        region: 'Bénin',
        image: '../public/img/tou2.jpg',
        description: 'Le terrain municipal est en mauvais état. Aidez-nous à le rénover pour offrir un espace de jeu décent aux jeunes.',
        besoin: 'Dons pour les travaux',
        objectif: '3 000 000 FCFA',
        collecte: '1 200 000 FCFA'
    },
    {
        id: 'd3',
        titre: 'Achat d’équipements pour l’académie',
        region: 'Sénégal',
        image: '../public/img/tou3.jpg',
        description: 'Notre académie manque de ballons, de maillots et de chasubles. Chaque don compte.',
        besoin: 'Équipement sportif',
        objectif: '500 000 FCFA',
        collecte: '210 000 FCFA'
    }
];

const defaultTemoignages = [
    {
        auteur: 'M. Agbodjogbe',
        role: 'Parrain',
        texte: 'J’ai parrainé Koffi il y a 6 mois. Aujourd’hui, il a intégré un centre de formation. Une expérience incroyable !',
        avatar: '../public/img/user-default.jpg'
    },
    {
        auteur: 'A. Salami',
        role: 'Entraîneur',
        texte: 'Grâce aux dons, nous avons pu organiser un tournoi régional qui a révélé plusieurs talents.',
        avatar: '../public/img/user-default.jpg'
    }
];

// Initialisation localStorage
if (!localStorage.getItem('parrain_joueurs')) {
    localStorage.setItem('parrain_joueurs', JSON.stringify(defaultJoueurs));
}
if (!localStorage.getItem('parrain_dons')) {
    localStorage.setItem('parrain_dons', JSON.stringify(defaultDons));
}
if (!localStorage.getItem('parrain_temoignages')) {
    localStorage.setItem('parrain_temoignages', JSON.stringify(defaultTemoignages));
}

// ===== ÉLÉMENTS DOM =====
const joueursList = document.getElementById('joueursList');
const donsList = document.getElementById('donsList');
const temoignagesList = document.getElementById('temoignagesList');
const modal = document.getElementById('itemModal');
const modalTitle = document.getElementById('modalTitle');
const itemForm = document.getElementById('itemForm');
const itemType = document.getElementById('itemType');
const itemId = document.getElementById('itemId');
const dynamicFields = document.getElementById('dynamicFields');

// ===== FONCTIONS D'AFFICHAGE =====
function loadJoueurs() {
    const joueurs = JSON.parse(localStorage.getItem('parrain_joueurs')) || [];
    let html = '';
    joueurs.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.nom}</strong>
                    <div class="details">
                        <span>${item.poste}</span>
                        <span>${item.region}</span>
                        <span>${item.besoin}</span>
                        <span>${item.montant}</span>
                    </div>
                    <small>${item.description.substring(0, 80)}...</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('joueur', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('joueur', ${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    joueursList.innerHTML = html || '<p class="no-data">Aucun joueur.</p>';
}

function loadDons() {
    const dons = JSON.parse(localStorage.getItem('parrain_dons')) || [];
    let html = '';
    dons.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.titre}</strong>
                    <div class="details">
                        <span>${item.region}</span>
                        <span>Objectif: ${item.objectif}</span>
                        <span>Collecté: ${item.collecte}</span>
                    </div>
                    <small>${item.description.substring(0, 80)}...</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('don', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('don', ${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    donsList.innerHTML = html || '<p class="no-data">Aucun appel aux dons.</p>';
}

function loadTemoignages() {
    const temoignages = JSON.parse(localStorage.getItem('parrain_temoignages')) || [];
    let html = '';
    temoignages.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.auteur}</strong> (${item.role})
                    <small>${item.texte}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('temoignage', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('temoignage', ${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    temoignagesList.innerHTML = html || '<p class="no-data">Aucun témoignage.</p>';
}

// ===== OUVERTURE MODALE (AJOUT) =====
window.openModal = (type) => {
    itemType.value = type;
    itemId.value = '';
    let title = '';
    let fields = '';

    if (type === 'joueur') {
        title = 'Ajouter un joueur';
        fields = `
            <div class="form-group"><label>Nom</label><input type="text" id="nom" required></div>
            <div class="form-group"><label>Poste</label><input type="text" id="poste" required></div>
            <div class="form-group"><label>Région</label><input type="text" id="region" required></div>
            <div class="form-group"><label>Image (chemin)</label><input type="text" id="image" placeholder="../public/img/..." required></div>
            <div class="form-group"><label>Description</label><textarea id="description" rows="3" required></textarea></div>
            <div class="form-group"><label>Besoin</label><input type="text" id="besoin" required></div>
            <div class="form-group"><label>Montant</label><input type="text" id="montant" required></div>
        `;
    } else if (type === 'don') {
        title = 'Ajouter un appel aux dons';
        fields = `
            <div class="form-group"><label>Titre</label><input type="text" id="titre" required></div>
            <div class="form-group"><label>Région</label><input type="text" id="region" required></div>
            <div class="form-group"><label>Image (chemin)</label><input type="text" id="image" placeholder="../public/img/..." required></div>
            <div class="form-group"><label>Description</label><textarea id="description" rows="3" required></textarea></div>
            <div class="form-group"><label>Objectif</label><input type="text" id="objectif" required></div>
            <div class="form-group"><label>Collecté</label><input type="text" id="collecte" required></div>
        `;
    } else if (type === 'temoignage') {
        title = 'Ajouter un témoignage';
        fields = `
            <div class="form-group"><label>Auteur</label><input type="text" id="auteur" required></div>
            <div class="form-group"><label>Rôle</label><input type="text" id="role" required></div>
            <div class="form-group"><label>Texte</label><textarea id="texte" rows="3" required></textarea></div>
            <div class="form-group"><label>Avatar (chemin)</label><input type="text" id="avatar" placeholder="../public/img/..." required></div>
        `;
    }

    modalTitle.textContent = title;
    dynamicFields.innerHTML = fields;
    modal.classList.add('active');
};

// ===== ÉDITION =====
window.editItem = (type, index) => {
    let data;
    let key;
    if (type === 'joueur') {
        data = JSON.parse(localStorage.getItem('parrain_joueurs'))[index];
        key = 'parrain_joueurs';
    } else if (type === 'don') {
        data = JSON.parse(localStorage.getItem('parrain_dons'))[index];
        key = 'parrain_dons';
    } else {
        data = JSON.parse(localStorage.getItem('parrain_temoignages'))[index];
        key = 'parrain_temoignages';
    }

    itemType.value = type;
    itemId.value = index;
    let title = type === 'joueur' ? 'Modifier un joueur' : (type === 'don' ? 'Modifier un appel' : 'Modifier un témoignage');
    let fields = '';

    if (type === 'joueur') {
        fields = `
            <div class="form-group"><label>Nom</label><input type="text" id="nom" value="${data.nom}" required></div>
            <div class="form-group"><label>Poste</label><input type="text" id="poste" value="${data.poste}" required></div>
            <div class="form-group"><label>Région</label><input type="text" id="region" value="${data.region}" required></div>
            <div class="form-group"><label>Image</label><input type="text" id="image" value="${data.image}" required></div>
            <div class="form-group"><label>Description</label><textarea id="description" rows="3" required>${data.description}</textarea></div>
            <div class="form-group"><label>Besoin</label><input type="text" id="besoin" value="${data.besoin}" required></div>
            <div class="form-group"><label>Montant</label><input type="text" id="montant" value="${data.montant}" required></div>
        `;
    } else if (type === 'don') {
        fields = `
            <div class="form-group"><label>Titre</label><input type="text" id="titre" value="${data.titre}" required></div>
            <div class="form-group"><label>Région</label><input type="text" id="region" value="${data.region}" required></div>
            <div class="form-group"><label>Image</label><input type="text" id="image" value="${data.image}" required></div>
            <div class="form-group"><label>Description</label><textarea id="description" rows="3" required>${data.description}</textarea></div>
            <div class="form-group"><label>Objectif</label><input type="text" id="objectif" value="${data.objectif}" required></div>
            <div class="form-group"><label>Collecté</label><input type="text" id="collecte" value="${data.collecte}" required></div>
        `;
    } else {
        fields = `
            <div class="form-group"><label>Auteur</label><input type="text" id="auteur" value="${data.auteur}" required></div>
            <div class="form-group"><label>Rôle</label><input type="text" id="role" value="${data.role}" required></div>
            <div class="form-group"><label>Texte</label><textarea id="texte" rows="3" required>${data.texte}</textarea></div>
            <div class="form-group"><label>Avatar</label><input type="text" id="avatar" value="${data.avatar}" required></div>
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
    let key;
    if (type === 'joueur') key = 'parrain_joueurs';
    else if (type === 'don') key = 'parrain_dons';
    else key = 'parrain_temoignages';

    let data = JSON.parse(localStorage.getItem(key));
    data.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(data));
    loadJoueurs();
    loadDons();
    loadTemoignages();
};

// ===== GESTION DU FORMULAIRE =====
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = itemType.value;
    const index = itemId.value;
    let key;
    let newItem = {};

    if (type === 'joueur') {
        key = 'parrain_joueurs';
        newItem = {
            id: index === '' ? Date.now().toString() : JSON.parse(localStorage.getItem(key))[index].id,
            nom: document.getElementById('nom').value,
            poste: document.getElementById('poste').value,
            region: document.getElementById('region').value,
            image: document.getElementById('image').value,
            description: document.getElementById('description').value,
            besoin: document.getElementById('besoin').value,
            montant: document.getElementById('montant').value
        };
    } else if (type === 'don') {
        key = 'parrain_dons';
        newItem = {
            id: index === '' ? Date.now().toString() : JSON.parse(localStorage.getItem(key))[index].id,
            titre: document.getElementById('titre').value,
            region: document.getElementById('region').value,
            image: document.getElementById('image').value,
            description: document.getElementById('description').value,
            objectif: document.getElementById('objectif').value,
            collecte: document.getElementById('collecte').value
        };
    } else {
        key = 'parrain_temoignages';
        newItem = {
            auteur: document.getElementById('auteur').value,
            role: document.getElementById('role').value,
            texte: document.getElementById('texte').value,
            avatar: document.getElementById('avatar').value
        };
    }

    let data = JSON.parse(localStorage.getItem(key)) || [];
    if (index === '') {
        data.push(newItem);
    } else {
        data[index] = newItem;
    }
    localStorage.setItem(key, JSON.stringify(data));
    closeModal();
    loadJoueurs();
    loadDons();
    loadTemoignages();
});

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadJoueurs();
loadDons();
loadTemoignages();