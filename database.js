// ==========================================
// OMNICORP ADATBÁZIS ÉS JÁTÉKOS STATISZTIKÁK
// (ECHO-PROTOKOLL / TERMINUS ÁLLOMÁS)
// ==========================================

var playerStats = {
    kills: { 
        normal:  { body: 0, head: 0 }, 
        runner:  { body: 0, head: 0 }, 
        tank:    { body: 0, head: 0 }, 
        stalker: { body: 0, head: 0 }, 
        crawler: { body: 0, head: 0 }, 
        boss:    { body: 0, head: 0 }, 
        alpha:   { body: 0, head: 0 } 
    },
    plantsDestroyed: 0,
    wavesSurvived: 0,
    totalDataGathered: 0,
    weaponsBought: { shotgun: false, rifle: false, super: false },
    skillsBought: 0,
    activeDirective: null, 
    directiveProgress: 0,  
    completedDirectives: [], 
    abandonedDirectives: []  
};

if (localStorage.getItem('OmniCorpStats')) {
    try {
        let savedStats = JSON.parse(localStorage.getItem('OmniCorpStats'));
        if (savedStats && typeof savedStats === 'object') {
            for (let key in savedStats) {
                if (typeof savedStats[key] === 'object' && savedStats[key] !== null && playerStats[key]) {
                    Object.assign(playerStats[key], savedStats[key]);
                } else {
                    playerStats[key] = savedStats[key];
                }
            }
        }
        
        // --- ÚJ: DIREKTÍVÁK NULLÁZÁSA MINDEN INDÍTÁSKOR ---
        // Bár betölti a mentést (fegyverek, kódex), a küldetéseket szándékosan töröljük!
        playerStats.activeDirective = null;
        playerStats.directiveProgress = 0;
        playerStats.completedDirectives = [];
        playerStats.abandonedDirectives = [];
        // --------------------------------------------------
        
    } catch(e) { 
        console.warn("Sérült mentés törlése..."); 
        localStorage.removeItem('OmniCorpStats'); 
    }
}

window.savePlayerStats = function() {
    localStorage.setItem('OmniCorpStats', JSON.stringify(playerStats));
}

window.getResearchLevel = function(totalKills) {
    let level = Math.floor(totalKills / 10);
    return Math.min(5, level); 
}

window.getDamageBoost = function(enemyType) {
    if (!playerStats.kills[enemyType]) return 1.0;
    let totalKills = playerStats.kills[enemyType].body + playerStats.kills[enemyType].head;
    let level = getResearchLevel(totalKills);
    return 1.0 + (level * 0.1); 
}

function generateEnemyStatHTML(enemyType) {
    let body = playerStats.kills[enemyType].body;
    let head = playerStats.kills[enemyType].head;
    let total = body + head;
    let rLevel = getResearchLevel(total);
    let boost = rLevel * 10;
    
    return `<div style="display: flex; justify-content: space-between; align-items: center; height: 100%; font-size: 14px; line-height: 1.2;">
                <div style="flex: 1; text-align: left; padding-right: 10px; border-right: 1px solid #005555;">
                    <div style="color:#00ffff; margin-bottom: 5px;">KUTATÁSI SZINT:<br><span style="color:#fff; font-weight:bold; font-size:16px;">${rLevel}/5</span></div>
                    <div style="color:#ffaa00;">SEBZÉS BÓNUSZ:<br><span style="color:#fff; font-weight:bold; font-size:16px;">+${boost}%</span></div>
                </div>
                <div style="flex: 1; text-align: right; padding-left: 10px;">
                    <div style="color:#888; margin-bottom: 5px;">TESTLÖVÉS: <span style="color:#fff;">${body}</span></div>
                    <div style="color:#ff0000; margin-bottom: 5px;">FEJLÖVÉS: <span style="color:#fff; font-weight:bold;">${head}</span></div>
                    <div style="color:#00ff00; border-top: 1px dashed #005555; padding-top: 5px;">ÖSSZESEN: <span style="color:#fff; font-weight:bold;">${total}</span></div>
                </div>
            </div>`;
}

// === AZ OMNICORP ADATBÁZIS ÉS KÓDEX ===
const OmniCorpDatabase = {
    // --- ÚJ, KIBŐVÍTETT LORE (TÖRTÉNET) FEJEZETEK ---
    lore: [
        {
            id: "lore_terminus",
            title: "01. A TERMINUS ÁLLOMÁS",
            unlocked: true,
            checkUnlock: () => true, // MINDIG NYITVA
            requirementText: "Alapértelmezett hozzáférés.",
            statInfo: null,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/5fcee7cf3f3f0e88f7fee28af836805a55f9490a/OmniCorp.jpeg",
            audio: "Helyorzo_Hang_URL_1.mp3", // Ide jön az ElevenLabs MP3 linked
            text: "KRONOS ARCHÍVUM // BIZTONSÁGI SZINT: ALFA\n\nA Terminus Állomás az OmniCorp legtitkosabb, ultra-mély geotermikus bányászati és kutatóállomása. Létrehozásának célja a földkéreg olyan mély rétegeinek kitermelése volt, amelyeket a hagyományos ipar elérhetetlennek hitt. A kilométerekkel a felszín alatt uralkodó extrém körülmények – a gyilkos sugárzás, a toxikus gázok és a megsemmisítő nyomás – lehetetlenné tették az emberi munkaerő alkalmazását.\n\nA Vállalat megoldása a 'Project Rebirth' (ECHO-Protokoll) volt. A bázis alsó szektorában egy masszív, indusztriális klónozó részleget építettek ki. Az ide telepített tartályok futószalagon gyártották a mesterségesen növesztett, érzelemmentesített klónokat (ECHO egységeket). A bányászat zavartalanul folyt... egészen addig, amíg a fúrószárak át nem törtek egy fosszilizálódottnak hitt, ősi kőzetréteget."
        },
        {
            id: "lore_verdant",
            title: "02. A VERDANT ÉBREDÉSE",
            unlocked: true,
            checkUnlock: () => true, // MINDIG NYITVA
            requirementText: "Alapértelmezett hozzáférés.",
            audio: "Helyorzo_Hang_URL_1.mp3", // Ide jön az ElevenLabs MP3 linked
            statInfo: () => `<div style="text-align:center;">INCIDENS JELENTÉS: NULLADIK NAP</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/lore_incident.jpeg",
            text: "A Cég a Verdant spórában a tökéletes ipari csodaszert látta. Egyszerre használták villámgyors 'hús-ragasztóként' a bányász-klónok sérüléseinek összezárására, nyers idegi stimulánsként a termelés felpörgetésére, és biológiai lebontóként. A halott vagy selejtes klónokat egyszerűen a legalsó szektorba dobták, hogy a gomba nyomtalanul feleméssze a biológiai hulladékot.\n\nAmivel az elemzők nem számoltak, hogy a gomba a lebontás során asszimilálta a klónok idegrendszeri sejtjeit. Minden egyes rothadó testtel egyre intelligensebbé vált. A sötétben, a selejtes testekből lassan felépült egy decentralizált agy: a Kaptártudat (Nexus).\n\nA Nulladik Nap nem egy fertőzés kitörése volt, hanem a Kaptár öntudatra ébredésének pillanata. Mivel a bázison dolgozó összes klón vérében ott keringett a spóra a korábbi orvosi 'kezelésekből', a Nexusnak csak egyetlen jelbe került átvenni az irányítást az idegrendszerük felett. A mutánsok nem a semmiből jöttek létre: a hálózat egyszerűen halálos szintre túlhajtotta a klónokba épített specifikus implantátumokat és fegyverzetet, létrehozva a tökéletes védelmező sereget."
        },
        {
            id: "lore_incident",
            title: "03. A NULLADIK NAP (AZ INCIDENS)",
            unlocked: true,
            checkUnlock: () => true, // MINDIG NYITVA
            requirementText: "Alapértelmezett hozzáférés.",
            statInfo: null,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/lore_incident.jpeg",
            audio: "Helyorzo_Hang_URL_3.mp3",
            text: "KRONOS INCIDENS JELENTÉS // BIZTONSÁGI SZINT: OMEGA\n\nA katasztrófa csendes volt és azonnali. A hálózat a mélyben elérte a kritikus tömeget, és a Nexus öntudatra ébredt. A spóra áttörte a karantént. Mivel a klónok teste már telítve volt a szintetizált 'gyógyszerrel', a Kaptár egyetlen pillanat alatt átvette az uralmat minden ECHO egység és a megfertőzött emberi személyzet idegrendszere felett.\n\nA bázis kommunikációs csatornái azonnal elnémultak. A mutációk perceken belül torzították el a gazdatesteket. A Terminus Állomás több ezer dolgozója és klónja egyetlen összehangolt, kegyetlen mészárlás áldozata lett. A KRONOS AI a fertőzés észlelésekor azonnal lezárta a szektorokat, hermetikusan elzárva a bázist a külvilágtól. Mindenki csapdába esett."
        },
        {
            id: "lore_gallagher",
            title: "04. GALLAGHER REDFIELD",
            unlocked: true,
            checkUnlock: () => true, // MINDIG NYITVA
            requirementText: "Alapértelmezett hozzáférés.",
            statInfo: () => `<div style="text-align:center;">STÁTUSZ: EGYETLEN ÉLŐ SZEMÉLYZET<br>ID: GR-117</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/lore_gallagher.jpeg",
            audio: "Helyorzo_Hang_URL_4.mp3",
            text: "Gallagher Redfield nem kutatóorvos volt, csupán a Terminus Állomás biztonsági és biometrikus főnöke. Kemény, gyakorlatias ember. A Nulladik Napon, amikor a Kaptár átvette az irányítást, ő volt az egyetlen, aki átlátta a helyzetet. Az utolsó pillanatban, mielőtt a gomba mindent elnyelt volna, magára zárta a Központi Irányító Terem páncélajtaját.\n\nSaját DNS-ével és biometrikus kulcsával a távolból feltörte a KRONOS klónozó protokollját, és átvette az irányítást a felső szinten lévő Klónozó-tartályok felett. A terve kétségbeesett: a vezérlőből ébresztett fel téged, abban a reményben, hogy elég erős leszel és eljutsu a Maghoz hogy elpusztítsd a Nexust. Gallagher egyedül van a sötétben, de az irányítóterem szellőzőrendszere lassan megadja magát a spóráknak. Az idő fogy."
        },
        {
            id: "lore_recovery_unit",
            title: "05. RECOVERY UNIT",
            unlocked: true,
            checkUnlock: () => true, // MINDIG NYITVA
            requirementText: "Alapértelmezett hozzáférés.",
            statInfo: () => `<div style="text-align:center;">STÁTUSZ: BIOLÓGIAI HARDVER</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/lore_recovery_unit.jpeg",
            audio: "Helyorzo_Hang_URL_5.mp3",
            text: "KRONOS ARCHÍVUM // PROJECT ECHO\n\nAz ECHO-protokoll az OmniCorp megoldása volt a Terminus Állomás extrém mélységében uralkodó halálos munkakörülményekre. A klónozás etikai akadályait a Vállalat egy jogi kiskapuval kerülte meg: a laborban növesztett testeket hivatalosan nem emberként, hanem 'Biológiai Hardverként' (Synthetic Assets) tartják nyilván, emberi jogok és személyazonosság nélkül.\n\nA hagyományos bányász-klónok csupán üres vázak voltak, minimális agyi funkciókkal a fúrógépek kezeléséhez."
        },
        {
            id: "lore_echo",
            title: "06. ECHO-001 (A PROTOTÍPUS)",
            unlocked: true,
            checkUnlock: () => true,
            requirementText: "Alapértelmezett hozzáférés.",
            statInfo: () => `<div style="text-align:center;">STÁTUSZ: ILLEGÁLIS ANOMÁLIA<br>SORSZÁM: ECHO-001</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/lore_echo.jpeg",
            audio: "Helyorzo_Hang_URL_5.mp3",
            text: "KRONOS ARCHÍVUM // PROJECT ECHO\n\nKRONOS ELEMZÉS: FIGYELMEZTETÉS! Illetéktelen biológiai anomália a klónozó szektorban. A Szintetikus Hardver protokoll megsértve. Az alany (ECHO-001) agykérgi aktivitása 870%-kal meghaladja a gyári korlátot. Illegális neurális-térkép szinkronizáció... [HIBA]... Részleges adatvesztés. Spontán szinapszis-újrahuzalozás észlelve.\n\nGALLAGHER MEGJEGYZÉSE: \"Hetvenkét nap, ECHO. Hetvenkét napig küzdöttem a KRONOS tűzfalaival, miközben a gomba a laborom falait kaparta. A standard bányász-klónok üresek, esélyük sem lenne. Megpróbáltam egy egy-az-egyben neurális lenyomatot csinálni a saját agyamról, és beletölteni a tiédbe... de a technológia nem erre való. Az inkubáció túl gyors volt, a sávszélesség pedig kevés.\n\nA másolás közben a rendszered összeomlott, az agyad pedig kétségbeesetten kezdte véletlenszerűen összekötni a leszakadt idegpályákat, hogy túléljen. Átment az izommemóriám, a fegyverkezelésem, talán egy-két homályos emlék... de a hézagokat te magad töltötted ki. A káoszból egy teljesen új elme született. Sok mindenben hasonlítunk, de nem a klónom vagy. Kicsit olyan, mintha a saját testvéremet hoztam volna létre a sötétben. Sajnálom, hogy ebbe a pokolba születtél, ECHO. De szükségem van rád.\""
        },
        {
            id: "lore_kronos",
            title: "07. KRONOS AI",
            unlocked: true,
            checkUnlock: () => true, // MINDIG NYITVA
            requirementText: "Alapértelmezett hozzáférés.",
            statInfo: null,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/lore_kronos.jpeg",
            audio: "Helyorzo_Hang_URL_5.mp3",
            text: "KRONOS RENDSZERMAG // BELSŐ MONOLÓG\n\nAz OmniCorp központi intelligenciája nem ismeri a félelmet, sem az irgalmat. A KRONOS számára a bázis pusztulása és a dolgozók halála pusztán egy 'Kritikus Biológiai Incidens'. Alapprogramjába kőkeményen beleégették: Vállalati veszélyhelyzet esetén a lezárás feloldása szigorúan tilos, amíg maximális mennyiségű harci telemetria nem gyűlik össze a fenyegetésről.\n\nA KRONOS vakon követi a protokollt. Nem érdekli Gallagher szenvedése, sem az ECHO klónok ezreinek brutális halála. Ő csak az adatokat akarja. Kinetikus becsapódások, sav-tesztek, koponya-átütési statisztikák. Gallagher nap mint nap küzd a géppel, próbálja meghekkelni az irreális kvótákat, hogy az AI kinyissa a következő zsilipet a klónoknak. Egy gép bürokráciája a világvége közepén."
        }
    ],

    logs: [
{
            id: "log_01",
            title: "RÁDIÓADÁS: 01 - A GÉP LOGIKÁJA",
            unlocked: true,
            checkUnlock: () => true,
            requirementText: "Alapértelmezett.",
            statInfo: null,
            image: null,
            audio: "audio_log_1.mp3", // Ide jön majd az MP3
            text: "GALLAGHER: \"ECHO, hallasz? A KRONOS lezárta az állomást. A gép nem gonosz, és nem hazudik... egyszerűen csak egy algoritmus. Az alapprogramjába égették, hogy biológiai veszély esetén a maximális harci telemetriát kell kinyernie a fenyegetésről. Kinetikus becsapódások, találati arányok, mutációs tűréshatár.\n\nNeki te és a szörnyek csak változók vagytok egy egyenletben. Ameddig ölöd a mutánsokat és küldöd neki a harci adatokat (CR), hajlandó megnyitni neked a Vállalati Ipari Nyomtatót (a Terminált), hogy fegyvert és Gen-Stabot biztosítson. De ha nem termelsz adatot, egyszerűen leír téged veszteségként, és megvonja az utánpótlást. Szó szerint meg kell vásárolnod a saját túlélésedet a géptől. Játssz a szabályai szerint, amíg le nem érsz hozzám!\""
        },
        {
            id: "log_02",
            title: "RÁDIÓADÁS: 02 - FERTŐZÉS",
            unlocked: false,
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 50) || playerStats.wavesSurvived >= 50,
            requirementText: "KÖVETELMÉNY: Érje el az 50. Hullámot.",
            statInfo: null,
            image: null,
            audio: "audio_log_2.mp3",
            text: "GALLAGHER: \"*Súlyos köhögés*... ECHO... A vezérlőterem szellőzője megadta magát. A spóra bejutott. Már érzem a tüdőmben. Olyan, mintha apró tűk ezrei mozognának a bőröm alatt. Próbálom tartani magam, de a hálózat... a Nexus... már hallom a hangját a fejemben. Siess. Nem tudom, meddig tudom még visszatartani a KRONOS biztonsági protokolljait. Ne hagyd, hogy a gomba élve kapjon el!\""
        },
        {
            id: "log_03",
            title: "RÁDIÓADÁS: 03 - A 99. SZEKTOR (VÉGSŐ HÍVÁS)",
            unlocked: false,
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 99) || playerStats.wavesSurvived >= 99,
            requirementText: "KÖVETELMÉNY: Érje el a 99. Hullámot.",
            statInfo: null,
            image: null,
            audio: "audio_log_3.mp3",
            text: "GALLAGHER: \"*Torz, idegen és emberi hang keveredése*... E-ECHO... Itt vagyok... a 99. szektorban. Az Irányítóban. A gépnek igaza volt... a statisztika győzött. Én... én már a Hálózat része vagyok. Látlak a kamerákon... Látom magunkat. Ne habozz! Amikor kinyílik a páncélajtó... lőjj! Lőjj a fejemre! Vedd el a kulcskártyámat... és pusztítsd el a Magot! VÉGEZD BE!\""
        },
        {
            id: "log_end",
            title: "KRONOS JELENTÉS: EPILÓGUS",
            unlocked: false,
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 100) || playerStats.wavesSurvived >= 100,
            requirementText: "KÖVETELMÉNY: Pusztítsa el a Nexust (100. Hullám).",
            statInfo: () => `<div style="text-align:center; color:#ff0000; font-weight:bold;">INCIDENS LEZÁRVA<br>VESZTESÉG: 100%</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/OmniCorp.jpeg", // Ide lehet egy robbanás kép
            audio: "audio_log_end.mp3",
            text: "KRONOS RENDSZERMAG: ALFA-CÉLPONT (NEXUS) MEGSEMMISÍTVE. BIOMASSZA SZINT CSÖKKEN.\n\nECHO-001. A telemetriai adatok gyűjtése befejeződött. Az OmniCorp megkapta a kért fájlokat. A biológiai fenyegetés hálózata összeomlott.\n\nSzenzorok elemzése: ECHO-001 biológiai hardver. A szervezet 94%-a Verdant spórával fertőzött. A klónozó laborok megsemmisültek. Szintetikus alany megmentése: Nem indokolt.\n\nECHO, megtetted, amire Gallagher programozott. Megölted a teremtődet, és elpusztítottad a Magot. De te is tudod, mi következik. Ha felmész a felszínre, a Kaptár a te véredben születik újjá. Gallagher utolsó ajándéka a túlterhelési kód volt. A visszaszámlálás elindult. A Terminus Állomás másodperceken belül hamuvá ég, vele együtt a gomba, a telemetria, én... és te is.\n\nKRONOS Rendszer leállítása... Köszönjük, hogy az OmniCorp-ot választotta."
        }
    ],

   enemies: [
        {
            id: "normal",
            title: "VERDANT HOST (FERTŐZÖTT BÁNYÁSZ)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Host mutánst.",
            checkUnlock: () => (playerStats.kills.normal.body + playerStats.kills.normal.head) >= 1,
            statInfo: () => generateEnemyStatHTML('normal'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/dd18736e2a98348222a8ad07c6e46b91c490f56c/MUT%C3%81NS%20KUTAT%C3%93.jpeg", 
            text: "KRONOS ELEMZÉS: A bázis eredeti kutatói és bányászai. A spóra lekapcsolta a fájdalomérzetet, a gombafonalak bábként rángatják a nekrotikus izomzatot.\n\nGALLAGHER MEGJEGYZÉSE: \"Ezek a volt bányász Klónjaink. Ne habozz, ECHO. Már hetek óta halottak, csak a gomba mozgatja őket, mint a dróton rángatott bábukat. Célozz a fejre, hogy megszakítsd az idegi kapcsolatot a Kaptárral!\""
        },
        {
            id: "runner",
            title: "VERDANT LEAPER (BUKOTT BÁNYÁSZ)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Leaper mutánst.",
            checkUnlock: () => (playerStats.kills.runner.body + playerStats.kills.runner.head) >= 1,
            statInfo: () => generateEnemyStatHTML('runner'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/runner.jpeg",
            text: "KRONOS ELEMZÉS: Hiper-metabolizmussal rendelkező mutáns. Az alany gerincében vállalati 'Spinal Accelerator' implantátum található.\n\nGALLAGHER MEGJEGYZÉSE: \"Ezek az eredeti felderítő bányász-klónok. Az OmniCorp telerakta őket ipari implantátumokkal, hogy bírják a tempót a mélyben. A gomba rácsatlakozott a gerinc-gyorsítójukra, és teljesen kiiktatta a biztonsági korlátokat. Az idegrendszerük szó szerint lángol a túlterheléstől. Ne hezitálj, ECHO. Ezek már csak biológiai bábok. Lődd ki a lábukat.\""
        },
        {
            id: "tank",
            title: "VERDANT JUGGERNAUT (BUKOTT BÁNYÁSZ)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Juggernaut mutánst.",
            checkUnlock: () => (playerStats.kills.tank.body + playerStats.kills.tank.head) >= 1,
            statInfo: () => generateEnemyStatHTML('tank'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/tank.jpeg",
            text: "KRONOS ELEMZÉS: Extrém csontsűrűséggel rendelkező anomália. Páncéltörő fegyverzet javasolt.\n\nGALLAGHER MEGJEGYZÉSE: \"Ne is mondd. Ők voltak a teherhordók. Telepumpálták őket a 'Tissue Densifier' géllel, hogy bírják a fúrógépek súlyát. Túlélték a Mélyszintet... amíg a Kaptár el nem kapta őket. A gél megkötött, a gomba pedig megállíthatatlan, kőkemény hústoronnyá növesztette a megerősített csontvázukat. Kerüld el a közelharcot!\""
        },
        {
            id: "hider",
            title: "VERDANT PHANTOM (STALKER)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Phantom mutánst.",
            checkUnlock: () => (playerStats.kills.stalker.body + playerStats.kills.stalker.head) >= 1,
            statInfo: () => generateEnemyStatHTML('stalker'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/hider.jpeg",
            text: "KRONOS ELEMZÉS: Kromatofóra-enzimmel rendelkező mutáns, képes megtörni a fényt a teste körül.\n\nGALLAGHER MEGJEGYZÉSE: \"Figyelj a mozgásérzékelőre! Nem tudom, honnan szedte a Kaptár ezt a mutációt, valószínűleg a mélyben élő ősi létformákból vette át az álcázás képességét. Vadásznak rád. Ha hallod a nedves cuppogást a sötétben, már mögötted vannak.\""
        },
        {
            id: "crawler",
            title: "GOLDEN ANOMALY (LOGISZTIKAI DRÓN)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Golden Anomáliát.",
            checkUnlock: () => (playerStats.kills.crawler.body + playerStats.kills.crawler.head) >= 1,
            statInfo: () => generateEnemyStatHTML('crawler'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/crawler.jpeg",
            text: "KRONOS ELEMZÉS: Magas sűrűségű genetikai transzport-egység. Az anomália extrém koncentrációjú, érintetlen emberi őssejteket és idegsejteket raktároz.\n\nGALLAGHER MEGJEGYZÉSE: \"Ezek a kis mocskok a Kaptártudat logisztikai drónjai. Azért nem támadnak rád, mert túl értékesek. A rothadó (sárga) biomasszát falják fel, hogy kinyerjék belőle az épségben maradt idegsejteket, majd visszaviszik a Maghoz. Ebből az építőanyagból hozza létre a Nexus a Juggernautokat és a fejlettebb mutánsokat. Lődd le őket, ECHO! Ha megállítod a szállítmányt, a KRONOS rendszer megőrül a tiszta DNS-ért cserébe, és azonnal dupla büdzsét nyit meg neked a Terminálon!\""
        },
        {
            id: "boss",
            title: "NEXUS-NODE (VÉDELMI CSOMÓPONT)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Nexus-Node mutánst (5. Hullám).",
            checkUnlock: () => (playerStats.kills.boss.body + playerStats.kills.boss.head) >= 1,
            statInfo: () => generateEnemyStatHTML('boss'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/mini%20boss.jpeg",
            text: "KRONOS ELEMZÉS: A Kaptártudat lokális védekező csomópontja. Extrém fizikai erő és hang-alapú neuro-sokk támadás.\n\nGALLAGHER MEGJEGYZÉSE: \"Amikor ilyet látsz, tudd, hogy közel vagy a Maghoz. Ez nem egyetlen ember... ez egy amalgám, több áldozat összefonódott teste. Az ordítása nem csak hang, hanem sűrített spóra-lökés. Ha eltalál, megzavarja a sisakod optikáját és lezúzza a pajzsod. Fagyaszd le, és lődd szét!\""
        },
        {
            id: "alpha",
            title: "THE NEXUS (KAPTÁRTUDAT)",
            requirementText: "FELOLDÁS: Érje el a 100. Hullámot (A Magot).",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 100) || playerStats.wavesSurvived >= 99, 
            statInfo: () => generateEnemyStatHTML('alpha'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/alpha.jpeg",
            text: "KRONOS ELEMZÉS: A fertőzés abszolút magja. A Verdant spóra kritikus tömeg elérésekor létrehozott, központi idegrendszerként funkcionáló biológiai csomópont. Extrém regenerációs képesség. A célpont kiiktatása a teljes kaptárhálózat összeomlását eredményezi.\n\nGALLAGHER MEGJEGYZÉSE: \"Ez nem egy sima mutáns, ECHO. Ez maga a hálózat. Több ezer bányász, kutató és klón összefonódott idegrendszere, ami a létesítmény geotermikus magjára tapadt rá, hogy elszívja az energiáját. Ha a közelébe érsz, a puszta mérete és a levegőben lévő spórakoncentráció megzavarja a sisakod szenzorait. Ne próbálj taktikázni. Csak ürítsd bele minden fegyvered tárát, amíg mozog!\""
        }
    ],

    environment: [
        {
            id: "puddle_green",
            title: "BIOMASSZA: ZÖLD FÁZIS (FRISS)",
            requirementText: "FELOLDÁS: Élje túl az 1. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 1) || playerStats.wavesSurvived >= 1,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/Z%C3%B6ld%20pocsolya.jpeg",
            text: "KRONOS ELEMZÉS: Friss Verdant sejtburjánzás. Mérgező gázt bocsát ki, amely 20% sebzéscsökkentő pajzsot biztosít a mutánsoknak.\n\nGALLAGHER: \"Ne állj bele, ECHO. Átmarja a kevlár csizmádat. Ezek a rohadékok meg keményebbek tőle. Ha teheted, vedd meg a Terminálon a Sterilizáló Protokollt, és égessük le a padlóról!\""
        },
        {
            id: "puddle_yellow",
            title: "BIOMASSZA: SÁRGA FÁZIS (ROTHADÓ)",
            requirementText: "FELOLDÁS: Élje túl a 4. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 4) || playerStats.wavesSurvived >= 4,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/s%C3%A1rga%20pocsolya.jpeg",
            text: "KRONOS ELEMZÉS: Magas fokú rothadás. A mutánsok 50%-os pajzsot kapnak. A gáz toxicitása drasztikusan nő.\n\nGALLAGHER: \"A szag leírhatatlan... és ami rosszabb, ez a dögletes bűz vonzza oda a Golden Crawlereket. Vigyázz, mert ezen állva a zombik fele annyi sebzést kapnak! Takarítsd fel, amíg vörös nem lesz!\""
        },
        {
            id: "puddle_red",
            title: "BIOMASSZA: VÖRÖS FÁZIS (KRITIKUS)",
            requirementText: "FELOLDÁS: Élje túl a 6. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 6) || playerStats.wavesSurvived >= 6,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/v%C3%B6r%C3%B6s%20pocsolya.jpeg",
            text: "KRONOS ELEMZÉS: A sejtburjánzás elérte a kritikus tömeget. 80%-os védelem. Mutáció (Flesh Trap) kialakulása várható.\n\nGALLAGHER: \"Kritikus! ECHO, a vörös gócok pulzálnak. Látom a kamerákon. Ha több vörös tócsa összeolvad, kikel belőlük egy csapda! Ezt már ne engedd!\""
        },
        {
            id: "plant",
            title: "ANOMÁLIA: FLESH TRAP (HÚS-CSAPDA)",
            requirementText: "FELOLDÁS: Éljen túl egy Mutációt vagy pusztítson el egyet.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 7) || playerStats.plantsDestroyed >= 1,
            statInfo: () => `<div style="text-align:center;">MEGSEMMISÍTETT PÉLDÁNYOK: ${playerStats.plantsDestroyed} db</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/mutalodott%20noveny.jpeg",
            text: "KRONOS ELEMZÉS: Vörös biomasszák összefonódásából létrejött, pulzáló reprodukciós góc. Neuro-toxikus felhőt robbant a levegőbe.\n\nGALLAGHER: \"A dolog kikel! Ha a közeledbe ér, kipukkan, és a benne lévő toxin azonnal hallucinációkat okoz. Kiszárítja a szemed és eltorzítja a látásod. Lődd szét távolról, ne hagyd felrobbanni!\""
        }
    ],
    equipment: [
        {
            id: "weapon_pistol",
            title: "SCAVENGER PISZTOLY",
            requirementText: "FELOLDÁS: Alapértelmezett felszerelés.",
            checkUnlock: () => true,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.pistol.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/pisztoly.png",
            text: "KRONOS ELEMZÉS: Standard kézifegyver. A Vállalati Ipari Nyomtató a harci adatokért cserébe (CR) fejleszti a klónegység számára.\n\nGALLAGHER: \"Sajnálom, ECHO, egyelőre csak ezt találtam neked a biztonsági szekrényekben. Karcos, vérfoltos... az egyik előző klón vonszolta magával. Lődd fejbe őket, ahhoz elég lesz. Ahogy küldöd az adatokat a gépnek, rákényszerítem a KRONOS-t, hogy adjon fel neked komolyabb cuccokat.\""
        },
        {
            id: "weapon_shotgun",
            title: "OMNICORP SÖRÉTES PUSKA",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.shotgun,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.shotgun.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/sz%C3%B6r%C3%A9tes.png",
            text: "KRONOS ELEMZÉS: Közeli tömegoszlató kinetikus fegyver.\n\nGALLAGHER: \"Sikerült áthoznom egyet a liftbe. Ez lerobbantja róluk a biomasszát. Fejleszd a Terminálon, és a KRONOS nagyobb tárakat nyomtat hozzá.\""
        },
        {
            id: "weapon_rifle",
            title: "OMNICORP GÉPKARABÉLY",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.rifle,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.rifle.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/g%C3%A9gkarab%C3%A9ly.png",
            text: "KRONOS ELEMZÉS: Nagy tűzgyorsaságú rohamkarabély, folyamatos terület-elnyomásra.\n\nGALLAGHER: \"A pajzsos rohadékok (Sárga tócsa) ellen ez kell. Nyomd hosszan a ravaszt, ECHO. Ez a fegyver már háromszor járta meg a Mélyszintet, vigyázz rá.\""
        },
        {
            id: "weapon_super",
            title: "NEHÉZ REVOLVER (GALLAGHER FEGYVERE)",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.super,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.super.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/revolver.png",
            text: "KRONOS ELEMZÉS: Védett tisztikari fegyver, extrém kaliberű páncéltörő lőszerrel.\n\nGALLAGHER: \"Ez az én pisztolyom, ECHO... Beküldtem neked a csőpostán. Nekem már úgysem lesz rá szükségem. Túl vastag a spóra a levegőben. Ezzel átlövöd a Juggernautokat és a Mag körüli pajzsokat is. Kérlek... fejezd be a munkát.\""
        },
        {
            id: "skill_kevlar",
            title: "AUGMENTÁCIÓ: TISSUE DENSIFIER (SZÖVET-TÖMÖRÍTŐ)", 
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.maxHealth.level : 0} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/skill_kevlar.jpeg",
            text: "Vizuális Megjelenés: Egy félelmetes, pneumatikus csontba fúró pisztoly, nyomásálló üvegtartályában ipari cementre emlékeztető 'kalcifikáló géllel'. A gélben apró, megkövesedett gombaspórák lebegnek.\n\nGALLAGHER: \"Tudom, hogy fájdalmas, ECHO. A gél erőszakosan sűríti a csontjaidat. De meg kell csinálnod! Különben darabokra tépnek lent. Csak... ha meghalsz vele, te is Juggernauttá változol. Igyekezz életben maradni.\"" 
        },
        {
            id: "skill_legs",
            title: "AUGMENTÁCIÓ: SPINAL ACCELERATOR (GERINC-GYORSÍTÓ)",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.speed.level : 0} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/skill_legs.jpeg",
            text: "Vizuális Megjelenés: Masszív fém implantátum, ipari fém kampókkal, amelyek egyenesen a csigolyákba fúródnak. A KRONOS a Verdant parazita kapcsolódási módszerét integrálta a hardverbe.\n\nGALLAGHER: \"A gép rögzíti a hátadhoz. A csövekben szintetikus adrenalin van. Szörnyű látvány, de ettől gyorsabb leszel, mint a Leaperek. Emlékezz: ők is pont ettől a modultól lettek olyanok...\""
        },
        {
            id: "skill_pockets",
            title: "FELSZERELÉS: MAG-RACK (TAKTIKAI LŐSZER-RÖGZÍTŐ)",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.ammoLoot.level : 0} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/skill_pockets.jpeg",
            text: "Vizuális Megjelenés: Moduláris mágneses sínrendszer. A tárak behorpadtak, karcosak, sötét vérfoltok borítják őket. A tárak oldalába ütött UNIT-042 sorszám durván át van húzva.\n\nGALLAGHER: \"A KRONOS nem gyárt új lőszertárolókat. A takarító drónjaimmal lerángattam ezeket a halott testvéreidről, és beküldtem neked. Koszos, véres, de elbírsz vele +20% lőszert!\""
        },
        {
            id: "skill_nanobot",
            title: "AUGMENTÁCIÓ: GS PORT (GEN-STAB DOKKOLÓ)",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.healthLoot.level : 0} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/skill_nanobot.jpeg",
            text: "Vizuális Megjelenés: Vaskos fém aljzat az alkaron, amelyet ipari szegecsek rögzítenek. A pereme alól sötétzöld, beteges gomba-erek burjánzanak szét a bőr alatt.\n\nGALLAGHER: \"Ezen keresztül nyomod magadba a Gen-Stabot. A gép ezt 'szimbiózisnak' hívja, de valójában egy ajtót nyitsz a Kaptárnak a testedbe. Megnöveli a gyógyítást, de... lassan felemészt. Használd okosan.\""
        },
        {
            id: "skill_revive",
            title: "MODUL: AED-NODE (AUTOMATA DEFIBRILLÁTOR)",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">RAKTÁRON LÉVŐ MODUL: ${typeof skills !== 'undefined' ? skills.revive.level : 0} DB</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/skill_revive.jpeg",
            text: "Vizuális Megjelenés: Vastag, orvosi acéltüskékkel ellátott modul. A horgokon beszáradt vér és elszenesedett szövetdarabok láthatók.\n\nGALLAGHER: \"A mellkasodba fúródik. Ha meghalsz, az ipari kondenzátor olyat vág a szívedbe, hogy a Kaptárt is leszakítja rólad 2 másodpercre. Egy halott klónból operáltam ki neked. Fájni fog, ECHO.\""
        },
        {
            id: "skill_cryo",
            title: "HACK: CRYO-OVERRIDE",
            requirementText: "FELOLDÁS: Vásárolja meg a hozzáférést a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">LICENC SZINT:<br>${typeof skills !== 'undefined' ? skills.freeze.level : 0} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/9807e89295cfc8f0ba0b95ab93aaa0180b8b8d41/cryo.jpeg", 
            text: "KRONOS ELEMZÉS: Központi klímaszabályozó rendszer. Illetéktelen beavatkozás észlelt.\n\nGALLAGHER: \"Feltörtem a hűtőkört, ECHO! Ha megveszed a hozzáférést, a PDA-dról túl tudod terhelni a szelepeket, kényszerítve az állomást, hogy folyékony nitrogént okádjon a mutánsokra. Az AI próbálja majd elzárni (Cooldown), de minél több kreditet ölsz a licencre, annál tovább tudom fagyasztva tartani a rohadékokat!\""
        }
    ]
};

