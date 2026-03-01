// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Récupérer l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const inscriptionId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('inscriptionDetails');
    if (!inscriptionId) {
        container.innerHTML = '<p class="error-message">❌ Aucun identifiant de suivi fourni.</p>';
        return;
    }

    // Récupérer les données de l'inscription
    const { data: inscription, error } = await supabaseClient
        .from('inscriptions')
        .select('*')
        .eq('id', inscriptionId)
        .single();

    if (error || !inscription) {
        container.innerHTML = '<p class="error-message">❌ Aucune inscription trouvée.</p>';
        return;
    }

    // Récupérer les messages pour ce joueur
    const { data: messages, error: msgError } = await supabaseClient
        .from('player_messages')
        .select('*')
        .eq('playerid', inscriptionId)
        .order('date', { ascending: false });

    if (msgError) console.error('Erreur chargement messages:', msgError);

    const dateNaissance = inscription.datenaissance ? new Date(inscription.datenaissance).toLocaleDateString('fr-FR') : 'Non renseignée';
    const dateSoumission = inscription.datesoumission ? new Date(inscription.datesoumission).toLocaleString('fr-FR') : 'Non renseignée';
    const statut = inscription.statut || 'en_attente';
    const statutTexte = {
        'en_attente': 'En attente de vérification',
        'valide': '✅ Validé',
        'refuse': '❌ Refusé'
    }[statut] || statut;

    const documents = `${inscription.diplomefilename ? '✅ Diplôme' : '❌ Diplôme'} | ${inscription.piecefilename ? '✅ Pièce' : '❌ Pièce'}`;

    // Générer le HTML des messages
    let messagesHtml = '';
    if (messages && messages.length > 0) {
        messagesHtml = '<h3>📩 Messages de l\'administrateur</h3>';
        messages.forEach(msg => {
            const dateMsg = new Date(msg.date).toLocaleString('fr-FR');
            messagesHtml += `
                <div class="message-item ${msg.type}">
                    <p>${msg.message}</p>
                    <small>${dateMsg}</small>
                </div>
            `;
        });
    } else {
        messagesHtml = '<p class="no-messages">Aucun message pour le moment.</p>';
    }

    const html = `
        <div class="suivi-card">
            <div class="suivi-header">
                <h1>Suivi de votre inscription</h1>
                <span class="status-badge ${statut}">${statutTexte}</span>
            </div>
            <div class="info-grid">
                <div class="info-item"><span class="label">ID :</span> <span class="value">${inscription.id}</span></div>
                <div class="info-item"><span class="label">Nom :</span> <span class="value">${inscription.nom}</span></div>
                <div class="info-item"><span class="label">Date naissance :</span> <span class="value">${dateNaissance}</span></div>
                <div class="info-item"><span class="label">Poste :</span> <span class="value">${inscription.poste}</span></div>
                <div class="info-item"><span class="label">Téléphone :</span> <span class="value">${inscription.telephone}</span></div>
                <div class="info-item"><span class="label">Diplôme :</span> <span class="value">${inscription.diplome}</span></div>
                <div class="info-item"><span class="label">Code tournoi :</span> <span class="value">${inscription.codetournoi || '-'}</span></div>
                <div class="info-item"><span class="label">Documents :</span> <span class="value">${documents}</span></div>
                <div class="info-item"><span class="label">Affilié :</span> <span class="value">${inscription.affilié || '-'}</span></div>
                <div class="info-item"><span class="label">Date soumission :</span> <span class="value">${dateSoumission}</span></div>
            </div>
            <div class="messages-section">
                ${messagesHtml}
            </div>
            <div class="actions">
                <button id="copyLinkBtn" class="btn-copy"><i class="fas fa-copy"></i> Copier le lien de suivi</button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Attacher l'événement de copie
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const link = window.location.href;
            navigator.clipboard.writeText(link).then(() => {
                alert('✅ Lien copié !');
            }).catch(() => {
                alert('❌ Erreur de copie');
            });
        });
    }
});
