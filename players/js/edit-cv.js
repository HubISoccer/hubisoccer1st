// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCV = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let cvData = null;
let cvValidationStatus = 'pending';
let signatureDataURL = null;

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseCV.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email, 'ID:', currentUser.id);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL =====
async function loadPlayerProfile() {
    if (!currentUser?.id) {
        console.error('currentUser.id manquant');
        playerProfile = { id: null, nom_complet: 'Joueur', avatar_url: 'img/user-default.jpg' };
        return;
    }
    try {
        const { data, error } = await supabaseCV
            .from('player_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            playerProfile = { id: null, nom_complet: 'Joueur', avatar_url: 'img/user-default.jpg' };
        } else {
            playerProfile = data || { id: null, nom_complet: 'Joueur', avatar_url: 'img/user-default.jpg' };
        }
        document.getElementById('userName').textContent = playerProfile.nom_complet || 'Joueur';
        console.log('✅ Profil utilisé :', playerProfile);
    } catch (err) {
        console.error('❌ Exception loadPlayerProfile :', err);
        playerProfile = { id: null, nom_complet: 'Joueur', avatar_url: 'img/user-default.jpg' };
    }
}

// ===== CHARGEMENT DU CV DEPUIS LA BASE =====
async function loadCV() {
    if (!playerProfile?.id) return;
    try {
        const { data, error } = await supabaseCV
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

    data.signature = signatureDataURL;

    return data;
}

// ===== SAUVEGARDE DU CV =====
async function saveCV() {
    if (!playerProfile?.id) {
        alert('Profil joueur non chargé');
        return;
    }
    const formData = collectFormData();

    try {
        const { data: existing, error: selectError } = await supabaseCV
            .from('player_cv')
            .select('id')
            .eq('player_id', playerProfile.id)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            const result = await supabaseCV
                .from('player_cv')
                .update({
                    data: formData,
                    validation_status: 'pending',
                    updated_at: new Date()
                })
                .eq('player_id', playerProfile.id);
            if (result.error) throw result.error;
        } else {
            const result = await supabaseCV
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

        alert('CV enregistré avec succès ! En attente de validation.');
        cvValidationStatus = 'pending';
        updateValidationStatus();
    } catch (err) {
        alert('Erreur lors de la sauvegarde : ' + err.message);
    }
}

// ===== GÉNÉRATION DE L'APERÇU (STYLE PHOTO) =====
function generatePreview() {
    const data = collectFormData();
    const previewDiv = document.getElementById('previewContent');
    const fullName = `${data.prenom} ${data.nom}`.trim() || 'Nom Prénom';
    const avatarUrl = playerProfile?.avatar_url || 'img/user-default.jpg';

    // Compétences (fusion des deux listes)
    const skillsTech = data.skillsTech ? data.skillsTech.split(',').map(s => s.trim()).filter(s => s) : [];
    const skillsSoft = data.skillsSoft ? data.skillsSoft.split(',').map(s => s.trim()).filter(s => s) : [];
    const allSkills = [...skillsTech, ...skillsSoft];

    // Formation
    const formationsHtml = data.formations.map(f => `
        <div class="cv-item">
            <div class="cv-item-date">${f.date || ''}</div>
            <div class="cv-item-title">${f.diplome || ''}</div>
            <div class="cv-item-subtitle">${f.etablissement || ''}</div>
        </div>
    `).join('');

    // Expériences
    const experiencesHtml = data.experiences.map(e => `
        <div class="cv-item">
            <div class="cv-item-date">${e.debut || ''} – ${e.fin || ''}</div>
            <div class="cv-item-title">${e.poste || ''}</div>
            <div class="cv-item-subtitle">${e.employeur || ''}</div>
            <div class="cv-item-description">${e.description || ''}</div>
        </div>
    `).join('');

    // Langues
    const languesHtml = data.langues.map(l => `
        <div class="cv-lang-item">
            <span class="cv-lang-name">${l.nom || ''}</span>
            <span class="cv-lang-level">${l.niveau || ''}</span>
        </div>
    `).join('');

    // Compétences (liste à puces)
    const skillsListHtml = allSkills.map(skill => `<li>${skill}</li>`).join('');

    const html = `
        <div class="cv-preview-layout">
            <!-- En-tête avec photo -->
            <div class="cv-header">
                <div class="cv-avatar">
                    <img src="${avatarUrl}" alt="Avatar">
                </div>
                <div class="cv-header-info">
                    <h1>${fullName}</h1>
                    <div class="cv-subtitle">${data.profil || 'CV'}</div>
                    <div class="cv-contact">
                        ${data.telephone ? `<span><i class="fas fa-phone"></i> ${data.telephone}</span>` : ''}
                        ${data.email ? `<span><i class="fas fa-envelope"></i> ${data.email}</span>` : ''}
                        ${data.ville ? `<span><i class="fas fa-map-marker-alt"></i> ${data.ville}</span>` : ''}
                    </div>
                </div>
            </div>

            <!-- Informations sportives -->
            <div class="cv-section">
                <div class="cv-section-title">Informations sportives</div>
                <div class="cv-sport-info">
                    ${data.taille ? `<span>Taille: ${data.taille} cm</span>` : ''}
                    ${data.poids ? `<span>Poids: ${data.poids} kg</span>` : ''}
                    ${data.piedFort ? `<span>Pied: ${data.piedFort}</span>` : ''}
                    ${data.club ? `<span>Club: ${data.club}</span>` : ''}
                </div>
                <div class="cv-sport-info">
                    ${data.matchs ? `<span>Matchs: ${data.matchs}</span>` : ''}
                    ${data.buts ? `<span>Buts: ${data.buts}</span>` : ''}
                    ${data.passes ? `<span>Passes: ${data.passes}</span>` : ''}
                    ${data.valeur ? `<span>Valeur: ${data.valeur} FCFA</span>` : ''}
                </div>
            </div>

            <!-- Formation -->
            <div class="cv-section">
                <div class="cv-section-title">Formation</div>
                ${formationsHtml || '<p>Aucune formation renseignée.</p>'}
            </div>

            <!-- À propos (profil) -->
            <div class="cv-section">
                <div class="cv-section-title">À propos</div>
                <p>${data.profil || 'Non renseigné'}</p>
            </div>

            <!-- Compétences -->
            <div class="cv-section">
                <div class="cv-section-title">Compétences</div>
                <ul class="cv-skills-list">
                    ${skillsListHtml || '<li>Aucune compétence renseignée.</li>'}
                </ul>
            </div>

            <!-- Expériences professionnelles -->
            <div class="cv-section">
                <div class="cv-section-title">Expérience professionnelle</div>
                ${experiencesHtml || '<p>Aucune expérience renseignée.</p>'}
            </div>

            <!-- Langues -->
            ${languesHtml ? `
            <div class="cv-section">
                <div class="cv-section-title">Langues</div>
                ${languesHtml}
            </div>
            ` : ''}

            <!-- Centres d'intérêt -->
            ${data.interets ? `
            <div class="cv-section">
                <div class="cv-section-title">Centres d'intérêt</div>
                <p class="cv-interets">${data.interets}</p>
            </div>
            ` : ''}

            <!-- Biographie -->
            ${data.bio ? `
            <div class="cv-section">
                <div class="cv-section-title">Biographie</div>
                <p class="cv-bio">${data.bio}</p>
            </div>
            ` : ''}

            <!-- Signature -->
            <div class="cv-signature">
                <div>Fait le ${data.dateSignature || '...'} à ${data.lieuSignature || '...'}</div>
                ${signatureDataURL ? `<img src="${signatureDataURL}" alt="Signature">` : ''}
            </div>
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
        filename:     `CV_${playerProfile?.nom_complet || 'joueur'}.pdf`,
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
                alert('Veuillez d\'abord signer.');
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
                alert('Veuillez signer avant de valider.');
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
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');

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
            supabaseCV.auth.signOut().then(() => {
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
        alert('Changement de langue bientôt disponible');
    });

    console.log('✅ Initialisation terminée');
});