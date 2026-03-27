const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let sportifs = [];
let dons = [];
let temoignages = [];
let currentFilters = { type: 'all', sport: 'all', region: 'all', search: '' };
let currentRole = '';

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

function generatePPId(roleCode) {
    const randomPart = String.fromCharCode(97 + Math.floor(Math.random() * 26)) +
                       String(Math.floor(Math.random() * 1000)).padStart(3, '0') +
                       String.fromCharCode(97 + Math.floor(Math.random() * 26)) +
                       String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const vaPart = `VA-${month}${day}${hour}`;
    const secondsPart = String(now.getSeconds()).padStart(3, '0');
    const counter = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return `${randomPart}-${vaPart}-HubIS-${roleCode}-${secondsPart}-${counter}`;
}

async function loadSportifs() {
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_sportifs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        sportifs = data || [];
        renderSportifs();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement sportifs', 'error');
    }
}

async function loadDons() {
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_dons')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        dons = data || [];
        renderDons();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement appels aux dons', 'error');
    }
}

async function loadTemoignages() {
    try {
        const { data, error } = await supabaseSpacePublic
            .from('acteur_temoignages')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        temoignages = data || [];
        renderTemoignages();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement témoignages', 'error');
    }
}

function filterSportifs() {
    let filtered = [...sportifs];
    if (currentFilters.sport !== 'all') {
        filtered = filtered.filter(s => s.sport === currentFilters.sport);
    }
    if (currentFilters.region !== 'all') {
        filtered = filtered.filter(s => s.region === currentFilters.region);
    }
    if (currentFilters.search) {
        const search = currentFilters.search.toLowerCase();
        filtered = filtered.filter(s => s.full_name?.toLowerCase().includes(search) || s.description?.toLowerCase().includes(search));
    }
    return filtered;
}

function filterDons() {
    let filtered = [...dons];
    if (currentFilters.region !== 'all') {
        filtered = filtered.filter(d => d.region === currentFilters.region);
    }
    if (currentFilters.search) {
        const search = currentFilters.search.toLowerCase();
        filtered = filtered.filter(d => d.title?.toLowerCase().includes(search) || d.description?.toLowerCase().includes(search));
    }
    return filtered;
}

function renderSportifs() {
    const container = document.getElementById('sportifsGrid');
    if (!container) return;
    const filtered = filterSportifs();
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun sportif trouvé.</p>';
        return;
    }
    container.innerHTML = filtered.map(s => `
        <div class="card">
            ${s.image_url ? `<img src="${s.image_url}" class="card-image" alt="${escapeHtml(s.full_name)}">` : '<div class="card-image" style="background:#e9ecef; display:flex; align-items:center; justify-content:center;"><i class="fas fa-user-circle" style="font-size:3rem; color:#ccc;"></i></div>'}
            <div class="card-content">
                <h3 class="card-title">${escapeHtml(s.full_name)}</h3>
                <p class="card-desc">${escapeHtml(s.sport)} • ${escapeHtml(s.region)}</p>
                <p class="card-desc">${escapeHtml(s.description || '')}</p>
                <div class="card-footer">
                    <button class="btn-contact" data-type="sportif" data-id="${s.id}" data-name="${escapeHtml(s.full_name)}">Contacter</button>
                </div>
            </div>
        </div>
    `).join('');
    attachContactButtons();
}

function renderDons() {
    const container = document.getElementById('donsGrid');
    if (!container) return;
    const filtered = filterDons();
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun appel aux dons trouvé.</p>';
        return;
    }
    container.innerHTML = filtered.map(d => `
        <div class="card">
            ${d.image_url ? `<img src="${d.image_url}" class="card-image" alt="${escapeHtml(d.title)}">` : '<div class="card-image" style="background:#e9ecef; display:flex; align-items:center; justify-content:center;"><i class="fas fa-hand-holding-heart" style="font-size:3rem; color:#ccc;"></i></div>'}
            <div class="card-content">
                <h3 class="card-title">${escapeHtml(d.title)}</h3>
                <p class="card-desc">${escapeHtml(d.description || '')}</p>
                <div class="card-footer">
                    <button class="btn-contact" data-type="don" data-id="${d.id}" data-name="${escapeHtml(d.title)}">Je soutiens</button>
                </div>
            </div>
        </div>
    `).join('');
    attachContactButtons();
}

function renderTemoignages() {
    const container = document.getElementById('temoignagesGrid');
    if (!container) return;
    if (temoignages.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun témoignage pour le moment.</p>';
        return;
    }
    container.innerHTML = temoignages.map(t => `
        <div class="card">
            <div class="card-content">
                <p class="card-desc">"${escapeHtml(t.content)}"</p>
                <div class="card-footer">
                    <span>— ${escapeHtml(t.author)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function attachContactButtons() {
    document.querySelectorAll('.btn-contact').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            openContactModal(type, id, name);
        });
    });
}

function openContactModal(type, id, name) {
    document.getElementById('contactTargetType').value = type;
    document.getElementById('contactTargetId').value = id;
    document.getElementById('contactModalTitle').textContent = `Contacter ${name}`;
    document.getElementById('contactModal').classList.add('active');
}

function closeContactModal() {
    document.getElementById('contactModal').classList.remove('active');
    document.getElementById('contactForm').reset();
}

async function sendContactMessage(e) {
    e.preventDefault();
    const targetType = document.getElementById('contactTargetType').value;
    const targetId = document.getElementById('contactTargetId').value;
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !message) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }
    if (!email.includes('@')) {
        showToast('Email invalide', 'warning');
        return;
    }

    showLoader();
    try {
        const { error } = await supabaseSpacePublic
            .from('acteurmsg')
            .insert([{
                inscription_id: null,
                sender: 'candidate',
                content: `Nom: ${name}\nEmail: ${email}\nType: ${targetType}\nID: ${targetId}\n\n${message}`
            }]);
        if (error) throw error;
        showToast('Message envoyé avec succès !', 'success');
        closeContactModal();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'envoi', 'error');
    } finally {
        hideLoader();
    }
}

function initActeurOptions() {
    const roles = [
        { code: 'PR', label: 'Parrain', icon: 'fas fa-hand-holding-heart', description: 'Soutenez financièrement les talents.' },
        { code: 'ST', label: 'Staff médical', icon: 'fas fa-notes-medical', description: 'Accompagnez les joueurs dans leur santé.' },
        { code: 'CO', label: 'Coach', icon: 'fas fa-chalkboard-teacher', description: 'Partagez votre expertise.' },
        { code: 'AG', label: 'Agent', icon: 'fas fa-user-tie', description: 'Représentez des sportifs.' },
        { code: 'AC', label: 'Académie', icon: 'fas fa-school', description: 'Recrutez des jeunes talents.' },
        { code: 'CL', label: 'Club', icon: 'fas fa-building', description: 'Recrutez des joueurs.' },
        { code: 'FO', label: 'Formateur', icon: 'fas fa-chalkboard', description: 'Formez la prochaine génération.' }
    ];
    const container = document.getElementById('acteurOptions');
    if (!container) return;
    container.innerHTML = roles.map(r => `
        <div class="acteur-card" data-role="${r.code}">
            <i class="${r.icon}"></i>
            <h3>${r.label}</h3>
            <p>${r.description}</p>
            <button class="btn-acteur" data-role="${r.code}">Devenir ${r.label}</button>
        </div>
    `).join('');
    document.querySelectorAll('.btn-acteur, .acteur-card').forEach(el => {
        el.addEventListener('click', (e) => {
            const roleCode = el.dataset.role || el.closest('.acteur-card')?.dataset.role;
            if (roleCode) openInscriptionModal(roleCode);
        });
    });
}

function openInscriptionModal(roleCode) {
    currentRole = roleCode;
    document.getElementById('inscriptionRole').value = roleCode;
    const roleName = {
        PR: 'Parrain', ST: 'Staff médical', CO: 'Coach', AG: 'Agent',
        AC: 'Académie', CL: 'Club', FO: 'Formateur'
    }[roleCode] || 'Acteur';
    document.getElementById('inscriptionModalTitle').textContent = `Devenir ${roleName}`;
    document.getElementById('inscriptionForm').reset();
    const roleFieldsDiv = document.getElementById('roleSpecificFields');
    roleFieldsDiv.innerHTML = `
        <div class="form-group">
            <label>Informations complémentaires</label>
            <textarea id="role_data" rows="3" placeholder="Détails sur votre motivation, expérience..."></textarea>
        </div>
    `;
    document.getElementById('inscriptionModal').classList.add('active');
}

function closeInscriptionModal() {
    document.getElementById('inscriptionModal').classList.remove('active');
    currentRole = null;
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');
}

async function uploadFileWithProgress(file, box, indicator) {
    return new Promise((resolve, reject) => {
        const fullName = document.getElementById('inscriptionFullName').value.trim();
        const safeName = fullName ? fullName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'candidat';
        const fileName = `${safeName}_${currentRole}_${Date.now()}.${file.name.split('.').pop()}`;
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
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        const circle = box.querySelector('.progress-bar');
                        const text = box.querySelector('.progress-text');
                        const dashOffset = 113.1 * (1 - percent / 100);
                        circle.style.strokeDashoffset = dashOffset;
                        text.textContent = percent + '%';
                    }
                });
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        box.classList.add('success');
                        box.classList.remove('uploading');
                        const text = box.querySelector('.progress-text');
                        text.textContent = '✓';
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
                indicator.style.display = 'flex';
                xhr.send(file);
            })
            .catch(reject);
    });
}

document.getElementById('inscriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = document.getElementById('inscriptionRole').value;
    const fullName = document.getElementById('inscriptionFullName').value.trim();
    const email = document.getElementById('inscriptionEmail').value.trim();
    const phone = document.getElementById('inscriptionPhone').value.trim();
    const roleData = document.getElementById('role_data')?.value.trim() || '';
    const fileInput = document.getElementById('inscriptionFile');
    const file = fileInput.files[0];

    if (!role || !fullName || !email || !phone || !file) {
        showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
        return;
    }
    if (!email.includes('@')) {
        showToast('Email invalide', 'warning');
        return;
    }

    const submitBtn = document.getElementById('submitInscriptionBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

    const uploadBox = document.getElementById('uploadJustificatif');
    const indicator = uploadBox.querySelector('.progress-indicator');
    indicator.style.display = 'flex';
    uploadBox.classList.add('uploading');

    try {
        const filePath = await uploadFileWithProgress(file, uploadBox, indicator);
        const ppId = generatePPId(role);
        const roleDataObj = { additional_info: roleData };
        const { error: insertError } = await supabaseSpacePublic
            .from('deveniracteur')
            .insert([{
                id: ppId,
                role: role,
                full_name: fullName,
                email: email,
                phone: phone,
                document_file: filePath,
                role_data: roleDataObj,
                status: 'pending'
            }]);
        if (insertError) throw insertError;

        document.getElementById('trackingId').textContent = ppId;
        document.getElementById('trackingLink').href = `suivi-acteur.html?id=${ppId}`;
        document.getElementById('successModal').classList.add('active');
        closeInscriptionModal();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'inscription : ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        indicator.style.display = 'none';
        uploadBox.classList.remove('uploading', 'success');
        const progressText = uploadBox.querySelector('.progress-text');
        if (progressText) progressText.textContent = '0%';
        const progressBar = uploadBox.querySelector('.progress-bar');
        if (progressBar) progressBar.style.strokeDashoffset = '113.1';
    }
});

document.getElementById('copyTrackingBtn').addEventListener('click', () => {
    const link = document.getElementById('trackingId').textContent;
    if (link) {
        navigator.clipboard.writeText(link).then(() => {
            const btn = document.getElementById('copyTrackingBtn');
            btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i> Copier';
            }, 2000);
        }).catch(() => showToast('Erreur de copie', 'error'));
    }
});

document.getElementById('applyFilters').addEventListener('click', () => {
    currentFilters.type = document.getElementById('filterType').value;
    currentFilters.sport = document.getElementById('filterSport').value;
    currentFilters.region = document.getElementById('filterRegion').value;
    currentFilters.search = document.getElementById('searchInput').value;
    renderSportifs();
    renderDons();
});

document.getElementById('contactForm').addEventListener('submit', sendContactMessage);

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

function initLangSelector() {
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    showLoader();
    await Promise.all([loadSportifs(), loadDons(), loadTemoignages()]);
    initActeurOptions();
    initMenuMobile();
    initLangSelector();
    hideLoader();
});
