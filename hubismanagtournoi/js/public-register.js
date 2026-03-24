let currentTournament = null;

// ===== ÉTAPE 1 : VÉRIFICATION DU CODE =====
async function verifyCode() {
    const code = document.getElementById('registrationCode').value.trim();
    if (!code) {
        showToast('Veuillez saisir un code', 'warning');
        return;
    }

    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select(`
            id,
            name,
            start_date,
            end_date,
            location,
            description,
            rules,
            type:type_id (name, label),
            sport:sport_id (name)
        `)
        .eq('registration_code', code)
        .eq('is_active', true)
        .single();

    if (error || !data) {
        document.getElementById('codeError').style.display = 'block';
        document.getElementById('codeError').textContent = 'Code invalide ou tournoi non trouvé.';
        return;
    }

    currentTournament = data;
    document.getElementById('codeError').style.display = 'none';
    document.getElementById('stepCode').style.display = 'none';
    document.getElementById('stepForm').style.display = 'block';

    // Afficher les informations du tournoi
    const infoDiv = document.getElementById('tournamentInfo');
    infoDiv.innerHTML = `
        <div class="tournament-name">${escapeHtml(currentTournament.name)}</div>
        <div class="tournament-dates">📅 ${new Date(currentTournament.start_date).toLocaleDateString('fr-FR')} - ${new Date(currentTournament.end_date).toLocaleDateString('fr-FR')}</div>
        <div class="tournament-location">📍 ${escapeHtml(currentTournament.location || 'Lieu non précisé')}</div>
        <div class="tournament-sport">⚽ ${currentTournament.sport?.name || 'Sport'}</div>
    `;

    // Stocker le règlement pour la modale
    document.getElementById('rulesContent').innerHTML = currentTournament.rules || 'Aucun règlement spécifique.';
}

// ===== MODALE DU RÈGLEMENT =====
function openRulesModal() {
    document.getElementById('rulesModal').style.display = 'block';
}
function closeRulesModal() {
    document.getElementById('rulesModal').style.display = 'none';
}

// ===== SOUMISSION DU FORMULAIRE =====
async function submitRegistration(e) {
    e.preventDefault();

    // Vérifier que l'utilisateur a accepté le règlement
    if (!document.getElementById('agreeRules').checked) {
        showToast('Vous devez accepter le règlement pour vous inscrire', 'warning');
        return;
    }

    // Collecte des données
    const playerData = {
        tournament_id: currentTournament.id,
        registration_code: document.getElementById('registrationCode').value,
        player_name: document.getElementById('playerName').value.trim(),
        player_email: document.getElementById('playerEmail').value.trim(),
        player_phone: document.getElementById('playerPhone').value.trim(),
        player_birth_date: document.getElementById('playerBirthDate').value,
        position: document.getElementById('playerPosition').value.trim(),
        player_club: document.getElementById('playerClub').value.trim(),
        message: document.getElementById('playerMessage').value.trim(),
        has_agreed_to_rules: true,
        status: 'pending'
    };

    // Validation
    if (!playerData.player_name || !playerData.player_email || !playerData.player_phone || !playerData.player_birth_date) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    // Vérifier si l'email est déjà utilisé pour ce tournoi
    const { data: existing, error: checkError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_public_registrations')
        .select('id')
        .eq('tournament_id', currentTournament.id)
        .eq('player_email', playerData.player_email)
        .maybeSingle();

    if (existing) {
        showToast('Vous êtes déjà inscrit à ce tournoi avec cet email', 'error');
        return;
    }

    // Insertion dans la base
    const { error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_public_registrations')
        .insert(playerData);

    if (error) {
        console.error(error);
        showToast('Erreur lors de l\'inscription', 'error');
        return;
    }

    // Success
    document.getElementById('stepForm').style.display = 'none';
    document.getElementById('stepSuccess').style.display = 'block';
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('verifyCodeBtn').addEventListener('click', verifyCode);
    document.getElementById('publicRegistrationForm').addEventListener('submit', submitRegistration);
    document.getElementById('rulesLink').addEventListener('click', (e) => {
        e.preventDefault();
        openRulesModal();
    });
    document.querySelectorAll('.close-modal, .modal .close-modal').forEach(btn => {
        btn.addEventListener('click', closeRulesModal);
    });
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('rulesModal')) {
            closeRulesModal();
        }
    });
    document.getElementById('backToHomeBtn').addEventListener('click', () => {
        window.location.href = 'accueil_hubisgst.html';
    });
});