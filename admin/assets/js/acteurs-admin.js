const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentCandidature = null;
let currentMessageId = null;
let candMessageQuill = null;
let replyMessageQuill = null;
let sportifsData = [];
let donsData = [];
let temoignagesData = [];
let messagesData = [];
let candidaturesData = [];

// ========== UTILITAIRES ==========
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

// ========== CHARGEMENT DES DONNÉES ==========
async function loadSportifs() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_sportifs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        sportifsData = data || [];
        renderSportifs(sportifsData);
        updateStats();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement sportifs', 'error');
    } finally {
        hideLoader();
    }
}

function renderSportifs(list) {
    const container = document.getElementById('sportifsList');
    if (!container) return;
    const searchTerm = document.getElementById('searchSportifs')?.value.toLowerCase() || '';
    const filtered = list.filter(s => s.full_name?.toLowerCase().includes(searchTerm) || s.sport?.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun sportif.</p>';
        return;
    }
    container.innerHTML = filtered.map(s => `
        <div class="list-item" data-id="${s.id}">
            <div class="info">
                <strong>${escapeHtml(s.full_name)}</strong>
                <div class="details">
                    <span>${escapeHtml(s.sport)}</span>
                    <span>${escapeHtml(s.region || '')}</span>
                    <span class="status ${s.status || 'pending'}">${s.status === 'approved' ? 'Approuvé' : s.status === 'rejected' ? 'Rejeté' : 'En attente'}</span>
                </div>
            </div>
            <div class="actions">
                <button class="edit" data-id="${s.id}" data-type="sportif" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="delete" data-id="${s.id}" data-type="sportif" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    attachListActions();
}

async function loadDons() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_dons')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        donsData = data || [];
        renderDons(donsData);
        updateStats();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement dons', 'error');
    } finally {
        hideLoader();
    }
}

function renderDons(list) {
    const container = document.getElementById('donsList');
    if (!container) return;
    const searchTerm = document.getElementById('searchDons')?.value.toLowerCase() || '';
    const filtered = list.filter(d => d.title?.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun appel aux dons.</p>';
        return;
    }
    container.innerHTML = filtered.map(d => `
        <div class="list-item" data-id="${d.id}">
            <div class="info">
                <strong>${escapeHtml(d.title)}</strong>
                <div class="details">
                    <span>${escapeHtml(d.region || '')}</span>
                    <span class="status ${d.status || 'pending'}">${d.status === 'approved' ? 'Approuvé' : d.status === 'rejected' ? 'Rejeté' : 'En attente'}</span>
                </div>
            </div>
            <div class="actions">
                <button class="edit" data-id="${d.id}" data-type="don" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="delete" data-id="${d.id}" data-type="don" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    attachListActions();
}

async function loadTemoignages() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_temoignages')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        temoignagesData = data || [];
        renderTemoignages(temoignagesData);
        updateStats();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement témoignages', 'error');
    } finally {
        hideLoader();
    }
}

function renderTemoignages(list) {
    const container = document.getElementById('temoignagesList');
    if (!container) return;
    const searchTerm = document.getElementById('searchTemoignages')?.value.toLowerCase() || '';
    const filtered = list.filter(t => t.author?.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun témoignage.</p>';
        return;
    }
    container.innerHTML = filtered.map(t => `
        <div class="list-item" data-id="${t.id}">
            <div class="info">
                <strong>${escapeHtml(t.author)}</strong>
                <div class="details">
                    <span>${escapeHtml(t.content.substring(0, 50))}...</span>
                    <span class="status ${t.status || 'pending'}">${t.status === 'approved' ? 'Approuvé' : t.status === 'rejected' ? 'Rejeté' : 'En attente'}</span>
                </div>
            </div>
            <div class="actions">
                <button class="edit" data-id="${t.id}" data-type="temoignage" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="delete" data-id="${t.id}" data-type="temoignage" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    attachListActions();
}

async function loadMessages() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteurmsg')
            .select('*')
            .is('inscription_id', null)
            .order('created_at', { ascending: false });
        if (error) throw error;
        messagesData = data || [];
        renderMessages(messagesData);
        updateStats();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement messages', 'error');
    } finally {
        hideLoader();
    }
}

function renderMessages(list) {
    const container = document.getElementById('messagesList');
    if (!container) return;
    const searchTerm = document.getElementById('searchMessages')?.value.toLowerCase() || '';
    const filtered = list.filter(m => m.content?.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun message.</p>';
        return;
    }
    container.innerHTML = filtered.map(m => `
        <div class="list-item" data-id="${m.id}">
            <div class="info">
                <strong>Message du ${new Date(m.created_at).toLocaleString('fr-FR')}</strong>
                <div class="details">
                    <span>${escapeHtml(m.content.substring(0, 80))}...</span>
                    ${!m.read ? '<span class="status pending">Non lu</span>' : ''}
                </div>
            </div>
            <div class="actions">
                <button class="view" data-id="${m.id}" title="Voir et répondre"><i class="fas fa-eye"></i></button>
                <button class="delete" data-id="${m.id}" data-type="message" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    attachListActions();
}

async function loadCandidatures() {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('deveniracteur')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        candidaturesData = data || [];
        renderCandidatures(candidaturesData);
        updateStats();
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
    const searchTerm = document.getElementById('searchCandidatures')?.value.toLowerCase() || '';
    const filtered = list.filter(c => c.full_name?.toLowerCase().includes(searchTerm) || c.email?.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune candidature.</p>';
        return;
    }
    const roleLabels = { PR: 'Parrain', ST: 'Staff médical', CO: 'Coach', AG: 'Agent', AC: 'Académie', CL: 'Club', FO: 'Formateur' };
    container.innerHTML = filtered.map(c => `
        <div class="list-item" data-id="${c.id}">
            <div class="info">
                <strong>${escapeHtml(c.full_name)}</strong>
                <div class="details">
                    <span>${escapeHtml(roleLabels[c.role] || c.role)}</span>
                    <span>${escapeHtml(c.email)}</span>
                    <span class="status ${c.status || 'pending'}">${c.status === 'approved' ? 'Validé' : c.status === 'rejected' ? 'Refusé' : c.status === 'suspended' ? 'Suspendu' : 'En attente'}</span>
                </div>
            </div>
            <div class="actions">
                <button class="view" data-id="${c.id}" data-type="candidature" title="Voir détails"><i class="fas fa-eye"></i></button>
                <button class="delete" data-id="${c.id}" data-type="candidature" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    attachListActions();
}

function attachListActions() {
    document.querySelectorAll('.list-item .actions .edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            openItemModal(type, id);
        });
    });
    document.querySelectorAll('.list-item .actions .delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            deleteItem(type, id);
        });
    });
    document.querySelectorAll('.list-item .actions .view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            if (type === 'message') openMessageModal(id);
            else if (type === 'candidature') viewCandidature(id);
        });
    });
}

function updateStats() {
    document.getElementById('statSportifs').textContent = sportifsData.length;
    document.getElementById('statDons').textContent = donsData.length;
    const totalCollecte = donsData.reduce((sum, d) => sum + (d.amount_needed || 0), 0);
    document.getElementById('statCollecte').textContent = totalCollecte.toLocaleString('fr-FR') + ' FCFA';
    const unread = messagesData.filter(m => !m.read).length;
    document.getElementById('statMessages').textContent = unread;
}

// ========== GESTION DES ITEMS (sportifs, dons, témoignages) ==========
async function openItemModal(type, id = null) {
    document.getElementById('itemType').value = type;
    document.getElementById('itemId').value = id || '';
    const title = { sportif: 'Sportif', don: 'Appel aux dons', temoignage: 'Témoignage' }[type];
    document.getElementById('itemModalTitle').textContent = id ? `Modifier ${title}` : `Ajouter ${title}`;
    const fieldsDiv = document.getElementById('dynamicFields');
    let data = null;
    if (type === 'sportif') data = sportifsData.find(s => s.id == id);
    else if (type === 'don') data = donsData.find(d => d.id == id);
    else if (type === 'temoignage') data = temoignagesData.find(t => t.id == id);

    if (type === 'sportif') {
        fieldsDiv.innerHTML = `
            <div class="form-group"><label>Nom complet *</label><input type="text" id="sportifFullName" value="${escapeHtml(data?.full_name || '')}" required></div>
            <div class="form-group"><label>Sport *</label><input type="text" id="sportifSport" value="${escapeHtml(data?.sport || '')}" required></div>
            <div class="form-group"><label>Région</label><input type="text" id="sportifRegion" value="${escapeHtml(data?.region || '')}"></div>
            <div class="form-group"><label>Description</label><textarea id="sportifDescription" rows="3">${escapeHtml(data?.description || '')}</textarea></div>
        `;
    } else if (type === 'don') {
        fieldsDiv.innerHTML = `
            <div class="form-group"><label>Titre *</label><input type="text" id="donTitle" value="${escapeHtml(data?.title || '')}" required></div>
            <div class="form-group"><label>Description</label><textarea id="donDescription" rows="3">${escapeHtml(data?.description || '')}</textarea></div>
            <div class="form-group"><label>Région</label><input type="text" id="donRegion" value="${escapeHtml(data?.region || '')}"></div>
            <div class="form-group"><label>Montant nécessaire (FCFA)</label><input type="number" id="donAmount" value="${data?.amount_needed || ''}"></div>
        `;
    } else if (type === 'temoignage') {
        fieldsDiv.innerHTML = `
            <div class="form-group"><label>Auteur *</label><input type="text" id="temoignageAuthor" value="${escapeHtml(data?.author || '')}" required></div>
            <div class="form-group"><label>Contenu *</label><textarea id="temoignageContent" rows="4" required>${escapeHtml(data?.content || '')}</textarea></div>
        `;
    }

    // Réinitialiser les champs d'upload
    const imageBox = document.getElementById('uploadImage');
    const videoBox = document.getElementById('uploadVideo');
    imageBox.querySelector('input[type="file"]').value = '';
    videoBox.querySelector('input[type="file"]').value = '';
    imageBox.classList.remove('uploading', 'success');
    videoBox.classList.remove('uploading', 'success');
    const progressIndicators = imageBox.querySelectorAll('.progress-indicator, .progress-text, .progress-bar');
    progressIndicators.forEach(el => el.style.display = 'none');
    document.getElementById('itemStatus').value = data?.status || 'pending';
    document.getElementById('itemAdminNotes').value = data?.admin_notes || '';

    document.getElementById('itemModal').classList.add('active');
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('active');
}

async function uploadFileWithProgress(file, box, type) {
    return new Promise((resolve, reject) => {
        const fileName = `admin_${type}_${Date.now()}.${file.name.split('.').pop()}`;
        supabaseSpacePublic.storage
            .from('documents')
            .createSignedUploadUrl(fileName)
            .then(({ data, error }) => {
                if (error) {
                    reject(error);
                    return;
                }
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', data.signedUrl, true);
                xhr.setRequestHeader('Content-Type', file.type);
                const indicator = box.querySelector('.progress-indicator');
                const progressBar = box.querySelector('.progress-bar');
                const progressText = box.querySelector('.progress-text');
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        const dashOffset = 113.1 * (1 - percent / 100);
                        if (progressBar) progressBar.style.strokeDashoffset = dashOffset;
                        if (progressText) progressText.textContent = percent + '%';
                    }
                });
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        box.classList.add('success');
                        box.classList.remove('uploading');
                        if (progressText) progressText.textContent = '✓';
                        resolve(fileName);
                    } else {
                        box.classList.remove('uploading');
                        reject(new Error('Upload failed'));
                    }
                });
                xhr.addEventListener('error', () => {
                    box.classList.remove('uploading');
                    reject(new Error('Network error'));
                });
                box.classList.add('uploading');
                if (indicator) indicator.style.display = 'flex';
                xhr.send(file);
            })
            .catch(reject);
    });
}

document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('itemType').value;
    const id = document.getElementById('itemId').value;
    const status = document.getElementById('itemStatus').value;
    const admin_notes = document.getElementById('itemAdminNotes').value;

    let data = {};
    if (type === 'sportif') {
        data.full_name = document.getElementById('sportifFullName').value.trim();
        data.sport = document.getElementById('sportifSport').value.trim();
        data.region = document.getElementById('sportifRegion').value.trim() || null;
        data.description = document.getElementById('sportifDescription').value.trim() || null;
    } else if (type === 'don') {
        data.title = document.getElementById('donTitle').value.trim();
        data.description = document.getElementById('donDescription').value.trim() || null;
        data.region = document.getElementById('donRegion').value.trim() || null;
        data.amount_needed = parseFloat(document.getElementById('donAmount').value) || null;
    } else if (type === 'temoignage') {
        data.author = document.getElementById('temoignageAuthor').value.trim();
        data.content = document.getElementById('temoignageContent').value.trim();
    }

    const imageFile = document.getElementById('imageFile').files[0];
    const videoFile = document.getElementById('videoFile').files[0];
    showLoader();
    try {
        let imageUrl = null, videoUrl = null;
        if (imageFile) {
            const imageBox = document.getElementById('uploadImage');
            imageUrl = await uploadFileWithProgress(imageFile, imageBox, 'image');
        }
        if (videoFile) {
            const videoBox = document.getElementById('uploadVideo');
            videoUrl = await uploadFileWithProgress(videoFile, videoBox, 'video');
        }
        if (imageUrl) data.image_url = imageUrl;
        if (videoUrl) data.video_url = videoUrl;
        if (status) data.status = status;
        if (admin_notes) data.admin_notes = admin_notes;

        let table = '';
        if (type === 'sportif') table = 'acteur_sportifs';
        else if (type === 'don') table = 'acteur_dons';
        else if (type === 'temoignage') table = 'acteur_temoignages';

        if (id) {
            const { error } = await supabaseSpacePublic.from(table).update(data).eq('id', id);
            if (error) throw error;
            showToast(`${type} modifié avec succès`, 'success');
        } else {
            const { error } = await supabaseSpacePublic.from(table).insert([data]);
            if (error) throw error;
            showToast(`${type} ajouté avec succès`, 'success');
        }
        closeItemModal();
        if (type === 'sportif') await loadSportifs();
        else if (type === 'don') await loadDons();
        else if (type === 'temoignage') await loadTemoignages();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        hideLoader();
    }
});

// ========== SUPPRESSION ==========
async function deleteItem(type, id) {
    if (!confirm(`Supprimer définitivement cet élément ?`)) return;
    showLoader();
    try {
        let table = '';
        if (type === 'sportif') table = 'acteur_sportifs';
        else if (type === 'don') table = 'acteur_dons';
        else if (type === 'temoignage') table = 'acteur_temoignages';
        else if (type === 'message') table = 'acteurmsg';
        else if (type === 'candidature') table = 'deveniracteur';
        const { error } = await supabaseSpacePublic.from(table).delete().eq('id', id);
        if (error) throw error;
        showToast('Supprimé avec succès', 'success');
        if (type === 'sportif') await loadSportifs();
        else if (type === 'don') await loadDons();
        else if (type === 'temoignage') await loadTemoignages();
        else if (type === 'message') await loadMessages();
        else if (type === 'candidature') await loadCandidatures();
    } catch (err) {
        console.error(err);
        showToast('Erreur suppression', 'error');
    } finally {
        hideLoader();
    }
}

// ========== MESSAGES DE CONTACT ==========
async function openMessageModal(id) {
    const message = messagesData.find(m => m.id == id);
    if (!message) return;
    currentMessageId = id;
    if (!replyMessageQuill) {
        replyMessageQuill = new Quill('#replyMessageEditor', { theme: 'snow', placeholder: 'Écrivez votre réponse...' });
    }
    const container = document.getElementById('messageDetail');
    container.innerHTML = `
        <div class="detail-item"><strong>Date :</strong> ${new Date(message.created_at).toLocaleString('fr-FR')}</div>
        <div class="detail-item"><strong>Message :</strong><br>${escapeHtml(message.content)}</div>
    `;
    document.getElementById('messageModal').classList.add('active');
    // Marquer comme lu
    if (!message.read) {
        await supabaseSpacePublic.from('acteurmsg').update({ read: true }).eq('id', id);
        message.read = true;
        renderMessages(messagesData);
        updateStats();
    }
}

function closeMessageModal() {
    document.getElementById('messageModal').classList.remove('active');
    currentMessageId = null;
}

document.getElementById('sendReplyBtn').addEventListener('click', async () => {
    if (!currentMessageId || !replyMessageQuill) return;
    const content = replyMessageQuill.root.innerHTML.trim();
    if (!content || content === '<p><br></p>') {
        showToast('Message vide', 'warning');
        return;
    }
    showLoader();
    try {
        const { error } = await supabaseSpacePublic.from('acteurmsg').insert([{
            inscription_id: null,
            sender: 'admin',
            content: content
        }]);
        if (error) throw error;
        replyMessageQuill.root.innerHTML = '';
        showToast('Réponse envoyée', 'success');
        closeMessageModal();
        await loadMessages();
    } catch (err) {
        console.error(err);
        showToast('Erreur envoi réponse', 'error');
    } finally {
        hideLoader();
    }
});

// ========== GESTION DES CANDIDATURES ==========
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
    const roleLabels = { PR: 'Parrain', ST: 'Staff médical', CO: 'Coach', AG: 'Agent', AC: 'Académie', CL: 'Club', FO: 'Formateur' };
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
        <div class="detail-status"><strong>Statut :</strong> <span class="status-badge ${cand.status === 'approved' ? 'valide' : cand.status === 'rejected' ? 'refuse' : 'en_attente'}">${cand.status === 'approved' ? 'Validé' : cand.status === 'rejected' ? 'Refusé' : cand.status === 'suspended' ? 'Suspendu' : 'En attente'}</span></div>
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
        const { data, error } = await supabaseSpacePublic
            .from('acteurmsg')
            .select('*')
            .eq('inscription_id', inscriptionId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        renderCandMessages(data || []);
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
        const { error } = await supabaseSpacePublic.from('deveniracteur').update({ status: status }).eq('id', id);
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
        await supabaseSpacePublic.from('acteurmsg').delete().eq('inscription_id', id);
        const { error } = await supabaseSpacePublic.from('deveniracteur').delete().eq('id', id);
        if (error) throw error;
        showToast('Candidature supprimée', 'success');
        if (currentCandidature === id) closeCandidatureModal();
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
        const { error } = await supabaseSpacePublic.from('deveniracteur').update(updated).eq('id', currentCandidature);
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

function closeCandidatureModal() {
    document.getElementById('candidatureModal').classList.remove('active');
    currentCandidature = null;
}

// ========== BOUTONS D'AJOUT (modales) ==========
document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        openItemModal(type);
    });
});

// ========== RAFFRAÎCHISSEMENT ==========
document.getElementById('refreshSportifsBtn').addEventListener('click', loadSportifs);
document.getElementById('refreshDonsBtn').addEventListener('click', loadDons);
document.getElementById('refreshTemoignagesBtn').addEventListener('click', loadTemoignages);
document.getElementById('refreshMessagesBtn').addEventListener('click', loadMessages);
document.getElementById('refreshCandidaturesBtn').addEventListener('click', loadCandidatures);

// ========== RECHERCHE EN TEMPS RÉEL ==========
document.getElementById('searchSportifs').addEventListener('input', () => renderSportifs(sportifsData));
document.getElementById('searchDons').addEventListener('input', () => renderDons(donsData));
document.getElementById('searchTemoignages').addEventListener('input', () => renderTemoignages(temoignagesData));
document.getElementById('searchMessages').addEventListener('input', () => renderMessages(messagesData));
document.getElementById('searchCandidatures').addEventListener('input', () => renderCandidatures(candidaturesData));

// ========== BOUTONS DE LA MODALE CANDIDATURE ==========
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

// ========== ONGLETS DE LA MODALE CANDIDATURE ==========
document.querySelectorAll('#candidatureModal .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        const target = document.getElementById(`cand${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
        if (!target) return;
        document.querySelectorAll('#candidatureModal .tab-pane').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('#candidatureModal .tab-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        btn.classList.add('active');
    });
});

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadSportifs(),
        loadDons(),
        loadTemoignages(),
        loadMessages(),
        loadCandidatures()
    ]);
    const modal = document.getElementById('candidatureModal');
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeCandidatureModal();
    });
    const messageModal = document.getElementById('messageModal');
    window.addEventListener('click', (e) => {
        if (e.target === messageModal) closeMessageModal();
    });
    const itemModal = document.getElementById('itemModal');
    window.addEventListener('click', (e) => {
        if (e.target === itemModal) closeItemModal();
    });
});

// ========== DÉCONNEXION ==========
document.getElementById('logoutAdmin').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});
