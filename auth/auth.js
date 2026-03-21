// auth.js - Fonctions communes d'authentification

const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAuthPrive = supabase.createClient(supabaseUrl, supabaseKey);

// Redirection selon le rôle
async function redirectToDashboard() {
    const { data: { user }, error: userError } = await supabaseAuthPrive.auth.getUser();
    if (userError || !user) {
        window.location.href = '../index.html';
        return;
    }

    const { data: profile, error: profileError } = await supabaseAuthPrive
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error('Erreur récupération rôle', profileError);
        window.location.href = '../index.html';
        return;
    }

    const role = profile.role;
    const roleMap = {
        joueur: '../players/dashboard.html',
        agent: '../agentfifaprive/dashboard.html',
        coach: '../coachprive/dashboard.html',
        academie: '../academies/dashboard.html',
        parrain: '../parrainprive/dashboard.html',
        arbitre: '../arbitral/dashboard.html',
        staff: '../staff/dashboard.html',
        tournoi: '../tournoi/dashboard.html',
        admin: 'admin-dashboard.html'
    };
    const redirectUrl = roleMap[role] || '../index.html';
    window.location.href = redirectUrl;
}

async function checkSessionAndRedirect() {
    const { data: { user } } = await supabaseAuthPrive.auth.getUser();
    if (user) {
        await redirectToDashboard();
    }
}

function showToast(message, type = 'error') {
    alert(message);
}

// Exporter globalement
window.supabaseAuthPrive = supabaseAuthPrive;
window.redirectToDashboard = redirectToDashboard;
window.checkSessionAndRedirect = checkSessionAndRedirect;
window.showToast = showToast;