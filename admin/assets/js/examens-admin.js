// ===== ÉLÉMENTS DOM =====
const submissionsList = document.getElementById('submissionsList');
const modal = document.getElementById('correctionModal');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
const correctionForm = document.getElementById('correctionForm');
const submissionId = document.getElementById('submissionId');
const noteQcm = document.getElementById('noteQcm');
const noteRedac = document.getElementById('noteRedac');
const noteFinale = document.getElementById('noteFinale');
const commentaire = document.getElementById('commentaire');

// ===== CHARGEMENT DES SOUMISSIONS =====
function loadSubmissions() {
    const submissions = JSON.parse(localStorage.getItem('exam_submissions')) || [];
    if (submissions.length === 0) {
        submissionsList.innerHTML = '<p class="no-data">Aucune soumission d\'examen.</p>';
        return;
    }

    // Récupérer les inscriptions pour associer les noms
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];

    let html = '';
    submissions.forEach((sub, index) => {
        const player = inscriptions.find(ins => ins.id == sub.playerId) || { nom: 'Inconnu' };
        const statut = sub.statut || 'en_attente';
        const note = sub.note_finale !== null ? `${sub.note_finale}/30` : 'Non noté';
        const statutClass = sub.note_finale !== null ? 'note' : 'en_attente';
        const statutText = sub.note_finale !== null ? 'Noté' : 'En attente';

        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${player.nom}</strong>
                    <div class="details">
                        <span>ID Joueur: ${sub.playerId}</span>
                        <span>Date: ${new Date(sub.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <span class="status ${statutClass}">${statutText} - Note: ${note}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewSubmission(${index})" title="Voir détails"><i class="fas fa-eye"></i></button>
                    ${sub.note_finale === null ? `<button class="correction" onclick="openCorrection(${index})" title="Corriger"><i class="fas fa-pen"></i></button>` : ''}
                    <button class="delete" onclick="deleteSubmission(${index})" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    submissionsList.innerHTML = html;
}

// ===== VOIR DÉTAILS =====
window.viewSubmission = (index) => {
    const submissions = JSON.parse(localStorage.getItem('exam_submissions')) || [];
    const sub = submissions[index];
    if (!sub) return;

    // Récupérer les inscriptions pour le nom
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    const player = inscriptions.find(ins => ins.id == sub.playerId) || { nom: 'Inconnu' };

    // Construire l'affichage des réponses
    const qcmAnswers = sub.qcm.map((val, i) => `Q${i+1}: ${val === '1' ? 'Bonne' : 'Mauvaise'}`).join('<br>');
    const redac1 = sub.redaction[0] || '';
    const redac2 = sub.redaction[1] || '';

    modalDetails.innerHTML = `
        <p><strong>Joueur :</strong> ${player.nom} (ID: ${sub.playerId})</p>
        <p><strong>Date :</strong> ${new Date(sub.date).toLocaleString('fr-FR')}</p>
        <p><strong>Réponses QCM :</strong><br>${qcmAnswers}</p>
        <p><strong>Rédaction 1 :</strong> ${redac1}</p>
        <p><strong>Rédaction 2 :</strong> ${redac2}</p>
        <p><strong>Statut :</strong> ${sub.statut}</p>
        ${sub.note_qcm !== null ? `<p><strong>Note QCM :</strong> ${sub.note_qcm}/10</p>` : ''}
        ${sub.note_redac !== null ? `<p><strong>Note rédaction :</strong> ${sub.note_redac}/20</p>` : ''}
        ${sub.note_finale !== null ? `<p><strong>Note finale :</strong> ${sub.note_finale}/30</p>` : ''}
        ${sub.commentaire ? `<p><strong>Commentaire :</strong> ${sub.commentaire}</p>` : ''}
    `;
    modalTitle.textContent = 'Détails de l\'examen';
    // On cache le formulaire de correction
    correctionForm.style.display = 'none';
    modal.classList.add('active');
};

// ===== OUVERTURE DE LA MODALE DE CORRECTION =====
window.openCorrection = (index) => {
    const submissions = JSON.parse(localStorage.getItem('exam_submissions')) || [];
    const sub = submissions[index];
    if (!sub) return;

    submissionId.value = index;
    noteQcm.value = sub.note_qcm !== null ? sub.note_qcm : '';
    noteRedac.value = sub.note_redac !== null ? sub.note_redac : '';
    noteFinale.value = sub.note_finale !== null ? sub.note_finale : '';
    commentaire.value = sub.commentaire || '';

    // Afficher les détails succincts
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    const player = inscriptions.find(ins => ins.id == sub.playerId) || { nom: 'Inconnu' };
    modalDetails.innerHTML = `
        <p><strong>Joueur :</strong> ${player.nom}</p>
        <p><strong>Date :</strong> ${new Date(sub.date).toLocaleString('fr-FR')}</p>
        <p><strong>Réponses QCM :</strong> ${sub.qcm.filter(v => v === '1').length} bonnes sur 10</p>
        <p><strong>Rédaction 1 :</strong> ${sub.redaction[0].substring(0, 100)}...</p>
        <p><strong>Rédaction 2 :</strong> ${sub.redaction[1].substring(0, 100)}...</p>
    `;
    modalTitle.textContent = 'Corriger l\'examen';
    correctionForm.style.display = 'block';
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
    correctionForm.style.display = 'block'; // rétablir pour la prochaine fois
};

// ===== CALCUL NOTE FINALE =====
noteQcm.addEventListener('input', updateFinalNote);
noteRedac.addEventListener('input', updateFinalNote);

function updateFinalNote() {
    const qcm = parseFloat(noteQcm.value) || 0;
    const redac = parseFloat(noteRedac.value) || 0;
    noteFinale.value = (qcm + redac).toFixed(1);
}

// ===== SOUMISSION DU FORMULAIRE =====
correctionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = submissionId.value;
    const qcm = parseFloat(noteQcm.value);
    const redac = parseFloat(noteRedac.value);
    const finale = qcm + redac;
    const comment = commentaire.value.trim();

    let submissions = JSON.parse(localStorage.getItem('exam_submissions')) || [];
    if (!submissions[index]) return;

    submissions[index].note_qcm = qcm;
    submissions[index].note_redac = redac;
    submissions[index].note_finale = finale;
    submissions[index].commentaire = comment;
    submissions[index].statut = 'note';

    localStorage.setItem('exam_submissions', JSON.stringify(submissions));

    // Si l'examen est réussi (note >= 7 ? on peut définir un seuil), on peut notifier dans suivi.html
    // On peut aussi enregistrer un résultat dans une autre table, mais pour l'instant on reste simple.

    closeModal();
    loadSubmissions();
});

// ===== SUPPRESSION =====
window.deleteSubmission = (index) => {
    if (!confirm('Supprimer cette soumission ?')) return;
    let submissions = JSON.parse(localStorage.getItem('exam_submissions')) || [];
    submissions.splice(index, 1);
    localStorage.setItem('exam_submissions', JSON.stringify(submissions));
    loadSubmissions();
};

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadSubmissions();