// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAgentPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentAgent = null;
let privacyLevel = 'public';

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

// ===== LOADER =====
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
        currentAgent = data;
        document.getElementById('userName').textContent = data.full_name || 'Agent';
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        
        // Remplir le formulaire
        document.getElementById('fullName').value = data.full_name || '';
        document.getElementById('email').value = data.email || '';
        const contact = data.contact_info || {};
        document.getElementById('phone').value = contact.phone || '';
        document.getElementById('bio').value = data.bio || '';
        
        // Pays
        const countrySelect = document.getElementById('country');
        if (countrySelect.options.length <= 1) {
            const countries = [
                "Bénin", "Burkina Faso", "Burundi", "Cameroun", "Cap-Vert", "République centrafricaine", "Comores", "Congo",
                "République démocratique du Congo", "Côte d'Ivoire", "Djibouti", "Égypte", "Érythrée", "Eswatini", "Éthiopie",
                "Gabon", "Gambie", "Ghana", "Guinée", "Guinée-Bissau", "Guinée équatoriale", "Kenya", "Lesotho", "Liberia",
                "Libye", "Madagascar", "Malawi", "Mali", "Maroc", "Maurice", "Mauritanie", "Mozambique", "Namibie", "Niger",
                "Nigeria", "Ouganda", "Rwanda", "Sahara occidental", "Sao Tomé-et-Principe", "Sénégal", "Seychelles",
                "Sierra Leone", "Somalie", "Soudan", "Soudan du Sud", "Tanzanie", "Tchad", "Togo", "Tunisie", "Zambie", "Zimbabwe"
            ].sort();
            countries.forEach(c => {
                const option = document.createElement('option');
                option.value = c;
                option.textContent = c;
                countrySelect.appendChild(option);
            });
        }
        if (contact.country) {
            countrySelect.value = contact.country;
        }
        
        // Confidentialité
        privacyLevel = data.privacy || 'public';
        const privacyRadios = document.querySelectorAll('input[name="privacy"]');
        privacyRadios.forEach(radio => {
            if (radio.value === privacyLevel) radio.checked = true;
        });
        
        return currentAgent;
    } catch (err) {
        console.error('❌ Exception loadAgentProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== SAUVEGARDE DES INFORMATIONS PERSONNELLES =====
async function saveProfile(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = document.getElementById('country').value;
    const bio = document.getElementById('bio').value.trim();
    
    if (!fullName || !email) {
        showToast('Le nom et l\'email sont obligatoires', 'warning');
        return;
    }
    
    showLoader(true);
    try {
        const updates = {
            full_name: fullName,
            email: email,
            bio: bio || null,
            contact_info: {
                ...(currentAgent.contact_info || {}),
                phone: phone || null,
                country: country || null
            }
        };
        
        const { error } = await supabaseAgentPrive
            .from('profiles')
            .update(updates)
            .eq('id', currentAgent.id);
        
        if (error) throw error;
        
        currentAgent = { ...currentAgent, ...updates };
        document.getElementById('userName').textContent = fullName;
        showToast('Profil mis à jour avec succès', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== CHANGEMENT DE MOT DE PASSE =====
async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast('Les nouveaux mots de passe ne correspondent pas', 'warning');
        return;
    }
    if (newPassword.length < 6) {
        showToast('Le mot de passe doit contenir au moins 6 caractères', 'warning');
        return;
    }
    
    showLoader(true);
    try {
        // Vérifier le mot de passe actuel en tentant de se reconnecter
        const { error: signInError } = await supabaseAgentPrive.auth.signInWithPassword({
            email: currentAgent.email,
            password: currentPassword
        });
        if (signInError) {
            showToast('Mot de passe actuel incorrect', 'error');
            return;
        }
        
        const { error } = await supabaseAgentPrive.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        
        showToast('Mot de passe modifié avec succès', 'success');
        document.getElementById('passwordForm').reset();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors du changement de mot de passe', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== SAUVEGARDE DE LA CONFIDENTIALITÉ =====
async function savePrivacy(e) {
    e.preventDefault();
    
    const selected = document.querySelector('input[name="privacy"]:checked');
    if (!selected) return;
    
    const newPrivacy = selected.value;
    if (newPrivacy === privacyLevel) {
        showToast('Aucun changement détecté', 'info');
        return;
    }
    
    showLoader(true);
    try {
        const { error } = await supabaseAgentPrive
            .from('profiles')
            .update({ privacy: newPrivacy })
            .eq('id', currentAgent.id);
        if (error) throw error;
        
        privacyLevel = newPrivacy;
        showToast('Paramètres de confidentialité enregistrés', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== SUPPRESSION DU COMPTE =====
async function deleteAccount() {
    if (!confirm('⚠️ ATTENTION : Cette action est irréversible. Toutes vos données seront supprimées. Êtes-vous absolument sûr ?')) return;
    
    const confirmation = prompt('Pour confirmer, tapez "SUPPRIMER" :');
    if (confirmation !== 'SUPPRIMER') {
        showToast('Suppression annulée', 'info');
        return;
    }
    
    showLoader(true);
    try {
        // Supprimer d'abord les données associées (clients, contrats, etc.)
        // Les relations ON DELETE CASCADE géreront les dépendances si bien configurées
        // Supprimer le compte via l'API admin (nécessite une fonction edge ou un appel avec rôle admin)
        // Ici, on utilise la méthode standard de Supabase Auth (l'utilisateur doit être connecté)
        const { error } = await supabaseAgentPrive.auth.admin.deleteUser(currentUser.id);
        if (error) throw error;
        
        showToast('Votre compte a été supprimé', 'success');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
    } catch (err) {
        console.error(err);
        // Fallback : demander une suppression via formulaire (à implémenter côté serveur)
        showToast('Fonctionnalité en cours de développement. Contactez le support.', 'info');
    } finally {
        showLoader(false);
    }
}

// ===== GESTION DES ONGLETS =====
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
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
    console.log('🚀 Initialisation de la page paramètres (agent)');
    
    const user = await checkSession();
    if (!user) return;
    
    await loadAgentProfile();
    if (!currentAgent) return;
    
    initTabs();
    
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('passwordForm').addEventListener('submit', changePassword);
    document.getElementById('privacyForm').addEventListener('submit', savePrivacy);
    document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);
    
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
