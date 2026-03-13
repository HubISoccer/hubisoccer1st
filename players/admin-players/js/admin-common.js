// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;

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

// ===== VÉRIFICATION DE SESSION ADMIN =====
async function checkAdmin() {
    const { data: { session }, error } = await supabaseAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    // Vérifier que l'utilisateur est bien dans admin_users
    const { data: admin, error: adminError } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    // Mettre à jour l'affichage du nom si nécessaire
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) userNameSpan.textContent = session.user.email || 'Admin';
    return true;
}

// ===== DÉCONNEXION =====
async function logout() {
    await supabaseAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
}

// ===== INITIALISATION COMMUNE =====
async function initAdminPage() {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;

    // Attacher les événements de déconnexion
    document.querySelectorAll('.logout-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
}