// ===== ADMIN CV (VERSION CORRIGÉE) =====

let cvsData = [];
let currentCvId = null;
let currentAction = null;

// ===== CHARGEMENT DES CV =====
async function loadCVs() {
    showLoader(true);
    try {
        const { data, error } = await supabaseAdmin
            .from('player_cv')
            .select(`
                id,
                player_id,
                data,
                validation_status,
                created_at,
                updated_at,
                player:player_profiles!player_id (
                    id,
                    nom_complet,
                    avatar_url,
                    hub_id
                )
            `)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        cvsData = data || [];
        renderCVs();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement CV:', error);
        showToast('Erreur lors du chargement des CV', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES CV =====
function renderCVs() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';

    const filtered = cvsData.filter(cv => {
        const playerName = cv.player?.nom_complet?.toLowerCase() || '';
        const matchesSearch = playerName.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || cv.validation_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const container = document.getElementById('cvList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucun CV trouvé.</p>';
        return;
    }

    container.innerHTML = filtered.map(cv => {
        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[cv.validation_status] || 'Inconnu';

        const playerName = cv.player?.nom_complet || 'Joueur inconnu';
        const avatarUrl = cv.player?.avatar_url || '../../img/user-default.jpg';
        const date = new Date(cv.updated_at).toLocaleDateString('fr-FR');

        // Extraire quelques infos du JSON pour l'aperçu
        const data = cv.data || {};
        const poste = data.position || data.poste_precis || 'Non renseigné';
        const club = data.club || 'Non renseigné';

        return `
            <div class="cv-card ${cv.validation_status}" data-cv-id="${cv.id}">
                <img src="${avatarUrl}" class="cv-avatar">
                <div class="cv-info">
                    <div class="cv-player">${playerName}</div>
                    <div class="cv-date">Mis à jour le ${date}</div>
                    <div class="cv-stats">${poste} | ${club}</div>
                </div>
                <div class="cv-status ${cv.validation_status}">${statusText}</div>
                <div class="cv-actions">
                    <button class="btn-action view" onclick="viewCV(${cv.id})"><i class="fas fa-eye"></i> Voir</button>
                    <button class="btn-action approve" onclick="updateStatus(${cv.id}, 'approved')"><i class="fas fa-check"></i> Approuver</button>
                    <button class="btn-action reject" onclick="updateStatus(${cv.id}, 'rejected')"><i class="fas fa-times"></i> Rejeter</button>
                    <button class="btn-action pending" onclick="updateStatus(${cv.id}, 'pending')"><i class="fas fa-clock"></i> En attente</button>
                    <button class="btn-action edit" onclick="editCV(${cv.id})"><i class="fas fa-edit"></i> Modifier</button>
                    <button class="btn-action delete" onclick="confirmDeleteCV(${cv.id})"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== STATISTIQUES =====
function updateStats() {
    const pending = cvsData.filter(c => c.validation_status === 'pending').length;
    const approved = cvsData.filter(c => c.validation_status === 'approved').length;
    const rejected = cvsData.filter(c => c.validation_status === 'rejected').length;
    const total = cvsData.length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('totalCount').textContent = total;
}

// ===== VOIR UN CV (MODALE) =====
async function viewCV(cvId) {
    const cv = cvsData.find(c => c.id === cvId);
    if (!cv) return;

    currentCvId = cvId;
    const data = cv.data || {};

    // Construction de l'affichage structuré
    const fullName = `${data.prenom || ''} ${data.nom || ''}`.trim() || 'Non renseigné';
    const dateFormatted = data.dateSignature ? new Date(data.dateSignature).toLocaleDateString('fr-FR') : 'Non renseignée';

    // Expériences
    const experiencesHtml = (data.experiences || []).map(exp => `
        <div class="cv-item">
            <div><strong>${exp.poste || 'Poste'}</strong> chez ${exp.employeur || 'Employeur'}</div>
            <div>${exp.debut || ''} - ${exp.fin || ''}</div>
            <div>${exp.description || ''}</div>
        </div>
    `).join('') || '<p>Aucune expérience.</p>';

    // Formations
    const formationsHtml = (data.formations || []).map(f => `
        <div class="cv-item">
            <div><strong>${f.diplome || 'Diplôme'}</strong> - ${f.etablissement || ''}</div>
            <div>${f.date || ''}</div>
        </div>
    `).join('') || '<p>Aucune formation.</p>';

    // Langues
    const languesHtml = (data.langues || []).map(l => `
        <div>${l.nom || ''} : ${l.niveau || ''}</div>
    `).join('') || 'Aucune langue.';

    // Compétences
    const skillsTech = data.skillsTech || '';
    const skillsSoft = data.skillsSoft || '';
    const skillsList = [];
    if (skillsTech) skillsList.push(...skillsTech.split(',').map(s => s.trim()));
    if (skillsSoft) skillsList.push(...skillsSoft.split(',').map(s => s.trim()));
    const skillsHtml = skillsList.map(s => `<span class="skill-badge">${s}</span>`).join(' ') || 'Aucune compétence.';

    const modalBody = document.getElementById('cvModalBody');
    modalBody.innerHTML = `
        <div class="cv-preview-content">
            <div class="cv-section">
                <h3>Informations personnelles</h3>
                <div class="cv-row"><span class="cv-label">Nom complet :</span> <span class="cv-value">${fullName}</span></div>
                <div class="cv-row"><span class="cv-label">Téléphone :</span> <span class="cv-value">${data.telephone || ''}</span></div>
                <div class="cv-row"><span class="cv-label">Email :</span> <span class="cv-value">${data.email || ''}</span></div>
                <div class="cv-row"><span class="cv-label">Ville :</span> <span class="cv-value">${data.ville || ''}</span></div>
                <div class="cv-row"><span class="cv-label">Réseau social :</span> <span class="cv-value">${data.social || ''}</span></div>
            </div>
            <div class="cv-section">
                <h3>Profil</h3>
                <p>${data.profil || 'Non renseigné'}</p>
            </div>
            <div class="cv-section">
                <h3>Informations sportives</h3>
                <div class="cv-row"><span class="cv-label">Taille :</span> <span class="cv-value">${data.taille || ''} cm</span></div>
                <div class="cv-row"><span class="cv-label">Poids :</span> <span class="cv-value">${data.poids || ''} kg</span></div>
                <div class="cv-row"><span class="cv-label">Pied fort :</span> <span class="cv-value">${data.piedFort || ''}</span></div>
                <div class="cv-row"><span class="cv-label">Club :</span> <span class="cv-value">${data.club || ''}</span></div>
                <div class="cv-row"><span class="cv-label">Matchs :</span> <span class="cv-value">${data.matchs || '0'}</span></div>
                <div class="cv-row"><span class="cv-label">Buts :</span> <span class="cv-value">${data.buts || '0'}</span></div>
                <div class="cv-row"><span class="cv-label">Passes :</span> <span class="cv-value">${data.passes || '0'}</span></div>
                <div class="cv-row"><span class="cv-label">Valeur :</span> <span class="cv-value">${data.valeur || '0'} FCFA</span></div>
            </div>
            <div class="cv-section">
                <h3>Expériences professionnelles</h3>
                ${experiencesHtml}
            </div>
            <div class="cv-section">
                <h3>Formations</h3>
                ${formationsHtml}
            </div>
            <div class="cv-section">
                <h3>Compétences</h3>
                <div>${skillsHtml}</div>
            </div>
            <div class="cv-section">
                <h3>Langues</h3>
                <div>${languesHtml}</div>
            </div>
            <div class="cv-section">
                <h3>Centres d'intérêt</h3>
                <p>${data.interets || 'Non renseigné'}</p>
            </div>
            <div class="cv-section">
                <h3>Biographie</h3>
                <p>${data.bio || 'Non renseigné'}</p>
            </div>
            <div class="cv-section">
                <h3>Signature</h3>
                <div>Fait le ${dateFormatted} à ${data.lieuSignature || ''}</div>
                ${data.signature ? `<img src="${data.signature}" class="cv-signature-img">` : '<p>Aucune signature.</p>'}
            </div>
        </div>
    `;

    // Mettre à jour les boutons de la modale
    document.getElementById('modalApproveBtn').onclick = () => updateStatus(cvId, 'approved');
    document.getElementById('modalRejectBtn').onclick = () => updateStatus(cvId, 'rejected');
    document.getElementById('modalPendingBtn').onclick = () => updateStatus(cvId, 'pending');
    document.getElementById('modalDeleteBtn').onclick = () => confirmDeleteCV(cvId);
    document.getElementById('modalEditBtn').onclick = () => editCV(cvId);

    document.getElementById('cvDetailModal').style.display = 'block';
}

// ===== ÉDITION RAPIDE D'UN CV =====
async function editCV(cvId) {
    const cv = cvsData.find(c => c.id === cvId);
    if (!cv) return;
    currentCvId = cvId;
    const data = cv.data || {};

    // Remplir le formulaire d'édition
    document.getElementById('editNom').value = `${data.prenom || ''} ${data.nom || ''}`.trim();
    document.getElementById('editPoste').value = data.position || data.poste_precis || '';
    document.getElementById('editTelephone').value = data.telephone || '';
    document.getElementById('editEmail').value = data.email || '';
    document.getElementById('editClub').value = data.club || '';

    document.getElementById('editCvModal').style.display = 'block';
}

// ===== SAUVEGARDER LES MODIFICATIONS DU CV =====
document.getElementById('editCvForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCvId) return;

    const cv = cvsData.find(c => c.id === currentCvId);
    if (!cv) return;

    const updatedData = { ...cv.data };
    // Mettre à jour les champs modifiés
    const fullName = document.getElementById('editNom').value.trim().split(' ');
    updatedData.prenom = fullName[0] || '';
    updatedData.nom = fullName.slice(1).join(' ') || '';
    updatedData.position = document.getElementById('editPoste').value;
    updatedData.telephone = document.getElementById('editTelephone').value;
    updatedData.email = document.getElementById('editEmail').value;
    updatedData.club = document.getElementById('editClub').value;

    showLoader(true);
    try {
        const { error } = await supabaseAdmin
            .from('player_cv')
            .update({ data: updatedData, updated_at: new Date() })
            .eq('id', currentCvId);

        if (error) throw error;

        showToast('CV mis à jour avec succès', 'success');
        closeEditModal();
        loadCVs(); // recharger la liste
    } catch (error) {
        console.error('Erreur mise à jour CV:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
});

// ===== SUPPRESSION D'UN CV =====
async function deleteCV(cvId) {
    showLoader(true);
    try {
        const { error } = await supabaseAdmin
            .from('player_cv')
            .delete()
            .eq('id', cvId);

        if (error) throw error;

        showToast('CV supprimé avec succès', 'success');
        closeConfirmModal();
        closeCvModal();
        loadCVs();
    } catch (error) {
        console.error('Erreur suppression CV:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmDeleteCV(cvId) {
    currentAction = { type: 'delete', cvId };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer ce CV ? Cette action est irréversible.</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

function executeAction() {
    if (!currentAction) return;
    if (currentAction.type === 'delete') {
        deleteCV(currentAction.cvId);
    }
}

// ===== CHANGER LE STATUT =====
async function updateStatus(cvId, newStatus) {
    const cv = cvsData.find(c => c.id === cvId);
    if (!cv) return;

    const actionText = {
        approved: 'approuver',
        rejected: 'rejeter',
        pending: 'remettre en attente'
    }[newStatus] || 'modifier';

    if (!confirm(`Êtes-vous sûr de vouloir ${actionText} ce CV ?`)) return;

    showLoader(true);
    try {
        const { error } = await supabaseAdmin
            .from('player_cv')
            .update({ validation_status: newStatus, updated_at: new Date() })
            .eq('id', cvId);

        if (error) throw error;

        showToast(`CV ${actionText} avec succès`, 'success');
        closeCvModal();
        loadCVs(); // recharger la liste
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== FERMETURE DES MODALES =====
function closeCvModal() {
    document.getElementById('cvDetailModal').style.display = 'none';
    currentCvId = null;
}

function closeEditModal() {
    document.getElementById('editCvModal').style.display = 'none';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

// ===== FILTRES =====
document.getElementById('searchInput')?.addEventListener('input', renderCVs);
document.getElementById('statusFilter')?.addEventListener('change', renderCVs);

// ===== RAFRAÎCHIR =====
document.getElementById('refreshBtn').addEventListener('click', loadCVs);

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

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await initAdminPage();
    loadCVs();
});

// Exposer les fonctions globales
window.viewCV = viewCV;
window.updateStatus = updateStatus;
window.closeCvModal = closeCvModal;
window.confirmDeleteCV = confirmDeleteCV;
window.executeAction = executeAction;
window.closeConfirmModal = closeConfirmModal;
window.editCV = editCV;
window.closeEditModal = closeEditModal;