// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAgentPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentAgent = null;
let documentsList = [];
let licenseRequest = null;
let signaturePadModal = null;
let signatureLocked = false;
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
    if (!currentUser?.id) {
        showToast('Utilisateur non connecté', 'error');
        return;
    }
    try {
        const { data, error } = await supabaseAgentPrive
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            currentAgent = null;
        } else {
            currentAgent = data;
        }
        document.getElementById('userName').textContent = currentAgent ? currentAgent.full_name : 'Agent';
        document.getElementById('userAvatar').src = currentAgent?.avatar_url || 'img/user-default.jpg';
        console.log('✅ Profil utilisé :', currentAgent);
    } catch (err) {
        console.error('❌ Exception loadAgentProfile :', err);
        showToast('Erreur chargement profil', 'error');
    }
}

// ===== CHARGEMENT DES DOCUMENTS =====
async function loadDocuments() {
    try {
        const requiredDocs = [
            { id: 'id_card', name: 'Pièce d\'identité (CNI/Passeport)', type: 'identity' },
            { id: 'photo', name: 'Photo d\'identité', type: 'photo' },
            { id: 'justificatif_domicile', name: 'Justificatif de domicile', type: 'address' },
            { id: 'fifa_license', name: 'Licence FIFA (si déjà obtenue)', type: 'license' },
            { id: 'attestation_fiscale', name: 'Attestation fiscale', type: 'tax' }
        ];

        if (currentAgent?.id) {
            const { data: existingDocs, error } = await supabaseAgentPrive
                .from('agent_documents')
                .select('*')
                .eq('agent_id', currentAgent.id);

            if (!error && existingDocs) {
                documentsList = requiredDocs.map(doc => {
                    const existing = existingDocs.find(d => d.type_document === doc.id);
                    return {
                        ...doc,
                        status: existing?.statut || 'pending',
                        file_url: existing?.url || null,
                        file_name: existing?.file_name || null,
                        request_id: existing?.id || null
                    };
                });
                renderDocuments();
                return;
            }
        }
        documentsList = requiredDocs.map(doc => ({ ...doc, status: 'pending', file_url: null, file_name: null, request_id: null }));
        renderDocuments();
    } catch (err) {
        console.error('❌ Exception loadDocuments :', err);
        showToast('Erreur chargement documents', 'error');
    }
}

// ===== AFFICHAGE DES DOCUMENTS =====
function renderDocuments() {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    documentsList.forEach(doc => {
        const card = document.createElement('div');
        card.className = `document-card ${doc.status}`;

        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[doc.status] || 'En attente';

        card.innerHTML = `
            <div class="document-header">
                <span class="document-name">${doc.name}</span>
                <span class="document-status ${doc.status}">${statusText}</span>
            </div>
            <div class="document-actions">
                ${doc.status !== 'approved' ? `<button class="btn-upload" data-doc-id="${doc.id}">Téléverser</button>` : ''}
                ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" class="btn-view">Voir</a>` : ''}
            </div>
            ${doc.file_name ? `<div class="document-file-name">${doc.file_name}</div>` : ''}
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('.btn-upload').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const docId = e.target.dataset.docId;
            uploadDocument(docId);
        });
    });
}

// ===== UPLOAD D'UN DOCUMENT =====
async function uploadDocument(docId) {
    if (!currentUser || !currentAgent) {
        showToast('Utilisateur non connecté ou profil manquant', 'error');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limite de taille : 5 Mo
        if (file.size > 5 * 1024 * 1024) {
            showToast('Le fichier ne doit pas dépasser 5 Mo', 'warning');
            return;
        }

        showLoader(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}_${docId}_${Date.now()}.${fileExt}`;
            const filePath = `agent_docs/${fileName}`;

            const { error: uploadError } = await supabaseAgentPrive.storage
                .from('agent-documents')
                .upload(filePath, file);

            if (uploadError) {
                showToast('Erreur upload : ' + uploadError.message, 'error');
                return;
            }

            const { data: urlData } = supabaseAgentPrive.storage
                .from('agent-documents')
                .getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl;
            if (!publicUrl) throw new Error('URL publique non générée');

            const doc = documentsList.find(d => d.id === docId);
            if (doc.request_id) {
                const { error: updateError } = await supabaseAgentPrive
                    .from('agent_documents')
                    .update({ url: publicUrl, file_name: file.name, statut: 'pending' })
                    .eq('id', doc.request_id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabaseAgentPrive
                    .from('agent_documents')
                    .insert([{
                        agent_id: currentAgent.id,
                        type_document: docId,
                        url: publicUrl,
                        file_name: file.name,
                        statut: 'pending'
                    }]);
                if (insertError) throw insertError;
            }

            showToast('Document téléversé avec succès ! En attente de validation.', 'success');
            await loadDocuments();
        } catch (err) {
            console.error(err);
            showToast('Erreur : ' + err.message, 'error');
        } finally {
            showLoader(false);
        }
    };
    input.click();
}

// ===== GESTION DE LA MODALE DE SIGNATURE =====
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
        });

        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
}

function closeSignatureModal() {
    document.getElementById('signatureModal').style.display = 'none';
}

window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;

// ===== SOUMISSION DE LA DEMANDE DE LICENCE =====
async function submitLicense(e) {
    e.preventDefault();

    if (!signatureDataURL) {
        showToast('Veuillez signer avant de soumettre.', 'warning');
        return;
    }
    if (!currentUser || !currentAgent) {
        showToast('Données utilisateur manquantes', 'error');
        return;
    }

    showLoader(true);
    try {
        const formData = {
            nom: document.getElementById('nom').value,
            prenom: document.getElementById('prenom').value,
            date_naissance: document.getElementById('dateNaissance').value,
            lieu_naissance: document.getElementById('lieuNaissance').value,
            adresse: document.getElementById('adresse').value,
            nationalite: document.getElementById('nationalite').value,
            pays: document.getElementById('pays').value,
            telephone: document.getElementById('telephone').value,
            email: document.getElementById('email').value,
            fifa_license: document.getElementById('fifaLicense').value || null,
        };

        const signatureBlob = await (await fetch(signatureDataURL)).blob();
        const signatureFileName = `${currentUser.id}_signature_${Date.now()}.png`;
        const signaturePath = `signatures/${signatureFileName}`;

        const { error: uploadError } = await supabaseAgentPrive.storage
            .from('agent-documents')
            .upload(signaturePath, signatureBlob);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseAgentPrive.storage
            .from('agent-documents')
            .getPublicUrl(signaturePath);
        const signatureUrl = urlData.publicUrl;
        if (!signatureUrl) throw new Error('URL de signature non générée');

        const { data, error } = await supabaseAgentPrive
            .from('agent_license_requests')
            .insert([{
                agent_id: currentAgent.id,
                form_data: formData,
                signature_url: signatureUrl,
                status: 'admin_pending',
                created_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;

        showToast('Demande soumise avec succès ! Elle sera traitée sous 0 à 100h.', 'success');
        licenseRequest = data;
        
        signatureDataURL = null;
        document.getElementById('signatureImage').style.display = 'none';
        document.querySelector('.signature-placeholder').style.display = 'block';
        document.getElementById('licenseForm').reset();
        checkLicenseStatus();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la soumission : ' + err.message, 'error');
    } finally {
        showLoader(false);
    }
}

// ===== VÉRIFICATION DU STATUT =====
async function checkLicenseStatus() {
    if (!currentAgent || !currentAgent.id) return;
    try {
        const { data, error } = await supabaseAgentPrive
            .from('agent_license_requests')
            .select('*')
            .eq('agent_id', currentAgent.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Erreur checkLicenseStatus:', error);
            return;
        }

        if (data) {
            licenseRequest = data;
            const statusSection = document.getElementById('statusSection');
            const statusCard = document.getElementById('statusCard');
            if (statusSection) statusSection.style.display = 'block';
            if (statusCard) {
                if (data.status === 'approved' && data.carte_url) {
                    statusCard.innerHTML = `
                        <div class="status-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="status-content">
                            <h3>Demande validée !</h3>
                            <p>Votre licence agent est prête. Cliquez ci-dessous pour télécharger votre carte.</p>
                            <a href="${data.carte_url}" class="btn-download" download>Télécharger ma licence</a>
                        </div>
                    `;
                } else {
                    let message = 'En attente de validation.';
                    if (data.status === 'admin_pending') message = 'En attente de validation par l\'administration.';
                    else if (data.status === 'president_pending') message = 'En attente de validation finale par le président.';
                    statusCard.innerHTML = `
                        <div class="status-icon"><i class="fas fa-clock"></i></div>
                        <div class="status-content">
                            <h3>Demande en cours de traitement</h3>
                            <p>Soumise le ${new Date(data.created_at).toLocaleDateString('fr-FR')}</p>
                            <p>Statut : ${message}</p>
                        </div>
                    `;
                }
            }
        }
    } catch (err) {
        console.error('Erreur checkLicenseStatus:', err);
    }
}

// ===== MISE À JOUR DE L'APERÇU DE LA CARTE =====
function updateCardPreview() {
    const nom = document.getElementById('nom')?.value || '---';
    const prenom = document.getElementById('prenom')?.value || '---';
    const dateNaissance = document.getElementById('dateNaissance')?.value || '---';
    const nationalite = document.getElementById('nationalite')?.value || '---';
    const pays = document.getElementById('pays')?.value || '---';
    const adresse = document.getElementById('adresse')?.value || '---';

    let dateFormatted = dateNaissance;
    if (dateNaissance && dateNaissance !== '---') {
        const d = new Date(dateNaissance);
        dateFormatted = d.toLocaleDateString('fr-FR');
    }

    const preview = document.getElementById('cardPreview');
    if (!preview) return;

    preview.innerHTML = `
        <div class="card-template">
            <div class="card-header">
                <h4>LICENCE AGENT HUBISOCCER</h4>
                <p>Agent FIFA officiel</p>
            </div>
            <div class="card-body">
                <div class="card-photo">
                    <i class="fas fa-user-tie"></i>
                </div>
                <div class="card-info">
                    <p><span class="label">Nom :</span> <span class="value">${nom.toUpperCase()}</span></p>
                    <p><span class="label">Prénom :</span> <span class="value">${prenom}</span></p>
                    <p><span class="label">Né(e) le :</span> <span class="value">${dateFormatted}</span></p>
                    <p><span class="label">Nationalité :</span> <span class="value">${nationalite}</span></p>
                    <p><span class="label">Pays :</span> <span class="value">${pays}</span></p>
                </div>
            </div>
            <div class="card-footer">
                <div class="signatures">
                    <div class="signature-box">
                        <span class="signature-label">Signature agent</span>
                    </div>
                    <div class="signature-box">
                        <span class="stamp"><i class="fas fa-stamp"></i></span>
                        <span class="signature-label">Cachet officiel</span>
                    </div>
                </div>
                <div class="id-number">ID: ${currentAgent?.hub_id || currentAgent?.id || '---'}</div>
            </div>
        </div>
    `;
}

// ===== SAUVEGARDE / RESTAURATION DU FORMULAIRE =====
function saveFormToSession() {
    const inputs = document.querySelectorAll('#licenseForm input, #licenseForm select');
    const formData = {};
    inputs.forEach(inp => {
        formData[inp.id] = inp.value;
    });
    sessionStorage.setItem('agentLicenseFormData', JSON.stringify(formData));
}

function restoreFormFromSession() {
    const savedForm = sessionStorage.getItem('agentLicenseFormData');
    if (savedForm) {
        try {
            const data = JSON.parse(savedForm);
            for (let key in data) {
                const input = document.getElementById(key);
                if (input) input.value = data[key];
            }
        } catch (e) {
            console.warn('Erreur de parsing sessionStorage', e);
        }
    }
}

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

    menuBtn?.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebarFunc);
    overlay?.addEventListener('click', closeSidebarFunc);

    // Swipe avec correction
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
            } else if (diffX < 0 && sidebar.classList.contains('active')) {
                closeSidebarFunc();
            }
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabaseAgentPrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page verification agent');

    const user = await checkSession();
    if (!user) return;

    showLoader(true);
    try {
        await loadAgentProfile();
        if (!currentAgent) {
            showToast('Profil agent introuvable', 'error');
            return;
        }
        await loadDocuments();
        await checkLicenseStatus();

        const form = document.getElementById('licenseForm');
        if (form) {
            form.addEventListener('submit', submitLicense);
        }

        const inputs = document.querySelectorAll('#licenseForm input, #licenseForm select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateCardPreview();
                saveFormToSession();
            });
        });
        
        restoreFormFromSession();
        updateCardPreview();

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
    } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err);
        showToast('Erreur lors du chargement de la page', 'error');
    } finally {
        showLoader(false);
    }
});

// Rendre les fonctions globales pour les attributs onclick
window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;
