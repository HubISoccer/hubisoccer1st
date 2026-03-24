// ===== RÉCUPÉRATION DE L'ID DU MATCH =====
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get('match');

if (!matchId) {
    window.location.href = 'tournaments-list.html';
}

let matchData = null;
let reports = [];

// ===== CHARGEMENT DES INFOS DU MATCH =====
async function loadMatch() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select(`
            *,
            home_team:home_team_id (id, name),
            away_team:away_team_id (id, name),
            tournament:tournament_id (name)
        `)
        .eq('id', matchId)
        .single();
    if (error) {
        console.error(error);
        showToast('Erreur chargement match', 'error');
        return;
    }
    matchData = data;
    document.getElementById('matchTeams').textContent = `${matchData.home_team?.name || '?'} vs ${matchData.away_team?.name || '?'}`;
    document.getElementById('matchDate').textContent = new Date(matchData.match_date).toLocaleString('fr-FR');
    document.getElementById('matchLocation').textContent = matchData.location || 'Lieu non précisé';
}

// ===== CHARGEMENT DES RAPPORTS =====
async function loadReports() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_reports')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement rapports', 'error');
        return;
    }
    reports = data || [];
    renderReports();
}

function renderReports() {
    const container = document.getElementById('reportsList');
    if (!reports.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><p>Aucun rapport disponible pour ce match</p></div>';
        document.getElementById('exportButtons').style.display = 'none';
        return;
    }
    container.innerHTML = reports.map(report => {
        let typeLabel = '';
        switch (report.report_type) {
            case 'referee': typeLabel = 'Rapport arbitre'; break;
            case 'commissioner': typeLabel = 'Rapport commissaire'; break;
            case 'medical': typeLabel = 'Rapport médical'; break;
            default: typeLabel = report.report_type;
        }
        let contentHtml = '';
        if (report.content) {
            contentHtml = `<pre>${escapeHtml(JSON.stringify(report.content, null, 2))}</pre>`;
        }
        return `
            <div class="report-card">
                <div class="report-header">
                    <div class="report-type">${escapeHtml(typeLabel)}</div>
                    <div class="report-date">${new Date(report.created_at).toLocaleString('fr-FR')}</div>
                </div>
                <div class="report-content">
                    ${contentHtml}
                    ${report.file_url ? `<a href="${report.file_url}" target="_blank" class="btn-view-report"><i class="fas fa-download"></i> Télécharger le fichier joint</a>` : ''}
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('exportButtons').style.display = 'flex';
}

// ===== EXPORT EN WORD (HTML -> .doc) =====
function exportToWord() {
    const content = generateExportHtml();
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_match_${matchId}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export Word lancé', 'success');
}

// ===== EXPORT EN EXCEL (HTML -> .xls) =====
function exportToExcel() {
    const content = generateExportHtml();
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_match_${matchId}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export Excel lancé', 'success');
}

// ===== EXPORT EN PDF =====
function exportToPdf() {
    const element = document.createElement('div');
    element.innerHTML = generateExportHtml();
    element.style.padding = '20px';
    element.style.fontFamily = 'Poppins, sans-serif';
    document.body.appendChild(element);
    html2pdf().from(element).set({
        margin: 0.5,
        filename: `rapport_match_${matchId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).save().then(() => {
        document.body.removeChild(element);
    }).catch(err => {
        console.error(err);
        showToast('Erreur export PDF', 'error');
        document.body.removeChild(element);
    });
}

function generateExportHtml() {
    if (!matchData) return '<p>Données du match non disponibles</p>';
    const homeTeam = matchData.home_team?.name || 'Domicile';
    const awayTeam = matchData.away_team?.name || 'Extérieur';
    const matchDate = new Date(matchData.match_date).toLocaleString('fr-FR');
    const location = matchData.location || 'Non spécifié';
    const tournament = matchData.tournament?.name || 'Tournoi inconnu';
    let reportsHtml = '';
    reports.forEach(report => {
        let typeLabel = '';
        switch (report.report_type) {
            case 'referee': typeLabel = 'Rapport arbitre'; break;
            case 'commissioner': typeLabel = 'Rapport commissaire'; break;
            case 'medical': typeLabel = 'Rapport médical'; break;
            default: typeLabel = report.report_type;
        }
        let contentStr = '';
        if (report.content) {
            contentStr = JSON.stringify(report.content, null, 2);
        }
        reportsHtml += `
            <div style="margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
                <h3 style="color: #551B8C;">${escapeHtml(typeLabel)}</h3>
                <p><strong>Date du rapport :</strong> ${new Date(report.created_at).toLocaleString('fr-FR')}</p>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">${escapeHtml(contentStr)}</pre>
                ${report.file_url ? `<p><strong>Fichier joint :</strong> <a href="${report.file_url}">Télécharger</a></p>` : ''}
            </div>
        `;
    });
    if (!reportsHtml) reportsHtml = '<p>Aucun rapport disponible pour ce match.</p>';
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Rapport du match - ${homeTeam} vs ${awayTeam}</title>
            <style>
                body { font-family: 'Poppins', sans-serif; margin: 20px; }
                h1 { color: #551B8C; }
                h2 { color: #3d1266; margin-top: 20px; }
                .match-info { background: #f9f9ff; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
                .match-info p { margin: 5px 0; }
                pre { white-space: pre-wrap; font-family: monospace; }
                hr { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>Rapport de match</h1>
            <div class="match-info">
                <p><strong>Tournoi :</strong> ${escapeHtml(tournament)}</p>
                <p><strong>Match :</strong> ${escapeHtml(homeTeam)} vs ${escapeHtml(awayTeam)}</p>
                <p><strong>Date :</strong> ${escapeHtml(matchDate)}</p>
                <p><strong>Lieu :</strong> ${escapeHtml(location)}</p>
                <p><strong>Score final :</strong> ${matchData.home_score ?? '-'} - ${matchData.away_score ?? '-'}</p>
            </div>
            <h2>Rapports officiels</h2>
            ${reportsHtml}
            <hr>
            <p style="font-size: 0.8rem; color: #777;">Document généré par HubISoccer le ${new Date().toLocaleString('fr-FR')}</p>
        </body>
        </html>
    `;
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadMatch();
    await loadReports();

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = `match-details.html?id=${matchId}`;
    });
    document.getElementById('exportWordBtn').addEventListener('click', exportToWord);
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPdf);
});
