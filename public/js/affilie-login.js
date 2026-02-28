// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('affilieLoginForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const loginId = document.getElementById('loginId').value.trim();
        const password = document.getElementById('password').value.trim();

        // Récupérer l'affilié par son ID
        const { data: affiliate, error } = await supabaseClient
            .from('affiliates')
            .select('*')
            .eq('id', loginId)
            .single();

        if (error || !affiliate) {
            alert('ID d\'affilié non trouvé.');
            return;
        }

        // Vérification du mot de passe (pour l'instant, mot de passe par défaut)
        // Idéalement, il faudrait comparer avec un hash, mais on garde simple pour la démo
        if (password !== 'password123') {
            alert('Mot de passe incorrect. (Utilisez "password123" pour tester)');
            return;
        }

        // Stocker l'affilié connecté dans sessionStorage
        sessionStorage.setItem('currentAffiliate', JSON.stringify(affiliate));

        // Rediriger vers le tableau de bord
        window.location.href = 'affilie-dashboard.html';
    });
});
