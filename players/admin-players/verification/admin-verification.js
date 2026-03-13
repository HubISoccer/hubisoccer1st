// ===== ADMIN VERIFICATION (CORRIGÉ) =====

// ===== ÉTAT GLOBAL =====
let currentTab = 'licenses';
let licensesData = [];
let documentsData = [];
let historyData = [];
let currentLicenseId = null;
let currentDocumentId = null;
let currentAction = null;

// ===== LOADER (ajouté) =====
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

// ===== TOAST (si non défini dans admin-common, on le définit) =====
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

// ===== CHARGEMENT DES DEMANDES DE LICENCE =====
async function loadLicenses() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('license_requests')
            .select(`
                *,
                player:player_profiles!license_requests_player_id_fkey (
                    id,
                    nom_complet,
                    avatar_url,
                    hub_id
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        licensesData = data || [];
        renderLicenses();
    } catch (error) {
        console.error('Erreur chargement licences:', error);
        showToast('Erreur lors du chargement des demandes', 'error');
    } finally {
        showLoader(false);
    }
}

function renderLicenses() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filter = document.getElementById('filterSelect')?.value || 'all';

    const filtered = licensesData.filter(license => {
        const matchesSearch = license.player?.nom_complet?.toLowerCase().includes(searchTerm) ||
                             license.nom?.toLowerCase().includes(searchTerm) ||
                             license.prenom?.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || (filter === 'approved' && license.admin_validated) || (filter === 'pending' && !license.admin_validated);
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('licensesList');
    if (!container) return;

    container.innerHTML = filtered.map(license => {
        const status = license.admin_validated ? 'approved' : 'pending';
        const statusText = license.admin_validated ? 'Validée' : 'En attente';
        const date = new Date(license.created_at).toLocaleDateString('fr-FR');

        return `
            <div class="license-card ${status}" data-license-id="${license.id}">
                <div class="license-header">
                    <span class="license-player">${license.player?.nom_complet || 'Inconnu'}</span>
                    <span class="license-date">${date}</span>
                </div>
                <div class="license-info">
                    <span><i class="fas fa-user"></i> ${license.prenom} ${license.nom}</span>
                    <span><i class="fas fa-phone"></i> ${license.telephone || '-'}</span>
                    <span><i class="fas fa-envelope"></i> ${license.email || '-'}</span>
                </div>
                <div class="license-status ${status}">${statusText}</div>
                <div class="license-actions">
                    <button class="btn-action view" onclick="viewLicense(${license.id})"><i class="fas fa-eye"></i> Voir</button>
                    ${!license.admin_validated ? `
                        <button class="btn-action approve" onclick="approveLicense(${license.id})"><i class="fas fa-check"></i> Valider</button>
                        <button class="btn-action reject" onclick="rejectLicense(${license.id})"><i class="fas fa-times"></i> Rejeter</button>
                    ` : `
                        <button class="btn-action download" onclick="downloadCard(${license.id})"><i class="fas fa-download"></i> Carte</button>
                    `}
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.license-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            const id = card.dataset.licenseId;
            viewLicense(parseInt(id));
        });
    });
}

// ===== CHARGEMENT DES DOCUMENTS =====
async function loadDocuments() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('document_requests')
            .select(`
                *,
                player:player_profiles!document_requests_player_id_fkey (
                    id,
                    nom_complet,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        documentsData = data || [];
        renderDocuments();
    } catch (error) {
        console.error('Erreur chargement documents:', error);
        showToast('Erreur lors du chargement des documents', 'error');
    } finally {
        showLoader(false);
    }
}

function renderDocuments() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filter = document.getElementById('filterSelect')?.value || 'all';

    const filtered = documentsData.filter(doc => {
        const matchesSearch = doc.player?.nom_complet?.toLowerCase().includes(searchTerm) ||
                             doc.document_type?.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || doc.status === filter;
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('documentsList');
    if (!container) return;

    container.innerHTML = filtered.map(doc => {
        const typeLabel = {
            id_card: 'Pièce d\'identité',
            photo: 'Photo',
            certificat_medical: 'Certificat médical',
            diplome: 'Diplôme',
            justificatif_domicile: 'Justificatif de domicile'
        }[doc.document_type] || doc.document_type;

        return `
            <div class="document-card ${doc.status}" data-doc-id="${doc.id}">
                <div class="document-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="document-info">
                    <div class="document-name">${doc.player?.nom_complet || 'Inconnu'} - ${typeLabel}</div>
                    <div class="document-meta">${doc.file_name || ''}</div>
                </div>
                <div class="document-status ${doc.status}">${doc.status === 'approved' ? 'Validé' : doc.status === 'pending' ? 'En attente' : 'Rejeté'}</div>
                <div class="document-actions">
                    <button class="btn-action view" onclick="viewDocument(${doc.id})"><i class="fas fa-eye"></i> Voir</button>
                    ${doc.status !== 'approved' ? `
                        <button class="btn-action approve" onclick="approveDocument(${doc.id})"><i class="fas fa-check"></i> Approuver</button>
                    ` : ''}
                    ${doc.status !== 'rejected' ? `
                        <button class="btn-action reject" onclick="rejectDocument(${doc.id})"><i class="fas fa-times"></i> Rejeter</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===== CHARGEMENT DE L'HISTORIQUE =====
async function loadHistory() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('license_requests')
            .select(`
                *,
                player:player_profiles!license_requests_player_id_fkey (
                    id,
                    nom_complet,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        historyData = data || [];
        renderHistory();
    } catch (error) {
        console.error('Erreur chargement historique:', error);
        showToast('Erreur lors du chargement de l\'historique', 'error');
    } finally {
        showLoader(false);
    }
}

function renderHistory() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filter = document.getElementById('filterSelect')?.value || 'all';

    const filtered = historyData.filter(license => {
        const matchesSearch = license.player?.nom_complet?.toLowerCase().includes(searchTerm) ||
                             license.nom?.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || (filter === 'approved' && license.admin_validated) || (filter === 'pending' && !license.admin_validated);
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('historyList');
    if (!container) return;

    container.innerHTML = filtered.map(license => {
        const status = license.admin_validated ? 'approved' : 'pending';
        const statusText = license.admin_validated ? 'Validée' : 'En attente';
        const date = new Date(license.created_at).toLocaleDateString('fr-FR');

        return `
            <div class="license-card ${status}" data-license-id="${license.id}" onclick="viewLicense(${license.id})">
                <div class="license-header">
                    <span class="license-player">${license.player?.nom_complet || 'Inconnu'}</span>
                    <span class="license-date">${date}</span>
                </div>
                <div class="license-info">
                    <span><i class="fas fa-user"></i> ${license.prenom} ${license.nom}</span>
                    <span><i class="fas fa-phone"></i> ${license.telephone || '-'}</span>
                </div>
                <div class="license-status ${status}">${statusText}</div>
            </div>
        `;
    }).join('');
}

// ===== ACTIONS SUR LES DEMANDES DE LICENCE =====
async function viewLicense(licenseId) {
    const license = licensesData.find(l => l.id === licenseId) || historyData.find(l => l.id === licenseId);
    if (!license) {
        showToast('Demande introuvable', 'error');
        return;
    }

    const modalBody = document.getElementById('licenseModalBody');
    const actionsDiv = document.getElementById('licenseModalActions');

    const dateNaissance = license.date_naissance ? new Date(license.date_naissance).toLocaleDateString('fr-FR') : '-';
    const createdDate = new Date(license.created_at).toLocaleDateString('fr-FR');

    modalBody.innerHTML = `
        <div class="license-detail">
            <div class="license-detail-section">
                <h3>Informations personnelles</h3>
                <div class="license-detail-grid">
                    <div class="license-detail-item">
                        <span class="label">Nom complet</span>
                        <span class="value">${license.prenom} ${license.nom}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Date de naissance</span>
                        <span class="value">${dateNaissance}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Lieu de naissance</span>
                        <span class="value">${license.lieu_naissance || '-'}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Nationalité</span>
                        <span class="value">${license.nationalite || '-'}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Pays</span>
                        <span class="value">${license.pays || '-'}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Téléphone</span>
                        <span class="value">${license.telephone || '-'}</span>
                    </div>
                </div>
            </div>

            <div class="license-detail-section">
                <h3>Adresse & Contact</h3>
                <div class="license-detail-grid">
                    <div class="license-detail-item">
                        <span class="label">Adresse</span>
                        <span class="value">${license.adresse || '-'}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Langue(s)</span>
                        <span class="value">${license.langue || '-'}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Email</span>
                        <span class="value">${license.email || '-'}</span>
                    </div>
                </div>
            </div>

            <div class="license-detail-section">
                <h3>Informations sportives</h3>
                <div class="license-detail-grid">
                    <div class="license-detail-item">
                        <span class="label">Taille</span>
                        <span class="value">${license.taille || '-'} cm</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Poids</span>
                        <span class="value">${license.poids || '-'} kg</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Pied fort</span>
                        <span class="value">${license.pied_fort || '-'}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Club</span>
                        <span class="value">${license.club || '-'}</span>
                    </div>
                </div>
            </div>

            <div class="license-detail-section">
                <h3>Signature</h3>
                <img src="${license.signature_url}" class="license-signature" alt="Signature">
            </div>

            <div class="license-detail-section">
                <h3>Métadonnées</h3>
                <div class="license-detail-grid">
                    <div class="license-detail-item">
                        <span class="label">Soumise le</span>
                        <span class="value">${createdDate}</span>
                    </div>
                    <div class="license-detail-item">
                        <span class="label">Statut</span>
                        <span class="value">${license.admin_validated ? 'Validée' : 'En attente'}</span>
                    </div>
                    ${license.carte_url ? `
                    <div class="license-detail-item">
                        <span class="label">Carte</span>
                        <span class="value"><a href="${license.carte_url}" target="_blank">Télécharger</a></span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    actionsDiv.innerHTML = `
        <button class="btn-cancel" onclick="closeLicenseModal()">Fermer</button>
        ${!license.admin_validated ? `
            <button class="btn-confirm" onclick="approveLicense(${license.id})">Valider</button>
            <button class="btn-reject" onclick="rejectLicense(${license.id})">Rejeter</button>
        ` : ''}
    `;

    document.getElementById('licenseModal').style.display = 'block';
    currentLicenseId = license.id;
}

function closeLicenseModal() {
    document.getElementById('licenseModal').style.display = 'none';
}

async function approveLicense(licenseId) {
    currentAction = { type: 'approveLicense', licenseId };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Voulez-vous valider cette demande de licence ?</p>
        <p>Vous pourrez ensuite télécharger la carte de licence.</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Valider</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

async function rejectLicense(licenseId) {
    const reason = prompt('Motif du rejet (optionnel) :');
    if (reason === null) return;

    currentAction = { type: 'rejectLicense', licenseId, reason };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir rejeter cette demande ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

async function downloadCard(licenseId) {
    const license = licensesData.find(l => l.id === licenseId) || historyData.find(l => l.id === licenseId);
    if (license?.carte_url) {
        window.open(license.carte_url, '_blank');
    } else {
        showToast('Aucune carte disponible', 'warning');
    }
}

// ===== ACTIONS SUR LES DOCUMENTS =====
async function viewDocument(docId) {
    const doc = documentsData.find(d => d.id === docId);
    if (!doc) return;

    const modalBody = document.getElementById('documentModalBody');
    const actionsDiv = document.getElementById('documentModalActions');

    const typeLabel = {
        id_card: 'Pièce d\'identité',
        photo: 'Photo',
        certificat_medical: 'Certificat médical',
        diplome: 'Diplôme',
        justificatif_domicile: 'Justificatif de domicile'
    }[doc.document_type] || doc.document_type;

    modalBody.innerHTML = `
        <div style="text-align: center;">
            <p><strong>${doc.player?.nom_complet || 'Inconnu'}</strong> - ${typeLabel}</p>
            <p>Fichier : ${doc.file_name || ''}</p>
            ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" class="btn-action view">Voir le fichier</a>` : ''}
            <p>Statut actuel : <span class="document-status ${doc.status}">${doc.status}</span></p>
        </div>
    `;

    actionsDiv.innerHTML = `
        <button class="btn-cancel" onclick="closeDocumentModal()">Fermer</button>
        ${doc.status !== 'approved' ? `
            <button class="btn-confirm" onclick="approveDocument(${doc.id})">Approuver</button>
        ` : ''}
        ${doc.status !== 'rejected' ? `
            <button class="btn-reject" onclick="rejectDocument(${doc.id})">Rejeter</button>
        ` : ''}
    `;

    document.getElementById('documentModal').style.display = 'block';
    currentDocumentId = doc.id;
}

function closeDocumentModal() {
    document.getElementById('documentModal').style.display = 'none';
}

async function approveDocument(docId) {
    currentAction = { type: 'approveDocument', docId };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Approuver ce document ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

async function rejectDocument(docId) {
    const reason = prompt('Motif du rejet (optionnel) :');
    if (reason === null) return;

    currentAction = { type: 'rejectDocument', docId, reason };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Rejeter ce document ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

// ===== EXÉCUTION DES ACTIONS =====
async function executeAction() {
    if (!currentAction) return;

    const { type, licenseId, docId, reason } = currentAction;

    try {
        if (type === 'approveLicense') {
            closeConfirmModal();
            showCardUploadModal(licenseId);
        } else if (type === 'rejectLicense') {
            const { error } = await supabaseAdmin
                .from('license_requests')
                .update({ admin_validated: false })
                .eq('id', licenseId);
            if (error) throw error;
            showToast('Demande rejetée', 'success');
            closeLicenseModal();
            loadLicenses();
        } else if (type === 'approveDocument') {
            const { error } = await supabaseAdmin
                .from('document_requests')
                .update({ status: 'approved' })
                .eq('id', docId);
            if (error) throw error;
            showToast('Document approuvé', 'success');
            closeDocumentModal();
            loadDocuments();
        } else if (type === 'rejectDocument') {
            const { error } = await supabaseAdmin
                .from('document_requests')
                .update({ status: 'rejected' })
                .eq('id', docId);
            if (error) throw error;
            showToast('Document rejeté', 'success');
            closeDocumentModal();
            loadDocuments();
        }
    } catch (error) {
        console.error('Erreur action:', error);
        showToast('Erreur: ' + error.message, 'error');
    } finally {
        currentAction = null;
        closeConfirmModal();
    }
}

// ===== UPLOAD DE LA CARTE =====
function showCardUploadModal(licenseId) {
    currentLicenseId = licenseId;
    document.getElementById('cardUploadModal').style.display = 'block';
}

function closeCardUploadModal() {
    document.getElementById('cardUploadModal').style.display = 'none';
}

document.getElementById('uploadCardBtn')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('cardFile');
    const file = fileInput.files[0];
    if (!file) {
        showToast('Veuillez sélectionner un fichier', 'warning');
        return;
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `licence_${currentLicenseId}_${Date.now()}.${fileExt}`;
        const filePath = `licences/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('documents')
            .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseAdmin.storage
            .from('documents')
            .getPublicUrl(filePath);
        const carteUrl = urlData.publicUrl;

        const { error: updateError } = await supabaseAdmin
            .from('license_requests')
            .update({
                admin_validated: true,
                carte_url: carteUrl
            })
            .eq('id', currentLicenseId);
        if (updateError) throw updateError;

        showToast('Licence validée et carte uploadée', 'success');
        closeCardUploadModal();
        closeLicenseModal();
        loadLicenses();
        loadHistory();
    } catch (error) {
        console.error('Erreur upload carte:', error);
        showToast('Erreur: ' + error.message, 'error');
    }
});

// ===== GESTION DES ONGLETS =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById(`tab-${tab}`).classList.add('active');
            currentTab = tab;

            document.getElementById('searchInput').value = '';
            document.getElementById('filterSelect').value = 'all';

            if (tab === 'licenses') loadLicenses();
            else if (tab === 'documents') loadDocuments();
            else if (tab === 'history') loadHistory();
        });
    });
}

// ===== RECHERCHE =====
document.getElementById('searchInput')?.addEventListener('input', () => {
    if (currentTab === 'licenses') renderLicenses();
    else if (currentTab === 'documents') renderDocuments();
    else if (currentTab === 'history') renderHistory();
});

document.getElementById('filterSelect')?.addEventListener('change', () => {
    if (currentTab === 'licenses') renderLicenses();
    else if (currentTab === 'documents') renderDocuments();
    else if (currentTab === 'history') renderHistory();
});

// ===== RAFRAÎCHISSEMENT =====
document.getElementById('refreshBtn').addEventListener('click', () => {
    if (currentTab === 'licenses') loadLicenses();
    else if (currentTab === 'documents') loadDocuments();
    else if (currentTab === 'history') loadHistory();
});

// ===== MODALES =====
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await initAdminPage();
    initTabs();
    loadLicenses();
});

// Exposer les fonctions globales
window.viewLicense = viewLicense;
window.closeLicenseModal = closeLicenseModal;
window.approveLicense = approveLicense;
window.rejectLicense = rejectLicense;
window.downloadCard = downloadCard;
window.viewDocument = viewDocument;
window.closeDocumentModal = closeDocumentModal;
window.approveDocument = approveDocument;
window.rejectDocument = rejectDocument;
window.executeAction = executeAction;
window.closeConfirmModal = closeConfirmModal;
window.closeCardUploadModal = closeCardUploadModal;