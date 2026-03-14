// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSupportAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let allPlayers = [];
let ticketsData = [];
let faqData = [];
let currentTicketId = null;
let currentFaqId = null;
let currentAction = null;

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
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
function showLoader(show) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION ADMIN =====
async function checkAdmin() {
    showLoader(true);
    const { data: { session }, error } = await supabaseSupportAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseSupportAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseSupportAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DE LA LISTE DES JOUEURS =====
async function loadPlayers() {
    const { data, error } = await supabaseSupportAdmin
        .from('player_profiles')
        .select('id, nom_complet')
        .order('nom_complet');
    if (error) {
        console.error('Erreur chargement joueurs:', error);
        return [];
    }
    return data || [];
}

// ===== CHARGEMENT DES TICKETS =====
async function loadTickets() {
    showLoader(true);
    try {
        const { data, error } = await supabaseSupportAdmin
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Charger les noms des joueurs
        const playerIds = [...new Set(data.map(t => t.player_id).filter(id => id))];
        let playersMap = {};
        if (playerIds.length > 0) {
            const { data: players, error: playersError } = await supabaseSupportAdmin
                .from('player_profiles')
                .select('id, nom_complet')
                .in('id', playerIds);
            if (!playersError) {
                (players || []).forEach(p => playersMap[p.id] = p.nom_complet);
            }
        }

        ticketsData = (data || []).map(t => ({
            ...t,
            player_name: playersMap[t.player_id] || 'Joueur inconnu'
        }));

        renderTickets();
    } catch (error) {
        console.error('Erreur chargement tickets:', error);
        showToast('Erreur lors du chargement des tickets', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DES TICKETS =====
function renderTickets() {
    const search = document.getElementById('ticketSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('ticketStatusFilter')?.value || '';

    const filtered = ticketsData.filter(t => {
        const playerName = t.player_name?.toLowerCase() || '';
        const subject = t.subject?.toLowerCase() || '';
        const matchesSearch = playerName.includes(search) || subject.includes(search);
        const matchesStatus = !statusFilter || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const container = document.getElementById('ticketsList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucun ticket trouvé.</p>';
        return;
    }

    container.innerHTML = filtered.map(t => {
        const statusLabel = {
            new: 'Nouveau',
            in_progress: 'En cours',
            resolved: 'Résolu',
            closed: 'Fermé'
        }[t.status] || t.status;

        const statusClass = t.status || 'new';
        const date = new Date(t.created_at).toLocaleDateString('fr-FR');

        return `
            <div class="item-card">
                <div class="item-info">
                    <div class="item-player">${t.player_name}</div>
                    <div class="item-subject">${t.subject}</div>
                    <div class="item-meta">${date} · ${t.category || 'Autre'}</div>
                </div>
                <div class="item-status ${statusClass}">${statusLabel}</div>
                <div class="item-actions">
                    <button class="btn-action view" onclick="viewTicket(${t.id})"><i class="fas fa-eye"></i> Voir</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== VOIR UN TICKET (MODALE) =====
function viewTicket(ticketId) {
    const ticket = ticketsData.find(t => t.id === ticketId);
    if (!ticket) return;

    currentTicketId = ticketId;
    const statusLabel = {
        new: 'Nouveau',
        in_progress: 'En cours',
        resolved: 'Résolu',
        closed: 'Fermé'
    }[ticket.status] || ticket.status;

    const attachmentHtml = ticket.attachment_url 
        ? `<a href="${ticket.attachment_url}" target="_blank" class="attachment-link">Voir la pièce jointe</a>`
        : 'Aucune';

    const modalBody = document.getElementById('ticketModalBody');
    modalBody.innerHTML = `
        <div class="detail-row"><span class="detail-label">Joueur :</span> <span class="detail-value">${ticket.player_name}</span></div>
        <div class="detail-row"><span class="detail-label">Sujet :</span> <span class="detail-value">${ticket.subject}</span></div>
        <div class="detail-row"><span class="detail-label">Catégorie :</span> <span class="detail-value">${ticket.category || 'Autre'}</span></div>
        <div class="detail-row"><span class="detail-label">Description :</span> <span class="detail-value">${ticket.description}</span></div>
        <div class="detail-row"><span class="detail-label">Statut :</span> <span class="detail-value">${statusLabel}</span></div>
        <div class="detail-row"><span class="detail-label">Pièce jointe :</span> <span class="detail-value">${attachmentHtml}</span></div>
        <div class="detail-row"><span class="detail-label">Créé le :</span> <span class="detail-value">${new Date(ticket.created_at).toLocaleString('fr-FR')}</span></div>
        ${ticket.updated_at ? `<div class="detail-row"><span class="detail-label">Mis à jour :</span> <span class="detail-value">${new Date(ticket.updated_at).toLocaleString('fr-FR')}</span></div>` : ''}
    `;

    document.getElementById('ticketStatusSelect').value = ticket.status || 'new';
    document.getElementById('ticketDetailModal').style.display = 'block';
}

// ===== METTRE À JOUR LE STATUT D'UN TICKET =====
async function updateTicketStatus() {
    if (!currentTicketId) return;
    const newStatus = document.getElementById('ticketStatusSelect').value;

    showLoader(true);
    try {
        const { error } = await supabaseSupportAdmin
            .from('support_tickets')
            .update({ status: newStatus, updated_at: new Date() })
            .eq('id', currentTicketId);

        if (error) throw error;

        showToast('Statut mis à jour', 'success');
        closeTicketModal();
        loadTickets();
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== CHARGEMENT DE LA FAQ =====
async function loadFaq() {
    showLoader(true);
    try {
        const { data, error } = await supabaseSupportAdmin
            .from('support_faq')
            .select('*')
            .order('position', { ascending: true });

        if (error) throw error;

        faqData = data || [];
        renderFaq();
    } catch (error) {
        console.error('Erreur chargement FAQ:', error);
        showToast('Erreur lors du chargement de la FAQ', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== RENDU DE LA FAQ =====
function renderFaq() {
    const search = document.getElementById('faqSearch')?.value.toLowerCase() || '';

    const filtered = faqData.filter(f => 
        f.question.toLowerCase().includes(search) || 
        f.answer.toLowerCase().includes(search)
    );

    const container = document.getElementById('faqList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucune FAQ trouvée.</p>';
        return;
    }

    container.innerHTML = filtered.map(f => `
        <div class="faq-item">
            <div class="faq-position">#${f.position}</div>
            <div class="faq-question">${f.question}</div>
            <div class="faq-answer">${f.answer.substring(0, 100)}${f.answer.length > 100 ? '…' : ''}</div>
            <div class="faq-active ${f.is_active ? 'true' : 'false'}">${f.is_active ? 'Active' : 'Inactive'}</div>
            <div class="item-actions">
                <button class="btn-action edit" onclick="editFaq(${f.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-action delete" onclick="confirmDeleteFaq(${f.id})"><i class="fas fa-trash"></i></button>
                <button class="btn-action toggle ${f.is_active ? 'active' : ''}" onclick="toggleFaqActive(${f.id})">
                    ${f.is_active ? 'Désactiver' : 'Activer'}
                </button>
            </div>
        </div>
    `).join('');
}

// ===== GESTION DE LA FAQ =====
function openFaqModal(faq = null) {
    document.getElementById('faqModalTitle').textContent = faq ? 'Modifier la FAQ' : 'Ajouter une FAQ';
    if (faq) {
        document.getElementById('faqId').value = faq.id;
        document.getElementById('faqQuestion').value = faq.question;
        document.getElementById('faqAnswer').value = faq.answer;
        document.getElementById('faqPosition').value = faq.position;
        document.getElementById('faqActive').value = faq.is_active ? 'true' : 'false';
    } else {
        document.getElementById('faqId').value = '';
        document.getElementById('faqQuestion').value = '';
        document.getElementById('faqAnswer').value = '';
        document.getElementById('faqPosition').value = '0';
        document.getElementById('faqActive').value = 'true';
    }
    document.getElementById('faqModal').style.display = 'block';
}

function closeFaqModal() {
    document.getElementById('faqModal').style.display = 'none';
}

document.getElementById('faqForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('faqId').value;
    const question = document.getElementById('faqQuestion').value.trim();
    const answer = document.getElementById('faqAnswer').value.trim();
    const position = parseInt(document.getElementById('faqPosition').value) || 0;
    const is_active = document.getElementById('faqActive').value === 'true';

    if (!question || !answer) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }

    showLoader(true);
    try {
        if (id) {
            const { error } = await supabaseSupportAdmin
                .from('support_faq')
                .update({ question, answer, position, is_active })
                .eq('id', id);
            if (error) throw error;
            showToast('FAQ mise à jour', 'success');
        } else {
            const { error } = await supabaseSupportAdmin
                .from('support_faq')
                .insert([{ question, answer, position, is_active }]);
            if (error) throw error;
            showToast('FAQ ajoutée', 'success');
        }
        closeFaqModal();
        loadFaq();
    } catch (error) {
        console.error('Erreur sauvegarde FAQ:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        showLoader(false);
    }
});

function editFaq(id) {
    const faq = faqData.find(f => f.id === id);
    if (faq) openFaqModal(faq);
}

async function deleteFaq(id) {
    showLoader(true);
    try {
        const { error } = await supabaseSupportAdmin
            .from('support_faq')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('FAQ supprimée', 'success');
        closeConfirmModal();
        loadFaq();
    } catch (error) {
        console.error('Erreur suppression FAQ:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

async function toggleFaqActive(id) {
    const faq = faqData.find(f => f.id === id);
    if (!faq) return;
    const newStatus = !faq.is_active;

    showLoader(true);
    try {
        const { error } = await supabaseSupportAdmin
            .from('support_faq')
            .update({ is_active: newStatus })
            .eq('id', id);
        if (error) throw error;
        showToast(`FAQ ${newStatus ? 'activée' : 'désactivée'}`, 'success');
        loadFaq();
    } catch (error) {
        console.error('Erreur changement statut FAQ:', error);
        showToast('Erreur lors du changement', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmDeleteFaq(id) {
    currentAction = { type: 'deleteFaq', id };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer cette FAQ ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

// ===== FERMETURE DES MODALES =====
function closeTicketModal() {
    document.getElementById('ticketDetailModal').style.display = 'none';
    currentTicketId = null;
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

function executeAction() {
    if (!currentAction) return;
    if (currentAction.type === 'deleteFaq') {
        deleteFaq(currentAction.id);
    }
}

// ===== GESTION DES ONGLETS =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });
}

// ===== FILTRES =====
document.getElementById('ticketSearch')?.addEventListener('input', renderTickets);
document.getElementById('ticketStatusFilter')?.addEventListener('change', renderTickets);
document.getElementById('faqSearch')?.addEventListener('input', renderFaq);

// ===== RAFRAÎCHIR =====
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadTickets();
    loadFaq();
});

// ===== BOUTON AJOUT FAQ =====
document.getElementById('addFaqBtn').addEventListener('click', () => openFaqModal());

// ===== DÉCONNEXION =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseSupportAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    allPlayers = await loadPlayers();
    await loadTickets();
    await loadFaq();
    initTabs();
});

// Exposer les fonctions globales
window.viewTicket = viewTicket;
window.updateTicketStatus = updateTicketStatus;
window.closeTicketModal = closeTicketModal;
window.editFaq = editFaq;
window.toggleFaqActive = toggleFaqActive;
window.confirmDeleteFaq = confirmDeleteFaq;
window.closeConfirmModal = closeConfirmModal;
window.executeAction = executeAction;
window.closeFaqModal = closeFaqModal;