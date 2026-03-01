const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const featuredContainer = document.getElementById('featuredPacks');
const allProductsContainer = document.getElementById('allProducts');
const cartCountSpan = document.getElementById('cartCount');
let cart = JSON.parse(localStorage.getItem('emarket_cart')) || [];

function updateCartCount() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCountSpan.textContent = totalItems;
    localStorage.setItem('emarket_cart', JSON.stringify(cart));
}

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

function renderProducts() {
    const products = JSON.parse(localStorage.getItem('emarket_products')) || [];
    const featured = products.filter(p => p.featured);
    let featuredHtml = '';
    featured.forEach(p => { featuredHtml += renderProductCard(p); });
    featuredContainer.innerHTML = featuredHtml || '<p>Aucun pack vedette.</p>';

    const others = products.filter(p => !p.featured);
    let othersHtml = '';
    others.forEach(p => { othersHtml += renderProductCard(p); });
    allProductsContainer.innerHTML = othersHtml || '<p>Aucun produit.</p>';
}

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
    localStorage.setItem('emarket_products', JSON.stringify(products));
    renderProducts();
}

function addToCart(productId) {
    const products = JSON.parse(localStorage.getItem('emarket_products')) || [];
    const product = products.find(p => p.id === productId);
    if (!product || !product.stock) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity++;
    else cart.push({ id: productId, quantity: 1, name: product.name, price: product.price });
    updateCartCount();
    const btn = document.querySelector(`.btn-add-cart[data-id="${productId}"]`);
    if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> Ajouté';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-cart-plus"></i> Ajouter'; }, 1000);
    }
}

document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn && !addBtn.disabled) {
        addToCart(addBtn.dataset.id);
        return;
    }
    const cartFloat = e.target.closest('.cart-float');
    if (cartFloat) {
        let message = 'Votre panier :\n';
        cart.forEach(item => { message += `- ${item.name} x${item.quantity} = ${item.price * item.quantity} FCFA\n`; });
        message += `\nTotal : ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} FCFA`;
        alert(message);
    }
});

loadProducts();
updateCartCount();
