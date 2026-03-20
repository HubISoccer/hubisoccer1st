// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseCoachPrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentCoach = null;
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
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            showToast('Erreur chargement profil', 'error');
            return null;
        }
        currentCoach = data;
        document.getElementById('userName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        
        // Remplir le formulaire
        document.getElementById('firstName').value = data.first_name || '';
        document.getElementById('lastName').value = data.last_name || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('phone').value = data.phone || '';
        document.getElementById('bio').value = data.bio || '';
        
        // Pays (à récupérer depuis contact_info si existant, ou on laisse vide)
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
        // Si le coach a un pays stocké (peut-être dans contact_info, on le setterait ici)
        // Pour l'instant, on le laisse vide.
        
        // Confidentialité (à récupérer depuis profiles si présent)
        // Si `profiles` a une colonne privacy, on peut la récupérer. Ici on utilise `coach_profiles` mais elle n'a pas de privacy.
        // On va récupérer depuis `profiles` directement.
        const { data: profileData } = await supabaseCoachPrive
            .from('profiles')
            .select('privacy')
            .eq('id', currentUser.id)
            .single();
        if (profileData && profileData.privacy) {
            privacyLevel = profileData.privacy;
            const privacyRadios = document.querySelectorAll('input[name="privacy"]');
            privacyRadios.forEach(radio => {
                if (radio.value === privacyLevel) radio.checked = true;
            });
        }
        
        return currentCoach;
    } catch (err) {
        console.error('❌ Exception loadCoachProfile:', err);
        showToast('Erreur chargement profil', 'error');
        return null;
    }
}

