const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentCandidatureId = null;
let currentRoleData = {};
let roleDataQuill = null;
let messageQuill = null;

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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

async function loadCandidatures() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('deveniracteur')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        renderCandidaturesList(data || []);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement candidatures', 'error');
    } finally {
        hideLoader();
    }
}

function renderCandidaturesList(candidatures) {
    const container = document.getElementById('candidaturesList');
    if (!container) return;
    if (candidatures.length === 0) {
        container.innerHTML = '<p class="no-data">Aucune candidature.</p>';
        return;
    }

    const roleLabels = {
        PR: 'Parrain', ST: 'Staff médical', CO: 'Coach', AG: 'Agent',
        AC: 'Académie', CL: 'Club', FO: 'Formateur'
    };

    container.innerHTML = candidatures.map(c => {
        const statusMap = {
            pending: { class: 'en_attente', text: 'En attente' },
            approved: { class: 'valide', text: 'Validé' },
            rejected: { class: 'refuse', text: 'Refusé' },
            suspended: { class: 'en_attente', text: 'Suspendu' }
        };
        const status = statusMap[c.status] || statusMap.pending;
        return `
            <div class="list-item" data-id="${c.id}">
                <div class="info">
                    <strong>${escapeHtml(c.full_name)}</strong>
                    <div class="details">
                        <span>${roleLabels[c.role] || c.role}</span>
                        <span>${escapeHtml(c.email)}</span>
                        <span>${escapeHtml(c.phone)}</span>
                    </div>
                    <span class="status ${status.class}">${status.text}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewCandidature('${c.id}')" title="Voir détails"><i class="fas fa-eye"></i></button>
                    <button class="valid" onclick="updateStatus('${c.id}', 'approved')" title="Valider"><i class="fas fa-check"></i></button>
                    <button class="reject" onclick="updateStatus('${c.id}', 'rejected')" title="Rejeter"><i class="fas fa-times"></i></button>
                    <button class="edit" onclick="openEditTab('${c.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteCandidature('${c.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.viewCandidature = async (id) => {
    currentCandidatureId = id;
    await loadCandidatureDetails(id);
    document.getElementById('candidatureModal').classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tabDetails').classList.add('active');
    document.querySelector('.tab-btn[data-tab="details"]').classList.add('active');
};

async function loadCandidatureDetails(id) {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('deveniracteur')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        displayDetails(data);
        loadMessages(id);
        populateEditForm(data);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement détails', 'error');
    } finally {
        hideLoader();
    }
}

function displayDetails(cand) {
    const modalDetails = document.getElementById('modalDetails');
    const submitDate = cand.created_at ? new Date(cand.created_at).toLocaleString('fr-FR') : '-';

    const roleLabels = {
        PR: 'Parrain', ST: 'Staff médical', CO: 'Coach', AG: 'Agent',
        AC: 'Académie', CL: 'Club', FO: 'Formateur'
    };
    const roleName = roleLabels[cand.role] || cand.role;

    const fileUrl = cand.document_file ? `https://wxlpcflanihqwumjwpjs.supabase.co/storage/v1/object/public/documents/${cand.document_file}` : null;

    const roleDataHtml = cand.role_data ? Object.entries(cand.role_data).map(([k, v]) => `<div class="detail-item"><span class="detail-icon">📄</span> <strong>${k.replace(/_/g, ' ')} :</strong> ${escapeHtml(v)}</div>`).join('') : '';

    modalDetails.innerHTML = `
        <div class="modal-details-grid">
            <div class="detail-item"><span class="detail-icon">🆔</span> <strong>ID :</strong> ${escapeHtml(cand.id)}</div>
            <div class="detail-item"><span class="detail-icon">👤</span> <strong>Nom :</strong> ${escapeHtml(cand.full_name)}</div>
            <div class="detail-item"><span class="detail-icon">📧</span> <strong>Email :</strong> ${escapeHtml(cand.email)}</div>
            <div class="detail-item"><span class="detail-icon">📞</span> <strong>Téléphone :</strong> ${escapeHtml(cand.phone)}</div>
            <div class="detail-item"><span class="detail-icon">🎭</span> <strong>Rôle :</strong> ${escapeHtml(roleName)}</div>
            <div class="detail-item"><span class="detail-icon">📄</span> <strong>Justificatif :</strong> ${fileUrl ? `<a href="${fileUrl}" target="_blank">Télécharger</a>` : 'Aucun'}</div>
            <div class="detail-item"><span class="detail-icon">⏰</span> <strong>Soumission :</strong> ${submitDate}</div>
        </div>
        ${roleDataHtml ? `<div class="role-data-section"><strong>Informations complémentaires :</strong><div class="modal-details-grid">${roleDataHtml}</div></div>` : ''}
        <div class="detail-status">
            <strong>Statut :</strong> <span class="status-badge ${cand.status === 'approved' ? 'valide' : cand.status === 'rejected' ? 'refuse' : 'en_attente'}">${cand.status === 'approved' ? 'Validé' : cand.status === 'rejected' ? 'Refusé' : cand.status === 'suspended' ? 'Suspendu' : 'En attente'}</span>
        </div>
        ${cand.admin_notes ? `<div class="admin-notes"><strong>Notes admin :</strong><br>${escapeHtml(cand.admin_notes)}</div>` : ''}
    `;
}

function populateEditForm(cand) {
    document.getElementById('editFullName').value = cand.full_name || '';
    document.getElementById('editEmail').value = cand.email || '';
    document.getElementById('editPhone').value = cand.phone || '';
    document.getElementById('editRole').value = cand.role || 'PR';
    document.getElementById('editAdminNotes').value = cand.admin_notes || '';

    currentRoleData = cand.role_data || {};
    if (roleDataQuill) {
        roleDataQuill.root.innerHTML = JSON.stringify(currentRoleData, null, 2);
    }
}

async function loadMessages(candidatureId) {
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteurmsg')
            .select('*')
            .eq('inscription_id', candidatureId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        renderMessages(data || []);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement messages', 'error');
    }
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    if (messages.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun message.</p>';
        return;
    }
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender}">
            <div class="message-bubble">
                <div>${escapeHtml(msg.content)}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleString('fr-FR')}</div>
            </div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    if (!currentCandidatureId || !messageQuill) return;
    const content = messageQuill.root.innerHTML.trim();
    if (!content || content === '<p><br></p>') {
        showToast('Message vide', 'warning');
        return;
    }
    showLoader();
    const sendBtn = document.getElementById('sendMessageBtn');
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    try {
        const { error } = await supabaseSpacePublic
            .from('acteurmsg')
            .insert([{
                inscription_id: currentCandidatureId,
                sender: 'admin',
                content: content
            }]);
        if (error) throw error;
        messageQuill.root.innerHTML = '';
        await loadMessages(currentCandidatureId);
        showToast('Message envoyé', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur envoi message', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
        hideLoader();
    }
}

window.updateStatus = async (id, newStatus) => {
    if (!confirm(`Passer cette candidature en "${newStatus === 'approved' ? 'Validé' : newStatus === 'rejected' ? 'Refusé' : 'Suspendu'}" ?`)) return;
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('deveniracteur')
            .update({ status: newStatus })
            .eq('id', id);
        if (error) throw error;
        showToast('Statut mis à jour', 'success');
        if (id === currentCandidatureId) await loadCandidatureDetails(id);
        await loadCandidatures();
    } catch (err) {
        console.error(err);
        showToast('Erreur mise à jour statut', 'error');
    } finally {
        hideLoader();
    }
};

window.deleteCandidature = async (id) => {
    if (!confirm('Supprimer définitivement cette candidature et tous ses messages ?')) return;
    showLoader();
    try {
        const { error: delMsgs } = await supabaseSpacePublic
            .from('acteurmsg')
            .delete()
            .eq('inscription_id', id);
        if (delMsgs) console.warn(delMsgs);

        const { error: delCand } = await supabaseSpacePublic
            .from('deveniracteur')
            .delete()
            .eq('id', id);
        if (delCand) throw delCand;

        showToast('Candidature supprimée', 'success');
        if (currentCandidatureId === id) closeModal();
        await loadCandidatures();
    } catch (err) {
        console.error(err);
        showToast('Erreur suppression', 'error');
    } finally {
        hideLoader();
    }
};

window.openEditTab = async (id) => {
    await viewCandidature(id);
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tabEdit').classList.add('active');
    document.querySelector('.tab-btn[data-tab="edit"]').classList.add('active');
};

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = currentCandidatureId;
    if (!id) return;

    const full_name = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const role = document.getElementById('editRole').value;
    const admin_notes = document.getElementById('editAdminNotes').value.trim();
    let role_data = currentRoleData;
    try {
        if (roleDataQuill && roleDataQuill.root.innerHTML.trim()) {
            role_data = JSON.parse(roleDataQuill.root.innerHTML);
        }
    } catch (e) {
        showToast('Format JSON invalide pour les données spécifiques', 'error');
        return;
    }

    showLoader();
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    try {
        const { error } = await supabaseSpacePublic
            .from('deveniracteur')
            .update({
                full_name,
                email,
                phone,
                role,
                admin_notes,
                role_data
            })
            .eq('id', id);
        if (error) throw error;
        showToast('Modifications enregistrées', 'success');
        await loadCandidatureDetails(id);
        await loadCandidatures();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        hideLoader();
    }
});

window.closeModal = () => {
    document.getElementById('candidatureModal').classList.remove('active');
    currentCandidatureId = null;
};

document.getElementById('modalValid').addEventListener('click', () => {
    if (currentCandidatureId) updateStatus(currentCandidatureId, 'approved');
});
document.getElementById('modalPause').addEventListener('click', () => {
    if (currentCandidatureId) updateStatus(currentCandidatureId, 'suspended');
});
document.getElementById('modalReject').addEventListener('click', () => {
    if (currentCandidatureId) updateStatus(currentCandidatureId, 'rejected');
});
document.getElementById('modalDelete').addEventListener('click', () => {
    if (currentCandidatureId) deleteCandidature(currentCandidatureId);
});
document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
document.getElementById('refreshBtn').addEventListener('click', loadCandidatures);

document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
        btn.classList.add('active');
        if (tab === 'messages' && currentCandidatureId) {
            loadMessages(currentCandidatureId);
            setTimeout(() => {
                if (!messageQuill) {
                    messageQuill = new Quill('#messageEditor', { theme: 'snow', placeholder: 'Écrivez votre message...' });
                }
            }, 100);
        }
        if (tab === 'edit') {
            setTimeout(() => {
                if (!roleDataQuill) {
                    roleDataQuill = new Quill('#roleDataEditor', { theme: 'snow', placeholder: 'Données spécifiques (JSON valide)' });
                    roleDataQuill.on('text-change', () => {
                        const text = roleDataQuill.root.innerHTML;
                        document.getElementById('editRoleData').value = text;
                    });
                }
            }, 100);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    loadCandidatures();
    const modal = document.getElementById('candidatureModal');
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
});
