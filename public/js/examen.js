// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
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
            // 1. Vérifier que l'ID existe dans la table des inscriptions
            // Remplacez 'inscriptions' par le nom exact de votre table
            const { data: inscription, error } = await supabase
                .from('inscriptions')
                .select('*')
                .eq('id', playerId) // ou .eq('suivi_id', playerId) selon votre colonne
                .maybeSingle();

            if (error) {
                console.error('Erreur Supabase:', error);
                showError('Erreur de connexion. Veuillez réessayer.');
                return;
            }

            if (!inscription) {
                showError('ID introuvable. Vérifiez votre identifiant.');
                return;
            }

            // 2. Vérifier le statut de l'inscription (doit être 'valide')
            // Adapter le nom de la colonne (ex: 'statut', 'status')
            if (inscription.statut !== 'valide' && inscription.status !== 'valide') {
                showError('Votre inscription doit être validée avant de pouvoir passer l\'examen. Vérifiez votre statut sur la page de suivi.');
                return;
            }

            // 3. (Optionnel) Vérifier que l'utilisateur n'a pas déjà passé l'examen
            // Si vous avez une table exam_results, décommentez et adaptez
            /*
            const { data: existingExam } = await supabase
                .from('exam_results')
                .select('id')
                .eq('inscription_id', playerId)
                .maybeSingle();

            if (existingExam) {
                showError('Vous avez déjà passé cet examen. Vous ne pouvez le passer qu\'une seule fois.');
                return;
            }
            */

            // 4. Tout est bon, on stocke l'ID en session et on redirige vers l'épreuve
            sessionStorage.setItem('currentExamId', playerId);
            window.location.href = `epreuve.html?id=${playerId}`;
        } catch (err) {
            console.error('Erreur:', err);
            showError('Une erreur est survenue. Veuillez réessayer.');
        }
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