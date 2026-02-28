const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const rolesList = document.getElementById('rolesList');
const modal = document.getElementById('roleModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('roleForm');
const idInput = document.getElementById('roleId');
const titreInput = document.getElementById('titre');
const descriptionInput = document.getElementById('description');
const lienInput = document.getElementById('lien');
const iconeInput = document.getElementById('icone');

// Charger les rôles
async function loadRoles() {
    const { data: roles, error } = await supabaseClient
        .from('roles')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erreur chargement rôles:', error);
        rolesList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!roles || roles.length === 0) {
        rolesList.innerHTML = '<p class="no-data">Aucun rôle. Cliquez sur "Ajouter" pour en créer un.</p>';
        return;
    }

    let html = '';
    roles.forEach(item => {
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
    rolesList.innerHTML = html;
}

// Ouvrir modale ajout
function openAddModal() {
    modalTitle.textContent = 'Ajouter un rôle';
    idInput.value = '';
    titreInput.value = '';
    descriptionInput.value = '';
    lienInput.value = '';
    iconeInput.value = '';
    modal.classList.add('active');
}

// Éditer un rôle
window.editRole = async (id) => {
    const { data: item, error } = await supabaseClient
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur chargement rôle');
        return;
    }

    modalTitle.textContent = 'Modifier un rôle';
    idInput.value = item.id;
    titreInput.value = item.titre;
    descriptionInput.value = item.description;
    lienInput.value = item.lien;
    iconeInput.value = item.icone;
    modal.classList.add('active');
};

// Supprimer un rôle
window.deleteRole = async (id) => {
    if (!confirm('Supprimer ce rôle ?')) return;
    const { error } = await supabaseClient
        .from('roles')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadRoles();
    }
};

// Fermer modale
window.closeModal = () => {
    modal.classList.remove('active');
};

// Soumission formulaire
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = idInput.value;
    const titre = titreInput.value;
    const description = descriptionInput.value;
    const lien = lienInput.value;
    const icone = iconeInput.value;

    if (id === '') {
        // Ajout
        const { error } = await supabaseClient
            .from('roles')
            .insert([{ titre, description, lien, icone }]);
        if (error) {
            alert('Erreur ajout : ' + error.message);
        } else {
            closeModal();
            loadRoles();
        }
    } else {
        // Modification
        const { error } = await supabaseClient
            .from('roles')
            .update({ titre, description, lien, icone })
            .eq('id', id);
        if (error) {
            alert('Erreur modification : ' + error.message);
        } else {
            closeModal();
            loadRoles();
        }
    }
});

// Bouton ajout
document.getElementById('addRoleBtn').addEventListener('click', openAddModal);

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadRoles();