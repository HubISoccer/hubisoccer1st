const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const translations = {
    fr: {
        titre_page: "Inscription sportif – Premier Pas | HubISoccer",
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
        titre_page: "Athlete Registration – First Step | HubISoccer",
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
        titre_page: "Iforukọsilẹ elere idaraya – Igbesẹ akọkọ | HubISoccer",
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
    fon: {
        titre_page: "Inscription sportif – Premier Pas | HubISoccer",
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
    mina: { /* copier de fon pour l'instant, à compléter */ },
    lin: { /* copier de fon */ },
    wol: { /* copier de fon */ },
    diou: { /* copier de fon */ },
    ha: { /* copier de fon */ },
    sw: { /* copier de fon */ },
    es: { /* copier de fon */ },
    pt: { /* copier de fon */ },
    de: { /* copier de fon */ },
    it: { /* copier de fon */ },
    ar: { /* copier de fon */ },
    zh: { /* copier de fon */ },
    ru: { /* copier de fon */ },
    ja: { /* copier de fon */ },
    tr: { /* copier de fon */ },
    ko: { /* copier de fon */ },
    hi: { /* copier de fon */ },
    nl: { /* copier de fon */ },
    pl: { /* copier de fon */ },
    vi: { /* copier de fon */ }
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

document.addEventListener('change', function(e) {
    if (e.target.matches('#langSelect')) {
        loadLanguage(e.target.value);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('hubiLang') || 'fr';
    loadLanguage(savedLang);

    const form = document.getElementById('premierPasForm');
    const affOui = document.getElementById('affOui');
    const affNon = document.getElementById('affNon');
    const affiliateGroup = document.getElementById('affiliateGroup');
    const affiliateIdInput = document.getElementById('affiliateId');
    const birthDateInput = document.getElementById('birthDate');
    const parentGroup = document.getElementById('parentGroup');
    const sportSelect = document.getElementById('sportSelect');
    const sportFieldsDiv = document.getElementById('sportSpecificFields');
    const submitBtn = document.getElementById('submitBtn');
    const diplomaBox = document.getElementById('upload-diplome');
    const idCardBox = document.getElementById('upload-piece');

    affOui.addEventListener('change', () => {
        affiliateGroup.style.display = affOui.checked ? 'block' : 'none';
        if (affOui.checked) {
            const ref = sessionStorage.getItem('affiliateRef');
            if (ref) affiliateIdInput.value = ref;
        }
    });
    affNon.addEventListener('change', () => {
        affiliateGroup.style.display = 'none';
        affiliateIdInput.value = '';
    });

    birthDateInput.addEventListener('change', () => {
        const birthDate = new Date(birthDateInput.value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        parentGroup.style.display = age < 18 ? 'block' : 'none';
    });

    const sportFields = {
        football: {
            roleCode: 'FT',
            fields: [
                { name: 'poste', label: 'Poste de prédilection', type: 'select', options: ['Gardien de But','Défenseur Central','Latéral','Milieu Défensif','Milieu Offensif','Attaquant / Ailier','Autre (préciser)'], required: true },
                { name: 'piedDominant', label: 'Pied dominant', type: 'select', options: ['Droitier','Gaucher','Ambidextre'], required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'statistiques', label: 'Statistiques récentes (buts/passes décisives)', type: 'textarea', required: false },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        basketball: {
            roleCode: 'BK',
            fields: [
                { name: 'poste', label: 'Poste de prédilection', type: 'select', options: ['Meneur','Arrière','Ailier','Ailier fort','Pivot','Autre (préciser)'], required: true },
                { name: 'mainDominante', label: 'Main dominante', type: 'select', options: ['Droitier','Gaucher','Ambidextre'], required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'envergure', label: 'Envergure (cm)', type: 'number', required: true },
                { name: 'detente', label: 'Détente verticale (cm)', type: 'number', required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'statistiques', label: 'Statistiques récentes (points/moyenne, rebonds, passes)', type: 'textarea', required: false },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        tennis: {
            roleCode: 'TN',
            fields: [
                { name: 'typeJeu', label: 'Type de jeu', type: 'select', options: ['Attaquant','Défenseur','Polyvalent'], required: true },
                { name: 'coupDroit', label: 'Coup droit', type: 'select', options: ['Mono main','Deux mains'], required: true },
                { name: 'revers', label: 'Revers', type: 'select', options: ['Mono main','Deux mains'], required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'classement', label: 'Classement / ranking (FFT, ITF)', type: 'text', required: true },
                { name: 'surfacePref', label: 'Surface préférée', type: 'select', options: ['Terre battue','Gazon','Dur','Moquette'], required: true },
                { name: 'meilleurResultat', label: 'Meilleur résultat en tournoi', type: 'text', required: false },
                { name: 'vitesseService', label: 'Vitesse de service (km/h) max', type: 'number', required: false },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        athletisme: {
            roleCode: 'AT',
            fields: [
                { name: 'discipline', label: 'Discipline principale', type: 'text', required: true },
                { name: 'meilleurePerf', label: 'Meilleure performance officielle (temps/distance/hauteur)', type: 'text', required: true },
                { name: 'record100', label: 'Record personnel sur 100 m (si sprinteur)', type: 'text', required: false },
                { name: 'record10k', label: 'Record sur 10 km (si fondeur)', type: 'text', required: false },
                { name: 'entrainementsSemaine', label: 'Nombre d’entraînements par semaine', type: 'number', required: true },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'piedDominant', label: 'Pied dominant', type: 'select', options: ['Droitier','Gaucher','Ambidextre'], required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true },
                { name: 'blessures', label: 'Blessures majeures / absence de blessure', type: 'textarea', required: false }
            ]
        },
        handball: {
            roleCode: 'HB',
            fields: [
                { name: 'poste', label: 'Poste de prédilection', type: 'select', options: ['Gardien','Arrière gauche','Arrière droit','Demi-centre','Ailier gauche','Ailier droit','Pivot','Autre (préciser)'], required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'mainDominante', label: 'Main dominante', type: 'select', options: ['Droitier','Gaucher','Ambidextre'], required: true },
                { name: 'vitesseTir', label: 'Vitesse de tir mesurée (km/h)', type: 'number', required: false },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: true },
                { name: 'statistiques', label: 'Statistiques récentes (buts/match, passes décisives)', type: 'textarea', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        volleyball: {
            roleCode: 'VB',
            fields: [
                { name: 'poste', label: 'Poste', type: 'select', options: ['Passeur','Réceptionneur-attaquant','Central','Pointu','Libéro','Autre (préciser)'], required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'detenteAttaque', label: 'Détente verticale – attaque (cm)', type: 'number', required: true },
                { name: 'detenteContre', label: 'Détente verticale – contre (cm)', type: 'number', required: true },
                { name: 'mainDominante', label: 'Main dominante', type: 'select', options: ['Droitier','Gaucher','Ambidextre'], required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        rugby: {
            roleCode: 'RG',
            fields: [
                { name: 'poste', label: 'Poste', type: 'select', options: ['Pilier','Talonneur','2e ligne','3e ligne aile','3e ligne centre','Demi de mêlée','Demi d’ouverture','Centre','Ailier','Arrière','Autre (préciser)'], required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'vitesse40', label: 'Vitesse sur 40 m (secondes)', type: 'number', required: true },
                { name: 'plaquage', label: 'Capacité de plaquage (évaluation qualitative)', type: 'text', required: false },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: false },
                { name: 'matchsSaison', label: 'Nombre de matchs joués la saison passée', type: 'number', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        natation: {
            roleCode: 'NA',
            fields: [
                { name: 'nage', label: 'Nage de prédilection', type: 'select', options: ['Crawl','Dos','Brasse','Papillon','4 nages','Autre (préciser)'], required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'meilleur50', label: 'Meilleur temps officiel sur 50 m', type: 'text', required: true },
                { name: 'meilleur100', label: 'Meilleur temps officiel sur 100 m', type: 'text', required: true },
                { name: 'meilleur200', label: 'Meilleur temps officiel sur 200 m', type: 'text', required: true },
                { name: 'chrono50', label: 'Chronométrage au 50 m départ plongé (selon spécialité)', type: 'text', required: false },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: false },
                { name: 'entrainementsSemaine', label: 'Nombre d’entraînements par semaine (volume en km)', type: 'text', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        arts_martiaux: {
            roleCode: 'AM',
            fields: [
                { name: 'discipline', label: 'Discipline principale', type: 'text', required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'grade', label: 'Grade / Ceinture / Niveau', type: 'text', required: false },
                { name: 'poidsCompetition', label: 'Poids de compétition (kg)', type: 'number', required: false },
                { name: 'palmares', label: 'Palmarès (titres, combats, podiums)', type: 'textarea', required: false },
                { name: 'anneesPratique', label: 'Nombre d’années de pratique', type: 'number', required: true },
                { name: 'club', label: 'Club / Dojo / Salle', type: 'text', required: true },
                { name: 'specialite', label: 'Spécialité technique', type: 'text', required: false },
                { name: 'preparationPhysique', label: 'Préparation physique (fréquence, type)', type: 'text', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        },
        cyclisme: {
            roleCode: 'CY',
            fields: [
                { name: 'discipline', label: 'Discipline principale', type: 'select', options: ['Route','VTT cross-country','VTT descente','Piste','BMX','Cyclo-cross','Autre (préciser)'], required: true },
                { name: 'taille', label: 'Taille (cm)', type: 'number', required: true },
                { name: 'poids', label: 'Poids (kg)', type: 'number', required: true },
                { name: 'ftp', label: 'Puissance maximale (FTP) en watts', type: 'number', required: false },
                { name: 'fcm', label: 'Fréquence cardiaque maximale', type: 'number', required: false },
                { name: 'meilleurResultat', label: 'Meilleur résultat sur course', type: 'text', required: false },
                { name: 'kmSemaine', label: 'Nombre de kilomètres par semaine', type: 'number', required: false },
                { name: 'club', label: 'Club actuel ou Académie', type: 'text', required: true },
                { name: 'anneesPratique', label: 'Années de pratique', type: 'number', required: false },
                { name: 'niveau', label: 'Niveau / compétitions disputées', type: 'text', required: true }
            ]
        }
    };

    function buildSportFields(sportKey) {
        const sport = sportFields[sportKey];
        if (!sport) return '';
        let html = '';
        sport.fields.forEach(field => {
            html += `<div class="form-group">`;
            html += `<label>${field.label} ${field.required ? '<span class="required">*</span>' : ''}</label>`;
            if (field.type === 'select') {
                html += `<select id="sport_${field.name}" ${field.required ? 'required' : ''}>`;
                html += `<option value="">-- Choisir --</option>`;
                field.options.forEach(opt => {
                    html += `<option value="${opt}">${opt}</option>`;
                });
                html += `</select>`;
            } else if (field.type === 'textarea') {
                html += `<textarea id="sport_${field.name}" rows="3" ${field.required ? 'required' : ''}></textarea>`;
            } else {
                html += `<input type="${field.type}" id="sport_${field.name}" ${field.required ? 'required' : ''}>`;
            }
            html += `</div>`;
        });
        return html;
    }

    sportSelect.addEventListener('change', () => {
        const selected = sportSelect.value;
        if (selected && sportFields[selected]) {
            sportFieldsDiv.innerHTML = buildSportFields(selected);
            sportFieldsDiv.style.display = 'block';
        } else {
            sportFieldsDiv.innerHTML = '';
            sportFieldsDiv.style.display = 'none';
        }
    });

    function setupFileUpload(boxId, fileInputId, progressIndicatorSelector) {
        const box = document.getElementById(boxId);
        const input = document.getElementById(fileInputId);
        const indicator = box.querySelector(progressIndicatorSelector);
        box.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files.length) {
                const span = box.querySelector('span');
                if (span) span.textContent = input.files[0].name;
                box.style.borderColor = 'var(--primary)';
            }
        });
        return { box, input, indicator };
    }

    const diplomaUpload = setupFileUpload('upload-diplome', 'diplomaFile', '.progress-indicator');
    const idCardUpload = setupFileUpload('upload-piece', 'idCardFile', '.progress-indicator');

    async function uploadFileWithProgress(file, fileType, box, indicator) {
        return new Promise((resolve, reject) => {
            const fullName = document.getElementById('fullName').value.trim();
            const safeName = fullName ? fullName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'candidat';
            const fileName = `${safeName}_${fileType}_${Date.now()}.${file.name.split('.').pop()}`;
            supabaseSpacePublic.storage
                .from('documents')
                .createSignedUploadUrl(fileName)
                .then(({ data, error }) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', data.signedUrl, true);
                    xhr.setRequestHeader('Content-Type', file.type);
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percent = Math.round((e.loaded / e.total) * 100);
                            const circle = box.querySelector('.progress-bar');
                            const text = box.querySelector('.progress-text');
                            const dashOffset = 113.1 * (1 - percent / 100);
                            circle.style.strokeDashoffset = dashOffset;
                            text.textContent = percent + '%';
                        }
                    });
                    xhr.addEventListener('load', () => {
                        if (xhr.status === 200) {
                            box.classList.add('success');
                            box.classList.remove('uploading');
                            const text = box.querySelector('.progress-text');
                            text.textContent = '✓';
                            resolve(fileName);
                        } else {
                            box.classList.remove('uploading');
                            reject(new Error('Upload failed'));
                        }
                    });
                    xhr.addEventListener('error', () => {
                        box.classList.remove('uploading');
                        reject(new Error('Network error'));
                    });
                    box.classList.add('uploading');
                    indicator.style.display = 'flex';
                    xhr.send(file);
                })
                .catch(reject);
        });
    }

    function generatePPId(sportCode) {
        const randomPart = String.fromCharCode(97 + Math.floor(Math.random() * 26)) +
                           String(Math.floor(Math.random() * 1000)).padStart(3, '0') +
                           String.fromCharCode(97 + Math.floor(Math.random() * 26)) +
                           String.fromCharCode(97 + Math.floor(Math.random() * 26));
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const vaPart = `VA-${month}${day}${hour}`;
        const secondsPart = String(now.getSeconds()).padStart(3, '0');
        const counter = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
        return `${randomPart}-${vaPart}-HubIS-${sportCode}-${secondsPart}-${counter}`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const definition = document.querySelector('input[name="definition"]:checked')?.value;
        const fullName = document.getElementById('fullName').value.trim();
        const birthDate = document.getElementById('birthDate').value;
        const parentName = document.getElementById('parentName').value.trim();
        const inscriptionCode = document.getElementById('inscriptionCode').value.trim();
        const isAffiliated = affOui.checked;
        const affiliateId = affiliateIdInput.value.trim();
        const diplomaTitle = document.getElementById('diplomaTitle').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const sport = sportSelect.value;
        const certified = document.getElementById('certifie').checked;

        if (!definition || !fullName || !birthDate || !diplomaTitle || !phone || !sport || !certified) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        const diplomaFile = diplomaUpload.input.files[0];
        const idCardFile = idCardUpload.input.files[0];
        if (!diplomaFile || !idCardFile) {
            alert('Veuillez télécharger les deux fichiers requis.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Téléversement...';

        try {
            const [diplomaPath, idCardPath] = await Promise.all([
                uploadFileWithProgress(diplomaFile, 'diplome', diplomaUpload.box, diplomaUpload.indicator),
                uploadFileWithProgress(idCardFile, 'piece', idCardUpload.box, idCardUpload.indicator)
            ]);

            const sportKey = sport;
            const sportCode = sportFields[sportKey]?.roleCode || 'GEN';
            const sportData = {};
            if (sportFields[sportKey]) {
                sportFields[sportKey].fields.forEach(field => {
                    const el = document.getElementById(`sport_${field.name}`);
                    if (el) sportData[field.name] = el.value;
                });
            }

            const ppId = generatePPId(sportCode);

            const { data: inserted, error: insertError } = await supabaseSpacePublic
                .from('inscriptions')
                .insert([{
                    id: ppId,
                    sport: sportKey,
                    role_type: 'joueur',
                    definition,
                    full_name: fullName,
                    birth_date: birthDate,
                    parent_name: parentName || null,
                    inscription_code: inscriptionCode || null,
                    is_affiliated: isAffiliated,
                    affiliate_id: affiliateId || null,
                    diploma_title: diplomaTitle,
                    diploma_file: diplomaPath,
                    id_card_file: idCardPath,
                    phone,
                    sport_data: sportData,
                    status: 'pending'
                }])
                .select('id')
                .single();

            if (insertError) throw insertError;
            const ppIdResult = inserted.id;

            const modal = document.getElementById('successModal');
            const trackingSpan = document.getElementById('trackingId');
            trackingSpan.textContent = ppIdResult;
            modal.classList.add('active');

            form.reset();
            if (sportFieldsDiv) sportFieldsDiv.innerHTML = '';
            if (diplomaUpload.indicator) diplomaUpload.indicator.style.display = 'none';
            if (idCardUpload.indicator) idCardUpload.indicator.style.display = 'none';
            diplomaUpload.box.classList.remove('success', 'uploading');
            idCardUpload.box.classList.remove('success', 'uploading');
            const defaultSpan = diplomaUpload.box.querySelector('span');
            if (defaultSpan) defaultSpan.textContent = 'Cliquez pour télécharger (PDF, JPG, PNG)';
            const defaultSpanId = idCardUpload.box.querySelector('span');
            if (defaultSpanId) defaultSpanId.textContent = 'Cliquez pour télécharger (PDF, JPG, PNG)';
            affiliateGroup.style.display = 'none';
            parentGroup.style.display = 'none';
        } catch (err) {
            console.error(err);
            alert('Erreur lors de l\'inscription : ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Valider mon Premier Pas';
        }
    });

    document.getElementById('copyTrackingBtn').addEventListener('click', () => {
        const link = document.getElementById('trackingId').textContent;
        if (link) {
            navigator.clipboard.writeText(link).then(() => {
                const btn = document.getElementById('copyTrackingBtn');
                btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-copy"></i> Copier';
                }, 2000);
            }).catch(() => alert('Erreur de copie'));
        }
    });

    window.closeSuccessModal = () => {
        document.getElementById('successModal').classList.remove('active');
    };

    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    let slideInterval;
    function showSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        slides.forEach(s => s.classList.remove('active'));
        slides[index].classList.add('active');
        indicators.forEach(i => i.classList.remove('active'));
        indicators[index].classList.add('active');
        currentSlide = index;
    }
    function nextSlide() { showSlide(currentSlide + 1); }
    function startCarousel() { slideInterval = setInterval(nextSlide, 5000); }
    function stopCarousel() { clearInterval(slideInterval); }
    if (slides.length) {
        showSlide(0);
        startCarousel();
        const hero = document.getElementById('heroCarousel');
        if (hero) {
            hero.addEventListener('mouseenter', stopCarousel);
            hero.addEventListener('mouseleave', startCarousel);
        }
        indicators.forEach((ind, i) => {
            ind.addEventListener('click', () => {
                stopCarousel();
                showSlide(i);
                startCarousel();
            });
        });
    }

    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('open');
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        sessionStorage.setItem('affiliateRef', ref);
        affOui.checked = true;
        affiliateIdInput.value = ref;
        affiliateGroup.style.display = 'block';
    }
});
