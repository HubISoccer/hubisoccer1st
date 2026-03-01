// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const playerSelect = document.getElementById('playerSelect');
const messageForm = document.getElementById('messageForm');
const messageType = document.getElementById('messageType');
const messageText = document.getElementById('messageText');
const messagesHistory = document.getElementById('messagesHistory');

// Charger la liste des joueurs (inscriptions)
async function loadPlayers() {
    const { data: inscriptions, error } = await supabaseClient
        .from('inscriptions')
        .select('id, nom')
        .order('nom');

    if (error) {
        console.error('Erreur chargement joueurs:', error);
        return;
    }

    playerSelect.innerHTML = '<option value="">Sélectionnez un joueur</option>';
    inscriptions.forEach(ins => {
        const option = document.createElement('option');
        option.value = ins.id;
        option.textContent = `${ins.nom} (ID: ${ins.id})`;
        playerSelect.appendChild(option);
    });
}

// Charger l'historique des messages
async function loadMessagesHistory() {
    const { data: messages, error } = await supabaseClient
        .from('player_messages')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Erreur chargement historique:', error);
        messagesHistory.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!messages || messages.length === 0) {
        messagesHistory.innerHTML = '<p class="no-data">Aucun message envoyé.</p>';
        return;
    }

    // Récupérer les noms des joueurs pour les afficher
    const { data: inscriptions } = await supabaseClient
        .from('inscriptions')
        .select('id, nom');

    const playerMap = {};
    if (inscriptions) {
        inscriptions.forEach(ins => playerMap[ins.id] = ins.nom);
    }

    let html = '';
    messages.forEach(msg => {
        const typeClass = `type-${msg.type}`;
        const date = new Date(msg.date).toLocaleString('fr-FR');
        const playerName = playerMap[msg.playerid] || 'Inconnu';

        html += `
            <div class="list-item" data-id="${msg.id}">
                <div class="info">
                    <strong>À: ${playerName}</strong>
                    <div class="details">
                        <span class="message-type ${typeClass}">${msg.type}</span>
                        <span>${date}</span>
                    </div>
                    <p>${msg.message}</p>
                </div>
                <div class="actions">
                    <button class="delete" onclick="deleteMessage(${msg.id})" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    messagesHistory.innerHTML = html;
}

// Envoyer un message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerId = playerSelect.value;
    const type = messageType.value;
    const message = messageText.value.trim();

    if (!playerId || !message) {
        alert('Veuillez sélectionner un joueur et écrire un message.');
        return;
    }

    const newMessage = {
        playerid: playerId,
        type: type,
        message: message,
        date: new Date().toISOString(),
        lu: false
    };

    const { error } = await supabaseClient
        .from('player_messages')
        .insert([newMessage]);

    if (error) {
        alert('Erreur envoi message : ' + error.message);
    } else {
        alert('✅ Message envoyé avec succès !');
        playerSelect.value = '';
        messageText.value = '';
        messageType.value = 'info';
        loadMessagesHistory(); // Recharger l'historique
    }
});

// Supprimer un message
window.deleteMessage = async (id) => {
    if (!confirm('Supprimer ce message ?')) return;
    const { error } = await supabaseClient
        .from('player_messages')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadMessagesHistory();
    }
};

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadPlayers();
loadMessagesHistory();
