// ===== CONFIGURATION SUPABASE (même que dashboard.js) =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let playerProfile = null;
let documentsList = []; // Liste des documents demandés (depuis une table "required_documents" ou configuration)
let licenseRequest = null; // Demande de licence existante

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = '../public/auth/login.html';
        return null;
    }
    currentUser = session.user;
    return currentUser;
}

// ===== CHARGEMENT DU PROFIL =====
async function loadPlayerProfile() {
    const { data, error } = await supabaseClient
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement profil:', error);
        return;
    }
    playerProfile = data || { full_name: 'Joueur' };
    // Mettre à jour le nom dans la navbar
    document.getElementById('userName').textContent = playerProfile.full_name || 'Joueur';
}

// ===== CHARGEMENT DES DOCUMENTS =====
async function loadDocuments() {
    // Pour l'exemple, on définit une liste de documents requis
    // Dans la vraie vie, vous auriez une table "required_documents" ou une configuration admin
    const requiredDocs = [
        { id: 'id_card', name: 'Pièce d\'identité (CNI/Passeport)', type: 'identity' },
        { id: 'photo', name: 'Photo d\'identité', type: 'photo' },
        { id: 'certificat_medical', name: 'Certificat médical', type: 'medical' },
        { id: 'diplome', name: 'Diplôme (si étudiant)', type: 'diploma' },
        { id: 'justificatif_domicile', name: 'Justificatif de domicile', type: 'address' }
    ];

    // Récupérer les soumissions existantes pour ce joueur
    const { data: existingDocs, error } = await supabaseClient
        .from('document_requests')
        .select('*')
        .eq('player_id', playerProfile.id);

    if (error) {
        console.error('Erreur chargement documents:', error);
        return;
    }

    // Construire la liste avec statut
    documentsList = requiredDocs.map(doc => {
        const existing = existingDocs?.find(d => d.document_type === doc.id);
        return {
            ...doc,
            status: existing?.status || 'pending',
            file_url: existing?.file_url || null,
            file_name: existing?.file_name || null,
            request_id: existing?.id || null
        };
    });

    renderDocuments();
}

// ===== AFFICHAGE DES DOCUMENTS =====
function renderDocuments() {
    const grid = document.getElementById('documentsGrid');
    grid.innerHTML = '';

    documentsList.forEach(doc => {
        const card = document.createElement('div');
        card.className = `document-card ${doc.status}`;

        const statusText = {
            pending: 'En attente',
            approved: 'Validé',
            rejected: 'Rejeté'
        }[doc.status];

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

    // Ajouter les écouteurs sur les boutons d'upload
    document.querySelectorAll('.btn-upload').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const docId = e.target.dataset.docId;
            uploadDocument(docId);
        });
    });
}

// ===== UPLOAD D'UN DOCUMENT =====
async function uploadDocument(docId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Upload vers Supabase Storage (bucket 'documents')
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}_${docId}_${Date.now()}.${fileExt}`;
        const filePath = `player_docs/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) {
            alert('Erreur upload : ' + uploadError.message);
            return;
        }

        const { data: urlData } = supabaseClient.storage
            .from('documents')
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Enregistrer dans la table document_requests
        const doc = documentsList.find(d => d.id === docId);
        if (doc.request_id) {
            // Mettre à jour l'existant
            const { error: updateError } = await supabaseClient
                .from('document_requests')
                .update({ file_url: publicUrl, file_name: file.name, status: 'pending' })
                .eq('id', doc.request_id);

            if (updateError) {
                alert('Erreur mise à jour : ' + updateError.message);
                return;
            }
        } else {
            // Créer une nouvelle entrée
            const { error: insertError } = await supabaseClient
                .from('document_requests')
                .insert([{
                    player_id: playerProfile.id,
                    document_type: docId,
                    file_url: publicUrl,
                    file_name: file.name,
                    status: 'pending'
                }]);

            if (insertError) {
                alert('Erreur enregistrement : ' + insertError.message);
                return;
            }
        }

        alert('Document téléversé avec succès ! En attente de validation.');
        loadDocuments(); // Recharger la liste
    };
    input.click();
}

// ===== GESTION DE LA SIGNATURE =====
let signaturePad;
function initSignature() {
    const canvas = document.getElementById('signatureCanvas');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'white',
        penColor: 'var(--primary)'
    });

    document.getElementById('clearSignature').addEventListener('click', () => {
        signaturePad.clear();
    });
}

// ===== SOUMISSION DE LA DEMANDE DE LICENCE =====
document.getElementById('licenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (signaturePad.isEmpty()) {
        alert('Veuillez signer avant de soumettre.');
        return;
    }

    // Récupérer les données du formulaire
    const formData = {
        nom: document.getElementById('nom').value,
        prenom: document.getElementById('prenom').value,
        date_naissance: document.getElementById('dateNaissance').value,
        lieu_naissance: document.getElementById('lieuNaissance').value,
        adresse: document.getElementById('adresse').value,
        nationalite: document.getElementById('nationalite').value,
        langue: document.getElementById('langue').value,
        telephone: document.getElementById('telephone').value,
        taille: document.getElementById('taille').value || null,
        poids: document.getElementById('poids').value || null,
        pied_fort: document.getElementById('piedFort').value || null,
        club: document.getElementById('club').value || null,
    };

    // Convertir la signature en image
    const signatureDataURL = signaturePad.toDataURL('image/png');

    // Upload de la signature vers Storage
    const signatureFileName = `${currentUser.id}_signature_${Date.now()}.png`;
    const signaturePath = `signatures/${signatureFileName}`;
    const signatureBlob = await (await fetch(signatureDataURL)).blob();

    const { error: uploadError } = await supabaseClient.storage
        .from('documents')
        .upload(signaturePath, signatureBlob);

    if (uploadError) {
        alert('Erreur upload signature : ' + uploadError.message);
        return;
    }

    const { data: urlData } = supabaseClient.storage
        .from('documents')
        .getPublicUrl(signaturePath);
    const signatureUrl = urlData.publicUrl;

    // Enregistrer la demande de licence
    const { data, error } = await supabaseClient
        .from('license_requests')
        .insert([{
            player_id: playerProfile.id,
            ...formData,
            signature_url: signatureUrl,
            admin_validated: false,
            created_at: new Date()
        }])
        .select()
        .single();

    if (error) {
        alert('Erreur lors de la soumission : ' + error.message);
    } else {
        alert('Demande soumise avec succès ! Elle sera traitée sous 0 à 100h.');
        licenseRequest = data;
        document.getElementById('licenseForm').reset();
        signaturePad.clear();
        checkLicenseStatus();
    }
});

