// ===== ÉLÉMENTS DOM =====
const inscriptionsList = document.getElementById('inscriptionsList');
const modal = document.getElementById('inscriptionModal');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
let currentInscriptionId = null;

// ===== CHARGEMENT DES INSCRIPTIONS =====
function loadInscriptions() {
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    if (inscriptions.length === 0) {
        inscriptionsList.innerHTML = '<p class="no-data">Aucune inscription.</p>';
        return;
    }

    let html = '';
    inscriptions.forEach((ins, index) => {
        const statut = ins.statut || 'en_attente';
        let statutClass = '';
        let statutText = '';
        switch (statut) {
            case 'en_attente':
                statutClass = 'en_attente';
                statutText = 'En attente';
                break;
            case 'valide':
                statutClass = 'valide';
                statutText = 'Validé';
                break;
            case 'refuse':
                statutClass = 'refuse';
                statutText = 'Refusé';
                break;
            default:
                statutClass = 'en_attente';
                statutText = statut;
        }

        html += `
            <div class="list-item" data-id="${ins.id}" data-index="${index}">
                <div class="info">
                    <strong>${ins.nom}</strong>
                    <div class="details">
                        <span>${ins.dateNaissance}</span>
                        <span>${ins.poste}</span>
                        <span>${ins.telephone}</span>
                        <span>${ins.codeTournoi || 'Pas de code'}</span>
                    </div>
                    <span class="status ${statutClass}">${statutText}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewInscription(${index})" title="Voir détails"><i class="fas fa-eye"></i></button>
                    <button class="valid" onclick="updateStatus(${index}, 'valide')" title="Valider"><i class="fas fa-check"></i></button>
                    <button class="reject" onclick="updateStatus(${index}, 'refuse')" title="Rejeter"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    });
    inscriptionsList.innerHTML = html;
}

// ===== VOIR DÉTAILS =====
window.viewInscription = (index) => {
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    const ins = inscriptions[index];
    if (!ins) return;

    currentInscriptionId = ins.id;
    const statut = ins.statut || 'en_attente';
    const documents = `${ins.diplomeFileName ? '✅ Diplôme' : '❌ Diplôme'} | ${ins.pieceFileName ? '✅ Pièce d\'identité' : '❌ Pièce'}`;

    modalDetails.innerHTML = `
        <p><strong>ID :</strong> ${ins.id}</p>
        <p><strong>Nom :</strong> ${ins.nom}</p>
        <p><strong>Date de naissance :</strong> ${ins.dateNaissance}</p>
        <p><strong>Poste :</strong> ${ins.poste}</p>
        <p><strong>Téléphone :</strong> ${ins.telephone}</p>
        <p><strong>Diplôme :</strong> ${ins.diplome}</p>
        <p><strong>Code tournoi :</strong> ${ins.codeTournoi || '-'}</p>
        <p><strong>Documents fournis :</strong> ${documents}</p>
        <p><strong>Affilié :</strong> ${ins.affilié || '-'}</p>
        <p><strong>Date de soumission :</strong> ${ins.dateSoumission}</p>
        <p><strong>Statut :</strong> ${statut}</p>
    `;
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== MISE À JOUR DU STATUT =====
window.updateStatus = (index, newStatut) => {
    if (!confirm(`Passer cette inscription en "${newStatut}" ?`)) return;
    let inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    const oldStatut = inscriptions[index].statut;
    inscriptions[index].statut = newStatut;
    localStorage.setItem('premiers_pas_inscriptions', JSON.stringify(inscriptions));

    // Si validation, incrémenter le compteur de l'affilié
    if (newStatut === 'valide' && inscriptions[index].affilié) {
        const affiliateId = inscriptions[index].affilié;
        let affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];
        const affIndex = affiliates.findIndex(a => a.id === affiliateId);
        if (affIndex !== -1) {
            affiliates[affIndex].count = (affiliates[affIndex].count || 0) + 1;
            localStorage.setItem('affiliates', JSON.stringify(affiliates));
        }
    }

    // Si refusé, on peut éventuellement décrémenter si on avait déjà compté (cas où on change d'avis)
    // Mais on ne gère pas ici.

    loadInscriptions();
    closeModal();
};

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadInscriptions();