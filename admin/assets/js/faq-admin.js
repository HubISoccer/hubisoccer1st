// ===== DONNÉES PAR DÉFAUT =====
const defaultFaq = [
    {
        id: 'f1',
        question: 'Comment créer un compte joueur ?',
        reponse: 'Rendez-vous sur la page "Premier Pas", remplissez le formulaire avec vos informations personnelles, téléchargez vos justificatifs et validez. Votre dossier sera examiné par notre équipe.'
    },
    {
        id: 'f2',
        question: 'Quels sont les documents requis pour l\'inscription ?',
        reponse: 'Vous devez fournir une pièce d\'identité (CIP, passeport, acte de naissance) et un justificatif de votre parcours scolaire ou professionnel (diplôme, attestation, etc.).'
    },
    {
        id: 'f3',
        question: 'Comment fonctionne l\'affiliation ?',
        reponse: 'Générez votre lien d\'affiliation sur la page "Affiliation", partagez-le, et vous recevrez une commission pour chaque inscription ou achat validé via votre lien. Connectez-vous à votre espace affilié pour suivre vos gains.'
    },
    {
        id: 'f4',
        question: 'Comment passer l\'examen de qualification ?',
        reponse: 'Après validation de votre inscription "Premier Pas", vous recevrez un ID. Rendez-vous sur la page "Examen", saisissez votre ID, puis répondez aux 12 questions. L\'évaluation prendra au maximum 1h.'
    },
    {
        id: 'f5',
        question: 'Comment suivre mon dossier ?',
        reponse: 'Utilisez le lien de suivi fourni après votre inscription. Vous pouvez y voir le statut de votre dossier, modifier vos informations (si en attente) et recevoir des notifications.'
    }
];

// Initialisation localStorage
if (!localStorage.getItem('faq')) {
    localStorage.setItem('faq', JSON.stringify(defaultFaq));
}

// ===== ÉLÉMENTS DOM =====
const faqList = document.getElementById('faqList');
const modal = document.getElementById('faqModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('faqForm');
const faqId = document.getElementById('faqId');
const questionInput = document.getElementById('question');
const reponseInput = document.getElementById('reponse');

// ===== CHARGEMENT DE LA FAQ =====
function loadFaq() {
    const faq = JSON.parse(localStorage.getItem('faq')) || [];
    if (faq.length === 0) {
        faqList.innerHTML = '<p class="no-data">Aucune question.</p>';
        return;
    }

    let html = '';
    faq.forEach((item, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${item.question}</strong>
                    <div class="reponse-tronquee">${item.reponse.substring(0, 80)}...</div>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editFaq(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteFaq(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    faqList.innerHTML = html;
}

// ===== OUVERTURE MODALE AJOUT =====
function openAddModal() {
    modalTitle.textContent = 'Ajouter une question';
    faqId.value = '';
    questionInput.value = '';
    reponseInput.value = '';
    modal.classList.add('active');
}

// ===== ÉDITION =====
window.editFaq = (index) => {
    const faq = JSON.parse(localStorage.getItem('faq'));
    const item = faq[index];
    modalTitle.textContent = 'Modifier une question';
    faqId.value = index;
    questionInput.value = item.question;
    reponseInput.value = item.reponse;
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deleteFaq = (index) => {
    if (!confirm('Supprimer cette question ?')) return;
    let faq = JSON.parse(localStorage.getItem('faq'));
    faq.splice(index, 1);
    localStorage.setItem('faq', JSON.stringify(faq));
    loadFaq();
};

// ===== GESTION DU FORMULAIRE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = faqId.value;
    let faq = JSON.parse(localStorage.getItem('faq')) || [];

    const newItem = {
        id: index === '' ? 'f' + Date.now() : faq[index].id,
        question: questionInput.value,
        reponse: reponseInput.value
    };

    if (index === '') {
        faq.push(newItem);
    } else {
        faq[index] = newItem;
    }
    localStorage.setItem('faq', JSON.stringify(faq));
    closeModal();
    loadFaq();
});

// ===== BOUTON D'AJOUT =====
document.getElementById('addFaqBtn').addEventListener('click', openAddModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadFaq();