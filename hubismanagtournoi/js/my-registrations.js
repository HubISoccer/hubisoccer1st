// ===== RÉCUPÉRATION DE L'UTILISATEUR CONNECTÉ =====
let currentUser = null;
let registrations = [];

async function getCurrentUser() {
    if (window.supabaseAuthPrive) {
        const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
        if (!error && user) return user;
    }
    return null;
}

// ===== CHARGEMENT DES INSCRIPTIONS =====
async function loadMyRegistrations() {
    if (!currentUser) return;

    // 1. Récupérer l'ID du joueur dans gestionnairetournoi_players
    const { data: player, error: playerError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (playerError || !player) {
        document.getElementById('registrationsList').innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>Vous n’avez aucune inscription.</p></div>';
        return;
    }

    // 2. Récupérer les inscriptions
    const { data: regs, error: regError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .select(`
            id,
            status,
            registration_date,
            tournament:tournament_id (
                id,
                name,
                start_date,
                end_date,
                location,
                type:type_id (name, label),
                sport:sport_id (name)
            )
        `)
        .eq('player_id', player.id)
        .order('registration_date', { ascending: false });

    if (regError) {
        console.error(regError);
        showToast('Erreur lors du chargement des inscriptions', 'error');
        return;
    }

    registrations = regs || [];
    applyFilters();
}

// ===== FILTRAGE =====
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const periodFilter = document.getElementById('periodFilter').value;
    const now = new Date();

    let filtered = [...registrations];

    if (statusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (periodFilter !== 'all') {
        filtered = filtered.filter(r => {
            const start = new Date(r.tournament.start_date);
            const end = new Date(r.tournament.end_date);
            if (periodFilter === 'upcoming') return start > now;
            if (periodFilter === 'ongoing') return start <= now && end >= now;
            if (periodFilter === 'past') return end < now;
            return true;
        });
    }

    renderRegistrations(filtered);
}

// ===== AFFICHAGE =====
function renderRegistrations(registrationsList) {
    const container = document.getElementById('registrationsList');
    if (!registrationsList.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Aucune inscription correspondante</p></div>';
        return;
    }

    container.innerHTML = registrationsList.map(reg => {
        const statusClass = reg.status === 'pending' ? 'status-pending' : (reg.status === 'approved' ? 'status-approved' : 'status-rejected');
        const statusText = reg.status === 'pending' ? 'En attente' : (reg.status === 'approved' ? 'Approuvé' : 'Rejeté');
        const start = new Date(reg.tournament.start_date).toLocaleDateString('fr-FR');
        const end = new Date(reg.tournament.end_date).toLocaleDateString('fr-FR');
        return `
            <div class="registration-card" data-id="${reg.id}">
                <div class="registration-info">
                    <div class="registration-name">${escapeHtml(reg.tournament.name)}</div>
                    <div class="registration-dates">
                        <i class="fas fa-calendar-alt"></i>
                        ${start} - ${end}
                    </div>
                    <div class="registration-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${escapeHtml(reg.tournament.location || 'Lieu non précisé')}
                    </div>
                    <div class="registration-status ${statusClass}">${statusText}</div>
                </div>
                <div class="registration-actions">
                    <a href="tournament-details.html?id=${reg.tournament.id}" class="btn-view">
                        <i class="fas fa-eye"></i> Voir le tournoi
                    </a>
                    ${reg.status === 'pending' ? `<button class="btn-unregister" data-id="${reg.id}"><i class="fas fa-times"></i> Annuler</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Gestion de l'annulation d'inscription
    document.querySelectorAll('.btn-unregister').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const regId = btn.getAttribute('data-id');
            if (confirm('Voulez-vous vraiment annuler votre inscription ?')) {
                const { error } = await supabaseGestionTournoi
                    .from('gestionnairetournoi_registrations')
                    .delete()
                    .eq('id', regId);
                if (error) {
                    showToast('Erreur lors de l\'annulation', 'error');
                } else {
                    showToast('Inscription annulée', 'success');
                    loadMyRegistrations();
                }
            }
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
    await loadMyRegistrations();

    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('periodFilter').addEventListener('change', applyFilters);
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'accueil_hubisgst.html';
    });
});