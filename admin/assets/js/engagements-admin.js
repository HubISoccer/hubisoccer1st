// Données par défaut
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

// Initialiser localStorage si vide
if (!localStorage.getItem('engagements')) {
    localStorage.setItem('engagements', JSON.stringify(defaultEngagements));
}

// Éléments DOM
const engagementsList = document.getElementById('engagementsList');
const modal = document.getElementById('engagementModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('engagementForm');
const idInput = document.getElementById('engagementId');
const titreInput = document.getElementById('titre');
const descriptionInput = document.getElementById('description');

// Charger et afficher les engagements
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

// Ouvrir la modale pour ajouter
function openAddModal() {
    modalTitle.textContent = 'Ajouter un engagement';
    idInput.value = '';
    titreInput.value = '';
    descriptionInput.value = '';
    modal.classList.add('active');
}

// Ouvrir la modale pour éditer
window.editEngagement = (index) => {
    const engagements = JSON.parse(localStorage.getItem('engagements'));
    const item = engagements[index];
    modalTitle.textContent = 'Modifier un engagement';
    idInput.value = index;
    titreInput.value = item.titre;
    descriptionInput.value = item.description;
    modal.classList.add('active');
};

// Fermer la modale
window.closeModal = () => {
    modal.classList.remove('active');
};

// Supprimer un engagement
window.deleteEngagement = (index) => {
    if (!confirm('Supprimer cet engagement ?')) return;
    const engagements = JSON.parse(localStorage.getItem('engagements'));
    engagements.splice(index, 1);
    localStorage.setItem('engagements', JSON.stringify(engagements));
    loadEngagements();
};

// Gestion du formulaire
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = idInput.value;
    const titre = titreInput.value;
    const description = descriptionInput.value;
    const engagements = JSON.parse(localStorage.getItem('engagements')) || [];

    const newItem = { titre, description };

    if (index === '') {
        // Ajout
        engagements.push(newItem);
    } else {
        // Modification
        engagements[index] = newItem;
    }

    localStorage.setItem('engagements', JSON.stringify(engagements));
    closeModal();
    loadEngagements();
});

// Bouton d'ajout
document.getElementById('addEngagementBtn').addEventListener('click', openAddModal);

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadEngagements();