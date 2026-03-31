// ===== GESTION DE LA CRÉATION DE TOURNOI =====
// ===== ÉLÉMENTS DOM =====
const form = document.getElementById('createTournamentForm');
const backBtn = document.getElementById('backBtn');
const cancelBtn = document.getElementById('cancelBtn');
const sportSelect = document.getElementById('sportId');
const typeSelect = document.getElementById('tournamentType');
const tournamentName = document.getElementById('tournamentName');
const registrationCode = document.getElementById('registrationCode');
const description = document.getElementById('description');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const location = document.getElementById('location');
const prizePool = document.getElementById('prizePool');
const requiresFirstPas = document.getElementById('requiresFirstPas');
const rules = document.getElementById('rules');
const streamUrl = document.getElementById('streamUrl');

// ===== CHARGEMENT DES SPORTS ET TYPES =====
async function loadSports() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_sports')
        .select('id, name')
        .order('name');
    if (error) {
        console.error(error);
        showToast('Erreur chargement des sports', 'error');
        return;
    }
    sportSelect.innerHTML = '<option value="">-- Sélectionner un sport --</option>';
    data.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport.id;
        option.textContent = sport.name;
        sportSelect.appendChild(option);
    });
}

async function loadTournamentTypes() {
    const { data, error } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_types')
        .select('id, name, label, requires_payment')
        .order('name');
    if (error) {
        console.error(error);
        showToast('Erreur chargement des types', 'error');
        return;
    }
    typeSelect.innerHTML = '<option value="">-- Sélectionner un type --</option>';
    data.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.label || type.name;
        option.setAttribute('data-requires-payment', type.requires_payment);
        typeSelect.appendChild(option);
    });
}

// ===== VÉRIFICATION DU PAIEMENT POUR LES TOURNOIS PRIVÉS SIMPLES =====
let requiresPayment = false;
typeSelect.addEventListener('change', () => {
    const selectedOption = typeSelect.options[typeSelect.selectedIndex];
    const paymentRequired = selectedOption?.getAttribute('data-requires-payment') === 'true';
    if (paymentRequired) {
        if (confirm('Les tournois privés simples nécessitent un paiement. Voulez-vous procéder au paiement après la création ?')) {
            requiresPayment = true;
        } else {
            typeSelect.value = '';
            requiresPayment = false;
            showToast('Vous devez accepter le paiement pour créer un tournoi privé simple', 'warning');
        }
    } else {
        requiresPayment = false;
    }
});

// ===== SOUMISSION DU FORMULAIRE =====
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validation
    if (!tournamentName.value.trim()) {
        showToast('Le nom du tournoi est obligatoire', 'error');
        return;
    }
    if (!sportSelect.value) {
        showToast('Veuillez choisir un sport', 'error');
        return;
    }
    if (!typeSelect.value) {
        showToast('Veuillez choisir un type de tournoi', 'error');
        return;
    }
    if (!startDate.value || !endDate.value) {
        showToast('Les dates de début et de fin sont obligatoires', 'error');
        return;
    }
    if (new Date(startDate.value) >= new Date(endDate.value)) {
        showToast('La date de fin doit être postérieure à la date de début', 'error');
        return;
    }

    const tournamentData = {
        name: tournamentName.value.trim(),
        sport_id: parseInt(sportSelect.value),
        type_id: parseInt(typeSelect.value),
        description: description.value.trim() || null,
        start_date: startDate.value,
        end_date: endDate.value,
        location: location.value.trim() || null,
        registration_code: registrationCode.value.trim() || null,
        prize_pool: parseFloat(prizePool.value) || 0,
        requires_first_pas: requiresFirstPas.value === 'true',
        rules: rules.value.trim() || null,
        stream_url: streamUrl.value.trim() || null,
        is_active: true,
        created_by: null
    };

    // Récupérer l'utilisateur connecté
    const { data: { user }, error: userError } = await window.supabaseAuthPrive.auth.getUser();
    if (userError || !user) {
        showToast('Vous devez être connecté pour créer un tournoi', 'error');
        return;
    }
    tournamentData.created_by = user.id;

    try {
        // 1. Créer le tournoi
        const { data: tournament, error: tournamentError } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_tournaments')
            .insert(tournamentData)
            .select()
            .single();

        if (tournamentError) throw tournamentError;

        // 2. Si paiement requis, créer une entrée dans la table des paiements (si elle existe)
        if (requiresPayment) {
            // Vérifier si la table des paiements existe (optionnel)
            // On insère même si la table n'existe pas, l'erreur sera capturée
            const { error: paymentError } = await window.supabaseAuthPrive
                .from('gestionnairetournoi_payments')
                .insert({
                    tournament_id: tournament.id,
                    user_id: user.id,
                    amount: 0, // À définir selon un forfait
                    status: 'pending'
                });
            if (paymentError) {
                console.error('Erreur insertion paiement :', paymentError);
                // On ne bloque pas la création du tournoi
            }
            showToast('Tournoi créé. Le paiement sera traité ultérieurement.', 'info');
        } else {
            showToast('Tournoi créé avec succès !', 'success');
        }

        // Redirection vers la page de détail
        window.location.href = `tournament-details.html?id=${tournament.id}`;

    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la création du tournoi : ' + err.message, 'error');
    }
});

// ===== BOUTONS DE NAVIGATION =====
backBtn.addEventListener('click', () => {
    window.location.href = 'accueil_hubisgst.html';
});
cancelBtn.addEventListener('click', () => {
    window.location.href = 'accueil_hubisgst.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadSports();
    loadTournamentTypes();
});
