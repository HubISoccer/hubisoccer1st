// ===== CONFIGURATION DE LA CARTE DE LICENCE =====
const BUCKET_NAME = 'documents';

// ===== FONCTIONS UTILITAIRES =====
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function showLoader(show) {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'global-loader';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }
    loader.style.display = show ? 'flex' : 'none';
}

// ===== UPLOAD D'UN FICHIER VERS STORAGE =====
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

// ===== CHARGEMENT DE LA CONFIGURATION EXISTANTE =====
async function loadConfig() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('license_config')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;

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

            // Mettre à jour les prévisualisations
            if (data.recto_flag_url) document.getElementById('flagPreview').src = data.recto_flag_url;
            if (data.recto_logo_url) document.getElementById('logoPreview').src = data.recto_logo_url;
            if (data.verso_background_logo_url) document.getElementById('watermarkPreview').src = data.verso_background_logo_url;
            if (data.president_signature_url) document.getElementById('signaturePreview').src = data.president_signature_url;
            if (data.president_stamp_url) document.getElementById('stampPreview').src = data.president_stamp_url;
        }
    } catch (error) {
        console.error('Erreur chargement config:', error);
        showToast('Erreur lors du chargement de la configuration', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== SAUVEGARDE DE LA CONFIGURATION =====
document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    try {
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

        if (error) throw error;

        showToast('Configuration enregistrée avec succès !', 'success');
    } catch (error) {
        console.error('Erreur sauvegarde config:', error);
        showToast('Erreur: ' + error.message, 'error');
    } finally {
        showLoader(false);
    }
});

// ===== GESTION DES UPLOADS =====
function setupFileUpload(inputId, urlInputId, previewId) {
    document.getElementById(inputId).addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Vérification de la taille (max 2 Mo)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Le fichier ne doit pas dépasser 2 Mo', 'warning');
            return;
        }

        try {
            const url = await uploadFile(file, 'config');
            document.getElementById(urlInputId).value = url;
            document.getElementById(previewId).src = url;
            showToast('Fichier uploadé avec succès', 'success');
        } catch (err) {
            console.error('Erreur upload:', err);
            showToast('Erreur lors de l\'upload: ' + err.message, 'error');
        }
    });
}

// Initialisation des uploads
setupFileUpload('flagFile', 'recto_flag_url', 'flagPreview');
setupFileUpload('logoFile', 'recto_logo_url', 'logoPreview');
setupFileUpload('watermarkFile', 'verso_background_logo_url', 'watermarkPreview');
setupFileUpload('signatureFile', 'president_signature_url', 'signaturePreview');
setupFileUpload('stampFile', 'president_stamp_url', 'stampPreview');

// ===== RAFRAÎCHISSEMENT =====
document.getElementById('refreshBtn').addEventListener('click', loadConfig);

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await initAdminPage();
    await loadConfig();
});