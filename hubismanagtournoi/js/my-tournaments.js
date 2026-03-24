let currentUser = null;
let currentProfile = null;
let tournaments = [];
let sports = [];

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

async function loadSports() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_sports')
        .select('id, name')
        .order('name');
    if (error) {
        console.error('Erreur chargement sports:', error);
        return;
    }
    sports = data || [];
    const sportFilter = document.getElementById('sportFilter');
    if (sportFilter) {
        sportFilter.innerHTML = '<option value="all">Tous les sports</option>' +
            sports.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

async function loadTournaments() {
    showLoader(true);
    try {
        const typeFilter = document.getElementById('typeFilter')?.value || 'all';
        const sportFilterVal = document.getElementById('sportFilter')?.value || 'all';
        const searchTerm = document.getElementById('searchTournament')?.value.trim().toLowerCase() || '';

        let query = supabaseGestionTournoi
            .from('gestionnairetournoi_tournaments')
            .select(`
                *,
                sport:gestionnairetournoi_sports(name),
                type:gestionnairetournoi_types(name, label)
            `)
            .eq('created_by', currentProfile.id)
            .order('start_date', { ascending: true });

        if (typeFilter !== 'all') {
            query = query.eq('type_id', typeFilter);
        }
        if (sportFilterVal !== 'all') {
            query = query.eq('sport_id', sportFilterVal);
        }

        const { data, error } = await query;
        if (error) throw error;

        tournaments = data || [];

        if (searchTerm) {
            tournaments = tournaments.filter(t =>
                t.name.toLowerCase().includes(searchTerm) ||
                (t.description && t.description.toLowerCase().includes(searchTerm)) ||
                (t.location && t.location.toLowerCase().includes(searchTerm))
            );
        }

        renderTournaments();
    } catch (error) {
        console.error('Erreur chargement tournois:', error);
        showToast('Erreur lors du chargement de vos tournois', 'error');
    } finally {
        showLoader(false);
    }
}

function renderTournaments() {
    const container = document.getElementById('tournamentsList');
    if (!container) return;

    if (tournaments.length === 0) {
        container.innerHTML = '<p class="no-data">Vous n’avez créé aucun tournoi pour le moment.</p>';
        return;
    }

    const getTypeLabel = (type) => {
        if (type?.name === 'public_show') return 'Public Show You';
        if (type?.name === 'public_detection') return 'Détection de talents';
        if (type?.name === 'private_hubisoccer') return 'Privé HubISoccer';
        if (type?.name === 'private_simple') return 'Privé simple';
        return 'Tournoi';
    };

    container.innerHTML = tournaments.map(t => `
        <div class="tournament-card" data-id="${t.id}">
            <div class="tournament-banner">
                <span class="tournament-type">${getTypeLabel(t.type)}</span>
                <span class="tournament-sport">${t.sport?.name || 'Sport'}</span>
            </div>
            <div class="tournament-info">
                <div class="tournament-name">${escapeHtml(t.name)}</div>
                <div class="tournament-dates">
                    <i class="fas fa-calendar-alt"></i> ${new Date(t.start_date).toLocaleDateString()} - ${new Date(t.end_date).toLocaleDateString()}
                </div>
                <div class="tournament-location">
                    <i class="fas fa-map-marker-alt"></i> ${escapeHtml(t.location || 'Lieu non spécifié')}
                </div>
                <div class="tournament-stats">
                    <span><i class="fas fa-users"></i> Inscriptions</span>
                    <span><i class="fas fa-trophy"></i> ${t.prize_pool ? t.prize_pool.toLocaleString() + ' FCFA' : 'Prime à définir'}</span>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.tournament-card').forEach(card => {
        card.addEventListener('click', () => {
            const tournamentId = card.dataset.id;
            window.location.href = `tournament-details.html?id=${tournamentId}`;
        });
    });
}

function initMyTournaments() {
    checkSession().then(async (user) => {
        if (!user) return;
        await loadProfile();
        await loadSports();
        await loadTournaments();

        const typeFilter = document.getElementById('typeFilter');
        const sportFilter = document.getElementById('sportFilter');
        const searchInput = document.getElementById('searchTournament');

        if (typeFilter) typeFilter.addEventListener('change', loadTournaments);
        if (sportFilter) sportFilter.addEventListener('change', loadTournaments);
        if (searchInput) searchInput.addEventListener('input', loadTournaments);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}