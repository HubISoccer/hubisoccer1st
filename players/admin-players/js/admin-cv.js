// ===== CONFIGURATION =====
// Utilisation du client Supabase global déclaré dans admin-common.js
// (admin-common.js doit initialiser supabaseAdmin)

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let currentCVList = [];
let selectedCV = null; // Pour la modale de visualisation

// ===== VÉRIFICATION DE SESSION ADMIN =====
async function checkAdminSession() {
    try {
        const { data: { session }, error } = await supabaseAdmin.auth.getSession();
        if (error || !session) {
            window.location.href = 'auth/admin-login.html';
            return null;
        }

        // Vérifier que l'utilisateur est bien dans la table admin_users
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('admin_users')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (adminError || !adminData) {
            console.error('Accès non autorisé - pas admin');
            await supabaseAdmin.auth.signOut();
            window.location.href = 'auth/admin-login.html';
            return null;
        }

        currentAdmin = adminData;
        document.getElementById('adminEmail').textContent = session.user.email;
        return session.user;
    } catch (err) {
        console.error('Erreur checkAdminSession:', err);
        window.location.href = 'auth/admin-login.html';
        return null;
    }
}

// ===== CHARGEMENT DE LA LISTE DES CV =====
async function loadCVList() {
    const tbody = document.getElementById('cvTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Chargement...</td></tr>';

    try {
        // On joint player_profiles pour avoir les infos du joueur
        const { data, error } = await supabaseAdmin
            .from('player_cv')
            .select(`
                *,
                player:player_profiles!player_cv_player_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email,
                    telephone,
                    avatar_url
                )
            `)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        currentCVList = data || [];
        renderCVList();
    } catch (err) {
        console.error('Erreur chargement CV:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center error">Erreur de chargement</td></tr>';
    }
}

// ===== AFFICHAGE DE LA LISTE =====
function renderCVList() {
    const tbody = document.getElementById('cvTableBody');
    if (!currentCVList.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun CV trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = currentCVList.map(cv => {
        const player = cv.player || {};
        const fullName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Nom inconnu';
        const statusClass = cv.validation_status === 'approved' ? 'status-approved' : 'status-pending';
        const statusText = cv.validation_status === 'approved' ? 'Validé' : 'En attente';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${player.avatar_url || '../../img/user-default.jpg'}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                        <strong>${fullName}</strong>
                    </div>
                </td>
                <td>${player.email || '-'}</td>
                <td>${player.telephone || '-'}</td>
                <td>${new Date(cv.updated_at).toLocaleString()}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="actions">
                    <button class="btn-icon btn-view" onclick="viewCV('${cv.id}')" title="Voir le CV"><i class="fas fa-eye"></i></button>
                    ${cv.validation_status !== 'approved' ? `
                        <button class="btn-icon btn-approve" onclick="approveCV('${cv.id}')" title="Approuver"><i class="fas fa-check"></i></button>
                        <button class="btn-icon btn-reject" onclick="openRejectModal('${cv.id}')" title="Rejeter"><i class="fas fa-times"></i></button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// ===== GÉNÉRATION DE L'APERÇU DU CV (copié depuis edit-cv.js avec adaptations) =====
function generatePreviewFromData(cvData, playerProfile) {
    if (!cvData) return '<p>Aucune donnée à afficher</p>';

    const data = cvData; // Le contenu JSONB du CV
    const fullName = `${data.prenom || ''} ${data.nom || ''}`.trim() || 'Nom Prénom';
    const avatarUrl = playerProfile?.avatar_url || '../../img/user-default.jpg';

    // Compétences (fusion)
    const skillsTech = data.skillsTech ? data.skillsTech.split(',').map(s => s.trim()).filter(s => s) : [];
    const skillsSoft = data.skillsSoft ? data.skillsSoft.split(',').map(s => s.trim()).filter(s => s) : [];
    const allSkills = [...skillsTech, ...skillsSoft];

    // Formations HTML
    const formationsHtml = (data.formations || []).map(f => `
        <div class="cv-item">
            <div class="cv-item-date">${f.date || ''}</div>
            <div class="cv-item-title">${f.diplome || ''}</div>
            <div class="cv-item-subtitle">${f.etablissement || ''}</div>
        </div>
    `).join('');

    // Expériences HTML
    const experiencesHtml = (data.experiences || []).map(e => `
        <div class="cv-item">
            <div class="cv-item-date">${e.debut || ''} – ${e.fin || ''}</div>
            <div class="cv-item-title">${e.poste || ''}</div>
            <div class="cv-item-subtitle">${e.employeur || ''}</div>
            <div class="cv-item-description">${e.description || ''}</div>
        </div>
    `).join('');

    // Langues HTML
    const languesHtml = (data.langues || []).map(l => `
        <div class="cv-lang-item">
            <span class="cv-lang-name">${l.nom || ''}</span>
            <span class="cv-lang-level">${l.niveau || ''}</span>
        </div>
    `).join('');

    // Compétences liste
    const skillsListHtml = allSkills.map(skill => `<li>${skill}</li>`).join('');

    // Coordonnées
    const contactHtml = `
        ${data.telephone ? `<div class="cv-contact-item"><i class="fas fa-phone"></i> ${data.telephone}</div>` : ''}
        ${data.email ? `<div class="cv-contact-item"><i class="fas fa-envelope"></i> ${data.email}</div>` : ''}
        ${data.ville ? `<div class="cv-contact-item"><i class="fas fa-map-marker-alt"></i> ${data.ville}</div>` : ''}
        ${data.social ? `<div class="cv-contact-item"><i class="fas fa-link"></i> ${data.social}</div>` : ''}
    `;

    // Informations sportives
    const sportInfoHtml = `
        <div class="cv-sport-info">
            ${data.taille ? `<span><i class="fas fa-ruler"></i> ${data.taille} cm</span>` : ''}
            ${data.poids ? `<span><i class="fas fa-weight-scale"></i> ${data.poids} kg</span>` : ''}
            ${data.piedFort ? `<span><i class="fas fa-shoe-prints"></i> ${data.piedFort}</span>` : ''}
            ${data.club ? `<span><i class="fas fa-futbol"></i> ${data.club}</span>` : ''}
        </div>
        <div class="cv-sport-info">
            ${data.matchs ? `<span><i class="fas fa-chart-line"></i> Matchs: ${data.matchs}</span>` : ''}
            ${data.buts ? `<span><i class="fas fa-futbol"></i> Buts: ${data.buts}</span>` : ''}
            ${data.passes ? `<span><i class="fas fa-person-running"></i> Passes: ${data.passes}</span>` : ''}
            ${data.valeur ? `<span><i class="fas fa-coins"></i> ${data.valeur} FCFA</span>` : ''}
        </div>
    `;

    // Assemblage final (structure deux colonnes)
    return `
        <div class="cv-two-columns">
            <!-- Colonne gauche (violet) -->
            <div class="cv-left">
                <div class="cv-photo">
                    <img src="${avatarUrl}" alt="Photo">
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-graduation-cap"></i> Formation</div>
                    ${formationsHtml || '<p>Aucune formation renseignée.</p>'}
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-cogs"></i> Compétences</div>
                    <ul class="cv-skills-list">
                        ${skillsListHtml || '<li>Aucune compétence renseignée.</li>'}
                    </ul>
                </div>
                ${languesHtml ? `
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-language"></i> Langues</div>
                    ${languesHtml}
                </div>
                ` : ''}
                ${data.interets ? `
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-heart"></i> Centres d'intérêt</div>
                    <p class="cv-interets">${data.interets}</p>
                </div>
                ` : ''}
            </div>

            <!-- Colonne droite (blanche) -->
            <div class="cv-right">
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-address-card"></i> Coordonnées</div>
                    ${contactHtml || '<p>Non renseigné</p>'}
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-futbol"></i> Informations sportives</div>
                    ${sportInfoHtml || '<p>Non renseigné</p>'}
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-user-tag"></i> Profil professionnel</div>
                    <p>${data.profil || 'Non renseigné'}</p>
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-pencil-alt"></i> Biographie</div>
                    <p class="cv-bio">${data.bio || 'Non renseigné'}</p>
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-briefcase"></i> Expériences professionnelles</div>
                    ${experiencesHtml || '<p>Aucune expérience renseignée.</p>'}
                </div>
            </div>
        </div>
        <!-- Pied de page (signature) -->
        <div class="cv-footer">
            <div class="signature-info">
                Fait le ${data.dateSignature || '...'} à ${data.lieuSignature || '...'}
            </div>
            ${data.signature ? `<img src="${data.signature}" alt="Signature" style="max-width:150px; max-height:60px;">` : ''}
        </div>
    `;
}

// ===== VISUALISER UN CV =====
async function viewCV(cvId) {
    const cv = currentCVList.find(c => c.id === cvId);
    if (!cv) return;

    selectedCV = cv;

    // Générer l'aperçu
    const previewHtml = generatePreviewFromData(cv.data, cv.player);
    document.getElementById('cvPreviewContent').innerHTML = previewHtml;

    // Configurer les boutons de la modale
    const approveBtn = document.getElementById('modalApproveBtn');
    const rejectBtn = document.getElementById('modalRejectBtn');

    if (cv.validation_status === 'approved') {
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
    } else {
        approveBtn.style.display = 'inline-block';
        rejectBtn.style.display = 'inline-block';
        approveBtn.onclick = () => {
            closeViewModal();
            approveCV(cv.id);
        };
        rejectBtn.onclick = () => {
            closeViewModal();
            openRejectModal(cv.id);
        };
    }

    document.getElementById('viewModal').style.display = 'block';
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

// ===== APPROUVER UN CV =====
async function approveCV(cvId) {
    if (!confirm('Approuver ce CV ? Le joueur pourra alors exporter son CV en PDF.')) return;

    try {
        const { error } = await supabaseAdmin
            .from('player_cv')
            .update({
                validation_status: 'approved',
                updated_at: new Date()
            })
            .eq('id', cvId);

        if (error) throw error;

        showToast('CV approuvé avec succès', 'success');
        loadCVList(); // Recharger la liste
    } catch (err) {
        console.error('Erreur approbation:', err);
        showToast('Erreur : ' + err.message, 'error');
    }
}

// ===== REJETER UN CV =====
let rejectCvId = null;

function openRejectModal(cvId) {
    rejectCvId = cvId;
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectModal').style.display = 'block';
}

function closeRejectModal() {
    document.getElementById('rejectModal').style.display = 'none';
    rejectCvId = null;
}

async function confirmReject() {
    if (!rejectCvId) return;

    const reason = document.getElementById('rejectReason').value.trim();

    try {
        // Option 1 : simplement rejeter (remettre à pending avec un commentaire ?)
        // Ici on remet à 'pending' mais on pourrait aussi avoir un champ 'rejection_reason' dans la table
        const { error } = await supabaseAdmin
            .from('player_cv')
            .update({
                validation_status: 'pending',
                updated_at: new Date()
                // Si vous avez un champ pour le motif : rejection_reason: reason || null
            })
            .eq('id', rejectCvId);

        if (error) throw error;

        showToast('CV rejeté (remis en attente)', 'info');
        closeRejectModal();
        loadCVList();
    } catch (err) {
        console.error('Erreur rejet:', err);
        showToast('Erreur : ' + err.message, 'error');
    }
}

// ===== TOAST =====
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // S'assurer que supabaseAdmin est disponible (depuis admin-common.js)
    if (typeof supabaseAdmin === 'undefined') {
        console.error('supabaseAdmin non défini. Vérifier admin-common.js');
        return;
    }

    const user = await checkAdminSession();
    if (!user) return;

    await loadCVList();

    // Bouton de rafraîchissement
    document.getElementById('refreshBtn').addEventListener('click', loadCVList);

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabaseAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
    });

    // Confirmation de rejet
    document.getElementById('confirmRejectBtn').addEventListener('click', confirmReject);

    // Fermeture des modales au clic sur la croix ou à l'extérieur
    window.onclick = function(event) {
        const viewModal = document.getElementById('viewModal');
        const rejectModal = document.getElementById('rejectModal');
        if (event.target === viewModal) closeViewModal();
        if (event.target === rejectModal) closeRejectModal();
    };
});

// Rendre les fonctions accessibles globalement pour les attributs onclick
window.viewCV = viewCV;
window.approveCV = approveCV;
window.openRejectModal = openRejectModal;
window.closeViewModal = closeViewModal;
window.closeRejectModal = closeRejectModal;