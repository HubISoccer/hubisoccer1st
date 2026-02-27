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
                    <button class="delete" onclick="deleteInscription(${index})" title="Supprimer"><i class="fas fa-trash"></i></button>
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
    const statutClass = statut;
    let statutTexte = statut === 'en_attente' ? 'En attente' : (statut === 'valide' ? 'Validé' : 'Refusé');
    const documents = `${ins.diplomeFileName ? '✅ Diplôme' : '❌ Diplôme'} | ${ins.pieceFileName ? '✅ Pièce d\'identité' : '❌ Pièce'}`;

    // Lien factice pour les documents
    const diplomeLink = ins.diplomeFileName ? '<a href="#" onclick="alert(\'Fichier non disponible en local\')">📄 Voir le diplôme</a>' : 'Aucun';
    const pieceLink = ins.pieceFileName ? '<a href="#" onclick="alert(\'Fichier non disponible en local\')">📄 Voir la pièce</a>' : 'Aucun';

    modalDetails.innerHTML = `
        <div class="modal-details-grid">
            <div class="detail-item"><span class="detail-icon">🆔</span> <strong>ID :</strong> ${ins.id}</div>
            <div class="detail-item"><span class="detail-icon">👤</span> <strong>Nom :</strong> ${ins.nom}</div>
            <div class="detail-item"><span class="detail-icon">📅</span> <strong>Naissance :</strong> ${ins.dateNaissance}</div>
            <div class="detail-item"><span class="detail-icon">⚽</span> <strong>Poste :</strong> ${ins.poste}</div>
            <div class="detail-item"><span class="detail-icon">📞</span> <strong>Téléphone :</strong> ${ins.telephone}</div>
            <div class="detail-item"><span class="detail-icon">🎓</span> <strong>Diplôme :</strong> ${ins.diplome}</div>
            <div class="detail-item"><span class="detail-icon">🏆</span> <strong>Code tournoi :</strong> ${ins.codeTournoi || '-'}</div>
            <div class="detail-item"><span class="detail-icon">📎</span> <strong>Documents :</strong> ${documents}</div>
            <div class="detail-item"><span class="detail-icon">🔗</span> <strong>Affilié :</strong> ${ins.affilié || '-'}</div>
            <div class="detail-item"><span class="detail-icon">⏰</span> <strong>Soumission :</strong> ${ins.dateSoumission}</div>
        </div>
        <div class="detail-status">
            <strong>Statut :</strong> <span class="status-badge ${statutClass}">${statutTexte}</span>
        </div>
        <div style="margin-top:15px; text-align:center; background:#e9ecef; padding:10px; border-radius:10px;">
            <p><strong>Fichiers :</strong> ${diplomeLink} | ${pieceLink}</p>
            <p style="font-size:0.8rem; color:#6c757d;">(Visualisation non disponible en local)</p>
        </div>
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

    loadInscriptions();
    closeModal();
};

// ===== SUPPRESSION D'UNE INSCRIPTION =====
window.deleteInscription = (index) => {
    if (!confirm('Supprimer définitivement cette inscription ?')) return;
    let inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    inscriptions.splice(index, 1);
    localStorage.setItem('premiers_pas_inscriptions', JSON.stringify(inscriptions));
    loadInscriptions();
    closeModal(); // au cas où la modale serait ouverte
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