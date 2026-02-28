// ===== GESTION DU MENU MOBILE =====
document.addEventListener('click', function(e) {
    const menuToggle = e.target.closest('#menuToggle');
    if (menuToggle) {
        e.preventDefault();
        const navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('open');
        }
        return;
    }
    if (!e.target.closest('.nav-links') && !e.target.closest('#menuToggle')) {
        const navLinks = document.getElementById('navLinks');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            const toggle = document.getElementById('menuToggle');
            if (toggle) toggle.classList.remove('open');
        }
    }
});

// ===== GESTION DES LANGUES (traductions intégrées) =====
const translations = {
    fr: {
        titre_page: "HubISoccer | Le talent de la rue, le futur du football",
        sport_etudes: "Sport + Études + Métier",
        talent_rue: "LE TALENT DE LA RUE,<br>LE FUTUR DU FOOTBALL.",
        description: "HubISoccer transforme la détection de rue en opportunité professionnelle. Nous certifions le parcours académique des talents et les connectons aux agents agréés.",
        reseau_scouting: "Réseau Scouting",
        tournoi: "Tournoi HubISoccer",
        engagement_ethique: "NOTRE ENGAGEMENT ÉTHIQUE & JURIDIQUE",
        hub_inspiration: "THE HUB OF INSPIRATION OF SOCCER",
        tournoi_desc: "Tournoi HubISoccer. Connectez-vous à votre destin footballistique mondial.",
        footer_conformite: "Conformité APDP Bénin",
        footer_reglementation: "Règlementation FIFA",
        footer_double_projet: "Double Projet Sport-Études",
        contact_tel: "📞 +229 01 97 20 81 88",
        contact_email: "📧 hubisoccer@gmail.com",
        rccm: "RCCM : RB/ABC/24 A 111814 | IFU : 0201910800236",
        copyright: "© 2026 HubISoccer - Ozawa. Tous droits réservés.",
        connexion: "Connexion",
        inscrire: "S'inscrire",
        hub_market: "HUBISOCCER MARKET",
        hub_community: "Hub Community",
        scouting: "Scouting",
        processus: "Processus",
        affiliation: "AFFILIATION",
        parrain: "PARRAIN",
        tournoi_public: "Tournoi Public"
    },
    en: {
        titre_page: "HubISoccer | Street talent, the future of football",
        sport_etudes: "Sport + Studies + Career",
        talent_rue: "STREET TALENT,<br>THE FUTURE OF FOOTBALL.",
        description: "HubISoccer transforms street scouting into professional opportunity. We certify the academic background of talents and connect them to licensed agents.",
        reseau_scouting: "Scouting Network",
        tournoi: "HubISoccer Tournament",
        engagement_ethique: "OUR ETHICAL & LEGAL COMMITMENT",
        hub_inspiration: "THE HUB OF INSPIRATION OF SOCCER",
        tournoi_desc: "HubISoccer Tournament. Connect to your global football destiny.",
        footer_conformite: "APDP Benin Compliance",
        footer_reglementation: "FIFA Regulations",
        footer_double_projet: "Dual Sport-Study Project",
        contact_tel: "📞 +229 01 97 20 81 88",
        contact_email: "📧 hubisoccer@gmail.com",
        rccm: "RCCM: RB/ABC/24 A 111814 | TIN: 0201910800236",
        copyright: "© 2026 HubISoccer - Ozawa. All rights reserved.",
        connexion: "Login",
        inscrire: "Sign up",
        hub_market: "HUBISOCCER MARKET",
        hub_community: "Hub Community",
        scouting: "Scouting",
        processus: "Process",
        affiliation: "AFFILIATION",
        parrain: "SPONSOR",
        tournoi_public: "Public Tournament"
    },
    yo: {
        titre_page: "HubISoccer | Talent ita, ọjọ iwaju bọọlu",
        sport_etudes: "Idaraya + Ẹkọ + Iṣẹ",
        talent_rue: "TALENT ITA,<br>ỌJỌ IWAJU BỌỌLU",
        description: "HubISoccer ṣe iyipada wiwa talenti ita si aye ọjọgbọn. A jẹrisi ẹkọ ti awọn talenti ati ki o sopọ wọn si awọn aṣoju ti a fọwọsi.",
        reseau_scouting: "Nẹtiwọọki Wiwa",
        tournoi: "Idije HubISoccer",
        engagement_ethique: "ILANA WA TI ẸTỌ",
        hub_inspiration: "THE HUB OF INSPIRATION OF SOCCER",
        tournoi_desc: "Idije HubISoccer. Sopọ si ayanmọ bọọlu agbaye rẹ.",
        footer_conformite: "Ifaramọ APDP Benin",
        footer_reglementation: "Awọn ilana FIFA",
        footer_double_projet: "Ise agbese Idaraya-Ẹkọ Meji",
        contact_tel: "📞 +229 01 97 20 81 88",
        contact_email: "📧 hubisoccer@gmail.com",
        rccm: "RCCM: RB/ABC/24 A 111814 | IFU: 0201910800236",
        copyright: "© 2026 HubISoccer - Ozawa. Gbogbo ẹtọ wa ni ipamọ.",
        connexion: "Wo ile",
        inscrire: "Forukọsilẹ",
        hub_market: "HUBISOCCER ỌJA",
        hub_community: "Agbegbe Hub",
        scouting: "Wiwa",
        processus: "Ilana",
        affiliation: "IFỌWỌSI",
        parrain: "ONIGBOWO",
        tournoi_public: "Idije Gbogbo eniyan"
    },
    // Ajoute ici les autres langues si nécessaire (tu peux reprendre les objets depuis les fichiers JSON supprimés)
    fon: { /* ... */ },
    mina: { /* ... */ },
    lin: { /* ... */ },
    wol: { /* ... */ },
    diou: { /* ... */ },
    ha: { /* ... */ },
    sw: { /* ... */ },
    es: { /* ... */ },
    pt: { /* ... */ },
    de: { /* ... */ },
    it: { /* ... */ },
    ar: { /* ... */ },
    zh: { /* ... */ },
    ru: { /* ... */ },
    ja: { /* ... */ },
    tr: { /* ... */ },
    ko: { /* ... */ },
    hi: { /* ... */ },
    nl: { /* ... */ },
    pl: { /* ... */ },
    vi: { /* ... */ }
};

let currentLang = 'fr';

function applyTranslations(lang) {
    const t = translations[lang];
    if (!t) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.innerHTML.includes('<')) {
                el.innerHTML = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });
}

function loadLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        applyTranslations(lang);
        localStorage.setItem('hubiLang', lang);
    } else {
        console.warn('Langue non disponible, fallback vers français');
        if (lang !== 'fr') loadLanguage('fr');
    }
}

// Initialisation
const savedLang = localStorage.getItem('hubiLang') || 'fr';
loadLanguage(savedLang);

// Écouter le changement de langue
document.addEventListener('change', function(e) {
    if (e.target.matches('#langSelect')) {
        loadLanguage(e.target.value);
    }
});