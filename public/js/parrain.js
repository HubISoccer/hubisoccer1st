// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉLÉMENTS DOM =====
const joueursGrid = document.getElementById('joueursGrid');
const donsGrid = document.getElementById('donsGrid');
const temoignagesList = document.getElementById('temoignagesList');
const filterType = document.getElementById('filterType');
const filterRegion = document.getElementById('filterRegion');
const searchInput = document.getElementById('searchInput');
const applyFiltersBtn = document.getElementById('applyFilters');

// ===== CHARGEMENT DES DONNÉES =====
async function loadData() {
    try {
        const [joueursRes, donsRes, temoignagesRes] = await Promise.all([
            supabasePublic.from('parrain_joueurs').select('*').order('created_at', { ascending: false }),
            supabasePublic.from('parrain_dons').select('*').order('created_at', { ascending: false }),
            supabasePublic.from('parrain_temoignages').select('*').order('created_at', { ascending: false })
        ]);

        if (joueursRes.error) throw joueursRes.error;
        if (donsRes.error) throw donsRes.error;
        if (temoignagesRes.error) throw temoignagesRes.error;

        renderJoueurs(joueursRes.data);
        renderDons(donsRes.data);
        renderTemoignages(temoignagesRes.data);
    } catch (err) {
        console.error('Erreur chargement données:', err);
    }
}

// ===== RENDU DES CARTES AVEC SUPPORT VIDÉO =====
function renderJoueurs(joueurs) {
    if (!joueurs || joueurs.length === 0) {
        joueursGrid.innerHTML = '<p style="text-align:center;">Aucun joueur pour le moment.</p>';
        return;
    }
    let html = '';
    joueurs.forEach(j => {
        const mediaUrl = j.image || 'public/img/user-default.jpg';
        const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i);
        let mediaHtml = '';
        if (isVideo) {
            mediaHtml = `
                <video controls style="width:100%; height:180px; object-fit:cover;">
                    <source src="${mediaUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la vidéo.
                </video>
            `;
        } else {
            mediaHtml = `<img src="${mediaUrl}" alt="${j.nom}" style="width:100%; height:180px; object-fit:cover;">`;
        }
        html += `
            <div class="besoin-card" data-id="${j.id}">
                <div class="card-media">
                    ${mediaHtml}
                    ${isVideo ? '' : '<i class="fas fa-play-circle play-icon"></i>'}
                </div>
                <div class="card-content">
                    <h3>${j.nom} (${j.poste})</h3>
                    <p class="card-desc">${j.description}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${j.region}</span>
                        <span><i class="fas fa-tag"></i> ${j.besoin}</span>
                        <span><i class="fas fa-coins"></i> ${j.montant}</span>
                    </div>
                    <div class="card-footer">
                        <button class="btn-parrainer" data-id="${j.id}" data-type="joueur">Parrainer</button>
                        <button class="btn-contact-card" data-id="${j.id}" data-type="joueur">Contacter</button>
                    </div>
                </div>
            </div>
        `;
    });
    joueursGrid.innerHTML = html;
}

function renderDons(dons) {
    if (!dons || dons.length === 0) {
        donsGrid.innerHTML = '<p style="text-align:center;">Aucun appel aux dons.</p>';
        return;
    }
    let html = '';
    dons.forEach(d => {
        const mediaUrl = d.image || 'public/img/tou1.jpg';
        const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i);
        let mediaHtml = '';
        if (isVideo) {
            mediaHtml = `
                <video controls style="width:100%; height:180px; object-fit:cover;">
                    <source src="${mediaUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la vidéo.
                </video>
            `;
        } else {
            mediaHtml = `<img src="${mediaUrl}" alt="${d.titre}" style="width:100%; height:180px; object-fit:cover;">`;
        }
        html += `
            <div class="besoin-card" data-id="${d.id}">
                <div class="card-media">
                    ${mediaHtml}
                </div>
                <div class="card-content">
                    <h3>${d.titre}</h3>
                    <p class="card-desc">${d.description}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${d.region}</span>
                        <span><i class="fas fa-bullseye"></i> Objectif : ${d.objectif}</span>
                        <span><i class="fas fa-hand-holding-heart"></i> Collecté : ${d.collecte}</span>
                    </div>
                    <div class="card-footer">
                        <button class="btn-don" data-id="${d.id}" data-type="don">Faire un don</button>
                        <button class="btn-contact-card" data-id="${d.id}" data-type="don">En savoir plus</button>
                    </div>
                </div>
            </div>
        `;
    });
    donsGrid.innerHTML = html;
}

function renderTemoignages(temoignages) {
    if (!temoignages || temoignages.length === 0) {
        temoignagesList.innerHTML = '<p style="text-align:center;">Aucun témoignage.</p>';
        return;
    }
    let html = '';
    temoignages.forEach(t => {
        html += `
            <div class="temoignage-card">
                <i class="fas fa-quote-left"></i>
                <p>${t.texte}</p>
                <div class="temoignage-author">
                    <img src="${t.avatar || 'public/img/user-default.jpg'}" alt="${t.auteur}">
                    <div>
                        <strong>${t.auteur}</strong><br>
                        <small>${t.role}</small>
                    </div>
                </div>
            </div>
        `;
    });
    temoignagesList.innerHTML = html;
}

// ===== FILTRES =====
async function applyFilters() {
    const type = filterType.value;
    const region = filterRegion.value;
    const search = searchInput.value.trim().toLowerCase();

    let queryJoueurs = supabasePublic.from('parrain_joueurs').select('*');
    let queryDons = supabasePublic.from('parrain_dons').select('*');

    if (region !== 'all') {
        queryJoueurs = queryJoueurs.ilike('region', `%${region}%`);
        queryDons = queryDons.ilike('region', `%${region}%`);
    }
    if (search) {
        queryJoueurs = queryJoueurs.or(`nom.ilike.%${search}%,description.ilike.%${search}%`);
        queryDons = queryDons.or(`titre.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (type === 'joueur') {
        queryDons = queryDons.limit(0);
    } else if (type === 'tournoi' || type === 'infra') {
        queryJoueurs = queryJoueurs.limit(0);
    }

    const [joueursRes, donsRes] = await Promise.all([queryJoueurs, queryDons]);
    if (!joueursRes.error) renderJoueurs(joueursRes.data);
    if (!donsRes.error) renderDons(donsRes.data);
}

// ===== MODALE DE CONTACT =====
function openContactModal(type, id, title) {
    document.getElementById('contactType').value = type;
    document.getElementById('contactTargetId').value = id;
    document.getElementById('contactTargetTitle').value = title;
    document.getElementById('contactModalTitle').textContent = title;
    document.getElementById('contactModal').classList.add('active');
}

function closeModal() {
    document.getElementById('contactModal').classList.remove('active');
    document.getElementById('contactForm').reset();
}

window.closeModal = closeModal;

// ===== SOUMISSION FORMULAIRE DE CONTACT =====
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        message: document.getElementById('contactMessage').value,
        type: document.getElementById('contactType').value,
        target_id: document.getElementById('contactTargetId').value,
        target_title: document.getElementById('contactTargetTitle').value
    };
    const { error } = await supabasePublic.from('contact_messages').insert([message]);
    if (error) {
        alert('Erreur : ' + error.message);
    } else {
        alert('Message envoyé avec succès !');
        closeModal();
    }
});

// ===== GESTION DES CLICS SUR LES BOUTONS =====
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-parrainer')) {
        const card = btn.closest('.besoin-card');
        const title = card ? card.querySelector('h3').textContent : 'Parrainage';
        openContactModal('parrainage', btn.dataset.id, `Parrainer : ${title}`);
    }
    else if (btn.classList.contains('btn-don')) {
        const card = btn.closest('.besoin-card');
        const title = card ? card.querySelector('h3').textContent : 'Don';
        openContactModal('don', btn.dataset.id, `Faire un don pour : ${title}`);
    }
    else if (btn.classList.contains('btn-contact-card')) {
        const card = btn.closest('.besoin-card');
        const title = card ? card.querySelector('h3').textContent : 'Contact';
        openContactModal('contact', btn.dataset.id, `Contacter concernant : ${title}`);
    }
    else if (btn.classList.contains('btn-acteur')) {
        const role = btn.dataset.role;
        openContactModal('acteur', role, `Devenir ${role}`);
    }
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyFiltersBtn.addEventListener('click', applyFilters);
});