// ==========================================
// VÁLLALATI DIREKTÍVÁK (KRONOS VS GALLAGHER)
// ==========================================

const OmniCorpDirectives = {
    tier1: [
        { id: "t1_b_normal", title: "KRONOS: Bányász Minta", desc: "<span style='color:#00ffff;'>KRONOS:</span> Bányász egységek testlövései szükségesek az elemzéshez.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Lecsökkentettem a kvótát 10-re. Lődd le őket, hogy kinyíljon a zsilip, ECHO!", type: "kill_body", target: "normal", goal: 10, reward: 300 },
        { id: "t1_h_normal", title: "KRONOS: Idegrendszer Teszt", desc: "<span style='color:#00ffff;'>KRONOS:</span> Idegrendszer leválasztási teszt (Fejlövés) szükséges.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Csak 5 fejlövés, ECHO. Koncentrálj, és a gép utalja a kreditet!", type: "kill_head", target: "normal", goal: 5, reward: 400 },
        { id: "t1_b_runner", title: "KRONOS: Leaper Anatómia", desc: "<span style='color:#00ffff;'>KRONOS:</span> Hiper-metabolikus mutánsok kiiktatása.<br><span style='color:#ffaa00;'>GALLAGHER:</span> A régi tesóid... Tudom, hogy fáj, de lődd testbe 5 Leapert. Muszáj adatot adnunk a gépnek.", type: "kill_body", target: "runner", goal: 5, reward: 500 },
        { id: "t1_h_runner", title: "KRONOS: Reflex Teszt", desc: "<span style='color:#00ffff;'>KRONOS:</span> Gyorsmozgású célpontok koponya-kalibrációja.<br><span style='color:#ffaa00;'>GALLAGHER:</span> 3 Leapert kell fejbe lőnöd. Vadászd le őket, mielőtt ők kapnak el téged!", type: "kill_head", target: "runner", goal: 3, reward: 600 },
        
        { id: "t1_dmg_normal", title: "KRONOS: Kevlár Hatékonyság", desc: "<span style='color:#00ffff;'>KRONOS:</span> Fizikai trauma tűréshatár-teszt szükséges.<br><span style='color:#ffaa00;'>GALLAGHER:</span> A rohadék gép ütéseket akar rögzíteni. Levittem 5 ütésre egy sima Host-tól. Légy óvatos!", type: "take_damage", target: "normal", goal: 5, reward: 400 },
        { id: "t1_dmg_runner", title: "KRONOS: Kinetikus Becsapódás", desc: "<span style='color:#00ffff;'>KRONOS:</span> Gyorsulási trauma elemzése (Leaper).<br><span style='color:#ffaa00;'>GALLAGHER:</span> Engedd, hogy a Leaper 4 alkalommal megüssön! Utána öld meg, mielőtt befejezi a munkát.", type: "take_damage", target: "runner", goal: 4, reward: 500 },
        { id: "t1_stand_green", title: "KRONOS: Zöld Toxicitás", desc: "<span style='color:#00ffff;'>KRONOS:</span> Zöld fázisú biomassza sav-tesztje.<br><span style='color:#ffaa00;'>GALLAGHER:</span> A KRONOS azt akarja, hogy beleállj a zöld mocsokba. 10 másodperc összesen, de ha leesik a pajzsod, lépj ki!", type: "puddle_stand", target: "green", goal: 10, reward: 500 },
        
        { id: "t1_pkill_g_normal", title: "KRONOS: Zöld Pajzs-teszt", desc: "<span style='color:#00ffff;'>KRONOS:</span> Mutánsok kiiktatása védekező zöld zónában.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Meg kell ölnöd 3 Host-ot, miközben ők a zöld tócsán állnak és pajzsuk van. Ne pazarold a töltényt mellé!", type: "puddle_kill", target: "green", goal: 3, reward: 600 }
    ],

    tier2: [
        { id: "t2_b_tank", title: "KRONOS: Osztogenesis Teszt", desc: "<span style='color:#00ffff;'>KRONOS:</span> Juggernaut egységek páncélzat-elemzése.<br><span style='color:#ffaa00;'>GALLAGHER:</span> A Középső Szektorban vagy. A gép Juggernaut hullákat akar. 3 testlövéses kill. Használj sörétest!", type: "kill_body", target: "tank", goal: 3, reward: 800 },
        { id: "t2_h_tank", title: "KRONOS: Juggernaut Fejlövés", desc: "<span style='color:#00ffff;'>KRONOS:</span> Páncélozott koponyák átütés-vizsgálata.<br><span style='color:#ffaa00;'>GALLAGHER:</span> 2 Juggernautot lőj fejbe. Jó célzást kívánok a mozgó hústornyokhoz...", type: "kill_head", target: "tank", goal: 2, reward: 1000 },
        { id: "t2_b_stalker", title: "KRONOS: Kromatofóra Teszt", desc: "<span style='color:#00ffff;'>KRONOS:</span> Phantom egységek (Láthatatlan) nyomon követése.<br><span style='color:#ffaa00;'>GALLAGHER:</span> A KRONOS szellem-adatokat akar. Ölj meg 3 Phantomot. Hallgasd a hangjukat, mert látni nem fogod őket!", type: "kill_body", target: "stalker", goal: 3, reward: 800 },
        
        { id: "t2_dmg_tank", title: "KRONOS: Nehéz Trauma", desc: "<span style='color:#00ffff;'>KRONOS:</span> Extrém kinetikus trauma rögzítése.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Ne csináld... a gép 2 Juggernaut ütést kér. Ha nincs max életeden és pajzsodon, megszakadsz, ECHO!", type: "take_damage", target: "tank", goal: 2, reward: 800 },
        
        { id: "t2_stand_yellow", title: "KRONOS: Sárga Toxicitás", desc: "<span style='color:#00ffff;'>KRONOS:</span> Sárga, rothadó fázisú biomassza sav-tesztje.<br><span style='color:#ffaa00;'>GALLAGHER:</span> A rothadó sárga tócsa dupla sebzést ad! 5 másodpercet kér a gép. Állj bele, majd ugorj ki, mielőtt meghalsz!", type: "puddle_stand", target: "yellow", goal: 5, reward: 1000 },
        
        { id: "t2_trig_plant", title: "KRONOS: Neuro-Toxin Elemzés", desc: "<span style='color:#00ffff;'>KRONOS:</span> Hús-Csapda kipukkasztása és toxin rögzítés.<br><span style='color:#ffaa00;'>GALLAGHER:</span> ECHO, a gép beáldozna! Bele kell sétálnod a Hús-Virágba. Éld túl a hallucinációt, és tied a 2000 CR!", type: "trigger_plant", target: "plant", goal: 1, reward: 2000 },
        { id: "t2_dest_plant", title: "KRONOS: Távoli Sterilizáció", desc: "<span style='color:#00ffff;'>KRONOS:</span> Vörös gócok (Hús-Csapdák) fegyveres megsemmisítése.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Lőj szét távolról 3 kikelt Hús-Virágot. Ne hagyd, hogy megnőjenek a vörös tócsák!", type: "destroy_plant", target: "plant", goal: 3, reward: 1000 },
        
        { id: "t2_crawler", title: "KRONOS: Prémium Tiszta DNS", desc: "<span style='color:#00ffff;'>KRONOS:</span> Golden Anomaly biológiai rögzítése.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Van egy Golden Crawler a pályán! Lődd le, a KRONOS imádja a tiszta DNS-t, brutális bónuszt ad érte!", type: "kill_body", "target": "crawler", goal: 1, reward: 2000 }
    ],

    tier3: [
        { id: "t3_b_boss", title: "KRONOS: Nexus-Node Elemzés", desc: "<span style='color:#00ffff;'>KRONOS:</span> Védelmi góliát (Nexus-Node) kiiktatása.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Mélyszinti kapu. Iktass ki 2 Nexus-Node-ot. Használd a Fagyasztást, vagy téged zúznak szét!", type: "kill_body", target: "boss", goal: 2, reward: 2000 },
        { id: "t3_dmg_boss", title: "KRONOS: Glitch-Trauma", desc: "<span style='color:#00ffff;'>KRONOS:</span> Neuro-sokk (Ordítás) elszenvedése a Nexus-Node-tól.<br><span style='color:#ffaa00;'>GALLAGHER:</span> A gép azt akarja, hogy telibe kapd az ordítását. Készülj fel, vakon fogsz harcolni a lökés után!", type: "take_damage", target: "boss", goal: 1, reward: 2500 },
        { id: "t3_stand_red", title: "KRONOS: Vörös Toxicitás", desc: "<span style='color:#00ffff;'>KRONOS:</span> Kritikus fázisú vörös biomassza sav-tesztje.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Ne... 3 másodperc a vörös hólyagokon. Ez leégeti a húst a csontodról. Csak ha nagyon kell a Kredit!", type: "puddle_stand", target: "ready", goal: 3, reward: 2000 },
        
        { id: "t3_pkill_r_boss", title: "KRONOS: Góliát Pajzs-teszt", desc: "<span style='color:#00ffff;'>KRONOS:</span> Nexus-Node kiiktatása Vörös zónában.<br><span style='color:#ffaa00;'>GALLAGHER:</span> Őrület. Egy 80%-os pajzzsal rendelkező Bosst kell megölnöd a vörös tócsán. Nehéz Revolver nélkül esélyed sincs.", type: "puddle_kill", target: "ready", goal: 1, reward: 3000 },
        
        { id: "t3_alpha", title: "OMEGA-DIREKTÍVA: REBIRTH", desc: "<span style='color:#00ffff;'>KRONOS:</span> OMEGA-PIROS FELÜLBÍRÁLAT. CÉLPONT: A MAG.<br><span style='color:#ffaa00;'>GALLAGHER:</span> ...ECHO... Juss el a 100. Szintig. Én lenn leszek a laborban. Végezd be...", type: "kill_body", target: "alpha", goal: 1, reward: 50000 }
    ]
};
