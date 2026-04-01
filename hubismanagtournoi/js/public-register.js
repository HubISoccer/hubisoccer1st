// ===== public-register.js =====
let currentTournament = null;

// Éléments DOM
const stepCode = document.getElementById('stepCode');
const stepForm = document.getElementById('stepForm');
const stepSuccess = document.getElementById('stepSuccess');
const verifyBtn = document.getElementById('verifyCodeBtn');
const registrationCodeInput = document.getElementById('registrationCode');
const codeErrorDiv = document.getElementById('codeError');
const tournamentInfoDiv = document.getElementById('tournamentInfo');
const form = document.getElementById('publicRegistrationForm');
const rulesLink = document.getElementById('rulesLink');
const rulesModal = document.getElementById('rulesModal');
const rulesContent = document.getElementById('rulesContent');
const backToHomeBtn = document.getElementById('backToHomeBtn');

// Fermeture de la modale
const closeModalBtn = rulesModal?.querySelector('.close-modal');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        rulesModal.style.display = 'none';
    });
}
window.addEventListener('click', (e) => {
    if (e.target === rulesModal) {
        rulesModal.style.display = 'none';
    }
});

// Vérifier le code d'inscription
async function verifyCode() {
    const code = registrationCodeInput.value.trim();
    if (!code) {
        showToast('Veuillez saisir un code', 'warning');
        return;
    }
    codeErrorDiv.style.display = 'none';

    try {
        const { data, error } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_tournaments')
            .select(`
                id,
                name,
                start_date,
                end_date,
                location,
                rules,
                registration_code,
                type:type_id (name, label),
                sport:sport_id (name)
            `)
            .eq('registration_code', code)
            .eq('is_active', true)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            codeErrorDiv.textContent = 'Code invalide ou tournoi non actif.';
            codeErrorDiv.style.display = 'block';
            return;
        }

        currentTournament = data;

        // Afficher les infos du tournoi
        const start = new Date(data.start_date).toLocaleDateString('fr-FR');
        const end = new Date(data.end_date).toLocaleDateString('fr-FR');
        tournamentInfoDiv.innerHTML = `
            <h3>${escapeHtml(data.name)}</h3>
            <p><i class="fas fa-calendar-alt"></i> ${start} - ${end}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(data.location || 'Lieu non spécifié')}</p>
            <p><i class="fas fa-futbol"></i> ${escapeHtml(data.sport?.name)}</p>
            <p><i class="fas fa-tag"></i> ${escapeHtml(data.type?.label)}</p>
        `;

        // Préparer le lien du règlement
        if (data.rules) {
            rulesContent.innerHTML = `<div class="rules-text">${escapeHtml(data.rules).replace(/\n/g, '<br>')}</div>`;
        } else {
            rulesContent.innerHTML = '<p>Aucun règlement spécifique.</p>';
        }

        // Passer à l'étape 2
        stepCode.style.display = 'none';
        stepForm.style.display = 'block';
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la vérification du code', 'error');
    }
}

// Soumission du formulaire
async function submitRegistration(e) {
    e.preventDefault();

    // Récupération des valeurs
    const name = document.getElementById('playerName').value.trim();
    const email = document.getElementById('playerEmail').value.trim();
    const phone = document.getElementById('playerPhone').value.trim();
    const birthDate = document.getElementById('playerBirthDate').value;
    const position = document.getElementById('playerPosition').value.trim();
    const club = document.getElementById('playerClub').value.trim();
    const message = document.getElementById('playerMessage').value.trim();
    const agree = document.getElementById('agreeRules').checked;

    if (!name || !email || !phone || !birthDate) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }
    if (!agree) {
        showToast('Vous devez accepter le règlement', 'warning');
        return;
    }
    if (!currentTournament) {
        showToast('Code de tournoi invalide', 'error');
        return;
    }

    // Vérifier si l'email est déjà utilisé dans un autre compte (optionnel, mais on peut)
    // Ici on ne crée pas de compte Supabase, seulement une inscription dans le tournoi.

    // Créer un joueur dans gestionnairetournoi_players
    // On utilise l'email comme identifiant unique (user_id peut être null car pas de compte)
    const playerData = {
        user_id: null,
        full_name: name,
        email: email,
        phone: phone,
        birth_date: birthDate,
        position: position || null,
        club: club || null,
        created_at: new Date().toISOString()
    };

    // Vérifier si le joueur existe déjà (par email)
    const { data: existingPlayer, error: playerCheckError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    let playerId;
    if (existingPlayer) {
        playerId = existingPlayer.id;
        // Optionnel : mettre à jour les informations
        await window.supabaseAuthPrive
            .from('gestionnairetournoi_players')
            .update({
                full_name: name,
                phone: phone,
                birth_date: birthDate,
                position: position || null,
                club: club || null
            })
            .eq('id', playerId);
    } else {
        const { data: newPlayer, error: insertError } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_players')
            .insert(playerData)
            .select()
            .single();
        if (insertError) {
            console.error(insertError);
            showToast('Erreur lors de la création du joueur', 'error');
            return;
        }
        playerId = newPlayer.id;
    }

    // Créer l'inscription
    const registrationData = {
        tournament_id: currentTournament.id,
        player_id: playerId,
        status: 'pending',
        registration_date: new Date().toISOString(),
        message: message || null,
        has_agreed_to_rules: true
    };

    const { error: regError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_registrations')
        .insert(registrationData);

    if (regError) {
        console.error(regError);
        showToast('Erreur lors de l\'inscription', 'error');
        return;
    }

    // Envoyer un email de confirmation (simulé – à implémenter via une fonction Edge)
    // On peut simplement afficher un message
    showToast('Inscription envoyée !', 'success');

    // Afficher l'étape de succès
    stepForm.style.display = 'none';
    stepSuccess.style.display = 'block';
}

// Retour à l'accueil
function backToHome() {
    window.location.href = 'accueil_hubisgst.html';
}

// Écouteurs
verifyBtn.addEventListener('click', verifyCode);
form.addEventListener('submit', submitRegistration);
backToHomeBtn.addEventListener('click', backToHome);

// Afficher la modale du règlement
rulesLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (rulesModal) {
        rulesModal.style.display = 'block';
    }
});
