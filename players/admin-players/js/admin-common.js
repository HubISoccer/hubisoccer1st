// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentUser = null;
let currentProfile = null;

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

// ===== VÉRIFICATION DE SESSION ET RÔLE ADMIN =====
async function checkAdmin() {
    const { data: { session }, error } = await supabaseAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = '../../public/auth/login.html';
        return false;
    }
    currentUser = session.user;

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('player_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (profileError || !profile || !profile.is_admin) {
        // Rediriger vers le dashboard joueur si pas admin
        window.location.href = '../dashboard.html';
        return false;
    }

    currentProfile = profile;
    document.getElementById('userName').textContent = currentProfile.nom_complet || 'Admin';
    document.getElementById('userAvatar').src = currentProfile.avatar_url || '../img/user-default.jpg';
    return true;
}

// ===== DÉCONNEXION =====
async function logout() {
    await supabaseAdmin.auth.signOut();
    window.location.href = '../../public/auth/login.html';
}

// ===== INITIALISATION COMMUNE (à appeler dans chaque page) =====
async function initAdminPage() {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;

    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });

    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
}