// ===== CONFIGURATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseMarket = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== ÉLÉMENTS DOM =====
const featuredContainer = document.getElementById('featuredPacks');
const allProductsContainer = document.getElementById('allProducts');
const cartCountSpan = document.getElementById('cartCount');
const cartFloat = document.getElementById('cartFloat');
const cartModal = document.getElementById('cartModal');
const cartItemsDiv = document.getElementById('cartItems');
const cartTotalHTSpan = document.getElementById('cartTotalHT');
const cartTVASpan = document.getElementById('cartTVA');
const cartTotalTTCSpan = document.getElementById('cartTotalTTC');
const checkoutBtn = document.getElementById('checkoutBtn');
const authModal = document.getElementById('authModal');
const checkoutModal = document.getElementById('checkoutModal');
const accountModal = document.getElementById('accountModal');
const sendMessageModal = document.getElementById('sendMessageModal');
const orderDetailModal = document.getElementById('orderDetailModal');

// Formulaires auth
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm = document.getElementById('forgotForm');
const authModalTitle = document.getElementById('authModalTitle');

// Champs auth
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const regFirstName = document.getElementById('regFirstName');
const regLastName = document.getElementById('regLastName');
const regEmail = document.getElementById('regEmail');
const regPhone = document.getElementById('regPhone');
const regPassword = document.getElementById('regPassword');
const regPasswordConfirm = document.getElementById('regPasswordConfirm');
const forgotEmail = document.getElementById('forgotEmail');

// Éléments de navigation
const customerGreeting = document.getElementById('customerGreeting');
const logoutCustomerLink = document.getElementById('logoutCustomerLink');
const myAccountLink = document.getElementById('myAccountLink');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Éléments du checkout
const checkoutFullName = document.getElementById('checkoutFullName');
const checkoutEmail = document.getElementById('checkoutEmail');
const checkoutPhone = document.getElementById('checkoutPhone');
const checkoutSummary = document.getElementById('checkoutSummary');
const checkoutTotalHTSpan = document.getElementById('checkoutTotalHT');
const checkoutTVASpan = document.getElementById('checkoutTVA');
const checkoutTotalTTCSpan = document.getElementById('checkoutTotalTTC');
const checkoutForm = document.getElementById('checkoutForm');

// Éléments du compte client
const ordersListDiv = document.getElementById('ordersList');
const messagesListDiv = document.getElementById('messagesList');
const profileFirstName = document.getElementById('profileFirstName');
const profileLastName = document.getElementById('profileLastName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const editProfileBtn = document.getElementById('editProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileForm = document.getElementById('profileForm');
const newMessageBtn = document.getElementById('newMessageBtn');
const tabBtns = document.querySelectorAll('.tab-btn');

// Éléments du message
const messageOrderId = document.getElementById('messageOrderId');
const newMessageText = document.getElementById('newMessageText');
const sendMessageForm = document.getElementById('sendMessageForm');

// Élément détail commande
const orderDetailContent = document.getElementById('orderDetailContent');

// ===== ÉTAT GLOBAL =====
let currentCustomer = null; // { id, first_name, last_name, email, phone }
let cart = JSON.parse(localStorage.getItem('emarket_cart')) || [];
let products = []; // tous les produits chargés

// ===== FONCTIONS DE PANIER =====
function emarketUpdateCartCount() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCountSpan.textContent = totalItems;
    localStorage.setItem('emarket_cart', JSON.stringify(cart));
}

