// ===== RÉCUPÉRATION DE L'ID DU TOURNOI =====
const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');
let tournamentData = null;
let currentUser = null;
let paymentAmount = 0;

async function getCurrentUser() {
    if (window.supabaseAuthPrive) {
        const { data: { user }, error } = await window.supabaseAuthPrive.auth.getUser();
        if (!error && user) return user;
    }
    return null;
}

async function loadTournamentInfo() {
    if (!tournamentId) {
        showToast('Tournoi non spécifié', 'error');
        window.location.href = 'accueil_hubisgst.html';
        return;
    }
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select('name, start_date, end_date, location, type_id')
        .eq('id', tournamentId)
        .single();
    if (error) {
        console.error(error);
        showToast('Erreur chargement du tournoi', 'error');
        return;
    }
    tournamentData = data;
    // Simuler un montant à payer (à remplacer par la valeur réelle du forfait)
    paymentAmount = 25000; // 25 000 FCFA par défaut (à adapter selon le type de tournoi)
    document.getElementById('tournamentInfo').innerHTML = `
        <p><strong>${escapeHtml(tournamentData.name)}</strong></p>
        <p>Du ${new Date(tournamentData.start_date).toLocaleDateString('fr-FR')} au ${new Date(tournamentData.end_date).toLocaleDateString('fr-FR')}</p>
        <p>${tournamentData.location || 'Lieu non précisé'}</p>
    `;
    document.getElementById('amount').textContent = `${paymentAmount.toLocaleString()} FCFA`;
}

// ===== GESTION DES MÉTHODES DE PAIEMENT =====
function togglePaymentFields() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    document.getElementById('mobileMoneyFields').style.display = method === 'mobile_money' ? 'block' : 'none';
    document.getElementById('cardFields').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('bankTransferFields').style.display = method === 'bank_transfer' ? 'block' : 'none';
}

// ===== UPLOAD DE FICHIER (preuve) =====
async function uploadProof(file) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `payment_${currentUser.id}_${Date.now()}.${fileExt}`;
    const filePath = `payment_proofs/${fileName}`;
    const { error, data } = await supabaseGestionTournoi.storage
        .from('documents')
        .upload(filePath, file);
    if (error) {
        console.error(error);
        showToast('Erreur upload de la preuve', 'error');
        return null;
    }
    const { data: urlData } = supabaseGestionTournoi.storage
        .from('documents')
        .getPublicUrl(filePath);
    return urlData.publicUrl;
}

// ===== SAUVEGARDE DU PAIEMENT =====
async function processPayment() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    let proofUrl = null;
    if (method === 'bank_transfer') {
        const fileInput = document.getElementById('proofFile');
        if (fileInput.files.length) {
            proofUrl = await uploadProof(fileInput.files[0]);
        }
    }

    const paymentData = {
        tournament_id: parseInt(tournamentId),
        user_id: currentUser.id,
        amount: paymentAmount,
        payment_method: method,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    if (method === 'mobile_money') {
        paymentData.phone_number = document.getElementById('phoneNumber').value;
        paymentData.operator = document.getElementById('operator').value;
    }
    if (proofUrl) paymentData.proof_url = proofUrl;

    const { error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_payments')
        .insert(paymentData);
    if (error) {
        showToast('Erreur lors de l\'enregistrement du paiement', 'error');
        console.error(error);
        return;
    }
    showToast('Paiement enregistré, en attente de validation', 'success');
    setTimeout(() => {
        window.location.href = `create-tournament.html?id=${tournamentId}`;
    }, 2000);
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    await loadTournamentInfo();

    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', togglePaymentFields);
    });
    togglePaymentFields();

    document.getElementById('payBtn').addEventListener('click', processPayment);
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = `create-tournament.html?id=${tournamentId}`;
    });
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = `create-tournament.html?id=${tournamentId}`;
    });
});