// ===== VÉRIFICATION DU STATUT DE LA DEMANDE =====
async function checkLicenseStatus() {
    const { data, error } = await supabaseClient
        .from('license_requests')
        .select('*')
        .eq('player_id', playerProfile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement statut licence:', error);
        return;
    }

    if (data) {
        licenseRequest = data;
        document.getElementById('statusSection').style.display = 'block';
        const statusCard = document.getElementById('statusCard');
        if (data.admin_validated && data.carte_url) {
            statusCard.innerHTML = `
                <div class="status-icon"><i class="fas fa-check-circle"></i></div>
                <div class="status-content">
                    <h3>Demande validée !</h3>
                    <p>Votre licence est prête. Cliquez ci-dessous pour télécharger votre carte.</p>
                    <a href="${data.carte_url}" class="btn-download" download>Télécharger ma licence</a>
                </div>
            `;
        } else {
            statusCard.innerHTML = `
                <div class="status-icon"><i class="fas fa-clock"></i></div>
                <div class="status-content">
                    <h3>Demande en cours de traitement</h3>
                    <p>Soumise le ${new Date(data.created_at).toLocaleDateString('fr-FR')}</p>
                    <p>Statut : En attente de validation par l'administration.</p>
                </div>
            `;
        }
    }
}

// ===== MISE À JOUR DE L'APERÇU DE LA CARTE EN TEMPS RÉEL =====
function updateCardPreview() {
    const nom = document.getElementById('nom').value || '---';
    const prenom = document.getElementById('prenom').value || '---';
    const dateNaissance = document.getElementById('dateNaissance').value || '---';
    const nationalite = document.getElementById('nationalite').value || '---';
    const taille = document.getElementById('taille').value || '---';
    const pied = document.getElementById('piedFort').value || '---';
    const club = document.getElementById('club').value || 'Libre';

    // Formatage de la date
    let dateFormatted = dateNaissance;
    if (dateNaissance && dateNaissance !== '---') {
        const d = new Date(dateNaissance);
        dateFormatted = d.toLocaleDateString('fr-FR');
    }

    const preview = document.getElementById('cardPreview');
    preview.innerHTML = `
        <div class="card-template">
            <div class="card-header">
                <h4>LICENCE HUBISOCCER</h4>
                <p>Joueur</p>
            </div>
            <div class="card-body">
                <div class="card-photo">
                    <i class="fas fa-user"></i>
                </div>
                <div class="card-info">
                    <p><span class="label">Nom :</span> <span class="value">${nom.toUpperCase()}</span></p>
                    <p><span class="label">Prénom :</span> <span class="value">${prenom}</span></p>
                    <p><span class="label">Né(e) le :</span> <span class="value">${dateFormatted}</span></p>
                    <p><span class="label">Nationalité :</span> <span class="value">${nationalite}</span></p>
                    <p><span class="label">Taille :</span> <span class="value">${taille} cm</span></p>
                    <p><span class="label">Pied :</span> <span class="value">${pied}</span></p>
                    <p><span class="label">Club :</span> <span class="value">${club}</span></p>
                </div>
            </div>
            <div class="card-footer">
                <div class="signatures">
                    <div class="signature-box">
                        <img src="" alt="Signature joueur" style="display:none;">
                        <span class="signature-label">Signature joueur</span>
                    </div>
                    <div class="signature-box">
                        <span class="stamp"><i class="fas fa-stamp"></i></span>
                        <span class="signature-label">Cachet officiel</span>
                    </div>
                </div>
                <div class="id-number">ID: ${playerProfile?.hub_id || '---'}</div>
            </div>
        </div>
    `;
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkSession();
    if (!user) return;

    await loadPlayerProfile();
    await loadDocuments();
    await checkLicenseStatus();

    // Initialiser la signature
    initSignature();

    // Mettre à jour l'aperçu en temps réel
    const inputs = document.querySelectorAll('#licenseForm input, #licenseForm select');
    inputs.forEach(input => {
        input.addEventListener('input', updateCardPreview);
    });
    updateCardPreview();

    // Gestion du menu utilisateur (identique au dashboard)
    // ... (vous pouvez copier les fonctions initUserMenu, initSidebar, logout depuis dashboard.js)
    // Pour gagner du temps, je les inclus rapidement :

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

        function openSidebar() { sidebar.classList.add('active'); overlay.classList.add('active'); }
        function closeSidebarFunc() { sidebar.classList.remove('active'); overlay.classList.remove('active'); }

        if (menuBtn) menuBtn.addEventListener('click', openSidebar);
        if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
        if (overlay) overlay.addEventListener('click', closeSidebarFunc);
    }

    function initLogout() {
        document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                supabaseClient.auth.signOut().then(() => {
                    window.location.href = '../index.html';
                });
            });
        });
    }

    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Changement de langue bientôt disponible');
    });

    // Exposer les fonctions globales si nécessaire
});