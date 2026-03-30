const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const rowsPerPage = 20;

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

async function loadAllTransactions() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        allTransactions = data || [];
        applyFilters();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement transactions', 'error');
    } finally {
        hideLoader();
    }
}

function applyFilters() {
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;
    const dateStart = document.getElementById('dateStart').value;
    const dateEnd = document.getElementById('dateEnd').value;
    const amountMin = parseFloat(document.getElementById('amountMin').value);
    const amountMax = parseFloat(document.getElementById('amountMax').value);
    const search = document.getElementById('searchInput').value.toLowerCase();

    filteredTransactions = allTransactions.filter(t => {
        if (type !== 'all' && t.type !== type) return false;
        if (status !== 'all' && t.status !== status) return false;
        if (dateStart && new Date(t.created_at) < new Date(dateStart)) return false;
        if (dateEnd && new Date(t.created_at) > new Date(dateEnd)) return false;
        if (!isNaN(amountMin) && t.amount < amountMin) return false;
        if (!isNaN(amountMax) && t.amount > amountMax) return false;
        if (search && !t.reference?.toLowerCase().includes(search) && !t.description?.toLowerCase().includes(search)) return false;
        return true;
    });
    currentPage = 1;
    renderTransactions();
    updateTotals();
}

function renderTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageTransactions = filteredTransactions.slice(start, end);
    if (pageTransactions.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune transaction correspondante.</p>';
        renderPagination();
        return;
    }
    container.innerHTML = pageTransactions.map(t => {
        const date = new Date(t.created_at).toLocaleString('fr-FR');
        const sign = (t.type === 'deposit' || t.type === 'bonus') ? '+' : '-';
        const amountClass = (t.type === 'deposit' || t.type === 'bonus') ? 'positive' : 'negative';
        const icon = t.type === 'deposit' ? 'fa-arrow-down' : (t.type === 'withdraw' ? 'fa-arrow-up' : 'fa-gift');
        const statusText = {
            pending: 'En attente',
            approved: 'Approuvé',
            rejected: 'Rejeté'
        }[t.status] || t.status;

        return `
            <div class="transaction-item ${t.type}">
                <div class="transaction-icon"><i class="fas ${icon}"></i></div>
                <div class="transaction-details">
                    <div class="transaction-title">${escapeHtml(t.description || t.type)}</div>
                    <div class="transaction-desc">${escapeHtml(t.reference || '')} - ${statusText}</div>
                </div>
                <div class="transaction-amount ${amountClass}">${sign}${t.amount} FCFA</div>
                <div class="transaction-date">${date}</div>
                <button class="transaction-pdf-btn" data-id="${t.id}" title="Télécharger le reçu PDF"><i class="fas fa-file-pdf"></i></button>
            </div>
        `;
    }).join('');
    attachPdfButtons();
    renderPagination();
}

function attachPdfButtons() {
    document.querySelectorAll('.transaction-pdf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const transaction = allTransactions.find(t => t.id === id);
            if (transaction) downloadTransactionPDF(transaction);
        });
    });
}

function renderPagination() {
    const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    paginationContainer.innerHTML = html;
    document.querySelectorAll('.pagination button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderTransactions();
        });
    });
}

function updateTotals() {
    const totalCount = filteredTransactions.length;
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('totalAmount').textContent = `${totalAmount.toLocaleString('fr-FR')} FCFA`;
}

