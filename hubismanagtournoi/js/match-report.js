// ===== match-report.js =====
let currentUser = null;
let currentProfile = null;
let matchId = null;
let tournamentId = null;

async function checkSession() {
    const { data: { session }, error } = await supabaseGestionTournoi.auth.getSession();
    if (error || !session) {
        window.location.href = '../auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

async function loadProfile() {
    const { data, error } = await supabaseGestionTournoi
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (error) {
        console.error('Erreur chargement profil:', error);
        showToast('Impossible de charger votre profil', 'error');
        return null;
    }
    currentProfile = data;
    document.getElementById('userName').textContent = data.full_name || 'Joueur';
    document.getElementById('userAvatar').src = data.avatar_url || '../public/img/user-default.jpg';
    return currentProfile;
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    matchId = params.get('match_id');
    tournamentId = params.get('tournament_id');
    if (!matchId) {
        showToast('Match non spécifié', 'error');
        setTimeout(() => window.location.href = 'accueil_hubisgst.html', 2000);
        return false;
    }
    return true;
}

async function submitReport(event) {
    event.preventDefault();

    const reportType = document.getElementById('reportType').value;
    const contentRaw = document.getElementById('reportContent').value.trim();
    const fileInput = document.getElementById('reportFile');
    const file = fileInput.files[0];

    if (!contentRaw && !file) {
        showToast('Veuillez saisir du contenu ou joindre un fichier', 'warning');
        return;
    }

    let contentJson = null;
    if (contentRaw) {
        try {
            contentJson = JSON.parse(contentRaw);
        } catch (e) {
            // Si ce n'est pas du JSON valide, on stocke comme texte simple
            contentJson = { text: contentRaw };
        }
    }

    let fileUrl = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `match_${matchId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseGestionTournoi.storage
            .from('match-reports')
            .upload(fileName, file);
        if (uploadError) {
            showToast('Erreur upload : ' + uploadError.message, 'error');
            return;
        }
        const { data: urlData } = supabaseGestionTournoi.storage
            .from('match-reports')
            .getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
    }

    const reportData = {
        match_id: matchId,
        report_type: reportType,
        reporter_id: currentProfile.id,
        content: contentJson,
        file_url: fileUrl
    };

    const button = event.target.querySelector('button[type="submit"]');
    withButtonSpinner(button, async () => {
        const { error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_match_reports')
            .insert(reportData);
        if (error) {
            console.error('Erreur insertion rapport:', error);
            showToast('Erreur lors de l\'enregistrement : ' + error.message, 'error');
            return;
        }
        showToast('Rapport soumis avec succès !', 'success');
        setTimeout(() => {
            window.location.href = `match-details.html?id=${matchId}&tournament=${tournamentId}`;
        }, 1500);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!getUrlParams()) return;

    document.getElementById('matchReportForm').addEventListener('submit', submitReport);
});