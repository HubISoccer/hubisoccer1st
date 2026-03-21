// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== RÉCUPÉRATION DE L'ID DANS L'URL =====
const urlParams = new URLSearchParams(window.location.search);
const licenseId = urlParams.get('id');

// ===== CHARGEMENT DES DONNÉES =====
async function loadData() {
    if (!licenseId) {
        document.querySelector('.card-body').innerHTML = '<p style="text-align:center; padding:40px;">ID de licence manquant.</p>';
        return;
    }

    // Charger la demande de licence avec les infos du joueur (depuis profiles)
    const { data: license, error } = await supabase
        .from('license_requests')
        .select(`
            *,
            player:profiles!license_requests_player_id_fkey (
                id,
                full_name,
                avatar_url,
                hubisoccer_id
            )
        `)
        .eq('id', licenseId)
        .single();

    if (error || !license) {
        console.error('Erreur chargement licence:', error);
        document.querySelector('.card-body').innerHTML = '<p style="text-align:center; padding:40px;">Licence introuvable.</p>';
        return;
    }

    // Charger les données sportives depuis player_cv
    let cvData = {};
    if (license.player?.id) {
        const { data: cv, error: cvError } = await supabase
            .from('player_cv')
            .select('data')
            .eq('player_id', license.player.id)
            .maybeSingle();
        if (!cvError && cv) {
            cvData = cv.data || {};
        }
    }

    // Charger la configuration
    const { data: config } = await supabase
        .from('license_config')
        .select('*')
        .eq('id', 1)
        .single();

    renderCard(license, config, cvData);
}

// ===== RENDU DE LA CARTE =====
function renderCard(license, config, cvData) {
    const rectoDiv = document.getElementById('recto');
    const versoDiv = document.getElementById('verso');

    // Utiliser les données du profil (full_name) plutôt que nom/prenom de license_requests si disponibles
    const fullName = license.player?.full_name || `${license.prenom || ''} ${license.nom || ''}`.trim() || 'Nom non renseigné';
    const dateNaissance = license.date_naissance ? new Date(license.date_naissance).toLocaleDateString('fr-FR') : '-';
    const avatarUrl = license.player?.avatar_url || 'img/user-default.jpg';
    const hubId = license.player?.hubisoccer_id || license.id;

    // Données sportives depuis player_cv (ou fallback sur les champs de license_requests)
    const taille = cvData.taille || license.taille || '-';
    const poids = cvData.poids || license.poids || '-';
    const piedFort = cvData.piedFort || license.pied_fort || '-';
    const club = cvData.club || license.club || '-';

    // QR code URL
    const verifyUrl = `https://hubisoccer.github.io/hubisoccer1st/verify.html?id=${hubId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;

    // Recto
    rectoDiv.innerHTML = `
        <div class="flag-logo">
            <img src="${config?.recto_flag_url || ''}" alt="Drapeau" onerror="this.style.display='none'">
            <img src="${config?.recto_logo_url || ''}" alt="Logo" onerror="this.style.display='none'">
        </div>
        <div class="title-section">
            <h3>${config?.recto_country || ''}</h3>
            <p>${config?.recto_ministry || ''}</p>
            <h2>${config?.recto_company_name || ''}</h2>
            <h1>${config?.recto_title || ''}</h1>
        </div>
        <img src="${avatarUrl}" class="player-photo" alt="Photo">
        <div class="info-grid">
            <div class="info-item"><strong>Nom complet</strong><span>${fullName}</span></div>
            <div class="info-item"><strong>Date de naissance</strong><span>${dateNaissance}</span></div>
            <div class="info-item"><strong>Lieu de naissance</strong><span>${license.lieu_naissance || '-'}</span></div>
            <div class="info-item"><strong>Nationalité</strong><span>${license.nationalite || '-'}</span></div>
            <div class="info-item"><strong>Pays</strong><span>${license.pays || '-'}</span></div>
            <div class="info-item"><strong>Téléphone</strong><span>${license.telephone || '-'}</span></div>
            <div class="info-item"><strong>Taille</strong><span>${taille} cm</span></div>
            <div class="info-item"><strong>Poids</strong><span>${poids} kg</span></div>
            <div class="info-item"><strong>Pied fort</strong><span>${piedFort}</span></div>
            <div class="info-item"><strong>Club</strong><span>${club}</span></div>
        </div>
        <div class="signature-stamp">
            <img src="${license.signature_url}" alt="Signature joueur" onerror="this.style.display='none'">
            <img src="${config?.president_stamp_url || ''}" alt="Cachet" onerror="this.style.display='none'">
        </div>
    `;

    // Verso
    versoDiv.innerHTML = `
        <div class="verso-content">
            <img src="${config?.verso_background_logo_url || ''}" class="watermark" alt="" onerror="this.style.display='none'">
            <div class="verso-details">
                <p><strong>ID HubISoccer :</strong> ${hubId}</p>
                <p><strong>Délivrée par :</strong> ${config?.verso_issued_by || ''}</p>
                <p>${config?.verso_legal_info || ''}</p>
                <div class="qr-code">
                    <img src="${qrCodeUrl}" alt="QR Code">
                    <p style="font-size:0.8rem; color:#6c757d;">Scannez pour vérifier</p>
                </div>
            </div>
            <div class="signature-stamp" style="border-top: 1px dashed #e9ecef; margin-top: 10px; padding-top: 10px;">
                <span><strong>${config?.president_name || ''}</strong></span>
                <img src="${config?.president_signature_url || ''}" alt="Signature président" onerror="this.style.display='none'">
            </div>
        </div>
    `;

    // Activer le recto par défaut
    showFace('recto');
}

// ===== CHANGEMENT DE FACE =====
window.showFace = function(face) {
    document.querySelectorAll('.card-face').forEach(el => el.classList.remove('active'));
    document.getElementById(face).classList.add('active');
    document.querySelectorAll('.card-footer button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btnRecto').classList.toggle('active', face === 'recto');
    document.getElementById('btnVerso').classList.toggle('active', face === 'verso');
};

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', loadData);