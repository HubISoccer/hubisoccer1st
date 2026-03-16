// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentParrain = null;
let cvData = null;
let cvValidationStatus = 'pending';
let signatureDataURL = null;       // Données base64 pour l'affichage dans la modale
let signatureUploadedUrl = null;   // URL après upload (stockée en base)

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    document.getElementById('toastContainer').appendChild(toast);
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
    if (!loader) {
        const newLoader = document.createElement('div');
        newLoader.id = 'globalLoader';
        newLoader.className = 'global-loader';
        newLoader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(newLoader);
    }
    document.getElementById('globalLoader').style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseParrainPrive.auth.getSession();
        if (error || !session) {
            window.location.href = 'auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email, 'ID:', currentUser.id);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = 'auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL PARRAIN =====
async function loadParrainProfile() {
    if (!currentUser?.id) {
        console.error('currentUser.id manquant');
        currentParrain = { id: null, first_name: 'Parrain', last_name: '', avatar_url: 'img/user-default.jpg' };
        return;
    }
    try {
        const { data, error } = await supabaseParrainPrive
            .from('parrain_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            currentParrain = { id: null, first_name: 'Parrain', last_name: '', avatar_url: 'img/user-default.jpg' };
        } else {
            currentParrain = data || { id: null, first_name: 'Parrain', last_name: '', avatar_url: 'img/user-default.jpg' };
        }
        const fullName = `${currentParrain.first_name || ''} ${currentParrain.last_name || ''}`.trim() || 'Parrain';
        document.getElementById('userName').textContent = fullName;
        console.log('✅ Profil utilisé :', currentParrain);
    } catch (err) {
        console.error('❌ Exception loadParrainProfile :', err);
        currentParrain = { id: null, first_name: 'Parrain', last_name: '', avatar_url: 'img/user-default.jpg' };
    }
}

// ===== CHARGEMENT DU CV DEPUIS LA BASE =====
async function loadCV() {
    if (!currentParrain?.id) return;
    try {
        const { data, error } = await supabaseParrainPrive
            .from('parrain_cv')
            .select('*')
            .eq('parrain_id', currentParrain.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement CV:', error);
            return;
        }
        if (data) {
            cvData = data.data;               // Le JSON contenant les infos du CV
            cvValidationStatus = data.validation_status || 'pending';
            signatureUploadedUrl = data.signature_url || null;
            populateForm(cvData);
            if (signatureUploadedUrl) {
                const img = document.getElementById('signatureImage');
                img.src = signatureUploadedUrl;
                img.style.display = 'block';
                document.querySelector('.signature-placeholder').style.display = 'none';
                signatureDataURL = signatureUploadedUrl; // pour l'affichage, on met l'URL
            }
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

// ===== REMPLIR LE FORMULAIRE =====
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
                <input type="text" class="exp-poste" value="${data.poste || ''}" placeholder="Ex: Joueur, Coach, Stagiaire">
            </div>
            <div class="form-group">
                <label>Employeur / Club</label>
                <input type="text" class="exp-employeur" value="${data.employeur || ''}" placeholder="Nom du club ou entreprise">
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
                <input type="text" class="formation-diplome" value="${data.diplome || ''}" placeholder="Ex: Bac S, Licence STAPS">
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

// ===== COLLECTE DES DONNÉES =====
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
async function uploadSignature(blob) {
    if (!blob) return null;
    const fileName = `signature_${currentParrain.id}_${Date.now()}.png`;
    const filePath = `signatures/${fileName}`;
    const { error } = await supabaseParrainPrive.storage
        .from('parrain-cv-signatures')
        .upload(filePath, blob);
    if (error) throw error;
    const { data: urlData } = supabaseParrainPrive.storage
        .from('parrain-cv-signatures')
        .getPublicUrl(filePath);
    return urlData.publicUrl;
}

// ===== SAUVEGARDE DU CV =====
async function saveCV() {
    if (!currentParrain?.id) {
        showToast('Profil parrain non chargé', 'error');
        return;
    }
    const formData = collectFormData();

    showLoader(true);
    try {
        // Gérer la signature
        let signatureUrl = signatureUploadedUrl;
        if (signatureDataURL && signatureDataURL.startsWith('data:image')) {
            const blob = await (await fetch(signatureDataURL)).blob();
            signatureUrl = await uploadSignature(blob);
        } else if (signatureDataURL && signatureDataURL.startsWith('http')) {
            signatureUrl = signatureDataURL;
        }

        const { data: existing, error: selectError } = await supabaseParrainPrive
            .from('parrain_cv')
            .select('id')
            .eq('parrain_id', currentParrain.id)
            .maybeSingle();

        if (selectError) throw selectError;

        let result;
        if (existing) {
            result = await supabaseParrainPrive
                .from('parrain_cv')
                .update({
                    data: formData,
                    signature_url: signatureUrl,
                    validation_status: 'pending',
                    updated_at: new Date()
                })
                .eq('id', existing.id);
        } else {
            result = await supabaseParrainPrive
                .from('parrain_cv')
                .insert([{
                    parrain_id: currentParrain.id,
                    data: formData,
                    signature_url: signatureUrl,
                    validation_status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date()
                }]);
        }

        if (result.error) throw result.error;

        showToast('CV enregistré avec succès ! En attente de validation.', 'success');
        cvValidationStatus = 'pending';
        signatureUploadedUrl = signatureUrl;
        updateValidationStatus();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la sauvegarde : ' + err.message, 'error');
    } finally {
        showLoader(false);
    }
}

// ===== GÉNÉRATION DE L'APERÇU =====
function generatePreview() {
    const data = collectFormData();
    const previewDiv = document.getElementById('previewContent');
    const fullName = `${data.prenom} ${data.nom}`.trim() || 'Nom Prénom';
    const avatarUrl = currentParrain?.avatar_url || 'img/user-default.jpg';

    const skillsTech = data.skillsTech ? data.skillsTech.split(',').map(s => s.trim()).filter(s => s) : [];
    const skillsSoft = data.skillsSoft ? data.skillsSoft.split(',').map(s => s.trim()).filter(s => s) : [];
    const allSkills = [...skillsTech, ...skillsSoft];

    const formationsHtml = (data.formations || []).map(f => `
        <div class="cv-item">
            <div class="cv-item-date">${f.date || ''}</div>
            <div class="cv-item-title">${f.diplome || ''}</div>
            <div class="cv-item-subtitle">${f.etablissement || ''}</div>
        </div>
    `).join('');

    const experiencesHtml = (data.experiences || []).map(e => `
        <div class="cv-item">
            <div class="cv-item-date">${e.debut || ''} – ${e.fin || ''}</div>
            <div class="cv-item-title">${e.poste || ''}</div>
            <div class="cv-item-subtitle">${e.employeur || ''}</div>
            <div class="cv-item-description">${e.description || ''}</div>
        </div>
    `).join('');

    const languesHtml = (data.langues || []).map(l => `
        <div class="cv-lang-item">
            <span class="cv-lang-name">${l.nom || ''}</span>
            <span class="cv-lang-level">${l.niveau || ''}</span>
        </div>
    `).join('');

    const skillsListHtml = allSkills.map(skill => `<li>${skill}</li>`).join('');

    const contactHtml = `
        ${data.telephone ? `<div class="cv-contact-item"><i class="fas fa-phone"></i> ${data.telephone}</div>` : ''}
        ${data.email ? `<div class="cv-contact-item"><i class="fas fa-envelope"></i> ${data.email}</div>` : ''}
        ${data.ville ? `<div class="cv-contact-item"><i class="fas fa-map-marker-alt"></i> ${data.ville}</div>` : ''}
        ${data.social ? `<div class="cv-contact-item"><i class="fas fa-link"></i> ${data.social}</div>` : ''}
    `;

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
        <div class="cv-footer">
            <div class="signature-info">
                Fait le ${data.dateSignature || '...'} à ${data.lieuSignature || '...'}
            </div>
            ${signatureUploadedUrl ? `<img src="${signatureUploadedUrl}" alt="Signature">` : ''}
        </div>
    `;

    previewDiv.innerHTML = html;
    document.getElementById('cvPreview').style.display = 'block';
}

// ===== EXPORT PDF =====
function exportPDF() {
    const element = document.getElementById('previewContent');
    const fullName = currentParrain ? `${currentParrain.first_name} ${currentParrain.last_name}`.trim() : 'parrain';
    const opt = {
        margin:       0.5,
        filename:     `CV_${fullName}.pdf`,
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

        if (signatureDataURL && signatureDataURL.startsWith('data:image')) {
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
        });

        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
}

function closeSignatureModal() {
    document.getElementById('signatureModal').style.display = 'none';
}

window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;

// ===== FONCTIONS UI =====
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
    const sidebar = document.getElementById('leftSidebar');
    const closeBtn = document.getElementById('closeLeftSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!menuBtn || !sidebar || !closeBtn || !overlay) return;

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    menuBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebarFunc);
    overlay.addEventListener('click', closeSidebarFunc);
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseParrainPrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page edit-cv (parrain)');

    const user = await checkSession();
    if (!user) return;

    showLoader(true);
    try {
        await loadParrainProfile();
        await loadCV();

        document.getElementById('addExperience').addEventListener('click', () => addExperienceItem());
        document.getElementById('addFormation').addEventListener('click', () => addFormationItem());
        document.getElementById('addLangue').addEventListener('click', () => addLangueItem());

        document.getElementById('cvForm').addEventListener('submit', (e) => {
            e.preventDefault();
            saveCV();
        });

        document.getElementById('previewBtn').addEventListener('click', generatePreview);
        document.getElementById('exportBtn').addEventListener('click', exportPDF);

        initUserMenu();
        initSidebar();
        initLogout();

        document.getElementById('languageLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Changement de langue bientôt disponible', 'info');
        });

        console.log('✅ Initialisation terminée');
    } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err);
        showToast('Erreur lors du chargement de la page', 'error');
    } finally {
        showLoader(false);
    }
});