document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('quizForm');
    const q11 = document.getElementById('q11');
    const q12 = document.getElementById('q12');
    const q11Count = document.getElementById('q11-count');
    const q12Count = document.getElementById('q12-count');

    // Compteur de mots pour les rédactions
    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    function updateCount(textarea, counter, maxWords) {
        const words = countWords(textarea.value);
        counter.textContent = words + ' mots';
        if (words > maxWords) {
            counter.style.color = 'red';
        } else {
            counter.style.color = 'var(--gray)';
        }
    }

    q11.addEventListener('input', () => updateCount(q11, q11Count, 150));
    q12.addEventListener('input', () => updateCount(q12, q12Count, 1500));

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Récupérer l'ID du joueur depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const playerId = urlParams.get('id');
        if (!playerId) {
            alert('ID joueur manquant. Veuillez reprendre depuis la page examen.');
            window.location.href = 'examen.html';
            return;
        }

        // Vérifier que l'utilisateur n'a pas déjà soumis une épreuve
        const existing = JSON.parse(localStorage.getItem('exam_submissions')) || [];
        if (existing.some(sub => sub.playerId == playerId)) {
            alert('Vous avez déjà soumis une épreuve. Elle est en cours d\'évaluation.');
            window.location.href = `suivi.html?id=${playerId}`;
            return;
        }

        // Récupérer les réponses des QCM
        const q1 = document.querySelector('input[name="q1"]:checked')?.value;
        const q2 = document.querySelector('input[name="q2"]:checked')?.value;
        const q3 = document.querySelector('input[name="q3"]:checked')?.value;
        const q4 = document.querySelector('input[name="q4"]:checked')?.value;
        const q5 = document.querySelector('input[name="q5"]:checked')?.value;
        const q6 = document.querySelector('input[name="q6"]:checked')?.value;
        const q7 = document.querySelector('input[name="q7"]:checked')?.value;
        const q8 = document.querySelector('input[name="q8"]:checked')?.value;
        const q9 = document.querySelector('input[name="q9"]:checked')?.value;
        const q10 = document.querySelector('input[name="q10"]:checked')?.value;

        // Vérifier que toutes les QCM sont répondues
        if (!q1 || !q2 || !q3 || !q4 || !q5 || !q6 || !q7 || !q8 || !q9 || !q10) {
            alert('Veuillez répondre à toutes les questions 1 à 10.');
            return;
        }

        // Vérifier que les rédactions ne sont pas vides
        const redac1 = q11.value.trim();
        const redac2 = q12.value.trim();
        if (!redac1 || !redac2) {
            alert('Veuillez remplir les deux questions rédactionnelles.');
            return;
        }

        // Vérifier les limites de mots
        const words1 = countWords(redac1);
        const words2 = countWords(redac2);
        if (words1 < 25 || words1 > 150) {
            alert('La réponse à la question 11 doit contenir entre 25 et 150 mots.');
            return;
        }
        if (words2 > 1500) {
            alert('La réponse à la question 12 ne doit pas dépasser 1500 mots.');
            return;
        }

        // Sauvegarder la soumission
        const submission = {
            id: Date.now(),
            playerId: playerId,
            qcm: [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10],
            redaction: [redac1, redac2],
            date: new Date().toISOString(),
            statut: 'en_attente', // en attente de notation par l'admin
            note_qcm: null,       // sera rempli par l'admin
            note_redac: null,     // sera rempli par l'admin
            note_finale: null
        };

        let submissions = JSON.parse(localStorage.getItem('exam_submissions')) || [];
        submissions.push(submission);
        localStorage.setItem('exam_submissions', JSON.stringify(submissions));

        // Rediriger vers la page de suivi avec un message
        alert('Épreuve soumise avec succès ! Elle sera évaluée dans les prochaines heures.');
        window.location.href = `suivi.html?id=${playerId}`;
    });
});