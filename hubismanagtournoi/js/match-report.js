// ===== RÉCUPÉRATION DE L'ID DU MATCH =====
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get('match');

if (!matchId) {
    window.location.href = 'tournaments-list.html';
}

let matchData = null;
let currentUser = null;

// ===== CHARGEMENT DES INFOS DU MATCH =====
async function loadMatchInfo() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select(`
            *,
            tournament:tournament_id (name),
            home_team:home_team_id (id, name),
            away_team:away_team_id (id, name)
        `)
        .eq('id', matchId)
        .single();

    if (error) {
        console.error(error);
        showToast('Erreur lors du chargement du match', 'error');
        return;
    }
    matchData = data;
    document.getElementById('matchTeams').textContent = `${matchData.home_team?.name || '?'} vs ${matchData.away_team?.name || '?'}`;
    document.getElementById('matchDate').textContent = new Date(matchData.match_date).toLocaleString('fr-FR');
    document.getElementById('matchLocation').textContent = matchData.location || 'Lieu non précisé';
}

// ===== GESTION DU TYPE DE RAPPORT =====
function toggleReportForm() {
    const type = document.getElementById('reportType').value;
    document.getElementById('refereeForm').style.display = 'none';
    document.getElementById('commissionerForm').style.display = 'none';
    document.getElementById('medicalForm').style.display = 'none';

    if (type === 'referee') document.getElementById('refereeForm').style.display = 'block';
    else if (type === 'commissioner') document.getElementById('commissionerForm').style.display = 'block';
    else if (type === 'medical') document.getElementById('medicalForm').style.display = 'block';
}

// ===== COLLECTE DES DONNÉES =====
function collectReportData() {
    const type = document.getElementById('reportType').value;
    let content = {};

    if (type === 'referee') {
        content = {
            home_score: parseInt(document.getElementById('homeScore').value) || 0,
            away_score: parseInt(document.getElementById('awayScore').value) || 0,
            yellow_cards_home: document.getElementById('yellowHome').value,
            yellow_cards_away: document.getElementById('yellowAway').value,
            red_cards: document.getElementById('redCards').value,
            remarks: document.getElementById('refereeRemarks').value
        };
    } else if (type === 'commissioner') {
        content = {
            attendance: parseInt(document.getElementById('attendance').value) || 0,
            organization_rating: parseInt(document.getElementById('orgRating').value),
            observations: document.getElementById('commissionerRemarks').value
        };
    } else if (type === 'medical') {
        content = {
            injuries_home: document.getElementById('injuriesHome').value,
            injuries_away: document.getElementById('injuriesAway').value,
            medical_interventions: document.getElementById('medicalInterventions').value,
            advice: document.getElementById('medicalAdvice').value
        };
    }

    return { type, content };
}

// ===== UPLOAD DE FICHIER =====
async function uploadFile(file) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${matchId}_${Date.now()}.${fileExt}`;
    const filePath = `match_reports/${fileName}`;
    const { error, data } = await supabaseGestionTournoi.storage
        .from('documents')
        .upload(filePath, file);
    if (error) {
        console.error(error);
        showToast('Erreur upload fichier', 'error');
        return null;
    }
    const { data: urlData } = supabaseGestionTournoi.storage
        .from('documents')
        .getPublicUrl(filePath);
    return urlData.publicUrl;
}

// ===== SAUVEGARDE DU RAPPORT =====
async function saveReport() {
    const type = document.getElementById('reportType').value;
    if (!type) {
        showToast('Veuillez sélectionner un type de rapport', 'warning');
        return;
    }

    const fileInput = document.getElementById('reportFile');
    const file = fileInput.files[0];
    let fileUrl = null;
    if (file) {
        fileUrl = await uploadFile(file);
        if (!fileUrl) return;
    }

    const { type: reportType, content } = collectReportData();

    const { error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_reports')
        .insert({
            match_id: parseInt(matchId),
            report_type: reportType,
            reporter_id: currentUser?.id || null,
            content: content,
            file_url: fileUrl,
            created_at: new Date().toISOString()
        });

    if (error) {
        console.error(error);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } else {
        showToast('Rapport enregistré avec succès', 'success');
        setTimeout(() => {
            window.location.href = `tournament-details.html?id=${matchData.tournament_id}`;
        }, 2000);
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Récupérer l'utilisateur connecté
    if (window.supabaseAuthPrive) {
        const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
        if (!error && user) currentUser = user;
    }

    await loadMatchInfo();

    document.getElementById('reportType').addEventListener('change', toggleReportForm);
    document.getElementById('submitReport').addEventListener('click', saveReport);
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = `tournament-details.html?id=${matchData?.tournament_id || ''}`;
    });
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = `tournament-details.html?id=${matchData?.tournament_id || ''}`;
    });
});