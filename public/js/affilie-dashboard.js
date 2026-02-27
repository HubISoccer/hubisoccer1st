document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si un affilié est connecté
    const currentAffiliate = JSON.parse(sessionStorage.getItem('currentAffiliate'));
    if (!currentAffiliate) {
        window.location.href = 'affilie-login.html';
        return;
    }

    // Afficher le nom
    document.getElementById('affilieNom').textContent = currentAffiliate.nom || 'Affilié';

    // Récupérer les données
    const affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];
    const premiersPas = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
    const eMarketPurchases = JSON.parse(localStorage.getItem('emarket_purchases')) || [];

    // Compter le nombre de personnes affiliées via cet affilié
    const affilieId = currentAffiliate.id;
    // Inscriptions joueurs
    const joueursAffilies = premiersPas.filter(ins => ins.affilié === affilieId);
    // Achats produits
    const achatsAffilies = eMarketPurchases.filter(p => p.affilié === affilieId);
    const totalAffilies = joueursAffilies.length + achatsAffilies.length;
    const validatedAffilies = joueursAffilies.filter(ins => ins.statut === 'valide').length +
                              achatsAffilies.filter(p => p.statut === 'valide').length;

    // Gains : commission de 100 FCFA par validation
    const COMMISSION = 100;
    const gains = validatedAffilies * COMMISSION;

    document.getElementById('totalAffilies').textContent = totalAffilies;
    document.getElementById('validatedAffilies').textContent = validatedAffilies;
    document.getElementById('totalGains').textContent = gains.toLocaleString() + ' FCFA';

    // Gestion des demandes de paiement
    const paymentRequests = JSON.parse(localStorage.getItem('payment_requests')) || [];
    const myRequests = paymentRequests.filter(req => req.affilieId === affilieId);

    // Gestion des messages de l'admin
    const allMessages = JSON.parse(localStorage.getItem('affiliate_messages')) || [];
    const myMessages = allMessages.filter(msg => msg.affiliateId === affilieId);

    // Notifications
    const notifications = [];

    myMessages.forEach(msg => {
        notifications.push({
            type: 'info',
            message: `📨 Message de l'admin : ${msg.message}`,
            date: msg.date
        });
    });

    myRequests.forEach(req => {
        if (req.status === 'approuvé') {
            notifications.push({
                type: 'info',
                message: `✅ Votre demande de ${req.amount} FCFA a été approuvée.`,
                date: req.date
            });
        } else if (req.status === 'refusé') {
            notifications.push({
                type: 'error',
                message: `❌ Votre demande de ${req.amount} FCFA a été refusée. Motif : ${req.reason || 'Non spécifié'}`,
                date: req.date
            });
        }
    });

    renderPaymentRequests(myRequests);
    renderNotifications(notifications);

    // Nouvelle demande
    document.getElementById('newRequestBtn').addEventListener('click', () => {
        document.getElementById('requestModal').classList.add('active');
    });

    document.getElementById('paymentRequestForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseInt(document.getElementById('requestAmount').value);
        const method = document.getElementById('paymentMethod').value;
        const details = document.getElementById('paymentDetails').value.trim();

        const newRequest = {
            id: Date.now(),
            affilieId: affilieId,
            amount: amount,
            method: method,
            details: details,
            status: 'en_attente',
            date: new Date().toISOString(),
            reason: ''
        };

        paymentRequests.push(newRequest);
        localStorage.setItem('payment_requests', JSON.stringify(paymentRequests));

        closeModal();
        // Recharger la liste des demandes et les notifications
        const updatedRequests = paymentRequests.filter(req => req.affilieId === affilieId);
        renderPaymentRequests(updatedRequests);

        const newNotifications = [];
        myMessages.forEach(msg => newNotifications.push({ type: 'info', message: `📨 Message de l'admin : ${msg.message}`, date: msg.date }));
        updatedRequests.forEach(req => {
            if (req.status === 'approuvé') newNotifications.push({ type: 'info', message: `✅ Votre demande de ${req.amount} FCFA a été approuvée.`, date: req.date });
            else if (req.status === 'refusé') newNotifications.push({ type: 'error', message: `❌ Votre demande de ${req.amount} FCFA a été refusée. Motif : ${req.reason || 'Non spécifié'}`, date: req.date });
        });
        renderNotifications(newNotifications);
    });

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentAffiliate');
        window.location.href = 'affilie-login.html';
    });
});

function renderPaymentRequests(requests) {
    const container = document.getElementById('paymentRequestsList');
    if (requests.length === 0) {
        container.innerHTML = '<p class="no-data">Aucune demande pour le moment.</p>';
        return;
    }

    let html = '';
    requests.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(req => {
        let statusClass = '';
        let statusText = '';
        switch (req.status) {
            case 'en_attente':
                statusClass = 'pending';
                statusText = 'En attente';
                break;
            case 'approuvé':
                statusClass = 'approved';
                statusText = 'Approuvé';
                break;
            case 'refusé':
                statusClass = 'rejected';
                statusText = 'Refusé';
                break;
        }
        html += `
            <div class="request-item ${statusClass}">
                <div class="request-info">
                    <p><strong>${req.amount.toLocaleString()} FCFA</strong> via ${req.method}</p>
                    <p>${new Date(req.date).toLocaleDateString('fr-FR')}</p>
                    ${req.reason ? `<p class="request-reason">Motif : ${req.reason}</p>` : ''}
                </div>
                <span class="request-status status-${req.status}">${statusText}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (notifications.length === 0) {
        container.innerHTML = '<p class="no-data">Aucune notification.</p>';
        return;
    }

    let html = '';
    notifications.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(n => {
        html += `
            <div class="notification ${n.type}">
                <span>${n.message}</span>
                <small>${new Date(n.date).toLocaleDateString('fr-FR')}</small>
            </div>
        `;
    });
    container.innerHTML = html;
}

function closeModal() {
    document.getElementById('requestModal').classList.remove('active');
    document.getElementById('paymentRequestForm').reset();
}
window.closeModal = closeModal;