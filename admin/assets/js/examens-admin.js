// ===== ADMIN EXAMENS - VERSION CONNECTÉE À SUPABASE =====
console.log("✅ examens-admin.js chargé");

// Initialisation Supabase
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const submissionsList = document.getElementById('submissionsList');
const modal = document.getElementById('correctionModal');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
const correctionForm = document.getElementById('correctionForm');
const submissionId = document.getElementById('submissionId');
const noteQcm = document.getElementById('noteQcm');
const noteRedac = document.getElementById('noteRedac');
const noteFinale = document.getElementById('noteFinale');
const commentaire = document.getElementById('commentaire');

// ===== CHARGEMENT DES SOUMISSIONS =====
async function loadSubmissions() {
    // 1. Charger toutes les soumissions d'examens
    const { data: submissions, error } = await supabaseClient
        .from('exam_submissions')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Erreur chargement soumissions:', error);
        submissionsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!submissions || submissions.length === 0) {
        submissionsList.innerHTML = '<p class="no-data">Aucune soumission d\'examen.</p>';
        return;
    }

    // 2. Charger les noms des joueurs depuis la table inscriptions
    const { data: inscriptions, error: err2 } = await supabaseClient
        .from('inscriptions')
        .select('id, nom');

    if (err2) console.error('Erreur chargement inscriptions:', err2);

    // Créer un dictionnaire id -> nom pour un accès rapide
    const joueurs = {};
    if (inscriptions) {
        inscriptions.forEach(ins => {
            joueurs[ins.id] = ins.nom;
        });
    }

    let html = '';
    submissions.forEach(sub => {
        const nomJoueur = joueurs[sub.playerid] || `Joueur ${sub.playerid}`;
        const note = sub.note_finale !== null ? `${sub.note_finale}/30` : 'Non noté';
        const statutClass = sub.note_finale !== null ? 'note' : 'en_attente';
        const statutText = sub.note_finale !== null ? 'Noté' : 'En attente';

        html += `
            <div class="list-item" data-id="${sub.id}">
                <div class="info">
                    <strong>${nomJoueur}</strong>
                    <div class="details">
                        <span>ID: ${sub.playerid}</span>
                        <span>Date: ${new Date(sub.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <span class="status ${statutClass}">${statutText} - Note: ${note}</span>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewSubmission('${sub.id}')" title="Voir détails"><i class="fas fa-eye"></i></button>
                    ${sub.note_finale === null ? `<button class="correction" onclick="openCorrection('${sub.id}')" title="Corriger"><i class="fas fa-pen"></i></button>` : ''}
                    <button class="delete" onclick="deleteSubmission('${sub.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    submissionsList.innerHTML = html;
}

// ===== VOIR DÉTAILS =====
window.viewSubmission = async (id) => {
    const { data: sub, error } = await supabaseClient
        .from('exam_submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !sub) {
        alert('Erreur chargement soumission');
        return;
    }

    // Récupérer le nom du joueur
    const { data: ins } = await supabaseClient
        .from('inscriptions')
        .select('nom')
        .eq('id', sub.playerid)
        .single();

    const nomJoueur = ins?.nom || 'Inconnu';

    // Construire l'affichage des réponses
    const qcmReponses = sub.qcm || [];
    const qcmAnswers = qcmReponses.map((val, i) => `Q${i+1}: ${val === '1' ? 'Bonne' : 'Mauvaise'}`).join('<br>');
    const redactions = sub.redaction || [];
    const redac1 = redactions[0] || '';
    const redac2 = redactions[1] || '';

    modalDetails.innerHTML = `
        <p><strong>Joueur :</strong> ${nomJoueur} (ID: ${sub.playerid})</p>
        <p><strong>Date :</strong> ${new Date(sub.date).toLocaleString('fr-FR')}</p>
        <p><strong>Réponses QCM :</strong><br>${qcmAnswers}</p>
        <p><strong>Rédaction 1 :</strong> ${redac1}</p>
        <p><strong>Rédaction 2 :</strong> ${redac2}</p>
        <p><strong>Statut :</strong> ${sub.statut}</p>
        ${sub.note_qcm !== null ? `<p><strong>Note QCM :</strong> ${sub.note_qcm}/10</p>` : ''}
        ${sub.note_redac !== null ? `<p><strong>Note rédaction :</strong> ${sub.note_redac}/20</p>` : ''}
        ${sub.note_finale !== null ? `<p><strong>Note finale :</strong> ${sub.note_finale}/30</p>` : ''}
        ${sub.commentaire ? `<p><strong>Commentaire :</strong> ${sub.commentaire}</p>` : ''}
    `;
    modalTitle.textContent = 'Détails de l\'examen';
    correctionForm.style.display = 'none';
    modal.classList.add('active');
};

// ===== OUVERTURE DE LA MODALE DE CORRECTION =====
window.openCorrection = async (id) => {
    const { data: sub, error } = await supabaseClient
        .from('exam_submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !sub) return;

    submissionId.value = id;
    noteQcm.value = sub.note_qcm !== null ? sub.note_qcm : '';
    noteRedac.value = sub.note_redac !== null ? sub.note_redac : '';
    noteFinale.value = sub.note_finale !== null ? sub.note_finale : '';
    commentaire.value = sub.commentaire || '';

    // Récupérer le nom du joueur pour l'affichage
    const { data: ins } = await supabaseClient
        .from('inscriptions')
        .select('nom')
        .eq('id', sub.playerid)
        .single();

    const nomJoueur = ins?.nom || 'Inconnu';
    const qcmReponses = sub.qcm || [];
    const redactions = sub.redaction || [];

    modalDetails.innerHTML = `
        <p><strong>Joueur :</strong> ${nomJoueur}</p>
        <p><strong>Date :</strong> ${new Date(sub.date).toLocaleString('fr-FR')}</p>
        <p><strong>Réponses QCM :</strong> ${qcmReponses.filter(v => v === '1').length} bonnes sur 10</p>
        <p><strong>Rédaction 1 :</strong> ${redactions[0]?.substring(0, 100)}...</p>
        <p><strong>Rédaction 2 :</strong> ${redactions[1]?.substring(0, 100)}...</p>
    `;
    modalTitle.textContent = 'Corriger l\'examen';
    correctionForm.style.display = 'block';
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
    correctionForm.style.display = 'block';
};

// ===== CALCUL NOTE FINALE =====
noteQcm.addEventListener('input', updateFinalNote);
noteRedac.addEventListener('input', updateFinalNote);

function updateFinalNote() {
    const qcm = parseFloat(noteQcm.value) || 0;
    const redac = parseFloat(noteRedac.value) || 0;
    noteFinale.value = (qcm + redac).toFixed(1);
}

// ===== SOUMISSION DU FORMULAIRE =====
correctionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = submissionId.value;
    const qcm = parseFloat(noteQcm.value);
    const redac = parseFloat(noteRedac.value);
    const finale = qcm + redac;
    const comment = commentaire.value.trim();

    const { error } = await supabaseClient
        .from('exam_submissions')
        .update({
            note_qcm: qcm,
            note_redac: redac,
            note_finale: finale,
            commentaire: comment,
            statut: 'note'
        })
        .eq('id', id);

    if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        alert('Erreur : ' + error.message);
    } else {
        closeModal();
        loadSubmissions();
    }
});

// ===== SUPPRESSION =====
window.deleteSubmission = async (id) => {
    if (!confirm('Supprimer cette soumission ?')) return;
    const { error } = await supabaseClient
        .from('exam_submissions')
        .delete()
        .eq('id', id);
    if (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur : ' + error.message);
    } else {
        loadSubmissions();
    }
};

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadSubmissions();