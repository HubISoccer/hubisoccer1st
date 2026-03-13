// ===== CONFIGURATION DE LA CARTE =====
const BUCKET_NAME = 'documents';

// Upload d'un fichier vers Storage
async function uploadFile(file, folder = 'config') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);
    return urlData.publicUrl;
}

// Charger la configuration existante
async function loadConfig() {
    const { data, error } = await supabaseAdmin
        .from('license_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
    if (error) {
        console.error('Erreur chargement config:', error);
        return;
    }
    if (data) {
        document.getElementById('recto_flag_url').value = data.recto_flag_url || '';
        document.getElementById('recto_logo_url').value = data.recto_logo_url || '';
        document.getElementById('recto_country').value = data.recto_country || '';
        document.getElementById('recto_ministry').value = data.recto_ministry || '';
        document.getElementById('recto_company_name').value = data.recto_company_name || '';
        document.getElementById('recto_title').value = data.recto_title || '';
        document.getElementById('verso_background_logo_url').value = data.verso_background_logo_url || '';
        document.getElementById('verso_issued_by').value = data.verso_issued_by || '';
        document.getElementById('verso_legal_info').value = data.verso_legal_info || '';
        document.getElementById('president_name').value = data.president_name || '';
        document.getElementById('president_signature_url').value = data.president_signature_url || '';
        document.getElementById('president_stamp_url').value = data.president_stamp_url || '';

        // Prévisualisations
        if (data.recto_flag_url) document.getElementById('flagPreview').src = data.recto_flag_url;
        if (data.recto_logo_url) document.getElementById('logoPreview').src = data.recto_logo_url;
        if (data.verso_background_logo_url) document.getElementById('watermarkPreview').src = data.verso_background_logo_url;
        if (data.president_signature_url) document.getElementById('signaturePreview').src = data.president_signature_url;
        if (data.president_stamp_url) document.getElementById('stampPreview').src = data.president_stamp_url;
    }
}

// Sauvegarde de la configuration
document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Récupérer les valeurs
    const config = {
        recto_flag_url: document.getElementById('recto_flag_url').value,
        recto_logo_url: document.getElementById('recto_logo_url').value,
        recto_country: document.getElementById('recto_country').value,
        recto_ministry: document.getElementById('recto_ministry').value,
        recto_company_name: document.getElementById('recto_company_name').value,
        recto_title: document.getElementById('recto_title').value,
        verso_background_logo_url: document.getElementById('verso_background_logo_url').value,
        verso_issued_by: document.getElementById('verso_issued_by').value,
        verso_legal_info: document.getElementById('verso_legal_info').value,
        president_name: document.getElementById('president_name').value,
        president_signature_url: document.getElementById('president_signature_url').value,
        president_stamp_url: document.getElementById('president_stamp_url').value,
        updated_at: new Date()
    };

    const { error } = await supabaseAdmin
        .from('license_config')
        .upsert({ id: 1, ...config });

    if (error) {
        alert('Erreur: ' + error.message);
    } else {
        alert('Configuration enregistrée !');
    }
});

// Gestion des uploads
function setupFileUpload(inputId, urlInputId, previewId) {
    document.getElementById(inputId).addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const url = await uploadFile(file, 'config');
            document.getElementById(urlInputId).value = url;
            document.getElementById(previewId).src = url;
        } catch (err) {
            alert('Erreur upload: ' + err.message);
        }
    });
}

setupFileUpload('flagFile', 'recto_flag_url', 'flagPreview');
setupFileUpload('logoFile', 'recto_logo_url', 'logoPreview');
setupFileUpload('watermarkFile', 'verso_background_logo_url', 'watermarkPreview');
setupFileUpload('signatureFile', 'president_signature_url', 'signaturePreview');
setupFileUpload('stampFile', 'president_stamp_url', 'stampPreview');

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await initAdminPage();
    await loadConfig();
});