// ===== SAUVEGARDE DES INFORMATIONS PERSONNELLES =====
async function saveProfile(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const country = document.getElementById('country').value;
    
    if (!firstName || !lastName || !email) {
        showToast('Le prénom, le nom et l\'email sont obligatoires', 'warning');
        return;
    }
    
    showLoader(true);
    try {
        const updates = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone || null,
            bio: bio || null,
            // Pour le pays, on peut le stocker dans contact_info si on utilise profiles
            // Ici on va le stocker dans `coach_profiles` en ajoutant une colonne `country` si nécessaire.
            // Pour l'instant, on ne le gère pas car la table n'a pas de champ country.
        };
        
        const { error } = await supabaseCoachPrive
            .from('coach_profiles')
            .update(updates)
            .eq('id', currentCoach.id);
        
        if (error) throw error;
        
        // Mettre à jour aussi l'email dans auth si nécessaire (c'est fait via profiles)
        // Optionnel : mettre à jour l'email dans auth via updateUser
        if (email !== currentCoach.email) {
            const { error: authError } = await supabaseCoachPrive.auth.updateUser({ email: email });
            if (authError) console.warn('Erreur mise à jour email auth:', authError);
        }
        
        currentCoach = { ...currentCoach, ...updates };
        document.getElementById('userName').textContent = `${firstName} ${lastName}`;
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
    try try {
        // Vér {
        // Vérifier leifier le mot de mot de passe act passe actuel enuel en tentant tentant de se de se reconnecter reconnecter
       
        const { error const { error:: signIn signInError } = await supError } = await supabaseabaseCoachPrCoachPrive.authive.auth.signInWithPassword.signInWithPassword({
           ({
            email: email: currentCoach.email currentCoach.email,
            password,
            password: current: currentPassword
       Password
        });
        if });
        if (sign (signInError)InError) {
            show {
            showToast('Toast('Mot de passe actMot de passe actuel incorrectuel incorrect', '', 'errorerror');
            return');
            return;
       ;
        }
        
        }
        
        const { error const { error } = } = await sup await supabaseCoachabaseCoachPrivePrive.auth.auth.updateUser.updateUser({
            password({
            password: new: newPassword
       Password
        });
        if });
        if (error (error) throw error) throw error;
        
       ;
        
        showToast showToast('Mot de passe('Mot de passe modifié modifié avec succ avec succès', 'successès', 'success');
       ');
        document.getElementById document.getElementById('passwordForm').('passwordForm').resetreset();
    }();
    } catch (err) catch (err) {
        {
        console.error(err console.error(err);
        show);
        showToast('Toast('Erreur lorsErreur lors du changement de mot de passe du changement de mot de passe', 'error', 'error');
    }');
    } finally finally {
        show {
        showLoader(false);
   Loader(false);
    }
 }
}

// ===== SA}

// ===== SAUVEGUVEGARDEARDE DE LA CONFIDENT DE LA CONFIDENTIALITÉ =IALITÉ =========
async
async function savePrivacy function savePrivacy(e)(e) {
    {
    e.preventDefault e.preventDefault();
    
    const();
    
    const selected = selected = document.querySelector document.querySelector('input[name="privacy('input[name="privacy"]:"]:checked');
    ifchecked');
    if (! (!selectedselected) return;
) return;
    
    const    
    const newPrivacy newPrivacy = selected = selected.value.value;
    if;
    if (newPrivacy === (newPrivacy === privacyLevel privacyLevel) {
        show) {
        showToast('Toast('AucAucun changement détectun changement détecté',é', 'info 'info');
        return');
        return;
    }
    
   ;
    }
    
    show showLoader(true);
    try {
       Loader(true);
    try {
        const { error } const { error } = await = await supabaseCoachPr supabaseCoachPriveive
            .
            .from('profilesfrom('profiles')
           ')
            .update .update({ privacy: new({ privacy: newPrivacyPrivacy })
            . })
            .eq('id',eq('id', currentUser currentUser.id);
        if (error.id);
        if () throwerror) throw error error;
        
        privacyLevel;
        
        privacyLevel = newPrivacy;
        showToast('Paramètres = newPrivacy;
        showToast(' de confidentialité enregistrés', 'success');
    } catch (Paramètres de confidentialité enregistrés', 'success');
    } catch (err) {
        console.errorerr) {
        console.error(err);
        showToast('Erreur(err);
        showToast('Erreur lors de l\'enregistrement lors de l\'enregistrement', 'error');
    }', 'error');
    } finally {
        showLoader(false);
    finally {
        showLoader(false);
    }
}

// ===== SUPPR }
}

// ===== SUPPRESSION DU COMPTE =ESSION DU COMPTE =====
async function deleteAccount()====
async function deleteAccount() {
    if (!confirm('⚠️ {
    if (!confirm('⚠️ ATTENTION : Cette action est ir ATTENTION : Cette action est irréversible. Toutes vos données serontréversible. Toutes vos données seront supprimées. Ê supprimées. Êtes-vous absolumenttes-vous absolument sûr ?')) return;
    
    const sûr ?')) return;
    
    const confirmation = prompt confirmation = prompt('Pour confirmer, tapez "('Pour confirmer, tapez "SUPPRIMERSUPPRIMER" :');
    if (conf" :');
    if (confirmation !== 'SUirmation !== 'SUPPRIMERPPRIMER') {
        show') {
        showToast('SuppressionToast('Suppression annul annulée', 'infoée', 'info');
       ');
        return return;
    }
    
    showLoader;
    }
    
    showLoader(true(true);
    try {
       );
    try {
        // Supp // Supprimerrimer d'abord le d'abord le profil coach profil coach (les données associ (les données associées serontées seront supprim supprimées parées par ON ON DELETE C DELETE CASCADE siASCADE si bien bien configuré)
        const configuré)
        const { error { error: coach: coachError } = await supabaseError } = await supabaseCoachPrCoachPriveive
            .from('
            .from('coachcoach_profiles_profiles')
           ')
            .delete .delete()
           ()
            .eq .eq('user_id',('user_id', currentUser currentUser.id);
.id);
        if        if (co (coachError)achError throw coachError) throw coachError;
;
        
        //        
        // Supprimer le Supprimer le compte utilis compte utilisateur via lateur via l'API'API admin admin
        const { error
        const { error } } = = await sup await supabaseCoachabaseCoachPrivePrive.auth.admin.auth.admin.deleteUser.deleteUser(currentUser(currentUser.id);
        if.id);
        if (error (error) throw) throw error;
        
        error;
        
        showToast showToast('V('Votre compteotre compte a été a été supprimé', supprimé', 'success 'success');
       ');
        setTimeout(() => setTimeout(() => {
            window {
            window.location.h.location.href = '../ref =index.html '../index.html';
        },';
        }, 200 20000);
    } catch ();
    } catch (err) {
        console.errorerr) {
        console.error(err(err);
        showToast(');
        showToast('FonFonctionnalctionnalité en cours deité en cours de développement. développement. Contactez Contactez le support le support.', 'info');
    }.', 'info');
    } finally finally {
        show {
        showLoader(falseLoader(false);
   );
    }
}

// = }
}

// ===== G==== GESTIONESTION DES ON DES ONGLETS =====GLETS =====
function
function initTabs() initTabs() {
    {
    const tabs const tabs = document.querySelectorAll = document.querySelectorAll('.tab('.tab-btn-btn');
    const contents =');
    const contents = document.querySelector document.querySelectorAll('.tab-contentAll('.tab-content');
');
    
    tabs    
    tabs.forEach(t.forEach(tab => {
       ab => {
        tab.addEventListener tab.addEventListener('click('click', ()', () => => {
            const targetTab {
            const targetTab = tab = tab.dataset.dataset.tab;
           .tab;
            tabs.forEach tabs.forEach(t =>(t => t.classList.remove t.classList.remove('active('active'));
'));
            tab            tab.classList.add.classList.add('active('active');
           ');
            contents.forEach(content => contents.forEach(content => content.classList content.classList.remove('.remove('active'));
            documentactive'));
            document.getElementById(`${.getElementById(`${targetTab}-targetTab}-tab`).tab`).classListclassList.add('active.add('active');
        });
    });
}

// ===== FON');
        });
    });
}

// ===== FONCTIONSCTIONS UI = UI =====
function initUserMenu====
function initUserMenu()() {
    const userMenu {
    const userMenu = document = document.getElementById('.getElementById('userMenuuserMenu');
    const dropdown');
    const dropdown = document.getElementById(' = document.getElementById('userDropdownuserDropdown');
   ');
    if (!userMenu if (!userMenu || ! || !dropdown) returndropdown) return;
    userMenu.addEventListener;
    userMenu.addEventListener('click('click', (e', (e)) => => {
        e {
        e.stopProp.stopPropagation();
        dropdownagation();
        dropdown.classList.t.classList.toggle('oggle('show');
   show');
    });
    document });
    document.addEventListener('.addEventListener('click',click', () => dropdown.classList () => dropdown.classList.remove('.remove('show'));
show}

function addMenu'));
}

function addMenuHandle()Handle() {
    if ( {
    if (document.getElementByIddocument.getElementById('menu('menuHandle')) returnHandle')) return;
    const;
    const handle = handle = document.createElement('div document.createElement');
   ('div');
    handle.id handle.id = 'menuHandle = '';
   menuHandle';
 handle.class    handle.className =Name = 'menu 'menu-handle-handle';
   ';
    handle.setAttribute(' handle.setAttribute('aria-labelaria-label', '', 'Ouvrir leOuvrir le menu menu');
    handle');
    handle.innerHTML = '<span.innerHTML = '<span></span></span>';
   >';
    document.body.appendChild( document.body.appendChild(handlehandle);
}

function);
}

function initSide initSidebar() {
   bar() {
    const menu const menuBtn =Btn = document.getElementById('menu document.getElementById('menuToggleToggle');
    const sidebar =');
    const sidebar = document.getElementById document.getElementById('leftSidebar('leftSidebar');
   ');
    const close const closeBtn = document.getElementByIdBtn = document.getElementById('close('closeLeftSideLeftSidebarbar');
    const overlay =');
    const overlay = document.getElementById document.getElementById('sidebar('sidebarOverlay');
   Overlay');
    const menu const menuHandle =Handle = document.getElementById('menuHandle document.getElementById('menuHandle');
    
   ');
    
    function open function openSidebar() {
Sidebar() {
        sidebar        sidebar.classList.add.classList.add('active('active');
       ');
        overlay.classList.add(' overlay.classList.add('activeactive');
   ');
    }
    function }
    function closeSide closeSidebarFuncbarFunc() {
        sidebar() {
        sidebar.classList.remove.classList.remove('active');
        overlay.classList('active');
        overlay.classList.remove('.remove('active');
active');
    }
    
       }
    
    if ( if (menuBtn) menuBtn.addEventListenermenuBtn) menuBtn.addEventListener('click('click', openSide', openSidebar);
   bar);
    if ( if (menuHandle)menuHandle menuHandle.addEventListener) menuHandle.addEventListener('click', openSidebar('click', openSidebar);
   );
    if ( if (closeBtn) closecloseBtn) closeBtn.addEventListenerBtn.addEventListener('click('click', closeSidebar', closeSidebarFuncFunc);
    if);
    if (overlay) (overlay) overlay.addEventListener overlay.addEventListener('click', closeSidebarFunc('click', closeSidebarFunc);
    
    let touchStartX);
    
    let touchStartX = 0, touchStartY = = 0, touchStartY = 0, touch 0, touchEndXEndX = 0;
    const swipeThreshold = 0;
    const swipeThreshold = 50;
    document.addEventListener(' = 50;
    document.addEventListener('touchstart', (e) => {
        touchtouchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
       StartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches: true });
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(d[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.ciffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) e.preventDefaultancelable) e.preventDefault();
           ();
            if if (diff (diffX > 0X > 0 && && touch touchStartXStartX <  < 50)50) open openSideSidebarbar();
            else();
            else if (diffX if (diffX <  < 0 &&0 && sidebar.classList.contains sidebar.classList.contains('active'))('active')) closeSide closeSidebarFuncbarFunc();
       ();
        }
    }
    }, { }, { passive: passive: false });
}

function false });
}

function initLog initLogout()out() {
    {
    document.querySelector document.querySelectorAll('#All('#logoutLinklogoutLink, #, #logoutLinkSidebarlogoutLinkSidebar').forEach').forEach(link(link => => {
        link {
        link.addEventListener('.addEventListener('click',click', async ( async (e)e) => {
            e =>.preventDefault {
            e.preventDefault();
            await supabase();
            await supabaseCoachPrive.authCoachPrive.auth.signOut.signOut();
            window.location.href =();
            window.location.href = '../ '../index.htmlindex.html';
       ';
        });
    });
 });
    });
}

// =}

// ===== INIT==== INITIALISATION =IALISATION =========
document.addEventListener
document.addEventListener('DOMContentLoaded('DOMContentLoaded', async', async () => () => {
    console.log {
    console.log('('🚀 Initial🚀 Initialisationisation de la page de la page paramètres paramètres (coach (coach)');
)');
    
    const    
    const user = await check user = await checkSessionSession();
    if();
    if (!user) return (!user) return;
;
    
    await    
    await loadCoachProfile loadCoachProfile();
   ();
    if if (!current (!currentCoach) returnCoach) return;
    
    initTabs();
    
   ;
    
    initTabs();
    
    document.getElementById document.getElementById('profile('profileForm').addEventListenerForm').addEventListener('submit('submit', save', saveProfile);
    documentProfile);
    document.getElementById('.getElementById('passwordFormpasswordForm').add').addEventListener('EventListener('submit',submit', changePassword changePassword);
    document.getElementById);
    document.getElementById('pr('privacyFormivacyForm').addEventListener('').addEventListener('submit', savePrivacy);
    document.getElementByIdsubmit', savePrivacy);
    document.getElementById('delete('deleteAccountBtnAccountBtn').addEventListener('').addEventListener('click', deleteAccountclick', deleteAccount);
    
);
    
    add    addMenuHandleMenuHandle();
   ();
    initUser initUserMenu();
    initMenu();
    initSidebarSidebar();
    init();
    initLogLogoutout();
    
   ();
    
    document.getElementById('lang document.getElementById('langSelectSelect')')?.add?.addEventListener('EventListener('change',change', (e) => (e) => {
        {
        const lang const lang = e.target = e.target.value;
       .value;
        showToast(`Langue chang showToast(`Langue changée enée en ${e.target.options[e.target ${e.target.options[e.target.selectedIndex].text.selectedIndex].text}`, 'info');
    });
    
   }`, 'info');
    });
    
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast(' document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    
    console.log('✅ Initialisation terminée');
});
