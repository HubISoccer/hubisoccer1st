const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentCandidature = null;
let candMessageQuill = null;
let sportifsList = [];
let donsList = [];
let temoignagesList = [];

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

// ========== CANDIDATURES ==========
async function loadCandidatures() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('deveniracteur')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        renderCandidatures(data || []);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement candidatures', 'error');
    } finally {
        hideLoader();
    }
}

function renderCandidatures(list) {
    const container = document.getElementById('candidaturesList');
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune candidature.</p>';
        return;
    }
    container.innerHTML = list.map(c => {
        const statusClass = { pending: 'pending', approved: 'approved', rejected: 'rejected', suspended: 'suspended' }[c.status] || 'pending';
        const statusText = { pending: 'En attente', approved: 'Validé', rejected: 'Rejeté', suspended: 'Suspendu' }[c.status] || c.status;
        return `
            <div class="list-item" data-id="${c.id}">
                <div class="info">
                    <strong>${escapeHtml(c.full_name)}</strong>
                    <div class="details">
                        <span>${escapeHtml(c.role)}</span>
                        <span>${escapeHtml(c.email)}</span>
                    </div>
                    <span class="status ${statusClass}">${statusText}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewCandidature('${c.id}')" title="Voir détails"><i class="fas fa-eye"></i></button>
                    <button class="delete" onclick="deleteCandidature('${c.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.viewCandidature = async (id) => {
    currentCandidature = id;
    await loadCandidatureDetails(id);
    document.getElementById('candidatureModal').classList.add('active');
    document.querySelectorAll('#candidatureModal .tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#candidatureModal .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('candDetailsTab').classList.add('active');
    document.querySelector('#candidatureModal .tab-btn[data-tab="candDetails"]').classList.add('active');
};

async function loadCandidatureDetails(id) {
    showLoader();
    try {
        const { data: cand, error } = await supabaseSpacePublic
            .from('deveniracteur')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        displayCandidatureDetails(cand);
        populateEditCandForm(cand);
        await loadCandMessages(id);
        if (!candMessageQuill) {
            candMessageQuill = new Quill('#candMessageEditor', { theme: 'snow', placeholder: 'Écrivez votre message...' });
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement détails', 'error');
    } finally {
        hideLoader();
    }
}

function displayCandidatureDetails(cand) {
    const container = document.getElementById('candidatureDetails');
    const submitDate = cand.created_at ? new Date(cand.created_at).toLocaleString('fr-FR') : '-';
    const fileUrl = cand.document_file ? `https://wxlpcflanihqwumjwpjs.supabase.co/storage/v1/object/public/documents/${cand.document_file}` : null;
    const roleLabels = {
        PR: 'Parrain', ST: 'Staff médical', CO: 'Coach', AG: 'Agent',
        AC: 'Académie', CL: 'Club', FO: 'Formateur'
    };
    const roleName = roleLabels[cand.role] || cand.role;
    container.innerHTML = `
        <div class="modal-details-grid">
            <div class="detail-item"><span class="detail-icon">🆔</span> <strong>ID :</strong> ${escapeHtml(cand.id)}</div>
            <div class="detail-item"><span class="detail-icon">👤</span> <strong>Nom :</strong> ${escapeHtml(cand.full_name)}</div>
            <div class="detail-item"><span class="detail-icon">📧</span> <strong>Email :</strong> ${escapeHtml(cand.email)}</div>
            <div class="detail-item"><span class="detail-icon">📞</span> <strong>Téléphone :</strong> ${escapeHtml(cand.phone)}</div>
            <div class="detail-item"><span class="detail-icon">🎭</span> <strong>Rôle :</strong> ${escapeHtml(roleName)}</div>
            <div class="detail-item"><span class="detail-icon">📄</span> <strong>Justificatif :</strong> ${fileUrl ? `<a href="${fileUrl}" target="_blank">Télécharger</a>` : 'Aucun'}</div>
            <div class="detail-item"><span class="detail-icon">⏰</span> <strong>Soumission :</strong> ${submitDate}</div>
        </div>
        ${cand.role_data?.additional_info ? `<div class="detail-item"><strong>Informations :</strong> ${escapeHtml(cand.role_data.additional_info)}</div>` : ''}
        <div class="detail-status">
            <strong>Statut :</strong> <span class="status-badge ${cand.status === 'approved' ? 'valide' : cand.status === 'rejected' ? 'refuse' : cand.status === 'suspended' ? 'en_attente' : 'en_attente'}">${cand.status === 'approved' ? 'Validé' : cand.status === 'rejected' ? 'Refusé' : cand.status === 'suspended' ? 'Suspendu' : 'En attente'}</span>
        </div>
        ${cand.admin_notes ? `<div class="admin-notes"><strong>Notes admin :</strong><br>${escapeHtml(cand.admin_notes)}</div>` : ''}
    `;
}

function populateEditCandForm(cand) {
    document.getElementById('editCandFullName').value = cand.full_name || '';
    document.getElementById('editCandEmail').value = cand.email || '';
    document.getElementById('editCandPhone').value = cand.phone || '';
    document.getElementById('editCandRole').value = cand.role || 'PR';
    document.getElementById('editCandAdminNotes').value = cand.admin_notes || '';
}

async function loadCandMessages(inscriptionId) {
    try {
        const { data: messages, error } = await supabaseSpacePublic
            .from('acteurmsg')
            .select('*')
            .eq('inscription_id', inscriptionId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        renderCandMessages(messages || []);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement messages', 'error');
    }
}

function renderCandMessages(messages) {
    const container = document.getElementById('candMessagesContainer');
    if (!container) return;
    if (messages.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun message.</p>';
        return;
    }
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender}">
            <div class="message-bubble">
                <div>${msg.content}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleString('fr-FR')}</div>
            </div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendCandMessage() {
    if (!currentCandidature || !candMessageQuill) return;
    const content = candMessageQuill.root.innerHTML.trim();
    if (!content || content === '<p><br></p>') {
        showToast('Message vide', 'warning');
        return;
    }
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('acteurmsg')
            .insert([{
                inscription_id: currentCandidature,
                sender: 'admin',
                content: content
            }]);
        if (error) throw error;
        candMessageQuill.root.innerHTML = '';
        await loadCandMessages(currentCandidature);
        showToast('Message envoyé', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur envoi message', 'error');
    } finally {
        hideLoader();
    }
}

window.updateCandidatureStatus = async (id, status) => {
    if (!confirm(`Passer cette candidature en "${status === 'approved' ? 'Validé' : status === 'rejected' ? 'Refusé' : 'Suspendu'}" ?`)) return;
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('deveniracteur')
            .update({ status: status })
            .eq('id', id);
        if (error) throw error;
        showToast('Statut mis à jour', 'success');
        if (id === currentCandidature) await loadCandidatureDetails(id);
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
        if (currentCandidature === id) closeModal();
        await loadCandidatures();
    } catch (err) {
        console.error(err);
        showToast('Erreur suppression', 'error');
    } finally {
        hideLoader();
    }
};

document.getElementById('editCandidatureForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCandidature) return;
    const updated = {
        full_name: document.getElementById('editCandFullName').value.trim(),
        email: document.getElementById('editCandEmail').value.trim(),
        phone: document.getElementById('editCandPhone').value.trim(),
        role: document.getElementById('editCandRole').value,
        admin_notes: document.getElementById('editCandAdminNotes').value.trim()
    };
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('deveniracteur')
            .update(updated)
            .eq('id', currentCandidature);
        if (error) throw error;
        showToast('Candidature modifiée', 'success');
        await loadCandidatureDetails(currentCandidature);
        await loadCandidatures();
    } catch (err) {
        console.error(err);
        showToast('Erreur modification', 'error');
    } finally {
        hideLoader();
    }
});

// ========== SPORTIFS ==========
async function loadSportifs() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_sportifs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        sportifsList = data || [];
        renderSportifs();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement sportifs', 'error');
    } finally {
        hideLoader();
    }
}

function renderSportifs() {
    const container = document.getElementById('sportifsList');
    if (!container) return;
    if (sportifsList.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun sportif.</p>';
        return;
    }
    container.innerHTML = sportifsList.map(s => `
        <div class="list-item" data-id="${s.id}">
            <div class="info">
                <strong>${escapeHtml(s.full_name)}</strong>
                <div class="details">
                    <span>${escapeHtml(s.sport)}</span>
                    <span>${escapeHtml(s.region || '')}</span>
                </div>
            </div>
            <div class="actions">
                <button class="edit" onclick="editSportif('${s.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="delete" onclick="deleteSportif('${s.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editSportif = (id) => {
    const sportif = sportifsList.find(s => s.id == id);
    if (!sportif) return;
    document.getElementById('sportifId').value = sportif.id;
    document.getElementById('sportifFullName').value = sportif.full_name;
    document.getElementById('sportifSport').value = sportif.sport;
    document.getElementById('sportifRegion').value = sportif.region || '';
    document.getElementById('sportifDescription').value = sportif.description || '';
    document.getElementById('sportifImageUrl').value = sportif.image_url || '';
    document.getElementById('sportifModalTitle').textContent = 'Modifier le sportif';
    document.getElementById('sportifModal').classList.add('active');
};

window.deleteSportif = async (id) => {
    if (!confirm('Supprimer ce sportif ?')) return;
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('acteur_sportifs')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Sportif supprimé', 'success');
        await loadSportifs();
    } catch (err) {
        console.error(err);
        showToast('Erreur suppression', 'error');
    } finally {
        hideLoader();
    }
};

// ========== DONS ==========
async function loadDons() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_dons')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        donsList = data || [];
        renderDons();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement dons', 'error');
    } finally {
        hideLoader();
    }
}

function renderDons() {
    const container = document.getElementById('donsList');
    if (!container) return;
    if (donsList.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun appel aux dons.</p>';
        return;
    }
    container.innerHTML = donsList.map(d => `
        <div class="list-item" data-id="${d.id}">
            <div class="info">
                <strong>${escapeHtml(d.title)}</strong>
                <div class="details">
                    <span>${escapeHtml(d.region || '')}</span>
                </div>
            </div>
            <div class="actions">
                <button class="edit" onclick="editDon('${d.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="delete" onclick="deleteDon('${d.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editDon = (id) => {
    const don = donsList.find(d => d.id == id);
    if (!don) return;
    document.getElementById('donId').value = don.id;
    document.getElementById('donTitle').value = don.title;
    document.getElementById('donDescription').value = don.description || '';
    document.getElementById('donRegion').value = don.region || '';
    document.getElementById('donImageUrl').value = don.image_url || '';
    document.getElementById('donModalTitle').textContent = 'Modifier l\'appel aux dons';
    document.getElementById('donModal').classList.add('active');
};

window.deleteDon = async (id) => {
    if (!confirm('Supprimer cet appel aux dons ?')) return;
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('acteur_dons')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Appel aux dons supprimé', 'success');
        await loadDons();
    } catch (err) {
        console.error(err);
        showToast('Erreur suppression', 'error');
    } finally {
        hideLoader();
    }
};

// ========== TÉMOIGNAGES ==========
async function loadTemoignages() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_temoignages')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        temoignagesList = data || [];
        renderTemoignages();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement témoignages', 'error');
    } finally {
        hideLoader();
    }
}

function renderTemoignages() {
    const container = document.getElementById('temoignagesList');
    if (!container) return;
    if (temoignagesList.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun témoignage.</p>';
        return;
    }
    container.innerHTML = temoignagesList.map(t => `
        <div class="list-item" data-id="${t.id}">
            <div class="info">
                <strong>${escapeHtml(t.author)}</strong>
                <div class="details">
                    <span>${escapeHtml(t.content.substring(0, 50))}...</span>
                </div>
            </div>
            <div class="actions">
                <button class="edit" onclick="editTemoignage('${t.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="delete" onclick="deleteTemoignage('${t.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editTemoignage = (id) => {
    const temoignage = temoignagesList.find(t => t.id == id);
    if (!temoignage) return;
    document.getElementById('temoignageId').value = temoignage.id;
    document.getElementById('temoignageAuthor').value = temoignage.author;
    document.getElementById('temoignageContent').value = temoignage.content;
    document.getElementById('temoignageModalTitle').textContent = 'Modifier le témoignage';
    document.getElementById('temoignageModal').classList.add('active');
};

window.deleteTemoignage = async (id) => {
    if (!confirm('Supprimer ce témoignage ?')) return;
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('acteur_temoignages')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Témoignage supprimé', 'success');
        await loadTemoignages();
    } catch (err) {
        console.error(err);
        showToast('Erreur suppression', 'error');
    } finally {
        hideLoader();
    }
};

// ========== FORMULAIRES D'AJOUT/MODIFICATION ==========
document.getElementById('sportifForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('sportifId').value;
    const data = {
        full_name: document.getElementById('sportifFullName').value.trim(),
        sport: document.getElementById('sportifSport').value.trim(),
        region: document.getElementById('sportifRegion').value.trim() || null,
        description: document.getElementById('sportifDescription').value.trim() || null,
        image_url: document.getElementById('sportifImageUrl').value.trim() || null
    };
    showLoader();
    try {
        if (id) {
            const { error } = await supabaseSpacePublic
                .from('acteur_sportifs')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            showToast('Sportif modifié', 'success');
        } else {
            const { error } = await supabaseSpacePublic
                .from('acteur_sportifs')
                .insert([data]);
            if (error) throw error;
            showToast('Sportif ajouté', 'success');
        }
        closeSportifModal();
        await loadSportifs();
    } catch (err) {
        console.error(err);
        showToast('Erreur', 'error');
    } finally {
        hideLoader();
    }
});

document.getElementById('donForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('donId').value;
    const data = {
        title: document.getElementById('donTitle').value.trim(),
        description: document.getElementById('donDescription').value.trim() || null,
        region: document.getElementById('donRegion').value.trim() || null,
        image_url: document.getElementById('donImageUrl').value.trim() || null
    };
    showLoader();
    try {
        if (id) {
            const { error } = await supabaseSpacePublic
                .from('acteur_dons')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            showToast('Appel aux dons modifié', 'success');
        } else {
            const { error } = await supabaseSpacePublic
                .from('acteur_dons')
                .insert([data]);
            if (error) throw error;
            showToast('Appel aux dons ajouté', 'success');
        }
        closeDonModal();
        await loadDons();
    } catch (err) {
        console.error(err);
        showToast('Erreur', 'error');
    } finally {
        hideLoader();
    }
});

document.getElementById('temoignageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('temoignageId').value;
    const data = {
        author: document.getElementById('temoignageAuthor').value.trim(),
        content: document.getElementById('temoignageContent').value.trim()
    };
    showLoader();
    try {
        if (id) {
            const { error } = await supabaseSpacePublic
                .from('acteur_temoignages')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            showToast('Témoignage modifié', 'success');
        } else {
            const { error } = await supabaseSpacePublic
                .from('acteur_temoignages')
                .insert([data]);
            if (error) throw error;
            showToast('Témoignage ajouté', 'success');
        }
        closeTemoignageModal();
        await loadTemoignages();
    } catch (err) {
        console.error(err);
        showToast('Erreur', 'error');
    } finally {
        hideLoader();
    }
});

// ========== MODALES ==========
function closeModal() {
    document.getElementById('candidatureModal').classList.remove('active');
    currentCandidature = null;
}
function closeSportifModal() { document.getElementById('sportifModal').classList.remove('active'); document.getElementById('sportifForm').reset(); document.getElementById('sportifId').value = ''; }
function closeDonModal() { document.getElementById('donModal').classList.remove('active'); document.getElementById('donForm').reset(); document.getElementById('donId').value = ''; }
function closeTemoignageModal() { document.getElementById('temoignageModal').classList.remove('active'); document.getElementById('temoignageForm').reset(); document.getElementById('temoignageId').value = ''; }

// ========== BOUTONS D'AJOUT ==========
document.getElementById('addSportifBtn').addEventListener('click', () => {
    document.getElementById('sportifModalTitle').textContent = 'Ajouter un sportif';
    document.getElementById('sportifId').value = '';
    document.getElementById('sportifForm').reset();
    document.getElementById('sportifModal').classList.add('active');
});
document.getElementById('addDonBtn').addEventListener('click', () => {
    document.getElementById('donModalTitle').textContent = 'Ajouter un appel aux dons';
    document.getElementById('donId').value = '';
    document.getElementById('donForm').reset();
    document.getElementById('donModal').classList.add('active');
});
document.getElementById('addTemoignageBtn').addEventListener('click', () => {
    document.getElementById('temoignageModalTitle').textContent = 'Ajouter un témoignage';
    document.getElementById('temoignageId').value = '';
    document.getElementById('temoignageForm').reset();
    document.getElementById('temoignageModal').classList.add('active');
});

// ========== BOUTONS D'ACTIONS SUR CANDIDATURE ==========
document.getElementById('validCandidatureBtn').addEventListener('click', () => {
    if (currentCandidature) updateCandidatureStatus(currentCandidature, 'approved');
});
document.getElementById('pauseCandidatureBtn').addEventListener('click', () => {
    if (currentCandidature) updateCandidatureStatus(currentCandidature, 'suspended');
});
document.getElementById('rejectCandidatureBtn').addEventListener('click', () => {
    if (currentCandidature) updateCandidatureStatus(currentCandidature, 'rejected');
});
document.getElementById('deleteCandidatureBtn').addEventListener('click', () => {
    if (currentCandidature) deleteCandidature(currentCandidature);
});
document.getElementById('sendCandMessageBtn').addEventListener('click', sendCandMessage);

// ========== RAFFRAÎCHISSEMENT ==========
document.getElementById('refreshCandidaturesBtn').addEventListener('click', loadCandidatures);
document.getElementById('refreshSportifsBtn').addEventListener('click', loadSportifs);
document.getElementById('refreshDonsBtn').addEventListener('click', loadDons);
document.getElementById('refreshTemoignagesBtn').addEventListener('click', loadTemoignages);

// ========== ONGLETS PRINCIPAUX ==========
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    if (tabId === 'candidatures') loadCandidatures();
    else if (tabId === 'sportifs') loadSportifs();
    else if (tabId === 'dons') loadDons();
    else if (tabId === 'temoignages') loadTemoignages();
}
document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});
// Onglets internes de la modale
document.querySelectorAll('#candidatureModal .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('#candidatureModal .tab-pane').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('#candidatureModal .tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`cand${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
        btn.classList.add('active');
    });
});

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    loadCandidatures();
    const modal = document.getElementById('candidatureModal');
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    // Déconnexion
    document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Déconnexion ?')) {
            window.location.href = '../../index.html';
        }
    });
});
