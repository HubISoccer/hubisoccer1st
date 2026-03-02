// admin/assets/js/tournois-admin.js
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const livesList = document.getElementById('livesList');
const liveModal = document.getElementById('liveModal');
const liveModalTitle = document.getElementById('liveModalTitle');
const liveForm = document.getElementById('liveForm');
const liveId = document.getElementById('liveId');
const liveTitre = document.getElementById('liveTitre');
const liveUrl = document.getElementById('liveUrl');
const liveActif = document.getElementById('liveActif');

async function loadLives() {
    const { data: lives, error } = await supabaseClient
        .from('lives')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement lives:', error);
        livesList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    let html = '';
    lives.forEach(live => {
        html += `
            <div class="list-item" data-id="${live.id}">
                <div class="info">
                    <strong>${live.titre}</strong>
                    <div class="details">
                        <span>${live.actif ? 'En direct' : 'Inactif'}</span>
                        <span>Vues: ${live.viewers || 0}</span>
                        <span>👍 ${live.likes || 0}</span>
                        <span>👎 ${live.dislikes || 0}</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editLive('${live.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteLive('${live.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    livesList.innerHTML = html || '<p class="no-data">Aucun live.</p>';
}

function openAddLiveModal() {
    liveModalTitle.textContent = 'Ajouter un live';
    liveId.value = '';
    liveTitre.value = '';
    liveUrl.value = '';
    liveActif.value = 'false';
    liveModal.classList.add('active');
}

window.editLive = async (id) => {
    const { data: live, error } = await supabaseClient
        .from('lives')
        .select('*')
        .eq('id', id)
        .single();
    if (error) return;
    liveModalTitle.textContent = 'Modifier un live';
    liveId.value = id;
    liveTitre.value = live.titre;
    liveUrl.value = live.video_url;
    liveActif.value = live.actif ? 'true' : 'false';
    liveModal.classList.add('active');
};

window.deleteLive = async (id) => {
    if (!confirm('Supprimer ce live ?')) return;
    const { error } = await supabaseClient.from('lives').delete().eq('id', id);
    if (error) alert('Erreur : ' + error.message);
    else loadLives();
};

window.closeLiveModal = () => {
    liveModal.classList.remove('active');
};

liveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = liveId.value;
    const titre = liveTitre.value;
    const video_url = liveUrl.value;
    const actif = liveActif.value === 'true';

    if (id === '') {
        // Ajout
        const { error } = await supabaseClient
            .from('lives')
            .insert([{ titre, video_url, actif }]);
        if (error) alert('Erreur : ' + error.message);
    } else {
        // Modification
        const { error } = await supabaseClient
            .from('lives')
            .update({ titre, video_url, actif })
            .eq('id', id);
        if (error) alert('Erreur : ' + error.message);
    }
    closeLiveModal();
    loadLives();
});

document.getElementById('addLiveBtn').addEventListener('click', openAddLiveModal);

// Déconnexion
document.getElementById('logoutAdmin').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) window.location.href = '../../index.html';
});

loadLives();