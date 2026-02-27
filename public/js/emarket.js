// ===== GESTION DE L'AFFILIATION =====
// Récupérer le paramètre 'ref' dans l'URL et le stocker dans sessionStorage
const urlParams = new URLSearchParams(window.location.search);
const affiliateRef = urlParams.get('ref');
if (affiliateRef) {
    sessionStorage.setItem('affiliateRef', affiliateRef);
}

// ===== DONNÉES DES PRODUITS =====
const defaultProducts = [
    {
        id: 'pack1',
        name: 'Pack Starter',
        description: 'Ebook "Guide du Jeune Footballeur" + Pommade chauffante + Maillot au choix',
        price: 5000,
        image: 'public/img/ebook-cover.png',
        category: 'pack',
        featured: true,
        stock: true
    },
    {
        id: 'pack2',
        name: 'Pack Premium',
        description: 'Ebook + Kit couleur au choix + Coaching spécialisé (1h)',
        price: 15000,
        image: 'public/img/kitviolet.jpg',
        category: 'pack',
        featured: true,
        stock: true
    },
    {
        id: 'pack3',
        name: 'Pack Aspirant',
        description: 'Ebook "Guide du Jeune Footballeur" (version PDF)',
        price: 2000,
        image: 'public/img/ebook-cover.png',
        category: 'pack',
        featured: true,
        stock: true
    },
    {
        id: 'kit1',
        name: 'Kit Violet',
        description: 'Ensemble complet (maillot, short, chaussettes)',
        price: 8000,
        image: 'public/img/kitviolet.jpg',
        category: 'kit',
        featured: false,
        stock: true
    },
    {
        id: 'kit2',
        name: 'Kit Noir',
        description: 'Ensemble complet (maillot, short, chaussettes)',
        price: 8000,
        image: 'public/img/kitnoir.jpg',
        category: 'kit',
        featured: false,
        stock: true
    },
    {
        id: 'kit3',
        name: 'Kit Jaune',
        description: 'Ensemble complet (maillot, short, chaussettes)',
        price: 8000,
        image: 'public/img/kitjaune.jpg',
        category: 'kit',
        featured: false,
        stock: true
    },
    {
        id: 'sac1',
        name: 'Sac tout-en-un',
        description: 'Grand sac de sport compartimenté',
        price: 12000,
        image: 'public/img/Sac-touten1.jpg',
        category: 'sac',
        featured: false,
        stock: true
    },
    {
        id: 'sac2',
        name: 'Sac complet',
        description: 'Sac + gourde + protège-tibia',
        price: 15000,
        image: 'public/img/sac-complet.jpg',
        category: 'sac',
        featured: false,
        stock: true
    }
    // Ajoute d'autres produits si nécessaire
];

// Initialiser localStorage avec les produits par défaut
if (!localStorage.getItem('emarket_products')) {
    localStorage.setItem('emarket_products', JSON.stringify(defaultProducts));
}
if (!localStorage.getItem('emarket_cart')) {
    localStorage.setItem('emarket_cart', JSON.stringify([]));
}
if (!localStorage.getItem('emarket_orders')) {
    localStorage.setItem('emarket_orders', JSON.stringify([]));
}

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
                <img src="${product.image}" alt="${product.name}" onerror="this.src='public/img/placeholder.jpg'">
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
                    <button class="btn-details" data-id="${product.id}" title="Détails">
                        <i class="fas fa-eye"></i>
                    </button>
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

    // Tous les produits (sauf ceux déjà affichés en vedette, mais on peut tout montrer)
    const others = products.filter(p => !p.featured);
    let othersHtml = '';
    others.forEach(p => {
        othersHtml += renderProductCard(p);
    });
    allProductsContainer.innerHTML = othersHtml || '<p>Aucun produit.</p>';
}

// Ajouter au panier
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

// Fonction de passage de commande (simulée)
function checkout() {
    if (cart.length === 0) {
        alert('Votre panier est vide.');
        return;
    }
    const affiliateRef = sessionStorage.getItem('affiliateRef');
    const order = {
        id: Date.now(),
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        affiliate: affiliateRef || null, // ← ici on lie l'affilié
        date: new Date().toISOString(),
        statut: 'en_attente' // en attente de validation par l'admin
    };
    // Sauvegarder la commande
    let orders = JSON.parse(localStorage.getItem('emarket_orders')) || [];
    orders.push(order);
    localStorage.setItem('emarket_orders', JSON.stringify(orders));
    // Vider le panier
    cart = [];
    localStorage.setItem('emarket_cart', JSON.stringify(cart));
    updateCartCount();
    alert('Commande enregistrée ! En attente de validation.');
    // Optionnel : rediriger vers une page de confirmation
}

// Écouteurs d'événements
document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn && !addBtn.disabled) {
        const productId = addBtn.dataset.id;
        addToCart(productId);
        return;
    }
    const detailsBtn = e.target.closest('.btn-details');
    if (detailsBtn) {
        const productId = detailsBtn.dataset.id;
        alert(`Fiche détaillée du produit ${productId} (à venir)`);
    }
    const cartFloat = e.target.closest('.cart-float');
    if (cartFloat) {
        // Afficher le contenu du panier (simplifié)
        let message = 'Votre panier :\n';
        cart.forEach(item => {
            message += `- ${item.name} x${item.quantity} = ${item.price * item.quantity} FCFA\n`;
        });
        message += `\nTotal : ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} FCFA`;
        if (confirm(message + '\n\nPasser la commande ?')) {
            checkout();
        }
    }
});

// Initialisation
updateCartCount();
renderProducts();