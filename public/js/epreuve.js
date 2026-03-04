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
    if (sessionStorage.getItem('epreuve_unlocked')) {
        document.getElementById('unlockOverlay').style.display = 'none';
        document.getElementById('mainContent').classList.remove('blurred');
        return;
    }

    if (urlUserId) {
        try {
            const { data: inscription, error } = await supabaseClient
                .from('inscriptions')
                .select('id, statut')
                .eq('id', urlUserId)
                .maybeSingle();

            if (!error && inscription && inscription.statut === 'valide') {
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
// CORRECTION : le formulaire a l'id "quizForm" dans le HTML
const epreuveForm = document.getElementById('quizForm');
if (epreuveForm) {
    epreuveForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = sessionStorage.getItem('epreuve_userId');
        if (!userId) {
            alert('Session expirée. Veuillez repasser par la page d\'examen.');
            window.location.href = 'examen.html';
            return;
        }

        // Récupération des réponses QCM (10 questions)
        const qcmReponses = [];
        for (let i = 1; i <= 10; i++) {
            const radio = document.querySelector(`input[name="q${i}"]:checked`);
            if (!radio) {
                alert(`Veuillez répondre à la question ${i}.`);
                return;
            }
            qcmReponses.push(radio.value);
        }

        // Récupération des rédactions
        const redac1 = document.getElementById('q11')?.value.trim();
        const redac2 = document.getElementById('q12')?.value.trim();
        if (!redac1 || !redac2) {
            alert('Veuillez remplir les deux rédactions.');
            return;
        }

        try {
            // Insérer dans exam_submissions
            const { error } = await supabaseClient
                .from('exam_submissions')
                .insert([{
                    playerid: parseInt(userId),
                    qcm: qcmReponses,
                    redaction: [redac1, redac2],
                    statut: 'en_attente',
                    date: new Date().toISOString()
                }]);

            if (error) throw error;

            // Récupérer les infos de l'inscription pour générer l'ID formaté
            const { data: inscription, error: err2 } = await supabaseClient
                .from('inscriptions')
                .select('datenaissance, pays')
                .eq('id', userId)
                .single();

            if (err2) {
                console.warn('Impossible de récupérer les infos pour l\'ID formaté, on utilise des valeurs par défaut.');
            }

            // Calcul de l'âge
            let age = 18; // valeur par défaut
            if (inscription?.datenaissance) {
                const birth = new Date(inscription.datenaissance);
                const today = new Date();
                age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            }
            const ageStr = age.toString().padStart(3, '0');

            // Code pays (si non disponible, utiliser 'BJ')
            const pays = inscription?.pays || 'BJ';
            const paysCode = pays.substring(0, 2).toUpperCase();

            // 3 derniers chiffres de l'ID
            const idStr = userId.toString();
            const lastThree = idStr.slice(-3);

            // Date du jour
            const today = new Date();
            const day = today.getDate().toString().padStart(2, '0');
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const year = today.getFullYear();

            // Note provisoire (0 en attendant notation)
            const note = '0';

            // ID formaté : XXXHUYYYNMBIZJJMMAAAA
            const hubId = `${lastThree}HU${ageStr}${paysCode}BI${note}${day}${month}${year}`;

            // Nettoyer la session et rediriger vers succes.html
            sessionStorage.removeItem('epreuve_unlocked');
            sessionStorage.removeItem('epreuve_userId');
            window.location.href = `succes.html?id=${encodeURIComponent(hubId)}&realId=${userId}`;
        } catch (err) {
            console.error('Erreur soumission:', err);
            alert('Erreur lors de l\'envoi. Veuillez réessayer.');
        }
    });
} else {
    console.error('Formulaire avec id "quizForm" non trouvé');
}