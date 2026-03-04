// public/js/epreuve.js – Passage de l'épreuve et soumission
console.log("✅ epreuve.js chargé");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Récupérer l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const urlUserId = urlParams.get('id');

// Vérifier l'autorisation (sessionStorage ou validation directe)
(async function checkAccess() {
    // Si déjà autorisé en session, on affiche le contenu
    if (sessionStorage.getItem('epreuve_unlocked')) {
        document.getElementById('unlockOverlay').style.display = 'none';
        document.getElementById('mainContent').classList.remove('blurred');
        return;
    }

    // Si on a un ID dans l'URL, on tente une validation automatique
    if (urlUserId) {
        try {
            const { data: inscription, error } = await supabaseClient
                .from('inscriptions')
                .select('id, statut')
                .eq('id', urlUserId)
                .maybeSingle();

            if (!error && inscription && inscription.statut === 'valide') {
                // Vérifier qu'il n'a pas déjà soumis
                const { data: existing } = await supabaseClient
                    .from('exam_submissions')
                    .select('id')
                    .eq('playerid', urlUserId)
                    .maybeSingle();

                if (!existing) {
                    sessionStorage.setItem('epreuve_unlocked', 'true');
                    sessionStorage.setItem('epreuve_userId', urlUserId);
                    document.getElementById('unlockOverlay').style.display = 'none';
                    document.getElementById('mainContent').classList.remove('blurred');
                    return;
                }
            }
        } catch (err) {
            console.warn('Erreur validation auto:', err);
        }
    }
    // Sinon, on laisse l'overlay visible
})();

// Bouton de déverrouillage manuel (overlay)
document.getElementById('unlockBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('unlockId').value.trim();
    if (!id) {
        alert('Veuillez saisir votre ID.');
        return;
    }

    try {
        const { data: inscription, error } = await supabaseClient
            .from('inscriptions')
            .select('id, statut')
            .eq('id', id)
            .maybeSingle();

        if (error || !inscription) {
            alert('ID invalide.');
            return;
        }
        if (inscription.statut !== 'valide') {
            alert('Votre inscription doit être validée.');
            return;
        }
        const { data: existing } = await supabaseClient
            .from('exam_submissions')
            .select('id')
            .eq('playerid', id)
            .maybeSingle();

        if (existing) {
            alert('Vous avez déjà soumis cette épreuve.');
            return;
        }

        sessionStorage.setItem('epreuve_unlocked', 'true');
        sessionStorage.setItem('epreuve_userId', id);
        document.getElementById('unlockOverlay').style.display = 'none';
        document.getElementById('mainContent').classList.remove('blurred');
    } catch (err) {
        console.error(err);
        alert('Erreur de connexion.');
    }
});

// ===== SOUMISSION DE L'ÉPREUVE =====
const epreuveForm = document.getElementById('examenForm'); // À adapter si l'ID est différent
if (epreuveForm) {
    epreuveForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = sessionStorage.getItem('epreuve_userId');
        if (!userId) {
            alert('Session expirée. Veuillez repasser par la page d\'examen.');
            window.location.href = 'examen.html';
            return;
        }

        // Récupération des réponses QCM (exemple avec des radios)
        const qcmReponses = {};
        const questions = document.querySelectorAll('.qcm-question'); // Adaptez la classe
        questions.forEach((q, index) => {
            const selected = q.querySelector('input[type=radio]:checked');
            qcmReponses[`q${index+1}`] = selected ? selected.value : null;
        });

        // Récupération de la rédaction
        const redaction = document.getElementById('reponseRedaction')?.value.trim() || '';

        // Validation simple
        if (!redaction) {
            alert('Veuillez remplir la partie rédaction.');
            return;
        }

        try {
            // Insérer dans exam_submissions
            const { data, error } = await supabaseClient
                .from('exam_submissions')
                .insert([{
                    playerid: parseInt(userId), // car bigint
                    qcm: qcmReponses,
                    redaction: redaction,
                    statut: 'en_attente',
                    date: new Date().toISOString()
                }]);

            if (error) throw error;

            // Nettoyer la session et rediriger vers la page de suivi
            sessionStorage.removeItem('epreuve_unlocked');
            sessionStorage.removeItem('epreuve_userId');
            window.location.href = `suivi.html?id=${userId}`; // ou succes.html
        } catch (err) {
            console.error('Erreur soumission:', err);
            alert('Erreur lors de l\'envoi. Veuillez réessayer.');
        }
    });
} else {
    console.error('Formulaire non trouvé');
}