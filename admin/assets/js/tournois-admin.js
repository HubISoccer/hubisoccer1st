// admin/assets/js/tournois-admin.js
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM pour les lives
const livesList = document.getElementById('livesList');
const liveModal = document.getElementById('liveModal');
const liveModalTitle = document.getElementById('liveModalTitle');
const liveForm = document.getElementById('liveForm');
const liveId = document.getElementById('liveId');
const liveTitre = document.getElementById('liveTitre');
const liveUrl = document.getElementById('liveUrl');
const liveActif = document.getElementById('liveActif');

// Éléments DOM pour les tournois
const tournoisList = document.getElementById('tournoisList');
const tournoiModal = document.getElementById('tournoiModal');
const tournoiModalTitle = document.getElementById('tournoiModalTitle');
const tournoiForm = document.getElementById('tournoiForm');
const tournoiId = document.getElementById('tournoiId');
const tournoiTitre = document.getElementById('tournoiTitre');
const tournoiDescription = document.getElementById('tournoiDescription');
const tournoiDate = document.getElementById('tournoiDate');
const tournoiLieu = document.getElementById('tournoiLieu');
const tournoiCategories = document.getElementById('tournoiCategories');
const tournoiCode = document.getElementById('tournoiCode');
const tournoiImage = document.getElementById('tournoiImage');
const tournoiBadge = document.getElementById('tournoiBadge');
const tournoiPrix = document.getElementById('tournoiPrix');
const tournoiPaymentLink = document.getElementById('tournoiPaymentLink'); // nouveau champ

// ===== GESTION DES LIVES =====
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
        const { error } = await supabaseClient
            .from('lives')
            .insert([{ titre, video_url, actif }]);
        if (error) alert('Erreur : ' + error.message);
    } else {
        const { error } = await supabaseClient
            .from('lives')
            .update({ titre, video_url, actif })
            .eq('id', id);
        if (error) alert('Erreur : ' + error.message);
    }
    closeLiveModal();
    loadLives();
});

// ===== GESTION DES TOURNOIS =====
async function loadTournois() {
    const { data: tournois, error } = await supabaseClient
        .from('tournois')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement tournois:', error);
        tournoisList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    let html = '';
    tournois.forEach(t => {
        html += `
            <div class="list-item" data-id="${t.id}">
                <div class="info">
                    <strong>${t.titre}</strong>
                    <div class="details">
                        <span>${t.badge}</span>
                        <span>${t.date}</span>
                        <span>${t.lieu}</span>
                        <span>Prix: ${t.prix || 0} FCFA</span>
                    </div>
                    <div class="meta">
                        <span><i class="fas fa-tag"></i> ${t.code}</span>
                        ${t.payment_link ? '<span><i class="fas fa-link"></i> Lien de paiement</span>' : ''}
                    </div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editTournoi('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteTournoi('${t.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    tournoisList.innerHTML = html || '<p class="no-data">Aucun tournoi.</p>';
}

function openAddTournoiModal() {
    tournoiModalTitle.textContent = 'Ajouter un tournoi';
    tournoiId.value = '';
    tournoiTitre.value = '';
    tournoiDescription.value = '';
    tournoiDate.value = '';
    tournoiLieu.value = '';
    tournoiCategories.value = '';
    tournoiCode.value = '';
    tournoiImage.value = '';
    tournoiBadge.value = 'À venir';
    tournoiPrix.value = 0;
    tournoiPaymentLink.value = '';
    tournoiModal.classList.add('active');
}

window.editTournoi = async (id) => {
    const { data: tournoi, error } = await supabaseClient
        .from('tournois')
        .select('*')
        .eq('id', id)
        .single();
    if (error) return;
    tournoiModalTitle.textContent = 'Modifier un tournoi';
    tournoiId.value = id;
    tournoiTitre.value = tournoi.titre;
    tournoiDescription.value = tournoi.description;
    tournoiDate.value = tournoi.date;
    tournoiLieu.value = tournoi.lieu;
    tournoiCategories.value = tournoi.categories;
    tournoiCode.value = tournoi.code;
    tournoiImage.value = tournoi.image;
    tournoiBadge.value = tournoi.badge;
    tournoiPrix.value = tournoi.prix || 0;
    tournoiPaymentLink.value = tournoi.payment_link || '';
    tournoiModal.classList.add('active');
};

window.deleteTournoi = async (id) => {
    if (!confirm('Supprimer ce tournoi ?')) return;
    const { error } = await supabaseClient.from('tournois').delete().eq('id', id);
    if (error) alert('Erreur : ' + error.message);
    else loadTournois();
};

window.closeTournoiModal = () => {
    tournoiModal.classList.remove('active');
};

tournoiForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = tournoiId.value;
    const newTournoi = {
        titre: tournoiTitre.value,
        description: tournoiDescription.value,
        date: tournoiDate.value,
        lieu: tournoiLieu.value,
        categories: tournoiCategories.value,
        code: tournoiCode.value,
        image: tournoiImage.value,
        badge: tournoiBadge.value,
        prix: parseInt(tournoiPrix.value) || 0,
        payment_link: tournoiPaymentLink.value || null
    };

    if (id === '') {
        const { error } = await supabaseClient.from('tournois').insert([newTournoi]);
        if (error) alert('Erreur : ' + error.message);
    } else {
        const { error } = await supabaseClient
            .from('tournois')
            .update(newTournoi)
            .eq('id', id);
        if (error) alert('Erreur : ' + error.message);
    }
    closeTournoiModal();
    loadTournois();
});

// ===== BOUTONS D'AJOUT =====
document.getElementById('addLiveBtn').addEventListener('click', openAddLiveModal);
document.getElementById('addTournoiBtn').addEventListener('click', openAddTournoiModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) window.location.href = '../../index.html';
});

// ===== CHARGEMENT INITIAL =====
loadLives();
loadTournois();