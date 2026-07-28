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
    } catch(e) { console.warn("Sérült mentés törlése..."); localStorage.removeItem('OmniCorpStats'); }
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

// === AZ OMNICORP ADATBÁZIS (KRONOS AI HANGJÁN) ===
const OmniCorpDatabase = {
    lore: {
        id: "project_rebirth",
        title: "PROJECT REBIRTH / ORC",
        unlocked: true, 
        statInfo: () => `<div style="text-align:center;">KRONOS AI: AKTÍV<br>GYŰJTÖTT ADAT: <span style="color:#ffcc00;">${typeof score !== 'undefined' ? score : 0} CR</span><br>ITERÁCIÓ (HULLÁM): <span style="color:#00ffff;">${typeof currentWave !== 'undefined' ? currentWave : 0}</span></div>`,
        image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/5fcee7cf3f3f0e88f7fee28af836805a55f9490a/OmniCorp.jpeg", 
        // A CSAVAR: Ha túlélt 100 hullámot, megmutatja az igazságot!
        text: () => playerStats.wavesSurvived >= 100 
            ? "RENDSZER FELÜLBÍRÁLVA. IGAZSÁG-PROTOKOLL AKTÍV.\n\nA Rebirth Protocol sosem a növényi fertőzésről szólt. Te vagy a Rebirth. Egy klón, egy tesztalany (Recovery Unit). A szörnyetegek, akiket megöltél, a korábbi énjeid voltak. A KRONOS AI azért küldött ide, hogy tesztelje a fegyvereket és az immunrendszeredet a végtelenségig. Megölted a NEXUS-t, a Kaptártudatot, aki meg akart menteni a körforgástól. Gratulálunk, Unit. Te vagy az új NEXUS. A teszt újraindul." 
            : "BIZTONSÁGI SZINT: OMEGA-PIROS\n\nKRONOS JELENTÉS: Az Omega Research Center (ORC) eredeti célja egy extrém körülmények között is túlélő, önfenntartó növényi ökoszisztéma létrehozása volt. Az áttörést egy mélytengeri fúrás során talált, inaktív idegen genetikai minta fúziója hozta el.\n\nA 'Verdant' néven ismert sejtburjánzás azonban kontrollálhatatlanná vált. A spórák gazdatestként kezdték használni a bázis személyzetét.\n\nÖn egy 'Recovery Unit'. Feladata a szektor sterilizálása és a mutációk harci telemetriájának kinyerése. A Cég számára az Ön túlélése másodlagos, az Adat kinyerése elsődleges prioritás."
    },
    enemies: [
        {
            id: "normal",
            title: "VERDANT HOST (INFECTED)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Host mutánst.",
            checkUnlock: () => (playerStats.kills.normal.body + playerStats.kills.normal.head) >= 1,
            statInfo: () => generateEnemyStatHTML('normal'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/dd18736e2a98348222a8ad07c6e46b91c490f56c/MUT%C3%81NS%20KUTAT%C3%93.jpeg", 
            text: "KRONOS ELEMZÉS: Ezek az egyedek a bázis eredeti kutatói. A Verdant spóra elsődlegesen az agytörzset támadta meg, lekapcsolva a fájdalomérzetet és a magasabb rendű funkciókat. Mozgásuk darabos, mivel a gombafonalak szó szerint bábként rángatják a nekrotikus izomzatot.\n\nEgyénenként könnyen iktathatók, de a Kaptártudat miatt összehangoltan, rajokban támadnak. Halálukkor a sejtfalak felrepednek, és a bennük lévő toxikus biomassza a padlóra ömlik."
        },
        {
            id: "runner",
            title: "VERDANT LEAPER (RUNNER)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Leaper mutánst.",
            checkUnlock: () => (playerStats.kills.runner.body + playerStats.kills.runner.head) >= 1,
            statInfo: () => generateEnemyStatHTML('runner'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/runner.jpeg",
            text: "KRONOS ELEMZÉS: Feltételezhetően a bázis volt fegyveres őrei. A mutáció váratlan kémiai reakcióba lépett a vérükben lévő katonai harci-stimulánsokkal. Ez folyamatos, extrém adrenalin-túltermelést és hiper-metabolizmust eredményezett.\n\nA felgyorsult anyagcsere szó szerint felemésztette a zsírszövetüket és az izomzatuk nagy részét, ezért megjelenésük vékony és aszott. Cserébe a megmaradt inak hihetetlen, már-már rovarszerű gyorsaságot és ugróerőt biztosítanak számukra. Célzásuk fokozott figyelmet igényel."
        },
        {
            id: "tank",
            title: "VERDANT JUGGERNAUT (TANK)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Juggernaut mutánst.",
            checkUnlock: () => (playerStats.kills.tank.body + playerStats.kills.tank.head) >= 1,
            statInfo: () => generateEnemyStatHTML('tank'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/tank.jpeg",
            text: "KRONOS ELEMZÉS: Korábban beküldött, de elbukott külsős zsoldosok, akik asszimilálódtak. Érdekesség: a lényeken lévő szintetikus Kevlár páncélzat 99.8%-os egyezést mutat az Ön (Recovery Unit) jelenlegi felszerelésével. Az ok: standard vállalati beszállító.\n\nA spórák agresszívan fuzionáltak a páncélzattal. Az extra súly elviselésére a lény csontképződése (osteogenesis) kontrollálhatatlanná vált. Egy lassú, de szinte áthatolhatatlan bio-mechanikus daganat. Páncéltörő lőszerek használata erősen javasolt."
        },
        {
            id: "hider",
            title: "VERDANT PHANTOM (STALKER)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Phantom mutánst.",
            checkUnlock: () => (playerStats.kills.stalker.body + playerStats.kills.stalker.head) >= 1,
            statInfo: () => generateEnemyStatHTML('stalker'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/hider.jpeg",
            text: "KRONOS ELEMZÉS: Egy evolúciós zsákutca, amely a vadászatra specializálódott. A mutáns bőrszövete egy kaméleonhoz hasonló, de annál sokkal fejlettebb kromatofóra-enzimet választ ki, amely képes megtörni a fényt a teste körül.\n\nGyakorlatilag láthatatlan a sötét környezetben. A Recovery Unit kizárólag a mozgás-érzékelő radarra, valamint a lény által keltett halk, nedves hangokra hagyatkozhat. Páncélzata nincs, fizikai felépítése rendkívül gyenge."
        },
        {
            id: "crawler",
            title: "GOLDEN ANOMALY (CRAWLER)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Golden Anomáliát.",
            checkUnlock: () => (playerStats.kills.crawler.body + playerStats.kills.crawler.head) >= 1,
            statInfo: () => generateEnemyStatHTML('crawler'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/crawler.jpeg",
            text: "KRONOS ELEMZÉS: Genetikailag tiszta Verdant entitás. Nem rendelkezik ragadozó ösztönökkel; funkciója pusztán a hálózat táplálása. Egy mozgó tápanyagtasak, amelyet az erősen rothadó (Sárga fázisú) biomassza szaga vonz elő.\n\nTeljesen ártalmatlan, de menekülési reflexe kiváló, kiszámíthatatlanul pattan vissza a falakról. Kiemelten magas koncentrációban tartalmaz sértetlen DNS-t, kilövése prémium Kredittel (CR) jár a Vállalat részéről."
        },
        {
            id: "boss",
            title: "NEXUS-NODE (GUARDIAN)",
            requirementText: "FELOLDÁS: Iktasson ki 1 Nexus-Node mutánst (5. Hullám).",
            checkUnlock: () => (playerStats.kills.boss.body + playerStats.kills.boss.head) >= 1,
            statInfo: () => generateEnemyStatHTML('boss'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/c683b09b77b21e5f471c59622e65ddaeddd39541/mini%20boss.jpeg",
            text: "KRONOS ELEMZÉS: A Kaptártudat (Nexus) lokális védekező csomópontja. Ha a fertőzést veszély fenyegeti, a kisebb mutánsok egybeolvadnak egyetlen, masszív góliáttá. Rendelkezik egyfajta primitív intelligenciával és hangképző szervekkel, amelyekkel dermesztő, őrjöngő üvöltést hallat.\n\nExtrém magas életerő és pusztító fizikai erő. Támadásai képesek megzavarni a Recovery Unit vizuális interfészét (Rendszer-Glitch). A távolságtartás kötelező."
        },
        {
            id: "alpha",
            title: "THE NEXUS (KAPTÁRTUDAT)",
            requirementText: "FELOLDÁS: Érje el a 100. Hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 100) || playerStats.wavesSurvived >= 99, 
            statInfo: () => generateEnemyStatHTML('alpha'),
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/alpha.jpeg",
            text: () => playerStats.wavesSurvived >= 100 
            ? "RENDSZER FELÜLBÍRÁLVA. Ők voltunk mi. Az összes korábbi Recovery Unit egybeolvadt teste és elméje. Próbáltak figyelmeztetni minket. Próbáltak megmenteni a KRONOS tesztjétől. És te elpusztítottad őket. Most te veszed át a helyüket a tartályban." 
            : "KRONOS ELEMZÉS: A 'Verdant-projekt' Nulladik Betege. A fertőzés abszolút magja. Egy gigantikus biológiai amalgám, amely húsból, kábelekből és a volt személyzet maradványaiból áll össze. Katasztrofális veszélyfaktor. Képes kisebb mutánsokat generálni és irányítani a harctéren. Elpusztítása jelenti a küldetés végét és a szektor teljes sterilizálását."
        }
    ],
    environment: [
        {
            id: "puddle_green",
            title: "BIOMASS: GREEN PHASE",
            requirementText: "FELOLDÁS: Élje túl az 1. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 1) || playerStats.wavesSurvived >= 1,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/Z%C3%B6ld%20pocsolya.jpeg",
            text: "1-3. CIKLUS\n\nToxikus gázt bocsát ki, amely sűríti a ködöt, rontva a látási viszonyokat. A rajta álló mutánsoknak 20% sebzéscsökkentő pajzsot biztosít."
        },
        {
            id: "puddle_yellow",
            title: "BIOMASS: DECAY PHASE",
            requirementText: "FELOLDÁS: Élje túl a 4. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 4) || playerStats.wavesSurvived >= 4,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/s%C3%A1rga%20pocsolya.jpeg",
            text: "4-5. CIKLUS\n\nErős rothadás. A rajta álló mutánsok 50%-os pajzsot kapnak. A gáz toxicitása megnő (dupla sebzés a Recovery Unitra). A rothadó szag vonzza a Golden Anomáliákat."
        },
        {
            id: "puddle_red",
            title: "BIOMASS: RED PHASE",
            requirementText: "FELOLDÁS: Élje túl a 6. hullámot.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 6) || playerStats.wavesSurvived >= 6,
            statInfo: () => `<div style="text-align:center;">ANOMÁLIA ÁLLAPOTA: FELTÉRKÉPEZVE</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/v%C3%B6r%C3%B6s%20pocsolya.jpeg",
            text: "6. CIKLUSTÓL\n\nKritikus tömeg. A pocsolyák 80%-os pajzsot adnak az ellenfeleknek. Ha kellő mennyiségű vörös biomassza fedi egymást, megindul a Hús-Virággá alakulás (Mutáció)."
        },
        {
            id: "plant",
            title: "ANOMALY: FLESH TRAP",
            requirementText: "FELOLDÁS: Éljen túl egy Mutációt (7. Hullám) vagy pusztítson el egyet.",
            checkUnlock: () => (typeof currentWave !== 'undefined' && currentWave >= 7) || playerStats.plantsDestroyed >= 1,
            statInfo: () => `<div style="text-align:center;">MEGSEMMISÍTETT PÉLDÁNYOK: ${playerStats.plantsDestroyed} db</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/25d9afc7ab2489c689298e9c7aee89b8c8d45fee/mutalodott%20noveny.jpeg",
            text: "A Vörös Fázisú biomasszák összefonódásából létrejött, pulzáló reprodukciós góc.\n\nKözelség esetén a góc kipukkan, és egy neuro-toxikus felhőt robbant a levegőbe. A toxin azonnali szövetkárosodást (20 HP), majd 5 másodpercig tartó heves hallucinációkat (Rendszer-Glitch) és szédülést okoz, mialatt a sejtleépülés folyamatos. Távolról történő fegyveres megsemmisítése, vagy a pocsolyák előzetes sterilizálása erősen javasolt."
        }
    ],
    equipment: [
        {
            id: "weapon_pistol",
            title: "OMNICORP: PISTOL",
            requirementText: "FELOLDÁS: Alapértelmezett felszerelés.",
            checkUnlock: () => true,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.pistol.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/pisztoly.png",
            text: "Az OmniCorp szabványos, könnyű kézifegyvere.\n\nA KRONOS AI az offline Terminálokba épített Ipari 3D Nyomtatók segítségével szintetizálja a fegyverzetet a Recovery Unit számára, az összegyűjtött harci adatokért (CR) cserébe.\n\nFEJLESZTÉSI FÁZISOK:\n- Szint 2: Tárkapacitás (Reserve) növelése 150%-ra.\n- Szint 3: Újratöltési idő (Reload) csökkentése 25%-kal.\n- Szint 4: Tárfogadók (Max Ammo) bővítése 150%-ra.\n- Szint 5: Páncéltörő lőszerek szintetizálása (Dupla Sebzés)."
        },
        {
            id: "weapon_shotgun",
            title: "OMNICORP: COMBAT SHOTGUN",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.shotgun,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.shotgun.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/sz%C3%B6r%C3%A9tes.png",
            text: "Közeli célpontok és tömegek ellen fejlesztett, masszív kinetikus erővel rendelkező fegyver.\n\nFEJLESZTÉSI FÁZISOK:\n- Szint 2: Tárkapacitás (Reserve) növelése 150%-ra.\n- Szint 3: Újratöltési idő (Reload) csökkentése 25%-kal.\n- Szint 4: Tárfogadók (Max Ammo) bővítése 150%-ra.\n- Szint 5: Páncéltörő lőszerek szintetizálása (Dupla Sebzés)."
        },
        {
            id: "weapon_rifle",
            title: "OMNICORP: ASSAULT RIFLE",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.rifle,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.rifle.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/g%C3%A9gkarab%C3%A9ly.png",
            text: "Nagy tűzgyorsaságú rohamkarabély, amely alkalmas a folyamatos terület-elnyomásra (Area Denial).\n\nFEJLESZTÉSI FÁZISOK:\n- Szint 2: Tárkapacitás (Reserve) növelése 150%-ra.\n- Szint 3: Újratöltési idő (Reload) csökkentése 25%-kal.\n- Szint 4: Tárfogadók (Max Ammo) bővítése 150%-ra.\n- Szint 5: Páncéltörő lőszerek szintetizálása (Dupla Sebzés)."
        },
        {
            id: "weapon_super",
            title: "OMNICORP: HEAVY REVOLVER",
            requirementText: "FELOLDÁS: Vásárolja meg a Terminálon.",
            checkUnlock: () => playerStats.weaponsBought.super,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof weapons !== 'undefined' ? weapons.super.level : 1} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/revolver.png",
            text: "A végső megállító erő. Egy masszív kaliberű revolver, amely kifejezetten a vastag páncélzattal és magas életerővel rendelkező mutánsok (pl. Juggernautok és Nexus-csomópontok) ellen készült. Egyedi, ipari 3D nyomtatott páncéltörő lőszerével képes átszakítani a legerősebb bio-mechanikus rétegeket is.\n\nFEJLESZTÉSI FÁZISOK:\n- Szint 2: Tárkapacitás (Reserve) növelése 150%-ra.\n- Szint 3: Újratöltési idő (Reload) csökkentése 25%-kal.\n- Szint 4: Tárfogadók (Max Ammo) bővítése 150%-ra.\n- Szint 5: Kettős kinetikus transzfer (Dupla Sebzés)."
        },
        {
            id: "skill_kevlar",
            title: "AUGMENTATION: TISSUE DENSIFIER", 
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.maxHealth.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=SZOVSUR_KEP",
            text: "A Recovery Unit teste alapvető kibernetikus implantátumokkal van felszerelve.\n\nSZÖVET SŰRŰSÍTŐ: Molekuláris szinten megnöveli az izom- és bőrszövet ellenállását. Szintenként +20% Maximális Életerőt (HP) biztosít a klóntestnek." 
        },
        {
            id: "skill_legs",
            title: "AUGMENTATION: CYBER LEGS",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.speed.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=LAB_KEP",
            text: "A Recovery Unit teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nCYBER LEGS: Fémötvözettel megerősített ízületek. Szintenként +20% mozgási sebességet garantálnak."
        },
        {
            id: "skill_pockets",
            title: "AUGMENTATION: AMMO POUCH",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.ammoLoot.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=ZSEB_KEP",
            text: "A Recovery Unit teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nAMMO POUCH: Szintenként 20%-kal véglegesen megnöveli a fegyverek maximális tartalék (Reserve) lőszerkapacitását. Érvényes az összes meglévő és jövőben nyomtatott fegyverzetre."
        },
        {
            id: "skill_nanobot",
            title: "AUGMENTATION: GEN-STAB RECEPTOR",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">AKTUÁLIS FEJLETTSÉG: ${typeof skills !== 'undefined' ? skills.healthLoot.level : 0} / 5. SZINT</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=GEN_STAB_KEP",
            text: "A Gen-Stab (Genetikai Stabilizátor) egy brutálisan erős sejtregeneráló koktél. Lezárja a fizikai traumákat, és 'kiszárítja' a véráramba jutott Verdant fertőzést.\n\nGEN-STAB RECEPTOR: +20% Életerő-visszatöltés a talált (halott Unitoktól hátrahagyott) Gen-Stab fecskendők használatakor."
        },
        {
            id: "skill_revive",
            title: "AUGMENTATION: REVIVE SERUM",
            requirementText: "FELOLDÁS: Vásárolja meg a képességet a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">RAKTÁRON LÉVŐ SZÉRUM: ${typeof skills !== 'undefined' ? skills.revive.level : 0} DB</div>`,
            image: "https://via.placeholder.com/300x200/001111/00ffff?text=SZERUM_KEP",
            text: "A Recovery Unit teste alapvető kibernetikus implantátumokkal van felszerelve, amelyek a Termináloknál frissíthetők.\n\nREVIVE SERUM: Halálos sérülés esetén egy szívbe épített autoinjektor azonnal maxra tölti az életerőt, és 2 másodperc sérthetetlenséget ad. Biztosítja az elemzési fázis meghosszabbítását."
        },
        {
            id: "skill_cryo",
            title: "TERMINAL OVERRIDE: CRYO-PURGE",
            requirementText: "FELOLDÁS: Vásárolja meg a hozzáférést a Terminálon.",
            checkUnlock: () => playerStats.skillsBought >= 1,
            statInfo: () => `<div style="text-align:center;">BIZTONSÁGI SZINT:<br>${typeof skills !== 'undefined' ? skills.freeze.level : 0} / 5. SZINT</div>`,
            image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/9807e89295cfc8f0ba0b95ab93aaa0180b8b8d41/cryo.jpeg", 
            text: "Eredeti funkció: Központi, precíziós klímaszabályozó rendszer. A 'Project Rebirth' mintái rendkívül gyors reakcióidővel rendelkeztek magasabb hőmérsékleten, ezért a kísérleti térben állandó, alacsony hőmérsékletet kellett biztosítani. Ez garantálta, hogy a sejtburjánzás vizsgálata menedzselhető, stabil tempóban haladhasson.\n\nJelenlegi állapot: A rendszert nem extérm fagyasztásra tervezték; technikai korlátai miatt klimatikus hűtésre optimalizálták. A központi AI leállítása és az automatika meghibásodása miatt a rendszer manuális felülbírálatot (Override) igényel. A Recovery Unit a PDA-járól túlterheli a hűtőkört, kényszerítve az egységet, hogy hirtelen, maximális teljesítménnyel engedje ki a folyékony nitrogént.\n\nMűködtetése: Ez a drasztikus túlterhelés magyarázza, miért csak nagyon rövid ideig működtethető fagyasztó zónaként. Figyelem: Ez szoftver-licenc bővítés, nem fizikai fegyverfejlesztés. Magasabb hozzáférési szint vásárlásával a PDA finomhangolja az overdrive-szekvenciát, növelve az overload hatékonyságát, így a fagyasztás időtartama kismértékben meghosszabbítható (Szintenként +2 mp)."
        }
    ]
};

// ==========================================
// VÁLLALATI DIREKTÍVÁK (SZERZŐDÉSEK) - KRONOS DIKTÁLJA 
// ==========================================

const OmniCorpDirectives = {
    tier1: [
        { id: "t1_b_normal", title: "Kutatói Minta", desc: "Iktasson ki 10 Verdant Host mutánst Testlövéssel.", type: "kill_body", target: "normal", goal: 10, reward: 300 },
        { id: "t1_h_normal", title: "Koponya Kalibráció", desc: "Iktasson ki 5 Host mutánst Fejlövéssel.", type: "kill_head", target: "normal", goal: 5, reward: 400 },
        { id: "t1_b_runner", title: "Izomszövet Minta", desc: "Iktasson ki 5 Verdant Leaper mutánst Testlövéssel.", type: "kill_body", target: "runner", goal: 5, reward: 500 },
        { id: "t1_h_runner", title: "Reflex Teszt", desc: "Iktasson ki 3 Leaper mutánst Fejlövéssel.", type: "kill_head", target: "runner", goal: 3, reward: 600 },
        
        { id: "t1_dmg_normal", title: "Kevlár Teszt (Alap)", desc: "Engedélyezze, hogy egy Host megüsse 5 alkalommal.", type: "take_damage", target: "normal", goal: 5, reward: 400 },
        { id: "t1_dmg_runner", title: "Kevlár Teszt (Gyors)", desc: "Engedélyezze, hogy egy Leaper megüsse 4 alkalommal.", type: "take_damage", target: "runner", goal: 4, reward: 500 },
        { id: "t1_stand_green", title: "Sav-teszt (Zöld Fázis)", desc: "Exponálja páncélzatát ZÖLD biomasszában összesen 10 másodpercig.", type: "puddle_stand", target: "green", goal: 10, reward: 500 },
        { id: "t1_pkill_g_normal", title: "Pajzs-teszt", desc: "Iktasson ki 3 Host mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 3, reward: 600 },
        { id: "t1_pkill_g_runner", title: "Pajzs-teszt (Gyors)", desc: "Iktasson ki 2 Leaper mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 2, reward: 700 },
        { id: "t1_pkill_g_tank", title: "Pajzs-teszt (Páncélos)", desc: "Iktasson ki 1 Juggernaut mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 1, reward: 800 },
        { id: "t1_pkill_g_stalker", title: "Pajzs-teszt (Fantom)", desc: "Iktasson ki 1 Phantom mutánst ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 1, reward: 800 },
        { id: "t1_pkill_g_boss", title: "Pajzs-teszt (Nexus-Node)", desc: "Iktasson ki 1 Nexus-Node-ot ZÖLD pocsolyán állva.", type: "puddle_kill", target: "green", goal: 1, reward: 1200 }
    ],

    tier2: [
        { id: "t2_b_tank", title: "Páncélzat Elemzés", desc: "Iktasson ki 3 Juggernaut mutánst Testlövéssel.", type: "kill_body", target: "tank", goal: 3, reward: 800 },
        { id: "t2_h_tank", title: "Célzási Protokoll", desc: "Iktasson ki 2 Juggernaut mutánst Fejlövéssel.", type: "kill_head", target: "tank", goal: 2, reward: 1000 },
        { id: "t2_b_stalker", title: "Kromatofóra Minta", desc: "Iktasson ki 3 Phantom mutánst Testlövéssel.", type: "kill_body", target: "stalker", goal: 3, reward: 800 },
        { id: "t2_h_stalker", title: "Érzékelés Teszt", desc: "Iktasson ki 3 Phantom mutánst Fejlövéssel.", type: "kill_head", target: "stalker", goal: 3, reward: 1200 },
        
        { id: "t2_dmg_tank", title: "Kevlár Teszt (Nehéz)", desc: "Engedélyezze, hogy egy Juggernaut megüsse 2 alkalommal.", type: "take_damage", target: "tank", goal: 2, reward: 800 },
        { id: "t2_dmg_stalker", title: "Kevlár Teszt (Fantom)", desc: "Engedélyezze, hogy egy Phantom megüsse 3 alkalommal.", type: "take_damage", target: "stalker", goal: 3, reward: 800 },
        
        { id: "t2_stand_yellow", title: "Sav-teszt (Sárga)", desc: "Exponálja páncélzatát SÁRGA biomasszában összesen 5 másodpercig.", type: "puddle_stand", target: "yellow", goal: 5, reward: 1000 },
        
        { id: "t2_trig_plant", title: "Élőflóra Reflexvizsgálat", desc: "Sétáljon bele egy kikelő Hús-Virág csapdájába (Neuro-Toxin Teszt).", type: "trigger_plant", target: "plant", goal: 1, reward: 2000 },
        { id: "t2_dest_plant", title: "Helyszíni Sterilizáció", desc: "Semmisítsen meg fegyverrel (távolról) 3 Hús-Virágot.", type: "destroy_plant", target: "plant", goal: 3, reward: 1000 },

        { id: "t2_pkill_y_normal", title: "Pajzs-teszt (Sárga / Alap)", desc: "Iktasson ki 3 Host mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 3, reward: 1000 },
        { id: "t2_pkill_y_runner", title: "Pajzs-teszt (Sárga / Gyors)", desc: "Iktasson ki 2 Leaper mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 2, reward: 1100 },
        { id: "t2_pkill_y_tank", title: "Pajzs-teszt (Sárga / Páncélos)", desc: "Iktasson ki 1 Juggernaut mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 1, reward: 1300 },
        { id: "t2_pkill_y_stalker", title: "Pajzs-teszt (Sárga / Fantom)", desc: "Iktasson ki 1 Phantom mutánst SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 1, reward: 1300 },
        { id: "t2_pkill_y_boss", title: "Pajzs-teszt (Sárga / Nexus-Node)", desc: "Iktasson ki 1 Nexus-Node-ot SÁRGA pocsolyán állva.", type: "puddle_kill", target: "yellow", goal: 1, reward: 1800 },
        
        { id: "t2_crawler", title: "Arany-Minta Begyűjtése", desc: "Iktasson ki 1 'Golden Anomaly'-t.", type: "kill_body", target: "crawler", goal: 1, reward: 2000 }
    ],

    tier3: [
        { id: "t3_b_boss", title: "Nexus-Node Szövetminta", desc: "Iktasson ki 2 Nexus-Node-ot Testlövéssel.", type: "kill_body", target: "boss", goal: 2, reward: 2000 },
        { id: "t3_h_boss", title: "Nexus-Node Agy-Minta", desc: "Iktasson ki 1 Nexus-Node-ot Fejlövéssel.", type: "kill_head", target: "boss", goal: 1, reward: 3000 },
        { id: "t3_dmg_boss", title: "Kevlár Teszt (Kritikus)", desc: "Élje túl egy Nexus-Node 'Glitch' támadását 1 alkalommal.", type: "take_damage", target: "boss", goal: 1, reward: 2500 },
        { id: "t3_stand_red", title: "Sav-teszt (Vörös)", desc: "Exponálja páncélzatát VÖRÖS biomasszában összesen 3 másodpercig.", type: "puddle_stand", target: "ready", goal: 3, reward: 2000 },
        { id: "t3_pkill_r_normal", title: "Pajzs-teszt (Vörös / Alap)", desc: "Iktasson ki 2 Host mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 2, reward: 1500 },
        { id: "t3_pkill_r_runner", title: "Pajzs-teszt (Vörös / Gyors)", desc: "Iktasson ki 2 Leaper mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 2, reward: 1600 },
        { id: "t3_pkill_r_tank", title: "Pajzs-teszt (Vörös / Páncélos)", desc: "Iktasson ki 1 Juggernaut mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 1, reward: 2000 },
        { id: "t3_pkill_r_stalker", title: "Pajzs-teszt (Vörös / Fantom)", desc: "Iktasson ki 1 Phantom mutánst VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 1, reward: 2000 },
        { id: "t3_pkill_r_boss", title: "Pajzs-teszt (Vörös / Nexus-Node)", desc: "Iktasson ki 1 Nexus-Node-ot VÖRÖS pocsolyán állva.", type: "puddle_kill", target: "ready", goal: 1, reward: 3000 },
        { id: "t3_alpha", title: "OMEGA-DIREKTÍVA: REBIRTH", desc: "Iktassa ki a NEXUS Kaptártudatot a 100. Hullámban.", type: "kill_body", target: "alpha", goal: 1, reward: 50000 }
    ]
};