async function downloadTransactionPDF(transaction) {
    const statusColor = {
        pending: '#ffc107',
        approved: '#28a745',
        rejected: '#dc3545'
    }[transaction.status] || '#6c757d';
    const statusTextFr = {
        pending: 'EN ATTENTE',
        approved: 'APPROUVÉ',
        rejected: 'REJETÉ'
    }[transaction.status] || transaction.status;

    const verifyUrl = `https://hubisoccer.github.io/hubisoccer1st/verify-transaction.html?id=${transaction.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;

    const element = document.createElement('div');
    element.style.fontFamily = 'Poppins, sans-serif';
    element.style.padding = '20px';
    element.style.position = 'relative';
    element.style.backgroundColor = '#f8f0ff';
    element.style.color = '#1a1a1a';
    element.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(85,27,140,0.05) 0px, rgba(85,27,140,0.05) 2px, transparent 2px, transparent 8px)';
    element.innerHTML = `
        <div style="position: relative; z-index: 2;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #551B8C; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <img src="img/logo-navbar.png" style="height: 50px;" alt="HubISoccer">
                    <div><strong>The Hub of Inspiration of Soccer</strong></div>
                    <div style="font-size: 0.8rem;">RCCM : RB/ABC/24 A 111814 | IFU : 0201910800236</div>
                    <div style="font-size: 0.8rem;">Siège social : Aitchedji, Abomey-Calavi, Bénin</div>
                    <div style="font-size: 0.8rem;">Contact : +229 01 97 20 81 88 | hubisoccer@gmail.com</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: bold;">JUSTIFICATIF D'OPÉRATION NUMÉRIQUE</div>
                    <div>Réf : ${transaction.reference}</div>
                    <div>Date : ${new Date(transaction.created_at).toLocaleString('fr-FR')}</div>
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <strong>Bénéficiaire :</strong> ${currentProfile.full_name}<br>
                <strong>Rôle :</strong> Joueur (FT)<br>
                <strong>ID HubISoccer :</strong> ${currentProfile.id}
            </div>
            <div style="background: ${statusColor}; padding: 8px; text-align: center; font-weight: bold; color: white; margin-bottom: 20px;">
                STATUT : ${statusTextFr}
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nature</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.type === 'deposit' ? 'Dépôt' : transaction.type === 'withdraw' ? 'Retrait' : 'Bonus'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Montant</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.amount} FCFA</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Mode de règlement</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.description?.split(' ')[2] || 'Solde interne'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Libellé détaillé</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.description || ''}</td></tr>
            </table>
            <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 20px;">
                <p>Le présent document est généré de manière automatisée par le système HubISoccer et constitue une preuve d'opération numérique conformément aux dispositions légales sur le commerce électronique au Bénin.</p>
                <p>Cette transaction est enregistrée dans le grand livre numérique de l'entité The Hub of Inspiration of Soccer et peut faire l'objet d'une vérification de conformité auprès de nos services financiers.</p>
                <p>Toute falsification de ce document est passible de poursuites judiciaires.</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <div><img src="${qrCodeUrl}" style="width: 100px; height: 100px;" alt="QR Code"></div>
                <div style="text-align: right;">
                    <div>Signature du Responsable Financier</div>
                    <div style="margin-top: 20px;">____________________</div>
                    <div>Cachet numérique</div>
                </div>
            </div>
            <div style="margin-top: 30px; text-align: center; font-size: 0.7rem; color: #aaa;">
                Approuvé pour valoir ce que de droit
            </div>
        </div>
    `;
    const watermark = document.createElement('div');
    watermark.style.position = 'absolute';
    watermark.style.top = '0';
    watermark.style.left = '0';
    watermark.style.width = '100%';
    watermark.style.height = '100%';
    watermark.style.pointerEvents = 'none';
    watermark.style.zIndex = '1';
    watermark.style.background = 'repeating-linear-gradient(45deg, rgba(85,27,140,0.1) 0px, rgba(85,27,140,0.1) 3px, transparent 3px, transparent 12px)';
    watermark.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48px; color: rgba(85,27,140,0.2); white-space: nowrap;">CONFIDENTIEL HUBISOCCER</div>';
    element.appendChild(watermark);
    document.body.appendChild(element);
    const opt = {
        margin: 0.5,
        filename: `transaction_${transaction.reference}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => {
        document.body.removeChild(element);
    }).catch(err => {
        console.error(err);
        showToast('Erreur génération PDF', 'error');
        document.body.removeChild(element);
    });
}

function exportCSV() {
    if (!filteredTransactions.length) {
        showToast('Aucune transaction à exporter', 'warning');
        return;
    }
    const headers = ['Référence', 'Date', 'Type', 'Montant', 'Statut', 'Description', 'Notes admin'];
    const rows = filteredTransactions.map(t => [
        t.reference,
        new Date(t.created_at).toLocaleString('fr-FR'),
        t.type,
        t.amount,
        t.status,
        t.description,
        t.admin_notes || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${currentProfile.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function initFilters() {
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('filterType').value = 'all';
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('dateStart').value = '';
        document.getElementById('dateEnd').value = '';
        document.getElementById('amountMin').value = '';
        document.getElementById('amountMax').value = '';
        document.getElementById('searchInput').value = '';
        applyFilters();
    });
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
}

function initMenuMobile() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('open');
            }
        });
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
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadAllTransactions();
    initFilters();
    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();
    initMenuMobile();
    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
});
