// =====================================================================
// PARAMÈTRES (à adapter si besoin)
// =====================================================================

// Emprise des images (SW, NE) en latitude / longitude WGS84.
// = emprise des rasters découpés (EPSG:32630) convertie en WGS84.
// Toutes les images du dossier "images" doivent être exportées avec CETTE emprise.
var BOUNDS = [[47.5474, -2.2531], [47.7525, -1.9456]];
var REDON = [47.652, -2.084];

// Contour de la zone d'étude (GeoJSON en EPSG:4326, exporté depuis Redon_32630.gpkg)
var ZONE_FICHIER = 'vecteur/Redon.geojson';

// Zone d'étude : 571 511 pixels de 30 m = 514,36 km²
var SURFACE_ZONE_KM2 = 514.36;

// Les 2 séries d'images. Les noms de fichiers sont à placer dans le dossier "images".
var GROUPES = {
    crue: {
        label: "Crue détectée",
        etapes: [
            { court: "18 jan", date: "18 janvier 2025", fichier: "images/crue_20250118.png", role: "Avant la crue",
              info: "Sentinel-1A, 17h56 UTC. Un peu d'eau en excès : la vallée est déjà humide après un mois de janvier très pluvieux.", km2: 6.26, pct: 1.22 },
            { court: "30 jan", date: "30 janvier 2025", fichier: "images/crue_20250130.png", role: "Pic de la crue",
              info: "Sentinel-1A, 17h56 UTC. Maximum de la crue observé par Sentinel-1 : environ sept fois la surface du 18 janvier.", km2: 43.09, pct: 8.38 },
            { court: "31 jan (EMS)", date: "31 janvier 2025", fichier: "images/crue_ems_20250131.png", role: "Référence Copernicus EMS", ems: true,
              info: "COSMO-SkyMed SG (bande X, 2,5 m), 05h30 UTC, produit EMSR788 AOI06. Rastérisé à 30 m, eau BD TOPO retirée.", km2: 48.01, pct: 10.02 },
            { court: "11 fév", date: "11 février 2025", fichier: "images/crue_20250211.png", role: "Décrue",
              info: "Sentinel-1A, 17h56 UTC. La surface a chuté de plus de 90 % en douze jours. Aucun passage entre le 30 janvier et le 11 février.", km2: 3.92, pct: 0.76 },
            { court: "23 fév", date: "23 février 2025", fichier: "images/crue_20250223.png", role: "Retour vers la normale",
              info: "Sentinel-1A, 17h56 UTC. La surface détectée est revenue sous son niveau du 18 janvier.", km2: 1.59, pct: 0.31 }
        ]
    },
    vv: {
        label: "Image radar (VV)",
        etapes: [
            { court: "18 jan", date: "18 janvier 2025", fichier: "images/vv_20250118.png", role: "Avant la crue",
              info: "Rétrodiffusion en polarisation VV (dB), Sentinel-1A, path 30 ascendant. L'eau lisse apparaît en sombre." },
            { court: "30 jan", date: "30 janvier 2025", fichier: "images/vv_20250130.png", role: "Pic de la crue",
              info: "Les vallées de la Vilaine et de ses affluents s'assombrissent nettement : l'eau a envahi la plaine." },
            { court: "11 fév", date: "11 février 2025", fichier: "images/vv_20250211.png", role: "Décrue",
              info: "La plaine retrouve des valeurs proches de celles de l'image du 18 janvier." },
            { court: "23 fév", date: "23 février 2025", fichier: "images/vv_20250223.png", role: "Retour vers la normale",
              info: "Situation proche de la normale. Seuls la rivière et les plans d'eau permanents restent sombres." }
        ]
    }
};

// Légende affichée selon la série
var LEGENDES = {
    crue: '<div class="ligne"><span class="carre" style="background:#1f78b4"></span>Eau de crue détectée par Sentinel-1 (30 m)</div>' +
          '<div class="ligne"><span class="carre" style="background:#e07b39"></span>Eau de crue Copernicus EMS (31 janvier)</div>' +
          '<div class="ligne" style="font-size:12px;color:#555">Eau permanente (BD TOPO) exclue</div>',
    vv:   '<div class="ligne"><b>Rétrodiffusion VV (dB)</b></div>' +
          '<div class="ligne"><span class="degrade"></span></div>' +
          '<div class="ligne" style="justify-content:space-between;font-size:12px"><span>-25 dB : eau lisse</span><span>0 dB : bâti</span></div>'
};

// =====================================================================
// CARTE
// =====================================================================
var mymap = L.map('map', {
    center: REDON, // Les coordonnées appliquées à la vue lors de l'ouverture de la page
    zoom: 11, // Le niveau de zoom associé
    minZoom: 8, // Le niveau min de zoom
    maxZoom: 18, // Le niveau maximum
    zoomControl: false // Le zoom de base est désactivé, nous le définissons par la suite
});

var ignLayer = (style) => L.tileLayer(
  'https://data.geopf.fr/wmts?' +
    'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
    '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' +
    `&STYLE=${style}&TILEMATRIXSET=PM` +
    '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}' +
    '&FORMAT=image/png',
  {
    attribution: '© IGN – Géoplateforme',
    maxZoom: 19
  }
);

var baselayers = {

  TERRAIN: ignLayer('normal'),
  SATELLITE: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Esri, Maxar, Earthstar Geographics',
      maxZoom: 18
    }
  )
};


baselayers.TERRAIN.addTo(mymap);
L.control.layers(baselayers, null, { position: 'topright', collapsed: false }).addTo(mymap);

L.control.zoom({ position: 'topright' }).addTo(mymap);
L.control.scale({ position: 'bottomright' }).addTo(mymap);

// Contour de la zone d'étude et repère de Redon
// Zone d'étude : lue depuis un fichier GeoJSON (WGS84) du dossier "vecteur".
// Si le fichier est introuvable, on retombe sur le rectangle défini par BOUNDS.
var STYLE_ZONE = { color: '#af5d42', weight: 1.5, dashArray: '6 6', fill: false, interactive: false };
fetch(ZONE_FICHIER)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { L.geoJSON(data, { style: STYLE_ZONE }).addTo(mymap); })
    .catch(function () {
        console.warn('Zone d\'étude introuvable (' + ZONE_FICHIER + ') : emprise des images utilisée à la place.');
        L.rectangle(BOUNDS, STYLE_ZONE).addTo(mymap);
    });
L.circleMarker(REDON, { radius: 5, color: '#14213D', weight: 2, fillColor: 'white', fillOpacity: 1 })
    .bindTooltip('Redon', { permanent: true, direction: 'right', offset: [6, 0] }).addTo(mymap);

// =====================================================================
// IMAGES, SLIDER ET INFORMATIONS
// =====================================================================
var groupeCourant = 'crue';
var indexCourant = 0;
var opacite = 0.85;
var overlays = {};
var manquantes = [];
var timer = null;
var graphique = null;

var sliderTemps = document.getElementById('sliderTemps');
var sliderOpacite = document.getElementById('sliderOpacite');
var btnPlay = document.getElementById('btnPlay');

// On charge toutes les images dès le départ : le changement de date est alors instantané,
// avec un fondu enchaîné (opacité animée en CSS).
Object.keys(GROUPES).forEach(function (g) {
    GROUPES[g].etapes.forEach(function (e, i) {
        var ov = L.imageOverlay(e.fichier, BOUNDS, { opacity: 0, interactive: false });
        ov.on('error', function () {
            if (manquantes.indexOf(e.fichier) === -1) manquantes.push(e.fichier);
            majAvertissement();
        });
        ov.addTo(mymap);
        overlays[g + '_' + i] = ov;
    });
});

function majAvertissement() {
    var el = document.getElementById('avertissement');
    var courants = GROUPES[groupeCourant].etapes.map(function (e) { return e.fichier; });
    var absentes = manquantes.filter(function (f) { return courants.indexOf(f) !== -1; });
    el.textContent = absentes.length ? 'Image introuvable dans le dossier : ' + absentes.join(', ') : '';
}

function creerGraphique() {
    var etapes = GROUPES.crue.etapes;
    graphique = new Chart(document.getElementById('surfaceChart'), {
        type: 'bar',
        data: {
            labels: etapes.map(function (e) { return e.court; }),
            datasets: [{ data: etapes.map(function (e) { return e.km2; }), backgroundColor: [] }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { title: { display: true, text: 'km²' }, beginAtZero: true }, x: { ticks: { font: { size: 10 } } } }
        }
    });
}

