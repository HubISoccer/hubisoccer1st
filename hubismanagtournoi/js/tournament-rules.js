// ===== RÉCUPÉRATION DE L'ID DU TOURNOI =====
const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');
const returnUrl = urlParams.get('return') || 'tournament-details.html';

if (!tournamentId) {
    window.location.href = 'accueil_hubisgst.html';
}

let currentUser = null;
let tournamentData = null;
let signaturePad = null;

// ===== CHARGEMENT DES DONNÉES DU TOURNOI =====
async function loadTournamentRules() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select('id, name, start_date, end_date, rules')
        .eq('id', tournamentId)
        .single();
    if (error) {
        console.error(error);
        showToast('Erreur lors du chargement du règlement', 'error');
        document.getElementById('rulesContent').innerHTML = '<div class="empty-state">Impossible de charger le règlement.</div>';
        return;
    }
    tournamentData = data;
    document.getElementById('tournamentName').textContent = data.name;
    document.getElementById('tournamentDates').textContent = `${new Date(data.start_date).toLocaleDateString('fr-FR')} - ${new Date(data.end_date).toLocaleDateString('fr-FR')}`;

    // Afficher le règlement (texte brut ou HTML)
    let rulesHtml = '';
    if (data.rules) {
        rulesHtml = data.rules; // On suppose que le champ rules peut contenir du HTML
    } else {
        rulesHtml = '<p>Aucun règlement spécifique n’a été défini pour ce tournoi. Les règles générales de HubISoccer s’appliquent.</p>';
    }
    document.getElementById('rulesContent').innerHTML = rulesHtml;

    // Vérifier si l'utilisateur doit signer
    await checkIfUserNeedsToSign();
}

// ===== VÉRIFIER SI L'UTILISATEUR DOIT SIGNER =====
async function checkIfUserNeedsToSign() {
    if (!currentUser) {
        // Non connecté, on n'affiche pas le bloc signature
        document.getElementById('signatureBlock').style.display = 'none';
        return;
    }

    // Vérifier si l'utilisateur est déjà inscrit et a déjà signé
    // 1. Récupérer le player_id
    const { data: player, error: playerError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
    if (playerError || !player) {
        // Pas de fiche joueur, donc pas inscrit
        document.getElementById('signatureBlock').style.display = 'none';
        return;
    }

    // 2. Vérifier l'inscription
    const { data: registration, error: regError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .select('has_agreed_to_rules')
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.id)
        .maybeSingle();
    if (regError || !registration) {
        // Non inscrit, pas besoin de signer ici (l'inscription se fait ailleurs)
        document.getElementById('signatureBlock').style.display = 'none';
        return;
    }

    // Si déjà signé, on masque le bloc
    if (registration.has_agreed_to_rules === true) {
        document.getElementById('signatureBlock').style.display = 'none';
        // Optionnel : afficher un message de confirmation
        const msg = document.createElement('div');
        msg.className = 'signature-confirmed';
        msg.innerHTML = '<i class="fas fa-check-circle"></i> Vous avez déjà accepté le règlement.';
        document.querySelector('.rules-card').appendChild(msg);
    } else {
        // Afficher le bloc de signature
        document.getElementById('signatureBlock').style.display = 'block';
        initSignaturePad();
    }
}

// ===== INITIALISATION DU PAD DE SIGNATURE =====
function initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    // Adapter la taille pour la résolution mobile
    canvas.width = canvas.offsetWidth || 400;
    canvas.height = canvas.offsetHeight || 200;
    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'white',
        penColor: '#551B8C',
        minWidth: 1,
        maxWidth: 2.5,
        throttle: 16
    });

    document.getElementById('clearSignatureBtn').addEventListener('click', () => {
        signaturePad.clear();
    });
}

// ===== SAUVEGARDE DE LA SIGNATURE =====
async function saveSignature() {
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    if (signaturePad.isEmpty()) {
        showToast('Veuillez signer avant de continuer', 'warning');
        return;
    }

    // Récupérer le player_id
    const { data: player, error: playerError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();
    if (playerError || !player) {
        showToast('Erreur : profil joueur introuvable', 'error');
        return;
    }

    // Convertir la signature en dataURL et l'uploader
    const signatureDataURL = signaturePad.toDataURL('image/png');
    // Stocker la signature (optionnel) ou simplement enregistrer l'acceptation
    // On va simplement mettre à jour le champ has_agreed_to_rules
    const { error: updateError } = await supabaseGestionTournoi
        .from('gestionnairetournoi_registrations')
        .update({ has_agreed_to_rules: true })
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.id);

    if (updateError) {
        console.error(updateError);
        showToast('Erreur lors de l\'enregistrement de la signature', 'error');
    } else {
        showToast('Règlement accepté avec succès', 'success');
        // Rediriger vers la page précédente
        setTimeout(() => {
            window.location.href = returnUrl + (returnUrl.includes('?') ? '&' : '?') + `id=${tournamentId}`;
        }, 1500);
    }
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Récupérer l'utilisateur connecté
    if (window.supabaseAuthPrive) {
        const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
        if (!error && user) currentUser = user;
    }

    await loadTournamentRules();

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = returnUrl + (returnUrl.includes('?') ? '&' : '?') + `id=${tournamentId}`;
    });

    const acceptBtn = document.getElementById('acceptRulesBtn');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', saveSignature);
    }
});
