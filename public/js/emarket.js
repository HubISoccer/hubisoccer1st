// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const featuredContainer = document.getElementById('featuredPacks');
const allProductsContainer = document.getElementById('allProducts');
const cartCountSpan = document.getElementById('cartCount');
let cart = JSON.parse(localStorage.getItem('emarket_cart')) || [];

// Mettre à jour l'affichage du panier
function updateCartCount() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCountSpan.textContent = totalItems;
    localStorage.setItem('emarket_cart', JSON.stringify(cart));
}

// Génère le HTML d'une carte produit
function renderProductCard(product) {
    const stockClass = product.stock ? '' : 'out-of-stock';
    const stockText = product.stock ? 'En stock' : 'Épuisé';
    return `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.image_url}" alt="${product.name}" onerror="this.src='public/img/placeholder.jpg'">
                ${product.featured ? '<span class="featured-badge">🔥 Vedette</span>' : ''}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-meta">
                    <span class="product-price">${product.price}</span>
                    <span class="product-stock ${stockClass}">${stockText}</span>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" data-id="${product.id}" ${!product.stock ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Ajouter
                    </button>
                    <a href="${product.payment_url}" target="_blank" class="btn-pay" data-id="${product.id}" title="Payer en ligne">
                        <i class="fas fa-credit-card"></i> Payer
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Fonction pour afficher les produits
function renderProducts() {
    const products = JSON.parse(localStorage.getItem('emarket_products')) || [];

    // Produits en vedette
    const featured = products.filter(p => p.featured);
    let featuredHtml = '';
    featured.forEach(p => {
        featuredHtml += renderProductCard(p);
    });
    featuredContainer.innerHTML = featuredHtml || '<p>Aucun pack vedette.</p>';

    // Tous les produits (sauf ceux déjà affichés en vedette)
    const others = products.filter(p => !p.featured);
    let othersHtml = '';
    others.forEach(p => {
        othersHtml += renderProductCard(p);
    });
    allProductsContainer.innerHTML = othersHtml || '<p>Aucun produit.</p>';
}

// Charger les produits depuis Supabase
async function loadProducts() {
    const { data: products, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erreur chargement produits:', error);
        featuredContainer.innerHTML = '<p>Erreur de chargement.</p>';
        allProductsContainer.innerHTML = '<p>Erreur de chargement.</p>';
        return;
    }

    // Sauvegarder dans localStorage pour une utilisation hors ligne (optionnel)
    localStorage.setItem('emarket_products', JSON.stringify(products));
    renderProducts();
}

// Ajouter au panier (fonctionne comme avant)
function addToCart(productId) {
    const products = JSON.parse(localStorage.getItem('emarket_products')) || [];
    const product = products.find(p => p.id === productId);
    if (!product || !product.stock) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id: productId, quantity: 1, name: product.name, price: product.price });
    }
    updateCartCount();
    // Petit effet visuel
    const btn = document.querySelector(`.btn-add-cart[data-id="${productId}"]`);
    if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> Ajouté';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-cart-plus"></i> Ajouter';
        }, 1000);
    }
}

// Écouteurs d'événements
document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn && !addBtn.disabled) {
        const productId = addBtn.dataset.id;
        addToCart(productId);
        return;
    }
    const cartFloat = e.target.closest('.cart-float');
    if (cartFloat) {
        // Afficher le contenu du panier (simplifié)
        let message = 'Votre panier :\n';
        cart.forEach(item => {
            message += `- ${item.name} x${item.quantity} = ${item.price * item.quantity} FCFA\n`;
        });
        message += `\nTotal : ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} FCFA`;
        alert(message);
    }
});

// Initialisation
loadProducts();
updateCartCount();
