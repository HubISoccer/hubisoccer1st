// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const COMMISSION = 100; // FCFA par affilié validé

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier si un affilié est connecté
    const currentAffiliate = JSON.parse(sessionStorage.getItem('currentAffiliate'));
    if (!currentAffiliate) {
        window.location.href = 'affilie-login.html';
        return;
    }

    // Afficher le nom
    document.getElementById('affilieNom').textContent = currentAffiliate.nom || 'Affilié';

    // Compter le nombre d'inscriptions avec cet affilié
    const { data: inscriptions, error: err1 } = await supabaseClient
        .from('inscriptions')
        .select('*')
        .eq('affilié', currentAffiliate.id);

    const totalInscriptions = inscriptions ? inscriptions.length : 0;
    const validatedInscriptions = inscriptions ? inscriptions.filter(ins => ins.statut === 'valide').length : 0;

    const totalAffilies = totalInscriptions; // + achats plus tard
    const validatedAffilies = validatedInscriptions;
    const gains = validatedAffilies * COMMISSION;

    document.getElementById('totalAffilies').textContent = totalAffilies;
    document.getElementById('validatedAffilies').textContent = validatedAffilies;
    document.getElementById('totalGains').textContent = gains.toLocaleString() + ' FCFA';

    // Récupérer les demandes de paiement
    const { data: paymentRequests, error: err2 } = await supabaseClient
        .from('payment_requests')
        .select('*')
        .eq('affilieId', currentAffiliate.id)
        .order('date', { ascending: false });

    if (err2) console.error('Erreur chargement demandes:', err2);

    // Récupérer les messages de l'admin (colonne en minuscules : affiliateid)
    const { data: messages, error: err3 } = await supabaseClient
        .from('affiliate_messages')
        .select('*')
        .eq('affiliateid', currentAffiliate.id)  // ← CORRIGÉ : minuscules
        .order('date', { ascending: false });

    if (err3) console.error('Erreur chargement messages:', err3);

    // Construire les notifications
    const notifications = [];

    if (messages) {
        messages.forEach(msg => {
            notifications.push({
                type: 'info',
                message: `📨 Message de l'admin : ${msg.message}`,
                date: msg.date
            });
        });
    }

    if (paymentRequests) {
        paymentRequests.forEach(req => {
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
    }

    renderPaymentRequests(paymentRequests || []);
    renderNotifications(notifications);

    // Nouvelle demande
    document.getElementById('newRequestBtn').addEventListener('click', () => {
        document.getElementById('requestModal').classList.add('active');
    });

    document.getElementById('paymentRequestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseInt(document.getElementById('requestAmount').value);
        const method = document.getElementById('paymentMethod').value;
        const details = document.getElementById('paymentDetails').value.trim();

        const newRequest = {
            affilieId: currentAffiliate.id,
            amount: amount,
            method: method,
            details: details,
            status: 'en_attente',
            date: new Date().toISOString(),
            reason: ''
        };

        const { error } = await supabaseClient
            .from('payment_requests')
            .insert([newRequest]);

        if (error) {
            alert('Erreur lors de la création de la demande : ' + error.message);
        } else {
            closeModal();
            location.reload();
        }
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
    requests.forEach(req => {
        let statusClass = '', statusText = '';
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
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(n => {
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