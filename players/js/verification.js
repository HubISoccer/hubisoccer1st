const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let playerProfile = null;
let playerCV = null;
let documentsList = [];
let licenseRequest = null;
let signaturePadModal = null;
let signatureLocked = false;
let signatureDataURL = null;

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

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

async function checkSession() {
    showLoader();
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error(err);
        window.location.href = '../auth/login.html';
        return null;
    } finally {
        hideLoader();
    }
}

async function loadPlayerProfile() {
    if (!currentUser?.id) return;
    showLoader();
    try {
        const { data: profile, error: profileError } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, email, phone, date_of_birth, country, avatar_url')
            .eq('id', currentUser.id)
            .single();
        if (profileError) throw profileError;
        playerProfile = profile;

        const { data: cv, error: cvError } = await supabasePlayersSpacePrive
            .from('player_cv')
            .select('data')
            .eq('player_id', currentUser.id)
            .maybeSingle();
        if (cvError) console.error(cvError);
        playerCV = cv?.data || {};

        document.getElementById('userName').textContent = playerProfile.full_name || 'Joueur';
        updateAvatarDisplay();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement profil', 'error');
    } finally {
        hideLoader();
    }
}

function updateAvatarDisplay() {
    const userAvatar = document.getElementById('userAvatar');
    const userInitials = document.getElementById('userAvatarInitials');
    if (playerProfile?.avatar_url) {
        userAvatar.src = playerProfile.avatar_url;
        userAvatar.style.display = 'block';
        if (userInitials) userInitials.style.display = 'none';
    } else {
        const initials = (playerProfile?.full_name || 'J').charAt(0).toUpperCase();
        if (userInitials) {
            userInitials.textContent = initials;
            userInitials.style.display = 'flex';
        }
        userAvatar.style.display = 'none';
    }
}

async function loadDocuments() {
    const requiredDocs = [
        { id: 'id_card', name: "Pièce d'identité (CNI/Passeport)", type: 'identity' },
        { id: 'photo', name: "Photo d'identité", type: 'photo' },
        { id: 'certificat_medical', name: 'Certificat médical', type: 'medical' },
        { id: 'diplome', name: 'Diplôme (si étudiant)', type: 'diploma' },
        { id: 'justificatif_domicile', name: 'Justificatif de domicile', type: 'address' }
    ];
    if (playerProfile?.id) {
        const { data: existingDocs, error } = await supabasePlayersSpacePrive
            .from('document_requests')
            .select('*')
            .eq('player_id', playerProfile.id);
        if (!error && existingDocs) {
            documentsList = requiredDocs.map(doc => {
                const existing = existingDocs.find(d => d.document_type === doc.id);
                return { ...doc, status: existing?.status || 'pending', file_url: existing?.file_url || null, file_name: existing?.file_name || null, request_id: existing?.id || null };
            });
            renderDocuments();
            return;
        }
    }
    documentsList = requiredDocs.map(doc => ({ ...doc, status: 'pending', file_url: null, file_name: null, request_id: null }));
    renderDocuments();
}

function renderDocuments() {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    documentsList.forEach(doc => {
        const card = document.createElement('div');
        card.className = `document-card ${doc.status}`;
        const statusText = { pending: 'En attente', approved: 'Validé', rejected: 'Rejeté' }[doc.status] || 'En attente';
        card.innerHTML = `
            <div class="document-header">
                <span class="document-name">${doc.name}</span>
                <span class="document-status ${doc.status}">${statusText}</span>
            </div>
            <div class="document-actions">
                ${doc.status !== 'approved' ? `<button class="btn-upload" data-doc-id="${doc.id}" data-doc-type="${doc.id}">Téléverser</button>` : ''}
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

async function uploadDocument(docId) {
    if (!currentUser || !playerProfile) {
        showToast('Utilisateur non connecté', 'error');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showLoader();
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}_${docId}_${Date.now()}.${fileExt}`;
            const filePath = `player_docs/${fileName}`;
            const { error: uploadError } = await supabasePlayersSpacePrive.storage
                .from('documents')
                .upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabasePlayersSpacePrive.storage
                .from('documents')
                .getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl;

            const doc = documentsList.find(d => d.id === docId);
            if (doc.request_id) {
                await supabasePlayersSpacePrive
                    .from('document_requests')
                    .update({ file_url: publicUrl, file_name: file.name, status: 'pending' })
                    .eq('id', doc.request_id);
            } else {
                await supabasePlayersSpacePrive
                    .from('document_requests')
                    .insert([{ player_id: playerProfile.id, document_type: docId, file_url: publicUrl, file_name: file.name, status: 'pending' }]);
            }
            showToast('Document téléversé, en attente de validation.', 'success');
            await loadDocuments();
        } catch (err) {
            showToast('Erreur upload : ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    };
    input.click();
}

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
        if (signatureDataURL) signaturePadModal.fromDataURL(signatureDataURL);

        const colorPicker = document.getElementById('penColorPicker');
        const widthSlider = document.getElementById('penWidth');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                if (!signatureLocked) signaturePadModal.penColor = e.target.value;
            });
        }
        if (widthSlider) {
            widthSlider.addEventListener('input', (e) => {
                if (!signatureLocked) {
                    const val = parseFloat(e.target.value);
                    signaturePadModal.minWidth = val * 0.5;
                    signaturePadModal.maxWidth = val;
                }
            });
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
            if (signatureLocked) signaturePadModal.off();
            else signaturePadModal.on();
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

function populateFormFromProfile() {
    if (!playerProfile) return;
    const nameParts = (playerProfile.full_name || '').split(' ');
    const prenom = nameParts[0] || '';
    const nom = nameParts.slice(1).join(' ') || '';
    document.getElementById('nom').value = nom;
    document.getElementById('prenom').value = prenom;
    document.getElementById('dateNaissance').value = playerProfile.date_of_birth || '';
    document.getElementById('nationalite').value = playerProfile.country || '';
    document.getElementById('telephone').value = playerProfile.phone || '';
    if (playerCV) {
        document.getElementById('taille').value = playerCV.taille || '';
        document.getElementById('poids').value = playerCV.poids || '';
        document.getElementById('piedFort').value = playerCV.piedFort || '';
        document.getElementById('club').value = playerCV.club || '';
    }
}

function validateLicenseForm() {
    const required = ['nom', 'prenom', 'dateNaissance', 'lieuNaissance', 'adresse', 'nationalite', 'pays', 'langue', 'telephone'];
    for (let id of required) {
        const field = document.getElementById(id);
        if (!field.value.trim()) {
            showToast(`Veuillez remplir le champ ${field.previousElementSibling.innerText}`, 'warning');
            field.focus();
            return false;
        }
    }
    if (!signatureDataURL) {
        showToast('Veuillez signer avant de soumettre.', 'warning');
        return false;
    }
    return true;
}

async function submitLicense(e) {
    e.preventDefault();
    if (!validateLicenseForm()) return;
    if (!currentUser || !playerProfile) {
        showToast('Données utilisateur manquantes', 'error');
        return;
    }
    showLoader();
    try {
        const formData = {
            nom: document.getElementById('nom').value,
            prenom: document.getElementById('prenom').value,
            date_naissance: document.getElementById('dateNaissance').value,
            lieu_naissance: document.getElementById('lieuNaissance').value,
            adresse: document.getElementById('adresse').value,
            nationalite: document.getElementById('nationalite').value,
            pays: document.getElementById('pays').value,
            langue: document.getElementById('langue').value,
            telephone: document.getElementById('telephone').value,
            taille: document.getElementById('taille').value || null,
            poids: document.getElementById('poids').value || null,
            pied_fort: document.getElementById('piedFort').value || null,
            club: document.getElementById('club').value || null
        };
        const signatureBlob = await (await fetch(signatureDataURL)).blob();
        const signatureFileName = `${currentUser.id}_signature_${Date.now()}.png`;
        const signaturePath = `signatures/${signatureFileName}`;
        const { error: uploadError } = await supabasePlayersSpacePrive.storage
            .from('documents')
            .upload(signaturePath, signatureBlob);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabasePlayersSpacePrive.storage
            .from('documents')
            .getPublicUrl(signaturePath);
        const signatureUrl = urlData.publicUrl;

        const { error } = await supabasePlayersSpacePrive
            .from('license_requests')
            .insert([{
                player_id: playerProfile.id,
                ...formData,
                signature_url: signatureUrl,
                status: 'admin_pending',
                created_at: new Date()
            }]);
        if (error) throw error;

        showToast('Demande soumise avec succès !', 'success');
        sessionStorage.removeItem('licenseFormData');
        signatureDataURL = null;
        document.getElementById('signatureImage').style.display = 'none';
        document.querySelector('.signature-placeholder').style.display = 'block';
        document.getElementById('licenseForm').reset();
        populateFormFromProfile();
        await checkLicenseStatus();
    } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

async function checkLicenseStatus() {
    if (!playerProfile || !playerProfile.id) return;
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('license_requests')
            .select('*')
            .eq('player_id', playerProfile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        const statusSection = document.getElementById('statusSection');
        const statusCard = document.getElementById('statusCard');
        if (data) {
            licenseRequest = data;
            if (statusSection) statusSection.style.display = 'block';
            if (statusCard) {
                if (data.status === 'approved' && data.carte_url) {
                    statusCard.innerHTML = `
                        <div class="status-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="status-content">
                            <h3>Demande validée !</h3>
                            <p>Votre licence est prête. Cliquez ci-dessous pour télécharger votre carte.</p>
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
        } else {
            if (statusSection) statusSection.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
    }
}

function updateCardPreview() {
    const nom = document.getElementById('nom')?.value || '---';
    const prenom = document.getElementById('prenom')?.value || '---';
    const dateNaissance = document.getElementById('dateNaissance')?.value || '---';
    const nationalite = document.getElementById('nationalite')?.value || '---';
    const taille = document.getElementById('taille')?.value || '---';
    const pied = document.getElementById('piedFort')?.value || '---';
    const club = document.getElementById('club')?.value || 'Libre';
    const adresse = document.getElementById('adresse')?.value || '---';
    const pays = document.getElementById('pays')?.value || '---';
    let dateFormatted = dateNaissance;
    if (dateNaissance && dateNaissance !== '---') {
        const d = new Date(dateNaissance);
        dateFormatted = d.toLocaleDateString('fr-FR');
    }

    const frontInfo = document.getElementById('cardFrontInfo');
    if (frontInfo) {
        frontInfo.innerHTML = `
            <p><span class="label">Nom :</span> <span class="value">${nom.toUpperCase()}</span></p>
            <p><span class="label">Prénom :</span> <span class="value">${prenom}</span></p>
            <p><span class="label">Né(e) le :</span> <span class="value">${dateFormatted}</span></p>
            <p><span class="label">Nationalité :</span> <span class="value">${nationalite}</span></p>
            <p><span class="label">Taille :</span> <span class="value">${taille} cm</span></p>
            <p><span class="label">Pied :</span> <span class="value">${pied}</span></p>
        `;
    }
    const frontFooter = document.getElementById('cardFrontFooter');
    if (frontFooter) {
        frontFooter.innerHTML = `
            <div class="signatures">
                <div class="signature-box"><span class="signature-label">Signature joueur</span></div>
                <div class="signature-box"><span class="stamp"><i class="fas fa-stamp"></i></span><span class="signature-label">Cachet officiel</span></div>
            </div>
            <div class="id-number">ID: ${playerProfile?.hubisoccer_id || '---'}</div>
        `;
    }

    const backInfo = document.getElementById('cardBackInfo');
    if (backInfo) {
        backInfo.innerHTML = `
            <p><span class="label">Adresse :</span> <span class="value">${adresse}</span></p>
            <p><span class="label">Pays :</span> <span class="value">${pays}</span></p>
            <p><span class="label">Club :</span> <span class="value">${club}</span></p>
            <p><span class="label">N° licence :</span> <span class="value">${licenseRequest?.id || '---'}</span></p>
            <p><span class="label">Délivrance :</span> <span class="value">${licenseRequest ? new Date(licenseRequest.created_at).toLocaleDateString('fr-FR') : '---'}</span></p>
        `;
    }
}

function initCardFlip() {
    const container = document.querySelector('.card-flip-container');
    const btn = document.getElementById('flipCardBtn');
    if (container && btn) {
        btn.addEventListener('click', () => container.classList.toggle('flipped'));
    }
}

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

    let touchStartX = 0, touchStartY = 0;
    const swipeThreshold = 50;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0) closeSidebarFunc();
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
            supabasePlayersSpacePrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

function saveFormToSession() {
    const inputs = document.querySelectorAll('#licenseForm input, #licenseForm select');
    const formData = {};
    inputs.forEach(inp => { formData[inp.id] = inp.value; });
    sessionStorage.setItem('licenseFormData', JSON.stringify(formData));
}

function restoreFormFromSession() {
    const savedForm = sessionStorage.getItem('licenseFormData');
    if (savedForm) {
        try {
            const data = JSON.parse(savedForm);
            for (let key in data) {
                const input = document.getElementById(key);
                if (input) input.value = data[key];
            }
        } catch (e) { console.warn(e); }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;
    await loadPlayerProfile();
    if (!playerProfile) {
        showToast('Profil non trouvé.', 'error');
        return;
    }
    await loadDocuments();
    await checkLicenseStatus();
    const form = document.getElementById('licenseForm');
    if (form) form.addEventListener('submit', submitLicense);
    populateFormFromProfile();
    const inputs = document.querySelectorAll('#licenseForm input, #licenseForm select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            updateCardPreview();
            saveFormToSession();
        });
    });
    restoreFormFromSession();
    updateCardPreview();
    initCardFlip();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();
    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
});
