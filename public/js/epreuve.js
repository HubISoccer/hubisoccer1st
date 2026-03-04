// public/js/epreuve.js – Version avec déverrouillage automatique via sessionStorage
console.log("✅ epreuve.js chargé");

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Récupérer l'ID depuis l'URL (en cas de redirection directe)
const urlParams = new URLSearchParams(window.location.search);
const urlUserId = urlParams.get('id');

// Si une autorisation est déjà en session, on déverrouille immédiatement
if (sessionStorage.getItem('epreuve_unlocked')) {
    document.getElementById('unlockOverlay').style.display = 'none';
    document.getElementById('mainContent').classList.remove('blurred');
} else if (urlUserId) {
    // Si on arrive avec un ID dans l'URL mais sans autorisation, on tente de valider directement
    (async () => {
        const { data, error } = await supabaseClient
            .from('inscriptions')
            .select('id, statut')
            .eq('id', urlUserId)
            .single();
        if (!error && data && data.statut === 'valide') {
            // Vérifier aussi qu'il n'a pas déjà soumis
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
            } else {
                alert('Vous avez déjà soumis cette épreuve.');
                window.location.href = 'examen.html';
            }
        } else {
            // Si l'ID n'est pas valide, on laisse l'overlay pour saisie manuelle
            console.warn('ID non valide, veuillez saisir votre ID');
        }
    })();
}

// Gestion du bouton de déverrouillage manuel (overlay)
document.getElementById('unlockBtn').addEventListener('click', async () => {
    const id = document.getElementById('unlockId').value.trim();
    if (!id) {
        alert('Veuillez saisir votre ID.');
        return;
    }

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

    // Vérifier s'il n'a pas déjà soumis
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
});

// ===== GESTION DU FORMULAIRE (soumission de l'épreuve) =====
// (le reste du code est inchangé, il utilise sessionStorage.getItem('epreuve_userId'))
