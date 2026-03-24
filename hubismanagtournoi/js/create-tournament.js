// ===== GESTION DE LA CRÉATION DE TOURNOI =====

let tournamentTypes = [];
let sports = [];
let currentType = null;

async function loadFormData() {
    try {
        const [typesRes, sportsRes] = await Promise.all([
            supabaseGestionTournoi.from('gestionnairetournoi_types').select('id, name, label, requires_payment'),
            supabaseGestionTournoi.from('gestionnairetournoi_sports').select('id, name').order('name')
        ]);
        if (typesRes.error) throw typesRes.error;
        if (sportsRes.error) throw sportsRes.error;
        tournamentTypes = typesRes.data;
        sports = sportsRes.data;

        const typeSelect = document.getElementById('tournamentType');
        typeSelect.innerHTML = '<option value="">Sélectionnez un type</option>';
        tournamentTypes.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.label;
            typeSelect.appendChild(option);
        });

        const sportSelect = document.getElementById('sport');
        sportSelect.innerHTML = '<option value="">Sélectionnez un sport</option>';
        sports.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            sportSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        showToast('Erreur lors du chargement des données', 'error');
    }
}

function onTypeChange() {
    const typeId = parseInt(document.getElementById('tournamentType').value);
    currentType = tournamentTypes.find(t => t.id === typeId);
    const requiresPayment = currentType ? currentType.requires_payment : false;
    const paymentInfo = document.getElementById('paymentInfo');
    if (requiresPayment) {
        paymentInfo.classList.add('active');
    } else {
        paymentInfo.classList.remove('active');
    }
}

async function createTournament(event) {
    event.preventDefault();
    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.disabled = true;

    const typeId = parseInt(document.getElementById('tournamentType').value);
    const sportId = parseInt(document.getElementById('sport').value);
    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const location = document.getElementById('location').value.trim();
    const rules = document.getElementById('rules').value.trim();
    const registrationCode = document.getElementById('registrationCode').value.trim();
    const prizePool = parseFloat(document.getElementById('prizePool').value) || 0;
    const streamUrl = document.getElementById('streamUrl').value.trim();
    const requiresFirstPas = document.getElementById('requiresFirstPas')?.checked || false;
    const hasAgreedToRules = document.getElementById('hasAgreedToRules')?.checked || false;

    if (!typeId || !sportId || !name || !startDate || !endDate || !location) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        submitBtn.disabled = false;
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showToast('La date de fin doit être postérieure à la date de début', 'warning');
        submitBtn.disabled = false;
        return;
    }

    const tournamentData = {
        type_id: typeId,
        sport_id: sportId,
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        location,
        rules,
        registration_code: registrationCode || null,
        prize_pool: prizePool,
        stream_url: streamUrl || null,
        requires_first_pas: requiresFirstPas,
        has_agreed_to_rules: hasAgreedToRules,
        created_by: null, // à remplacer par l'UUID de l'utilisateur connecté
        is_active: true
    };

    try {
        // Si c'est un tournoi privé simple, on doit d'abord vérifier le paiement
        if (currentType && currentType.name === 'private_simple') {
            // Ici, intégration du paiement (Stripe, etc.)
            // Pour l'exemple, on simule un paiement réussi
            const paymentSuccess = true; // À remplacer par une vraie intégration
            if (!paymentSuccess) {
                showToast('Le paiement a échoué. Veuillez réessayer.', 'error');
                submitBtn.disabled = false;
                return;
            }
        }

        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_tournaments')
            .insert(tournamentData)
            .select();
        if (error) throw error;

        showToast('Tournoi créé avec succès !', 'success');
        setTimeout(() => {
            window.location.href = `tournament-details.html?id=${data[0].id}`;
        }, 1500);
    } catch (error) {
        console.error(error);
        showToast('Erreur lors de la création du tournoi', 'error');
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadFormData();
    document.getElementById('tournamentType').addEventListener('change', onTypeChange);
    document.getElementById('createForm').addEventListener('submit', createTournament);
});