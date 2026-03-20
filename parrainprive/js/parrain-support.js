// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainsSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ===== LOADER GLOBAL =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseParrainsSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }
        currentUser = session.user;
        console.log('✅ Utilisateur connecté :', currentUser.email);
        return currentUser;
    } catch (err) {
        console.error('❌ Erreur checkSession :', err);
        window.location.href = '../public/auth/login.html';
        return null;
    }
}

// ===== CHARGEMENT DU PROFIL =====
async function loadProfile() {
    try {
        const { data, error } = await supabaseParrainsSpacePrive
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Erreur chargement profil:', error);
            return null;
        }
        currentProfile = data;
        document.getElementById('userName').textContent = data.full_name || 'Parrain';
        document.getElementById('userAvatar').src = data.avatar_url || 'img/user-default.jpg';
        return currentProfile;
    } catch (err) {
        console.error('❌ Exception loadProfile:', err);
        return null;
    }
}

// ===== CHARGEMENT DE LA FAQ =====
async function loadFAQ() {
    try {
        const { data, error } = await supabaseParrainsSpacePrive
            .from('support_faq')
            .select('*')
            .eq('is_active', true)
            .order('position', { ascending: true });

        if (error) throw error;
        renderFAQ(data || []);
    } catch (err) {
        console.error('Erreur chargement FAQ:', err);
        showToast('Erreur lors du chargement de la FAQ', 'error');
    }
}

// ===== RENDU DE LA FAQ =====
function renderFAQ(items) {
    const container = document.getElementById('faqList');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '<p>Aucune question fréquente pour le moment.</p>';
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFAQ(${index})">
                <span>${item.question}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer" id="faq-${index}">
                ${item.answer}
            </div>
        </div>
    `).join('');
}

// Fonction globale pour le toggle
window.toggleFAQ = function(index) {
    const answer = document.getElementById(`faq-${index}`);
    const question = answer.previousElementSibling;
    question.classList.toggle('active');
    answer.classList.toggle('show');
};

// ===== FORMULAIRE DE TICKET =====
async function handleTicketSubmit(e) {
    e.preventDefault();

    const subject = document.getElementById('ticketSubject').value.trim();
    const category = document.getElementById('ticketCategory').value;
    const description = document.getElementById('ticketDescription').value.trim();
    const file = document.getElementById('ticketAttachment').files[0];

    if (!subject || !description) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    let attachmentUrl = null;

    // Upload du fichier si présent
    if (file) {
        // Vérification de la taille (10 Mo max)
        if (file.size > 10 * 1024 * 1024) {
            showToast('Le fichier ne doit pas dépasser 10 Mo', 'warning');
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `ticket_${currentProfile.id}_${Date.now()}.${fileExt}`;
        const filePath = `support/${fileName}`;

        const { error: uploadError } = await supabaseParrainsSpacePrive.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Erreur upload:', uploadError);
            showToast('Erreur lors de l\'upload du fichier.', 'error');
            return;
        }

        const { data: urlData } = supabaseParrainsSpacePrive.storage
            .from('documents')
            .getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
    }

    // Insertion du ticket
    const { error: insertError } = await supabaseParrainsSpacePrive
        .from('support_tickets')
        .insert([{
            user_id: currentProfile.id,
            subject,
            category,
            description,
            attachment_url: attachmentUrl,
            status: 'new'
        }]);

    if (insertError) {
        console.error('Erreur création ticket:', insertError);
        showToast('Erreur lors de l\'envoi du ticket.', 'error');
        return;
    }

    showToast('Votre demande a été envoyée avec succès !', 'success');
    document.getElementById('ticketForm').reset();
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
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseParrainsSpacePrive.auth.signOut();
            window.location.href = '../index.html';
        });
    });
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de la page support (parrain)');

    const user = await checkSession();
    if (!user) return;

    await loadProfile();
    if (!currentProfile) return;

    await loadFAQ();

    // Attacher le formulaire
    document.getElementById('ticketForm').addEventListener('submit', handleTicketSubmit);

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
