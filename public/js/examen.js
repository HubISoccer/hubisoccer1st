// public/js/examen.js – Version corrigée avec passage d'autorisation
document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const form = document.getElementById('examenForm');
    const playerIdInput = document.getElementById('playerId');
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');

    if (idFromUrl) {
        playerIdInput.value = idFromUrl;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const playerId = playerIdInput.value.trim();
        if (!playerId) {
            alert('Veuillez saisir votre ID.');
            return;
        }

        try {
            // 1. Vérifier que l'ID existe dans la table inscriptions et est validé
            const { data: inscription, error: err1 } = await supabase
                .from('inscriptions')
                .select('id, statut')
                .eq('id', playerId)
                .maybeSingle();

            if (err1) throw err1;
            if (!inscription) {
                showError('ID introuvable. Vérifiez votre identifiant.');
                return;
            }
            if (inscription.statut !== 'valide') {
                showError('Votre inscription doit être validée avant de pouvoir passer l\'examen.');
                return;
            }

            // 2. Vérifier que l'utilisateur n'a pas déjà soumis l'examen
            const { data: existing, error: err2 } = await supabase
                .from('exam_submissions')
                .select('id')
                .eq('playerid', playerId)   // Attention : colonne en minuscule
                .maybeSingle();

            if (err2) throw err2;
            if (existing) {
                showError('Vous avez déjà passé cet examen. Vous ne pouvez le passer qu\'une seule fois.');
                return;
            }

            // Tout est bon : on stocke l'autorisation et on redirige
            sessionStorage.setItem('epreuve_unlocked', 'true');
            sessionStorage.setItem('epreuve_userId', playerId);
            window.location.href = `epreuve.html?id=${playerId}`;
        } catch (err) {
            console.error('Erreur:', err);
            showError('Erreur de connexion à la base de données.');
        }
    });

    function showError(message) {
        const oldError = document.querySelector('.error-message');
        if (oldError) oldError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        form.parentNode.insertBefore(errorDiv, form);
    }
});
