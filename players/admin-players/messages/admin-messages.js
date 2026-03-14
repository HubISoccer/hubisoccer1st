// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseMessagesAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉTAT GLOBAL =====
let currentAdmin = null;
let conversationsData = [];
let messagesData = [];
let currentConvId = null;
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
    const { data: { session }, error } = await supabaseMessagesAdmin.auth.getSession();
    if (error || !session) {
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    const { data: admin, error: adminError } = await supabaseMessagesAdmin
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabaseMessagesAdmin.auth.signOut();
        window.location.href = 'auth/admin-login.html';
        return false;
    }

    currentAdmin = admin;
    document.getElementById('userName').textContent = session.user.email || 'Admin';
    showLoader(false);
    return true;
}

// ===== CHARGEMENT DES CONVERSATIONS =====
async function loadConversations() {
    showLoader(true);
    try {
        const { data, error } = await supabaseMessagesAdmin
            .from('player_conversations')
            .select('*')
            .order('last_message_time', { ascending: false, nullsFirst: false });

        if (error) throw error;

        // Récupérer les profils des participants
        const participantIds = [];
        data.forEach(c => {
            participantIds.push(c.participant1_id, c.participant2_id);
        });
        const uniqueIds = [...new Set(participantIds)];

        const { data: profiles, error: profilesError } = await supabaseMessagesAdmin
            .from('player_profiles')
            .select('id, nom_complet, avatar_url')
            .in('id', uniqueIds);

        if (profilesError) throw profilesError;

        const profilesMap = {};
        (profiles || []).forEach(p => profilesMap[p.id] = p);

        // Ajouter les noms et avatars
        conversationsData = (data || []).map(c => ({
            ...c,
            participant1: profilesMap[c.participant1_id] || { nom_complet: 'Inconnu', avatar_url: '../../img/user-default.jpg' },
            participant2: profilesMap[c.participant2_id] || { nom_complet: 'Inconnu', avatar_url: '../../img/user-default.jpg' }
        }));

        await loadMessagesStats();
        renderConversations();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement conversations:', error);
        showToast('Erreur lors du chargement des conversations', 'error');
    } finally {
        showLoader(false);
    }
}

// ===== CHARGEMENT DES MESSAGES (pour stats) =====
async function loadMessagesStats() {
    const { data, error } = await supabaseMessagesAdmin
        .from('player_messages')
        .select('*');

    if (error) {
        console.error('Erreur chargement messages stats:', error);
        return;
    }
    messagesData = data || [];
}

// ===== RENDU DES CONVERSATIONS =====
function renderConversations() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const dateFilter = document.getElementById('dateFilter')?.value || 'all';

    const filtered = conversationsData.filter(c => {
        const p1 = c.participant1?.nom_complet?.toLowerCase() || '';
        const p2 = c.participant2?.nom_complet?.toLowerCase() || '';
        const matchesSearch = p1.includes(searchTerm) || p2.includes(searchTerm);

        let matchesDate = true;
        if (dateFilter !== 'all' && c.last_message_time) {
            const date = new Date(c.last_message_time);
            const now = new Date();
            if (dateFilter === 'today') {
                matchesDate = date.toDateString() === now.toDateString();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                matchesDate = date >= weekAgo;
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                matchesDate = date >= monthAgo;
            }
        }
        return matchesSearch && matchesDate;
    });

    const container = document.getElementById('convList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Aucune conversation trouvée.</p>';
        return;
    }

    container.innerHTML = filtered.map(c => {
        const p1Name = c.participant1?.nom_complet || 'Inconnu';
        const p2Name = c.participant2?.nom_complet || 'Inconnu';
        const lastMsg = c.last_message_content || '';
        const lastTime = c.last_message_time ? new Date(c.last_message_time).toLocaleString('fr-FR') : 'Jamais';
        const msgCount = messagesData.filter(m => m.conversation_id === c.id).length;

        return `
            <div class="conv-card" data-conv-id="${c.id}">
                <div class="conv-avatars">
                    <img src="${c.participant1?.avatar_url || '../../img/user-default.jpg'}" class="conv-avatar">
                    <img src="${c.participant2?.avatar_url || '../../img/user-default.jpg'}" class="conv-avatar">
                </div>
                <div class="conv-info">
                    <div class="conv-participants">${p1Name} ↔ ${p2Name}</div>
                    <div class="conv-last-message">${lastMsg || '(aucun message)'}</div>
                    <div class="conv-meta">
                        <span>${msgCount} message${msgCount > 1 ? 's' : ''}</span>
                        <span>Dernier : ${lastTime}</span>
                    </div>
                </div>
                <div class="conv-actions">
                    <button class="btn-action view" onclick="viewConversation(${c.id})"><i class="fas fa-eye"></i> Voir</button>
                    <button class="btn-action delete" onclick="confirmDeleteConversation(${c.id})"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== STATISTIQUES =====
function updateStats() {
    const totalConvs = conversationsData.length;
    const totalMessages = messagesData.length;
    const unread = messagesData.filter(m => !m.is_read).length;

    document.getElementById('totalConvs').textContent = totalConvs;
    document.getElementById('totalMessages').textContent = totalMessages;
    document.getElementById('unreadCount').textContent = unread;
}

// ===== VOIR UNE CONVERSATION =====
async function viewConversation(convId) {
    currentConvId = convId;

    const messages = messagesData.filter(m => m.conversation_id === convId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Charger les profils des expéditeurs
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const { data: senders, error } = await supabaseMessagesAdmin
        .from('player_profiles')
        .select('id, nom_complet, avatar_url')
        .in('id', senderIds);

    if (error) {
        console.error('Erreur chargement expéditeurs:', error);
        showToast('Erreur lors du chargement des messages', 'error');
        return;
    }

    const sendersMap = {};
    (senders || []).forEach(s => sendersMap[s.id] = s);

    const messagesHtml = messages.map(m => {
        const sender = sendersMap[m.sender_id] || { nom_complet: 'Inconnu', avatar_url: '../../img/user-default.jpg' };
        const time = new Date(m.created_at).toLocaleString('fr-FR');
        const replyClass = m.reply_to_id ? 'reply' : '';
        return `
            <div class="message-item ${replyClass}">
                <div class="sender">
                    <img src="${sender.avatar_url}">
                    ${sender.nom_complet}
                </div>
                <div class="content">${m.content}</div>
                <div class="time">${time}</div>
            </div>
        `;
    }).join('');

    const modalBody = document.getElementById('convModalBody');
    modalBody.innerHTML = `
        <div class="message-list">
            ${messagesHtml || '<p>Aucun message.</p>'}
        </div>
    `;

    document.getElementById('modalDeleteConvBtn').onclick = () => confirmDeleteConversation(convId);
    document.getElementById('convDetailModal').style.display = 'block';
}

// ===== SUPPRESSION D'UNE CONVERSATION =====
async function deleteConversation(convId) {
    showLoader(true);
    try {
        // Supprimer d'abord les messages
        const { error: msgError } = await supabaseMessagesAdmin
            .from('player_messages')
            .delete()
            .eq('conversation_id', convId);
        if (msgError) throw msgError;

        // Puis la conversation
        const { error } = await supabaseMessagesAdmin
            .from('player_conversations')
            .delete()
            .eq('id', convId);
        if (error) throw error;

        showToast('Conversation supprimée', 'success');
        closeDetailModal();
        closeConfirmModal();
        await loadConversations();
    } catch (error) {
        console.error('Erreur suppression conversation:', error);
        showToast('Erreur lors de la suppression', 'error');
    } finally {
        showLoader(false);
    }
}

function confirmDeleteConversation(convId) {
    currentAction = { type: 'deleteConv', convId };
    document.getElementById('confirmModalBody').innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer cette conversation et tous ses messages ?</p>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeConfirmModal()">Annuler</button>
            <button class="btn-confirm" onclick="executeAction()">Confirmer</button>
        </div>
    `;
    document.getElementById('confirmModal').style.display = 'block';
}

function executeAction() {
    if (!currentAction) return;
    if (currentAction.type === 'deleteConv') {
        deleteConversation(currentAction.convId);
    }
}

// ===== FERMETURE DES MODALES =====
function closeDetailModal() {
    document.getElementById('convDetailModal').style.display = 'none';
    currentConvId = null;
}
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentAction = null;
}

// ===== FILTRES =====
document.getElementById('searchInput')?.addEventListener('input', renderConversations);
document.getElementById('dateFilter')?.addEventListener('change', renderConversations);

// ===== RAFRAÎCHIR =====
document.getElementById('refreshBtn').addEventListener('click', loadConversations);

// ===== DÉCONNEXION =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseMessagesAdmin.auth.signOut();
    window.location.href = 'auth/admin-login.html';
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    await loadConversations();
});

// Exposer les fonctions globales
window.viewConversation = viewConversation;
window.confirmDeleteConversation = confirmDeleteConversation;
window.closeDetailModal = closeDetailModal;
window.closeConfirmModal = closeConfirmModal;
window.executeAction = executeAction;