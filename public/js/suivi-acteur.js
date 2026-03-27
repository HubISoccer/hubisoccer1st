const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentInscription = null;
let replyQuill = null;

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

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadInscription(id) {
    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('deveniracteur')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            showToast('Identifiant introuvable. Vérifiez le code saisi.', 'error');
            document.getElementById('resultCard').style.display = 'none';
            return null;
        }
        currentInscription = data;
        displayInscription(data);
        await loadMessages(id);
        document.getElementById('resultCard').style.display = 'block';
        return data;
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la vérification.', 'error');
        document.getElementById('resultCard').style.display = 'none';
        return null;
    } finally {
        hideLoader();
    }
}

function displayInscription(ins) {
    const statusMap = {
        pending: { label: 'En attente de validation', class: 'pending' },
        approved: { label: 'Approuvé', class: 'approved' },
        rejected: { label: 'Rejeté', class: 'rejected' },
        suspended: { label: 'Suspendu', class: 'pending' }
    };
    const status = statusMap[ins.status] || statusMap.pending;

    document.getElementById('statusBadge').textContent = status.label;
    document.getElementById('statusBadge').className = `status-badge ${status.class}`;
    document.getElementById('applicantName').textContent = ins.full_name || 'Candidat';

    const roleLabels = {
        PR: 'Parrain', ST: 'Staff médical', CO: 'Coach', AG: 'Agent',
        AC: 'Académie', CL: 'Club', FO: 'Formateur'
    };
    const roleName = roleLabels[ins.role] || ins.role;

    const infoGrid = document.getElementById('infoGrid');
    infoGrid.innerHTML = `
        <div class="info-item"><strong>ID candidature</strong><span>${escapeHtml(ins.id)}</span></div>
        <div class="info-item"><strong>Rôle</strong><span>${escapeHtml(roleName)}</span></div>
        <div class="info-item"><strong>Date de soumission</strong><span>${formatDate(ins.created_at)}</span></div>
        <div class="info-item"><strong>Email</strong><span>${escapeHtml(ins.email)}</span></div>
        <div class="info-item"><strong>Téléphone</strong><span>${escapeHtml(ins.phone)}</span></div>
    `;

    const roleDataDiv = document.getElementById('roleData');
    if (ins.role_data && Object.keys(ins.role_data).length > 0) {
        let html = '<h3>Informations complémentaires</h3><div class="role-data-grid">';
        for (const [key, value] of Object.entries(ins.role_data)) {
            if (value) {
                html += `<div class="info-item"><strong>${key.replace(/_/g, ' ')}</strong><span>${escapeHtml(value)}</span></div>`;
            }
        }
        html += `</div>`;
        roleDataDiv.innerHTML = html;
        roleDataDiv.style.display = 'block';
    } else {
        roleDataDiv.style.display = 'none';
    }

    const adminNotesDiv = document.getElementById('adminNotes');
    if (ins.admin_notes) {
        adminNotesDiv.innerHTML = `<strong><i class="fas fa-comment"></i> Message de l'équipe :</strong><br>${escapeHtml(ins.admin_notes)}`;
        adminNotesDiv.style.display = 'block';
    } else {
        adminNotesDiv.style.display = 'none';
    }

    const fileLink = ins.document_file ? `https://wxlpcflanihqwumjwpjs.supabase.co/storage/v1/object/public/documents/${ins.document_file}` : null;
    if (fileLink) {
        const fileHtml = `<div class="info-item"><strong>Justificatif</strong><span><a href="${fileLink}" target="_blank">Télécharger le fichier</a></span></div>`;
        infoGrid.insertAdjacentHTML('beforeend', fileHtml);
    }
}

async function loadMessages(inscriptionId) {
    try {
        const { data: messages, error } = await supabaseSpacePublic
            .from('acteurmsg')
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
        container.innerHTML = '<p class="empty-message">Aucun message pour le moment.</p>';
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

async function sendReply() {
    if (!currentInscription || !replyQuill) return;
    const content = replyQuill.root.innerHTML.trim();
    if (!content || content === '<p><br></p>') {
        showToast('Message vide', 'warning');
        return;
    }
    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('acteurmsg')
            .insert([{
                inscription_id: currentInscription.id,
                sender: 'candidate',
                content: content
            }]);
        if (error) throw error;
        replyQuill.root.innerHTML = '';
        await loadMessages(currentInscription.id);
        showToast('Message envoyé', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur envoi message', 'error');
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    const input = document.getElementById('trackingId');
    const checkBtn = document.getElementById('checkBtn');

    if (idFromUrl) {
        input.value = idFromUrl;
        loadInscription(idFromUrl);
    }

    checkBtn.addEventListener('click', () => {
        const id = input.value.trim();
        if (id) loadInscription(id);
        else showToast('Veuillez saisir un identifiant.', 'warning');
    });

    const observer = new MutationObserver(() => {
        const replyEditor = document.getElementById('replyEditor');
        if (replyEditor && !replyQuill) {
            replyQuill = new Quill(replyEditor, { theme: 'snow', placeholder: 'Écrivez votre message...' });
            observer.disconnect();
        }
    });
    observer.observe(document.getElementById('resultCard'), { childList: true, subtree: true });

    document.getElementById('sendReplyBtn').addEventListener('click', sendReply);

    // Menu mobile
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

    // Sélecteur de langue (simplifié)
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
        });
    }
});
