const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

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
        <div class="toast-content">${escapeHtml(message)}</div>
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

async function loadProfile() {
    if (!currentUser) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();
        if (error) throw error;
        currentProfile = data;
        document.getElementById('userName').textContent = currentProfile.full_name || 'Joueur';
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
    if (currentProfile?.avatar_url) {
        userAvatar.src = currentProfile.avatar_url;
        userAvatar.style.display = 'block';
        if (userInitials) userInitials.style.display = 'none';
    } else {
        const initials = (currentProfile?.full_name || 'J').charAt(0).toUpperCase();
        if (userInitials) {
            userInitials.textContent = initials;
            userInitials.style.display = 'flex';
        }
        userAvatar.style.display = 'none';
    }
}

async function loadFAQ() {
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('support_faq')
            .select('*')
            .eq('is_active', true)
            .order('position', { ascending: true });
        if (error) throw error;
        renderFAQ(data || []);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement FAQ', 'error');
    } finally {
        hideLoader();
    }
}

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
                <span>${escapeHtml(item.question)}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer" id="faq-${index}">
                ${escapeHtml(item.answer)}
            </div>
        </div>
    `).join('');
}

window.toggleFAQ = function(index) {
    const answer = document.getElementById(`faq-${index}`);
    const question = answer.previousElementSibling;
    question.classList.toggle('active');
    answer.classList.toggle('show');
};

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
    if (subject.length < 5) {
        showToast('Le sujet doit contenir au moins 5 caractères.', 'warning');
        return;
    }
    if (description.length < 20) {
        showToast('La description doit contenir au moins 20 caractères.', 'warning');
        return;
    }

    let attachmentUrl = null;
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('Le fichier ne doit pas dépasser 5 Mo.', 'warning');
            return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Type de fichier non autorisé. Utilisez JPG, PNG ou PDF.', 'warning');
            return;
        }
        showLoader();
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `ticket_${currentProfile.id}_${Date.now()}.${fileExt}`;
            const filePath = `support/${fileName}`;
            const { error: uploadError } = await supabasePlayersSpacePrive.storage
                .from('documents')
                .upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabasePlayersSpacePrive.storage
                .from('documents')
                .getPublicUrl(filePath);
            attachmentUrl = urlData.publicUrl;
        } catch (err) {
            console.error(err);
            showToast('Erreur lors de l\'upload du fichier.', 'error');
            hideLoader();
            return;
        }
    }

    showLoader();
    try {
        const { error } = await supabasePlayersSpacePrive
            .from('support_tickets')
            .insert([{
                player_id: currentProfile.id,
                subject,
                category,
                description,
                attachment_url: attachmentUrl,
                status: 'new'
            }]);
        if (error) throw error;
        showToast('Votre demande a été envoyée avec succès !', 'success');
        document.getElementById('ticketForm').reset();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'envoi du ticket.', 'error');
    } finally {
        hideLoader();
    }
}

// UI
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation support');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadFAQ();
    document.getElementById('ticketForm').addEventListener('submit', handleTicketSubmit);
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
    console.log('✅ Initialisation terminée');
});
