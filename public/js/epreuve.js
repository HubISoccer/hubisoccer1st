// public/js/epreuve.js – Version avec déverrouillage par ID
console.log("✅ epreuve.js chargé");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Vérifier si déjà déverrouillé dans cette session
if (sessionStorage.getItem('epreuve_unlocked')) {
    document.getElementById('unlockOverlay').style.display = 'none';
    document.getElementById('mainContent').classList.remove('blurred');
}

// Gestion du bouton de déverrouillage
document.getElementById('unlockBtn').addEventListener('click', async () => {
    const id = document.getElementById('unlockId').value.trim();
    if (!id) {
        alert('Veuillez saisir votre ID.');
        return;
    }

    // Vérifier que l'ID existe dans la table 'inscriptions' et que le statut est 'valide'
    const { data, error } = await supabaseClient
        .from('inscriptions')
        .select('id, statut')
        .eq('id', id)
        .single();

    if (error || !data) {
        alert('ID invalide. Vérifiez votre identifiant.');
        return;
    }

    if (data.statut !== 'valide') {
        alert('Votre inscription doit être validée avant de passer l\'épreuve.');
        return;
    }

    // Déverrouiller
    sessionStorage.setItem('epreuve_unlocked', 'true');
    sessionStorage.setItem('epreuve_userId', id);
    document.getElementById('unlockOverlay').style.display = 'none';
    document.getElementById('mainContent').classList.remove('blurred');
});

// ===== GESTION DU FORMULAIRE (soumission de l'épreuve) =====
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
    counter.style.color = words > maxWords ? 'red' : 'var(--gray)';
}

q11.addEventListener('input', () => updateCount(q11, q11Count, 150));
q12.addEventListener('input', () => updateCount(q12, q12Count, 1500));

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Vérifier que l'utilisateur est autorisé
    const userId = sessionStorage.getItem('epreuve_userId');
    if (!userId) {
        alert('Vous devez d\'abord déverrouiller l\'épreuve avec votre ID.');
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

    // Vérifier que l'utilisateur n'a pas déjà soumis une épreuve
    const { data: existing, error: checkError } = await supabaseClient
        .from('exam_submissions')
        .select('id')
        .eq('playerId', userId)
        .maybeSingle();

    if (existing) {
        alert('Vous avez déjà soumis une épreuve. Elle est en cours d\'évaluation.');
        return;
    }

    // Sauvegarder la soumission
    const submission = {
        playerId: userId,
        qcm: [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10],
        redaction: [redac1, redac2],
        date: new Date().toISOString(),
        statut: 'en_attente',
        note_qcm: null,
        note_redac: null,
        note_finale: null
    };

    const { error } = await supabaseClient
        .from('exam_submissions')
        .insert([submission]);

    if (error) {
        console.error('Erreur lors de la soumission:', error);
        alert('Erreur lors de l\'envoi. Veuillez réessayer.');
        return;
    }

    // Supprimer l'autorisation pour éviter de re-soumettre
    sessionStorage.removeItem('epreuve_unlocked');
    sessionStorage.removeItem('epreuve_userId');

    alert('Épreuve soumise avec succès ! Elle sera évaluée dans les prochaines heures.');
    window.location.href = `suivi.html?id=${userId}`;
});