// ==========================================
// OMNICORP ADATBÁZIS ÉS JÁTÉKOS STATISZTIKÁK
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
    // --- ÚJ: DIREKTÍVA RENDSZER VÁLTOZÓK ---
    activeDirective: null, // Az az 1 db ID, amit a játékos épp csinál
    directiveProgress: 0,  // Hol tart benne (pl. 3 / 10)
    completedDirectives: [], // Eltároljuk az azonosítókat, amiket már megcsinált!
    abandonedDirectives: []  // Amiket eldobott, ide kerülnek (többé nem választható)
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
    } catch(e) { console.warn("Sérült mentés törlése..."); localStorage.removeItem('OmniCorpStats'); }
}

window.savePlayerStats = function() {
    localStorage.setItem('OmniCorpStats', JSON.stringify(playerStats));
}

// --- ÚJ: KUTATÁSI SZINT (RESEARCH LEVEL) KALKULÁTOR ---
// 10 kill = Level 1 (+10% sebzés), 50 kill = Level 5 (+50% sebzés MAX)
window.getResearchLevel = function(totalKills) {
    let level = Math.floor(totalKills / 10);
    return Math.min(5, level); // Max 5. szint
}

window.getDamageBoost = function(enemyType) {
    if (!playerStats.kills[enemyType]) return 1.0;
    let totalKills = playerStats.kills[enemyType].body + playerStats.kills[enemyType].head;
    let level = getResearchLevel(totalKills);
    return 1.0 + (level * 0.1); // Pl. Level 3 = 1.3x (30% Boost)
}


// --- ÚJ, KOMPAKT STATISZTIKA ---
function generateEnemyStatHTML(enemyType) {
    let body = playerStats.kills[enemyType].body;
    let head = playerStats.kills[enemyType].head;
    let total = body + head;
    let rLevel = getResearchLevel(total);
    let boost = rLevel * 10;
    
    // A 'height: 100%' és 'align-items: center' gondoskodik a függőleges középre zárásról!
    return `<div style="display: flex; justify-content: space-between; align-items: center; height: 100%; font-size: 14px; line-height: 1.2;">
                
                <!-- Bal Oszlop: Fejlődés -->
                <div style="flex: 1; text-align: left; padding-right: 10px; border-right: 1px solid #005555;">
                    <div style="color:#00ffff; margin-bottom: 5px;">KUTATÁSI SZINT:<br><span style="color:#fff; font-weight:bold; font-size:16px;">${rLevel}/5</span></div>
                    <div style="color:#ffaa00;">SEBZÉS BÓNUSZ:<br><span style="color:#fff; font-weight:bold; font-size:16px;">+${boost}%</span></div>
                </div>

                <!-- Jobb Oszlop: Halálos Lövések -->
                <div style="flex: 1; text-align: right; padding-left: 10px;">
                    <div style="color:#888; margin-bottom: 5px;">TESTLÖVÉS: <span style="color:#fff;">${body}</span></div>
                    <div style="color:#ff0000; margin-bottom: 5px;">FEJLÖVÉS: <span style="color:#fff; font-weight:bold;">${head}</span></div>
                    <div style="color:#00ff00; border-top: 1px dashed #005555; padding-top: 5px;">ÖSSZESEN: <span style="color:#fff; font-weight:bold;">${total}</span></div>
                </div>

            </div>`;
}

