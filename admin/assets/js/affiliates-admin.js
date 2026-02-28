// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const COMMISSION = 100; // FCFA par parrainage validé

// Éléments DOM
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

// Charger les affiliés
async function loadAffiliates() {
    const { data: affiliates, error } = await supabaseClient
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement affiliés:', error);
        affiliatesList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!affiliates || affiliates.length === 0) {
        affiliatesList.innerHTML = '<p class="no-data">Aucun affilié.</p>';
        return;
    }

    let html = '';
    affiliates.forEach(aff => {
        const gains = (aff.count || 0) * COMMISSION;
        const statut = aff.valide ? 'Validé' : 'En attente';
        const statutClass = aff.valide ? 'actif' : 'inactif';
        html += `
            <div class="list-item" data-id="${aff.id}">
                <div class="info">
                    <strong>${aff.nom}</strong>
                    <div class="details">
                        <span>${aff.type === 'joueur' ? 'Joueur' : 'Produit'}</span>
                        <span>${aff.pays}</span>
                        <span>${aff.telephone}</span>
                        <span>${aff.paiement === 'mobile_money' ? 'Mobile Money' : 'Autre'}</span>
                    </div>
                    <span class="status ${statutClass}">${statut}</span>
                    <span class="gains">Gains: ${gains} FCFA (${aff.count || 0} parrainages)</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editAffiliate('${aff.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteAffiliate('${aff.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                    <button class="message" onclick="openMessageModal('${aff.id}')" title="Envoyer un message"><i class="fas fa-envelope"></i></button>
                    <button class="payment" onclick="generatePaymentLink('${aff.id}')" title="Générer lien de paiement"><i class="fas fa-money-bill-wave"></i></button>
                </div>
            </div>
        `;
    });
    affiliatesList.innerHTML = html;
}

// Éditer un affilié
window.editAffiliate = async (id) => {
    const { data: aff, error } = await supabaseClient
        .from('affiliates')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur chargement affilié');
        return;
    }

    modalTitle.textContent = 'Modifier l\'affilié';
    affiliateId.value = aff.id;
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

// Supprimer un affilié
window.deleteAffiliate = async (id) => {
    if (!confirm('Supprimer cet affilié définitivement ?')) return;
    const { error } = await supabaseClient
        .from('affiliates')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadAffiliates();
    }
};

// Fermer modale principale
window.closeModal = () => {
    modal.classList.remove('active');
};

// Soumission formulaire d'édition
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = affiliateId.value;
    const nom = nomInput.value;
    const pays = paysInput.value;
    const telephone = telephoneInput.value;
    const paiement = paiementSelect.value;
    const type = typeSelect.value;
    const valide = valideSelect.value === 'true';

    const { error } = await supabaseClient
        .from('affiliates')
        .update({ nom, pays, telephone, paiement, type, valide })
        .eq('id', id);

    if (error) {
        alert('Erreur modification : ' + error.message);
    } else {
        closeModal();
        loadAffiliates();
    }
});

// Gestion des messages
window.openMessageModal = (affiliateId) => {
    messageAffiliateId.value = affiliateId;
    messageText.value = '';
    messageModal.classList.add('active');
};

window.closeMessageModal = () => {
    messageModal.classList.remove('active');
};

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const affiliateId = messageAffiliateId.value;
    const message = messageText.value.trim();
    if (!message) return;

    // Insertion dans la table affiliate_messages avec le nom correct de la colonne (affiliateid)
    const { error } = await supabaseClient
        .from('affiliate_messages')
        .insert([{ affiliateid: affiliateId, message }]); // ← correction ici

    if (error) {
        alert('Erreur envoi message : ' + error.message);
    } else {
        alert('✅ Message envoyé à l\'affilié.');
        closeMessageModal();
    }
});

// Générer lien de paiement
window.generatePaymentLink = (affiliateId) => {
    const paymentUrl = `${window.location.origin}/hubisoccer1st/admin/paiement.html?aff=${encodeURIComponent(affiliateId)}`;
    navigator.clipboard.writeText(paymentUrl).then(() => {
        alert(`Lien de paiement copié : ${paymentUrl}`);
    }).catch(() => {
        prompt('Lien de paiement (copiez-le manuellement) :', paymentUrl);
    });
};

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadAffiliates();