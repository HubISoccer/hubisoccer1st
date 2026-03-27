const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const licenseId = urlParams.get('id');

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

async function loadData() {
    showLoader();
    try {
        if (!licenseId) {
            document.querySelector('.card-body').innerHTML = '<p style="text-align:center; padding:40px;">ID de licence manquant.</p>';
            return;
        }

        const { data: license, error } = await supabaseClient
            .from('license_requests')
            .select(`
                *,
                player:profiles!license_requests_player_id_fkey (
                    id,
                    full_name,
                    avatar_url,
                    hubisoccer_id,
                    date_of_birth,
                    phone,
                    country
                )
            `)
            .eq('id', licenseId)
            .single();

        if (error || !license) {
            throw new Error('Licence introuvable');
        }

        if (license.status !== 'approved') {
            document.querySelector('.card-body').innerHTML = '<p style="text-align:center; padding:40px;">Cette licence est en attente de validation. Revenez plus tard.</p>';
            return;
        }

        let cvData = {};
        if (license.player?.id) {
            const { data: cv, error: cvError } = await supabaseClient
                .from('player_cv')
                .select('data')
                .eq('player_id', license.player.id)
                .maybeSingle();
            if (!cvError && cv) cvData = cv.data || {};
        }

        let config = {};
        const { data: configData } = await supabaseClient
            .from('license_config')
            .select('*')
            .eq('id', 1)
            .single();
        if (configData) config = configData;

        renderCard(license, config, cvData);
    } catch (err) {
        console.error(err);
        document.querySelector('.card-body').innerHTML = '<p style="text-align:center; padding:40px;">Erreur de chargement de la licence.</p>';
    } finally {
        hideLoader();
    }
}

function renderCard(license, config, cvData) {
    const rectoDiv = document.getElementById('recto');
    const versoDiv = document.getElementById('verso');

    const fullName = license.player?.full_name || `${license.prenom || ''} ${license.nom || ''}`.trim() || 'Nom non renseigné';
    const dateNaissance = license.player?.date_of_birth 
        ? new Date(license.player.date_of_birth).toLocaleDateString('fr-FR') 
        : (license.date_naissance ? new Date(license.date_naissance).toLocaleDateString('fr-FR') : '-');
    const avatarUrl = license.player?.avatar_url || 'img/user-default.jpg';
    const hubId = license.player?.hubisoccer_id || license.id;
    const telephone = license.player?.phone || license.telephone || '-';
    const nationalite = license.player?.country || license.nationalite || '-';

    const taille = cvData.taille || license.taille || '-';
    const poids = cvData.poids || license.poids || '-';
    const piedFort = cvData.piedFort || license.pied_fort || '-';
    const club = cvData.club || license.club || '-';

    const verifyUrl = `https://hubisoccer.github.io/hubisoccer1st/verify.html?id=${hubId}`;

    rectoDiv.innerHTML = `
        <div class="flag-logo">
            <img src="${config.recto_flag_url || ''}" alt="Drapeau" onerror="this.style.display='none'">
            <img src="${config.recto_logo_url || ''}" alt="Logo" onerror="this.style.display='none'">
        </div>
        <div class="title-section">
            <h3>${config.recto_country || ''}</h3>
            <p>${config.recto_ministry || ''}</p>
            <h2>${config.recto_company_name || 'HubISoccer'}</h2>
            <h1>${config.recto_title || 'LICENCE'}</h1>
        </div>
        <img src="${avatarUrl}" class="player-photo" alt="Photo" onerror="this.src='img/user-default.jpg'">
        <div class="info-grid">
            <div class="info-item"><strong>Nom complet</strong><span>${escapeHtml(fullName)}</span></div>
            <div class="info-item"><strong>Date de naissance</strong><span>${escapeHtml(dateNaissance)}</span></div>
            <div class="info-item"><strong>Lieu de naissance</strong><span>${escapeHtml(license.lieu_naissance || '-')}</span></div>
            <div class="info-item"><strong>Nationalité</strong><span>${escapeHtml(nationalite)}</span></div>
            <div class="info-item"><strong>Pays</strong><span>${escapeHtml(license.pays || '-')}</span></div>
            <div class="info-item"><strong>Téléphone</strong><span>${escapeHtml(telephone)}</span></div>
            <div class="info-item"><strong>Taille</strong><span>${escapeHtml(taille)} cm</span></div>
            <div class="info-item"><strong>Poids</strong><span>${escapeHtml(poids)} kg</span></div>
            <div class="info-item"><strong>Pied fort</strong><span>${escapeHtml(piedFort)}</span></div>
            <div class="info-item"><strong>Club</strong><span>${escapeHtml(club)}</span></div>
        </div>
        <div class="signature-stamp">
            <img src="${license.signature_url}" alt="Signature joueur" onerror="this.style.display='none'">
            <img src="${config.president_stamp_url || ''}" alt="Cachet" onerror="this.style.display='none'">
        </div>
    `;

    versoDiv.innerHTML = `
        <div class="verso-content">
            <img src="${config.verso_background_logo_url || ''}" class="watermark" alt="" onerror="this.style.display='none'">
            <div class="verso-details">
                <p><strong>ID HubISoccer :</strong> ${escapeHtml(hubId)}</p>
                <p><strong>Délivrée par :</strong> ${escapeHtml(config.verso_issued_by || 'HubISoccer')}</p>
                <p>${escapeHtml(config.verso_legal_info || 'Document officiel – Toute falsification est interdite.')}</p>
                <div class="qr-code" id="qrCodeContainer"></div>
            </div>
            <div class="signature-stamp" style="border-top: 1px dashed #e9ecef; margin-top: 10px; padding-top: 10px;">
                <span><strong>${escapeHtml(config.president_name || 'Le Président')}</strong></span>
                <img src="${config.president_signature_url || ''}" alt="Signature président" onerror="this.style.display='none'">
            </div>
        </div>
    `;

    const qrContainer = document.getElementById('qrCodeContainer');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        try {
            new QRCode(qrContainer, {
                text: verifyUrl,
                width: 100,
                height: 100,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (e) {
            console.error(e);
            qrContainer.innerHTML = '<p style="font-size:0.7rem;">QR code non disponible</p>';
        }
    }

    showFace('recto');
}

function showFace(face) {
    document.querySelectorAll('.card-face').forEach(el => el.classList.remove('active'));
    document.getElementById(face).classList.add('active');
    document.querySelectorAll('.card-footer button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btnRecto').classList.toggle('active', face === 'recto');
    document.getElementById('btnVerso').classList.toggle('active', face === 'verso');
}
window.showFace = showFace;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('btnRecto').addEventListener('click', () => showFace('recto'));
    document.getElementById('btnVerso').addEventListener('click', () => showFace('verso'));
    document.getElementById('printBtn').addEventListener('click', () => window.print());
});
