// Données par défaut (liens corrigés : plus de 'public/pages/')
const defaultRoles = [
    {
        titre: "Espace Joueur",
        description: "Gérez votre CV, vos stats et votre visibilité.",
        lien: "premier-pas.html",
        icone: "🏃"
    },
    {
        titre: "Scouting",
        description: "Découvrez les talents vérifiés par nos soins.",
        lien: "scouting.html",
        icone: "💼"
    },
    {
        titre: "Le Processus",
        description: "Comment nous sécurisons votre avenir pro.",
        lien: "processus.html",
        icone: "🛡️"
    }
];

// Initialiser localStorage si vide
if (!localStorage.getItem('roles')) {
    localStorage.setItem('roles', JSON.stringify(defaultRoles));
}

// Éléments DOM
const rolesList = document.getElementById('rolesList');
const modal = document.getElementById('roleModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('roleForm');
const idInput = document.getElementById('roleId');
const titreInput = document.getElementById('titre');
const descriptionInput = document.getElementById('description');
const lienInput = document.getElementById('lien');
const iconeInput = document.getElementById('icone');

// Charger et afficher les rôles
function loadRoles() {
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    let html = '';
    roles.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.titre}</strong>
                    <small>${item.description}</small>
                    <div class="details">Lien: ${item.lien} | Icône: ${item.icone}</div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editRole(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteRole(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    rolesList.innerHTML = html || '<p class="no-data">Aucun rôle.</p>';
}

// Ouvrir la modale pour ajouter
function openAddModal() {
    modalTitle.textContent = 'Ajouter un rôle';
    idInput.value = '';
    titreInput.value = '';
    descriptionInput.value = '';
    lienInput.value = '';
    iconeInput.value = '';
    modal.classList.add('active');
}

// Ouvrir la modale pour éditer
window.editRole = (index) => {
    const roles = JSON.parse(localStorage.getItem('roles'));
    const item = roles[index];
    modalTitle.textContent = 'Modifier un rôle';
    idInput.value = index;
    titreInput.value = item.titre;
    descriptionInput.value = item.description;
    lienInput.value = item.lien;
    iconeInput.value = item.icone;
    modal.classList.add('active');
};

// Fermer la modale
window.closeModal = () => {
    modal.classList.remove('active');
};

// Supprimer un rôle
window.deleteRole = (index) => {
    if (!confirm('Supprimer ce rôle ?')) return;
    const roles = JSON.parse(localStorage.getItem('roles'));
    roles.splice(index, 1);
    localStorage.setItem('roles', JSON.stringify(roles));
    loadRoles();
};

// Gestion du formulaire
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = idInput.value;
    const titre = titreInput.value;
    const description = descriptionInput.value;
    const lien = lienInput.value;
    const icone = iconeInput.value;
    const roles = JSON.parse(localStorage.getItem('roles')) || [];

    const newItem = { titre, description, lien, icone };

    if (index === '') {
        roles.push(newItem);
    } else {
        roles[index] = newItem;
    }

    localStorage.setItem('roles', JSON.stringify(roles));
    closeModal();
    loadRoles();
});

// Bouton d'ajout
document.getElementById('addRoleBtn').addEventListener('click', openAddModal);

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadRoles();