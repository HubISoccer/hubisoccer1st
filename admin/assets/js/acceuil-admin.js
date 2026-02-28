// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== ÉLÉMENTS DOM =====
const engagementsList = document.getElementById('engagementsList');
const rolesList = document.getElementById('rolesList');

// Éléments pour la modale Engagement
const engagementModal = document.getElementById('engagementModal');
const engagementModalTitle = document.getElementById('engagementModalTitle');
const engagementForm = document.getElementById('engagementForm');
const engagementId = document.getElementById('engagementId');
const engagementTitre = document.getElementById('engagementTitre');
const engagementDescription = document.getElementById('engagementDescription');

// Éléments pour la modale Rôle
const roleModal = document.getElementById('roleModal');
const roleModalTitle = document.getElementById('roleModalTitle');
const roleForm = document.getElementById('roleForm');
const roleId = document.getElementById('roleId');
const roleTitre = document.getElementById('roleTitre');
const roleDescription = document.getElementById('roleDescription');
const roleLien = document.getElementById('roleLien');
const roleIcone = document.getElementById('roleIcone');

// ===== FONCTIONS POUR LES ENGAGEMENTS =====
async function loadEngagements() {
    const { data: engagements, error } = await supabase
        .from('engagements')
        .select('*');

    if (error) {
        console.error('Erreur chargement engagements:', error);
        engagementsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    let html = '';
    engagements.forEach((item) => {
        html += `
            <div class="list-item" data-id="${item.id}">
                <div class="info">
                    <strong>${item.titre}</strong><br>
                    <small>${item.description}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editEngagement(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteEngagement(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    engagementsList.innerHTML = html || '<p class="no-data">Aucun engagement.</p>';
}

function openAddEngagementModal() {
    engagementModalTitle.textContent = 'Ajouter un engagement';
    engagementId.value = '';
    engagementTitre.value = '';
    engagementDescription.value = '';
    engagementModal.classList.add('active');
}

async function editEngagement(id) {
    const { data: item, error } = await supabase
        .from('engagements')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur lors du chargement de l\'engagement');
        return;
    }

    engagementModalTitle.textContent = 'Modifier un engagement';
    engagementId.value = item.id;
    engagementTitre.value = item.titre;
    engagementDescription.value = item.description;
    engagementModal.classList.add('active');
}
window.editEngagement = editEngagement;

async function deleteEngagement(id) {
    if (!confirm('Supprimer cet engagement ?')) return;
    const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur lors de la suppression');
    } else {
        loadEngagements();
    }
}
window.deleteEngagement = deleteEngagement;

engagementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = engagementId.value;
    const titre = engagementTitre.value;
    const description = engagementDescription.value;

    if (id === '') {
        // Ajout
        const { error } = await supabase
            .from('engagements')
            .insert([{ titre, description }]);
        if (error) alert('Erreur lors de l\'ajout');
    } else {
        // Modification
        const { error } = await supabase
            .from('engagements')
            .update({ titre, description })
            .eq('id', id);
        if (error) alert('Erreur lors de la modification');
    }
    closeModal('engagement');
    loadEngagements();
});

// ===== FONCTIONS POUR LES RÔLES =====
async function loadRoles() {
    const { data: roles, error } = await supabase
        .from('roles')
        .select('*');

    if (error) {
        console.error('Erreur chargement rôles:', error);
        rolesList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    let html = '';
    roles.forEach((item) => {
        html += `
            <div class="list-item" data-id="${item.id}">
                <div class="info">
                    <strong>${item.titre}</strong>
                    <small>${item.description}</small>
                    <div class="details">Lien: ${item.lien} | Icône: ${item.icone}</div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editRole(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteRole(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    rolesList.innerHTML = html || '<p class="no-data">Aucun rôle.</p>';
}

function openAddRoleModal() {
    roleModalTitle.textContent = 'Ajouter un rôle';
    roleId.value = '';
    roleTitre.value = '';
    roleDescription.value = '';
    roleLien.value = '';
    roleIcone.value = '';
    roleModal.classList.add('active');
}

async function editRole(id) {
    const { data: item, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur lors du chargement du rôle');
        return;
    }

    roleModalTitle.textContent = 'Modifier un rôle';
    roleId.value = item.id;
    roleTitre.value = item.titre;
    roleDescription.value = item.description;
    roleLien.value = item.lien;
    roleIcone.value = item.icone;
    roleModal.classList.add('active');
}
window.editRole = editRole;

async function deleteRole(id) {
    if (!confirm('Supprimer ce rôle ?')) return;
    const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur lors de la suppression');
    } else {
        loadRoles();
    }
}
window.deleteRole = deleteRole;

roleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = roleId.value;
    const titre = roleTitre.value;
    const description = roleDescription.value;
    const lien = roleLien.value;
    const icone = roleIcone.value;

    if (id === '') {
        // Ajout
        const { error } = await supabase
            .from('roles')
            .insert([{ titre, description, lien, icone }]);
        if (error) alert('Erreur lors de l\'ajout');
    } else {
        // Modification
        const { error } = await supabase
            .from('roles')
            .update({ titre, description, lien, icone })
            .eq('id', id);
        if (error) alert('Erreur lors de la modification');
    }
    closeModal('role');
    loadRoles();
});

// ===== GESTION DES MODALES =====
window.closeModal = (type) => {
    if (type === 'engagement') {
        engagementModal.classList.remove('active');
    } else if (type === 'role') {
        roleModal.classList.remove('active');
    }
};

// Boutons d'ajout
document.getElementById('addEngagementBtn').addEventListener('click', openAddEngagementModal);
document.getElementById('addRoleBtn').addEventListener('click', openAddRoleModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadEngagements();
loadRoles();