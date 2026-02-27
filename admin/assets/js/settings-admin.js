// ===== DONNÉES PAR DÉFAUT =====
const defaultSettings = {
    siteName: 'HubISoccer',
    siteSlogan: 'Le talent de la rue, le futur du football',
    siteDescription: 'HubISoccer transforme la détection de rue en opportunité professionnelle.',
    contactEmail: 'contact@hubisoccer.com',
    contactPhone: '+229 01 97 20 81 88',
    contactAddress: 'Bénin',
    socialFacebook: 'https://facebook.com/hubisoccer',
    socialInstagram: 'https://instagram.com/hubisoccer',
    socialTwitter: 'https://twitter.com/hubisoccer',
    socialYoutube: 'https://youtube.com/hubisoccer',
    primaryColor: '#551B8C',
    secondaryColor: '#FFCC00',
    logoPath: '../public/img/logo-navbar.png',
    faviconPath: '../public/img/favicon.ico',
    legalRccm: 'RB/ABC/24 A 111814',
    legalIfu: '0201910800236'
};

// Initialisation localStorage
if (!localStorage.getItem('site_settings')) {
    localStorage.setItem('site_settings', JSON.stringify(defaultSettings));
}

// ===== ÉLÉMENTS DOM =====
const form = document.getElementById('settingsForm');
const siteName = document.getElementById('siteName');
const siteSlogan = document.getElementById('siteSlogan');
const siteDescription = document.getElementById('siteDescription');
const contactEmail = document.getElementById('contactEmail');
const contactPhone = document.getElementById('contactPhone');
const contactAddress = document.getElementById('contactAddress');
const socialFacebook = document.getElementById('socialFacebook');
const socialInstagram = document.getElementById('socialInstagram');
const socialTwitter = document.getElementById('socialTwitter');
const socialYoutube = document.getElementById('socialYoutube');
const primaryColor = document.getElementById('primaryColor');
const secondaryColor = document.getElementById('secondaryColor');
const logoPath = document.getElementById('logoPath');
const faviconPath = document.getElementById('faviconPath');
const legalRccm = document.getElementById('legalRccm');
const legalIfu = document.getElementById('legalIfu');

// ===== CHARGEMENT DES PARAMÈTRES =====
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('site_settings')) || defaultSettings;
    siteName.value = settings.siteName || '';
    siteSlogan.value = settings.siteSlogan || '';
    siteDescription.value = settings.siteDescription || '';
    contactEmail.value = settings.contactEmail || '';
    contactPhone.value = settings.contactPhone || '';
    contactAddress.value = settings.contactAddress || '';
    socialFacebook.value = settings.socialFacebook || '';
    socialInstagram.value = settings.socialInstagram || '';
    socialTwitter.value = settings.socialTwitter || '';
    socialYoutube.value = settings.socialYoutube || '';
    primaryColor.value = settings.primaryColor || '#551B8C';
    secondaryColor.value = settings.secondaryColor || '#FFCC00';
    logoPath.value = settings.logoPath || '';
    faviconPath.value = settings.faviconPath || '';
    legalRccm.value = settings.legalRccm || '';
    legalIfu.value = settings.legalIfu || '';
}

// ===== SAUVEGARDE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const settings = {
        siteName: siteName.value,
        siteSlogan: siteSlogan.value,
        siteDescription: siteDescription.value,
        contactEmail: contactEmail.value,
        contactPhone: contactPhone.value,
        contactAddress: contactAddress.value,
        socialFacebook: socialFacebook.value,
        socialInstagram: socialInstagram.value,
        socialTwitter: socialTwitter.value,
        socialYoutube: socialYoutube.value,
        primaryColor: primaryColor.value,
        secondaryColor: secondaryColor.value,
        logoPath: logoPath.value,
        faviconPath: faviconPath.value,
        legalRccm: legalRccm.value,
        legalIfu: legalIfu.value
    };

    localStorage.setItem('site_settings', JSON.stringify(settings));
    alert('Paramètres enregistrés avec succès !');
});

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadSettings();