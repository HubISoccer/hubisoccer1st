// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
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

// ===== LOADER GLOBAL =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseCoachPrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL COACH =====
async function loadCoachProfile() {
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        if (!data) {
            showToast('Profil coach introuvable', 'error');
            return null;
        }
        currentCoach = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentCoach;
    } catch (err) {
        console.error('❌ Exception loadCoachProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DU CV DEPUIS LA BASE =====
async function loadCV() {
    if (!currentCoach?.id) return;
    try {
        const { data, error } = await supabaseCoachPrive
            .from('coach_cv')
            .select('*')
            .eq('coach_id', currentCoach.id)
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
        console.error('❌ Exception loadCV:', err);
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
    document.getElementById('specialites').value = data.specialites || '';
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
    if (data.signature) {
        signatureDataURL = data.signature;
        const img = document.getElementById('signatureImage');
        img.src = signatureDataURL;
        img.style.display = 'block';
        document.querySelector('.signature-placeholder').style.display = 'none';
    }
}

// ===== GESTION DES ÉLÉMENTS DYNAMIQUES =====
function addExperienceItem(data = {}) {
    const container = document.getElementById('experiences-container');
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.innerHTML = `
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        <div class="form-row">
            <div class="form-group">
                <label>Poste / Titre</label>
                <input type="text" class="exp-poste" value="${data.poste || ''}" placeholder="Ex: Entraîneur principal, Adjoint, Responsable formation">
            </div>
            <div class="form-group">
                <label>Club / Structure</label>
                <input type="text" class="exp-employeur" value="${data.employeur || ''}" placeholder="Nom du club">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Date début</label>
                <input type="month" class="exp-debut" value="${data.debut || ''}">
            </div>
            <div class="form-group">
                <label>Date fin</label>
                <input type="month" class="exp-fin" value="${data.fin || ''}">
            </div>
        </div>
        <div class="form-group full-width">
            <label>Description (missions, réalisations, catégorie)</label>
            <textarea class="exp-description" rows="2">${data.description || ''}</textarea>
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
                <input type="text" class="formation-diplome" value="${data.diplome || ''}" placeholder="Ex: DESJEPS, UEFA A">
            </div>
            <div class="form-group">
                <label>Établissement</label>
                <input type="text" class="formation-etablissement" value="${data.etablissement || ''}" placeholder="Nom de l'école ou fédération">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Date d'obtention</label>
                <input type="month" class="formation-date" value="${data.date || ''}">
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
                <input type="text" class="langue-nom" value="${data.nom || ''}" placeholder="Ex: Français">
            </div>
            <div class="form-group">
                <label>Niveau (compréhension écrite/orale)</label>
                <input type="text" class="langue-niveau" value="${data.niveau || ''}" placeholder="Ex: Courant, Intermédiaire">
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
    data.specialites = document.getElementById('specialites').value;
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

    data.signature = signatureDataURL;

    return data;
}

// ===== SAUVEGARDE DU CV =====
async function saveCV() {
    if (!currentCoach?.id) {
        showToast('Profil coach non chargé', 'error');
        return;
    }
    const formData = collectFormData();

    try {
        const { data: existing, error: selectError } = await supabaseCoachPrive
            .from('coach_cv')
            .select('id')
            .eq('coach_id', currentCoach.id)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            const result = await supabaseCoachPrive
                .from('coach_cv')
                .update({
                    data: formData,
                    validation_status: 'pending',
                    updated_at: new Date()
                })
                .eq('coach_id', currentCoach.id);
            if (result.error) throw result.error;
        } else {
            const result = await supabaseCoachPrive
                .from('coach_cv')
                .insert([{
                    coach_id: currentCoach.id,
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

// ===== GÉNÉRATION DE L'APERÇU (DEUX COLONNES) =====
function generatePreview() {
    const data = collectFormData();
    const previewDiv = document.getElementById('previewContent');
    const fullName = `${data.prenom} ${data.nom}`.trim() || 'Nom Prénom';
    const avatarUrl = currentCoach?.avatar_url || 'img/user-default.jpg';

    // Compétences (fusion)
    const skillsTech = data.skillsTech ? data.skillsTech.split(',').map(s => s.trim()).filter(s => s) : [];
    const skillsSoft = data.skillsSoft ? data.skillsSoft.split(',').map(s => s.trim()).filter(s => s) : [];
    const allSkills = [...skillsTech, ...skillsSoft];

    // Formations HTML
    const formationsHtml = data.formations.map(f => `
        <div class="cv-item">
            <div class="cv-item-date">${f.date || ''}</div>
            <div class="cv-item-title">${f.diplome || ''}</div>
            <div class="cv-item-subtitle">${f.etablissement || ''}</div>
        </div>
    `).join('');

    // Expériences HTML
    const experiencesHtml = data.experiences.map(e => `
        <div class="cv-item">
            <div class="cv-item-date">${e.debut || ''} – ${e.fin || ''}</div>
            <div class="cv-item-title">${e.poste || ''}</div>
            <div class="cv-item-subtitle">${e.employeur || ''}</div>
            <div class="cv-item-description">${e.description || ''}</div>
        </div>
    `).join('');

    // Langues HTML
    const languesHtml = data.langues.map(l => `
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

    // Spécialités
    const specialitesHtml = data.specialites ? `<p>${data.specialites}</p>` : '';

    // Assemblage final
    const html = `
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
                    <div class="cv-section-titlecv-section">
                    <div class="cv-section-title"><i class="fas fa-address-card"><i class="fas fa-address-card"></i> Coordonnées</div>
                    ${contact"></i> Coordonnées</div>
                    ${contactHtml || '<p>Non renseHtml || '<p>Non renseigné</p>'}
                </div>
               igné</p>'}
                </div>
                <div class="cv-section">
                    <div class="cv-section">
                    <div class <div class="cv-section-title"><i class="fas fa-star"></="cv-section-title"><i class="fas fa-star"></i> Spécialités</div>
                    ${specialitesHtmli> Spécialités</div>
                    ${specialitesHtml || '<p>Non renseign || '<p>Non renseigné</p>'}
                </divé</p>'}
                </div>
                <div class="cv-section">
                    <div class=">
                <div class="cv-section">
                    <div class="cv-section-title"><i classcv-section-title="fas fa-user-tag"></i> Profil professionnel</"><i class="fas fa-user-tag"></i> Profil professionnel</div>
                    <p>${data.profildiv>
                    <p>${data.profil || 'Non renseigné'}</p>
                </div || 'Non renseigné'}</p>
                </div>
                <div class="cv-section">
                    <div class=">
                <div class="cv-section">
                    <div class="cv-section-title"><i classcv-section-title"><i class="fas fa-pencil-alt"></i> Biographie</div>
                   ="fas fa-pencil-alt"></i> Biographie</div>
 <p class="cv-bio">${data.bio || 'Non                    <p class="cv-bio">${data.bio || renseigné'}</p>
                </ 'Non renseigné'}</p>
                </div>
                <div class="cv-section">
div>
                <div class="cv-section">
                    <div class                    <div class="cv-section-title"><i class="fas fa-briefcase"></="cv-section-title"><i class="fas fa-briefcase"></i> Expériences professionnelles</div>
                    ${experiencesi> Expériences professionnelles</div>
                    ${experiencesHtml || '<p>Aucune expérience renHtml || '<p>Aucune expérience renseignée.</p>seignée.</p>'}
                </div>
            </div>
        </div>
       '}
                </div>
            </div>
        </div>
        <!-- Pied de page (signature) -->
        <div <!-- Pied de page (signature) -->
        <div class="cv-footer">
            <div class="signature-info">
                F class="cv-footer">
            <div class="signature-info">
                Fait le ${data.dateSignature || 'ait le ${data.dateSignature || '...'} à ${data.lieuSignature...'} à ${data.lieuSignature || '...'}
            </div>
 || '...'}
            </div>
            ${signatureDataURL ? `<img src="${signatureData            ${signatureDataURL ? `<img src="${signatureDataURL}" alt="Signature">` :URL}" alt="Signature">` : ''}
        </div>
    `;

    previewDiv.innerHTML = html;
 ''}
        </div>
    `;

    previewDiv.innerHTML = html;
    document.getElementById('cvPreview').style    document.getElementById('cvPreview').style.display = 'block';
}

// ===== EXPORT PDF =====.display = 'block';
}

// ===== EXPORT PDF =====
function exportPDF() {
    const element = document.getElementById('pre
function exportPDF() {
    const element = document.getElementById('previewContent');
    const opt = {
        margin:       viewContent');
    const opt = {
        margin:       0.5,
        filename:    0.5,
        filename:     `CV_Coach_${ `CV_Coach_${currentCoachcurrentCoach?.first_name}_${currentCoach?.last_name}.pdf?.first_name}_${currentCoach?.last_name`,
        image:        { type: 'jpeg', quality: 0}.pdf`,
        image:        { type: 'jpeg', quality: 0.98.98 },
        html2canvas:  { scale: 2 },
        jsPDF },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf: 'portrait' }
    };
    html2pdf().set().set(opt).from(element).save();
}

// ===== MODALE(opt).from(element).save();
}

// ===== MODALE DE SIGNATURE =====
let signaturePadModal = null DE SIGNATURE =====
let signaturePadModal = null;
let signatureLocked =;
let signatureLocked = false;

function openSignatureModal() {
    const modal = document.getElementById false;

function openSignatureModal() {
    const modal = document.getElementById('signatureModal');
    modal.style.display = 'block('signatureModal');
    modal.style.display = 'block';

    if (!signaturePadModal) {
        const canvas =';

    if (!signaturePadModal) {
        const canvas = document.getElementById('signatureCanvasModal');
        canvas.width = document.getElementById('signatureCanvasModal');
        canvas.width = canvas.offsetWidth || 800;
        canvas canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 300;

        const primaryColor = getComputedStyle(document.height = canvas.offsetHeight || 300;

        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#551B8.documentElement).getPropertyValue('--primary').trim() || '#551B8C';
        signaturePadModal = new SignaturePad(canvas, {
            backgroundColor:C';
        signaturePadModal = new SignaturePad(canvas, {
            backgroundColor: 'white',
            'white',
            penColor: primaryColor,
            throttle: 16,
 penColor: primaryColor,
            throttle: 16,
            minWidth: 1,
            maxWidth            minWidth: 1,
            maxWidth: : 2.5
        });

        if2.5
        });

        if (signatureDataURL) {
            signaturePad (signatureDataURL) {
            signaturePadModal.fromDataURL(signatureDataURL);
        }

Modal.fromDataURL(signatureDataURL);
        }

        document.getElementById('clearSignatureModal').addEventListener('click', () => {
            signature        document.getElementById('clearSignatureModal').addEventListener('click', () => {
            signaturePadModalPadModal.clear();
            document.getElementById('signatureStatus').textContent.clear();
            document.getElementById('signatureStatus').textContent = '';
        });

        document.getElementById('lockSignatureModal').addEventListener('click', (e) = '';
        });

        document.getElementById('lockSignatureModal').addEventListener('click', (e) => {
            if => {
            if (signaturePad (signaturePadModal.isEmpty()) {
                showModal.isEmpty()) {
                showToast('VeuToast('Veuillez d\'abord signer.', 'warning');
                return;
illez d\'abord signer.', 'warning');
                return;
            }
            signatureLocked = !            }
            signatureLocked = !signatureLocked;
           signatureLocked;
            e.target.textContent = signatureLocked ? ' e.target.textContent = signatureLocked ? 'Déverrouiller' : 'Verrouiller';
            eDéverrouiller' : 'Verrouiller';
            e.target.classList.toggle('.target.classList.toggle('locked', signatureLocked);
            if (signatureLocked) {
                signaturelocked', signatureLocked);
            if (signatureLocked) {
                signaturePadModal.off();
            } elsePadModal.off();
            } else {
                signaturePadModal.on();
            {
                signaturePadModal.on();
            }
        });

        document.getElementById('saveSignatureModal').addEventListener(' }
        });

        document.getElementById('saveSignatureModal').addEventListener('click', () => {
            if (signatureclick', () => {
            if (signaturePadModal.isEmpty()) {
                showToast('Veuillez signer avantPadModal.isEmpty()) {
                showToast('Veuillez signer avant de valider.', 'warning');
                return;
 de valider.', 'warning');
                return;
            }
            signatureDataURL = signaturePadModal.toData            }
            signatureDataURL = signaturePadModal.toDataURL('image/png');
            constURL('image/png');
            const previewImg = document previewImg = document.getElementById('signatureImage');
            previewImg.src = signatureDataURL;
            previewImg.getElementById('signatureImage');
            previewImg.src = signatureDataURL;
            previewImg.style.display = 'block';
            document.querySelector('.signature-placeholder').style.style.display = 'block';
            document.querySelector('.signature-placeholder').style.display = 'none';
            closeSignatureModal();
            showToast('Signature en.display = 'none';
            closeSignatureModal();
            showToast('Signature enregistrée', 'success');
        });

        canvasregistrée', 'success');
        });

.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
}

function close        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
}

function closeSignatureModal() {
SignatureModal() {
    document.getElementById('signatureModal').style.display = '    document.getElementById('signatureModal').style.display = 'none';
}

window.openSignatureModal = openSignatureModal;
none';
}

window.openSignatureModal =window.closeSignatureModal = closeSignatureModal;

// openSignatureModal;
window.closeSignatureModal = closeSignatureModal;

// ===== FONCTIONS UI = ===== FONCTIONS UI =====
====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = documentfunction initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown) {
        user.getElementById('userDropdown');
    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
Menu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document            dropdown.classList.toggle('show');
.addEventListener('click', () => dropdown.classList.remove('show'));
    }
}

function addMenu        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
}

function addMenuHandle()Handle() {
    if (document.getElementById('menuHandle')) {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = = 'menuHandle';
    handle.className = 'menu-handle';
    handle.set 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir leAttribute('aria-label', 'Ouvrir le menu');
 menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

function initSidebar() {
    const menuhandle);
}

function initSidebar() {
   Btn = document.getElementById('menuToggle');
    const sidebar = document.getElementById const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const close('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementByIdBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar()('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function close {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
   SidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    if (menuBtn) menu('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (Btn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openmenuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('clickBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    let touchStartX = 0, touchStartY = 0,', closeSidebarFunc);

    let touchStartX = 0, touchStartY = 0, touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touch touchEndX = 0;
    const swipeThreshold = 50;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0start', (e) => {
        touchStartX = e.changedTouches[0].screen].screenX;
        touchStartY = e.changedTouches[0].X;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (escreenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.ch) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndXangedTouches[0].screenX;
        const diffX = touchEndX - touchStartX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStart;
        const diffY = e.changedTouches[0Y;

        if (Math.abs(diffX) > Math.abs(diffY)].screenY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) {
                e.preventDefault();
            }
            if ( (e.cancelable) {
                e.preventDefault();
            }
            if (diffX > 0 && touchStartdiffX > 0 && touchStartX < 50) {
                openSidebarX < 50) {
                openSidebar();
           ();
            } else if (diffX < 0 && sidebar.classList } else if (diffX < 0 && sidebar.classList.contains('active')) {
                closeSidebarFunc();
            }
        }
    }, {.contains('active')) {
                closeSidebarFunc();
            }
        }
    }, { passive: passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, # false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinklogoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
Sidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseCoachPrive.auth            e.preventDefault();
            await supabaseCoachPr.signOut();
            window.location.href = '../index.html';
        });
   ive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION = });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async====
document.addEventListener('DOMContentLoaded', async () => () => {
    console.log('🚀 Initialisation de la page edit-cv {
    console.log('🚀 Initialisation de la page edit-cv (coach) (coach)');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
');

    const user = await checkSession();
    if (!user) return;

    await loadCoachProfile();
    if (!currentCoach) return;

    await loadCV();

    document.getElementById('addExperience').    if (!currentCoach) return;

    await loadCV();

    document.getElementById('addaddEventListener('click', () => addExperienceItem());
    document.getElementById('addFormation').addEventListener('click',Experience').addEventListener('click', () => addExperienceItem());
    document.getElementById('addFormation').addEventListener('click', () => addFormationItem());
    document.getElementById('addLangue').addEventListener('click', () => () => addFormationItem());
    document.getElementById('addLangue').addEventListener('click', () => addLangueItem());

    document.getElementById('cvForm').addEventListener('submit', (e) addLangueItem());

    document.getElementById('cvForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCV();
    });

    document => {
        e.preventDefault();
        saveCV();
    });

    document.getElementById('previewBtn').addEventListener('click', generatePreview);
    document.getElementById('exportBtn.getElementById('previewBtn').addEventListener('click', generatePreview);
    document.getElementById('exportBtn').addEventListener('click', exportPDF);

   ').addEventListener('click', exportPDF);

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang document.getElementById('langSelect')?.addEventListener('change', (e) => {
        const lang = e = e.target.value;
        showToast(`Langue changée en ${e.target.options.target.value;
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
   [e.target.selectedIndex].text}`, 'info');
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅('Changement de langue bientôt disponible', 'info');
    });

    console.log Initialisation terminée');
});
