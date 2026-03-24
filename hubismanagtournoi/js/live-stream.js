// ===== live-stream.js =====
let currentUser = null;
let currentProfile = null;

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
    let streamUrl = params.get('url');
    const matchId = params.get('match_id');
    const tournamentId = params.get('tournament_id');

    if (streamUrl) {
        return { streamUrl, matchId, tournamentId };
    }

    if (matchId) {
        // Charger le match pour récupérer l'URL de stream
        return { matchId, tournamentId };
    }

    showToast('Aucune source de streaming spécifiée', 'error');
    setTimeout(() => window.location.href = 'accueil_hubisgst.html', 2000);
    return null;
}

function embedStream(url) {
    let embedUrl = url;
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('twitch.tv')) {
        // Exemple: https://player.twitch.tv/?channel=channelname
        if (url.includes('/videos/')) {
            const videoId = url.split('/').pop();
            embedUrl = `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`;
        } else {
            const channel = url.split('/').pop();
            embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
        }
    }
    return `<iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width:100%; height:500px; border-radius:12px;"></iframe>`;
}

async function loadMatchStream(matchId) {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select('stream_url, home_team:gestionnairetournoi_teams!home_team_id(name), away_team:gestionnairetournoi_teams!away_team_id(name), match_date')
        .eq('id', matchId)
        .single();
    if (error || !data) {
        console.error('Erreur chargement match:', error);
        showToast('Match introuvable', 'error');
        return null;
    }
    return data;
}

async function loadTournamentStream(tournamentId) {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select('stream_url, name')
        .eq('id', tournamentId)
        .single();
    if (error || !data) {
        console.error('Erreur chargement tournoi:', error);
        return null;
    }
    return data;
}

async function init() {
    const params = getUrlParams();
    if (!params) return;

    let streamUrl = params.streamUrl;
    let matchInfo = null;
    let tournamentInfo = null;

    if (!streamUrl && params.matchId) {
        matchInfo = await loadMatchStream(params.matchId);
        streamUrl = matchInfo?.stream_url;
    }
    if (!streamUrl && params.tournamentId) {
        tournamentInfo = await loadTournamentStream(params.tournamentId);
        streamUrl = tournamentInfo?.stream_url;
    }

    if (!streamUrl) {
        document.getElementById('streamPlayer').innerHTML = '<div class="no-stream">Aucun stream disponible pour ce contenu.</div>';
        return;
    }

    const playerHtml = embedStream(streamUrl);
    document.getElementById('streamPlayer').innerHTML = playerHtml;

    let infoHtml = '';
    if (matchInfo) {
        infoHtml = `
            <div class="stream-info-content">
                <h3>${matchInfo.home_team?.name} vs ${matchInfo.away_team?.name}</h3>
                <p>Match du ${new Date(matchInfo.match_date).toLocaleString()}</p>
            </div>
        `;
    } else if (tournamentInfo) {
        infoHtml = `
            <div class="stream-info-content">
                <h3>Tournoi : ${tournamentInfo.name}</h3>
                <p>Diffusion en direct</p>
            </div>
        `;
    } else {
        infoHtml = `<div class="stream-info-content"><p>Diffusion en direct</p></div>`;
    }
    document.getElementById('streamInfo').innerHTML = infoHtml;
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await init();
});