function majGraphique() {
    if (!graphique) return;
    var etapes = GROUPES.crue.etapes;
    graphique.data.datasets[0].backgroundColor = etapes.map(function (e, i) {
        var actif = (groupeCourant === 'crue' && i === indexCourant);
        if (e.ems) return actif ? '#e07b39' : '#f1c3a5';
        return actif ? '#1f78b4' : '#a6cee3';
    });
    graphique.update();
}

function afficher() {
    var groupe = GROUPES[groupeCourant];
    var e = groupe.etapes[indexCourant];

    // Images : on n'affiche que l'image courante
    Object.keys(overlays).forEach(function (k) { overlays[k].setOpacity(0); });
    overlays[groupeCourant + '_' + indexCourant].setOpacity(opacite);

    // Panneau d'informations
    document.getElementById('infoTitre').textContent = e.date;
    var tag = document.getElementById('infoRole');
    tag.textContent = e.role;
    tag.className = 'tag' + (e.ems ? ' ems' : '');
    document.getElementById('infoDetail').textContent = e.info;

    var stats = document.getElementById('statsBloc');
    if (e.km2 !== undefined) {
        stats.style.display = 'block';
        document.getElementById('statKm2').textContent = e.km2.toFixed(2).replace('.', ',');
        document.getElementById('statPct').textContent = e.pct.toFixed(2).replace('.', ',') + ' %';
    } else {
        stats.style.display = 'none';
    }

    // Légende
    document.getElementById('legende').innerHTML = LEGENDES[groupeCourant];

    // Slider et graduations
    sliderTemps.value = indexCourant;
    document.querySelectorAll('#graduations button').forEach(function (b, i) {
        b.classList.toggle('actif', i === indexCourant);
    });
    majGraphique();
    majAvertissement();
}

function construireSlider() {
    var groupe = GROUPES[groupeCourant];
    sliderTemps.max = groupe.etapes.length - 1;
    var grad = document.getElementById('graduations');
    grad.innerHTML = '';
    groupe.etapes.forEach(function (e, i) {
        var b = document.createElement('button');
        b.textContent = e.court;
        if (e.ems) b.className = 'ems';
        b.addEventListener('click', function () { arreter(); indexCourant = i; afficher(); });
        grad.appendChild(b);
    });
    document.querySelectorAll('.btn-groupe').forEach(function (b) {
        b.classList.toggle('active', b.dataset.groupe === groupeCourant);
    });
}

function changerGroupe(g) {
    arreter();
    groupeCourant = g;
    indexCourant = 0;
    construireSlider();
    afficher();
}

function lire() {
    btnPlay.innerHTML = '&#10074;&#10074;';
    timer = setInterval(function () {
        indexCourant = (indexCourant + 1) % GROUPES[groupeCourant].etapes.length;
        afficher();
    }, 1800);
}

function arreter() {
    if (timer) { clearInterval(timer); timer = null; }
    btnPlay.innerHTML = '&#9654;';
}

// Interactions
sliderTemps.addEventListener('input', function () { arreter(); indexCourant = parseInt(this.value, 10); afficher(); });
sliderOpacite.addEventListener('input', function () { opacite = parseFloat(this.value); overlays[groupeCourant + '_' + indexCourant].setOpacity(opacite); });
btnPlay.addEventListener('click', function () { timer ? arreter() : lire(); });
document.querySelectorAll('.btn-groupe').forEach(function (b) {
    b.addEventListener('click', function () { changerGroupe(this.dataset.groupe); });
});
document.addEventListener('keydown', function (ev) {
    var n = GROUPES[groupeCourant].etapes.length;
    if (ev.key === 'ArrowRight') { arreter(); indexCourant = Math.min(indexCourant + 1, n - 1); afficher(); }
    if (ev.key === 'ArrowLeft') { arreter(); indexCourant = Math.max(indexCourant - 1, 0); afficher(); }
    if (ev.key === ' ') { ev.preventDefault(); timer ? arreter() : lire(); }
});

creerGraphique();
construireSlider();
afficher();

// =====================================================================
// ONGLETS : TUTORIEL ET RÉFÉRENCES
// =====================================================================
var tabTutoriel = document.getElementById('tabTutoriel');
var tabref = document.getElementById('tabref');

