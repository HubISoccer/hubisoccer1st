// ===== live-stream.js =====
// ===== ÉTATS =====
let matches = [];
let currentMatchId = null;
let currentMatch = null;
let eventsSubscription = null;

// ===== CHARGEMENT DES MATCHS =====
async function loadMatches() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select(`
            id,
            match_date,
            stream_url,
            home_score,
            away_score,
            tournament:tournament_id (name),
            home_team:home_team_id (id, name),
            away_team:away_team_id (id, name)
        `)
        .not('stream_url', 'is', null)
        .order('match_date', { ascending: false });
    if (error) {
        console.error(error);
        showToast('Erreur chargement des matchs', 'error');
        return;
    }
    matches = data || [];
    const select = document.getElementById('matchSelect');
    if (!matches.length) {
        select.innerHTML = '<option value="">Aucun match avec flux disponible</option>';
        return;
    }
    select.innerHTML = '<option value="">-- Sélectionnez un match --</option>' +
        matches.map(m => `<option value="${m.id}">${m.home_team?.name} vs ${m.away_team?.name} (${new Date(m.match_date).toLocaleDateString('fr-FR')})</option>`).join('');
    select.addEventListener('change', () => {
        const id = select.value ? parseInt(select.value) : null;
        if (id) {
            loadMatch(id);
        }
    });
}

// ===== CHARGEMENT D'UN MATCH =====
function loadMatch(matchId) {
    currentMatchId = matchId;
    currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;

    // Afficher le stream
    const playerContainer = document.getElementById('playerContainer');
    if (currentMatch.stream_url) {
        // Détecter le type de flux pour adapter l'embed
        let embedUrl = currentMatch.stream_url;
        if (embedUrl.includes('youtube.com/watch') || embedUrl.includes('youtu.be')) {
            // Convertir en embed YouTube
            const videoId = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (embedUrl.includes('twitch.tv')) {
            // Convertir en embed Twitch
            const channel = embedUrl.split('/').pop();
            embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
        }
        playerContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
    } else {
        playerContainer.innerHTML = '<div class="player-placeholder"><i class="fas fa-video-slash"></i><p>Flux non disponible</p></div>';
    }

    // Mettre à jour le scoreboard
    document.getElementById('homeTeamName').textContent = currentMatch.home_team?.name || '?';
    document.getElementById('awayTeamName').textContent = currentMatch.away_team?.name || '?';
    document.getElementById('homeScore').textContent = currentMatch.home_score ?? 0;
    document.getElementById('awayScore').textContent = currentMatch.away_score ?? 0;

    // Charger les statistiques et événements
    loadMatchStats(currentMatchId);
    loadMatchEvents(currentMatchId);
    subscribeToEvents(currentMatchId);
}

// ===== CHARGEMENT DES STATISTIQUES =====
async function loadMatchStats(matchId) {
    // Ici, on peut récupérer les statistiques depuis une table `match_stats` si elle existe.
    // Pour l'instant, on va utiliser des données factices ou des totaux calculés depuis les événements.
    // Pour un vrai projet, on créerait une table `match_stats` avec des champs comme possession, tirs, etc.
    // Pour la démonstration, on met des valeurs par défaut.
    // On pourrait aussi les calculer à partir des événements de match (goal, etc.) mais ce n'est pas exhaustif.
    // On laisse les valeurs par défaut pour l'instant.
    document.getElementById('shotsHome').textContent = '0';
    document.getElementById('shotsAway').textContent = '0';
    document.getElementById('shotsOnTargetHome').textContent = '0';
    document.getElementById('shotsOnTargetAway').textContent = '0';
    document.getElementById('foulsHome').textContent = '0';
    document.getElementById('foulsAway').textContent = '0';
    document.getElementById('cornersHome').textContent = '0';
    document.getElementById('cornersAway').textContent = '0';
    const possessionHome = 50;
    const possessionAway = 50;
    document.querySelector('.possession-home').style.width = `${possessionHome}%`;
    document.querySelector('.possession-home').textContent = `${possessionHome}%`;
    document.querySelector('.possession-away').style.width = `${possessionAway}%`;
    document.querySelector('.possession-away').textContent = `${possessionAway}%`;
}

// ===== CHARGEMENT DES ÉVÉNEMENTS =====
async function loadMatchEvents(matchId) {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_match_events')
        .select(`
            *,
            player:player_id (id, user_id, profiles:user_id (full_name))
        `)
        .eq('match_id', matchId)
        .order('event_minute', { ascending: true });
    if (error) {
        console.error(error);
        renderEvents([]);
        return;
    }
    renderEvents(data || []);
}

function renderEvents(events) {
    const container = document.getElementById('eventsList');
    if (!events.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-futbol"></i><p>Aucun événement pour le moment</p></div>';
        return;
    }
    container.innerHTML = events.map(event => {
        let icon = '';
        let className = '';
        let playerName = event.player?.profiles?.full_name || 'Joueur';
        if (event.event_type === 'goal') {
            icon = '<i class="fas fa-futbol"></i>';
            className = 'event-goal';
        } else if (event.event_type === 'yellow_card') {
            icon = '<i class="fas fa-square"></i>';
            className = 'event-yellow';
        } else if (event.event_type === 'red_card') {
            icon = '<i class="fas fa-square"></i>';
            className = 'event-red';
        } else if (event.event_type === 'substitution') {
            icon = '<i class="fas fa-exchange-alt"></i>';
            className = 'event-substitution';
        } else {
            icon = '<i class="fas fa-info-circle"></i>';
        }
        return `
            <div class="event-item ${className}">
                <div class="event-icon">${icon}</div>
                <div class="event-info">
                    <span class="event-time">${event.event_minute}'</span>
                    <span class="event-player">${escapeHtml(playerName)}</span>
                    ${event.event_data ? `<span class="event-detail">${escapeHtml(JSON.stringify(event.event_data))}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===== SOUSCRIPTION EN TEMPS RÉEL =====
function subscribeToEvents(matchId) {
    if (eventsSubscription) eventsSubscription.unsubscribe();
    eventsSubscription = supabaseGestionTournoi
        .channel(`match-events:${matchId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'gestionnairetournoi_match_events',
            filter: `match_id=eq.${matchId}`
        }, async (payload) => {
            // Ajouter le nouvel événement localement
            const newEvent = payload.new;
            // Récupérer les infos du joueur
            const { data: player, error } = await supabaseGestionTournoi
                .from('gestionnairetournoi_players')
                .select('id, user_id, profiles:user_id (full_name)')
                .eq('id', newEvent.player_id)
                .single();
            if (!error && player) {
                newEvent.player = player;
            }
            const container = document.getElementById('eventsList');
            if (container.innerHTML.includes('Aucun événement')) {
                container.innerHTML = '';
            }
            // Ajouter en haut ou en bas selon l'ordre croissant
            const currentEvents = [...document.querySelectorAll('.event-item')];
            let inserted = false;
            const newMinute = newEvent.event_minute;
            for (let i = 0; i < currentEvents.length; i++) {
                const existingMinute = parseInt(currentEvents[i].querySelector('.event-time')?.innerText?.replace("'", '') || 0);
                if (newMinute < existingMinute) {
                    currentEvents[i].insertAdjacentElement('beforebegin', createEventElement(newEvent, player));
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                container.appendChild(createEventElement(newEvent, player));
            }
            // Optionnel : mettre à jour le scoreboard si l'événement est un but
            if (newEvent.event_type === 'goal') {
                await updateScoreboard(matchId);
            }
        })
        .subscribe();
}

function createEventElement(event, player) {
    let icon = '';
    let className = '';
    let playerName = player?.profiles?.full_name || 'Joueur';
    if (event.event_type === 'goal') {
        icon = '<i class="fas fa-futbol"></i>';
        className = 'event-goal';
    } else if (event.event_type === 'yellow_card') {
        icon = '<i class="fas fa-square"></i>';
        className = 'event-yellow';
    } else if (event.event_type === 'red_card') {
        icon = '<i class="fas fa-square"></i>';
        className = 'event-red';
    } else if (event.event_type === 'substitution') {
        icon = '<i class="fas fa-exchange-alt"></i>';
        className = 'event-substitution';
    } else {
        icon = '<i class="fas fa-info-circle"></i>';
    }
    const div = document.createElement('div');
    div.className = `event-item ${className}`;
    div.innerHTML = `
        <div class="event-icon">${icon}</div>
        <div class="event-info">
            <span class="event-time">${event.event_minute}'</span>
            <span class="event-player">${escapeHtml(playerName)}</span>
            ${event.event_data ? `<span class="event-detail">${escapeHtml(JSON.stringify(event.event_data))}</span>` : ''}
        </div>
    `;
    return div;
}

async function updateScoreboard(matchId) {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_matches')
        .select('home_score, away_score')
        .eq('id', matchId)
        .single();
    if (!error && data) {
        document.getElementById('homeScore').textContent = data.home_score ?? 0;
        document.getElementById('awayScore').textContent = data.away_score ?? 0;
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadMatches();

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'accueil_hubisgst.html';
    });
});
