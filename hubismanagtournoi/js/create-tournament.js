// ===== create-tournament.js =====
let currentUser = null;
let currentProfile = null;
let sports = [];
let tournamentTypes = [];

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
    const select = document.getElementById('tournamentSport');
    select.innerHTML = '<option value="">Sélectionnez un sport</option>' +
        sports.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

async function loadTournamentTypes() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_types')
        .select('id, name, label, requires_payment')
        .order('id');
    if (error) {
        console.error('Erreur chargement types:', error);
        return;
    }
    tournamentTypes = data || [];
    const select = document.getElementById('tournamentType');
    select.innerHTML = '<option value="">Sélectionnez</option>';
    tournamentTypes.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.label;
        option.dataset.requiresPayment = t.requires_payment;
        select.appendChild(option);
    });
}

function updateFormFields() {
    const typeSelect = document.getElementById('tournamentType');
    const selectedType = tournamentTypes.find(t => t.id == typeSelect.value);
    const prizeGroup = document.getElementById('prizeGroup');
    const codeGroup = document.getElementById('codeGroup');
    const helpText = document.getElementById('typeHelp');

    if (selectedType) {
        if (selectedType.name === 'private_simple') {
            prizeGroup.style.display = 'block';
            helpText.innerHTML = 'Les tournois privés simples sont payants. Vous pourrez gérer les inscriptions et les primes.';
        } else {
            prizeGroup.style.display = 'none';
            helpText.innerHTML = '';
        }
        if (selectedType.name === 'public_show' || selectedType.name === 'public_detection') {
            codeGroup.style.display = 'block';
            helpText.innerHTML += ' Un code d’accès public sera demandé aux participants.';
        } else {
            codeGroup.style.display = 'none';
        }
    } else {
        prizeGroup.style.display = 'none';
        codeGroup.style.display = 'none';
    }
}

document.getElementById('tournamentType').addEventListener('change', updateFormFields);

async function createTournament(event) {
    event.preventDefault();

    const typeId = document.getElementById('tournamentType').value;
    const sportId = document.getElementById('tournamentSport').value;
    const name = document.getElementById('tournamentName').value.trim();
    const description = document.getElementById('tournamentDescription').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const location = document.getElementById('location').value.trim();
    const rules = document.getElementById('rules').value.trim();
    const streamUrl = document.getElementById('streamUrl').value.trim();
    const prizePool = document.getElementById('prizePool').value;
    const registrationCode = document.getElementById('registrationCode').value.trim();

    if (!typeId || !sportId || !name || !startDate || !endDate) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
        showToast('La date de fin doit être postérieure à la date de début.', 'warning');
        return;
    }

    const selectedType = tournamentTypes.find(t => t.id == typeId);
    if (selectedType?.name === 'private_simple' && !prizePool) {
        showToast('Pour un tournoi privé simple, veuillez indiquer une prime.', 'warning');
        return;
    }

    const tournamentData = {
        type_id: typeId,
        sport_id: sportId,
        name,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
        location: location || null,
        rules: rules || null,
        stream_url: streamUrl || null,
        prize_pool: prizePool ? parseFloat(prizePool) : 0,
        registration_code: registrationCode || null,
        created_by: currentProfile.id,
        is_active: true
    };

    const button = event.target.querySelector('button[type="submit"]');
    withButtonSpinner(button, async () => {
        const { data, error } = await supabaseGestionTournoi
            .from('gestionnairetournoi_tournaments')
            .insert(tournamentData)
            .select()
            .single();

        if (error) {
            console.error('Erreur création tournoi:', error);
            showToast('Erreur lors de la création : ' + error.message, 'error');
            return;
        }

        showToast('Tournoi créé avec succès !', 'success');
        setTimeout(() => {
            window.location.href = `tournament-details.html?id=${data.id}`;
        }, 1500);
    });
}

document.getElementById('createTournamentForm').addEventListener('submit', createTournament);

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    await loadSports();
    await loadTournamentTypes();
    updateFormFields();
});