var tutorialSteps = [
    {
        title: "Tutoriel de l'interface",
        content: "Cette carte permet de suivre la crue de la Vilaine à Redon (janvier - février 2025) à partir d'images radar Sentinel-1, et de comparer le résultat à la cartographie officielle de Copernicus EMS."
    },
    {
        title: "Prise en main",
        content: "Il est possible de se déplacer sur la carte, de modifier le zoom, ou encore de changer le fond de carte (clair, sombre, terrain ou satellite) avec le sélecteur en haut à droite."
    },
    {
        title: "Les deux séries d'images",
        content: "Deux boutons en bas de l'écran permettent de choisir la série : <b>Crue détectée</b> (surfaces inondées calculées à chaque date) ou <b>Image radar (VV)</b> (l'image brute en décibels, où l'eau lisse apparaît en sombre)."
    },
    {
        title: "Le slider temporel",
        content: "En déplaçant le curseur, ou en cliquant sur une date, vous passez d'une date à l'autre avec un fondu enchaîné. Le bouton lecture fait défiler les dates automatiquement. Les flèches du clavier et la barre d'espace fonctionnent aussi."
    },
    {
        title: "Chiffres et référence EMS",
        content: "Le panneau de gauche indique la surface inondée de chaque date, en km² et en part de la zone d'étude. La date du <b>31 janvier</b> (en orange) correspond au produit Copernicus EMS, utilisé pour valider la détection du 30 janvier."
    },
    {
        title: "Réglages de l'affichage",
        content: "Le curseur d'opacité permet de voir le fond de carte à travers l'image. Réduisez-le pour repérer les routes, les bâtiments ou les cours d'eau sous la zone inondée."
    },
    {
        title: "Informations complémentaires",
        content: "Pour plus de renseignements sur la méthode, les données et les limites, veuillez vous référer à la section '<u>Références</u>'."
    }
];

var referenceSteps = [
    {
        title: "Réalisation",
        content: "Guillot Romain - Octobre 2026"
    },
    {
        title: "Données",
        content: "Images radar : Sentinel-1A (ESA / Copernicus), traitées par ASF HyP3 (RTC gamma0, 30 m)<br>" +
                 "Référence de crue : Copernicus EMS, activation EMSR788, produit AOI06 (COSMO-SkyMed SG, 31 janvier 2025)<br>" +
                 "Eau permanente et bâtiments : BD TOPO IGN<br>" +
                 "Fonds de carte : OpenStreetMap, CARTO, OpenTopoMap, Esri"
    },
    {
        title: "Méthode",
        content: "L'eau lisse renvoie très peu de signal radar. Un seuil à <b>-15 dB</b> (polarisation VV) isole l'eau, un tamisage de 8 pixels supprime le bruit, puis l'eau permanente de la BD TOPO est retirée pour ne garder que l'eau de crue."
    },
    {
        title: "Validation",
        content: "Comparaison pixel à pixel du 30 janvier (Sentinel-1) avec le 31 janvier (EMS) :<br>détection <b>83,2 %</b> · précision <b>92,7 %</b> · IoU <b>78,1 %</b> · F1 <b>88,6 %</b>"
    },
    {
        title: "Limites",
        content: "Le radar sous-estime l'eau en ville et sous la végétation : les surfaces sont des estimations minimales. Les passages sont espacés de 12 jours, et onze heures séparent l'image Sentinel-1 de celle de l'EMS."
    }
];

function diaporama(etapes, texteFin) {
    var i = 0;
    function suivant() {
        var derniere = (i === etapes.length - 1);
        Swal.fire({
            title: etapes[i].title,
            html: etapes[i].content,
            confirmButtonText: derniere ? texteFin : 'Étape suivante &rarr;',
            showCancelButton: !derniere,
            cancelButtonText: 'Quitter',
            reverseButtons: true,
            footer: 'Étape ' + (i + 1) + ' / ' + etapes.length
        }).then(function (result) {
            if (result.isConfirmed && !derniere) { i++; suivant(); }
        });
    }
    suivant();
}

tabTutoriel.addEventListener('click', function () { diaporama(tutorialSteps, "C'est parti !"); });
tabref.addEventListener('click', function () { diaporama(referenceSteps, 'Fermer'); });
