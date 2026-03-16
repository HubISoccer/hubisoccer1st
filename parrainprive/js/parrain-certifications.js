// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentParrain = null;
let certificates = [];

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

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseParrainPrive.auth.getSession();
        if (error || !session) {
            window.location.href = 'auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = 'auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL PARRAIN =====
async function loadParrainProfile() {
    try {
        const { data, error } = await supabaseParrainPrive
            .from('parrain_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            return null;
        }
        currentParrain = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentParrain;
    } catch (err) {
        console.error('❌ Exception loadParrainProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DES CERTIFICATS =====
async function loadCertificates() {
    if (!currentParrain) return;
    try {
        const { data, error } = await supabaseParrainPrive
            .from('parrain_certifications')
            .select('*')
            .eq('parrain_id', currentParrain.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        certificates = data || [];
        renderCertificates();
    } catch (err) {
        console.error('Erreur chargement certificats:', err);
        showToast('Erreur lors du chargement des certificats', 'error');
    }
}

// ===== RENDU DES CERTIFICATS =====
function renderCertificates() {
    const container = document.getElementById('certificatesList');
    if (!container) return;

    if (certificates.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun document soumis pour le moment.</p>';
        return;
    }

    container.innerHTML = certificates.map(cert => {
        const statusText = {
            approved: 'Validé',
            pending: 'En attente',
            rejected: 'Rejeté'
        }[cert.statut] || 'En attente';

        // Formatage de la date (optionnel)
        let dateStr = '';
        if (cert.date_obtention) {
            const d = new Date(cert.date_obtention);
            dateStr = d.toLocaleDateString('fr-FR');
        }

        return `
            <div class="cert-card ${cert.statut}">
                <div class="cert-icon"><i class="fas fa-certificate"></i></div>
                <div class="cert-info">
                    <h4>${cert.titre}</h4>
                    <p>${cert.organisme ? cert.organisme + ' - ' : ''}${dateStr}</p>
                </div>
                <span class="cert-status ${cert.statut}">${statusText}</span>
            </div>
        `;
    }).join('');
}

// ===== UPLOAD DE FICHIER =====
async function uploadFile(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentParrain.id}_${Date.now()}.${fileExt}`;
    const filePath = `certifications/${fileName}`;

    const { error } = await supabaseParrainPrive.storage
        .from('parrain-documents')
        .upload(filePath, file);
    if (error) throw error;

    const { data: urlData } = supabaseParrainPrive.storage
        .from('parrain-documents')
        .getPublicUrl(filePath);
    return urlData.publicUrl;
}

// ===== GESTION DU FORMULAIRE D'AJOUT =====
function initUploadForm() {
    const dropArea = document.getElementById('fileDropArea');
    const fileInput = document.getElementById('certFile');
    const fileLabel = document.getElementById('fileLabel');

    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        fileLabel.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'Cliquez ou glissez votre document ici';
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
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            fileLabel.textContent = e.dataTransfer.files[0].name;
        }
    });

    document.getElementById('certForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const titre = document.getElementById('certTitle').value.trim();
        const organisme = document.getElementById('certOrganisme').value.trim();
        const dateObtention = document.getElementById('certDate').value; // au format YYYY-MM-DD
        const file = fileInput.files[0];

        if (!titre || !dateObtention || !file) {
            showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
            return;
        }

        // Désactiver le bouton pour éviter double soumission
        const submitBtn = document.getElementById('submitCertBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="button-spinner"></span> Envoi...';

        try {
            // Upload du fichier
            const fileUrl = await uploadFile(file);

            // Insertion dans la base
            const { error } = await supabaseParrainPrive
                .from('parrain_certifications')
                .insert([{
                    parrain_id: currentParrain.id,
                    titre: titre,
                    organisme: organisme || null,
                    date_obtention: dateObtention,
                    fichier_url: fileUrl,
                    statut: 'pending'
                }]);

            if (error) throw error;

            showToast('Document soumis avec succès ! En attente de validation.', 'success');
            document.getElementById('certForm').reset();
            fileLabel.textContent = 'Cliquez ou glissez votre document ici';
            await loadCertificates();
        } catch (err) {
            console.error(err);
            showToast('Erreur : ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Soumettre pour vérification';
        }
    });
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
    console.log('🚀 Initialisation de la page certifications (parrain)');

    const user = await checkSession();
    if (!user) return;

    await loadParrainProfile();
    if (!currentParrain) return;

    await loadCertificates();

    initUploadForm();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });

    console.log('✅ Initialisation terminée');
});