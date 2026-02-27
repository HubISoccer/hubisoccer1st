// ===== ÉLÉMENTS DOM =====
const playerSelect = document.getElementById('playerSelect');
const messageForm = document.getElementById('messageForm');
const messageType = document.getElementById('messageType');
const messageText = document.getElementById('messageText');
const messagesHistory = document.getElementById('messagesHistory');

// ===== CHARGEMENT DES JOUEURS =====
function loadPlayers() {
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    playerSelect.innerHTML = '<option value="">Sélectionnez un joueur</option>';
    inscriptions.forEach(ins => {
        const option = document.createElement('option');
        option.value = ins.id;
        option.textContent = `${ins.nom} (ID: ${ins.id})`;
        playerSelect.appendChild(option);
    });
}

// ===== CHARGEMENT DE L'HISTORIQUE =====
function loadMessagesHistory() {
    const messages = JSON.parse(localStorage.getItem('player_messages')) || [];
    const inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];

    if (messages.length === 0) {
        messagesHistory.innerHTML = '<p class="no-data">Aucun message envoyé.</p>';
        return;
    }

    // Trier du plus récent au plus ancien
    messages.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    messages.forEach((msg, index) => {
        const player = inscriptions.find(ins => ins.id == msg.playerId) || { nom: 'Inconnu' };
        const typeClass = `type-${msg.type}`;
        const date = new Date(msg.date).toLocaleString('fr-FR');

        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>À: ${player.nom}</strong>
                    <div class="details">
                        <span class="message-type ${typeClass}">${msg.type}</span>
                        <span>${date}</span>
                    </div>
                    <p>${msg.message}</p>
                </div>
                <div class="actions">
                    <button class="delete" onclick="deleteMessage(${index})" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    messagesHistory.innerHTML = html;
}

// ===== ENVOI D'UN MESSAGE =====
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const playerId = playerSelect.value;
    const type = messageType.value;
    const message = messageText.value.trim();

    if (!playerId || !message) {
        alert('Veuillez sélectionner un joueur et écrire un message.');
        return;
    }

    const newMessage = {
        id: Date.now(),
        playerId: playerId,
        type: type,
        message: message,
        date: new Date().toISOString(),
        lu: false
    };

    let messages = JSON.parse(localStorage.getItem('player_messages')) || [];
    messages.push(newMessage);
    localStorage.setItem('player_messages', JSON.stringify(messages));

    // Réinitialiser le formulaire
    playerSelect.value = '';
    messageText.value = '';
    messageType.value = 'info';

    // Recharger l'historique
    loadMessagesHistory();
    alert('Message envoyé avec succès !');
});

// ===== SUPPRESSION D'UN MESSAGE =====
window.deleteMessage = (index) => {
    if (!confirm('Supprimer ce message ?')) return;
    let messages = JSON.parse(localStorage.getItem('player_messages')) || [];
    messages.splice(index, 1);
    localStorage.setItem('player_messages', JSON.stringify(messages));
    loadMessagesHistory();
};

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadPlayers();
loadMessagesHistory();