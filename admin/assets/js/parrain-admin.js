// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉLÉMENTS DOM =====
const joueursList = document.getElementById('joueursList');
const donsList = document.getElementById('donsList');
const temoignagesList = document.getElementById('temoignagesList');
const messagesList = document.getElementById('messagesList');
const statJoueurs = document.getElementById('statJoueurs');
const statDons = document.getElementById('statDons');
const statCollecte = document.getElementById('statCollecte');
const statMessages = document.getElementById('statMessages');

const modal = document.getElementById('itemModal');
const modalTitle = document.getElementById('modalTitle');
const itemForm = document.getElementById('itemForm');
const itemType = document.getElementById('itemType');
const itemId = document.getElementById('itemId');
const dynamicFields = document.getElementById('dynamicFields');

// ===== ÉTAT =====
let currentMessages = [];

// ===== CHARGEMENT DES DONNÉES =====
async function loadAll() {
    await Promise.all([
        loadJoueurs(),
        loadDons(),
        loadTemoignages(),
        loadMessages(),
        loadStats()
    ]);
}

async function loadJoueurs(search = '') {
    let query = supabaseAdmin.from('parrain_joueurs').select('*').order('created_at', { ascending: false });
    if (search) {
        query = query.or(`nom.ilike.%${search}%,description.ilike.%${search}%,region.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    else renderJoueurs(data || []);
}

async function loadDons(search = '') {
    let query = supabaseAdmin.from('parrain_dons').select('*').order('created_at', { ascending: false });
    if (search) {
        query = query.or(`titre.ilike.%${search}%,description.ilike.%${search}%,region.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    else renderDons(data || []);
}

async function loadTemoignages(search = '') {
    let query = supabaseAdmin.from('parrain_temoignages').select('*').order('created_at', { ascending: false });
    if (search) {
        query = query.or(`auteur.ilike.%${search}%,texte.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    else renderTemoignages(data || []);
}

async function loadMessages(search = '') {
    let query = supabaseAdmin.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,message.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    else {
        currentMessages = data || [];
        renderMessages(currentMessages);
    }
}

async function loadStats() {
    const [joueurs, dons, temoignages, messages] = await Promise.all([
        supabaseAdmin.from('parrain_joueurs').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('parrain_dons').select('collecte'),
        supabaseAdmin.from('parrain_temoignages').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }).eq('is_read', false)
    ]);
    statJoueurs.textContent = joueurs.count || 0;
    statDons.textContent = dons.data?.length || 0;
    // Calculer somme des collectes
    let total = 0;
    if (dons.data) {
        total = dons.data.reduce((acc, d) => {
            const num = parseFloat(String(d.collecte).replace(/[^0-9]/g, ''));
            return acc + (isNaN(num) ? 0 : num);
        }, 0);
    }
    statCollecte.textContent = total.toLocaleString() + ' FCFA';
    statMessages.textContent = messages.count || 0;
}

// ===== RENDU DES LISTES =====
function renderJoueurs(joueurs) {
    if (!joueurs.length) {
        joueursList.innerHTML = '<p class="no-data">Aucun joueur.</p>';
        return;
    }
    let html = '';
    joueurs.forEach(item => {
        html += `
            <div class="list-item" data-id="${item.id}">
                <div class="info">
                    <strong>${item.nom}</strong>
                    <div class="details">
                        <span>${item.poste}</span>
                        <span>${item.region}</span>
                        <span>${item.besoin}</span>
                        <span>${item.montant}</span>
                    </div>
                    <small>${(item.description || '').substring(0, 80)}...</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('joueur', '${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('joueur', '${item.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    joueursList.innerHTML = html;
}

function renderDons(dons) {
    if (!dons.length) {
        donsList.innerHTML = '<p class="no-data">Aucun appel aux dons.</p>';
        return;
    }
    let html = '';
    dons.forEach(item => {
        html += `
            <div class="list-item" data-id="${item.id}">
                <div class="info">
                    <strong>${item.titre}</strong>
                    <div class="details">
                        <span>${item.region}</span>
                        <span>Objectif: ${item.objectif}</span>
                        <span>Collecté: ${item.collecte}</span>
                    </div>
                    <small>${(item.description || '').substring(0, 80)}...</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('don', '${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('don', '${item.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    donsList.innerHTML = html;
}

function renderTemoignages(temoignages) {
    if (!temoignages.length) {
        temoignagesList.innerHTML = '<p class="no-data">Aucun témoignage.</p>';
        return;
    }
    let html = '';
    temoignages.forEach(item => {
        html += `
            <div class="list-item" data-id="${item.id}">
                <div class="info">
                    <strong>${item.auteur}</strong> (${item.role})
                    <small>${item.texte}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editItem('temoignage', '${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteItem('temoignage', '${item.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    temoignagesList.innerHTML = html;
}

function renderMessages(messages) {
    if (!messages.length) {
        messagesList.innerHTML = '<p class="no-data">Aucun message.</p>';
        return;
    }
    let html = '';
    messages.forEach(msg => {
        html += `
            <div class="list-item ${!msg.is_read ? 'unread' : ''}" data-id="${msg.id}">
                <div class="info">
                    <strong>${msg.name}</strong> (${msg.email})
                    <div class="details">
                        <span>Type: ${msg.type}</span>
                        <span>Cible: ${msg.target_title || msg.target_id || '-'}</span>
                        <span>${new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <small>${(msg.message || '').substring(0, 80)}...</small>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewMessage('${msg.id}')"><i class="fas fa-eye"></i></button>
                    <button class="delete" onclick="deleteMessage('${msg.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    messagesList.innerHTML = html;
}

// ===== GESTION DES MODALES =====
window.openModal = (type, id = null) => {
    itemType.value = type;
    itemId.value = id || '';
    let title = '';
    let fields = '';

    if (type === 'joueur') {
        title = id ? 'Modifier un joueur' : 'Ajouter un joueur';
        fields = `
            <div class="form-group">
                <label>Nom</label>
                <input type="text" id="nom" required>
            </div>
            <div class="form-group">
                <label>Poste</label>
                <input type="text" id="poste" required>
            </div>
            <div class="form-group">
                <label>Région</label>
                <input type="text" id="region" required>
            </div>
            <div class="form-group">
                <label>Média (image ou vidéo)</label>
                <input type="file" id="imageFile" accept="image/*,video/*">
                <input type="hidden" id="imageUrl">
                <small>Formats : JPG, PNG, MP4, MOV, etc.</small>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="description" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>Besoin</label>
                <input type="text" id="besoin" required>
            </div>
            <div class="form-group">
                <label>Montant</label>
                <input type="text" id="montant" required>
            </div>
        `;
    } else if (type === 'don') {
        title = id ? 'Modifier un appel' : 'Ajouter un appel';
        fields = `
            <div class="form-group">
                <label>Titre</label>
                <input type="text" id="titre" required>
            </div>
            <div class="form-group">
                <label>Région</label>
                <input type="text" id="region" required>
            </div>
            <div class="form-group">
                <label>Média (image ou vidéo)</label>
                <input type="file" id="imageFile" accept="image/*,video/*">
                <input type="hidden" id="imageUrl">
                <small>Formats : JPG, PNG, MP4, MOV, etc.</small>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="description" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>Objectif</label>
                <input type="text" id="objectif" required>
            </div>
            <div class="form-group">
                <label>Collecté</label>
                <input type="text" id="collecte" required>
            </div>
        `;
    } else if (type === 'temoignage') {
        title = id ? 'Modifier un témoignage' : 'Ajouter un témoignage';
        fields = `
            <div class="form-group">
                <label>Auteur</label>
                <input type="text" id="auteur" required>
            </div>
            <div class="form-group">
                <label>Rôle</label>
                <input type="text" id="role" required>
            </div>
            <div class="form-group">
                <label>Texte</label>
                <textarea id="texte" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>Avatar (image)</label>
                <input type="file" id="avatarFile" accept="image/*">
                <input type="hidden" id="avatarUrl">
                <small>Formats : JPG, PNG</small>
            </div>
        `;
    }

    modalTitle.textContent = title;
    dynamicFields.innerHTML = fields;
    modal.classList.add('active');

    if (id) {
        loadItemForEdit(type, id);
    }
};

async function loadItemForEdit(type, id) {
    const table = type === 'joueur' ? 'parrain_joueurs' : (type === 'don' ? 'parrain_dons' : 'parrain_temoignages');
    const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single();
    if (error || !data) return;

    if (type === 'joueur') {
        document.getElementById('nom').value = data.nom || '';
        document.getElementById('poste').value = data.poste || '';
        document.getElementById('region').value = data.region || '';
        document.getElementById('description').value = data.description || '';
        document.getElementById('besoin').value = data.besoin || '';
        document.getElementById('montant').value = data.montant || '';
        document.getElementById('imageUrl').value = data.image || '';
    } else if (type === 'don') {
        document.getElementById('titre').value = data.titre || '';
        document.getElementById('region').value = data.region || '';
        document.getElementById('description').value = data.description || '';
        document.getElementById('objectif').value = data.objectif || '';
        document.getElementById('collecte').value = data.collecte || '';
        document.getElementById('imageUrl').value = data.image || '';
    } else {
        document.getElementById('auteur').value = data.auteur || '';
        document.getElementById('role').value = data.role || '';
        document.getElementById('texte').value = data.texte || '';
        document.getElementById('avatarUrl').value = data.avatar || '';
    }
}

window.closeModal = () => {
    modal.classList.remove('active');
    itemForm.reset();
};

// ===== UPLOAD DE FICHIER AVEC BARRE DE PROGRESSION =====
async function uploadFile(file, bucket = 'parrain-medias') {
    if (!file) return null;

    // Afficher un indicateur de progression (spinner) dans le formulaire
    const submitBtn = itemForm.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload en cours...';

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        // Utilisation de l'API fetch avec XMLHttpRequest pour suivre la progression (simulée ici avec un délai)
        // Note: Le client Supabase ne fournit pas de suivi de progression, on peut simplement attendre.
        const { data, error } = await supabaseAdmin.storage.from(bucket).upload(fileName, file);

        if (error) throw error;

        const { publicURL } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
        return publicURL;
    } catch (err) {
        console.error('Upload error:', err);
        showToast('Erreur upload : ' + err.message, 'error');
        throw err;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// ===== GESTION DU FORMULAIRE =====
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = itemType.value;
    const id = itemId.value;
    const table = type === 'joueur' ? 'parrain_joueurs' : (type === 'don' ? 'parrain_dons' : 'parrain_temoignages');
    let newItem = {};

    try {
        // Upload des fichiers
        if (type === 'joueur' || type === 'don') {
            const fileInput = document.getElementById('imageFile');
            if (fileInput && fileInput.files.length > 0) {
                const url = await uploadFile(fileInput.files[0]);
                if (url) newItem.image = url;
            } else {
                const oldUrl = document.getElementById('imageUrl')?.value;
                if (oldUrl) newItem.image = oldUrl;
                else {
                    showToast('Veuillez sélectionner un fichier', 'error');
                    return;
                }
            }
        } else if (type === 'temoignage') {
            const fileInput = document.getElementById('avatarFile');
            if (fileInput && fileInput.files.length > 0) {
                const url = await uploadFile(fileInput.files[0]);
                if (url) newItem.avatar = url;
            } else {
                const oldUrl = document.getElementById('avatarUrl')?.value;
                if (oldUrl) newItem.avatar = oldUrl;
                else {
                    showToast('Veuillez sélectionner un avatar', 'error');
                    return;
                }
            }
        }

        // Champs textuels
        if (type === 'joueur') {
            newItem.nom = document.getElementById('nom').value;
            newItem.poste = document.getElementById('poste').value;
            newItem.region = document.getElementById('region').value;
            newItem.description = document.getElementById('description').value;
            newItem.besoin = document.getElementById('besoin').value;
            newItem.montant = document.getElementById('montant').value;
        } else if (type === 'don') {
            newItem.titre = document.getElementById('titre').value;
            newItem.region = document.getElementById('region').value;
            newItem.description = document.getElementById('description').value;
            newItem.objectif = document.getElementById('objectif').value;
            newItem.collecte = document.getElementById('collecte').value;
        } else {
            newItem.auteur = document.getElementById('auteur').value;
            newItem.role = document.getElementById('role').value;
            newItem.texte = document.getElementById('texte').value;
        }

        // Désactiver le bouton pour éviter double soumission
        const submitBtn = itemForm.querySelector('.btn-submit');
        submitBtn.disabled = true;

        let result;
        if (id) {
            result = await supabaseAdmin.from(table).update(newItem).eq('id', id);
        } else {
            result = await supabaseAdmin.from(table).insert([newItem]);
        }

        submitBtn.disabled = false;

        if (result.error) {
            console.error('Insert error:', result.error);
            showToast('Erreur : ' + result.error.message, 'error');
        } else {
            showToast('Opération réussie', 'success');
            closeModal();
            loadAll();
        }
    } catch (err) {
        console.error('Exception:', err);
        showToast('Erreur : ' + err.message, 'error');
        // Réactiver le bouton en cas d'erreur
        const submitBtn = itemForm.querySelector('.btn-submit');
        if (submitBtn) submitBtn.disabled = false;
    }
});

// ===== SUPPRESSION =====
window.deleteItem = async (type, id) => {
    if (!confirm('Supprimer définitivement ?')) return;
    const table = type === 'joueur' ? 'parrain_joueurs' : (type === 'don' ? 'parrain_dons' : 'parrain_temoignages');
    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) showToast('Erreur : ' + error.message, 'error');
    else {
        showToast('Supprimé', 'success');
        loadAll();
    }
};

// ===== MESSAGES =====
let currentMessageId = null;

window.viewMessage = async (id) => {
    const msg = currentMessages.find(m => m.id == id);
    if (!msg) return;
    currentMessageId = id;
    document.getElementById('messageDetail').innerHTML = `
        <p><strong>De :</strong> ${msg.name} (${msg.email})</p>
        <p><strong>Type :</strong> ${msg.type}</p>
        <p><strong>Cible :</strong> ${msg.target_title || msg.target_id || '-'}</p>
        <p><strong>Date :</strong> ${new Date(msg.created_at).toLocaleString()}</p>
        <p><strong>Message :</strong><br>${msg.message}</p>
    `;
    document.getElementById('messageModal').classList.add('active');

    if (!msg.is_read) {
        await supabaseAdmin.from('contact_messages').update({ is_read: true }).eq('id', id);
        loadMessages();
    }
};

window.closeMessageModal = () => {
    document.getElementById('messageModal').classList.remove('active');
    currentMessageId = null;
};

window.markMessageAsRead = async () => {
    if (!currentMessageId) return;
    await supabaseAdmin.from('contact_messages').update({ is_read: true }).eq('id', currentMessageId);
    closeMessageModal();
    loadMessages();
};

window.deleteMessage = async (id) => {
    if (!confirm('Supprimer ce message ?')) return;
    const { error } = await supabaseAdmin.from('contact_messages').delete().eq('id', id);
    if (error) showToast('Erreur : ' + error.message, 'error');
    else {
        showToast('Message supprimé', 'success');
        loadMessages();
    }
};

// ===== RECHERCHE EN TEMPS RÉEL =====
document.getElementById('searchJoueurs')?.addEventListener('input', (e) => loadJoueurs(e.target.value));
document.getElementById('searchDons')?.addEventListener('input', (e) => loadDons(e.target.value));
document.getElementById('searchTemoignages')?.addEventListener('input', (e) => loadTemoignages(e.target.value));
document.getElementById('searchMessages')?.addEventListener('input', (e) => loadMessages(e.target.value));

// ===== BOUTONS DE RAFRAÎCHISSEMENT =====
document.getElementById('refreshJoueurs')?.addEventListener('click', () => loadJoueurs());
document.getElementById('refreshDons')?.addEventListener('click', () => loadDons());
document.getElementById('refreshTemoignages')?.addEventListener('click', () => loadTemoignages());
document.getElementById('refreshMessages')?.addEventListener('click', () => loadMessages());

// ===== TOAST =====
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ===== DÉCONNEXION (simulée) =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', loadAll);