const OmniCorpDatabase = {
    lore: {
        id: "project_rebirth",
        title: "PROJECT REBIRTH",
        unlocked: true, 
         statInfo: () => `<div style="text-align:center;">RENDSZERIDŐ: AKTÍV<br>GYŰJTÖTT ADAT: <span style="color:#ffcc00;">${typeof score !== 'undefined' ? score : 0} CR</span><br>AKTUÁLIS HULLÁM: <span style="color:#00ffff;">${typeof currentWave !== 'undefined' ? currentWave : 0}. CIKLUS</span></div>`,
        image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/5fcee7cf3f3f0e88f7fee28af836805a55f9490a/OmniCorp.jpeg", 
        text: "BIZTONSÁGI SZINT: OMEGA-PIROS\n\nA 'PROJECT REBIRTH' eredeti célja egy extrém körülmények között is túlélő, önfenntartó növényi ökoszisztéma létrehozása volt. Az áttörést egy mélytengeri fúrás során talált, inaktív idegen genetikai minta fúziója hozta el.\n\nA sejtburjánzás azonban kontrollálhatatlanná vált. A spórák gazdatestként kezdték használni a bázis személyzetét, átírva azok központi idegrendszerét.\n\nÖn egy 'Takarító' (Cleaner). Feladata a szektor sterilizálása és a mutációk harci telemetriájának (Adat) kinyerése. A cég számára az Ön túlélése másodlagos, az Adat kinyerése elsődleges prioritás."
    },
    enemies: [
        {
            id: "normal",
            title: "SUBJECT: INFECTED",
            requirementText: "FELOLDÁS: Iktasson ki 1 Infected mutánst.",
            checkUnlock: () => (playerStats.kills.normal.body + playerStats.kills.normal.head) >= 1,
            statInfo: () => generateEnemyStatHTML('normal'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/dd18736e2a98348222a8ad07c6e46b91c490f56c/MUT%C3%81NS%20KUTAT%C3%93.jpeg", 
            text: "Ezek az egyedek a bázis volt kutatói. Az idegen spóra elsődlegesen az agytörzset támadta meg, lekapcsolva a fájdalomérzetet és a magasabb rendű funkciókat. Mozgásuk darabos, mivel a gombafonalak szó szerint bábként rángatják a nekrotikus izomzatot.\n\nEgyénenként könnyen iktathatók, de a Kaptártudat miatt rajokban támadnak. Halálukkor a sejtfalak felrepednek, és a bennük lévő toxikus biomassza a padlóra ömlik."
        },
        {
            id: "runner",
            title: "SUBJECT: RUNNER",
            requirementText: "FELOLDÁS: Iktasson ki 1 Runner mutánst.",
            checkUnlock: () => (playerStats.kills.runner.body + playerStats.kills.runner.head) >= 1,
            statInfo: () => generateEnemyStatHTML('runner'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/c683b09b77b21e5f471c59622e65ddaeddd39541/runner.jpeg",
            text: "A bázis volt fegyveres őrei. A mutáció váratlan kémiai reakcióba lépett a vérükben lévő katonai harci-stimulánsokkal. Ez folyamatos, extrém adrenalin-túltermelést és hiper-metabolizmust eredményezett.\n\nA felgyorsult anyagcsere szó szerint felemésztette a zsírszövetüket és az izomzatuk nagy részét, ezért megjelenésük vékony és aszott. Cserébe a megmaradt inak hihetetlen, már-már rovarszerű gyorsaságot és ugróerőt biztosítanak számukra. Célzásuk fokozott figyelmet igényel."
        },
        {
            id: "tank",
            title: "SUBJECT: TANK",
            requirementText: "FELOLDÁS: Iktasson ki 1 Tank mutánst.",
            checkUnlock: () => (playerStats.kills.tank.body + playerStats.kills.tank.head) >= 1,
            statInfo: () => generateEnemyStatHTML('tank'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/c683b09b77b21e5f471c59622e65ddaeddd39541/tank.jpeg",
            text: "A korábban beküldött, de elbukott OmniCorp Zsoldosok. A spórák nemcsak a húsukat fertőzték meg, hanem agresszívan fuzionáltak a szintetikus kevlárpáncélzattal és a fegyverzet fémrészeivel. Az extra súly elviselésére a lény csontképződése (osteogenesis) kontrollálhatatlanná vált.\n\nEgy lassú, de szinte áthatolhatatlan bio-mechanikus daganat. A hagyományos kézifegyverek alig sebzik, koncentrált tűzerő és robbanóanyagok használata javasolt."
        },
        {
            id: "hider",
            title: "SUBJECT: STALKER",
            requirementText: "FELOLDÁS: Iktasson ki 1 Stalker mutánst.",
            checkUnlock: () => (playerStats.kills.stalker.body + playerStats.kills.stalker.head) >= 1,
            statInfo: () => generateEnemyStatHTML('stalker'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/c683b09b77b21e5f471c59622e65ddaeddd39541/hider.jpeg",
            text: "Egy evolúciós zsákutca, amely a vadászatra specializálódott. A mutáns bőrszövete egy kaméleonhoz hasonló, de annál sokkal fejlettebb kromatofóra-enzimet választ ki, amely képes megtörni a fényt a teste körül.\n\nGyakorlatilag láthatatlan a sötét környezetben. A Takarító kizárólag a mozgás-érzékelő radarra, valamint a lény által keltett halk, nedves hangokra hagyatkozhat. Páncélzata nincs, fizikai felépítése gyenge."
        },
        {
            id: "crawler",
            title: "ANOMALY: GOLDEN CRAWLER",
            requirementText: "FELOLDÁS: Iktasson ki 1 Golden Crawlert.",
            checkUnlock: () => (playerStats.kills.crawler.body + playerStats.kills.crawler.head) >= 1,
            statInfo: () => generateEnemyStatHTML('crawler'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/c683b09b77b21e5f471c59622e65ddaeddd39541/crawler.jpeg",
            text: "Extrém ritka, genetikailag tiszta entitás. Nem rendelkezik ragadozó ösztönökkel; funkciója a Kaptár táplálása. Egy mozgó tápanyagtasak, amelyet az erősen rothadó (sárga) biomassza szaga vonz elő.\n\nTeljesen ártalmatlan, de menekülési reflexe kiváló, kiszámíthatatlanul pattan vissza a falakról. Kiemelten magas koncentrációban tartalmaz sértetlen idegen DNS-t, ezért kilövése esetén az OmniCorp prémium Kredittel jutalmazza a Takarítót."
        },
        {
            id: "boss",
            title: "GUARDIAN (BETA SUBJECT)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Guardiant (5. Hullám).",
            checkUnlock: () => (playerStats.kills.boss.body + playerStats.kills.boss.head) >= 1,
            statInfo: () => generateEnemyStatHTML('boss'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/c683b09b77b21e5f471c59622e65ddaeddd39541/mini%20boss.jpeg",
            text: "A Kaptár védekező mechanizmusa. Ha a fertőzést veszély fenyegeti, a kisebb mutánsok egybeolvadnak egyetlen, masszív góliáttá. Rendelkezik egyfajta primitív intelligenciával és hangképző szervekkel, amelyekkel dermesztő, őrjöngő üvöltést hallat.\n\nExtrém magas életerő és pusztító fizikai erő. Támadásai megzavarják a Takarító vizuális interfészét (Glitch effekt). Távolságtartás kötelező."
        },
        {
            id: "alpha",
            title: "ALPHA SUBJECT (PURE STRAIN)",
            requirementText: "FELOLDÁS: Érje el a 100. Hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 100) || playerStats.wavesSurvived >= 99, 
            statInfo: () => generateEnemyStatHTML('alpha'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/alpha.jpeg",
            text: "A 'Verdant-projekt' Nulladik Betege. Az eredeti, tiszta idegen minta, ami kiszabadult a karanténból. Ő a Kaptártudat központja, a zöld köd és az anomáliák forrása. Egy hatalmas, ősi biológiai gépezet, amely már elvesztette minden emberi vonását.\n\nKatasztrofális veszélyfaktor. Képes kisebb mutánsokat generálni és irányítani a harctéren. Elpusztítása jelenti a szektor teljes sterilizálását és a Takarító sikeres kimentését."
        }
    ],
    environment: [
        {
            id: "puddle_green",
            title: "BIOMASS: GREEN PHASE",
            requirementText: "FELOLDÁS: Élje túl az 1. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 1) || playerStats.wavesSurvived >= 1,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/Z%C3%B6ld%20pocsolya.jpeg",
            text: "1-3. CIKLUS\n\nToxikus gázt bocsát ki, amely sűríti a ködöt, rontva a látási viszonyokat. A rajta álló mutánsoknak 20% sebzéscsökkentő pajzsot biztosít."
        },
        {
            id: "puddle_yellow",
            title: "BIOMASS: DECAY PHASE",
            requirementText: "FELOLDÁS: Élje túl a 4. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 4) || playerStats.wavesSurvived >= 4,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/s%C3%A1rga%20pocsolya.jpeg",
            text: "4-5. CIKLUS\n\nErős rothadás. A rajta álló mutánsok 50%-os pajzsot kapnak. A gáz toxicitása megnő (dupla sebzés a Takarítóra). A rothadó szag vonzza a 'Golden Crawler' anomáliákat."
        },
        {
            id: "puddle_red",
            title: "BIOMASS: RED PHASE",
            requirementText: "FELOLDÁS: Élje túl a 6. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 6) || playerStats.wavesSurvived >= 6,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/v%C3%B6r%C3%B6s%20pocsolya.jpeg",
            text: "6. CIKLUSTÓL\n\nKritikus tömeg. A pocsolyák 80%-os pajzsot adnak az ellenfeleknek. Ha kellő mennyiségű vörös biomassza fedi egymást, megindul a Hús-Virággá alakulás (Mutáció)."
        },
        {
            id: "plant",
            title: "ANOMALY: FLESH TRAP",
            requirementText: "FELOLDÁS: Éljen túl egy Mutációt (7. Hullám) vagy pusztítson el egyet.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 7) || playerStats.plantsDestroyed >= 1,
            statInfo: () => `<div style="text-align:center;">MEGSEMMISÍTETT PÉLDÁNYOK: ${playerStats.plantsDestroyed} db</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/mutalodott%20noveny.jpeg",
            text: "A Vörös Fázisú biomasszák összefonódásából létrejött, pulzáló reprodukciós góc.\n\nKözelség esetén a góc kipukkan, és egy neuro-toxikus felhőt robbant a levegőbe. A toxin azonnali szövetkárosodást (20 HP), majd 5 másodpercig tartó heves hallucinációkat és szédülést okoz, mialatt a sejtleépülés folyamatos. Távolról történő fegyveres megsemmisítése, vagy a pocsolyák előzetes sterilizálása (Terminál) erősen javasolt."
        }
    ],
    equipment: [
        {
            id: "weapon_pistol",
            title: "OMNICORP: PISTOL",
            requirementText: "FELOLDÁS: Alapértelmezett felszerelés.",
            checkUnlock: () => true,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.pistol.level : 1} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=PISZTOLY_KEP",
            text: "Az OmniCorp szabványos, könnyű kézifegyvere.\n\nA karanténzónában a logisztika lehetetlen, ezért a Takarítók fegyverzetét az offline Terminálokba épített Ipari 3D Nyomtatók biztosítják. A begyűjtött harci adatokért (Kredit) cserébe a nyomtató képes fegyver-alkatrészeket és lőszert szintetizálni."
        },
        {
            id: "weapon_shotgun",
            title: "OMNICORP: COMBAT SHOTGUN",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.shotgun,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.shotgun.level : 1} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=SORETES_KEP",
            text: "Közeli célpontok és tömegek ellen fejlesztett, masszív kinetikus erővel rendelkező fegyver.\n\nFEJLESZTÉSI FÁZISOK:\n- Szint 2: Tárkapacitás (Reserve) növelése 150%-ra.\n- Szint 3: Újratöltési idő (Reload) csökkentése 25%-kal.\n- Szint 4: Tárfogadók (Max Ammo) bővítése 150%-ra.\n- Szint 5: Páncéltörő lőszerek szintetizálása (Dupla Sebzés)."
        },
        {
            id: "weapon_rifle",
            title: "OMNICORP: ASSAULT RIFLE",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.rifle,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.rifle.level : 1} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=GEPFEGYVER_KEP",
            text: "Nagy tűzgyorsaságú rohamkarabély, amely alkalmas a folyamatos terület-elnyomásra (Area Denial).\n\nFEJLESZTÉSI FÁZISOK:\n- Szint 2: Tárkapacitás (Reserve) növelése 150%-ra.\n- Szint 3: Újratöltési idő (Reload) csökkentése 25%-kal.\n- Szint 4: Tárfogadók (Max Ammo) bővítése 150%-ra.\n- Szint 5: Páncéltörő lőszerek szintetizálása (Dupla Sebzés)."
        },
        {
            id: "weapon_super",
            title: "OMNICORP: HEAVY REVOLVER",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.super,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.super.level : 1} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=REVOLVER_KEP",
            text: "A végső megállító erő. Egy masszív kaliberű revolver, amely kifejezetten a vastag páncélzattal és magas életerővel rendelkező mutánsok (pl. Tankok és Kaptárőrök) ellen készült.\n\nEgyedi, ipari 3D nyomtatott páncéltörő lőszerével képes átszakítani a legerősebb bio-mechanikus rétegeket is."
        },
        {
            id: "skill_kevlar",
            title: "AUGMENTATION: KEVLAR IMPLANT",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.maxHealth.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=KEVLAR_KEP",
            text: "A Takarítók teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nKEVLÁR IMPLANTÁTUM: +20% Maximális Életerő szintenként."
        },
        {
            id: "skill_legs",
            title: "AUGMENTATION: CYBER LEGS",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.speed.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=LAB_KEP",
            text: "A Takarítók teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nCYBER LEGS: +20% Mozgási sebesség."
        },
        {
            id: "skill_pockets",
            title: "AUGMENTATION: AMMO POUCH",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.ammoLoot.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=ZSEB_KEP",
            text: "A Takarítók teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nAMMO POUCH: Szintenként 20%-kal véglegesen megnöveli a fegyverek maximális tartalék (Reserve) lőszerkapacitását. Érvényes az összes meglévő és jövőben nyomtatott fegyverzetre."
        },
        {
            id: "skill_nanobot",
            title: "AUGMENTATION: NANOBOT HEALER",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.healthLoot.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=NANOBOT_KEP",
            text: "A Takarítók teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nNANOBOT HEALER: +20% Életerő-visszatöltés a talált Medkitek használatakor."
        },
        {
            id: "skill_revive",
            title: "AUGMENTATION: REVIVE SERUM",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">RAKTÁRON LÉVŐ SZÉRUM: ${typeof skills !== 'undefined' ? skills.revive.level : 0} DB</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=SZERUM_KEP",
            text: "A Takarítók teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nREVIVE SERUM: Halálos sérülés esetén egy szívbe épített autoinjektor azonnal maxra tölti az életerőt, és 2 másodperc sérthetetlenséget ad."
        },
        {
            id: "skill_cryo",
            title: "AUGMENTATION: CRYO GRENADE",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.freeze.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=KRIO_KEP",
            text: "A Takarítók teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nCRYO GRENADE: A bal karba épített folyékony-nitrogén vető. Megfagyasztja a mutánsokat, megállítva a mozgásukat és a mutációjukat."
        }
    ]
};

// ==========================================
// VÁLLALATI DIREKTÍVÁK (SZERZŐDÉSEK) - 37 DB
// ==========================================

const OmniCorpDirectives = {
    
    // TIER 1 (12 db) - Sima, Gyors zombik, Zöld tócsák
    tier1: [
        { id: "t1_b_normal", title: "Kutatói Minta", desc: "Iktasson ki 10 alap mutánst Testlövéssel.", type: "kill_body", target: "normal", goal: 10, reward: 300 },
        { id: "t1_h_normal", title: "Koponya Kalibráció (Alap)", desc: "Iktasson ki 5 alap mutánst Fejlövéssel.", type: "kill_head", target: "normal", goal: 5, reward: 400 },
        { id: "t1_b_runner", title: "Izomszövet Minta", desc: "Iktasson ki 5 Gyors mutánst (Runner) Testlövéssel.", type: "kill_body", target: "runner", goal: 5, reward: 500 },
        { id: "t1_h_runner", title: "Koponya Kalibráció (Gyors)", desc: "Iktasson ki 3 Gyors mutánst Fejlövéssel.", type: "kill_head", target: "runner", goal: 3, reward: 600 },
        
        { id: "t1_dmg_normal", title: "Kevlár Teszt (Alap)", desc: "Engedélyezze, hogy egy alap mutáns megüsse 5 alkalommal.", type: "take_damage", target: "normal", goal: 5, reward: 400 },
        { id: "t1_dmg_runner", title: "Kevlár Teszt (Gyors)", desc: "Engedélyezze, hogy egy Gyors mutáns megüsse 4 alkalommal.", type: "take_damage", target: "runner", goal: 4, reward: 500 },
        
        { id: "t1_stand_green", title: "Sav-teszt (Zöld Fázis)", desc: "Exponálja páncélzatát ZÖLD biomasszában összesen 10 másodpercig.", type: "puddle_stand", target: "green", goal: 10, reward: 500 },
        
        { id: "t1_pkill_g_normal", title: "Pajzs-teszt (Zöld / Alap)", desc: "Iktasson ki 3 alap mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 3, reward: 600 },
        { id: "t1_pkill_g_runner", title: "Pajzs-teszt (Zöld / Gyors)", desc: "Iktasson ki 2 Gyors mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 2, reward: 700 },
        { id: "t1_pkill_g_tank", title: "Pajzs-teszt (Zöld / Páncélos)", desc: "Iktasson ki 1 Tank mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 1, reward: 800 },
        { id: "t1_pkill_g_stalker", title: "Pajzs-teszt (Zöld / Fantom)", desc: "Iktasson ki 1 Lopakodó mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 1, reward: 800 },
        { id: "t1_pkill_g_boss", title: "Pajzs-teszt (Zöld / Kaptárőr)", desc: "Iktasson ki 1 Kaptárőrt (Boss) ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 1, reward: 1200 }
    ],

    // TIER 2 (15 db) - Tank, Lopakodó, Növény, Sárga tócsák
    tier2: [
        { id: "t2_b_tank", title: "Csontsűrűség Minta", desc: "Iktasson ki 3 Tank mutánst Testlövéssel.", type: "kill_body", target: "tank", goal: 3, reward: 800 },
        { id: "t2_h_tank", title: "Koponya Kalibráció (Páncélos)", desc: "Iktasson ki 2 Tank mutánst Fejlövéssel.", type: "kill_head", target: "tank", goal: 2, reward: 1000 },
        { id: "t2_b_stalker", title: "Rejtőzködő Minta", desc: "Iktasson ki 3 Lopakodó (Stalker) mutánst Testlövéssel.", type: "kill_body", target: "stalker", goal: 3, reward: 800 },
        { id: "t2_h_stalker", title: "Koponya Kalibráció (Fantom)", desc: "Iktasson ki 3 Lopakodó mutánst Fejlövéssel.", type: "kill_head", target: "stalker", goal: 3, reward: 1200 },
        
        { id: "t2_dmg_tank", title: "Kevlár Teszt (Páncélos)", desc: "Engedélyezze, hogy egy Tank mutáns megüsse 2 alkalommal.", type: "take_damage", target: "tank", goal: 2, reward: 800 },
        { id: "t2_dmg_stalker", title: "Kevlár Teszt (Fantom)", desc: "Engedélyezze, hogy egy Lopakodó megüsse 3 alkalommal.", type: "take_damage", target: "stalker", goal: 3, reward: 800 },
        
        { id: "t2_stand_yellow", title: "Sav-teszt (Rothadó Fázis)", desc: "Exponálja páncélzatát SÁRGA biomasszában összesen 5 másodpercig.", type: "puddle_stand", target: "yellow", goal: 5, reward: 1000 },
        
        { id: "t2_trig_plant", title: "Élőflóra Reflexvizsgálat", desc: "Sétáljon bele egy kikelő Hús-Virág csapdájába (Neuro-Toxin Teszt).", type: "trigger_plant", target: "plant", goal: 1, reward: 2000 },
        { id: "t2_dest_plant", title: "Helyszíni Sterilizáció", desc: "Semmisítsen meg fegyverrel (távolról) 3 Hús-Virágot.", type: "destroy_plant", target: "plant", goal: 3, reward: 1000 },

        { id: "t2_pkill_y_normal", title: "Pajzs-teszt (Sárga / Alap)", desc: "Iktasson ki 3 alap mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 3, reward: 1000 },
        { id: "t2_pkill_y_runner", title: "Pajzs-teszt (Sárga / Gyors)", desc: "Iktasson ki 2 Gyors mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 2, reward: 1100 },
        { id: "t2_pkill_y_tank", title: "Pajzs-teszt (Sárga / Páncélos)", desc: "Iktasson ki 1 Tank mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 1, reward: 1300 },
        { id: "t2_pkill_y_stalker", title: "Pajzs-teszt (Sárga / Fantom)", desc: "Iktasson ki 1 Lopakodó mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 1, reward: 1300 },
        { id: "t2_pkill_y_boss", title: "Pajzs-teszt (Sárga / Kaptárőr)", desc: "Iktasson ki 1 Kaptárőrt (Boss) SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 1, reward: 1800 },
        
        { id: "t2_crawler", title: "Arany-Minta Begyűjtése", desc: "Iktasson ki 1 'Golden Crawler' Anomáliát.", type: "kill_body", target: "crawler", goal: 1, reward: 2000 }
    ],

    // TIER 3 (10 db) - Bossok, Vörös tócsák, Alfa Szubjektum
    tier3: [
        { id: "t3_b_boss", title: "Kaptárőr Szövetminta", desc: "Iktasson ki 2 Kaptárőrt (Boss) Testlövéssel.", type: "kill_body", target: "boss", goal: 2, reward: 2000 },
        { id: "t3_h_boss", title: "Kaptárőr Agy-Minta", desc: "Iktasson ki 1 Kaptárőrt (Boss) Fejlövéssel.", type: "kill_head", target: "boss", goal: 1, reward: 3000 },
        { id: "t3_dmg_boss", title: "Kevlár Teszt (Kaptárőr)", desc: "Élje túl egy Kaptárőr 'Glitch' támadását 1 alkalommal.", type: "take_damage", target: "boss", goal: 1, reward: 2500 },
        
        { id: "t3_stand_red", title: "Sav-teszt (Vörös Fázis)", desc: "Exponálja páncélzatát VÖRÖS biomasszában összesen 3 másodpercig.", type: "puddle_stand", target: "ready", goal: 3, reward: 2000 },
        
        { id: "t3_pkill_r_normal", title: "Pajzs-teszt (Vörös / Alap)", desc: "Iktasson ki 2 alap mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 2, reward: 1500 },
        { id: "t3_pkill_r_runner", title: "Pajzs-teszt (Vörös / Gyors)", desc: "Iktasson ki 2 Gyors mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 2, reward: 1600 },
        { id: "t3_pkill_r_tank", title: "Pajzs-teszt (Vörös / Páncélos)", desc: "Iktasson ki 1 Tank mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 1, reward: 2000 },
        { id: "t3_pkill_r_stalker", title: "Pajzs-teszt (Vörös / Fantom)", desc: "Iktasson ki 1 Lopakodó mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 1, reward: 2000 },
        { id: "t3_pkill_r_boss", title: "Pajzs-teszt (Vörös / Kaptárőr)", desc: "Iktasson ki 1 Kaptárőrt (Boss) VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 1, reward: 3000 },

        { id: "t3_alpha", title: "OMEGA-DIREKTÍVA: TISZTA MINTA", desc: "Iktassa ki az Alfa Szubjektumot a 100. Hullámban.", type: "kill_body", target: "alpha", goal: 1, reward: 50000 }
    ]
};