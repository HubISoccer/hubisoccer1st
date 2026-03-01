// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const COMMISSION = 100;

// Éléments DOM
const inscriptionsList = document.getElementById('inscriptionsList');
const modal = document.getElementById('inscriptionModal');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
let currentInscriptionId = null;

// ===== CHARGEMENT DES INSCRIPTIONS =====
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
    inscriptions.forEach(ins => {
        const statut = ins.statut || 'en_attente';
        let statutClass = '', statutText = '';
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

        const dateNaissance = ins.datenaissance ? new Date(ins.datenaissance).toLocaleDateString('fr-FR') : '??';
        const dateSoumission = ins.datesoumission ? new Date(ins.datesoumission).toLocaleString('fr-FR') : '??';

        html += `
            <div class="list-item" data-id="${ins.id}">
                <div class="info">
                    <strong>${ins.nom}</strong>
                    <div class="details">
                        <span>${dateNaissance}</span>
                        <span>${ins.poste}</span>
                        <span>${ins.telephone}</span>
                        <span>${ins.codetournoi || '-'}</span>
                    </div>
                    <span class="status ${statutClass}">${statutText}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewInscription('${ins.id}')" title="Voir détails"><i class="fas fa-eye"></i></button>
                    <button class="valid" onclick="updateStatus('${ins.id}', 'valide')" title="Valider"><i class="fas fa-check"></i></button>
                    <button class="reject" onclick="updateStatus('${ins.id}', 'refuse')" title="Rejeter"><i class="fas fa-times"></i></button>
                    <button class="edit" onclick="editInscription('${ins.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteInscription('${ins.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    inscriptionsList.innerHTML = html;
}

// ===== VOIR DÉTAILS =====
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
    const dateNaissance = ins.datenaissance ? new Date(ins.datenaissance).toLocaleDateString('fr-FR') : 'Non renseignée';
    const dateSoumission = ins.datesoumission ? new Date(ins.datesoumission).toLocaleString('fr-FR') : 'Non renseignée';

    // Construction des URLs des fichiers (bucket public)
    const baseStorageUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co/storage/v1/object/public/documents/';
    const diplomeUrl = ins.diplomefilename ? baseStorageUrl + ins.diplomefilename : null;
    const pieceUrl = ins.piecefilename ? baseStorageUrl + ins.piecefilename : null;

    const diplomeLink = diplomeUrl ? `<a href="${diplomeUrl}" target="_blank" class="download-link">📄 Télécharger le diplôme</a>` : 'Aucun';
    const pieceLink = pieceUrl ? `<a href="${pieceUrl}" target="_blank" class="download-link">🪪 Télécharger la pièce d'identité</a>` : 'Aucun';

    modalDetails.innerHTML = `
        <div class="modal-details-grid">
            <div class="detail-item"><span class="detail-icon">🆔</span> <strong>ID :</strong> ${ins.id}</div>
            <div class="detail-item"><span class="detail-icon">👤</span> <strong>Nom :</strong> ${ins.nom}</div>
            <div class="detail-item"><span class="detail-icon">📅</span> <strong>Naissance :</strong> ${dateNaissance}</div>
            <div class="detail-item"><span class="detail-icon">⚽</span> <strong>Poste :</strong> ${ins.poste}</div>
            <div class="detail-item"><span class="detail-icon">📞</span> <strong>Téléphone :</strong> ${ins.telephone}</div>
            <div class="detail-item"><span class="detail-icon">🎓</span> <strong>Diplôme :</strong> ${ins.diplome}</div>
            <div class="detail-item"><span class="detail-icon">🏆</span> <strong>Code tournoi :</strong> ${ins.codetournoi || '-'}</div>
            <div class="detail-item"><span class="detail-icon">📄</span> <strong>Fichier diplôme :</strong> ${diplomeLink}</div>
            <div class="detail-item"><span class="detail-icon">🪪</span> <strong>Pièce d'identité :</strong> ${pieceLink}</div>
            <div class="detail-item"><span class="detail-icon">🔗</span> <strong>Affilié :</strong> ${ins.affilié || '-'}</div>
            <div class="detail-item"><span class="detail-icon">⏰</span> <strong>Soumission :</strong> ${dateSoumission}</div>
        </div>
        <div class="detail-status">
            <strong>Statut :</strong> <span class="status-badge ${statut}">${statut}</span>
        </div>
    `;
    modal.classList.add('active');
};

// ===== MODIFIER UNE INSCRIPTION =====
window.editInscription = async (id) => {
    // Pour l'instant, on redirige vers une page d'édition ou on ouvre une modale
    // On va simplement afficher une alerte pour dire que c'est en développement
    alert('Fonction de modification en cours de développement. Vous pouvez modifier directement dans la base de données.');
    // Plus tard, on pourra ouvrir une modale avec les champs pré-remplis
};

// ===== SUPPRIMER UNE INSCRIPTION (avec suppression des fichiers) =====
window.deleteInscription = async (id) => {
    if (!confirm('Supprimer définitivement cette inscription et tous ses fichiers associés ?')) return;

    // Récupérer l'inscription pour connaître les noms des fichiers
    const { data: ins, error: fetchError } = await supabaseClient
        .from('inscriptions')
        .select('diplomefilename, piecefilename')
        .eq('id', id)
        .single();

    if (fetchError) {
        alert('Erreur lors de la récupération des informations');
        return;
    }

    // Supprimer les fichiers du bucket (si ils existent)
    if (ins.diplomefilename) {
        await supabaseClient.storage
            .from('documents')
            .remove([ins.diplomefilename]);
    }
    if (ins.piecefilename) {
        await supabaseClient.storage
            .from('documents')
            .remove([ins.piecefilename]);
    }

    // Supprimer l'enregistrement de la table
    const { error: deleteError } = await supabaseClient
        .from('inscriptions')
        .delete()
        .eq('id', id);

    if (deleteError) {
        alert('Erreur lors de la suppression : ' + deleteError.message);
    } else {
        loadInscriptions(); // Recharger la liste
        closeModal(); // Fermer la modale si elle était ouverte
    }
};

// ===== FERMER LA MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== VALIDER / REJETER =====
window.updateStatus = async (id, newStatut) => {
    if (!confirm(`Passer cette inscription en "${newStatut}" ?`)) return;

    const { data: ins, error: fetchError } = await supabaseClient
        .from('inscriptions')
        .select('affilié')
        .eq('id', id)
        .single();

    if (fetchError) {
        alert('Erreur lors de la récupération de l\'inscription');
        return;
    }

    const { error: updateError } = await supabaseClient
        .from('inscriptions')
        .update({ statut: newStatut })
        .eq('id', id);

    if (updateError) {
        alert('Erreur lors de la mise à jour : ' + updateError.message);
        return;
    }

    if (newStatut === 'valide' && ins.affilié) {
        // Incrémenter le compteur de l'affilié
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

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadInscriptions();
