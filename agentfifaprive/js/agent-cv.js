// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAgentPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentAgent = null;
let cvData = null;
let cvValidationStatus = 'pending';
let signatureDataURL = null;
let cvFile = null;

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
        const { data: { session }, error } = await supabaseAgentPrive.auth.getSession();
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

// ===== CHARGEMENT DU PROFIL AGENT =====
async function loadAgentProfile() {
    try {
        const { data, error } = await supabaseAgentPrive
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        if (data.role !== 'agent') {
            showToast('Accès non autorisé', 'error');
            setTimeout(() => { window.location.href = '../index.html'; }, 2000);
            return null;
        }
        currentAgent = data;
        document.getElementById('userName').textContent = data.full_name || 'Agent';
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentAgent;
    } catch (err) {
        console.error('❌ Exception loadAgentProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== CHARGEMENT DU CV DEPUIS LA BASE =====
async function loadCV() {
    if (!currentAgent) return;
    try {
        const { data, error } = await supabaseAgentPrive
            .from('agent_cv')
            .select('*')
            .eq('agent_id', currentAgent.id)
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

// ===== PRÉ-REMPLISSAGE AVEC LE PROFIL =====
function populateFromProfile() {
    if (!currentAgent) return;
    const nameParts = (currentAgent.full_name || '').split(' ');
    const prenom = nameParts[0] || '';
    const nom = nameParts.slice(1).join(' ') || '';

    document.getElementById('nom').value = nom;
    document.getElementById('prenom').value = prenom;
    document.getElementById('telephone').value = currentAgent.contact_info?.phone || '';
    document.getElementById('email').value = currentAgent.contact_info?.email || currentAgent.email || '';
    document.getElementById('ville').value = currentAgent.contact_info?.city || '';
    document.getElementById('social').value = currentAgent.contact_info?.social || '';
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
    document.getElementById('zones').value = data.zones || '';
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

    // CV file (on ne peut pas pré-remplir le champ file, mais on peut afficher le nom)
    if (data.cv_file_url) {
        document.getElementById('cvFileName').textContent = data.cv_file_url.split('/').pop();
        document.getElementById('cvFileLabel').textContent = 'Fichier déjà téléchargé';
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
                <input type="text" class="exp-poste" value="${data.poste || ''}" placeholder="Ex: Agent FIFA, Conseiller sportif">
            </div>
            <div class="form-group">
                <label>Employeur / Cabinet</label>
                <input type="text" class="exp-employeur" value="${data.employeur || ''}" placeholder="Nom du cabinet ou club">
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
            <label>Description (missions, réalisations)</label>
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
                <input type="text" class="formation-diplome" value="${data.diplome || ''}" placeholder="Ex: Master Droit du sport">
            </div>
            <div class="form-group">
                <label>Établissement</label>
                <input type="text" class="formation-etablissement" value="${data.etablissement || ''}" placeholder="Nom de l'école ou université">
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
    data.zones = document.getElementById('zones').value;
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

// ===== UPLOAD DE LA SIGNATURE =====
async function uploadSignatureIfNeeded(dataURL) {
    if (!dataURL || dataURL.startsWith('http')) return dataURL;
    if (!dataURL.startsWith('data:image')) return null;

    try {
        const blob = await (await fetch(dataURL)).blob();
        const fileName = `${currentAgent.id}_signature_${Date.now()}.png`;
        const filePath = `signatures/${fileName}`;

        const { error: uploadError } = await supabaseAgentPrive.storage
            .from('documents')
            .upload(filePath, blob);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseAgentPrive.storage
            .from('documents')
            .getPublicUrl(filePath);
        return urlData.publicUrl;
    } catch (err) {
        console.error('Erreur upload signature:', err);
        showToast('Erreur lors de l\'upload de la signature', 'error');
        return null;
    }
}

// ===== UPLOAD DU CV PDF =====
async function uploadCVFile(file) {
    if (!file) return null;
    if (file.type !== 'application/pdf') {
        showToast('Seuls les fichiers PDF sont acceptés', 'warning');
        return null;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Le fichier ne doit pas dépasser 5 Mo', 'warning');
        return null;
    }

    const fileName = `${currentAgent.id}_cv_${Date.now()}.pdf`;
    const filePath = `cv_files/${fileName}`;

    const { error: uploadError } = await supabaseAgentPrive.storage
        .from('documents')
        .upload(filePath, file);
    if (uploadError) {
        showToast('Erreur lors de l\'upload du CV', 'error');
        return null;
    }

    const { data: urlData } = supabaseAgentPrive.storage
        .from('documents')
        .getPublicUrl(filePath);
    return urlData.publicUrl;
}

// ===== SAUVEGARDE DU CV =====
async function saveCV() {
    if (!currentAgent) {
        showToast('Profil agent non chargé', 'error');
        return;
    }

    const formData = collectFormData();

    // Upload signature si nécessaire
    let signatureUrl = formData.signature;
    if (signatureDataURL && signatureDataURL.startsWith('data:')) {
        signatureUrl = await uploadSignatureIfNeeded(signatureDataURL);
        if (!signatureUrl) return;
    }
    formData.signature_url = signatureUrl;

    // Upload CV file si présent
    let cvFileUrl = null;
    if (cvFile) {
        cvFileUrl = await uploadCVFile(cvFile);
        if (!cvFileUrl) return;
        formData.cv_file_url = cvFileUrl;
    }

    try {
        const { data: existing, error: selectError } = await supabaseAgentPrive
            .from('agent_cv')
            .select('id')
            .eq('agent_id', currentAgent.id)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            const { error: updateError } = await supabaseAgentPrive
                .from('agent_cv')
                .update({
                    data: formData,
                    validation_status: 'pending',
                    updated_at: new Date()
                })
                .eq('agent_id', currentAgent.id);
            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await supabaseAgentPrive
                .from('agent_cv')
                .insert([{
                    agent_id: currentAgent.id,
                    data: formData,
                    validation_status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date()
                }]);
            if (insertError) throw insertError;
        }

        showToast('CV enregistré avec succès ! En attente de validation.', 'success');
        cvValidationStatus = 'pending';
        updateValidationStatus();
    } catch (err) {
        console.error('Erreur sauvegarde CV:', err);
        showToast('Erreur lors de la sauvegarde : ' + err.message, 'error');
    }
}

// ===== GÉNÉRATION DE L'APERÇU =====
function generatePreview() {
    const data = collectFormData();
    const previewDiv = document.getElementById('previewContent');
    const fullName = `${data.prenom} ${data.nom}`.trim() || 'Nom Prénom';
    const avatarUrl = currentAgent?.avatar_url || 'img/user-default.jpg';

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
    const specialitesHtml = data.specialites ? `<div class="cv-section"><div class="cv-section-title"><i class="fas fa-briefcase"></i> Spécialités</div><p>${data.specialites}</p></div>` : '';
    const zonesHtml = data.zones ? `<div class="cv-section"><div class="cv-section-title"><i class="fas fa-globe"></i> Zones géographiques</div><p>${data.zones}</p></div>` : '';

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
                    <div class="cv-section-title"><i class="fas fa-address-card"></i> Coordonnées</div>
                    ${contactHtml || '<p>Non renseigné</p>'}
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-user-tag"></i> Profil professionnel</div>
                    <p>${data.profil || 'Non renseigné'}</p>
                </div>
                ${specialitesHtml}
                ${zonesHtml}
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-briefcase"></i> Expériences professionnelles</div>
                    ${experiencesHtml || '<p>Aucune expérience renseignée.</p>'}
                </div>
                <div class="cv-section">
                    <div class="cv-section-title"><i class="fas fa-pencil-alt"></i> Biographie</div>
                    <p class="cv-bio">${data.bio || 'Non renseigné'}</p>
                </div>
            </div>
        </div>
        <!-- Pied de page (signature) -->
        <div class="cv-footer">
            <div class="signature-info">
                Fait le ${data.dateSignature || '...'} à ${data.lieuSignature || '...'}
            </div>
            ${signatureDataURL ? `<img src="${signatureDataURL}" alt="Signature">` : ''}
        </div>
    `;

    previewDiv.innerHTML = html;
    document.getElementById('cvPreview').style.display = 'block';
}

// ===== EXPORT PDF =====
function exportPDF() {
    const element = document.getElementById('previewContent');
    const opt = {
        margin:       0.5,
        filename:     `CV_${currentAgent?.full_name || 'agent'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// ===== MODALE DE SIGNATURE =====
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

        if (signatureDataURL) {
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

// ===== GESTION DU CV PDF =====
function initCVUpload() {
    const dropArea = document.getElementById('cvFileDropArea');
    const fileInput = document.getElementById('cvFile');
    const fileLabel = document.getElementById('cvFileLabel');

    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            cvFile = file;
            fileLabel.textContent = file.name;
            document.getElementById('cvFileName').textContent = file.name;
        } else {
            cvFile = null;
            fileLabel.textContent = 'Cliquez ou glissez votre CV ici';
            document.getElementById('cvFileName').textContent = '';
        }
    });

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.background = 'rgba(85,27,140,0.1)';
    });
    dropArea.addEventListener('dragleave', () => {
        dropArea.style.background = '';
    });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.background = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            cvFile = file;
            fileInput.files = e.dataTransfer.files;
            fileLabel.textContent = file.name;
            document.getElementById('cvFileName').textContent = file.name;
        } else {
            showToast('Seuls les fichiers PDF sont acceptés', 'warning');
        }
    });
}

// ===== FONCTIONS UI =====
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
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

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
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
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0 && sidebar.classList.contains('active')) closeSidebarFunc();
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseAgentPrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page edit-cv (agent)');

    const user = await checkSession();
    if (!user) return;

    await loadAgentProfile();
    if (!currentAgent) return;

    await loadCV();

    // Pré-remplir avec le profil si aucun CV n'existe
    if (!cvData) {
        populateFromProfile();
    }

    // Écouteurs pour ajouts dynamiques
    document.getElementById('addExperience').addEventListener('click', () => addExperienceItem());
    document.getElementById('addFormation').addEventListener('click', () => addFormationItem());
    document.getElementById('addLangue').addEventListener('click', () => addLangueItem());

    document.getElementById('cvForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCV();
    });

    document.getElementById('previewBtn').addEventListener('click', generatePreview);
    document.getElementById('exportBtn').addEventListener('click', exportPDF);

    initCVUpload();

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

// Fonctions globales pour les événements inline
window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;
window.generatePreview = generatePreview;
window.exportPDF = exportPDF;
