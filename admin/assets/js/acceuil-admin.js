// ===== DONNÉES PAR DÉFAUT =====
const defaultEngagements = [
    {
        titre: "Vérification Académique",
        description: "Obligation de diplôme ou d'apprentissage. Nous luttons contre la précarité des sportifs en fin de carrière."
    },
    {
        titre: "Protection FIFA",
        description: "Intermédiation exclusive via des agents licenciés. Respect strict du règlement sur le transfert des mineurs."
    },
    {
        titre: "Audit APDP",
        description: "Vos données et celles des joueurs sont protégées selon les lois de la République du Bénin."
    }
];

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
if (!localStorage.getItem('engagements')) {
    localStorage.setItem('engagements', JSON.stringify(defaultEngagements));
}
if (!localStorage.getItem('roles')) {
    localStorage.setItem('roles', JSON.stringify(defaultRoles));
}

// ===== ÉLÉMENTS DOM =====
const engagementsList = document.getElementById('engagementsList');
const rolesList = document.getElementById('rolesList');

// Éléments pour la modale Engagement
const engagementModal = document.getElementById('engagementModal');
const engagementModalTitle = document.getElementById('engagementModalTitle');
const engagementForm = document.getElementById('engagementForm');
const engagementId = document.getElementById('engagementId');
const engagementTitre = document.getElementById('engagementTitre');
const engagementDescription = document.getElementById('engagementDescription');

// Éléments pour la modale Rôle
const roleModal = document.getElementById('roleModal');
const roleModalTitle = document.getElementById('roleModalTitle');
const roleForm = document.getElementById('roleForm');
const roleId = document.getElementById('roleId');
const roleTitre = document.getElementById('roleTitre');
const roleDescription = document.getElementById('roleDescription');
const roleLien = document.getElementById('roleLien');
const roleIcone = document.getElementById('roleIcone');

// ===== FONCTIONS POUR LES ENGAGEMENTS =====
function loadEngagements() {
    const engagements = JSON.parse(localStorage.getItem('engagements')) || [];
    let html = '';
    engagements.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.titre}</strong><br>
                    <small>${item.description}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editEngagement(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteEngagement(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    engagementsList.innerHTML = html || '<p class="no-data">Aucun engagement.</p>';
}

function openAddEngagementModal() {
    engagementModalTitle.textContent = 'Ajouter un engagement';
    engagementId.value = '';
    engagementTitre.value = '';
    engagementDescription.value = '';
    engagementModal.classList.add('active');
}

window.editEngagement = (index) => {
    const engagements = JSON.parse(localStorage.getItem('engagements'));
    const item = engagements[index];
    engagementModalTitle.textContent = 'Modifier un engagement';
    engagementId.value = index;
    engagementTitre.value = item.titre;
    engagementDescription.value = item.description;
    engagementModal.classList.add('active');
};

window.deleteEngagement = (index) => {
    if (!confirm('Supprimer cet engagement ?')) return;
    const engagements = JSON.parse(localStorage.getItem('engagements'));
    engagements.splice(index, 1);
    localStorage.setItem('engagements', JSON.stringify(engagements));
    loadEngagements();
};

engagementForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = engagementId.value;
    const titre = engagementTitre.value;
    const description = engagementDescription.value;
    const engagements = JSON.parse(localStorage.getItem('engagements')) || [];

    const newItem = { titre, description };

    if (index === '') {
        engagements.push(newItem);
    } else {
        engagements[index] = newItem;
    }
    localStorage.setItem('engagements', JSON.stringify(engagements));
    closeModal('engagement');
    loadEngagements();
});

// ===== FONCTIONS POUR LES RÔLES =====
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

function openAddRoleModal() {
    roleModalTitle.textContent = 'Ajouter un rôle';
    roleId.value = '';
    roleTitre.value = '';
    roleDescription.value = '';
    roleLien.value = '';
    roleIcone.value = '';
    roleModal.classList.add('active');
}

window.editRole = (index) => {
    const roles = JSON.parse(localStorage.getItem('roles'));
    const item = roles[index];
    roleModalTitle.textContent = 'Modifier un rôle';
    roleId.value = index;
    roleTitre.value = item.titre;
    roleDescription.value = item.description;
    roleLien.value = item.lien;
    roleIcone.value = item.icone;
    roleModal.classList.add('active');
};

window.deleteRole = (index) => {
    if (!confirm('Supprimer ce rôle ?')) return;
    const roles = JSON.parse(localStorage.getItem('roles'));
    roles.splice(index, 1);
    localStorage.setItem('roles', JSON.stringify(roles));
    loadRoles();
};

roleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = roleId.value;
    const titre = roleTitre.value;
    const description = roleDescription.value;
    const lien = roleLien.value;
    const icone = roleIcone.value;
    const roles = JSON.parse(localStorage.getItem('roles')) || [];

    const newItem = { titre, description, lien, icone };

    if (index === '') {
        roles.push(newItem);
    } else {
        roles[index] = newItem;
    }
    localStorage.setItem('roles', JSON.stringify(roles));
    closeModal('role');
    loadRoles();
});

// ===== GESTION DES MODALES =====
window.closeModal = (type) => {
    if (type === 'engagement') {
        engagementModal.classList.remove('active');
    } else if (type === 'role') {
        roleModal.classList.remove('active');
    }
};

// Boutons d'ajout
document.getElementById('addEngagementBtn').addEventListener('click', openAddEngagementModal);
document.getElementById('addRoleBtn').addEventListener('click', openAddRoleModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadEngagements();
loadRoles();