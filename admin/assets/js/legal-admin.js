// ===== DONNÉES PAR DÉFAUT =====
const defaultLegal = {
    editeur: 'HubISoccer',
    rccm: 'RB/ABC/24 A 111814',
    ifu: '0201910800236',
    email: 'contact@hubisoccer.com',
    telephone: '+229 01 97 20 81 88',
    adresse: 'Bénin',
    directeur: 'Ozawa',
    hebergeur: 'GitHub Pages',
    mentionsText: `Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique, il est porté à la connaissance des utilisateurs du site HubISoccer les présentes mentions légales.

<h2>Éditeur du site</h2>
<p><strong>HubISoccer</strong><br>
RCCM : RB/ABC/24 A 111814<br>
IFU : 0201910800236<br>
Email : contact@hubisoccer.com<br>
Téléphone : +229 01 97 20 81 88<br>
Adresse : Bénin</p>

<h2>Directeur de la publication</h2>
<p>Ozawa, Président de HubISoccer</p>

<h2>Hébergement</h2>
<p><strong>GitHub Pages</strong><br>
GitHub Inc.<br>
88 Colin P Kelly Jr St, San Francisco, CA 94107, États-Unis<br>
https://pages.github.com</p>

<h2>Propriété intellectuelle</h2>
<p>L'ensemble du contenu du site HubISoccer (textes, images, vidéos, logos, etc.) est protégé par le droit d'auteur et la propriété intellectuelle. Toute reproduction, représentation, modification ou adaptation, partielle ou intégrale, sans autorisation préalable est interdite.</p>

<h2>Données personnelles</h2>
<p>Les informations recueillies via les formulaires d'inscription sont destinées à HubISoccer pour la gestion des comptes utilisateurs et l'amélioration des services. Conformément à la loi informatique et libertés, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour l'exercer, contactez-nous à contact@hubisoccer.com.</p>

<h2>Cookies</h2>
<p>Le site utilise des cookies pour améliorer l'expérience utilisateur (mémorisation de la langue, etc.). En naviguant sur le site, vous acceptez l'utilisation de ces cookies.</p>`,
    cguText: `Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du site HubISoccer. En utilisant le site, vous acceptez pleinement les présentes conditions.

<h2>1. Objet</h2>
<p>HubISoccer est une plateforme de mise en relation entre talents footballistiques et opportunités professionnelles (clubs, agents, coachs, etc.). Elle propose également des services de formation, d'affiliation et de e-market.</p>

<h2>2. Inscription et compte</h2>
<p>Pour accéder à certains services, l'utilisateur doit créer un compte en fournissant des informations exactes et complètes. L'utilisateur est responsable de la confidentialité de ses identifiants et de toutes les activités effectuées sous son compte.</p>

<h2>3. Contenu publié</h2>
<p>L'utilisateur peut publier des commentaires, photos, vidéos, etc., dans le respect des lois et de la morale. HubISoccer se réserve le droit de supprimer tout contenu inapproprié ou illicite et de suspendre le compte de l'utilisateur concerné.</p>

<h2>4. Propriété intellectuelle</h2>
<p>Les contenus mis en ligne par HubISoccer (logos, textes, etc.) sont protégés. Les contenus publiés par les utilisateurs leur appartiennent, mais ils concèdent à HubISoccer une licence non exclusive pour les diffuser sur la plateforme.</p>

<h2>5. Responsabilité</h2>
<p>HubISoccer met tout en œuvre pour assurer le bon fonctionnement du site, mais ne saurait être tenu responsable des dommages directs ou indirects liés à l'utilisation du site.</p>

<h2>6. Modifications</h2>
<p>HubISoccer se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par une notification sur le site.</p>

<h2>7. Droit applicable</h2>
<p>Les présentes CGU sont soumises au droit béninois. En cas de litige, les tribunaux de Cotonou sont compétents.</p>`
};

// Initialisation localStorage
if (!localStorage.getItem('legal_settings')) {
    localStorage.setItem('legal_settings', JSON.stringify(defaultLegal));
}

// ===== ÉLÉMENTS DOM =====
const form = document.getElementById('legalForm');
const editeur = document.getElementById('editeur');
const rccm = document.getElementById('rccm');
const ifu = document.getElementById('ifu');
const email = document.getElementById('email');
const telephone = document.getElementById('telephone');
const adresse = document.getElementById('adresse');
const directeur = document.getElementById('directeur');
const hebergeur = document.getElementById('hebergeur');
const mentionsText = document.getElementById('mentionsText');
const cguText = document.getElementById('cguText');

// ===== CHARGEMENT DES PARAMÈTRES =====
function loadLegal() {
    const settings = JSON.parse(localStorage.getItem('legal_settings')) || defaultLegal;
    editeur.value = settings.editeur || '';
    rccm.value = settings.rccm || '';
    ifu.value = settings.ifu || '';
    email.value = settings.email || '';
    telephone.value = settings.telephone || '';
    adresse.value = settings.adresse || '';
    directeur.value = settings.directeur || '';
    hebergeur.value = settings.hebergeur || '';
    mentionsText.value = settings.mentionsText || '';
    cguText.value = settings.cguText || '';
}

// ===== SAUVEGARDE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const settings = {
        editeur: editeur.value,
        rccm: rccm.value,
        ifu: ifu.value,
        email: email.value,
        telephone: telephone.value,
        adresse: adresse.value,
        directeur: directeur.value,
        hebergeur: hebergeur.value,
        mentionsText: mentionsText.value,
        cguText: cguText.value
    };

    localStorage.setItem('legal_settings', JSON.stringify(settings));
    alert('Mentions légales et CGU enregistrées avec succès !');
});

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadLegal();