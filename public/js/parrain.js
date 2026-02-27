// Données par défaut avec chemins corrigés pour les images
const defaultJoueurs = [
    {
        id: 'j1',
        nom: 'Koffi B.',
        poste: 'Attaquant',
        region: 'Bénin',
        image: 'public/img/pas1.jpg',
        description: 'Je cherche un parrain pour m’aider à financer ma formation et mon équipement. Objectif : intégrer un centre professionnel.',
        besoin: 'Équipement + frais de formation',
        montant: '150 000 FCFA'
    },
    {
        id: 'j2',
        nom: 'Moussa D.',
        poste: 'Milieu',
        region: 'Sénégal',
        image: 'public/img/pas2.jpg',
        description: 'Je veux participer à un tournoi international mais je n’ai pas les moyens. Aidez-moi à réaliser mon rêve.',
        besoin: 'Frais de voyage et inscription',
        montant: '250 000 FCFA'
    },
    {
        id: 'j3',
        nom: 'Aminata Diallo',
        poste: 'Défenseur',
        region: 'Côte d\'Ivoire',
        image: 'public/img/pas3.jpg',
        description: 'Je suis une jeune footballeuse avec du talent, mais je manque de soutien. Rejoignez-moi dans cette aventure.',
        besoin: 'Soutien financier et moral',
        montant: '100 000 FCFA'
    }
];

const defaultDons = [
    {
        id: 'd1',
        titre: 'Organisation du tournoi de Cotonou',
        region: 'Bénin',
        image: 'public/img/tou1.jpg',
        description: 'Nous organisons un grand tournoi de détection et avons besoin de fonds pour les infrastructures, les repas et l’hébergement des jeunes.',
        besoin: 'Financement partiel',
        objectif: '5 000 000 FCFA',
        collecte: '2 300 000 FCFA'
    },
    {
        id: 'd2',
        titre: 'Rénovation du terrain de Parakou',
        region: 'Bénin',
        image: 'public/img/tou2.jpg',
        description: 'Le terrain municipal est en mauvais état. Aidez-nous à le rénover pour offrir un espace de jeu décent aux jeunes.',
        besoin: 'Dons pour les travaux',
        objectif: '3 000 000 FCFA',
        collecte: '1 200 000 FCFA'
    },
    {
        id: 'd3',
        titre: 'Achat d’équipements pour l’académie',
        region: 'Sénégal',
        image: 'public/img/tou3.jpg',
        description: 'Notre académie manque de ballons, de maillots et de chasubles. Chaque don compte.',
        besoin: 'Équipement sportif',
        objectif: '500 000 FCFA',
        collecte: '210 000 FCFA'
    }
];

const defaultTemoignages = [
    {
        auteur: 'M. Agbodjogbe',
        role: 'Parrain',
        texte: 'J’ai parrainé Koffi il y a 6 mois. Aujourd’hui, il a intégré un centre de formation. Une expérience incroyable !',
        avatar: 'public/img/user-default.jpg'
    },
    {
        auteur: 'A. Salami',
        role: 'Entraîneur',
        texte: 'Grâce aux dons, nous avons pu organiser un tournoi régional qui a révélé plusieurs talents.',
        avatar: 'public/img/user-default.jpg'
    }
];

// Initialisation
if (!localStorage.getItem('parrain_joueurs')) {
    localStorage.setItem('parrain_joueurs', JSON.stringify(defaultJoueurs));
}
if (!localStorage.getItem('parrain_dons')) {
    localStorage.setItem('parrain_dons', JSON.stringify(defaultDons));
}
if (!localStorage.getItem('parrain_temoignages')) {
    localStorage.setItem('parrain_temoignages', JSON.stringify(defaultTemoignages));
}

// Rendu des joueurs
function renderJoueurs(filtered = null) {
    const grid = document.getElementById('joueursGrid');
    if (!grid) return;
    const joueurs = filtered !== null ? filtered : JSON.parse(localStorage.getItem('parrain_joueurs'));
    let html = '';
    joueurs.forEach(j => {
        html += `
            <div class="besoin-card" data-id="${j.id}">
                <div class="card-media">
                    <img src="${j.image}" alt="${j.nom}">
                    <i class="fas fa-play-circle play-icon"></i>
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
    grid.innerHTML = html || '<p style="text-align:center;">Aucun joueur pour le moment.</p>';
}

// Rendu des dons
function renderDons(filtered = null) {
    const grid = document.getElementById('donsGrid');
    if (!grid) return;
    const dons = filtered !== null ? filtered : JSON.parse(localStorage.getItem('parrain_dons'));
    let html = '';
    dons.forEach(d => {
        html += `
            <div class="besoin-card" data-id="${d.id}">
                <div class="card-media">
                    <img src="${d.image}" alt="${d.titre}">
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
    grid.innerHTML = html || '<p style="text-align:center;">Aucun appel aux dons.</p>';
}

// Rendu des témoignages
function renderTemoignages() {
    const grid = document.getElementById('temoignagesList');
    if (!grid) return;
    const temoignages = JSON.parse(localStorage.getItem('parrain_temoignages')) || [];
    let html = '';
    temoignages.forEach(t => {
        html += `
            <div class="temoignage-card">
                <i class="fas fa-quote-left"></i>
                <p>${t.texte}</p>
                <div class="temoignage-author">
                    <img src="${t.avatar}" alt="${t.auteur}">
                    <div>
                        <strong>${t.auteur}</strong><br>
                        <small>${t.role}</small>
                    </div>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html || '<p style="text-align:center;">Aucun témoignage.</p>';
}

// Gestion de la modale
function openContactModal(type, id, title) {
    document.getElementById('modalType').value = type;
    document.getElementById('modalTargetId').value = id;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('contactModal').classList.add('active');
}

function closeContactModal() {
    document.getElementById('contactModal').classList.remove('active');
    document.getElementById('contactForm').reset();
}

window.closeContactModal = closeContactModal;

// Application des filtres
function applyFilters() {
    const type = document.getElementById('filterType').value;
    const region = document.getElementById('filterRegion').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    let joueurs = JSON.parse(localStorage.getItem('parrain_joueurs'));
    if (type === 'joueur' || type === 'all') {
        if (region !== 'all') joueurs = joueurs.filter(j => j.region.toLowerCase() === region);
        if (search) joueurs = joueurs.filter(j => j.nom.toLowerCase().includes(search) || j.description.toLowerCase().includes(search));
        renderJoueurs(joueurs);
    } else {
        renderJoueurs([]);
    }

    let dons = JSON.parse(localStorage.getItem('parrain_dons'));
    if (type === 'tournoi' || type === 'infra' || type === 'all') {
        if (region !== 'all') dons = dons.filter(d => d.region.toLowerCase() === region);
        if (search) dons = dons.filter(d => d.titre.toLowerCase().includes(search) || d.description.toLowerCase().includes(search));
        renderDons(dons);
    } else {
        renderDons([]);
    }
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    renderJoueurs();
    renderDons();
    renderTemoignages();

    document.getElementById('applyFilters').addEventListener('click', applyFilters);

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('btn-parrainer')) {
            const card = btn.closest('.besoin-card');
            openContactModal('parrainage', btn.dataset.id, `Parrainer ${card.querySelector('h3').textContent}`);
        }
        else if (btn.classList.contains('btn-don')) {
            const card = btn.closest('.besoin-card');
            openContactModal('don', btn.dataset.id, `Faire un don pour : ${card.querySelector('h3').textContent}`);
        }
        else if (btn.classList.contains('btn-contact-card')) {
            const card = btn.closest('.besoin-card');
            openContactModal('contact', btn.dataset.id, `Contacter concernant : ${card.querySelector('h3').textContent}`);
        }
        else if (btn.classList.contains('btn-acteur')) {
            openContactModal('acteur', btn.dataset.role, `Devenir ${btn.dataset.role}`);
        }
    });

    document.getElementById('contactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        alert("Message envoyé ! (Simulation)");
        closeContactModal();
    });
});