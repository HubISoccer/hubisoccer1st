// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const COMMISSION = 100; // FCFA par inscription validée

// Éléments DOM
const inscriptionsList = document.getElementById('inscriptionsList');
const modal = document.getElementById('inscriptionModal');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
let currentInscriptionId = null;

// Charger les inscriptions
async function loadInscriptions() {
    const { data: inscriptions, error } = await supabaseClient
        .from('inscriptions')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Erreur chargement inscriptions:', error);
        inscriptionsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!inscriptions || inscriptions.length === 0) {
        inscriptionsList.innerHTML = '<p class="no-data">Aucune inscription.</p>';
        return;
    }

    let html = '';
    inscriptions.forEach((ins, index) => {
        const statut = ins.statut || 'en_attente';
        let statutClass = '';
        let statutText = '';
        switch (statut) {
            case 'en_attente':
                statutClass = 'en_attente';
                statutText = 'En attente';
                break;
            case 'valide':
                statutClass = 'valide';
                statutText = 'Validé';
                break;
            case 'refuse':
                statutClass = 'refuse';
                statutText = 'Refusé';
                break;
            default:
                statutClass = 'en_attente';
                statutText = statut;
        }

        html += `
            <div class="list-item" data-id="${ins.id}" data-index="${index}">
                <div class="info">
                    <strong>${ins.nom}</strong>
                    <div class="details">
                        <span>${ins.dateNaissance}</span>
                        <span>${ins.poste}</span>
                        <span>${ins.telephone}</span>
                        <span>${ins.codeTournoi || '-'}</span>
                    </div>
                    <span class="status ${statutClass}">${statutText}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewInscription('${ins.id}')" title="Voir détails"><i class="fas fa-eye"></i></button>
                    <button class="valid" onclick="updateStatus('${ins.id}', 'valide')" title="Valider"><i class="fas fa-check"></i></button>
                    <button class="reject" onclick="updateStatus('${ins.id}', 'refuse')" title="Rejeter"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    });
    inscriptionsList.innerHTML = html;
}

// Voir les détails d'une inscription
window.viewInscription = async (id) => {
    const { data: ins, error } = await supabaseClient
        .from('inscriptions')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !ins) {
        alert('Erreur chargement détails');
        return;
    }

    currentInscriptionId = ins.id;
    const statut = ins.statut || 'en_attente';
    const documents = `${ins.diplomeFileName ? '✅ Diplôme' : '❌ Diplôme'} | ${ins.pieceFileName ? '✅ Pièce d\'identité' : '❌ Pièce'}`;

    modalDetails.innerHTML = `
        <p><strong>ID :</strong> ${ins.id}</p>
        <p><strong>Nom :</strong> ${ins.nom}</p>
        <p><strong>Date de naissance :</strong> ${ins.dateNaissance}</p>
        <p><strong>Poste :</strong> ${ins.poste}</p>
        <p><strong>Téléphone :</strong> ${ins.telephone}</p>
        <p><strong>Diplôme :</strong> ${ins.diplome}</p>
        <p><strong>Code tournoi :</strong> ${ins.codeTournoi || '-'}</p>
        <p><strong>Documents fournis :</strong> ${documents}</p>
        <p><strong>Affilié :</strong> ${ins.affilié || '-'}</p>
        <p><strong>Date de soumission :</strong> ${ins.dateSoumission}</p>
        <p><strong>Statut :</strong> ${statut}</p>
    `;
    modal.classList.add('active');
};

// Fermer la modale
window.closeModal = () => {
    modal.classList.remove('active');
};

// Mise à jour du statut
window.updateStatus = async (id, newStatut) => {
    if (!confirm(`Passer cette inscription en "${newStatut}" ?`)) return;

    // Récupérer l'inscription pour connaître l'affilié
    const { data: ins, error: fetchError } = await supabaseClient
        .from('inscriptions')
        .select('affilié')
        .eq('id', id)
        .single();

    if (fetchError) {
        alert('Erreur lors de la récupération de l\'inscription');
        return;
    }

    // Mettre à jour le statut
    const { error: updateError } = await supabaseClient
        .from('inscriptions')
        .update({ statut: newStatut })
        .eq('id', id);

    if (updateError) {
        alert('Erreur lors de la mise à jour : ' + updateError.message);
        return;
    }

    // Si validation, incrémenter le compteur de l'affilié
    if (newStatut === 'valide' && ins.affilié) {
        // Récupérer l'affilié
        const { data: aff, error: affError } = await supabaseClient
            .from('affiliates')
            .select('count')
            .eq('id', ins.affilié)
            .single();

        if (!affError && aff) {
            const newCount = (aff.count || 0) + 1;
            await supabaseClient
                .from('affiliates')
                .update({ count: newCount })
                .eq('id', ins.affilié);
        }
    }

    closeModal();
    loadInscriptions();
};

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadInscriptions();
