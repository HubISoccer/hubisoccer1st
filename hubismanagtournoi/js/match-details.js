// ===== match-details.js =====
let currentUser = null;
let currentProfile = null;
let matchId = null;
let tournamentId = null;
let match = null;

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

async function loadMatch() {
    const urlParams = new URLSearchParams(window.location.search);
    matchId = urlParams.get('id');
    tournamentId = urlParams.get('tournament');
    if (!matchId) {
        showToast('Match non spécifié', 'error');
        setTimeout(() => window.location.href = 'accueil_hubisgst.html', 2000);
        return;
    }

    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select(`
            *,
            home_team:gestionnairetournoi_teams!home_team_id(name),
            away_team:gestionnairetournoi_teams!away_team_id(name),
            tournament:gestionnairetournoi_tournaments(name)
        `)
        .eq('id', matchId)
        .single();

    if (error || !data) {
        console.error('Erreur chargement match:', error);
        showToast('Match introuvable', 'error');
        setTimeout(() => window.location.href = 'accueil_hubisgst.html', 2000);
        return;
    }
    match = data;
    renderMatchDetails();
    loadMatchEvents();
    loadMatchReports();
}

function renderMatchDetails() {
    document.getElementById('matchTitle').textContent = `${match.home_team?.name || 'Équipe'} vs ${match.away_team?.name || 'Équipe'}`;
    document.getElementById('matchMeta').innerHTML = `
        <span><i class="fas fa-calendar-alt"></i> ${new Date(match.match_date).toLocaleString()}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${match.location || 'Lieu non spécifié'}</span>
        <span><i class="fas fa-trophy"></i> ${match.tournament?.name || 'Tournoi'}</span>
    `;
    document.getElementById('homeTeamName').textContent = match.home_team?.name || 'Équipe';
    document.getElementById('awayTeamName').textContent = match.away_team?.name || 'Équipe';
    document.getElementById('homeScore').textContent = match.home_score ?? '?';
    document.getElementById('awayScore').textContent = match.away_score ?? '?';
    document.getElementById('matchStatus').textContent = match.status === 'scheduled' ? 'À venir' : (match.status === 'live' ? 'En direct' : 'Terminé');

    const streamContainer = document.getElementById('matchStream');
    if (match.stream_url) {
        let embedUrl = match.stream_url;
        if (match.stream_url.includes('youtube.com/watch') || match.stream_url.includes('youtu.be')) {
            const videoId = match.stream_url.split('v=')[1]?.split('&')[0] || match.stream_url.split('/').pop();
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
        streamContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width:100%; height:300px; border-radius:12px;"></iframe>`;
    } else {
        streamContainer.innerHTML = '<p>Aucun stream disponible pour ce match.</p>';
    }
}

async function loadMatchEvents() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('event_minute', { ascending: true });

    if (error) {
        console.error('Erreur chargement événements:', error);
        showToast('Erreur lors du chargement des événements', 'error');
        return;
    }
    renderMatchEvents(data || []);
}

function renderMatchEvents(events) {
    const container = document.getElementById('matchEvents');
    if (!container) return;
    if (events.length === 0) {
        container.innerHTML = '<p>Aucun événement enregistré.</p>';
        return;
    }
    container.innerHTML = events.map(e => `
        <div class="event-item">
            <span class="event-minute">${e.event_minute}'</span>
            <span class="event-type">${getEventTypeLabel(e.event_type)}</span>
            <span class="event-detail">${e.event_data ? JSON.stringify(e.event_data) : ''}</span>
        </div>
    `).join('');
}

function getEventTypeLabel(type) {
    const map = {
        goal: '⚽ But',
        yellow_card: '🟨 Carton jaune',
        red_card: '🟥 Carton rouge',
        substitution: '🔄 Changement',
        injury: '🩺 Blessure'
    };
    return map[type] || type;
}

async function loadMatchReports() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_reports')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement rapports:', error);
        return;
    }
    renderMatchReports(data || []);
}

function renderMatchReports(reports) {
    const container = document.getElementById('matchReports');
    if (!container) return;
    if (reports.length === 0) {
        container.innerHTML = '<p>Aucun rapport disponible.</p>';
        return;
    }
    container.innerHTML = reports.map(r => `
        <div class="report-item">
            <strong>${r.report_type === 'referee' ? 'Arbitre' : r.report_type === 'commissioner' ? 'Commissaire' : 'Médical'}</strong>
            <pre>${JSON.stringify(r.content, null, 2)}</pre>
            ${r.file_url ? `<a href="${r.file_url}" target="_blank" class="btn-small">Télécharger</a>` : ''}
        </div>
    `).join('');
}

document.getElementById('refreshBtn').addEventListener('click', () => {
    loadMatch();
});

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadMatch();
});