let currentUser = null;
let currentProfile = null;
let registrations = [];

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

async function loadRegistrations() {
    showLoader(true);
    try {
        // Récupérer l'ID du joueur correspondant à l'utilisateur connecté
        const { data: player, error: playerError } = await supabaseGestionTournoi
            .from('gestionnairetournoi_players')
            .select('id')
            .eq('user_id', currentProfile.id)
            .maybeSingle();

        if (playerError || !player) {
            registrations = [];
            renderRegistrations();
            showLoader(false);
            return;
        }

        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const searchTerm = document.getElementById('searchTournament')?.value.trim().toLowerCase() || '';

        let query = supabaseGestionTournoi
            .from('gestionnairetournoi_registrations')
            .select(`
                *,
                tournament:gestionnairetournoi_tournaments(
                    id, name, start_date, end_date, location,
                    sport:gestionnairetournoi_sports(name),
                    type:gestionnairetournoi_types(name, label)
                )
            `)
            .eq('player_id', player.id)
            .order('registration_date', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        let registrationsData = data || [];

        if (searchTerm) {
            registrationsData = registrationsData.filter(r =>
                r.tournament?.name?.toLowerCase().includes(searchTerm) ||
                (r.tournament?.location && r.tournament.location.toLowerCase().includes(searchTerm))
            );
        }

        registrations = registrationsData;
        renderRegistrations();
    } catch (error) {
        console.error('Erreur chargement inscriptions:', error);
        showToast('Erreur lors du chargement de vos inscriptions', 'error');
    } finally {
        showLoader(false);
    }
}

function renderRegistrations() {
    const container = document.getElementById('registrationsList');
    if (!container) return;

    if (registrations.length === 0) {
        container.innerHTML = '<p class="no-data">Vous n’êtes inscrit à aucun tournoi pour le moment.</p>';
        return;
    }

    const getStatusLabel = (status) => {
        if (status === 'pending') return 'En attente';
        if (status === 'approved') return 'Approuvé ✅';
        if (status === 'rejected') return 'Rejeté ❌';
        return status;
    };
    const getStatusClass = (status) => {
        if (status === 'pending') return 'status-pending';
        if (status === 'approved') return 'status-approved';
        if (status === 'rejected') return 'status-rejected';
        return '';
    };

    const getTypeLabel = (type) => {
        if (type?.name === 'public_show') return 'Public Show You';
        if (type?.name === 'public_detection') return 'Détection de talents';
        if (type?.name === 'private_hubisoccer') return 'Privé HubISoccer';
        if (type?.name === 'private_simple') return 'Privé simple';
        return 'Tournoi';
    };

    container.innerHTML = registrations.map(r => `
        <div class="tournament-card" data-id="${r.tournament?.id}">
            <div class="tournament-banner">
                <span class="tournament-type">${getTypeLabel(r.tournament?.type)}</span>
                <span class="tournament-sport">${r.tournament?.sport?.name || 'Sport'}</span>
            </div>
            <div class="tournament-info">
                <div class="tournament-name">${escapeHtml(r.tournament?.name || 'Tournoi')}</div>
                <div class="tournament-dates">
                    <i class="fas fa-calendar-alt"></i> ${r.tournament?.start_date ? new Date(r.tournament.start_date).toLocaleDateString() : ''} - ${r.tournament?.end_date ? new Date(r.tournament.end_date).toLocaleDateString() : ''}
                </div>
                <div class="tournament-location">
                    <i class="fas fa-map-marker-alt"></i> ${escapeHtml(r.tournament?.location || 'Lieu non spécifié')}
                </div>
                <div class="tournament-stats">
                    <span><i class="fas fa-tag"></i> Statut : <span class="${getStatusClass(r.status)}">${getStatusLabel(r.status)}</span></span>
                    <span><i class="fas fa-calendar-check"></i> Inscrit le ${new Date(r.registration_date).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.tournament-card').forEach(card => {
        card.addEventListener('click', () => {
            const tournamentId = card.dataset.id;
            if (tournamentId) {
                window.location.href = `tournament-details.html?id=${tournamentId}`;
            }
        });
    });
}

function initMyRegistrations() {
    checkSession().then(async (user) => {
        if (!user) return;
        await loadProfile();
        await loadRegistrations();

        const statusFilter = document.getElementById('statusFilter');
        const searchInput = document.getElementById('searchTournament');

        if (statusFilter) statusFilter.addEventListener('change', loadRegistrations);
        if (searchInput) searchInput.addEventListener('input', loadRegistrations);
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