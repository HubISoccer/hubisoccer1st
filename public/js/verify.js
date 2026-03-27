const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseVerify = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const licenseId = urlParams.get('id');

// ... le reste du code, en remplaçant toutes les occurrences de `supabase` par `supabaseVerify`
function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function verifyLicense() {
    showLoader();
    const resultDiv = document.getElementById('verificationResult');
    try {
        if (!licenseId) {
            resultDiv.innerHTML = '<p class="error-message">ID de licence manquant.</p>';
            return;
        }

        const { data: license, error } = await supabase
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
            resultDiv.innerHTML = '<p class="error-message">Licence introuvable.</p>';
            return;
        }

        if (license.status !== 'approved') {
            resultDiv.innerHTML = `
                <div style="text-align:center;">
                    <i class="fas fa-hourglass-half" style="font-size: 3rem; color: var(--warning);"></i>
                    <p class="error-message">Cette licence est en attente de validation.</p>
                    <p>Revenez plus tard.</p>
                </div>
            `;
            return;
        }

        // Licence valide
        const fullName = license.player?.full_name || `${license.prenom || ''} ${license.nom || ''}`.trim() || 'Nom non renseigné';
        const dateNaissance = license.player?.date_of_birth 
            ? new Date(license.player.date_of_birth).toLocaleDateString('fr-FR') 
            : (license.date_naissance ? new Date(license.date_naissance).toLocaleDateString('fr-FR') : '-');
        const avatarUrl = license.player?.avatar_url || 'img/user-default.jpg';
        const hubId = license.player?.hubisoccer_id || license.id;
        const telephone = license.player?.phone || license.telephone || '-';
        const nationalite = license.player?.country || license.nationalite || '-';

        resultDiv.innerHTML = `
            <div style="text-align: center;">
                <img src="${avatarUrl}" alt="Photo" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--gold); margin-bottom: 15px;">
                <h3>${escapeHtml(fullName)}</h3>
                <span class="status-badge valid"><i class="fas fa-check-circle"></i> Licence valide</span>
            </div>
            <div class="info-grid">
                <div class="info-item"><strong>ID HubISoccer</strong><span>${escapeHtml(hubId)}</span></div>
                <div class="info-item"><strong>Date de naissance</strong><span>${escapeHtml(dateNaissance)}</span></div>
                <div class="info-item"><strong>Lieu de naissance</strong><span>${escapeHtml(license.lieu_naissance || '-')}</span></div>
                <div class="info-item"><strong>Nationalité</strong><span>${escapeHtml(nationalite)}</span></div>
                <div class="info-item"><strong>Téléphone</strong><span>${escapeHtml(telephone)}</span></div>
                <div class="info-item"><strong>Pays</strong><span>${escapeHtml(license.pays || '-')}</span></div>
            </div>
            <hr style="margin: 20px 0;">
            <p style="text-align: center; font-size: 0.85rem; color: var(--gray);">
                Cette licence est délivrée par HubISoccer conformément aux règlements de la FIFA.<br>
                Vérification effectuée le ${new Date().toLocaleDateString('fr-FR')}.
            </p>
        `;
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = '<p class="error-message">Erreur lors de la vérification.</p>';
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', verifyLicense);
