// ===== DONNÉES PAR DÉFAUT =====
const defaultPartenaires = [
    {
        id: 'p1',
        nom: 'Académie Diambars',
        description: 'Centre de formation de renom au Sénégal, partenaire pour le suivi des jeunes talents.',
        logo: 'public/img/partenaire-diambars.jpg',
        website: 'https://diambars.org'
    },
    {
        id: 'p2',
        nom: 'Fédération Béninoise de Football',
        description: 'Soutien institutionnel et cadre réglementaire pour nos tournois.',
        logo: 'public/img/partenaire-fbf.jpg',
        website: 'https://febefoot.bj'
    },
    {
        id: 'p3',
        nom: 'Mobile Money Africa',
        description: 'Solution de paiement pour les transactions sur l\'e-market.',
        logo: 'public/img/partenaire-mobilemoney.jpg',
        website: 'https://mobilemoney.africa'
    }
];

// Initialisation localStorage
if (!localStorage.getItem('partenaires')) {
    localStorage.setItem('partenaires', JSON.stringify(defaultPartenaires));
}

// ===== ÉLÉMENTS DOM =====
const partenairesList = document.getElementById('partenairesList');
const modal = document.getElementById('partenaireModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('partenaireForm');
const partenaireId = document.getElementById('partenaireId');
const nomInput = document.getElementById('nom');
const descriptionInput = document.getElementById('description');
const logoInput = document.getElementById('logo');
const websiteInput = document.getElementById('website');

// ===== CHARGEMENT DES PARTENAIRES =====
function loadPartenaires() {
    const partenaires = JSON.parse(localStorage.getItem('partenaires')) || [];
    if (partenaires.length === 0) {
        partenairesList.innerHTML = '<p class="no-data">Aucun partenaire.</p>';
        return;
    }

    let html = '';
    partenaires.forEach((p, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${p.nom}</strong>
                    <div class="details">
                        <span>${p.description.substring(0, 60)}...</span>
                    </div>
                    ${p.website ? `<div class="website"><a href="${p.website}" target="_blank">${p.website}</a></div>` : ''}
                </div>
                <div class="actions">
                    <button class="edit" onclick="editPartenaire(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deletePartenaire(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    partenairesList.innerHTML = html;
}

// ===== OUVERTURE MODALE AJOUT =====
function openAddModal() {
    modalTitle.textContent = 'Ajouter un partenaire';
    partenaireId.value = '';
    nomInput.value = '';
    descriptionInput.value = '';
    logoInput.value = '';
    websiteInput.value = '';
    modal.classList.add('active');
}

// ===== ÉDITION =====
window.editPartenaire = (index) => {
    const partenaires = JSON.parse(localStorage.getItem('partenaires'));
    const p = partenaires[index];
    modalTitle.textContent = 'Modifier un partenaire';
    partenaireId.value = index;
    nomInput.value = p.nom;
    descriptionInput.value = p.description;
    logoInput.value = p.logo || '';
    websiteInput.value = p.website || '';
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deletePartenaire = (index) => {
    if (!confirm('Supprimer ce partenaire ?')) return;
    let partenaires = JSON.parse(localStorage.getItem('partenaires'));
    partenaires.splice(index, 1);
    localStorage.setItem('partenaires', JSON.stringify(partenaires));
    loadPartenaires();
};

// ===== GESTION DU FORMULAIRE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = partenaireId.value;
    let partenaires = JSON.parse(localStorage.getItem('partenaires')) || [];

    const newPartenaire = {
        id: index === '' ? 'p' + Date.now() : partenaires[index].id,
        nom: nomInput.value,
        description: descriptionInput.value,
        logo: logoInput.value,
        website: websiteInput.value
    };

    if (index === '') {
        partenaires.push(newPartenaire);
    } else {
        partenaires[index] = newPartenaire;
    }
    localStorage.setItem('partenaires', JSON.stringify(partenaires));
    closeModal();
    loadPartenaires();
});

// ===== BOUTON D'AJOUT =====
document.getElementById('addPartenaireBtn').addEventListener('click', openAddModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadPartenaires();