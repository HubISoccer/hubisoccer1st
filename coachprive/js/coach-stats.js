// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
let coachPlayers = [];
let statsData = [];
let currentPlayerId = null;
let currentPeriod = 'week';
let goalsChart = null;
let assistsChart = null;
let minutesChart = null;

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ===== LOADER =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseCoachPrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL COACH =====
async function loadCoachProfile() {
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        currentCoach = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentCoach;
    } catch (err) {
        console.error('❌ Exception loadCoachProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DES JOUEURS SUIVIS =====
async function loadPlayers() {
    const { data, error } = await supabaseCoachPrive
        .from('coach_players')
        .select(`
            id,
            player_id,
            player:player_id (id, full_name, avatar_url, username)
        `)
        .eq('coach_id', currentCoach.id);

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        showToast('Erreur chargement joueurs', 'error');
        return;
    }
    coachPlayers = data || [];
    renderPlayerSelect();
    if (coachPlayers.length > 0 && !currentPlayerId) {
        currentPlayerId = coachPlayers[0].player_id;
    }
    await loadStats();
}

function renderPlayerSelect() {
    const select = document.getElementById('playerSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Sélectionner un joueur</option>';
    coachPlayers.forEach(p => {
        const player = p.player;
        select.innerHTML += `<option value="${player.id}">${player.full_name}</option>`;
    });
    if (currentPlayerId) {
        select.value = currentPlayerId;
    }
    select.addEventListener('change', (e) => {
        currentPlayerId = e.target.value;
        loadStats();
    });
}

// ===== CHARGEMENT DES STATISTIQUES =====
async function loadStats() {
    if (!currentPlayerId) {
        document.getElementById('statsTableBody').innerHTML = '<tr><td colspan="7">Sélectionnez un joueur</td></tr>';
        return;
    }

    showLoader(true);
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_player_stats')
            .select('*')
            .eq('coach_id', currentCoach.id)
            .eq('player_id', currentPlayerId)
            .order('period', { ascending: true });

        if (error) throw error;
        statsData = data || [];
        renderStatsTable();
        updateCharts();
    } catch (err) {
        console.error('Erreur chargement stats:', err);
        showToast('Erreur chargement statistiques', 'error');
    } finally {
        showLoader(false);
    }
}

function renderStatsTable() {
    const tbody = document.getElementById('statsTableBody');
    if (!tbody) return;

    if (statsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Aucune donnée pour ce joueur</td></tr>';
        return;
    }

    tbody.innerHTML = statsData.map(stat => {
        const periodLabel = {
            week: 'Semaine',
            month: 'Mois',
            season: 'Saison'
        }[stat.period] || stat.period;
        return `
            <tr>
                <td>${currentPlayerName()}</td>
                <td>${periodLabel}</td>
                <td>${stat.matches_played || 0}</td>
                <td>${stat.goals || 0}</td>
                <td>${stat.assists || 0}</td>
                <td>${stat.minutes_played || 0}</td>
                <td>${stat.progress_notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

function currentPlayerName() {
    const player = coachPlayers.find(p => p.player_id === currentPlayerId);
    return player?.player?.full_name || 'Joueur';
}

// ===== GRAPHIQUES =====
function updateCharts() {
    if (!statsData.length) return;

    const periods = statsData.map(s => {
        if (s.period === 'week') return 'Semaine';
        if (s.period === 'month') return 'Mois';
        return 'Saison';
    });
    const goals = statsData.map(s => s.goals || 0);
    const assists = statsData.map(s => s.assists || 0);
    const minutes = statsData.map(s => s.minutes_played || 0);

    const ctxGoals = document.getElementById('goalsChart').getContext('2d');
    const ctxAssists = document.getElementById('assistsChart').getContext('2d');
    const ctxMinutes = document.getElementById('minutesChart').getContext('2d');

    if (goalsChart) goalsChart.destroy();
    if (assistsChart) assistsChart.destroy();
    if (minutesChart) minutesChart.destroy();

    goalsChart = new Chart(ctxGoals, {
        type: 'bar',
        data: {
            labels: periods,
            datasets: [{
                label: 'Buts',
                data: goals,
                backgroundColor: '#551B8C',
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });

    assistsChart = new Chart(ctxAssists, {
        type: 'bar',
        data: {
            labels: periods,
            datasets: [{
                label: 'Passes décisives',
                data: assists,
                backgroundColor: '#ffcc00',
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });

    minutesChart = new Chart(ctxMinutes, {
        type: 'line',
        data: {
            labels: periods,
            datasets: [{
                label: 'Minutes jouées',
                data: minutes,
                borderColor: '#551B8C',
                backgroundColor: 'rgba(85,27,140,0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#ffcc00'
            }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });
}

// ===== EXPORT CSV =====
function exportToCSV() {
    if (!statsData.length) {
        showToast('Aucune donnée à exporter', 'warning');
        return;
    }

    const playerName = currentPlayerName();
    const headers = ['Joueur', 'Période', 'Matchs', 'Buts', 'Passes', 'Minutes', 'Progrès'];
    const rows = statsData.map(stat => {
        const periodLabel = {
            week: 'Semaine',
            month: 'Mois',
            season: 'Saison'
        }[stat.period] || stat.period;
        return [
            playerName,
            periodLabel,
            stat.matches_played || 0,
            stat.goals || 0,
            stat.assists || 0,
            stat.minutes_played || 0,
            stat.progress_notes || ''
        ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `stats_${playerName}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Export CSV réussi', 'success');
}

// ===== EXPORT PDF =====
async function exportToPDF() {
    const element = document.getElementById('statsTable');
    if (!element) return;
    const opt = {
        margin: 0.5,
        filename: `stats_${currentPlayerName()}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
    showToast('Export PDF lancé', 'success');
}

// ===== IMPORT CSV =====
function importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
            showToast('Fichier CSV invalide', 'error');
            return;
        }
        const headers = lines[0].split(',');
        const expectedHeaders = ['Joueur', 'Période', 'Matchs', 'Buts', 'Passes', 'Minutes', 'Progrès'];
        if (!expectedHeaders.every(h => headers.includes(h))) {
            showToast('Format CSV non reconnu', 'error');
            return;
        }

        showLoader(true);
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length < 7) continue;
            const period = values[1].trim().toLowerCase();
            const periodMap = { semaine: 'week', mois: 'month', saison: 'season' };
            const periodKey = periodMap[period] || period;
            if (!['week', 'month', 'season'].includes(periodKey)) continue;

            const stats = {
                coach_id: currentCoach.id,
                player_id: currentPlayerId,
                period: periodKey,
                matches_played: parseInt(values[2]) || 0,
                goals: parseInt(values[3]) || 0,
                assists: parseInt(values[4]) || 0,
                minutes_played: parseInt(values[5]) || 0,
                progress_notes: values[6] || null
            };

            const { error } = await supabaseCoachPrive
                .from('coach_player_stats')
                .upsert(stats, { onConflict: 'coach_id,player_id,period' });
            if (!error) imported++;
        }
        showToast(`Import terminé : ${imported} lignes traitées`, 'success');
        await loadStats();
        showLoader(false);
    };
    input.click();
}

// ===== GÉNÉRATION DE RAPPORT =====
async function generateReport() {
    if (!statsData.length) {
        showToast('Aucune donnée pour générer un rapport', 'warning');
        return;
    }
    const previewDiv = document.getElementById('reportPreview');
    const playerName = currentPlayerName();
    const totalGoals = statsData.reduce((s, stat) => s + (stat.goals || 0), 0);
    const totalAssists = statsData.reduce((s, stat) => s + (stat.assists || 0), 0);
    const totalMinutes = statsData.reduce((s, stat) => s + (stat.minutes_played || 0), 0);
    const totalMatches = statsData.reduce((s, stat) => s + (stat.matches_played || 0), 0);

    const html = `
        <h4>Rapport de performance - ${playerName}</h4>
        <p><strong>Périodes analysées :</strong> ${statsData.map(s => s.period).join(', ')}</p>
        <p><strong>Total buts :</strong> ${totalGoals}</p>
        <p><strong>Total passes :</strong> ${totalAssists}</p>
        <p><strong>Total minutes :</strong> ${totalMinutes}</p>
        <p><strong>Total matchs :</strong> ${totalMatches}</p>
        <p><strong>Progression :</strong> ${statsData[statsData.length-1]?.progress_notes || 'Non renseigné'}</p>
        <button id="downloadReportBtn" class="btn-primary" style="margin-top:10px;">Télécharger PDF</button>
    `;
    previewDiv.innerHTML = html;
    previewDiv.style.display = 'block';

    document.getElementById('downloadReportBtn')?.addEventListener('click', async () => {
        const element = document.getElementById('reportPreview');
        const opt = {
            margin: 0.5,
            filename: `rapport_${playerName}_${new Date().toISOString().slice(0,10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    });
}

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!userMenu || !dropdown) return;
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
}

function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    let touchStartX = 0, touchStartY = 0, touchEndX = 0;
    const swipeThreshold = 50;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0 && sidebar.classList.contains('active')) closeSidebarFunc();
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseCoachPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page stats (coach)');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
    if (!currentCoach) return;

    await loadPlayers();

    document.getElementById('periodSelect').addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        loadStats();
    });
    document.getElementById('refreshBtn').addEventListener('click', loadStats);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('importCsvBtn').addEventListener('click', importCSV);
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang = e.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});
