// ===== DONNÉES PAR DÉFAUT =====
const defaultActualites = [
    {
        id: 'a1',
        titre: 'Lancement du tournoi de Cotonou',
        extrait: 'Plus de 200 jeunes talents attendus pour la 3e édition du tournoi de détection. Les inscriptions sont ouvertes jusqu\'au 10 avril.',
        date: '2026-03-15',
        image: 'public/img/actu1.jpg',
        auteur: 'HubISoccer'
    },
    {
        id: 'a2',
        titre: 'Nouveau partenariat avec l\'académie Diambars',
        extrait: 'HubISoccer s\'associe à l\'académie Diambars pour offrir des bourses de formation aux meilleurs talents détectés lors des tournois.',
        date: '2026-03-10',
        image: 'public/img/actu2.jpg',
        auteur: 'HubISoccer'
    },
    {
        id: 'a3',
        titre: 'Témoignage : Koffi, du quartier à la sélection nationale',
        extrait: 'Découvrez le parcours inspirant de Koffi, repéré via HubISoccer et aujourd\'hui international espoir.',
        date: '2026-03-05',
        image: 'public/img/actu3.jpg',
        auteur: 'HubISoccer'
    }
];

// Initialisation localStorage
if (!localStorage.getItem('actualites')) {
    localStorage.setItem('actualites', JSON.stringify(defaultActualites));
}

// ===== ÉLÉMENTS DOM =====
const actualitesList = document.getElementById('actualitesList');
const modal = document.getElementById('articleModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('articleForm');
const articleId = document.getElementById('articleId');
const titreInput = document.getElementById('titre');
const extraitInput = document.getElementById('extrait');
const dateInput = document.getElementById('date');
const imageInput = document.getElementById('image');
const auteurInput = document.getElementById('auteur');

// ===== CHARGEMENT DES ARTICLES =====
function loadActualites() {
    const actualites = JSON.parse(localStorage.getItem('actualites')) || [];
    if (actualites.length === 0) {
        actualitesList.innerHTML = '<p class="no-data">Aucun article.</p>';
        return;
    }

    // Trier du plus récent au plus ancien
    actualites.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    actualites.forEach((article, index) => {
        const dateFormatee = new Date(article.date).toLocaleDateString('fr-FR');
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${article.titre}</strong>
                    <div class="details">
                        <span>${article.extrait.substring(0, 80)}...</span>
                    </div>
                    <span class="date">${dateFormatee} - ${article.auteur || 'HubISoccer'}</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editArticle(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteArticle(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    actualitesList.innerHTML = html;
}

// ===== OUVERTURE MODALE AJOUT =====
function openAddModal() {
    modalTitle.textContent = 'Ajouter un article';
    articleId.value = '';
    titreInput.value = '';
    extraitInput.value = '';
    // Date du jour par défaut
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    imageInput.value = '';
    auteurInput.value = 'HubISoccer';
    modal.classList.add('active');
}

// ===== ÉDITION =====
window.editArticle = (index) => {
    const actualites = JSON.parse(localStorage.getItem('actualites'));
    const article = actualites[index];
    modalTitle.textContent = 'Modifier un article';
    articleId.value = index;
    titreInput.value = article.titre;
    extraitInput.value = article.extrait;
    dateInput.value = article.date;
    imageInput.value = article.image || '';
    auteurInput.value = article.auteur || 'HubISoccer';
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deleteArticle = (index) => {
    if (!confirm('Supprimer cet article ?')) return;
    let actualites = JSON.parse(localStorage.getItem('actualites'));
    actualites.splice(index, 1);
    localStorage.setItem('actualites', JSON.stringify(actualites));
    loadActualites();
};

// ===== GESTION DU FORMULAIRE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = articleId.value;
    let actualites = JSON.parse(localStorage.getItem('actualites')) || [];

    const newArticle = {
        id: index === '' ? 'a' + Date.now() : actualites[index].id,
        titre: titreInput.value,
        extrait: extraitInput.value,
        date: dateInput.value,
        image: imageInput.value,
        auteur: auteurInput.value
    };

    if (index === '') {
        actualites.push(newArticle);
    } else {
        actualites[index] = newArticle;
    }
    localStorage.setItem('actualites', JSON.stringify(actualites));
    closeModal();
    loadActualites();
});

// ===== BOUTON D'AJOUT =====
document.getElementById('addArticleBtn').addEventListener('click', openAddModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadActualites();