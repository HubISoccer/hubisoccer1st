// ===== ADMIN VERIFICATION (AVEC SUPPRESSION ET AUTOMATISATION) =====

// ===== ÉTAT GLOBAL =====
let currentTab = 'licenses';
let licensesData = [];
let documentsData = [];
let historyData = [];
let currentLicenseId = null;
let currentDocumentId = null;
let currentAction = null;

// ===== LOADER =====
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

// ===== TOAST =====
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

// ===== FONCTION POUR NETTOYER LES URLS =====
function fixSignatureUrl(url) {
    if (!url) return url;
    if (url.startsWith('http')) return url;
    const baseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co/storage/v1/object/public/';
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return baseUrl + cleanUrl;
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
        const matchesFilter = filter === 'all' || 
            (filter === 'approved' && license.status === 'approved') ||
            (filter === 'pending' && (license.status === 'admin_pending' || license.status === 'president_pending'));
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('licensesList');
    if (!container) return;

    container.innerHTML = filtered.map(license => {
        const statusClass = license.status === 'approved' ? 'approved' : (license.status === 'rejected' ? 'rejected' : 'pending');
        const statusText = {
            admin_pending: 'Admin en attente',
            president_pending: 'Président en attente',
            approved: 'Validée',
            rejected: 'Rejetée'
        }[license.status] || 'En attente';
        const date = new Date(license.created_at).toLocaleDateString('fr-FR');

        return `
            <div class="license-card ${statusClass}" data-license-id="${license.id}">
                <div class="license-header">
                    <span class="license-player">${license.player?.nom_complet || 'Inconnu'}</span>
                    <span class="license-date">${date}</span>
                </div>
                <div class="license-info">
                    <span><i class="fas fa-user"></i> ${license.prenom} ${license.nom}</span>
                    <span><i class="fas fa-phone"></i> ${license.telephone || '-'}</span>
                    <span><i class="fas fa-envelope"></i> ${license.email || '-'}</span>
                </div>
                <div class="license-status ${statusClass}">${statusText}</div>
                <div class="license-actions">
                    <button class="btn-action view" onclick="viewLicense(${license.id})"><i class="fas fa-eye"></i> Voir</button>
                    <button class="btn-action edit" onclick="editLicense(${license.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="btn-action delete" onclick="deleteLicense(${license.id})"><i class="fas fa-trash"></i> Supprimer</button>
                    ${license.status === 'admin_pending' ? `
                        <button class="btn-action approve" onclick="approveLicense(${license.id})"><i class="fas fa-check"></i> Valider (admin)</button>
                        <button class="btn-action reject" onclick="rejectLicense(${license.id})"><i class="fas fa-times"></i> Rejeter</button>
                    ` : license.status === 'president_pending' ? `
                        <button class="btn-action approve" onclick="presidentApproveLicense(${license.id})"><i class="fas fa-check"></i> Approuver (président)</button>
                        <button class="btn-action reject" onclick="rejectLicense(${license.id})"><i class="fas fa-times"></i> Rejeter</button>
                    ` : license.status === 'approved' ? `
                        <button class="btn-action download" onclick="downloadCard(${license.id})"><i class="fas fa-download"></i> Carte</button>
                    ` : ''}
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
                    <button class="btn-action edit" onclick="editDocument(${doc.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="btn-action delete" onclick="deleteDocument(${doc.id})"><i class="fas fa-trash"></i> Supprimer</button>
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
        const matchesFilter = filter === 'all' || 
            (filter === 'approved' && license.status === 'approved') ||
            (filter === 'pending' && (license.status === 'admin_pending' || license.status === 'president_pending'));
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('historyList');
    if (!container) return;

    container.innerHTML = filtered.map(license => {
        const statusClass = license.status === 'approved' ? 'approved' : (license.status === 'rejected' ? 'rejected' : 'pending');
        const statusText = {
            admin_pending: 'Admin en attente',
            president_pending: 'Président en attente',
            approved: 'Validée',
            rejected: 'Rejetée'
        }[license.status] || 'En attente';
        const date = new Date(license.created_at).toLocaleDateString('fr-FR');

        return `
            <div class="license-card ${statusClass}" data-license-id="${license.id}">
                <div class="license-header">
                    <span class="license-player">${license.player?.nom_complet || 'Inconnu'}</span>
                    <span class="license-date">${date}</span>
                </div>
                <div class="license-info">
                    <span><i class="fas fa-user"></i> ${license.prenom} ${license.nom}</span>
                    <span><i class="fas fa-phone"></i> ${license.telephone || '-'}</span>
                </div>
                <div class="license-status ${statusClass}">${statusText}</div>
                <div class="license-actions">
                    <button class="btn-action view" onclick="viewLicense(${license.id})"><i class="fas fa-eye"></i> Voir</button>
                    <button class="btn-action delete" onclick="deleteLicense(${license.id})"><i class="fas fa-trash"></i> Supprimer</button>
                    ${license.status === 'approved' ? `
                        <button class="btn-action download" onclick="downloadCard(${license.id})"><i class="fas fa-download"></i> Carte</button>
                    ` : ''}
                </div>
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

    const signatureUrl = fixSignatureUrl(license.signature_url);

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
                <img src="${signatureUrl}" class="license-signature" alt="Signature" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <p style="display:none; color:var(--danger);">Signature non disponible</p>
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
                        <span class="value">${license.status === 'approved' ? 'Validée' : (license.status === 'rejected' ? 'Rejetée' : 'En attente')}</span>
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
        <button class="btn-confirm" onclick="editLicense(${license.id})">Modifier</button>
        <button class="btn-reject" onclick="deleteLicense(${license.id})">Supprimer</button>
        ${license.status === 'admin_pending' ? `
            <button class="btn-confirm" onclick="approveLicense(${license.id})">Valider (admin)</button>
            <button class="btn-reject" onclick="rejectLicense(${license.id})">Rejeter</button>
        ` : license.status === 'president_pending' ? `
            <button class="btn-confirm" onclick="presidentApproveLicense(${license.id})">Approuver (président)</button>
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
    const { error } = await supabaseAdmin
        .from('license_requests')
        .update({ status: 'president_pending' })
        .eq('id', licenseId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Demande envoyée au président', 'success');
        loadLicenses();
        closeLicenseModal();
    }
}

async function presidentApproveLicense(licenseId) {
    try {
        const { data: license } = await supabaseAdmin
            .from('license_requests')
            .select('player_id')
            .eq('id', licenseId)
            .single();

        if (!license) throw new Error('Demande introuvable');

        const { error } = await supabaseAdmin
            .from('license_requests')
            .update({ status: 'approved' })
            .eq('id', licenseId);
        if (error) throw error;

        const carteUrl = `../../carte.html?id=${licenseId}`;
        await supabaseAdmin
            .from('notifications')
            .insert([{
                player_id: license.player_id,
                title: 'Votre licence est prête !',
                content: 'Votre carte de licence HubISoccer est disponible. Cliquez pour la voir.',
                link: carteUrl
            }]);

        showToast('Licence approuvée et notification envoyée', 'success');
        loadLicenses();
        closeLicenseModal();
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function rejectLicense(licenseId) {
    const reason = prompt('Motif du rejet (optionnel) :');
    if (reason === null) return;

    const { error } = await supabaseAdmin
        .from('license_requests')
        .update({ status: 'rejected' })
        .eq('id', licenseId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Demande rejetée', 'success');
        loadLicenses();
        closeLicenseModal();
    }
}

async function deleteLicense(licenseId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande de licence ? Cette action est irréversible.')) return;

    const { error } = await supabaseAdmin
        .from('license_requests')
        .delete()
        .eq('id', licenseId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Demande supprimée', 'success');
        loadLicenses();
        loadHistory();
        closeLicenseModal();
    }
}

async function downloadCard(licenseId) {
    const license = licensesData.find(l => l.id === licenseId) || historyData.find(l => l.id === licenseId);
    if (license?.carte_url) {
        window.open(license.carte_url, '_blank');
    } else {
        window.open(`../../carte.html?id=${licenseId}`, '_blank');
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
        <button class="btn-confirm" onclick="editDocument(${doc.id})">Modifier</button>
        <button class="btn-reject" onclick="deleteDocument(${doc.id})">Supprimer</button>
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

async function editDocument(docId) {
    const doc = documentsData.find(d => d.id === docId);
    if (!doc) return;

    const newStatus = prompt('Nouveau statut (pending/approved/rejected) :', doc.status);
    if (!newStatus || !['pending', 'approved', 'rejected'].includes(newStatus)) {
        showToast('Statut invalide', 'warning');
        return;
    }

    const newType = prompt('Nouveau type (id_card/photo/certificat_medical/diplome/justificatif_domicile) :', doc.document_type);
    if (!newType) return;

    const updates = { status: newStatus, document_type: newType };

    const { error } = await supabaseAdmin
        .from('document_requests')
        .update(updates)
        .eq('id', docId);

    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Document mis à jour', 'success');
        closeDocumentModal();
        loadDocuments();
    }
}

async function deleteDocument(docId) {
    const doc = documentsData.find(d => d.id === docId);
    if (!doc) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.')) return;

    if (doc.file_url) {
        const urlParts = doc.file_url.split('/storage/v1/object/public/documents/');
        if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabaseAdmin.storage.from('documents').remove([filePath]);
        }
    }

    const { error } = await supabaseAdmin
        .from('document_requests')
        .delete()
        .eq('id', docId);

    if (error) {
        showToast('Erreur suppression: ' + error.message, 'error');
    } else {
        showToast('Document supprimé', 'success');
        loadDocuments();
    }
}

async function approveDocument(docId) {
    const { error } = await supabaseAdmin
        .from('document_requests')
        .update({ status: 'approved' })
        .eq('id', docId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Document approuvé', 'success');
        closeDocumentModal();
        loadDocuments();
    }
}

async function rejectDocument(docId) {
    const reason = prompt('Motif du rejet (optionnel) :');
    if (reason === null) return;

    const { error } = await supabaseAdmin
        .from('document_requests')
        .update({ status: 'rejected' })
        .eq('id', docId);
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
    } else {
        showToast('Document rejeté', 'success');
        closeDocumentModal();
        loadDocuments();
    }
}

// ===== MODALE D'ÉDITION DE LICENCE =====
async function editLicense(licenseId) {
    const license = licensesData.find(l => l.id === licenseId) || historyData.find(l => l.id === licenseId);
    if (!license) {
        showToast('Demande introuvable', 'error');
        return;
    }

    let editModal = document.getElementById('editLicenseModal');
    if (!editModal) {
        editModal = document.createElement('div');
        editModal.id = 'editLicenseModal';
        editModal.className = 'modal';
        editModal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Modifier la demande de licence</h2>
                    <span class="close-modal" onclick="closeEditLicenseModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editLicenseForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nom</label>
                                <input type="text" id="edit_nom" required>
                            </div>
                            <div class="form-group">
                                <label>Prénom</label>
                                <input type="text" id="edit_prenom" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date de naissance</label>
                                <input type="date" id="edit_date_naissance" required>
                            </div>
                            <div class="form-group">
                                <label>Lieu de naissance</label>
                                <input type="text" id="edit_lieu_naissance" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Adresse</label>
                                <input type="text" id="edit_adresse" required>
                            </div>
                            <div class="form-group">
                                <label>Nationalité</label>
                                <input type="text" id="edit_nationalite" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Pays</label>
                                <input type="text" id="edit_pays" required>
                            </div>
                            <div class="form-group">
                                <label>Langue(s)</label>
                                <input type="text" id="edit_langue" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Téléphone</label>
                                <input type="tel" id="edit_telephone" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="edit_email" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Taille (cm)</label>
                                <input type="number" id="edit_taille">
                            </div>
                            <div class="form-group">
                                <label>Poids (kg)</label>
                                <input type="number" id="edit_poids">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Pied fort</label>
                                <select id="edit_pied_fort">
                                    <option value="">Sélectionnez</option>
                                    <option>Droitier</option>
                                    <option>Gaucher</option>
                                    <option>Ambidextre</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Club</label>
                                <input type="text" id="edit_club">
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-cancel" onclick="closeEditLicenseModal()">Annuler</button>
                            <button type="submit" class="btn-confirm">Enregistrer</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(editModal);

        document.getElementById('editLicenseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updates = {
                nom: document.getElementById('edit_nom').value,
                prenom: document.getElementById('edit_prenom').value,
                date_naissance: document.getElementById('edit_date_naissance').value,
                lieu_naissance: document.getElementById('edit_lieu_naissance').value,
                adresse: document.getElementById('edit_adresse').value,
                nationalite: document.getElementById('edit_nationalite').value,
                pays: document.getElementById('edit_pays').value,
                langue: document.getElementById('edit_langue').value,
                telephone: document.getElementById('edit_telephone').value,
                email: document.getElementById('edit_email').value,
                taille: document.getElementById('edit_taille').value || null,
                poids: document.getElementById('edit_poids').value || null,
                pied_fort: document.getElementById('edit_pied_fort').value || null,
                club: document.getElementById('edit_club').value || null,
            };

            const { error } = await supabaseAdmin
                .from('license_requests')
                .update(updates)
                .eq('id', currentLicenseId);

            if (error) {
                showToast('Erreur lors de la mise à jour: ' + error.message, 'error');
            } else {
                showToast('Demande mise à jour avec succès', 'success');
                closeEditLicenseModal();
                closeLicenseModal();
                loadLicenses();
                loadHistory();
            }
        });
    }

    document.getElementById('edit_nom').value = license.nom || '';
    document.getElementById('edit_prenom').value = license.prenom || '';
    document.getElementById('edit_date_naissance').value = license.date_naissance || '';
    document.getElementById('edit_lieu_naissance').value = license.lieu_naissance || '';
    document.getElementById('edit_adresse').value = license.adresse || '';
    document.getElementById('edit_nationalite').value = license.nationalite || '';
    document.getElementById('edit_pays').value = license.pays || '';
    document.getElementById('edit_langue').value = license.langue || '';
    document.getElementById('edit_telephone').value = license.telephone || '';
    document.getElementById('edit_email').value = license.email || '';
    document.getElementById('edit_taille').value = license.taille || '';
    document.getElementById('edit_poids').value = license.poids || '';
    document.getElementById('edit_pied_fort').value = license.pied_fort || '';
    document.getElementById('edit_club').value = license.club || '';

    currentLicenseId = license.id;
    editModal.style.display = 'block';
}

function closeEditLicenseModal() {
    document.getElementById('editLicenseModal').style.display = 'none';
}

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
window.editLicense = editLicense;
window.closeEditLicenseModal = closeEditLicenseModal;
window.approveLicense = approveLicense;
window.presidentApproveLicense = presidentApproveLicense;
window.rejectLicense = rejectLicense;
window.deleteLicense = deleteLicense;
window.downloadCard = downloadCard;
window.viewDocument = viewDocument;
window.closeDocumentModal = closeDocumentModal;
window.editDocument = editDocument;
window.deleteDocument = deleteDocument;
window.approveDocument = approveDocument;
window.rejectDocument = rejectDocument;
window.closeConfirmModal = closeConfirmModal;