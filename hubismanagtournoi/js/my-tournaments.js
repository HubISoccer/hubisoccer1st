// ===== RÉCUPÉRATION DE L'UTILISATEUR CONNECTÉ =====
let currentUser = null;
let allTournaments = [];
let currentFilter = 'all';

async function getCurrentUser() {
    if (window.supabaseAuthPrive) {
        const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
        if (!error && user) return user;
    }
    return null;
}

// ===== CHARGEMENT DES TOURNOIS CRÉÉS PAR L'UTILISATEUR =====
async function loadMyTournaments() {
    if (!currentUser) return;

    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select(`
            id,
            name,
            description,
            start_date,
            end_date,
            location,
            prize_pool,
            type:type_id (name, label),
            sport:sport_id (name),
            is_active
        `)
        .eq('created_by', currentUser.id)
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Erreur chargement tournois', error);
        document.getElementById('tournamentsList').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erreur de chargement</p></div>';
        return;
    }

    allTournaments = data.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        start_date: t.start_date,
        end_date: t.end_date,
        location: t.location,
        prize_pool: t.prize_pool,
        type: t.type?.label || t.type?.name || 'Tournoi',
        sport: t.sport?.name || 'Non spécifié',
        is_active: t.is_active,
        status: getTournamentStatus(t.start_date, t.end_date, t.is_active)
    }));

    applyFilter();
}

function getTournamentStatus(start, end, isActive) {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!isActive) return 'draft';
    if (endDate < now) return 'finished';
    if (startDate <= now && endDate >= now) return 'active';
    return 'draft';
}

function applyFilter() {
    let filtered = [...allTournaments];
    if (currentFilter !== 'all') {
        filtered = filtered.filter(t => t.status === currentFilter);
    }
    renderTournaments(filtered);
}

function renderTournaments(tournaments) {
    const container = document.getElementById('tournamentsList');
    if (!tournaments.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Aucun tournoi créé</p></div>';
        return;
    }

    container.innerHTML = tournaments.map(t => {
        let statusClass = '';
        let statusText = '';
        if (t.status === 'draft') {
            statusClass = 'status-draft';
            statusText = 'Brouillon';
        } else if (t.status === 'active') {
            statusClass = 'status-active';
            statusText = 'Actif';
        } else {
            statusClass = 'status-finished';
            statusText = 'Terminé';
        }

        const startFormatted = formatDate(t.start_date);
        const endFormatted = formatDate(t.end_date);

        return `
            <div class="tournament-card" data-id="${t.id}">
                <div class="tournament-info">
                    <div class="tournament-name">${escapeHtml(t.name)}</div>
                    <div class="tournament-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${startFormatted} - ${endFormatted}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(t.location || 'Lieu non défini')}</span>
                        <span><i class="fas fa-futbol"></i> ${escapeHtml(t.sport)}</span>
                        <span><i class="fas fa-tag"></i> ${escapeHtml(t.type)}</span>
                        ${t.prize_pool ? `<span><i class="fas fa-trophy"></i> ${t.prize_pool.toLocaleString()} FCFA</span>` : ''}
                    </div>
                </div>
                <div class="tournament-status ${statusClass}">${statusText}</div>
                <div class="tournament-actions">
                    <button class="action-btn view-btn" data-id="${t.id}">
                        <i class="fas fa-eye"></i> Voir
                    </button>
                    <button class="action-btn manage-btn" data-id="${t.id}">
                        <i class="fas fa-cog"></i> Gérer
                    </button>
                    ${t.status === 'draft' ? `
                        <button class="action-btn publish-btn" data-id="${t.id}">
                            <i class="fas fa-check-circle"></i> Publier
                        </button>
                    ` : ''}
                    <button class="action-btn danger delete-btn" data-id="${t.id}">
                        <i class="fas fa-trash-alt"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Attacher les événements
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            window.location.href = `tournament-details.html?id=${id}`;
        });
    });
    document.querySelectorAll('.manage-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            window.location.href = `manage-tournament.html?id=${id}`;
        });
    });
    document.querySelectorAll('.publish-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            if (confirm('Publier ce tournoi ? Il deviendra visible par tous.')) {
                await supabaseGestionTournoi
                    .from('gestionnairetournoi_tournaments')
                    .update({ is_active: true })
                    .eq('id', id);
                showToast('Tournoi publié avec succès', 'success');
                loadMyTournaments();
            }
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            if (confirm('Supprimer définitivement ce tournoi ? Cette action est irréversible.')) {
                const { error } = await supabaseGestionTournoi
                    .from('gestionnairetournoi_tournaments')
                    .delete()
                    .eq('id', id);
                if (error) {
                    showToast('Erreur lors de la suppression', 'error');
                } else {
                    showToast('Tournoi supprimé', 'success');
                    loadMyTournaments();
                }
            }
        });
    });
}

// ===== GESTION DES ONGLETS =====
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-status');
            applyFilter();
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    await loadMyTournaments();
    initTabs();

    document.getElementById('backBtn').addEventListener('click', () => {
        window.history.back();
    });
});