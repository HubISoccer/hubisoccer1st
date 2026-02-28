const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const engagementsList = document.getElementById('engagementsList');
const modal = document.getElementById('engagementModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('engagementForm');
const idInput = document.getElementById('engagementId');
const titreInput = document.getElementById('titre');
const descriptionInput = document.getElementById('description');

// Charger les engagements
async function loadEngagements() {
    const { data: engagements, error } = await supabaseClient
        .from('engagements')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erreur chargement engagements:', error);
        engagementsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!engagements || engagements.length === 0) {
        engagementsList.innerHTML = '<p class="no-data">Aucun engagement. Cliquez sur "Ajouter" pour en créer un.</p>';
        return;
    }

    let html = '';
    engagements.forEach(item => {
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
    engagementsList.innerHTML = html;
}

// Ouvrir modale ajout
function openAddModal() {
    modalTitle.textContent = 'Ajouter un engagement';
    idInput.value = '';
    titreInput.value = '';
    descriptionInput.value = '';
    modal.classList.add('active');
}

// Éditer un engagement
window.editEngagement = async (id) => {
    const { data: item, error } = await supabaseClient
        .from('engagements')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur chargement engagement');
        return;
    }

    modalTitle.textContent = 'Modifier un engagement';
    idInput.value = item.id;
    titreInput.value = item.titre;
    descriptionInput.value = item.description;
    modal.classList.add('active');
};

// Supprimer un engagement
window.deleteEngagement = async (id) => {
    if (!confirm('Supprimer cet engagement ?')) return;
    const { error } = await supabaseClient
        .from('engagements')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadEngagements();
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

    if (id === '') {
        // Ajout
        const { error } = await supabaseClient
            .from('engagements')
            .insert([{ titre, description }]);
        if (error) {
            alert('Erreur ajout : ' + error.message);
        } else {
            closeModal();
            loadEngagements();
        }
    } else {
        // Modification
        const { error } = await supabaseClient
            .from('engagements')
            .update({ titre, description })
            .eq('id', id);
        if (error) {
            alert('Erreur modification : ' + error.message);
        } else {
            closeModal();
            loadEngagements();
        }
    }
});

// Bouton ajout
document.getElementById('addEngagementBtn').addEventListener('click', openAddModal);

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadEngagements();