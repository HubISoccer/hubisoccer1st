// Récupérer l'ID depuis l'URL
const params = new URLSearchParams(window.location.search);
const inscriptionId = params.get('id');

// Éléments DOM
const container = document.getElementById('suiviContainer');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editId = document.getElementById('editId');
const editNom = document.getElementById('editNom');
const editDateNaissance = document.getElementById('editDateNaissance');
const editPoste = document.getElementById('editPoste');
const editDiplome = document.getElementById('editDiplome');
const editTelephone = document.getElementById('editTelephone');

// Charger les données
function loadInscription() {
    if (!inscriptionId) {
        container.innerHTML = '<p class="error-message">❌ Aucun identifiant de suivi fourni.</p>';
        return;
    }

    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    const inscription = inscriptions.find(ins => ins.id == inscriptionId);

    if (!inscription) {
        container.innerHTML = '<p class="error-message">❌ Aucune inscription trouvée avec cet identifiant.</p>';
        return;
    }

    renderSuivi(inscription);
}

// Afficher le contenu
function renderSuivi(inscription) {
    const statut = inscription.statut || 'en_attente';
    let statutTexte = '';
    let statutClasse = '';

    switch (statut) {
        case 'en_attente':
            statutTexte = 'En attente de vérification';
            statutClasse = 'en_attente';
            break;
        case 'valide':
            statutTexte = '✅ Validé';
            statutClasse = 'valide';
            break;
        case 'refuse':
            statutTexte = '❌ Refusé';
            statutClasse = 'refuse';
            break;
        default:
            statutTexte = statut;
            statutClasse = '';
    }

    // Récupérer les messages destinés à ce joueur
    const allMessages = JSON.parse(localStorage.getItem('player_messages')) || [];
    const messages = allMessages.filter(m => m.playerId == inscriptionId).sort((a,b) => new Date(b.date) - new Date(a.date));

    // Récupérer le résultat de l'examen (si existant)
    const examResults = JSON.parse(localStorage.getItem('exam_results')) || [];
    const exam = examResults.find(e => e.inscriptionId == inscriptionId);

    // Construire le HTML
    let html = `
        <div class="suivi-card">
            <div class="suivi-header">
                <h1>Mon dossier</h1>
                <span class="status-badge ${statutClasse}">${statutTexte}</span>
            </div>

            <div class="info-section">
                <h2><i class="fas fa-user-circle"></i> Mes informations</h2>
                <div class="info-grid">
                    <div class="info-item"><span class="label">Nom complet</span><span class="value">${inscription.nom || '-'}</span></div>
                    <div class="info-item"><span class="label">Date de naissance</span><span class="value">${inscription.dateNaissance || '-'}</span></div>
                    <div class="info-item"><span class="label">Poste</span><span class="value">${inscription.poste || '-'}</span></div>
                    <div class="info-item"><span class="label">Diplôme</span><span class="value">${inscription.diplome || '-'}</span></div>
                    <div class="info-item"><span class="label">Téléphone</span><span class="value">${inscription.telephone || '-'}</span></div>
                    <div class="info-item"><span class="label">Code tournoi</span><span class="value">${inscription.codeTournoi || '-'}</span></div>
                    <div class="info-item"><span class="label">Documents fournis</span><span class="value">${inscription.diplomeFileName ? '✅ Diplôme' : '❌ Diplôme'} | ${inscription.pieceFileName ? '✅ Pièce' : '❌ Pièce'}</span></div>
                    <div class="info-item"><span class="label">Affilié par</span><span class="value">${inscription.affilié || '-'}</span></div>
                </div>
                ${statut === 'en_attente' ? '<button class="btn-edit" id="editBtn"><i class="fas fa-pen"></i> Modifier mes informations</button>' : ''}
            </div>

            <div class="messages-section">
                <h2><i class="fas fa-bell"></i> Notifications</h2>
                <div class="messages-list" id="messagesList">
                    ${messages.length === 0 ? '<p class="no-messages">Aucune notification.</p>' : ''}
                </div>
            </div>

            <div class="examen-section">
                <h2><i class="fas fa-graduation-cap"></i> Examen</h2>
                <div class="examen-card">
                    <div class="examen-info">
                        ${exam ? `
                            <p>Note obtenue : <span class="note">${exam.note}/10</span></p>
                            <p>Date : ${new Date(exam.date).toLocaleDateString('fr-FR')}</p>
                            <p>Statut : ${exam.note >= 7 ? '✅ Réussi' : '❌ Échoué'}</p>
                        ` : `
                            <p>Vous n'avez pas encore passé l'examen.</p>
                        `}
                    </div>
                    ${statut === 'valide' && !exam ? '<a href="examen.html?id=' + inscriptionId + '" class="btn-examen"><i class="fas fa-play"></i> Passer l\'examen</a>' : ''}
                    ${exam && exam.note >= 7 ? '<a href="succes.html?id=' + inscriptionId + '" class="btn-examen"><i class="fas fa-trophy"></i> Voir mon succès</a>' : ''}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Ajouter les messages dynamiquement
    const messagesList = document.getElementById('messagesList');
    if (messages.length > 0) {
        let messagesHtml = '';
        messages.forEach(msg => {
            messagesHtml += `
                <div class="message-item ${msg.type || 'info'}">
                    <div class="message-content">
                        <p>${msg.message}</p>
                        <span class="message-date">${new Date(msg.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>
            `;
        });
        messagesList.innerHTML = messagesHtml;
    }

    // Gestion du bouton d'édition
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => openEditModal(inscription));
    }
}

// Ouvrir la modale d'édition
function openEditModal(inscription) {
    editId.value = inscription.id;
    editNom.value = inscription.nom || '';
    editDateNaissance.value = inscription.dateNaissance || '';
    editPoste.value = inscription.poste || '';
    editDiplome.value = inscription.diplome || '';
    editTelephone.value = inscription.telephone || '';
    editModal.classList.add('active');
}

// Fermer la modale
window.closeEditModal = () => {
    editModal.classList.remove('active');
};

// Sauvegarder les modifications
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    const index = inscriptions.findIndex(ins => ins.id == id);
    if (index !== -1) {
        inscriptions[index].nom = editNom.value;
        inscriptions[index].dateNaissance = editDateNaissance.value;
        inscriptions[index].poste = editPoste.value;
        inscriptions[index].diplome = editDiplome.value;
        inscriptions[index].telephone = editTelephone.value;
        localStorage.setItem('premiers_pas_inscriptions', JSON.stringify(inscriptions));
        closeEditModal();
        renderSuivi(inscriptions[index]); // Re-rendre la page
    }
});

// Initialisation
document.addEventListener('DOMContentLoaded', loadInscription);