// ===== CONFIGURATION SUPABASE =====
// Utilisation de l'instance globale définie dans auth.js
const supabase = window.supabaseAuthPrive;
if (!supabase) {
    console.error('❌ supabaseAuthPrive non défini. Vérifiez que auth.js est chargé.');
}

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let cvData = null;
let cvValidationStatus = 'pending';
let signatureDataURL = null;

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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email, 'ID:', currentUser.id);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL DEPUIS LA TABLE `profiles` =====
async function loadPlayerProfile() {
    if (!currentUser?.id) {
        console.error('currentUser.id manquant');
        showToast('Erreur de session. Veuillez vous reconnecter.', 'error');
        return;
    }
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur lors du chargement du profil', 'error');
            playerProfile = null;
        } else {
            playerProfile = data;
            // Mise à jour de la navbar
            document.getElementById('userName').textContent = playerProfile?.full_name || 'Joueur';
            document.getElementById('userAvatar').src = playerProfile?.avatar_url || 'img/user-default.jpg';
        }
        console.log('✅ Profil utilisé :', playerProfile);
    } catch (err) {
        console.error('❌ Exception loadPlayerProfile :', err);
        showToast('Erreur lors du chargement du profil', 'error');
        playerProfile = null;
    }
}

// ===== CHARGEMENT DU CV DEPUIS LA BASE =====
async function loadCV() {
    if (!playerProfile?.id) return;
    try {
        const { data, error } = await supabase
            .from('player_cv')
            .select('*')
            .eq('player_id', playerProfile.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement CV:', error);
            return;
        }
        if (data) {
            cvData = data.data;
            cvValidationStatus = data.validation_status || 'pending';
            populateForm(cvData);
        }
        updateValidationStatus();
    } catch (err) {
        console.error('❌ Exception loadCV :', err);
    }
}

// ===== MISE À JOUR DE L'AFFICHAGE DU STATUT =====
function updateValidationStatus() {
    const statusDiv = document.getElementById('validationStatus');
    const exportBtn = document.getElementById('exportBtn');
    if (cvValidationStatus === 'approved') {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<span class="status-badge approved">CV validé - Vous pouvez exporter en PDF</span>';
        exportBtn.disabled = false;
    } else {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<span class="status-badge pending">En attente de validation par l\'équipe HubISoccer</span>';
        exportBtn.disabled = true;
    }
}

// ===== PRÉ-REMPLISSAGE AVEC LE PROFIL (DEPUIS `profiles`) =====
function populateFromProfile() {
    if (!playerProfile) return;
    // Décomposer full_name (supposé "Prénom Nom")
    const nameParts = (playerProfile.full_name || '').split(' ');
    const prenom = nameParts[0] || '';
    const nom = nameParts.slice(1).join(' ') || '';

    document.getElementById('nom').value = nom;
    document.getElementById('prenom').value = prenom;
    document.getElementById('telephone').value = playerProfile.phone || '';
    document.getElementById('email').value = playerProfile.email || '';
    // Les champs suivants ne sont pas dans profiles, ils seront remplis par le CV si existant
    // document.getElementById('ville').value = playerProfile.city || '';
    // document.getElementById('taille').value = playerProfile.height || '';
    // document.getElementById('poids').value = playerProfile.weight || '';
    // document.getElementById('piedFort').value = playerProfile.preferred_foot || '';
    // document.getElementById('club').value = playerProfile.club || '';
}

// ===== REMPLIR LE FORMULAIRE AVEC LES DONNÉES EXISTANTES =====
function populateForm(data) {
    if (!data) return;
    document.getElementById('nom').value = data.nom || '';
    document.getElementById('prenom').value = data.prenom || '';
    document.getElementById('telephone').value = data.telephone || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('ville').value = data.ville || '';
    document.getElementById('social').value = data.social || '';
    document.getElementById('profil').value = data.profil || '';
    document.getElementById('taille').value = data.taille || '';
    document.getElementById('poids').value = data.poids || '';
    document.getElementById('piedFort').value = data.piedFort || '';
    document.getElementById('club').value = data.club || '';
    document.getElementById('matchs').value = data.matchs || '';
    document.getElementById('buts').value = data.buts || '';
    document.getElementById('passes').value = data.passes || '';
    document.getElementById('valeur').value = data.valeur || '';
    document.getElementById('skillsTech').value = data.skillsTech || '';
    document.getElementById('skillsSoft').value = data.skillsSoft || '';
    document.getElementById('interets').value = data.interets || '';
    document.getElementById('bio').value = data.bio || '';
    document.getElementById('dateSignature').value = data.dateSignature || '';
    document.getElementById('lieuSignature').value = data.lieuSignature || '';

    // Expériences
    if (data.experiences && Array.isArray(data.experiences)) {
        data.experiences.forEach(exp => addExperienceItem(exp));
    } else {
        addExperienceItem();
    }

    // Formations
    if (data.formations && Array.isArray(data.formations)) {
        data.formations.forEach(formation => addFormationItem(formation));
    } else {
        addFormationItem();
    }

    // Langues
    if (data.langues && Array.isArray(data.langues)) {
        data.langues.forEach(lang => addLangueItem(lang));
    } else {
        addLangueItem();
    }

    // Signature
    if (data.signature_url) {
        signatureDataURL = data.signature_url;
        const img = document.getElementById('signatureImage');
        img.src = signatureDataURL;
        img.style.display = 'block';
        document.querySelector('.signature-placeholder').style.display = 'none';
    }
}

// ===== GESTION DES ÉLÉMENTS DYNAMIQUES (inchangée) =====
function addExperienceItem(data = {}) {
    const container = document.getElementById('experiences-container');
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.innerHTML = `
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        <div class="form-row">
            <div class="form-group">
                <label>Poste / Titre</label>
                <input type="text" class="exp-poste" value="${escapeHtml(data.poste || '')}" placeholder="Ex: Joueur, Coach, Stagiaire">
            </div>
            <div class="form-group">
                <label>Employeur / Club</label>
                <input type="text" class="exp-employeur" value="${escapeHtml(data.employeur || '')}" placeholder="Nom du club ou entreprise">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Date début</label>
                <input type="month" class="exp-debut" value="${escapeHtml(data.debut || '')}">
            </div>
            <div class="form-group">
                <label>Date fin</label>
                <input type="month" class="exp-fin" value="${escapeHtml(data.fin || '')}">
            </div>
        </div>
        <div class="form-group full-width">
            <label>Description (missions, réalisations)</label>
            <textarea class="exp-description" rows="2">${escapeHtml(data.description || '')}</textarea>
        </div>
    `;
    container.appendChild(item);
}

function addFormationItem(data = {}) {
    const container = document.getElementById('formations-container');
    const item = document.createElement('div');
    item.className = 'formation-item';
    item.innerHTML = `
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        <div class="form-row">
            <div class="form-group">
                <label>Diplôme / Certification</label>
                <input type="text" class="formation-diplome" value="${escapeHtml(data.diplome || '')}" placeholder="Ex: Bac S, Licence STAPS">
            </div>
            <div class="form-group">
                <label>Établissement</label>
                <input type="text" class="formation-etablissement" value="${escapeHtml(data.etablissement || '')}" placeholder="Nom de l'école ou université">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Date d'obtention</label>
                <input type="month" class="formation-date" value="${escapeHtml(data.date || '')}">
            </div>
        </div>
    `;
    container.appendChild(item);
}

function addLangueItem(data = {}) {
    const container = document.getElementById('langues-container');
    const item = document.createElement('div');
    item.className = 'langue-item';
    item.innerHTML = `
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        <div class="form-row">
            <div class="form-group">
                <label>Langue</label>
                <input type="text" class="langue-nom" value="${escapeHtml(data.nom || '')}" placeholder="Ex: Français">
            </div>
            <div class="form-group">
                <label>Niveau (compréhension écrite/orale)</label>
                <input type="text" class="langue-niveau" value="${escapeHtml(data.niveau || '')}" placeholder="Ex: Courant, Intermédiaire">
            </div>
        </div>
    `;
    container.appendChild(item);
}

// ===== COLLECTE DES DONNÉES DU FORMULAIRE =====
function collectFormData() {
    const data = {};

    data.nom = document.getElementById('nom').value;
    data.prenom = document.getElementById('prenom').value;
    data.telephone = document.getElementById('telephone').value;
    data.email = document.getElementById('email').value;
    data.ville = document.getElementById('ville').value;
    data.social = document.getElementById('social').value;
    data.profil = document.getElementById('profil').value;
    data.taille = document.getElementById('taille').value;
    data.poids = document.getElementById('poids').value;
    data.piedFort = document.getElementById('piedFort').value;
    data.club = document.getElementById('club').value;
    data.matchs = document.getElementById('matchs').value;
    data.buts = document.getElementById('buts').value;
    data.passes = document.getElementById('passes').value;
    data.valeur = document.getElementById('valeur').value;
    data.skillsTech = document.getElementById('skillsTech').value;
    data.skillsSoft = document.getElementById('skillsSoft').value;
    data.interets = document.getElementById('interets').value;
    data.bio = document.getElementById('bio').value;
    data.dateSignature = document.getElementById('dateSignature').value;
    data.lieuSignature = document.getElementById('lieuSignature').value;

    data.experiences = [];
    document.querySelectorAll('#experiences-container .experience-item').forEach(item => {
        data.experiences.push({
            poste: item.querySelector('.exp-poste')?.value || '',
            employeur: item.querySelector('.exp-employeur')?.value || '',
            debut: item.querySelector('.exp-debut')?.value || '',
            fin: item.querySelector('.exp-fin')?.value || '',
            description: item.querySelector('.exp-description')?.value || ''
        });
    });

    data.formations = [];
    document.querySelectorAll('#formations-container .formation-item').forEach(item => {
        data.formations.push({
            diplome: item.querySelector('.formation-diplome')?.value || '',
            etablissement: item.querySelector('.formation-etablissement')?.value || '',
            date: item.querySelector('.formation-date')?.value || ''
        });
    });

    data.langues = [];
    document.querySelectorAll('#langues-container .langue-item').forEach(item => {
        data.langues.push({
            nom: item.querySelector('.langue-nom')?.value || '',
            niveau: item.querySelector('.langue-niveau')?.value || ''
        });
    });

    return data;
}

// ===== UPLOAD DE LA SIGNATURE =====
async function uploadSignatureIfNeeded(dataURL) {
    if (!dataURL || dataURL.startsWith('http')) return dataURL;
    if (!dataURL.startsWith('data:image')) return null;

    try {
        const blob = await (await fetch(dataURL)).blob();
        const fileName = `${currentUser.id}_signature_${Date.now()}.png`;
        const filePath = `signatures/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, blob);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);
        return urlData.publicUrl;
    } catch (err) {
        console.error('Erreur upload signature:', err);
        showToast('Erreur lors de l\'upload de la signature', 'error');
        return null;
    }
}

// ===== SAUVEGARDE DU CV =====
async function saveCV() {
    if (!playerProfile?.id) {
        showToast('Profil joueur non chargé', 'error');
        return;
    }

    const formData = collectFormData();

    let signatureUrl = signatureDataURL;
    if (signatureDataURL && signatureDataURL.startsWith('data:')) {
        signatureUrl = await uploadSignatureIfNeeded(signatureDataURL);
        if (!signatureUrl) return;
    }
    formData.signature_url = signatureUrl || null;

    try {
        const { data: existing, error: selectError } = await supabase
            .from('player_cv')
            .select('id')
            .eq('player_id', playerProfile.id)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            const result = await supabase
                .from('player_cv')
                .update({
                    data: formData,
                    validation_status: 'pending',
                    updated_at: new Date()
                })
                .eq('player_id', playerProfile.id);
            if (result.error) throw result.error;
        } else {
            const result = await supabase
                .from('player_cv')
                .insert([{
                    player_id: playerProfile.id,
                    data: formData,
                    validation_status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date()
                }]);
            if (result.error) throw result.error;
        }

        showToast('CV enregistré avec succès ! En attente de validation.', 'success');
        cvValidationStatus = 'pending';
        updateValidationStatus();
    } catch (err) {
        showToast('Erreur lors de la sauvegarde : ' + err.message, 'error');
    }
}

// ===== APERÇU ET EXPORT (inchangés) =====
function generatePreview() {
    const data = collectFormData();
    const previewDiv = document.getElementById('previewContent');
    const fullName = `${data.prenom} ${data.nom}`.trim() || 'Nom Prénom';
    const avatarUrl = playerProfile?.avatar_url || 'img/user-default.jpg';

    // Compétences
    const skillsTech = data.skillsTech ? data.skillsTech.split(',').map(s => s.trim()).filter(s => s) : [];
    const skillsSoft = data.skillsSoft ? data.skillsSoft.split(',').map(s => s.trim()).filter(s => s) : [];
    const allSkills = [...skillsTech, ...skillsSoft];

    // Formations
    const formationsHtml = data.formations.map(f => `
        <div class="cv-item">
            <div class="cv-item-date">${escapeHtml(f.date || '')}</div>
            <div class="cv-item-title">${escapeHtml(f.diplome || '')}</div>
            <div class="cv-item-subtitle">${escapeHtml(f.etablissement || '')}</div>
        </div>
    `).join('');

    // Expériences
    const experiencesHtml = data.experiences.map(e => `
        <div class="cv-item">
            <div class="cv-item-date">${escapeHtml(e.debut || '')} – ${escapeHtml(e.fin || '')}</div>
            <div class="cv-item-title">${escapeHtml(e.poste || '')}</div>
            <div class="cv-item-subtitle">${escapeHtml(e.employeur || '')}</div>
            <div class="cv-item-description">${escapeHtml(e.description || '')}</div>
        </div>
    `).join('');

    // Langues
    const languesHtml = data.langues.map(l => `
        <div class="cv-lang-item">
            <span class="cv-lang-name">${escapeHtml(l.nom || '')}</span>
            <span class="cv-lang-level">${escapeHtml(l.niveau || '')}</span>
        </div>
    `).join('');

    // Compétences liste
    const skillsListHtml = allSkills.map(skill => `<li>${escapeHtml(skill)}</li>`).join('');

    // Coordonnées
    const contactHtml = `
        ${data.telephone ? `<div class="cv-contact-item"><i class="fas fa-phone"></i> ${escapeHtml(data.telephone)}</div>` : ''}
        ${data.email ? `<div class="cv-contact-item"><i class="fas fa-envelope"></i> ${escapeHtml(data.email)}</div>` : ''}
        ${data.ville ? `<div class="cv-contact-item"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(data.ville)}</div>` : ''}
        ${data.social ? `<div class="cv-contact-item"><i class="fas fa-link"></i> ${escapeHtml(data.social)}</div>` : ''}
    `;

    // Informations sportives
    const sportInfoHtml = `
        <div class="cv-sport-info">
            ${data.taille ? `<span><i class="fas fa-ruler"></i> ${escapeHtml(data.taille)} cm</span>` : ''}
            ${data.poids ? `<span><i class="fas fa-weight-scale"></i> ${escapeHtml(data.poids)} kg</span>` : ''}
            ${data.piedFort ? `<span><i class="fas fa-shoe-prints"></i> ${escapeHtml(data.piedFort)}</span>` : ''}
            ${data.club ? `<span><i class="fas fa-futbol"></i> ${escapeHtml(data.club)}</span>` : ''}
        </div>
        <div class="cv-sport-info">
            ${data.matchs ? `<span><i class="fas fa-chart-line"></i> Matchs: ${escapeHtml(data.matchs)}</span>` : ''}
            ${data.buts ? `<span><i class="fas fa-futbol"></i> Buts: ${escapeHtml(data.buts)}</span>` : ''}
            ${data.passes ? `<span><i class="fas fa-person-running"></i> Passes: ${escapeHtml(data.passes)}</span>` : ''}
            ${data.valeur ? `<span><i class="fas fa-coins"></i> ${escapeHtml(data.valeur)} FCFA</span>` : ''}
        </div>
    `;

    // Assemblage final
    const html = `
        <div class="cv-two-columns">
            <div class="cv-left">
                <div class="cv-photo">
                    <img src="${escapeHtml(avatarUrl)}" alt="Photo">
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
                    <p class="cv-interets">${escapeHtml(data.interets)}</p>
                </div>
                ` : ''}
            </div>
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
                    <p>${escapeHtml(data.profil || 'Non renseigné')}</p>
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-pencil-alt"></i> Biographie</div>
                    <p class="cv-bio">${escapeHtml(data.bio || 'Non renseigné')}</p>
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-briefcase"></i> Expériences professionnelles</div>
                    ${experiencesHtml || '<p>Aucune expérience renseignée.</p>'}
                </div>
            </div>
        </div>
        <div class="cv-footer">
            <div class="signature-info">
                Fait le ${escapeHtml(data.dateSignature || '...')} à ${escapeHtml(data.lieuSignature || '...')}
            </div>
            ${signatureDataURL ? `<img src="${escapeHtml(signatureDataURL)}" alt="Signature">` : ''}
        </div>
    `;

    previewDiv.innerHTML = html;
    document.getElementById('cvPreview').style.display = 'block';
}

function exportPDF() {
    const element = document.getElementById('previewContent');
    const opt = {
        margin:       0.5,
        filename:     `CV_${playerProfile?.full_name || 'joueur'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// ===== MODALE DE SIGNATURE (inchangée) =====
let signaturePadModal = null;
let signatureLocked = false;

function openSignatureModal() {
    const modal = document.getElementById('signatureModal');
    modal.style.display = 'block';

    if (!signaturePadModal) {
        const canvas = document.getElementById('signatureCanvasModal');
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 300;

        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#551B8C';
        signaturePadModal = new SignaturePad(canvas, {
            backgroundColor: 'white',
            penColor: primaryColor,
            throttle: 16,
            minWidth: 1,
            maxWidth: 2.5
        });

        if (signatureDataURL && signatureDataURL.startsWith('data:')) {
            signaturePadModal.fromDataURL(signatureDataURL);
        }

        document.getElementById('clearSignatureModal').addEventListener('click', () => {
            signaturePadModal.clear();
            document.getElementById('signatureStatus').textContent = '';
        });

        document.getElementById('lockSignatureModal').addEventListener('click', (e) => {
            if (signaturePadModal.isEmpty()) {
                showToast('Veuillez d\'abord signer.', 'warning');
                return;
            }
            signatureLocked = !signatureLocked;
            e.target.textContent = signatureLocked ? 'Déverrouiller' : 'Verrouiller';
            e.target.classList.toggle('locked', signatureLocked);
            if (signatureLocked) {
                signaturePadModal.off();
            } else {
                signaturePadModal.on();
            }
        });

        document.getElementById('saveSignatureModal').addEventListener('click', () => {
            if (signaturePadModal.isEmpty()) {
                showToast('Veuillez signer avant de valider.', 'warning');
                return;
            }
            signatureDataURL = signaturePadModal.toDataURL('image/png');
            const previewImg = document.getElementById('signatureImage');
            previewImg.src = signatureDataURL;
            previewImg.style.display = 'block';
            document.querySelector('.signature-placeholder').style.display = 'none';
            closeSignatureModal();
            showToast('Signature enregistrée', 'success');
        });

        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
}

function closeSignatureModal() {
    document.getElementById('signatureModal').style.display = 'none';
}

window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;

// ===== FONCTIONS UI (inchangées) =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!userMenu || !dropdown) return;
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    let touchStartX = 0, touchStartY = 0, touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) {
                e.preventDefault();
            }
            if (diffX > 0 && touchStartX < 50) {
                openSidebar();
            } else if (diffX < 0) {
                closeSidebarFunc();
            }
        }
    }, { passive: false });
}

function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabase.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page edit-cv');

    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    if (!playerProfile) {
        showToast('Profil non trouvé. Veuillez compléter votre inscription.', 'error');
        // On continue quand même pour permettre de remplir le formulaire ? Non, on ne peut pas.
        return;
    }

    await loadCV();

    // Pré-remplir avec le profil si aucun CV n'existe
    if (!cvData) {
        populateFromProfile();
    }

    document.getElementById('addExperience').addEventListener('click', () => addExperienceItem());
    document.getElementById('addFormation').addEventListener('click', () => addFormationItem());
    document.getElementById('addLangue').addEventListener('click', () => addLangueItem());

    document.getElementById('cvForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCV();
    });

    document.getElementById('previewBtn').addEventListener('click', generatePreview);
    document.getElementById('exportBtn').addEventListener('click', exportPDF);

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang = e.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});

// ===== UTILITAIRE =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