function emarketRenderCartModal() {
    if (!cartItemsDiv) return;
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Votre panier est vide.</p>';
        cartTotalHTSpan.textContent = '0';
        cartTVASpan.textContent = '0';
        cartTotalTTCSpan.textContent = '0';
        return;
    }
    let html = '';
    let totalHT = 0;
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return;
        const subtotal = product.price * item.quantity;
        totalHT += subtotal;
        html += `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-info">
                    <h4>${product.name}</h4>
                    <p>${product.price} FCFA x ${item.quantity}</p>
                </div>
                <div class="cart-item-actions">
                    <button class="cart-qty-minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="cart-qty-plus" data-id="${item.id}">+</button>
                    <button class="cart-remove" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    const tva = Math.round(totalHT * 0.18);
    const totalTTC = totalHT + tva;
    cartItemsDiv.innerHTML = html;
    cartTotalHTSpan.textContent = totalHT;
    cartTVASpan.textContent = tva;
    cartTotalTTCSpan.textContent = totalTTC;
}

function emarketAddToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity++;
    else cart.push({ id: productId, quantity: 1 });
    emarketUpdateCartCount();
    emarketRenderCartModal();
    emarketShowToast('Produit ajouté au panier', 'success');
}

function emarketUpdateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index === -1) return;
    const newQty = cart[index].quantity + delta;
    if (newQty <= 0) cart.splice(index, 1);
    else cart[index].quantity = newQty;
    emarketUpdateCartCount();
    emarketRenderCartModal();
}

function emarketRemoveCartItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    emarketUpdateCartCount();
    emarketRenderCartModal();
}

// ===== CHARGEMENT DES PRODUITS =====
async function emarketLoadProducts() {
    const { data, error } = await supabaseMarket
        .from('products')
        .select('*')
        .order('id');
    if (error) {
        console.error('Erreur chargement produits:', error);
        featuredContainer.innerHTML = '<p>Erreur de chargement.</p>';
        allProductsContainer.innerHTML = '<p>Erreur de chargement.</p>';
        return;
    }
    products = data || [];
    emarketRenderProducts();
}

function emarketRenderProducts() {
    if (!products.length) {
        featuredContainer.innerHTML = '<p>Aucun produit.</p>';
        allProductsContainer.innerHTML = '<p>Aucun produit.</p>';
        return;
    }
    const featured = products.filter(p => p.featured);
    const others = products.filter(p => !p.featured);
    featuredContainer.innerHTML = featured.map(p => emarketRenderProductCard(p)).join('');
    allProductsContainer.innerHTML = others.map(p => emarketRenderProductCard(p)).join('');
}

function emarketRenderProductCard(product) {
    const stockClass = product.stock ? '' : 'out-of-stock';
    const stockText = product.stock ? 'En stock' : 'Épuisé';
    return `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.image_url || 'public/img/placeholder.jpg'}" alt="${product.name}" onerror="this.src='public/img/placeholder.jpg'">
                ${product.featured ? '<span class="featured-badge">🔥 Vedette</span>' : ''}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-desc">${product.description || ''}</p>
                <div class="product-meta">
                    <span class="product-price">${product.price}</span>
                    <span class="product-stock ${stockClass}">${stockText}</span>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" data-id="${product.id}" ${!product.stock ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Ajouter
                    </button>
                    <button class="btn-details" data-id="${product.id}" title="Détails">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== AUTHENTIFICATION CLIENT =====
async function emarketRegisterCustomer(firstName, lastName, email, phone, password) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const { data, error } = await supabaseMarket
        .from('emarket_customers')
        .insert([{ first_name: firstName, last_name: lastName, email, phone, password: hash }])
        .select()
        .single();
    if (error) {
        emarketShowToast('Erreur inscription : ' + error.message, 'error');
        return null;
    }
    currentCustomer = data;
    localStorage.setItem('emarket_customer', JSON.stringify(data));
    emarketUpdateCustomerUI();
    emarketShowToast('Inscription réussie', 'success');
    emarketCloseAuthModal();
    return data;
}

async function emarketLoginCustomer(email, password) {
    const { data, error } = await supabaseMarket
        .from('emarket_customers')
        .select('*')
        .eq('email', email)
        .single();
    if (error || !data) {
        emarketShowToast('Email ou mot de passe incorrect', 'error');
        return null;
    }
    const valid = bcrypt.compareSync(password, data.password);
    if (!valid) {
        emarketShowToast('Email ou mot de passe incorrect', 'error');
        return null;
    }
    currentCustomer = data;
    localStorage.setItem('emarket_customer', JSON.stringify(data));
    emarketUpdateCustomerUI();
    emarketShowToast('Connexion réussie', 'success');
    emarketCloseAuthModal();
    return data;
}

function emarketHandleLogoutCustomer() {
    currentCustomer = null;
    localStorage.removeItem('emarket_customer');
    emarketUpdateCustomerUI();
    emarketShowToast('Déconnecté', 'info');
}

function emarketUpdateCustomerUI() {
    if (currentCustomer) {
        customerGreeting.textContent = `Bonjour ${currentCustomer.first_name}`;
        customerGreeting.style.display = 'inline';
        logoutCustomerLink.style.display = 'inline';
        myAccountLink.style.display = 'inline';
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
    } else {
        customerGreeting.style.display = 'none';
        logoutCustomerLink.style.display = 'none';
        myAccountLink.style.display = 'none';
        loginBtn.style.display = 'inline';
        signupBtn.style.display = 'inline';
    }
}

// ===== MODALES =====
function emarketOpenCartModal() {
    emarketRenderCartModal();
    cartModal.classList.add('active');
}

function emarketCloseCartModal() {
    cartModal.classList.remove('active');
}

function emarketOpenAuthModal() {
    authModal.classList.add('active');
}

function emarketCloseAuthModal() {
    authModal.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
}

function emarketShowLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    authModalTitle.textContent = 'Connexion';
}

function emarketShowRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    forgotForm.style.display = 'none';
    authModalTitle.textContent = 'Inscription';
}

function emarketShowForgotPassword() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'block';
    authModalTitle.textContent = 'Mot de passe oublié';
}

function emarketOpenCheckoutModal() {
    if (!currentCustomer) {
        emarketOpenAuthModal();
        return;
    }
    if (cart.length === 0) {
        emarketShowToast('Votre panier est vide', 'error');
        return;
    }
    checkoutFullName.value = `${currentCustomer.first_name} ${currentCustomer.last_name}`;
    checkoutEmail.value = currentCustomer.email;
    checkoutPhone.value = currentCustomer.phone || '';
    let summaryHtml = '';
    let totalHT = 0;
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return;
        const subtotal = product.price * item.quantity;
        totalHT += subtotal;
        summaryHtml += `<p>${product.name} x${item.quantity} = ${subtotal} FCFA</p>`;
    });
    const tva = Math.round(totalHT * 0.18);
    const totalTTC = totalHT + tva;
    checkoutSummary.innerHTML = summaryHtml;
    checkoutTotalHTSpan.textContent = totalHT;
    checkoutTVASpan.textContent = tva;
    checkoutTotalTTCSpan.textContent = totalTTC;
    checkoutModal.classList.add('active');
}

function emarketCloseCheckoutModal() {
    checkoutModal.classList.remove('active');
}

function emarketOpenAccountModal() {
    if (!currentCustomer) {
        emarketOpenAuthModal();
        return;
    }
    emarketLoadCustomerOrders();
    emarketLoadCustomerMessages();
    // Remplir le profil
    profileFirstName.value = currentCustomer.first_name || '';
    profileLastName.value = currentCustomer.last_name || '';
    profileEmail.value = currentCustomer.email || '';
    profilePhone.value = currentCustomer.phone || '';
    accountModal.classList.add('active');
}

function emarketCloseAccountModal() {
    accountModal.classList.remove('active');
}

function emarketOpenSendMessageModal(orderId = null) {
    if (!currentCustomer) {
        emarketOpenAuthModal();
        return;
    }
    messageOrderId.value = orderId || '';
    newMessageText.value = '';
    sendMessageModal.classList.add('active');
}

function emarketCloseSendMessageModal() {
    sendMessageModal.classList.remove('active');
}

function emarketOpenOrderDetailModal(orderId) {
    emarketLoadOrderDetail(orderId);
    orderDetailModal.classList.add('active');
}

function emarketCloseOrderDetailModal() {
    orderDetailModal.classList.remove('active');
}

// ===== CHARGEMENT DES COMMANDES DU CLIENT =====
async function emarketLoadCustomerOrders() {
    if (!currentCustomer) return;
    const { data, error } = await supabaseMarket
        .from('emarket_orders')
        .select('*')
        .eq('customer_id', currentCustomer.id)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erreur chargement commandes:', error);
        ordersListDiv.innerHTML = '<p>Erreur de chargement.</p>';
        return;
    }
    if (!data.length) {
        ordersListDiv.innerHTML = '<p>Aucune commande.</p>';
        return;
    }
    let html = '';
    data.forEach(order => {
        html += `
            <div class="order-item" data-id="${order.id}">
                <p><strong>Commande #${order.id}</strong> - ${new Date(order.created_at).toLocaleString()}</p>
                <p>Statut : ${order.status} - Total TTC : ${order.total_ttc} FCFA</p>
                <button class="btn-view-order" onclick="emarketOpenOrderDetailModal(${order.id})">Voir détail</button>
                <button class="btn-message" onclick="emarketOpenSendMessageModal(${order.id})">Message</button>
            </div>
        `;
    });
    ordersListDiv.innerHTML = html;
}

// ===== CHARGEMENT DES MESSAGES DU CLIENT =====
async function emarketLoadCustomerMessages() {
    if (!currentCustomer) return;
    const { data, error } = await supabaseMarket
        .from('emarket_messages')
        .select('*')
        .eq('customer_id', currentCustomer.id)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erreur chargement messages:', error);
        messagesListDiv.innerHTML = '<p>Erreur de chargement.</p>';
        return;
    }
    if (!data.length) {
        messagesListDiv.innerHTML = '<p>Aucun message.</p>';
        return;
    }
    let html = '';
    data.forEach(msg => {
        html += `
            <div class="message-item">
                <p><strong>${new Date(msg.created_at).toLocaleString()}</strong> ${msg.order_id ? '(Commande #' + msg.order_id + ')' : ''}</p>
                <p>${msg.message}</p>
                ${msg.admin_reply ? '<p><strong>Réponse admin :</strong> ' + msg.admin_reply + '</p>' : ''}
            </div>
        `;
    });
    messagesListDiv.innerHTML = html;
}

// ===== CHARGEMENT DU DÉTAIL D'UNE COMMANDE =====
async function emarketLoadOrderDetail(orderId) {
    const { data: order, error } = await supabaseMarket
        .from('emarket_orders')
        .select('*, emarket_order_items(*, products(*))')
        .eq('id', orderId)
        .single();
    if (error) {
        orderDetailContent.innerHTML = '<p>Erreur chargement commande.</p>';
        return;
    }
    let itemsHtml = '';
    order.emarket_order_items.forEach(item => {
        itemsHtml += `<p>${item.products.name} x${item.quantity} = ${item.total_price} FCFA</p>`;
    });
    orderDetailContent.innerHTML = `
        <p><strong>Commande #${order.id}</strong></p>
        <p>Date : ${new Date(order.created_at).toLocaleString()}</p>
        <p>Statut : ${order.status}</p>
        <p>Total HT : ${order.total_ht} FCFA</p>
        <p>TVA (18%) : ${order.tva} FCFA</p>
        <p><strong>Total TTC : ${order.total_ttc} FCFA</strong></p>
        <p>Articles :</p>
        ${itemsHtml}
        ${order.invoice_proforma_url ? `<p><a href="${order.invoice_proforma_url}" target="_blank">Facture proforma</a></p>` : ''}
        ${order.invoice_definitive_url ? `<p><a href="${order.invoice_definitive_url}" target="_blank">Facture définitive</a></p>` : ''}
        ${order.tracking_info ? `<p>Suivi : ${order.tracking_info}</p>` : ''}
    `;
}

// ===== CRÉATION DE COMMANDE ET PAIEMENT =====
async function emarketCreateOrder() {
    const totalHT = cart.reduce((sum, item) => {
        const p = products.find(p => p.id === item.id);
        return sum + (p ? p.price * item.quantity : 0);
    }, 0);
    const tva = Math.round(totalHT * 0.18);
    const totalTTC = totalHT + tva;

    const { data: order, error: orderError } = await supabaseMarket
        .from('emarket_orders')
        .insert([{
            customer_id: currentCustomer.id,
            total_ht: totalHT,
            tva: tva,
            total_ttc: totalTTC,
            status: 'en_attente'
        }])
        .select()
        .single();

    if (orderError) {
        emarketShowToast('Erreur création commande', 'error');
        return null;
    }

    const items = cart.map(item => {
        const p = products.find(p => p.id === item.id);
        return {
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: p.price,
            total_price: p.price * item.quantity
        };
    });
    const { error: itemsError } = await supabaseMarket
        .from('emarket_order_items')
        .insert(items);
    if (itemsError) {
        emarketShowToast('Erreur enregistrement articles', 'error');
        return null;
    }
    return order;
}

async function emarketGenerateProformaInvoice(order, customer) {
    const element = document.createElement('div');
    element.innerHTML = `
        <h1>Facture Proforma</h1>
        <p>Commande #${order.id}</p>
        <p>Client : ${customer.first_name} ${customer.last_name}</p>
        <p>Email : ${customer.email}</p>
        <p>Téléphone : ${customer.phone}</p>
        <table border="1" cellpadding="5" style="border-collapse: collapse; width:100%;">
            <tr><th>Produit</th><th>Qté</th><th>Prix unitaire HT</th><th>Total HT</th></tr>
            ${cart.map(item => {
                const p = products.find(p => p.id === item.id);
                return `<tr><td>${p.name}</td><td>${item.quantity}</td><td>${p.price}</td><td>${p.price * item.quantity}</td></tr>`;
            }).join('')}
        </table>
        <p>Total HT : ${order.total_ht} FCFA</p>
        <p>TVA (18%) : ${order.tva} FCFA</p>
        <p><strong>Total TTC : ${order.total_ttc} FCFA</strong></p>
        <p>Date : ${new Date().toLocaleString()}</p>
    `;
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `proforma_${order.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
    const fileName = `invoices/proforma_${order.id}.pdf`;
    const { error } = await supabaseMarket.storage
        .from('invoices')
        .upload(fileName, pdfBlob, { upsert: true });
    if (error) {
        console.error('Erreur upload facture proforma', error);
        return null;
    }
    const { publicURL } = supabaseMarket.storage.from('invoices').getPublicUrl(fileName);
    return publicURL;
}

async function emarketHandleCheckout(e) {
    e.preventDefault();
    if (!currentCustomer) {
        emarketOpenAuthModal();
        return;
    }
    const order = await emarketCreateOrder();
    if (!order) return;

    const proformaUrl = await emarketGenerateProformaInvoice(order, currentCustomer);
    if (proformaUrl) {
        await supabaseMarket
            .from('emarket_orders')
            .update({ invoice_proforma_url: proformaUrl })
            .eq('id', order.id);
    }

    const firstProduct = products.find(p => p.id === cart[0]?.id);
    const paymentUrl = firstProduct?.payment_url || 'https://fedapay.com';
    // Rediriger vers la page de paiement avec l'ID de commande
    window.location.href = `${paymentUrl}?orderId=${order.id}`;

    // Vider le panier
    cart = [];
    emarketUpdateCartCount();
    emarketCloseCheckoutModal();
    emarketCloseCartModal();
}

// ===== MESSAGES =====
async function emarketSendCustomerMessage(e) {
    e.preventDefault();
    if (!currentCustomer) {
        emarketOpenAuthModal();
        return;
    }
    const orderId = messageOrderId.value || null;
    const message = newMessageText.value.trim();
    if (!message) return;

    const { error } = await supabaseMarket
        .from('emarket_messages')
        .insert([{
            customer_id: currentCustomer.id,
            order_id: orderId,
            message: message,
            is_read: false
        }]);
    if (error) {
        emarketShowToast('Erreur envoi message: ' + error.message, 'error');
    } else {
        emarketShowToast('Message envoyé', 'success');
        emarketCloseSendMessageModal();
        if (accountModal.classList.contains('active')) {
            emarketLoadCustomerMessages();
        }
    }
}

// ===== GESTION DES ONGLETS DU COMPTE =====
function emarketSwitchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab' + tabId).classList.add('active');
    event.target.classList.add('active');
}

// ===== AFFICHER/MASQUER MOT DE PASSE =====
function emarketTogglePassword(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

// ===== TOAST =====
function emarketShowToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ===== RÉINITIALISATION DU MOT DE PASSE (simulé) =====
async function emarketHandleForgotPassword(e) {
    e.preventDefault();
    const email = forgotEmail.value.trim();
    if (!email) return;
    // Ici on pourrait appeler une edge function pour envoyer un email
    emarketShowToast('Un lien de réinitialisation a été envoyé à votre adresse email.', 'info');
    emarketShowLoginForm();
}

// ===== MISE À JOUR DU PROFIL (simulée) =====
function emarketEnableProfileEdit() {
    profileFirstName.readOnly = false;
    profileLastName.readOnly = false;
    profileEmail.readOnly = false;
    profilePhone.readOnly = false;
    editProfileBtn.style.display = 'none';
    saveProfileBtn.style.display = 'inline-block';
}

function emarketSaveProfile(e) {
    e.preventDefault();
    // I on pourrait mettre à jour en base, mais pour l'instant on simule
    currentCustomer.first_name = profileFirstName.value;
    currentCustomer.last_name = profileLastName.value;
    currentCustomer.email = profileEmail.value;
    currentCustomer.phone = profilePhone.value;
    localStorage.setItem('emarket_customer', JSON.stringify(currentCustomer));
    profileFirstName.readOnly = true;
    profileLastName.readOnly = true;
    profileEmail.readOnly = true;
    profilePhone.readOnly = true;
    editProfileBtn.style.display = 'inline-block';
    saveProfileBtn.style.display = 'none';
    emarketShowToast('Profil mis à jour', 'success');
    emarketUpdateCustomerUI();
}

// ===== INITIALISATION =====
async function emarketInit() {
    const saved = localStorage.getItem('emarket_customer');
    if (saved) {
        try { currentCustomer = JSON.parse(saved); } catch (e) {}
    }
    emarketUpdateCustomerUI();
    await emarketLoadProducts();

    // Événements
    cartFloat.addEventListener('click', emarketOpenCartModal);

    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.btn-add-cart');
        if (addBtn && !addBtn.disabled) {
            emarketAddToCart(parseInt(addBtn.dataset.id));
            return;
        }
        const detailsBtn = e.target.closest('.btn-details');
        if (detailsBtn) {
            alert('Détails produit (à venir)');
            return;
        }
        const minusBtn = e.target.closest('.cart-qty-minus');
        if (minusBtn) {
            emarketUpdateCartItem(parseInt(minusBtn.dataset.id), -1);
            return;
        }
        const plusBtn = e.target.closest('.cart-qty-plus');
        if (plusBtn) {
            emarketUpdateCartItem(parseInt(plusBtn.dataset.id), 1);
            return;
        }
        const removeBtn = e.target.closest('.cart-remove');
        if (removeBtn) {
            emarketRemoveCartItem(parseInt(removeBtn.dataset.id));
            return;
        }
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            emarketCloseCartModal();
            emarketCloseAuthModal();
            emarketCloseCheckoutModal();
            emarketCloseAccountModal();
            emarketCloseSendMessageModal();
            emarketCloseOrderDetailModal();
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            emarketCloseCartModal();
            emarketCloseAuthModal();
            emarketCloseCheckoutModal();
            emarketCloseAccountModal();
            emarketCloseSendMessageModal();
            emarketCloseOrderDetailModal();
        }
    });

    // Auth
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail.value;
        const password = loginPassword.value;
        await emarketLoginCustomer(email, password);
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = regFirstName.value;
        const lastName = regLastName.value;
        const email = regEmail.value;
        const phone = regPhone.value;
        const password = regPassword.value;
        const confirm = regPasswordConfirm.value;
        if (password !== confirm) {
            emarketShowToast('Les mots de passe ne correspondent pas', 'error');
            return;
        }
        await emarketRegisterCustomer(firstName, lastName, email, phone, password);
    });

    forgotForm.addEventListener('submit', emarketHandleForgotPassword);

    logoutCustomerLink.addEventListener('click', (e) => {
        e.preventDefault();
        emarketHandleLogoutCustomer();
    });

    myAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        emarketOpenAccountModal();
    });

    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        emarketOpenAuthModal();
    });

    signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        emarketShowRegisterForm();
        emarketOpenAuthModal();
    });

    // Checkout
    checkoutBtn.addEventListener('click', emarketOpenCheckoutModal);
    checkoutForm.addEventListener('submit', emarketHandleCheckout);

    // Messages
    sendMessageForm.addEventListener('submit', emarketSendCustomerMessage);
    newMessageBtn.addEventListener('click', () => emarketOpenSendMessageModal());

    // Onglets compte
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            emarketSwitchTab(tab.charAt(0).toUpperCase() + tab.slice(1));
        });
    });

    // Profil
    editProfileBtn.addEventListener('click', emarketEnableProfileEdit);
    profileForm.addEventListener('submit', emarketSaveProfile);

    emarketUpdateCartCount();
}

// Démarrer
emarketInit();

// Rendre les fonctions globales pour les attributs onclick
window.emarketCloseCartModal = emarketCloseCartModal;
window.emarketCloseAuthModal = emarketCloseAuthModal;
window.emarketCloseCheckoutModal = emarketCloseCheckoutModal;
window.emarketCloseAccountModal = emarketCloseAccountModal;
window.emarketCloseSendMessageModal = emarketCloseSendMessageModal;
window.emarketCloseOrderDetailModal = emarketCloseOrderDetailModal;
window.emarketShowLoginForm = emarketShowLoginForm;
window.emarketShowRegisterForm = emarketShowRegisterForm;
window.emarketShowForgotPassword = emarketShowForgotPassword;
window.emarketTogglePassword = emarketTogglePassword;
window.emarketOpenOrderDetailModal = emarketOpenOrderDetailModal;
window.emarketOpenSendMessageModal = emarketOpenSendMessageModal;
