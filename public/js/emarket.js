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
const cartTotalSpan = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const authModal = document.getElementById('authModal');
const checkoutModal = document.getElementById('checkoutModal');
const messageModal = document.getElementById('messageModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authModalTitle = document.getElementById('authModalTitle');
const customerGreeting = document.getElementById('customerGreeting');
const logoutCustomerLink = document.getElementById('logoutCustomer');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Éléments du checkout
const checkoutFullName = document.getElementById('checkoutFullName');
const checkoutEmail = document.getElementById('checkoutEmail');
const checkoutPhone = document.getElementById('checkoutPhone');
const checkoutSummary = document.getElementById('checkoutSummary');
const checkoutTotalSpan = document.getElementById('checkoutTotal');
const checkoutForm = document.getElementById('checkoutForm');

// Éléments du message
const messageOrderId = document.getElementById('messageOrderId');
const customerMessage = document.getElementById('customerMessage');
const customerMessageForm = document.getElementById('customerMessageForm');

// ===== ÉTAT GLOBAL =====
let currentCustomer = null;
let cart = JSON.parse(localStorage.getItem('emarket_cart')) || [];
let products = [];

// ===== FONCTIONS DE PANIER =====
function updateCartCount() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCountSpan.textContent = totalItems;
    localStorage.setItem('emarket_cart', JSON.stringify(cart));
}

function renderCartModal() {
    if (!cartItemsDiv) return;
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Votre panier est vide.</p>';
        cartTotalSpan.textContent = '0';
        return;
    }
    let html = '';
    let total = 0;
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return;
        const subtotal = product.price * item.quantity;
        total += subtotal;
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
    cartItemsDiv.innerHTML = html;
    cartTotalSpan.textContent = total;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity++;
    else cart.push({ id: productId, quantity: 1 });
    updateCartCount();
    renderCartModal();
    showToast('Produit ajouté au panier', 'success');
}

function updateCartItem(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index === -1) return;
    const newQty = cart[index].quantity + delta;
    if (newQty <= 0) cart.splice(index, 1);
    else cart[index].quantity = newQty;
    updateCartCount();
    renderCartModal();
}

function removeCartItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    renderCartModal();
}

// ===== CHARGEMENT DES PRODUITS =====
async function loadProducts() {
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
    renderProducts();
}

function renderProducts() {
    if (!products.length) {
        featuredContainer.innerHTML = '<p>Aucun produit.</p>';
        allProductsContainer.innerHTML = '<p>Aucun produit.</p>';
        return;
    }
    const featured = products.filter(p => p.featured);
    const others = products.filter(p => !p.featured);
    featuredContainer.innerHTML = featured.map(p => renderProductCard(p)).join('');
    allProductsContainer.innerHTML = others.map(p => renderProductCard(p)).join('');
}

function renderProductCard(product) {
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
async function registerCustomer(firstName, lastName, email, phone, password) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const { data, error } = await supabaseMarket
        .from('customers')
        .insert([{ first_name: firstName, last_name: lastName, email, phone, password: hash }])
        .select()
        .single();
    if (error) {
        showToast('Erreur inscription : ' + error.message, 'error');
        return null;
    }
    currentCustomer = data;
    localStorage.setItem('emarket_customer', JSON.stringify(data));
    updateCustomerUI();
    showToast('Inscription réussie', 'success');
    closeAuthModal();
    return data;
}

async function loginCustomer(email, password) {
    const { data, error } = await supabaseMarket
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();
    if (error || !data) {
        showToast('Email ou mot de passe incorrect', 'error');
        return null;
    }
    const valid = bcrypt.compareSync(password, data.password);
    if (!valid) {
        showToast('Email ou mot de passe incorrect', 'error');
        return null;
    }
    currentCustomer = data;
    localStorage.setItem('emarket_customer', JSON.stringify(data));
    updateCustomerUI();
    showToast('Connexion réussie', 'success');
    closeAuthModal();
    return data;
}

function handleLogoutCustomer() {
    currentCustomer = null;
    localStorage.removeItem('emarket_customer');
    updateCustomerUI();
    showToast('Déconnecté', 'info');
}

function updateCustomerUI() {
    if (currentCustomer) {
        customerGreeting.textContent = `Bonjour ${currentCustomer.first_name}`;
        customerGreeting.style.display = 'inline';
        logoutCustomerLink.style.display = 'inline';
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
    } else {
        customerGreeting.style.display = 'none';
        logoutCustomerLink.style.display = 'none';
        loginBtn.style.display = 'inline';
        signupBtn.style.display = 'inline';
    }
}

// ===== MODALES =====
function openCartModal() {
    renderCartModal();
    cartModal.classList.add('active');
}

function closeCartModal() {
    cartModal.classList.remove('active');
}

function openAuthModal() {
    authModal.classList.add('active');
}

function closeAuthModal() {
    authModal.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
}

function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    authModalTitle.textContent = 'Connexion';
}

function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    authModalTitle.textContent = 'Inscription';
}

function openCheckoutModal() {
    if (!currentCustomer) {
        openAuthModal();
        return;
    }
    if (cart.length === 0) {
        showToast('Votre panier est vide', 'error');
        return;
    }
    checkoutFullName.value = `${currentCustomer.first_name} ${currentCustomer.last_name}`;
    checkoutEmail.value = currentCustomer.email;
    checkoutPhone.value = currentCustomer.phone || '';
    let summaryHtml = '';
    let total = 0;
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return;
        const subtotal = product.price * item.quantity;
        total += subtotal;
        summaryHtml += `<p>${product.name} x${item.quantity} = ${subtotal} FCFA</p>`;
    });
    checkoutSummary.innerHTML = summaryHtml;
    checkoutTotalSpan.textContent = total;
    checkoutModal.classList.add('active');
}

function closeCheckoutModal() {
    checkoutModal.classList.remove('active');
}

function openMessageModal(orderId) {
    messageOrderId.value = orderId || '';
    customerMessage.value = '';
    messageModal.classList.add('active');
}

function closeMessageModal() {
    messageModal.classList.remove('active');
}

// ===== CRÉATION DE COMMANDE ET PAIEMENT =====
async function createOrder() {
    const total = cart.reduce((sum, item) => {
        const p = products.find(p => p.id === item.id);
        return sum + (p ? p.price * item.quantity : 0);
    }, 0);
    const { data: order, error: orderError } = await supabaseMarket
        .from('orders')
        .insert([{ customer_id: currentCustomer.id, total_amount: total, status: 'en_attente' }])
        .select()
        .single();
    if (orderError) {
        showToast('Erreur création commande', 'error');
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
    const { error: itemsError } = await supabaseMarket.from('order_items').insert(items);
    if (itemsError) {
        showToast('Erreur enregistrement articles', 'error');
        return null;
    }
    return order;
}

async function generateProformaInvoice(order, customer) {
    const element = document.createElement('div');
    element.innerHTML = `
        <h1>Facture Proforma</h1>
        <p>Commande #${order.id}</p>
        <p>Client : ${customer.first_name} ${customer.last_name}</p>
        <p>Email : ${customer.email}</p>
        <p>Téléphone : ${customer.phone}</p>
        <table border="1" cellpadding="5" style="border-collapse: collapse; width:100%;">
            <tr><th>Produit</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr>
            ${cart.map(item => {
                const p = products.find(p => p.id === item.id);
                return `<tr><td>${p.name}</td><td>${item.quantity}</td><td>${p.price}</td><td>${p.price * item.quantity}</td></tr>`;
            }).join('')}
        </table>
        <p>Total : ${order.total_amount} FCFA</p>
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
    const { error } = await supabaseMarket.storage.from('invoices').upload(fileName, pdfBlob, { upsert: true });
    if (error) {
        console.error('Erreur upload facture proforma', error);
        return null;
    }
    const { publicURL } = supabaseMarket.storage.from('invoices').getPublicUrl(fileName);
    return publicURL;
}

async function handleCheckout(e) {
    e.preventDefault();
    if (!currentCustomer) {
        openAuthModal();
        return;
    }
    const order = await createOrder();
    if (!order) return;
    const proformaUrl = await generateProformaInvoice(order, currentCustomer);
    if (proformaUrl) {
        await supabaseMarket.from('orders').update({ invoice_proforma_url: proformaUrl }).eq('id', order.id);
    }
    const firstProduct = products.find(p => p.id === cart[0]?.id);
    const paymentUrl = firstProduct?.payment_url || 'https://fedapay.com';
    window.location.href = paymentUrl;
    cart = [];
    updateCartCount();
    closeCheckoutModal();
    closeCartModal();
}

// ===== MESSAGES =====
async function sendCustomerMessage(e) {
    e.preventDefault();
    if (!currentCustomer) {
        openAuthModal();
        return;
    }
    const orderId = messageOrderId.value || null;
    const message = customerMessage.value.trim();
    if (!message) return;
    const { error } = await supabaseMarket.from('messages').insert([{
        sender_type: 'customer',
        sender_id: currentCustomer.id,
        receiver_id: null,
        order_id: orderId,
        message,
        is_read: false
    }]);
    if (error) showToast('Erreur envoi message: ' + error.message, 'error');
    else {
        showToast('Message envoyé', 'success');
        closeMessageModal();
    }
}

// ===== TOAST =====
function showToast(message, type = 'info') {
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

// ===== INITIALISATION =====
async function init() {
    const saved = localStorage.getItem('emarket_customer');
    if (saved) {
        try { currentCustomer = JSON.parse(saved); } catch (e) {}
    }
    updateCustomerUI();
    await loadProducts();

    cartFloat.addEventListener('click', openCartModal);

    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.btn-add-cart');
        if (addBtn && !addBtn.disabled) {
            addToCart(parseInt(addBtn.dataset.id));
            return;
        }
        const detailsBtn = e.target.closest('.btn-details');
        if (detailsBtn) {
            alert('Détails produit (à venir)');
            return;
        }
        const minusBtn = e.target.closest('.cart-qty-minus');
        if (minusBtn) {
            updateCartItem(parseInt(minusBtn.dataset.id), -1);
            return;
        }
        const plusBtn = e.target.closest('.cart-qty-plus');
        if (plusBtn) {
            updateCartItem(parseInt(plusBtn.dataset.id), 1);
            return;
        }
        const removeBtn = e.target.closest('.cart-remove');
        if (removeBtn) {
            removeCartItem(parseInt(removeBtn.dataset.id));
            return;
        }
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeCartModal();
            closeAuthModal();
            closeCheckoutModal();
            closeMessageModal();
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeCartModal();
            closeAuthModal();
            closeCheckoutModal();
            closeMessageModal();
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await loginCustomer(email, password);
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('regFirstName').value;
        const lastName = document.getElementById('regLastName').value;
        const email = document.getElementById('regEmail').value;
        const phone = document.getElementById('regPhone').value;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;
        if (password !== confirm) {
            showToast('Les mots de passe ne correspondent pas', 'error');
            return;
        }
        await registerCustomer(firstName, lastName, email, phone, password);
    });

    logoutCustomerLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogoutCustomer();
    });

    checkoutBtn.addEventListener('click', openCheckoutModal);
    checkoutForm.addEventListener('submit', handleCheckout);
    customerMessageForm.addEventListener('submit', sendCustomerMessage);

    updateCartCount();
}

init();

// Rendre les fonctions globales pour les attributs onclick
window.closeCartModal = closeCartModal;
window.closeAuthModal = closeAuthModal;
window.closeCheckoutModal = closeCheckoutModal;
window.closeMessageModal = closeMessageModal;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
