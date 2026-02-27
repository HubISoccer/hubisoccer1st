document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('examenForm');
    const playerIdInput = document.getElementById('playerId');
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');

    // Si un ID est présent dans l'URL, on le pré-remplit
    if (idFromUrl) {
        playerIdInput.value = idFromUrl;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const playerId = playerIdInput.value.trim();
        if (!playerId) {
            alert('Veuillez saisir votre ID.');
            return;
        }

        // Vérifier que l'ID correspond à une inscription validée
        const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
        const inscription = inscriptions.find(ins => ins.id == playerId);

        if (!inscription) {
            showError('ID introuvable. Vérifiez votre identifiant.');
            return;
        }

        if (inscription.statut !== 'valide') {
            showError('Votre inscription doit être validée avant de pouvoir passer l\'examen. Vérifiez votre statut sur la page de suivi.');
            return;
        }

        // Vérifier si l'utilisateur n'a pas déjà passé l'examen
        const examResults = JSON.parse(localStorage.getItem('exam_results')) || [];
        const alreadyPassed = examResults.some(exam => exam.inscriptionId == playerId);
        if (alreadyPassed) {
            showError('Vous avez déjà passé cet examen. Vous ne pouvez le passer qu\'une seule fois.');
            return;
        }

        // Tout est bon, on stocke l'ID en session pour l'épreuve et on redirige
        sessionStorage.setItem('currentExamId', playerId);
        window.location.href = `epreuve.html?id=${playerId}`;
    });

    function showError(message) {
        // Supprimer l'ancien message d'erreur s'il existe
        const oldError = document.querySelector('.error-message');
        if (oldError) oldError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        form.parentNode.insertBefore(errorDiv, form);
    }
});