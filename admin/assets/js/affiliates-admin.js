// ===== CONSTANTES =====
const COMMISSION = 100; // FCFA par parrainage validé

// ===== ÉLÉMENTS DOM =====
const affiliatesList = document.getElementById('affiliatesList');
const modal = document.getElementById('affiliateModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('affiliateForm');
const affiliateId = document.getElementById('affiliateId');
const displayId = document.getElementById('displayId');
const nomInput = document.getElementById('nom');
const paysInput = document.getElementById('pays');
const telephoneInput = document.getElementById('telephone');
const paiementSelect = document.getElementById('paiement');
const typeSelect = document.getElementById('type');
const valideSelect = document.getElementById('valide');
const countInput = document.getElementById('count');
const gainsInput = document.getElementById('gains');

// Éléments pour la modale de message
const messageModal = document.getElementById('messageModal');
const messageForm = document.getElementById('messageForm');
const messageAffiliateId = document.getElementById('messageAffiliateId');
const messageText = document.getElementById('messageText');

// ===== CHARGEMENT DES AFFILIÉS =====
function loadAffiliates() {
    const affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];
    let html = '';
    affiliates.forEach((aff, index) => {
        const gains = (aff.count || 0) * COMMISSION;
        const statut = aff.valide ? 'Validé' : 'En attente';
        const statutClass = aff.valide ? 'actif' : 'inactif';
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${aff.nom || 'Nom inconnu'}</strong>
                    <div class="details">
                        <span>ID: ${aff.id}</span>
                        <span>${aff.type === 'joueur' ? 'Joueur' : 'Produit'}</span>
                        <span>${aff.pays || '?'}</span>
                        <span>${aff.telephone || '?'}</span>
                        <span>${aff.paiement === 'mobile_money' ? 'Mobile Money' : 'Autre'}</span>
                    </div>
                    <span class="status ${statutClass}">${statut}</span>
                    <span class="gains">Gains: ${gains} FCFA (${aff.count || 0} parrainages)</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editAffiliate(${index})" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteAffiliate(${index})" title="Supprimer"><i class="fas fa-trash"></i></button>
                    <button class="message" onclick="openMessageModal('${aff.id}')" title="Envoyer un message"><i class="fas fa-envelope"></i></button>
                    <button class="payment" onclick="generatePaymentLink('${aff.id}')" title="Générer lien de paiement"><i class="fas fa-money-bill-wave"></i></button>
                </div>
            </div>
        `;
    });
    affiliatesList.innerHTML = html || '<p class="no-data">Aucun affilié pour le moment.</p>';
}

// ===== ÉDITION =====
window.editAffiliate = (index) => {
    const affiliates = JSON.parse(localStorage.getItem('affiliates'));
    const aff = affiliates[index];
    modalTitle.textContent = 'Modifier l\'affilié';
    affiliateId.value = index;
    displayId.value = aff.id;
    nomInput.value = aff.nom || '';
    paysInput.value = aff.pays || '';
    telephoneInput.value = aff.telephone || '';
    paiementSelect.value = aff.paiement || 'mobile_money';
    typeSelect.value = aff.type || 'joueur';
    valideSelect.value = aff.valide ? 'true' : 'false';
    countInput.value = aff.count || 0;
    gainsInput.value = (aff.count || 0) * COMMISSION + ' FCFA';
    modal.classList.add('active');
};

// ===== FERMETURE MODALE PRINCIPALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deleteAffiliate = (index) => {
    if (!confirm('Supprimer cet affilié définitivement ?')) return;
    let affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];
    affiliates.splice(index, 1);
    localStorage.setItem('affiliates', JSON.stringify(affiliates));
    loadAffiliates();
};

// ===== GESTION DU FORMULAIRE D'ÉDITION =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = affiliateId.value;
    let affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];
    
    affiliates[index].nom = nomInput.value;
    affiliates[index].pays = paysInput.value;
    affiliates[index].telephone = telephoneInput.value;
    affiliates[index].paiement = paiementSelect.value;
    affiliates[index].type = typeSelect.value;
    affiliates[index].valide = valideSelect.value === 'true';

    localStorage.setItem('affiliates', JSON.stringify(affiliates));
    closeModal();
    loadAffiliates();
});

// ===== GESTION DES MESSAGES =====
window.openMessageModal = (affiliateId) => {
    messageAffiliateId.value = affiliateId;
    messageText.value = '';
    messageModal.classList.add('active');
};

window.closeMessageModal = () => {
    messageModal.classList.remove('active');
};

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const affiliateId = messageAffiliateId.value;
    const message = messageText.value.trim();
    if (!message) return;

    // Récupérer les messages existants
    let messages = JSON.parse(localStorage.getItem('affiliate_messages')) || [];
    messages.push({
        id: Date.now(),
        affiliateId: affiliateId,
        message: message,
        date: new Date().toISOString(),
        lu: false
    });
    localStorage.setItem('affiliate_messages', JSON.stringify(messages));
    alert('✅ Message envoyé à l\'affilié.');
    closeMessageModal();
});

// ===== GÉNÉRATION LIEN DE PAIEMENT =====
window.generatePaymentLink = (affiliateId) => {
    const affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];
    const aff = affiliates.find(a => a.id === affiliateId);
    if (!aff) return;
    const gain = (aff.count || 0) * COMMISSION;
    // Créer un lien vers la page de paiement (à créer ultérieurement)
    const paymentUrl = `${window.location.origin}/hubisoccer1st/admin/paiement.html?aff=${encodeURIComponent(affiliateId)}&montant=${gain}`;
    navigator.clipboard.writeText(paymentUrl).then(() => {
        alert(`Lien de paiement copié : ${paymentUrl}`);
    }).catch(() => {
        prompt('Lien de paiement (copiez-le manuellement) :', paymentUrl);
    });
};

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadAffiliates();