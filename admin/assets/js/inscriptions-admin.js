const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentInscriptionId = null;
let currentSportData = {};
let sportDataQuill = null;
let diplomaQuill = null;
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

async function loadInscriptions() {
    showLoader();
    try {
        const { data: inscriptions, error } = await supabaseSpacePublic
            .from('inscriptions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderInscriptionsList(inscriptions || []);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement inscriptions', 'error');
    } finally {
        hideLoader();
    }
}

function renderInscriptionsList(inscriptions) {
    const container = document.getElementById('inscriptionsList');
    if (!container) return;
    if (inscriptions.length === 0) {
        container.innerHTML = '<p class="no-data">Aucune inscription.</p>';
        return;
    }

    container.innerHTML = inscriptions.map(ins => {
        const statusMap = {
            pending: { class: 'en_attente', text: 'En attente' },
            approved: { class: 'valide', text: 'Validé' },
            rejected: { class: 'refuse', text: 'Refusé' },
            suspended: { class: 'en_attente', text: 'Suspendu' }
        };
        const status = statusMap[ins.status] || statusMap.pending;
        const birthDate = ins.birth_date ? new Date(ins.birth_date).toLocaleDateString('fr-FR') : '??';
        return `
            <div class="list-item" data-id="${ins.id}">
                <div class="info">
                    <strong>${escapeHtml(ins.full_name)}</strong>
                    <div class="details">
                        <span>${birthDate}</span>
                        <span>${escapeHtml(ins.sport)}</span>
                        <span>${escapeHtml(ins.phone)}</span>
                    </div>
                    <span class="status ${status.class}">${status.text}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewInscription('${ins.id}')" title="Voir détails"><i class="fas fa-eye"></i></button>
                    <button class="valid" onclick="updateStatus('${ins.id}', 'approved')" title="Valider"><i class="fas fa-check"></i></button>
                    <button class="reject" onclick="updateStatus('${ins.id}', 'rejected')" title="Rejeter"><i class="fas fa-times"></i></button>
                    <button class="edit" onclick="openEditTab('${ins.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteInscription('${ins.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.viewInscription = async (id) => {
    currentInscriptionId = id;
    await loadInscriptionDetails(id);
    document.getElementById('inscriptionModal').classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tabDetails').classList.add('active');
    document.querySelector('.tab-btn[data-tab="details"]').classList.add('active');
};

async function loadInscriptionDetails(id) {
    showLoader();
    try {
        const { data: ins, error } = await supabaseSpacePublic
            .from('inscriptions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        displayDetails(ins);
        loadMessages(id);
        populateEditForm(ins);
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement détails', 'error');
    } finally {
        hideLoader();
    }
}

function displayDetails(ins) {
    const modalDetails = document.getElementById('modalDetails');
    const birthDate = ins.birth_date ? new Date(ins.birth_date).toLocaleDateString('fr-FR') : '-';
    const submitDate = ins.created_at ? new Date(ins.created_at).toLocaleString('fr-FR') : '-';
    const parent = ins.parent_name ? `<div class="detail-item"><span class="detail-icon">👪</span> <strong>Parent / tuteur :</strong> ${escapeHtml(ins.parent_name)}</div>` : '';

    const diplomaUrl = ins.diploma_file ? `https://wxlpcflanihqwumjwpjs.supabase.co/storage/v1/object/public/documents/${ins.diploma_file}` : null;
    const idCardUrl = ins.id_card_file ? `https://wxlpcflanihqwumjwpjs.supabase.co/storage/v1/object/public/documents/${ins.id_card_file}` : null;

    const sportDataHtml = ins.sport_data ? Object.entries(ins.sport_data).map(([k, v]) => `<div class="detail-item"><span class="detail-icon">🏅</span> <strong>${formatSportKey(k)} :</strong> ${escapeHtml(v)}</div>`).join('') : '';

    modalDetails.innerHTML = `
        <div class="modal-details-grid">
            <div class="detail-item"><span class="detail-icon">🆔</span> <strong>ID :</strong> ${escapeHtml(ins.id)}</div>
            <div class="detail-item"><span class="detail-icon">👤</span> <strong>Nom :</strong> ${escapeHtml(ins.full_name)}</div>
            <div class="detail-item"><span class="detail-icon">📅</span> <strong>Naissance :</strong> ${birthDate}</div>
            <div class="detail-item"><span class="detail-icon">⚽</span> <strong>Sport :</strong> ${escapeHtml(ins.sport)}</div>
            <div class="detail-item"><span class="detail-icon">📞</span> <strong>Téléphone :</strong> ${escapeHtml(ins.phone)}</div>
            <div class="detail-item"><span class="detail-icon">🎓</span> <strong>Diplôme :</strong> ${escapeHtml(ins.diploma_title)}</div>
            ${parent}
            ${ins.inscription_code ? `<div class="detail-item"><span class="detail-icon">🔑</span> <strong>Code inscription :</strong> ${escapeHtml(ins.inscription_code)}</div>` : ''}
            ${ins.affiliate_id ? `<div class="detail-item"><span class="detail-icon">🔗</span> <strong>ID parrain :</strong> ${escapeHtml(ins.affiliate_id)}</div>` : ''}
            <div class="detail-item"><span class="detail-icon">📄</span> <strong>Diplôme fichier :</strong> ${diplomaUrl ? `<a href="${diplomaUrl}" target="_blank">Télécharger</a>` : 'Aucun'}</div>
            <div class="detail-item"><span class="detail-icon">🆔</span> <strong>Pièce d'identité :</strong> ${idCardUrl ? `<a href="${idCardUrl}" target="_blank">Télécharger</a>` : 'Aucun'}</div>
            <div class="detail-item"><span class="detail-icon">⏰</span> <strong>Soumission :</strong> ${submitDate}</div>
        </div>
        ${sportDataHtml ? `<div class="sport-data-section"><strong>Données sportives :</strong><div class="modal-details-grid">${sportDataHtml}</div></div>` : ''}
        <div class="detail-status">
            <strong>Statut :</strong> <span class="status-badge ${ins.status === 'approved' ? 'valide' : ins.status === 'rejected' ? 'refuse' : 'en_attente'}">${ins.status === 'approved' ? 'Validé' : ins.status === 'rejected' ? 'Refusé' : ins.status === 'suspended' ? 'Suspendu' : 'En attente'}</span>
        </div>
        ${ins.admin_notes ? `<div class="admin-notes"><strong>Notes admin :</strong><br>${escapeHtml(ins.admin_notes)}</div>` : ''}
    `;
}

function formatSportKey(key) {
    const labels = {
        poste: 'Poste', piedDominant: 'Pied dominant', taille: 'Taille', poids: 'Poids',
        statistiques: 'Statistiques', club: 'Club', anneesPratique: 'Années pratique',
        niveau: 'Niveau', mainDominante: 'Main dominante', envergure: 'Envergure',
        detente: 'Détente', typeJeu: 'Type jeu', coupDroit: 'Coup droit', revers: 'Revers',
        classement: 'Classement', surfacePref: 'Surface', meilleurResultat: 'Meilleur résultat',
        vitesseService: 'Vitesse service', discipline: 'Discipline', meilleurePerf: 'Meilleure perf',
        record100: 'Record 100m', record10k: 'Record 10km', entrainementsSemaine: 'Entraînements/sem',
        blessures: 'Blessures', vitesseTir: 'Vitesse tir', detenteAttaque: 'Détente attaque',
        detenteContre: 'Détente contre', vitesse40: 'Vitesse 40m', plaquage: 'Plaquage',
        matchsSaison: 'Matchs saison', nage: 'Nage', meilleur50: '50m', meilleur100: '100m',
        meilleur200: '200m', chrono50: 'Chrono 50m', grade: 'Grade', poidsCompetition: 'Poids compét.',
        palmares: 'Palmarès', specialite: 'Spécialité', preparationPhysique: 'Prépa physique',
        ftp: 'FTP', fcm: 'FC max', kmSemaine: 'Km/semaine'
    };
    return labels[key] || key;
}

function populateEditForm(ins) {
    document.getElementById('editNom').value = ins.full_name || '';
    document.getElementById('editDateNaissance').value = ins.birth_date ? ins.birth_date.split('T')[0] : '';
    document.getElementById('editSport').value = ins.sport || '';
    document.getElementById('editPhone').value = ins.phone || '';
    document.getElementById('editAdminNotes').value = ins.admin_notes || '';

    currentSportData = ins.sport_data || {};
    if (sportDataQuill) {
        sportDataQuill.root.innerHTML = JSON.stringify(currentSportData, null, 2);
    }
    if (diplomaQuill) {
        diplomaQuill.root.innerHTML = ins.diploma_title || '';
    }
}

async function loadMessages(inscriptionId) {
    try {
        const { data: messages, error } = await supabaseSpacePublic
            .from('premierpasuivi_messages')
            .select('*')
            .eq('inscription_id', inscriptionId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        renderMessages(messages || []);
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
    if (!currentInscriptionId || !messageQuill) return;
    const content = messageQuill.root.innerHTML.trim();
    if (!content || content === '<p><br></p>') {
        showToast('Message vide', 'warning');
        return;
    }
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('premierpasuivi_messages')
            .insert([{
                inscription_id: currentInscriptionId,
                sender: 'admin',
                content: content
            }]);
        if (error) throw error;
        messageQuill.root.innerHTML = '';
        await loadMessages(currentInscriptionId);
    } catch (err) {
        console.error(err);
        showToast('Erreur envoi message', 'error');
    } finally {
        hideLoader();
    }
}

window.updateStatus = async (id, newStatus) => {
    if (!confirm(`Passer cette inscription en "${newStatus === 'approved' ? 'Validé' : newStatus === 'rejected' ? 'Refusé' : 'Suspendu'}" ?`)) return;
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('inscriptions')
            .update({ status: newStatus })
            .eq('id', id);
        if (error) throw error;
        showToast('Statut mis à jour', 'success');
        if (id === currentInscriptionId) await loadInscriptionDetails(id);
        await loadInscriptions();
    } catch (err) {
        console.error(err);
        showToast('Erreur mise à jour statut', 'error');
    } finally {
        hideLoader();
    }
};

window.deleteInscription = async (id) => {
    if (!confirm('Supprimer définitivement cette inscription et tous ses messages ?')) return;
    showLoader();
    try {
        const { error: delMsgs } = await supabaseSpacePublic
            .from('premierpasuivi_messages')
            .delete()
            .eq('inscription_id', id);
        if (delMsgs) console.warn(delMsgs);

        const { error: delIns } = await supabaseSpacePublic
            .from('inscriptions')
            .delete()
            .eq('id', id);
        if (delIns) throw delIns;

        showToast('Inscription supprimée', 'success');
        if (currentInscriptionId === id) closeModal();
        await loadInscriptions();
    } catch (err) {
        console.error(err);
        showToast('Erreur suppression', 'error');
    } finally {
        hideLoader();
    }
};

window.openEditTab = async (id) => {
    await viewInscription(id);
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tabEdit').classList.add('active');
    document.querySelector('.tab-btn[data-tab="edit"]').classList.add('active');
};

document.getElementById('editInscriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = currentInscriptionId;
    if (!id) return;

    const full_name = document.getElementById('editNom').value.trim();
    const birth_date = document.getElementById('editDateNaissance').value;
    const sport = document.getElementById('editSport').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const admin_notes = document.getElementById('editAdminNotes').value.trim();
    let sport_data = currentSportData;
    try {
        if (sportDataQuill && sportDataQuill.root.innerHTML.trim()) {
            sport_data = JSON.parse(sportDataQuill.root.innerHTML);
        }
    } catch (e) {
        showToast('Format JSON invalide pour les données sportives', 'error');
        return;
    }
    const diploma_title = diplomaQuill ? diplomaQuill.root.innerHTML : '';

    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('inscriptions')
            .update({
                full_name,
                birth_date,
                sport,
                phone,
                admin_notes,
                sport_data,
                diploma_title
            })
            .eq('id', id);
        if (error) throw error;
        showToast('Modifications enregistrées', 'success');
        await loadInscriptionDetails(id);
        await loadInscriptions();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        hideLoader();
    }
});

window.closeModal = () => {
    document.getElementById('inscriptionModal').classList.remove('active');
    currentInscriptionId = null;
};

document.getElementById('modalValid').addEventListener('click', () => {
    if (currentInscriptionId) updateStatus(currentInscriptionId, 'approved');
});
document.getElementById('modalPause').addEventListener('click', () => {
    if (currentInscriptionId) updateStatus(currentInscriptionId, 'suspended');
});
document.getElementById('modalReject').addEventListener('click', () => {
    if (currentInscriptionId) updateStatus(currentInscriptionId, 'rejected');
});
document.getElementById('modalDelete').addEventListener('click', () => {
    if (currentInscriptionId) deleteInscription(currentInscriptionId);
});
document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
document.getElementById('refreshBtn').addEventListener('click', loadInscriptions);

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
        if (tab === 'messages' && currentInscriptionId) {
            loadMessages(currentInscriptionId);
            setTimeout(() => {
                if (!messageQuill) {
                    messageQuill = new Quill('#messageEditor', { theme: 'snow', placeholder: 'Écrivez votre message...' });
                }
            }, 100);
        }
        if (tab === 'edit') {
            setTimeout(() => {
                if (!sportDataQuill) {
                    sportDataQuill = new Quill('#sportDataEditor', { theme: 'snow', placeholder: 'Données sportives (JSON valide)' });
                    sportDataQuill.on('text-change', () => {
                        const text = sportDataQuill.root.innerHTML;
                        document.getElementById('editSportData').value = text;
                    });
                }
                if (!diplomaQuill) {
                    diplomaQuill = new Quill('#diplomaEditor', { theme: 'snow', placeholder: 'Diplôme / formation' });
                    diplomaQuill.on('text-change', () => {
                        document.getElementById('editDiplomaTitle').value = diplomaQuill.root.innerHTML;
                    });
                }
            }, 100);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    loadInscriptions();
    const modal = document.getElementById('inscriptionModal');
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
});
