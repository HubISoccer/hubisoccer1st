// ===== ADMIN VERIFICATION (AVEC WORKFLOW PRÉSIDENT) =====

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

// ===== FONCTION POUR VÉRIFIER SI UN FICHIER EXISTE =====
async function checkFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
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
        const matchesFilter = filter === 'all' || license.status === filter;
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('licensesList');
    if (!container) return;

    container.innerHTML = filtered.map(license => {
        const statusClass = license.status;
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
        const matchesFilter = filter === 'all' || license.status === filter;
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('historyList');
    if (!container) return;

    container.innerHTML = filtered.map(license => {
        const statusClass = license.status;
        const statusText = {
            admin_pending: 'Admin en attente',
            president_pending: 'Président en attente',
            approved: 'Validée',
            rejected: 'Rejetée'
        }[license.status] || 'En attente';
        const date = new Date(license.created_at).toLocaleDateString('fr-FR');

        return `
            <div class="license-card ${statusClass}" data-license-id="${license.id}" onclick="viewLicense(${license.id})">
                <div class="license-header">
                    <span class="license-player">${license.player?.nom_complet || 'Inconnu'}</span>
                    <span class="license-date">${date}</span>
                </div>
                <div class="license-info">
                    <span><i class="fas fa-user"></i> ${license.prenom} ${license.nom}</span>
                    <span><i class="fas fa-phone"></i> ${license.telephone || '-'}</span>
                </div>
                <div class="license-status ${statusClass}">${statusText}</div>
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
                        <span class="value">${{admin_pending:'Admin en attente', president_pending:'Président en attente', approved:'Validée', rejected:'Rejetée'}[license.status] || license.status}</span>
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

    let actionsHtml = `<button class="btn-cancel" onclick="closeLicenseModal()">Fermer</button>
                       <button class="btn-confirm" onclick="editLicense(${license.id})">Modifier</button>`;
    if (license.status === 'admin_pending') {
        actionsHtml += `<button class="btn-confirm" onclick="approveLicense(${license.id})">Valider (admin)</button>
                        <button class="btn-reject" onclick="rejectLicense(${license.id})">Rejeter</button>`;
    } else if (license.status === 'president_pending') {
        actionsHtml += `<button class="btn-confirm" onclick="presidentApproveLicense(${license.id})">Approuver (président)</button>
                        <button class="btn-reject" onclick="rejectLicense(${license.id})">Rejeter</button>`;
    } else if (license.status === 'approved') {
        actionsHtml += `<button class="btn-action download" onclick="downloadCard(${license.id})">Télécharger la carte</button>`;
    }
    actionsDiv.innerHTML = actionsHtml;

    document.getElementById('licenseModal').style.display = 'block';
    currentLicenseId = license.id;
}

function closeLicenseModal() {
    document.getElementById('licenseModal').style.display = 'none';
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

// ===== ACTIONS SUR LES DEMANDES =====
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
    currentAction = { type: 'presidentApprove', licenseId };
    // Ouvrir la modale d'upload de carte (existante)
    showCardUploadModal(licenseId);
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
        loadHistory();
        closeLicenseModal();
    }
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

    const fileExists = doc.file_url ? await checkFileExists(doc.file_url) : false;

    const modalBody = document.getElementById('documentModalBody');
    const actionsDiv = document.getElementById('documentModalActions');

    const typeLabel = {
        id_card: 'Pièce d\'identité',
        photo: 'Photo',
        certificat_medical: 'Certificat médical',
        diplome: 'Diplôme',
        justificatif_domicile: 'Justificatif de domicile'
    }[doc.document_type] || doc.document_type;

    let fileHtml = '';
    if (doc.file_url) {
        if (fileExists) {
            fileHtml = `<a href="${doc.file_url}" target="_blank" class="btn-action view">Voir le fichier</a>`;
        } else {
            fileHtml = `<p style="color: var(--danger);">⚠️ Le fichier est introuvable dans le stockage.</p>`;
        }
    }

    modalBody.innerHTML = `
        <div style="text-align: center;">
            <p><strong>${doc.player?.nom_complet || 'Inconnu'}</strong> - ${typeLabel}</p>
            <p>Fichier : ${doc.file_name || ''}</p>
            ${fileHtml}
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
            const { error: deleteError } = await supabaseAdmin.storage
                .from('documents')
                .remove([filePath]);
            if (deleteError) {
                console.error('Erreur suppression fichier:', deleteError);
                showToast('Fichier non trouvé, suppression de l\'entrée quand même', 'warning');
            }
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
        if (type === 'presidentApprove') {
            // L'upload de carte est géré dans la modale, on ne fait rien ici
            closeConfirmModal();
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

// ===== UPLOAD DE LA CARTE (pour le président) =====
function showCardUploadModal(licenseId) {
    currentLicenseId = licenseId;
    document.getElementById('cardUploadModal').style.display = 'block';
}

function closeCardUploadModal() {
    document.getElementById('cardUploadModal').style.display = 'none';
}

document.getElementById('cardFile')?.addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || 'Aucun fichier choisi';
    document.getElementById('file-name').textContent = fileName;
});

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

        // Mettre à jour la demande : statut approved, carte_url
        const { error: updateError } = await supabaseAdmin
            .from('license_requests')
            .update({
                status: 'approved',
                carte_url: carteUrl
            })
            .eq('id', currentLicenseId);
        if (updateError) throw updateError;

        // Récupérer l'ID du joueur pour la notification
        const license = licensesData.find(l => l.id === currentLicenseId) || historyData.find(l => l.id === currentLicenseId);
        const playerId = license?.player?.id;
        if (playerId) {
            await supabaseAdmin
                .from('notifications')
                .insert([{
                    player_id: playerId,
                    title: 'Votre licence est prête !',
                    content: 'Votre carte de licence HubISoccer est disponible. Cliquez pour la voir.',
                    link: `../../carte.html?id=${currentLicenseId}`
                }]);
        }

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
window.editLicense = editLicense;
window.closeEditLicenseModal = closeEditLicenseModal;
window.approveLicense = approveLicense;
window.presidentApproveLicense = presidentApproveLicense;
window.rejectLicense = rejectLicense;
window.downloadCard = downloadCard;
window.viewDocument = viewDocument;
window.closeDocumentModal = closeDocumentModal;
window.editDocument = editDocument;
window.deleteDocument = deleteDocument;
window.approveDocument = approveDocument;
window.rejectDocument = rejectDocument;
window.executeAction = executeAction;
window.closeConfirmModal = closeConfirmModal;
window.closeCardUploadModal = closeCardUploadModal;