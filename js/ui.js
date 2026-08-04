localStorage.removeItem('OmniCorpStats');
// ==========================================
// OMNICORP ARCHÍVUM LOGIKA (FÜLEKKEL ÉS NAGYÍTÓVAL)
// ==========================================
// ==========================================
// GLOBÁLIS UI VÁLTOZÓK
// ==========================================
const healthFill = document.getElementById('health-fill');
const armorFill = document.getElementById('armor-fill');

const ammoDisplay = document.getElementById('ammo-display');
const weaponInfoDisplay = document.getElementById('weapon-info-display');
const hitmarker = document.getElementById('hitmarker');
const hsMsg = document.getElementById('headshot-msg');
const shopPoints = document.getElementById('shop-points');

// ==========================================
// OMNICORP ARCHÍVUM LOGIKA (FÜLEKKEL ÉS NAGYÍTÓVAL)
// ==========================================
const archiveMenu = document.getElementById('archive-menu');
const mainMenu = document.getElementById('main-menu');
const archiveList = document.getElementById('archive-list');
const archiveContent = document.getElementById('archive-content');
const shopMenu = document.getElementById('shop-menu'); // Csak itt van egyszer deklarálva!

let currentArchiveCategory = 'lore'; 
let archiveOpenedFrom = 'mainMenu'; // Honnan nyitottuk meg?

// Fülek (Tabs) kattintás eseménye az Archívumon belül
document.querySelectorAll('.archive-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.archive-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentArchiveCategory = e.target.getAttribute('data-category');
        if (typeof renderArchiveList === 'function') renderArchiveList();
    });
});

// A FŐMENÜBŐL NYITJUK MEG
const openArchiveBtn = document.getElementById('open-archive-btn');
if (openArchiveBtn) {
    openArchiveBtn.addEventListener('click', () => {
        archiveOpenedFrom = 'mainMenu';
        if (mainMenu) mainMenu.classList.add('hidden');
        if (archiveMenu) {
            archiveMenu.classList.remove('hidden');
            archiveMenu.style.display = 'flex'; 
        }
        
        document.querySelectorAll('.archive-tab-btn').forEach(b => b.classList.remove('active'));
        let loreBtn = document.querySelector('.archive-tab-btn[data-category="lore"]');
        if (loreBtn) loreBtn.classList.add('active');
        
        currentArchiveCategory = 'lore';
        if (typeof renderArchiveList === 'function') renderArchiveList();
    });
}

// A JÁTÉK KÖZBENI TERMINÁLBÓL NYITJUK MEG
const tabArchiveIngameBtn = document.getElementById('tab-archive-ingame');
if (tabArchiveIngameBtn) {
    tabArchiveIngameBtn.addEventListener('click', () => {
        archiveOpenedFrom = 'shopMenu'; 
        if (shopMenu) shopMenu.classList.add('hidden'); 
        if (archiveMenu) {
            archiveMenu.classList.remove('hidden');
            archiveMenu.style.display = 'flex'; 
        }
        
        document.querySelectorAll('.archive-tab-btn').forEach(b => b.classList.remove('active'));
        let loreBtn = document.querySelector('.archive-tab-btn[data-category="lore"]');
        if (loreBtn) loreBtn.classList.add('active');
        
        currentArchiveCategory = 'lore';
        if (typeof renderArchiveList === 'function') renderArchiveList();
    });
}



// --- KÉPNAGYÍTÓ (LIGHTBOX) LOGIKA ---

window.openLightbox = function(url) {
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    if (lightboxImg && lightboxOverlay) {
        lightboxImg.src = url;
        lightboxOverlay.style.display = 'flex';
    }
}

// BIZTONSÁGOS BEZÁRÓ FÜGGVÉNY
window.closeLightbox = function() {
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    if (lightboxOverlay) lightboxOverlay.style.display = 'none';
}




// --- LISTA GENERÁLÁSA A KATEGÓRIA ALAPJÁN ---
function renderArchiveList() {
    archiveList.innerHTML = '';
    archiveContent.innerHTML = "<div style='text-align:center; color:#005555; margin-top:20px;'>Válasszon ki egy bejegyzést a dekódoláshoz.</div>";

    if (currentArchiveCategory === 'lore') {
        // JAVÍTÁS: Lekérdezzük a szöveget, mielőtt átadjuk a gépelőnek!
        let loreText = typeof OmniCorpDatabase.lore.text === 'function' ? OmniCorpDatabase.lore.text() : OmniCorpDatabase.lore.text;
        createArchiveButton(OmniCorpDatabase.lore.title, loreText, true, null, OmniCorpDatabase.lore.image, OmniCorpDatabase.lore.statInfo());
    } else {
        let dataArray = OmniCorpDatabase[currentArchiveCategory];
        if (dataArray) {
            dataArray.forEach(item => {
                let isUnlocked = item.checkUnlock ? item.checkUnlock() : true;
                let statText = item.statInfo ? item.statInfo() : null; 
                
                // JAVÍTÁS ITT IS: Mert az Alpha Boss szövege is dinamikus lett!
                let actualText = typeof item.text === 'function' ? item.text() : item.text;
                
                createArchiveButton(item.title, actualText, isUnlocked, item.requirementText, item.image, statText);
            });
        }
    }
}

// --- GOMB ÉS OLVASÓ PANEL LÉTREHOZÁSA ---
// Új bemeneti paraméter: statText
function createArchiveButton(title, text, isUnlocked, reqText, imageUrl, statText) {
    const btn = document.createElement('button');
    btn.className = 'archive-entry-btn';
    
    if (isUnlocked) {
        btn.innerText = title;
        btn.onclick = () => {
            document.querySelectorAll('.archive-entry-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
           let contentHTML = "";
            
            // 1. KÉP
            if (imageUrl) {
                contentHTML += `<div style="display: flex; justify-content: center; margin-bottom: 25px;">
                                   <img src="${imageUrl}" onclick="openLightbox('${imageUrl}')" style="cursor: pointer; max-width: 100%; max-height: 400px; width: auto; border: 2px solid #00ffff; box-shadow: 0 0 20px rgba(0, 255, 255, 0.4); border-radius: 5px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                </div>`;
            }

 // 2. STATISZTIKAI DOBOZ
if (statText) {
    // A Flexbox intézi a középre zárást!
    contentHTML += `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; max-width: 250px; min-height: 180px; margin: 0 auto 25px auto; background: rgba(0, 20, 20, 0.6); padding: 15px; border: 1px solid #00ffff; border-radius: 5px; box-shadow: inset 0 0 15px rgba(0,255,255,0.1);">
                        ${statText}
                    </div>`;
}
            contentHTML += `<div id="typing-text"></div>`;
            archiveContent.innerHTML = contentHTML;

            let typeTarget = document.getElementById('typing-text');
            let i = 0;
            clearInterval(window.typeInterval);
            window.typeInterval = setInterval(() => {
                typeTarget.innerText += text.charAt(i);
                i++;
                if (i >= text.length) clearInterval(window.typeInterval);
            }, 10); 
        };
} else {
        // Ha zárolva van
        btn.classList.add('locked');
        btn.innerText = "██████ [ZÁROLVA]";
        btn.onclick = () => {
            document.querySelectorAll('.archive-entry-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // JAVÍTÁS: A 'white-space: normal;' a titok! Ezzel a böngésző ignorálja a kód behúzásait (space-eket), 
            // és tökéletesen középre fogja húzni az egészet, a görgetősáv (scrollbar) pedig eltűnik!
            archiveContent.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; min-height: 350px; text-align: center; white-space: normal;">
                    <div style="color: #ff0000; font-size: 32px; font-weight: bold; text-shadow: 0 0 15px rgba(255,0,0,0.8); margin-bottom: 20px; letter-spacing: 2px;">
                        BELÉPÉS MEGTAGADVA
                    </div>
                    <div style="color: #ff5555; font-size: 20px; margin-bottom: 30px;">
                        BIZTONSÁGI SZINT ELÉGTELEN.
                    </div>
                    <div style="color: #aaa; font-size: 16px; max-width: 80%; line-height: 1.5; border-top: 1px dashed #550000; padding-top: 20px;">
                        ${reqText}
                    </div>
                </div>
            `;
        };
    }
    archiveList.appendChild(btn);
}




// --- ÚJ: BOLT FÜLEK LOGIKÁJA (Védett verzió) ---
const tabWeaponsBtn = document.getElementById('tab-weapons');
const tabSkillsBtn = document.getElementById('tab-skills');
const tabDirectivesBtn = document.getElementById('tab-directives'); // ÚJ

const shopWeaponsDiv = document.getElementById('shop-weapons');
const shopSkillsDiv = document.getElementById('shop-skills');
const shopDirectivesDiv = document.getElementById('shop-directives'); // ÚJ

function resetShopTabs() {
    if(tabWeaponsBtn) tabWeaponsBtn.classList.remove('active');
    if(tabSkillsBtn) tabSkillsBtn.classList.remove('active');
    if(tabDirectivesBtn) tabDirectivesBtn.classList.remove('active');
    
    if(shopWeaponsDiv) shopWeaponsDiv.classList.add('hidden');
    if(shopSkillsDiv) shopSkillsDiv.classList.add('hidden');
    if(shopDirectivesDiv) shopDirectivesDiv.classList.add('hidden');
}

if (tabWeaponsBtn && tabSkillsBtn && tabDirectivesBtn) {
    tabWeaponsBtn.addEventListener('click', () => {
        resetShopTabs();
        tabWeaponsBtn.classList.add('active');
        shopWeaponsDiv.classList.remove('hidden');
    });

    tabSkillsBtn.addEventListener('click', () => {
        resetShopTabs();
        tabSkillsBtn.classList.add('active');
        shopSkillsDiv.classList.remove('hidden');
    });

// DIREKTÍVA FÜL MEGNYITÁSA (Azonnal átirányít a Nagy Menübe!)
    tabDirectivesBtn.addEventListener('click', () => {
        window.omniDirOpenedFrom = 'shopMenu';
        const sMenu = document.getElementById('shop-menu');
        if (sMenu) sMenu.classList.add('hidden');
        
        const dMenu = document.getElementById('directives-menu');
        if (dMenu) {
            dMenu.classList.remove('hidden');
            dMenu.style.display = 'flex';
        }
        
        document.querySelectorAll('.dir-tab-btn').forEach(b => b.classList.remove('active'));
        let infoTab = document.querySelector('.dir-tab-btn[data-tier="info"]');
        if (infoTab) infoTab.classList.add('active');
        
        window.omniCurrentDirTier = 'info';
        if (typeof renderDirectivesTab === 'function') renderDirectivesTab('info');
    });
}

// --- BOLT MEGNYITÁSA ---
window.openShop = function() {
    gameState = 'SHOPPING'; 
    shopMenu.classList.remove('hidden');
     document.getElementById('game-ui-wrapper').classList.add('hidden');
    // ==========================================
    // --- KRONOS BÜNTETÉS (SZERZŐDÉSSZEGÉS) ---
    // ==========================================
    if (shopLockedForNextWave) {
        // Eltüntetjük a bolt normál felületét (fülek és kártyák)
        document.querySelector('.shop-tabs').style.display = 'none';
        document.getElementById('shop-weapons').classList.add('hidden');
        document.getElementById('shop-skills').classList.add('hidden');
        document.getElementById('shop-directives').classList.add('hidden');
        
        // Kicseréljük a felső feliratot
        const shopPointsEl = document.getElementById('shop-points');
        if (shopPointsEl) {
            shopPointsEl.innerHTML = `<span style="color:#ff0000; font-weight:bold; font-size:30px;">ZÁROLVA</span>`;
        }

        // Beszúrunk egy nagy piros hibaüzenetet a képernyő közepére
        let penaltyDiv = document.getElementById('penalty-screen');
        if (!penaltyDiv) {
            penaltyDiv = document.createElement('div');
            penaltyDiv.id = 'penalty-screen';
            penaltyDiv.style.textAlign = 'center';
            penaltyDiv.style.marginTop = '40px';
            penaltyDiv.style.marginBottom = '40px';
            document.getElementById('terminal-screen').insertBefore(penaltyDiv, document.getElementById('close-shop-btn'));
        }
        
        penaltyDiv.innerHTML = `
            <div style="color: #ff0000; font-size: 50px; text-shadow: 0 0 20px #ff0000;">⚠️ HOZZÁFÉRÉS MEGTAGADVA ⚠️</div>
            <div style="color: #ff5555; font-size: 20px; margin-top: 20px; font-weight: bold;">SZERZŐDÉSSZEGÉS ÉSZLELVE</div>
            <div style="color: #aaa; font-size: 16px; margin-top: 15px; max-width: 600px; line-height: 1.5; margin-left: auto; margin-right: auto;">
                A KRONOS protokoll megsértése miatt a vállalati nyomtatóhoz és orvosi készletekhez való hozzáférés ideiglenesen felfüggesztésre került. Az ellátmányozás a következő sikeres adatgyűjtési ciklus (hullám) után áll helyre.
            </div>
        `;
        penaltyDiv.style.display = 'block';

        // Levesszük a büntetést, hogy a KÖVETKEZŐ hullám után már megnyíljon a bolt
        shopLockedForNextWave = false; 
        return; // Itt kilépünk, nem futtatjuk le a normál bolt-frissítést!
    }
    // ==========================================

    // HA NINCS BÜNTETÉS, MINDEN MEGY TOVÁBB NORMÁLISAN:
    
    // Visszaállítjuk a bolt normál kinézetét (ha előzőleg büntetésben voltunk)
    document.querySelector('.shop-tabs').style.display = 'flex';
    let penaltyDiv = document.getElementById('penalty-screen');
    if (penaltyDiv) penaltyDiv.style.display = 'none';

    // Szép, zölden világító kiírás, ha kapott bónuszt!
    let bonusText = lastWaveBonus > 0 ? ` <span style="color:#00ff00; font-size:18px;">(+${lastWaveBonus} GYORSASÁGI BÓNUSZ)</span>` : '';
    shopPoints.innerHTML = `${score} CR ${bonusText}`;
    
    if(typeof updateShopButtons === 'function') updateShopButtons();
}

document.getElementById('close-shop-btn').addEventListener('click', () => {
    shopMenu.classList.add('hidden');
    gameState = 'PLAYING'; 
    
    // --- ÚJ: VISSZATESSZÜK A JÁTÉK HUD-OT ---
    document.getElementById('game-ui-wrapper').classList.remove('hidden');
    
    // CSAK PC-n kérjük el az egeret, mobilon ez hibát dobna!
    if (window.innerWidth > 768) {
        try { document.body.requestPointerLock(); } catch(e){}
    }
    
    // ITT CSAK A VISSZASZÁMLÁLÓT INDÍTJUK EL! 
    if (typeof startWaveCountdown === 'function') startWaveCountdown(); 
});

// --- VIZUÁLIS VISSZAJELZÉS ---
function flashMoneyError() {
    shopPoints.style.color = '#ff0000';
    setTimeout(() => shopPoints.style.color = '#ffcc00', 300);
}

// --- FEGYVER FEJLESZTÉS LOGIKA ---
function upgradeWeapon(wpnId, basePrice) {
    let w = weapons[wpnId];
    let cost = w.owned ? basePrice * w.level : basePrice;
    if (w.level >= 5 || score < cost) { flashMoneyError(); return; }
    
    score -= cost;
    if (!w.owned) {
        // --- ELSŐ VÁSÁRLÁS ---
        w.owned = true;
        currentWeaponId = wpnId; // Azonnal a kézbe adja az új fegyvert!
        w.ammo = w.maxAmmo;      // JAVÍTÁS: Teli tár!
        w.reserve = w.maxReserve; // Teli zseb!
        
        if (typeof playerStats !== 'undefined' && playerStats.weaponsBought) {
            playerStats.weaponsBought[wpnId] = true;
            if (typeof savePlayerStats === 'function') savePlayerStats();
        }
    } else {
        // --- FEJLESZTÉS ---
        w.level++;
        if (w.level === 2) w.maxReserve = Math.floor(w.maxReserve * 1.5);
        if (w.level === 3) w.reloadTime = Math.floor(w.reloadTime * 0.75);
        if (w.level === 4) { 
            w.maxAmmo = Math.floor(w.maxAmmo * 1.5);
            w.ammo = w.maxAmmo; // Szintlépésnél is telerakja a megnövelt tárat!
        }
        if (w.level === 5) w.damage *= 2;
    }
    updateShopButtons();
}

// --- KÉPESSÉG FEJLESZTÉS LOGIKA ---
function upgradeSkill(skillId) {
    let s = skills[skillId];
    let cost = s.baseCost * (s.level + 1);
    if (s.level >= s.maxLevel || score < cost) { flashMoneyError(); return; }
    
    score -= cost;
    s.level++;
    
    if (typeof playerStats !== 'undefined') {
        playerStats.skillsBought++;
        if (typeof savePlayerStats === 'function') savePlayerStats();
    }
    
    // Élet fejlesztés
    if (skillId === 'maxHealth') playerHealth = 100 + (skills.maxHealth.level * 20);
    
    // Fagyasztás feloldás
    if (skillId === 'freeze' && s.level === 1) document.getElementById('freeze-btn').classList.remove('hidden');

    // --- ÚJ LOGIKA: KIBŐVÍTETT ZSEBEK ---
    // Ha megveszi a skillt, AZONNAL megnöveljük AZ ÖSSZES fegyver maxReserve értékét 20%-kal!
    if (skillId === 'ammoLoot') {
        for (let key in weapons) {
            // Felfelé kerekítjük, hogy ne legyen tört lőszer
            weapons[key].maxReserve = Math.floor(weapons[key].maxReserve * 1.20);
        }
    }

    updateShopButtons();
}

// --- ÚJ: Fegyverváltás a Terminálon belül! ---
window.switchTerminalWeapon = function(weaponId) {
    if (weapons[weaponId] && weapons[weaponId].owned) {
        currentWeaponId = weaponId;
        // Azonnal újrarajzoljuk a Shopot, hogy a gomb színe és a lőszer-számláló is frissüljön!
        updateShopButtons();
        // A Játék HUD-ját is frissítjük!
        if (typeof updateUI === 'function') updateUI();
    }
}

// --- GOMBOK FRISSÍTÉSE ÉS TERMINÁL (OMNICORP DIZÁJN) ---
window.updateShopButtons = function() {
    // 1. Pénz frissítése
    let bonusText = lastWaveBonus > 0 ? ` <span style="color:#00ff00; font-size:18px;">(+${lastWaveBonus} BÓNUSZ)</span>` : '';
    const shopPointsEl = document.getElementById('shop-points');
    if (shopPointsEl) shopPointsEl.innerHTML = `${score} CR${bonusText}`;

    // --- ÚJ: Fegyver-Váltó Gombok az új, dedikált div-be! ---
    let weaponSwitchHTML = `<div style="display: flex; gap: 8px;">`;
    const weaponKeys = Object.keys(weapons);
    weaponKeys.forEach(key => {
        let isOwned = weapons[key].owned;
        let isActive = (key === currentWeaponId);
        let w = weapons[key];
        
        let bgColor = isActive ? "#00ffff" : (isOwned ? "rgba(0, 100, 100, 0.6)" : "rgba(30, 0, 0, 0.5)");
        let color = isActive ? "#000" : (isOwned ? "#00ffff" : "#555");
        let border = isActive ? "1px solid #fff" : "1px solid #005555";
        let cursor = isOwned ? "pointer" : "not-allowed";
        
        // Letisztult dizájn: Csak a név jelenik meg a gombokban
        weaponSwitchHTML += `<button onclick="switchTerminalWeapon('${key}')" style="background: ${bgColor}; color: ${color}; border: ${border}; padding: 5px 12px; font-size: 14px; cursor: ${cursor}; font-family: 'Share Tech Mono', monospace; border-radius: 3px; letter-spacing: 1px;">${w.name.toUpperCase()}</button>`;
    });
    weaponSwitchHTML += `</div>`;

    // 2. Lőszer és Fegyver gombok beillesztése
    let w = weapons[currentWeaponId];
    const shopAmmoDisplay = document.getElementById('shop-ammo-display');
    if (shopAmmoDisplay) shopAmmoDisplay.innerText = `${w.ammo} / ${w.reserve}`;
    
    const shopWeaponSwitches = document.getElementById('shop-weapon-switches');
    if (shopWeaponSwitches) shopWeaponSwitches.innerHTML = weaponSwitchHTML;

    // 3. Életerő frissítése
    let maxHP = typeof skills !== 'undefined' ? 100 + (skills.maxHealth.level * 20) : 100;
    const shopHealthDisplay = document.getElementById('shop-health-display');
    if (shopHealthDisplay) {
        let healthPercent = Math.max(0, Math.floor((playerHealth / maxHP) * 100));
        shopHealthDisplay.innerText = `${Math.floor(playerHealth)} / ${maxHP} HP`;
        shopHealthDisplay.style.color = healthPercent < 50 ? '#ff0000' : '#00ff00';
    }

    if(typeof updateUI === 'function') updateUI();

  
    const infNum = document.getElementById('infection-number');
    if (infNum) {
    infNum.innerHTML = Math.floor(playerInfection) + '%';
    
    // Szín változtatása a veszélyesség alapján
    if (playerInfection < 30) {
        infNum.style.color = '#00ff00'; // Biztonságos zöld
        infNum.style.textShadow = '0 0 5px #00ff00';
    } else if (playerInfection < 70) {
        infNum.style.color = '#ffaa00'; // Figyelmeztető sárga
        infNum.style.textShadow = '0 0 8px #ffaa00';
    } else {
        infNum.style.color = '#ff0000'; // Kritikus piros
        infNum.style.textShadow = '0 0 15px #ff0000';
    }
    }

    // 2. Kártya Generáló Függvény (JAVÍTVA)
    function getBtnHTML(name, imageUrl, stat, price) {
        let imageHTML = imageUrl ? `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: contain;">` : '';
        return `
            <div class="item-header">
                <span class="item-name">${name}</span>
                <div class="item-icon-box" style="width: 40px; height: 30px; background: transparent; border: none;">${imageHTML}</div>
            </div>
            <div class="item-stat">${stat}</div>
            <div class="item-price">${price}</div>
        `;
    }

    // 1. FEGYVEREK 
    const weaponsData = [
        { id: 'pistol', name: 'OMNICORP PISZTOLY', basePrice: 200, image: weapons.pistol.image },
        { id: 'shotgun', name: 'SÖRÉTES PUSKA', basePrice: 500, image: weapons.shotgun.image },
        { id: 'rifle', name: 'GÉPKARABÉLY', basePrice: 1000, image: weapons.rifle.image },
        { id: 'super', name: 'NEHÉZ REVOLVER', basePrice: 5000, image: weapons.super.image }
    ];

    weaponsData.forEach(wData => {
        let btn = document.getElementById(`buy-${wData.id}`);
        if (!btn) return;
        let wp = weapons[wData.id];
        
        let nextLevelDesc = "";
        if (wp.level === 1) nextLevelDesc = "+50% Tartalék Lőszer";
        else if (wp.level === 2) nextLevelDesc = "-25% Újratöltési Idő";
        else if (wp.level === 3) nextLevelDesc = "+50% Tárkapacitás";
        else if (wp.level === 4) nextLevelDesc = "Páncéltörő (+100% Sebzés)";
        
        if (!wp.owned) { 
            btn.innerHTML = getBtnHTML(wData.name, wData.image, "ÁLLAPOT: ZÁROLVA", `ENGEDÉLYEZÉS: ${wData.basePrice} CR`); 
            btn.disabled = score < wData.basePrice; 
        } else if (wp.level < 5) { 
            let upgPrice = wData.basePrice * wp.level;
            btn.innerHTML = getBtnHTML(wData.name, wData.image, `FEJLETTSÉG: LVL <span style="color:#fff;">${wp.level}</span> ➔ <span style="color:#00ffff;">${wp.level+1}</span><br><span style="color:#00ffff; font-size: 12px;">BÓNUSZ: ${nextLevelDesc}</span>`, `KALIBRÁCIÓ: ${upgPrice} CR`); 
            btn.disabled = score < upgPrice;
        } else { 
            btn.innerHTML = getBtnHTML(wData.name, wData.image, "ÁLLAPOT: MAX SZINT (LVL 5)", "---"); 
            btn.disabled = true; 
        }
        btn.onclick = () => upgradeWeapon(wData.id, wData.basePrice);
    });

    // 2. KÉPESSÉGEK (Augmentációk)
    const skillsData = [
        { id: 'maxHealth', name: 'SZÖVET SŰRŰSÍTŐ', desc: '+20% Max HP', image: "" },
        { id: 'speed', name: 'CYBER LÁB', desc: '+20% Sebesség', image: "" },
        { id: 'ammoLoot', name: 'LŐSZER ZSEB', desc: '+20% Max Tartalék', image: "" },
        { id: 'healthLoot', name: 'NANOBOTOK', desc: '+20% Gyógyulás', image: "" },
        { id: 'revive', name: 'AUTOMATA DEFIBRILLÁTOR', desc: 'Újraélesztés + 40% Fertőzés Tisztítás', image: "" },
        { id: 'freeze', name: 'CRYO-OVERRIDE', desc: '+2 mp Rendszeridő', image: "" }
    ];

    skillsData.forEach(sData => {
        let btn = document.getElementById(`skill-${sData.id}`);
        if (!btn) return;
        let s = skills[sData.id];
        
        if (s.level < s.maxLevel) { 
            let upgPrice = s.baseCost * (s.level + 1);
            
            // --- EGYEDI SZÖVEGEZÉS KÉPESSÉGENKÉNT ---
            let levelText = `FEJLETTSÉG: LVL <span style="color:#fff;">${s.level}</span> / ${s.maxLevel}`;
            let btnActionText = `KALIBRÁCIÓ: ${upgPrice} CR`; // Alapértelmezett gomb szöveg
            
            if (sData.id === 'revive') {
                levelText = `AKTÍV TÖLTÉSEK: <span style="color:#fff;">${s.level} / ${s.maxLevel}</span>`;
                btnActionText = `ÚJRAKALIBRÁLÁS: ${upgPrice} CR`;
            } else if (sData.id === 'freeze') {
                // A te új, lore-barát szöveged a hűtőrendszerhez!
                levelText = `LICENC SZINT: <span style="color:#fff;">${s.level}</span> / ${s.maxLevel}`;
                btnActionText = `HOZZÁFÉRÉS VÉTELE: ${upgPrice} CR`;
            }
            
            btn.innerHTML = getBtnHTML(sData.name, sData.image, `${levelText}<br><span style="color:#00ffff; font-size: 12px;">HATÁS: ${sData.desc}</span>`, btnActionText); 
            btn.disabled = score < upgPrice;
        } else { 
            let maxText = sData.id === 'freeze' ? "JOGOSULTSÁG: MAX (KORLÁTLAN)" : "ÁLLAPOT: MAX SZINT";
            btn.innerHTML = getBtnHTML(sData.name, sData.image, maxText, "---"); 
            btn.disabled = true; 
        }
        btn.onclick = () => upgradeSkill(sData.id);
    });

  // 3. GYORSMŰVELETEK: Lőszer Utánpótlás
    const ammoBtn = document.getElementById('buy-ammo');
    if (ammoBtn) {
        ammoBtn.classList.add('btn-action'); 
        
        // --- JAVÍTÁS: Ellenőrizzük, hogy van-e egyáltalán hely a zsebünkben! ---
        let needsAmmo = false;
        for (let key in weapons) {
            if (weapons[key].owned && weapons[key].reserve < weapons[key].maxReserve) {
                needsAmmo = true; break;
            }
        }

        if (!needsAmmo) {
            // Ha tele van minden, letiltjuk a gombot!
            ammoBtn.innerHTML = getBtnHTML("LŐSZER UTÁNPÓTLÁS", "", "A tartalék kapacitás maximális.", "KÖLTSÉG: 0 CR");
            ammoBtn.disabled = true;
        } else {
            // Ha kell lőszer, mehet a vásárlás!
            ammoBtn.innerHTML = getBtnHTML("LŐSZER UTÁNPÓTLÁS", "", "+25% Tartalék minden fegyverbe", "KÖLTSÉG: 50 CR");
            ammoBtn.disabled = (score < 50);
        }

    ammoBtn.onclick = () => {
            if (needsAmmo && score >= 50) { 
                score -= 50; 
                playSound('pickup'); // <--- ÚJ HANG
                if (typeof giveGlobalAmmo === 'function') giveGlobalAmmo(); 
                updateShopButtons(); 
            } else flashMoneyError();
        };
    }

    // 4. GYORSMŰVELETEK: Gen-Stab Vásárlás
    const medkitBtn = document.getElementById('buy-medkit');
    if (medkitBtn) {
        medkitBtn.classList.add('btn-heal'); 
        let medkitCost = 100;
        
        if (typeof playerMedkits !== 'undefined' && playerMedkits >= maxMedkits) {
            medkitBtn.innerHTML = getBtnHTML("GEN-STAB KÉSZLET", "", "Injekciós rekesz kapacitása maximális.", "KÖLTSÉG: 0 CR");
            medkitBtn.disabled = true;
        } else {
            let healAmount = typeof skills !== 'undefined' ? 40 * (1 + (skills.healthLoot.level * 0.2)) : 40;
            medkitBtn.innerHTML = getBtnHTML("GEN-STAB SZINTÉZIS", "", `Gyors-gyógyítás (+${healAmount} HP). Rekesz: ${playerMedkits}/${maxMedkits}`, `KÖLTSÉG: ${medkitCost} CR`);
            medkitBtn.disabled = (score < medkitCost);
        }
        
    medkitBtn.onclick = () => {
            if (playerMedkits < maxMedkits && score >= medkitCost) {
                score -= medkitCost; 
                playerMedkits++; 
                playSound('pickup'); // <--- ÚJ HANG
                updateShopButtons(); 
            } else flashMoneyError();
        };
    }

    // 5. GYORSMŰVELETEK: Instant Gyógyászati Protokoll (Marad a régi)
    const healBtn = document.getElementById('buy-health');
    if (healBtn) {
        healBtn.classList.add('btn-heal'); 
        let maxHealthVal = typeof skills !== 'undefined' ? 100 + (skills.maxHealth.level * 20) : 100;
        let missingHP = maxHealthVal - playerHealth;
        let healCost = Math.ceil(missingHP * 2); 
        
        if (missingHP <= 0) {

            healBtn.innerHTML = getBtnHTML("BIOLÓGIAI HELYREÁLLÍTÁS", "", "A klóntest állapota stabil (100%).", "KÖLTSÉG: 0 CR");
            healBtn.disabled = true;
        } else {

            healBtn.innerHTML = getBtnHTML(`BIOLÓGIAI HELYREÁLLÍTÁS (+${Math.floor(missingHP)} HP)`, "", "Azonnali, teljes sejtszintű regeneráció.", `KÖLTSÉG: ${healCost} CR`);
            healBtn.disabled = (score < healCost);
        }
        
        healBtn.onclick = () => {
            if (missingHP > 0 && score >= healCost) {
                score -= healCost; playerHealth = maxHealthVal; 
                if (typeof playSound === 'function') playSound('heal');
                const healFlash = document.getElementById('heal-flash');
                if (healFlash) { healFlash.style.opacity = 1; setTimeout(() => healFlash.style.opacity = 0, 300); }
                updateShopButtons(); 
            } else flashMoneyError();
        };
    }

    // FERTŐZÉS frissítése a boltban
    const shopInfDisplay = document.getElementById('shop-infection-display');
    if (shopInfDisplay && typeof playerInfection !== 'undefined') {
        let inf = Math.floor(playerInfection);
        shopInfDisplay.innerText = `${inf}%`;
        if (inf < 30) {
            shopInfDisplay.style.color = '#00ff00'; shopInfDisplay.style.textShadow = '0 0 10px #00ff00';
        } else if (inf < 70) {
            shopInfDisplay.style.color = '#ffaa00'; shopInfDisplay.style.textShadow = '0 0 10px #ffaa00';
        } else {
            shopInfDisplay.style.color = '#ff0000'; shopInfDisplay.style.textShadow = '0 0 15px #ff0000';
        }
    }

    // --- KEVLÁR PÁNCÉL VÁSÁRLÁSA ---
    const armorBtn = document.getElementById('buy-armor');
    if (armorBtn) {
        armorBtn.classList.add('btn-action'); 
        let armorCost = 40; // Legyen 40 Credit 25 páncélért (így a 100 páncél 160 Creditbe fog kerülni)
        let maxArmor = 100; // Maximum 100 páncélod lehet
        let missingArmor = maxArmor - playerArmor;
        
        if (missingArmor <= 0) {
            armorBtn.innerHTML = getBtnHTML("KEVLÁR PÁNCÉL", "", "A páncélzat sértetlen.", "KÖLTSÉG: 0 CR");
            armorBtn.disabled = true;
        } else {
            // Ad 25 páncélt, vagy amennyi még hiányzik a 100-hoz
            let armorGain = Math.min(25, missingArmor);
            
            // JAVÍTÁS: Kényszerített sortörés (<br>) a szöveg közepén, hogy sose csússzon szét a kártya!
            armorBtn.innerHTML = getBtnHTML("KEVLÁR PÁNCÉL", "", `Pajzs generálása (+${Math.floor(armorGain)} AP).<br>Készlet: ${Math.floor(playerArmor)} / ${maxArmor}`, `KÖLTSÉG: ${armorCost} CR`);
            
            armorBtn.disabled = (score < armorCost);
        }
        
        armorBtn.onclick = () => {
            if (playerArmor < maxArmor && score >= armorCost) {
                score -= armorCost; 
                playerArmor = Math.min(maxArmor, playerArmor + 25);
                playSound('pickup'); // <--- ÚJ HANG
                updateShopButtons(); 
            } else flashMoneyError();
        };
    }

    // 6. GYORSMŰVELETEK: Sterilizálás
    const puddleCountDisplay = document.getElementById('puddle-count');
    if (puddleCountDisplay) puddleCountDisplay.innerText = toxicPuddles.length;

    const cleanBtn = document.getElementById('buy-clean');
    if (cleanBtn) {
        cleanBtn.classList.add('btn-action'); 
        let amountToClean = Math.min(10, toxicPuddles.length); 
        let cost = amountToClean * 10; 
        
        if (toxicPuddles.length === 0) {
            // ÉS IDE IS ÜRES STRING ("") !
            cleanBtn.innerHTML = getBtnHTML("STERILIZÁLÁS PROTOKOLL", "", "A Szektor mentes minden biomasszától.", "KÖLTSÉG: 0 CR");
            cleanBtn.disabled = true;
        } else {
            cleanBtn.innerHTML = getBtnHTML(`STERILIZÁLÁS (${amountToClean} db)`, "", "Toxikus biomassza megsemmisítése a területen.", `KÖLTSÉG: ${cost} CR`);
            cleanBtn.disabled = (score < cost);
        }
       
        
        cleanBtn.onclick = () => {
            if (toxicPuddles.length > 0 && score >= cost) {
                score -= cost;
                for (let i = 0; i < amountToClean; i++) {
                    let oldestPuddle = toxicPuddles.shift(); 
                    scene.remove(oldestPuddle);
                    oldestPuddle.geometry.dispose(); 
                }
                updateToxicFog();
                if (typeof playSound === 'function') playSound('heal');
                updateShopButtons(); 
            } else {
                flashMoneyError();
            }
        };
    }
}

// Alap UI frissítés (Modern, Minimalista AAA HUD)
window.updateUI = function() {
    // 1. ÉLETERŐ ÉS PÁNCÉL FRISSÍTÉSE (Bal alsó sarok)
    let maxHP = 100 + (skills.maxHealth.level * 20);
    

// Szám és Medkitek frissítése a HUD-on
    const healthNum = document.getElementById('health-number');
    if (healthNum) {
        // Most már CSAK magát a HP számot írjuk be!
        healthNum.innerHTML = Math.max(0, Math.floor(playerHealth));
    }
    
    // Medkit külön kezelése az új azonosító alapján
    const medkitCounter = document.getElementById('medkit-counter');
    if (medkitCounter) {
        if (playerMedkits > 0) {
            medkitCounter.style.display = 'inline-block';
            medkitCounter.innerText = `[+${playerMedkits}]`;
        } else {
            medkitCounter.style.display = 'none'; // Eltüntetjük, ha nincs nálunk
        }
    }
    
    if(armorFill) armorFill.style.width = Math.max(0, playerArmor) + '%';
  
    // FERTŐZÉS FRISSÍTÉSE AZONNAL
    const infNum = document.getElementById('infection-number');
    if (infNum && typeof playerInfection !== 'undefined') {
        infNum.innerHTML = Math.floor(playerInfection) + '%';
        if (playerInfection < 30) {
            infNum.style.color = '#00ff00'; infNum.style.textShadow = '0 0 5px #00ff00';
        } else if (playerInfection < 70) {
            infNum.style.color = '#ffaa00'; infNum.style.textShadow = '0 0 8px #ffaa00';
        } else {
            infNum.style.color = '#ff0000'; infNum.style.textShadow = '0 0 15px #ff0000';
        }
    }

// 2. BÓNUSZ IDŐZÍTŐ ÉS KREDIT PANEL KIJELZÉSE (Fent Középen)
    const bonusPanel = document.getElementById('bonus-panel');
    const timerDisplay = document.getElementById('timer-display');
    const bonusDisplay = document.getElementById('bonus-display');

    if (bonusPanel && timerDisplay && bonusDisplay) {
        if (isWaveActive) {
            bonusPanel.classList.remove('hidden'); // Megjelenítjük a szép kék keretes panelt
            
            // Idő számolása (Szünetek levonásával)
            let waveDuration = (clock.getElapsedTime() - waveStartTime) - totalPausedTime;
            let parTime = enemiesToSpawn * 4; 
            let timeLeft = Math.max(0, parTime - waveDuration);
            
            let seconds = Math.floor(timeLeft);
            let millis = Math.floor((timeLeft - seconds) * 10);
            
            // Jelenlegi (másodperc alapú) bónusz kredit kiszámolása!
            let currentBonusCR = seconds * 10;
            
            // Szövegek frissítése
            timerDisplay.innerText = `00:${seconds < 10 ? '0'+seconds : seconds}.${millis}`;
            bonusDisplay.innerText = `+${currentBonusCR} CR`;
            
            // Színezés az idő fogyása alapján
            if (timeLeft > parTime * 0.5) {
                // Még bőven van idő (Fehér idő, Sárga pénz)
                timerDisplay.style.color = '#fff';
                timerDisplay.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
                bonusDisplay.style.color = '#ffcc00';
                bonusDisplay.style.textShadow = '0 0 10px rgba(255, 204, 0, 0.8)';
            }
            else if (timeLeft > 0) {
                // Kezd kifutni az időből (Sárga idő, Narancs pénz)
                timerDisplay.style.color = '#ffaa00';
                timerDisplay.style.textShadow = '0 0 10px rgba(255, 170, 0, 0.8)';
                bonusDisplay.style.color = '#ff8800';
                bonusDisplay.style.textShadow = '0 0 10px rgba(255, 136, 0, 0.8)';
            }
            else { 
                // Lejárt az idő (0 CR)
                timerDisplay.innerText = `00:00.0`; 
                timerDisplay.style.color = '#ff0000'; 
                timerDisplay.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.8)';
                bonusDisplay.innerText = `+0 CR`;
                bonusDisplay.style.color = '#555'; // Szürke, elvesztett pénz
                bonusDisplay.style.textShadow = 'none';
            }

        } else {
            // Ha a harcnak vége (pl. a liftben vagy a menüben vagyunk), elrejtjük a keretet
            bonusPanel.classList.add('hidden');
        }
    }

    // 3. FEGYVER HUD FRISSÍTÉSE (Jobb alsó sarok)
    let w = weapons[currentWeaponId];
    
  
    const weaponIcon = document.getElementById('weapon-icon-display');
    if(weaponIcon) {
        // Szöveg helyett most már a fegyver gyönyörű, átlátszó képe jelenik meg, kap egy kis ciánkék árnyékot (glow) is!
        weaponIcon.innerHTML = `<img src="${w.image}" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 5px rgba(0,255,255,0.8));">`;
    }
    
    const ammoClip = document.getElementById('ammo-clip');
    const ammoReserve = document.getElementById('ammo-reserve');
    
    if(ammoClip) {
        ammoClip.innerText = w.ammo;
        // Ha a tár üres, rikító piros
        if (w.ammo === 0) {
            ammoClip.style.color = '#ff0000';
            ammoClip.style.textShadow = '0 0 15px rgba(255,0,0,1)';
        } 
        // Ha 30% alatt van, narancs
        else if (w.ammo <= w.maxAmmo * 0.3) {
            ammoClip.style.color = '#ffaa00';
            ammoClip.style.textShadow = '0 0 10px rgba(255,170,0,0.8)';
        } 
        // Egyébként gyönyörű ciánkék
        else {
            ammoClip.style.color = '#00ffff';
            ammoClip.style.textShadow = '0 2px 10px rgba(0,255,255,0.5)';
        }
    }
    
    if(ammoReserve) ammoReserve.innerText = w.reserve;
}

// --- ÚJ: DIREKTÍVA HUD FRISSÍTÉSE ---
    const dirHud = document.getElementById('directive-hud');
    if (dirHud && playerStats.activeDirective && gameState === 'PLAYING') {
        dirHud.classList.remove('hidden');
        
        // Megkeressük az aktív direktíva adatait
        let activeData = null;
        ['tier1', 'tier2', 'tier3'].forEach(tier => {
            let found = OmniCorpDirectives[tier].find(d => d.id === playerStats.activeDirective);
            if (found) activeData = found;
        });

        if (activeData) {
            document.getElementById('directive-title').innerText = activeData.title;
            const progDisplay = document.getElementById('directive-progress');
            
            // Ha kész, villogjon zölden!
            if (playerStats.directiveProgress >= activeData.goal) {
                progDisplay.innerText = "TELJESÍTVE!";
                progDisplay.style.color = "#00ff00";
            } else {
                progDisplay.innerText = `${playerStats.directiveProgress} / ${activeData.goal}`;
                progDisplay.style.color = "#ffaa00";
            }
        }
    } else if (dirHud) {
        dirHud.classList.add('hidden'); // Ha nincs küldetés, elrejtjük
    }

window.showHitmarker = function(isHeadshot) {
    hitmarker.classList.remove('hidden');
    setTimeout(() => hitmarker.classList.add('hidden'), 100);
    if (isHeadshot) { hsMsg.classList.remove('hidden'); hsMsg.classList.remove('headshot-anim'); void hsMsg.offsetWidth; hsMsg.classList.add('headshot-anim'); }
}

document.getElementById('switch-weapon-btn').addEventListener('touchstart', handleWeaponSwitch);
document.getElementById('switch-weapon-btn').addEventListener('click', handleWeaponSwitch);

function handleWeaponSwitch(e) {
    if(e) e.preventDefault();
    const keys = Object.keys(weapons);
    let currIdx = keys.indexOf(currentWeaponId);
    let nextIdx = currIdx;
    do {
        nextIdx = (nextIdx + 1) % keys.length;
    } while (!weapons[keys[nextIdx]].owned && nextIdx !== currIdx);
    
    currentWeaponId = keys[nextIdx];
    isReloading = false;
    document.getElementById('reload-text').classList.add('hidden');
    updateUI();
}

document.getElementById('start-game-btn').addEventListener('click', (e) => {
    e.preventDefault();
    
    // Teljes képernyő és Egér bezárás (Biztonságosan, hogy ne omoljon össze a kód)
    let elem = document.documentElement;
    try {
        if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log("Fullscreen hiba:", err));
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        
        // Csak akkor zárjuk be az egeret, ha nem mobilon vagyunk
        if (window.innerWidth > 768) {
            document.body.requestPointerLock();
        }
    } catch (err) {
        console.warn("Pointer lock figyelmeztetés:", err);
    }
    // --- ÚJ: FADE ÁTMENET ÉS ELALVÁS ---
    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) fadeOverlay.style.opacity = '1';

    // Menü zene leállítása, hogy a sötétségben csend legyen
    if (typeof sounds !== 'undefined' && sounds['menuMusic'] && sounds['menuMusic'].isPlaying) {
        sounds['menuMusic'].stop();
    }
    
    // Várunk 1.5 másodpercet amíg a képernyő teljesen fekete lesz
    setTimeout(() => {
// UI és Állapot Frissítés (Már a sötétség alatt történik)
        currentDifficulty = selectedDifficulty; // Az új gombos változót használjuk!
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('game-ui-wrapper').classList.remove('hidden');
        
        yaw = 0; pitch = 0; moveX = 0; moveZ = 0;
        if (camera) camera.position.set(0, 1.6, 0);

        if(typeof unlockAudio === 'function') unlockAudio();
        if(typeof startGame === 'function') startGame();

        // Kivilágosodás ("Ébredés")
        setTimeout(() => {
            if (fadeOverlay) fadeOverlay.style.opacity = '0';
        }, 500); // Fél másodpercet töltünk a teljes sötétben, mielőtt kinyitnánk a szemünk
        
    }, 1500);
});

document.getElementById('restart-btn').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-ui-wrapper').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    
    // --- TAKARÍTÁS ÚJRAINDÍTÁSKOR ---
    document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
    if (typeof playerInfection !== 'undefined') playerInfection = 0;
    if (typeof druggedTimer !== 'undefined') druggedTimer = 0;
    if (typeof sounds !== 'undefined' && sounds['whispers'] && sounds['whispers'].isPlaying) {
        sounds['whispers'].stop(); // Suttogás kikapcsolása
    }
    
    gameState = 'MENU';

    // Zenék cseréje
    if (typeof sounds !== 'undefined' && sounds['music'] && sounds['music'].isPlaying) sounds['music'].stop();
    if (typeof sounds !== 'undefined' && sounds['menuMusic'] && sounds['menuMusic'].buffer && !sounds['menuMusic'].isPlaying) sounds['menuMusic'].play();
});

// --- ÚJ: PAJZS IKON MEGJELENÍTÉSE ---
window.showShieldIcon = function(shieldType) {
    const shieldIcon = document.getElementById('shield-icon');
    if (!shieldIcon) return;

    shieldIcon.classList.remove('hidden');
    
    // Színezés a pocsolya állapota alapján
    if (shieldType === 'ready') shieldIcon.style.filter = 'hue-rotate(150deg) saturate(300%) brightness(150%)'; // Pirosas
    else if (shieldType === 'yellow') shieldIcon.style.filter = 'hue-rotate(220deg) saturate(300%)'; // Sárgás
    else shieldIcon.style.filter = 'hue-rotate(0deg) saturate(200%)'; // Alap (Zöldes)

    // Újraindítjuk az animációt
    shieldIcon.classList.remove('shield-anim'); 
    void shieldIcon.offsetWidth; 
    shieldIcon.classList.add('shield-anim');
}

// ==========================================
// VÁLLALATI DIREKTÍVÁK (SZERZŐDÉS RENDSZER) - BIZTONSÁGOS VERZIÓ
// ==========================================
var omniDirMenu = document.getElementById('directives-menu');
var omniDirContent = document.getElementById('dir-content');
window.omniDirOpenedFrom = 'mainMenu';
window.omniCurrentDirTier = 'info';

// Nyitás a Főmenüből
var omniOpenDirBtn = document.getElementById('open-directives-btn');
if (omniOpenDirBtn) {
    omniOpenDirBtn.addEventListener('click', () => {
        window.omniDirOpenedFrom = 'mainMenu';
        if (typeof mainMenu !== 'undefined' && mainMenu) mainMenu.classList.add('hidden');
        if (omniDirMenu) {
            omniDirMenu.classList.remove('hidden');
            omniDirMenu.style.display = 'flex';
        }
        renderDirectivesTab('info');
    });
}

// ==========================================
// DIREKTÍVÁK MENÜ BEZÁRÁSA (OKOS GOMB)
// ==========================================
var omniCloseDirBtn = document.getElementById('close-directives-btn');
if (omniCloseDirBtn) {
    omniCloseDirBtn.addEventListener('click', () => {
        // 1. Bezárjuk a Direktíva ablakot
        if (omniDirMenu) {
            omniDirMenu.classList.add('hidden');
            omniDirMenu.style.display = 'none';
        }
        
        // 2. Visszatérünk oda, ahonnan jöttünk
        if (window.omniDirOpenedFrom === 'mainMenu') {
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) mainMenu.classList.remove('hidden');
        } 
        else if (window.omniDirOpenedFrom === 'shopMenu') {
            const shopMenu = document.getElementById('shop-menu');
            if (shopMenu) shopMenu.classList.remove('hidden');
            if (typeof updateShopButtons === 'function') updateShopButtons();
        } 
        else if (window.omniDirOpenedFrom === 'pauseMenu') { 
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) pauseMenu.classList.remove('hidden'); 
        }
    });
}


// Fül váltás logika
document.querySelectorAll('.dir-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.dir-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        window.omniCurrentDirTier = e.target.getAttribute('data-tier');
        renderDirectivesTab(window.omniCurrentDirTier);
    });
});

// A Lista Generálása
window.renderDirectivesTab = function(tier) {
    if (!omniDirContent) return;
    omniDirContent.innerHTML = '';
    
    // FŐCÍMEK DINAMIKUS ÁTÍRÁSA A LORE-HOZ
    const dirHeader = document.querySelector('#directives-menu .terminal-header');
    const dirSub = document.querySelector('#directives-menu .terminal-sub');
    if (dirHeader) dirHeader.innerText = "KRONOS TELEMETRIAI RENDSZER";
    if (dirSub) dirSub.innerText = "TERMINUS BÁNYÁSZATI ÉS KUTATÓÁLLOMÁS";

    // 1. ÁTTEKINTÉS (LORE) FÜL
    if (tier === 'info') {
        omniDirContent.innerHTML = `
            <div style="display: flex; gap: 20px;">
                <div style="flex: 1;">
                    <img src="https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff41de37442c16e94662d821116944b11451530/lore_kronos.jpeg" style="width: 100%; border: 2px solid #00ffff; box-shadow: 0 0 15px rgba(0,255,255,0.3); border-radius: 5px;">
                </div>
                <div style="flex: 2; color:#e0ffff; font-size:16px; line-height:1.6; font-family: 'Share Tech Mono', monospace;">
                    <h3 style="color:#00ffff; margin-bottom: 5px; margin-top: 0;">[ RENDSZERÜZENET ]</h3>
                    <span style="color:#00ffff; font-weight:bold;">KRONOS AI:</span> A Terminus Állomás lezárása aktív. A zsilipkapuk feloldásához a protokoll harci telemetriát követel a Verdant anomáliákról. A sikeres adatszerzésért a rendszer túlélési csomagokat (CR) hagy jóvá.<br><br>
                    <span style="color:#ffaa00; font-weight:bold;">GALLAGHER:</span> "ECHO, én vagyok az! A gép megőrült. Nem enged tovább a szektorokban, amíg nem hajtod végre a 'tesztjeit'. Próbálom meghekkelni a kvótákat a vezérlőből, hogy túlélhesd. Végezd el a feladatokat, és kinyitom a következő ajtót!"<br><br>
                    <span style="color:#ff5555; font-weight: bold;">KRONOS BIZTONSÁGI RENDSZER:</span> Egy folyamatban lévő protokoll megszakítása a szerződés végleges törlését vonja maga után. A Mélyszinti szektorok (BÉTA, OMEGA) kizárólag megfelelő mennyiségű adat feltöltése után nyílnak meg.
                </div>
            </div>
            
            <div style="margin-top: 30px; border: 1px solid #00ffff; padding: 15px; background: rgba(0,30,30,0.6); box-shadow: inset 0 0 10px rgba(0,255,255,0.1);">
                <h4 style="color:#fff; margin-bottom:10px; margin-top:0;">KRONOS ADATKAPCSOLAT: FOLYAMATBAN LÉVŐ TESZT</h4>
                <div id="active-dir-display"></div>
            </div>
        `;
        renderActiveDirectiveBox();
        return;
    }

   // 2. KÜLDETÉSEK LISTÁZÁSA ÉS ZÁROLÁS
    let isTierUnlocked = true;
    let lockReasonKronos = "";
    let lockReasonGallagher = "";

    let wave = typeof currentWave !== 'undefined' ? currentWave : 1;

    if (tier === 'tier2') {
        if (wave < 34 || playerStats.completedDirectives.length < 9) {
            isTierUnlocked = false; 
            lockReasonKronos = "ELÉGTELEN BIZTONSÁGI SZINT (KÖVETELMÉNY: 34. HULLÁM ÉS 9 ALFA ADATCSOMAG).";
            lockReasonGallagher = "\"ECHO, még nem tudom átverni a tűzfalat! Juss mélyebbre, és csinálj meg még pár Alfa szintű tesztet, hogy feltörhessem a Béta zsilipet!\"";
        }
    } 
    else if (tier === 'tier3') {
        if (wave < 67 || playerStats.completedDirectives.length < 20) {
            isTierUnlocked = false; 
            lockReasonKronos = "ELÉGTELEN BIZTONSÁGI SZINT (KÖVETELMÉNY: 67. HULLÁM ÉS 20 ADATCSOMAG).";
            lockReasonGallagher = "\"A Magot védő pajzs áttörhetetlen! Túl kevés adatunk van. Éld túl a 67. szektorig, és gyűjts be minden korábbi tesztet!\"";
        }
    }

    if (!isTierUnlocked) {
        omniDirContent.innerHTML = `
            <div style="text-align: center; margin-top: 50px; font-family: 'Share Tech Mono', monospace;">
                <span style="color:#f00; font-size: 28px; font-weight: bold; text-shadow: 0 0 15px #f00;">ZSILIP ZÁROLVA</span><br><br>
                <span style="color:#ff5555; font-size: 18px;">[ KRONOS AI ]: EZ A SZEKTOR JELENLEG TITKOSÍTVA VAN.</span><br><br>
                <span style="color:#aaa; font-size: 14px;">${lockReasonKronos}</span><br><br>
                <div style="margin-top: 30px; padding: 15px; border-top: 1px dashed #ffaa00; display: inline-block; max-width: 80%;">
                    <span style="color:#ffaa00; font-style: italic;">GALLAGHER: ${lockReasonGallagher}</span>
                </div>
            </div>`;
        return;
    }

    let listHTML = `<div style="display:flex; flex-direction:column; gap:15px;">`;
    
    OmniCorpDirectives[tier].forEach(d => {
        let isCompleted = playerStats.completedDirectives.includes(d.id);
        let isAbandoned = playerStats.abandonedDirectives.includes(d.id);
        let isActive = (playerStats.activeDirective === d.id);

        let statusText = "";
        let bgColor = "rgba(30, 20, 0, 0.7)";
        let btnHTML = "";

        if (isCompleted) {
            statusText = `<span style="color:#00ff00; font-weight:bold; float:right;">[ ADAT ELKÜLDVE ]</span>`;
            bgColor = "rgba(0, 50, 50, 0.4)"; 
        } else if (isAbandoned) {
            statusText = `<span style="color:#ff5555; font-weight:bold; float:right;">[ PROTOKOLL TÖRÖLVE ]</span>`;
            bgColor = "rgba(50, 0, 0, 0.4)"; 
        } else if (isActive) {
            statusText = `<span style="color:#00ffff; font-weight:bold; float:right;">[ ELEMZÉS: ${playerStats.directiveProgress} / ${d.goal} ]</span>`;
            bgColor = "rgba(0, 60, 60, 0.8)"; 
            
            // JAVÍTÁS: Ha a Szünet menüből jöttünk, a gomb le van tiltva!
            if (window.omniDirOpenedFrom === 'pauseMenu') {
                btnHTML = `<div style="position: absolute; right: 15px; bottom: 15px; color: #ff5555; font-size: 12px; font-weight: bold; border: 1px solid #ff5555; padding: 5px;">[ MÓDOSÍTÁS LETILTVA: HARC FOLYAMATBAN ]</div>`;
            } else {
                btnHTML = `<button class="directive-action-btn directive-abandon-btn" onclick="abandonDirective()">TESZT MEGSZAKÍTÁSA</button>`;
            }
            
        } else {
            // JAVÍTÁS: Ha a Szünet menüből jöttünk, nem lehet új küldetést felvenni!
            if (window.omniDirOpenedFrom === 'pauseMenu') {
                btnHTML = `<div style="position: absolute; right: 15px; bottom: 15px; color: #888; font-size: 12px; font-weight: bold; border: 1px solid #555; padding: 5px;">[ KIVÁLASZTÁS LETILTVA: HARC FOLYAMATBAN ]</div>`;
            } else {
                btnHTML = `<button class="directive-action-btn" onclick="acceptDirective('${d.id}')">PROTOKOLL INDÍTÁSA</button>`;
            }
        }

        listHTML += `
            <div class="directive-card" style="background: ${bgColor};">
                ${statusText}
                <h4>${d.title}</h4>
                <p>${d.desc}</p>
                <div class="reward">JÓVÁHAGYOTT TÚLÉLÉSI KERET: ${d.reward} CR</div>
                ${btnHTML}
            </div>
        `;
    });

    listHTML += `</div>`;
    omniDirContent.innerHTML = listHTML;
}

// Az Áttekintés fülön lévő mini-kijelző
window.renderActiveDirectiveBox = function() {
    let target = document.getElementById('active-dir-display');
    if (!target) return;

    if (!playerStats.activeDirective) {
        target.innerHTML = `<span style="color:#888;">Nincs aktív telemetriai kapcsolat. Indítson el egy tesztet a szintek fülön!</span>`;
        return;
    }

    let activeData = null;
    ['tier1', 'tier2', 'tier3'].forEach(tier => {
        let f = OmniCorpDirectives[tier].find(d => d.id === playerStats.activeDirective);
        if (f) activeData = f;
    });

    if (activeData) {
        target.innerHTML = `
            <div style="color:#00ffff; font-size: 20px;">${activeData.title}</div>
            <div style="color:#ccc; margin-top: 10px; margin-bottom: 10px;">${activeData.desc}</div>
            <div style="color:#ffaa00; font-weight:bold; border-top: 1px dashed #005555; padding-top: 10px;">ADATFELDOLGOZÁS: ${playerStats.directiveProgress} / ${activeData.goal}</div>
        `;
    }
}

// Szerződés elfogadása
window.acceptDirective = function(id) {
    if (playerStats.activeDirective) {
        alert("Már van egy aktív protokoll! Fejezd be, vagy szakítsd meg előbb!");
        return;
    }
    playerStats.activeDirective = id;
    playerStats.directiveProgress = 0; 
    if (typeof savePlayerStats === 'function') savePlayerStats();
    
    // JAVÍTÁS: A helyes változónevet használjuk a lista frissítéséhez!
    renderDirectivesTab(window.omniCurrentDirTier); 
}

// Megszakítás (Gomb)
window.abandonDirective = function() {
    if (playerStats.activeDirective) {
        let overlay = document.getElementById('confirm-abandon-overlay');
        if (overlay) overlay.style.display = 'flex';
    }
}

// Visszavonás (Mégse gomb)
window.cancelAbandon = function() {
    const overlay = document.getElementById('confirm-abandon-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Tényleges Törlés
window.executeAbandon = function() {
    const overlay = document.getElementById('confirm-abandon-overlay');
    if (overlay) overlay.style.display = 'none';
    
    if (playerStats.activeDirective) {
        playerStats.abandonedDirectives.push(playerStats.activeDirective);
        playerStats.activeDirective = null;
        playerStats.directiveProgress = 0;
        
        // --- KRONOS BÜNTETÉS AKTIVÁLÁSA ---
        shopLockedForNextWave = true; 
        
        if (typeof savePlayerStats === 'function') savePlayerStats();
        
        // JAVÍTÁS: A helyes változónevet használjuk a lista frissítéséhez!
        renderDirectivesTab(window.omniCurrentDirTier); 
    }
}

// Terminálon belüli direktíva gomb nyitása
var omniTabDirIngameBtn = document.getElementById('tab-directives');
if (omniTabDirIngameBtn) {
    omniTabDirIngameBtn.addEventListener('click', () => {
        window.omniDirOpenedFrom = 'shopMenu';
        if (typeof shopMenu !== 'undefined' && shopMenu) shopMenu.classList.add('hidden');
        if (omniDirMenu) {
            omniDirMenu.classList.remove('hidden');
            omniDirMenu.style.display = 'flex';
        }
        
        document.querySelectorAll('.dir-tab-btn').forEach(b => b.classList.remove('active'));
        let infoTab = document.querySelector('.dir-tab-btn[data-tier="info"]');
        if (infoTab) infoTab.classList.add('active');
        
        // JAVÍTÁS ITT:
        window.omniCurrentDirTier = 'info';
        renderDirectivesTab('info');
    });
}

// ==========================================
// KÓDEX AUDIO LEJÁTSZÓ RENDSZER
// ==========================================
let currentLoreAudio = null;

function stopLoreAudio() {
    if (currentLoreAudio) {
        currentLoreAudio.pause();
        currentLoreAudio.currentTime = 0;
        currentLoreAudio = null;
    }
}

function playLoreAudio(url) {
    stopLoreAudio(); // Előző hang leállítása
    if (url && url !== "") {
        currentLoreAudio = new Audio(url);
        currentLoreAudio.volume = 0.8; // Hangerő
        currentLoreAudio.play().catch(e => console.warn("Hang lejátszása blokkolva (Kattints a felületre előbb):", e));
    }
}

// AZ ARCHÍVUM BEZÁRÁSA (OKOS GOMB) - Bővítve a hang leállításával!
// JAVÍTÁS: Átneveztem a változót 'archiveCloseElement'-re, így garantáltan nem dob "already declared" hibát!
const archiveCloseElement = document.getElementById('close-archive-btn');
if (archiveCloseElement) {
    archiveCloseElement.addEventListener('click', () => {
        
        stopLoreAudio(); // HA BEZÁRJUK A KÓDEXET, ELHALLGAT A HANG!
        clearInterval(window.typeInterval); // Írógép effekt leállítása

        if (archiveMenu) {
            archiveMenu.classList.add('hidden');
            archiveMenu.style.display = 'none'; 
        }
        
        if (archiveOpenedFrom === 'mainMenu' && mainMenu) {
            mainMenu.classList.remove('hidden');
        } else if (archiveOpenedFrom === 'shopMenu' && shopMenu) {
            shopMenu.classList.remove('hidden');
        } else if (archiveOpenedFrom === 'pauseMenu') { 
            document.getElementById('pause-menu').classList.remove('hidden');
        }
    });
}

// --- LISTA GENERÁLÁSA A KATEGÓRIA ALAPJÁN ---
function renderArchiveList() {
    archiveList.innerHTML = '';
    archiveContent.innerHTML = "<div style='text-align:center; color:#005555; margin-top:20px;'>Válasszon ki egy bejegyzést a dekódoláshoz.</div>";
    
    stopLoreAudio(); // Ha kategóriát váltasz, hallgasson el az előző!

    let dataArray = OmniCorpDatabase[currentArchiveCategory];
    
    if (dataArray) {
        dataArray.forEach(item => {
            let isUnlocked = item.checkUnlock ? item.checkUnlock() : true;
            let statText = item.statInfo ? item.statInfo() : null; 
            let actualText = typeof item.text === 'function' ? item.text() : item.text;
            
            createArchiveButton(item.title, actualText, isUnlocked, item.requirementText, item.image, statText, item.audio);
        });
    }
}

// --- GOMB ÉS OLVASÓ PANEL LÉTREHOZÁSA ---
function createArchiveButton(title, text, isUnlocked, reqText, imageUrl, statText, audioUrl) {
    const btn = document.createElement('button');
    btn.className = 'archive-entry-btn';
    
    if (isUnlocked) {
        btn.innerText = title;
        btn.onclick = () => {
            document.querySelectorAll('.archive-entry-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Hang elindítása, ha van!
            if (audioUrl) {
                playLoreAudio(audioUrl);
            } else {
                stopLoreAudio();
            }
            
            let contentHTML = "";
            
            if (imageUrl) {
                contentHTML += `<div style="display: flex; justify-content: center; margin-bottom: 25px;">
                                   <img src="${imageUrl}" onclick="openLightbox('${imageUrl}')" style="cursor: pointer; max-width: 100%; max-height: 400px; width: auto; border: 2px solid #00ffff; box-shadow: 0 0 20px rgba(0, 255, 255, 0.4); border-radius: 5px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                </div>`;
            }

            if (statText) {
                contentHTML += `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; max-width: 250px; min-height: 180px; margin: 0 auto 25px auto; background: rgba(0, 20, 20, 0.6); padding: 15px; border: 1px solid #00ffff; border-radius: 5px; box-shadow: inset 0 0 15px rgba(0,255,255,0.1);">
                                    ${statText}
                                </div>`;
            }
            
            contentHTML += `<div id="typing-text"></div>`;
            archiveContent.innerHTML = contentHTML;

            let typeTarget = document.getElementById('typing-text');
            let i = 0;
            clearInterval(window.typeInterval);
            
            let typeSpeed = text.length > 500 ? 5 : 15; 
            
            window.typeInterval = setInterval(() => {
                let char = text.charAt(i);
                // JAVÍTÁS: A sortörések (\n) HTML sortöréssé (<br>) alakítása karakterenként
                if (char === '\n') {
                    typeTarget.innerHTML += '<br>';
                } else {
                    typeTarget.innerHTML += char;
                }
                i++;
                if (i >= text.length) clearInterval(window.typeInterval);
            }, typeSpeed); 
        };
    } else {
        btn.classList.add('locked');
        btn.innerText = "██████ [ZÁROLVA]";
        btn.onclick = () => {
            document.querySelectorAll('.archive-entry-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            stopLoreAudio(); 
            clearInterval(window.typeInterval);
            
            archiveContent.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; min-height: 350px; text-align: center; white-space: normal;">
                    <div style="color: #ff0000; font-size: 32px; font-weight: bold; text-shadow: 0 0 15px rgba(255,0,0,0.8); margin-bottom: 20px; letter-spacing: 2px;">
                        BELÉPÉS MEGTAGADVA
                    </div>
                    <div style="color: #ff5555; font-size: 20px; margin-bottom: 30px;">
                        BIZTONSÁGI SZINT ELÉGTELEN.
                    </div>
                    <div style="color: #aaa; font-size: 16px; max-width: 80%; line-height: 1.5; border-top: 1px dashed #550000; padding-top: 20px;">
                        ${reqText}
                    </div>
                </div>
            `;
        };
    }
    archiveList.appendChild(btn);
}

// ==========================================
// SZERZŐDÉS KEZELŐ FÜGGVÉNYEK
// ==========================================

// 1. Szerződés elfogadása
window.acceptDirective = function(id) {
    if (playerStats.activeDirective) {
        // JAVÍTÁS: A csúnya böngészős alert() helyett a mi saját, szép ablakunkat nyitjuk meg!
        const alertBox = document.getElementById('custom-alert-overlay');
        if (alertBox) alertBox.style.display = 'flex';
        return;
    }
    
    playerStats.activeDirective = id;
    playerStats.directiveProgress = 0; 
    
    renderDirectivesTab(window.omniCurrentDirTier); 
}

// 1.5. Saját hibaüzenet bezárása
window.closeCustomAlert = function() {
    const alertBox = document.getElementById('custom-alert-overlay');
    if (alertBox) alertBox.style.display = 'none';
}

// 2. Megszakítás gomb (Csak megnyitja a piros ablakot)
window.abandonDirective = function() {
    if (playerStats.activeDirective) {
        let overlay = document.getElementById('confirm-abandon-overlay');
        if (overlay) overlay.style.display = 'flex';
    }
}

// 3. Visszavonás (Mégse gomb a piros ablakon)
window.cancelAbandon = function() {
    const overlay = document.getElementById('confirm-abandon-overlay');
    if (overlay) overlay.style.display = 'none';
}

// 4. Tényleges Feladás (Piros gomb az ablakon)
window.executeAbandon = function() {
    const overlay = document.getElementById('confirm-abandon-overlay');
    if (overlay) overlay.style.display = 'none';
    
    if (playerStats.activeDirective) {
        playerStats.abandonedDirectives.push(playerStats.activeDirective);
        playerStats.activeDirective = null;
        playerStats.directiveProgress = 0;
        
        // --- ÚJ: KRONOS BÜNTETÉS AKTIVÁLÁSA ---
        // A következő hullám végén zárva lesz a bolt!
        if (typeof shopLockedForNextWave !== 'undefined') {
            shopLockedForNextWave = true; 
        }
        
        // JAVÍTVA: Frissítjük a kártyákat
        renderDirectivesTab(window.omniCurrentDirTier); 
    }
}

// --- ÚJ: FŐMENÜ NEHÉZSÉG VÁLASZTÓ LOGIKA ---
let selectedDifficulty = 'medium'; // Alapértelmezett

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Leveszi az aktív színt az összesről
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        
        // Ráteszi az aktuálisan kattintottra
        let clickedBtn = e.target.closest('.diff-btn'); // Biztosíték, ha a belső span-ra kattint
        if (clickedBtn) {
            clickedBtn.classList.add('active');
            selectedDifficulty = clickedBtn.getAttribute('data-diff');
        }
    });
});

// ==========================================
// OPCIÓK / IRÁNYÍTÁS MENÜ LOGIKA (AAA VERZIÓ)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const optionsMenu = document.getElementById('options-menu');
    const openOptionsBtn = document.getElementById('open-options-btn');
    const closeOptionsBtn = document.getElementById('close-options-btn');
    const mainMenu = document.getElementById('main-menu');

    // FÜLEK (TABS) KEZELÉSE
    const tabBtns = document.querySelectorAll('.opt-tab-btn');
    const sections = document.querySelectorAll('.opt-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Leveszünk minden aktív stílust
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#00aaaa';
            });
            sections.forEach(s => s.classList.add('hidden'));

            // Aktuális gomb beállítása (OmniCorp stílus)
            e.target.classList.add('active');
            e.target.style.background = '#005555';
            e.target.style.color = '#00ffff';

            // Megfelelő tartalom megjelenítése
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    // Kezdeti gomb stílus (Audio/Video)
    let firstBtn = document.querySelector('.opt-tab-btn[data-target="opt-av"]');
    if(firstBtn) {
        firstBtn.style.background = '#005555';
        firstBtn.style.color = '#00ffff';
    }

    // ABLAK NYITÁSA/ZÁRÁSA
    if (openOptionsBtn && optionsMenu) {
        openOptionsBtn.addEventListener('click', () => {
            if (mainMenu) mainMenu.classList.add('hidden');
            optionsMenu.classList.remove('hidden');
            optionsMenu.style.display = 'flex';
        });
    }

    if (closeOptionsBtn && optionsMenu) {
        closeOptionsBtn.addEventListener('click', () => {
            optionsMenu.classList.add('hidden');
            optionsMenu.style.display = 'none';
            // ÚJ LOGIKA A VISSZATÉRÉSHEZ:
            if (window.openedFromPause) {
                document.getElementById('pause-menu').classList.remove('hidden');
                window.openedFromPause = false;
            } else if (mainMenu) {
                mainMenu.classList.remove('hidden');
            }
        });
    }

    // --- CSÚSZKÁK (SLIDERS) KEZELÉSE ---
    
// --- KILÉPÉS AZ ASZTALRA (QUIT TO DESKTOP) ---
    function quitToDesktop() {
        // Electron.js / Asztali kliens bezárása
        try { window.close(); } catch(e) {}
    }
    
    const quitMainBtn = document.getElementById('quit-desktop-main-btn');
    if(quitMainBtn) quitMainBtn.addEventListener('click', quitToDesktop);
    
    const quitPauseBtn = document.getElementById('quit-desktop-pause-btn');
    if(quitPauseBtn) quitPauseBtn.addEventListener('click', quitToDesktop);


    // --- TELJES KÉPERNYŐ (FULLSCREEN) ---
    const fsBtn = document.getElementById('toggle-fullscreen-btn');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }

    // --- ZENE ÉS HANGEFFEKTEK KÜLÖNVÁLASZTÁSA ---
    const musicSlider = document.getElementById('volume-music-slider');
    const musicVal = document.getElementById('vol-music-val');
    
    if (musicSlider) {
        musicSlider.addEventListener('input', (e) => {
            musicVolume = parseFloat(e.target.value);
            musicVal.innerText = Math.round(musicVolume * 100) + '%';
            
            // Azonnal frissíti a futó zenéket
            if (typeof sounds !== 'undefined') {
                if (sounds['music']) sounds['music'].setVolume(musicVolume);
                if (sounds['menuMusic']) sounds['menuMusic'].setVolume(musicVolume);
            }
        });
    }

    const sfxSlider = document.getElementById('volume-sfx-slider');
    const sfxVal = document.getElementById('vol-sfx-val');
    
    if (sfxSlider) {
        sfxSlider.addEventListener('input', (e) => {
            sfxVolume = parseFloat(e.target.value);
            sfxVal.innerText = Math.round(sfxVolume * 100) + '%';
            
            // Minden más hang, ami NEM zene, megkapja ezt a hangerőt
            if (typeof sounds !== 'undefined') {
                for (let key in sounds) {
                    if (key !== 'music' && key !== 'menuMusic') {
                        sounds[key].setVolume(sfxVolume);
                    }
                }
            }
        });
    }

    // 2. Fényerő (Képernyő filter)
    const brightSlider = document.getElementById('brightness-slider');
    const brightVal = document.getElementById('bright-val');
    if (brightSlider) {
        brightSlider.addEventListener('input', (e) => {
            globalBrightness = parseFloat(e.target.value);
            brightVal.innerText = Math.round(globalBrightness * 100) + '%';
            // Ráhúzzuk a fényerőt az egész dokumentumra
            document.body.style.filter = `brightness(${globalBrightness})`;
        });
    }

    // 3. Egér Érzékenység (A game.js fogja felhasználni)
    const sensSlider = document.getElementById('sensitivity-slider');
    const sensVal = document.getElementById('sens-val');
    if (sensSlider) {
        sensSlider.addEventListener('input', (e) => {
            mouseSensitivity = parseFloat(e.target.value);
            if (mouseSensitivity < 0.002) sensVal.innerText = "Alacsony";
            else if (mouseSensitivity > 0.006) sensVal.innerText = "Magas";
            else sensVal.innerText = "Normál";
        });
    }
});

// ==========================================
// SZÜNET (PAUSE) MENÜ LOGIKA ÉS GOMBOK
// ==========================================
const pauseMenu = document.getElementById('pause-menu');

// 1. VISSZA A HARCBA
const resumeBtn = document.getElementById('resume-btn');
if(resumeBtn) {
    resumeBtn.addEventListener('click', () => {
        if(typeof resumeGame === 'function') resumeGame();
    });
}

// 2. KILÉPÉS A FŐMENÜBE
const quitBtn = document.getElementById('quit-to-main-btn');
if(quitBtn) {
    quitBtn.addEventListener('click', () => {
        pauseMenu.classList.add('hidden');
        document.getElementById('game-ui-wrapper').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        gameState = 'MENU';
        // Zenék cseréje
        if (typeof sounds !== 'undefined' && sounds['music'] && sounds['music'].isPlaying) sounds['music'].stop();
        if (typeof sounds !== 'undefined' && sounds['menuMusic'] && sounds['menuMusic'].buffer && !sounds['menuMusic'].isPlaying) sounds['menuMusic'].play();
    });
}

// 3. BEÁLLÍTÁSOK MEGNYITÁSA PAUSE ALATT
const pauseOptBtn = document.getElementById('pause-options-btn');
if(pauseOptBtn) {
    pauseOptBtn.addEventListener('click', () => {
        pauseMenu.classList.add('hidden'); // Eltüntetjük a pause menüt
        const optMenu = document.getElementById('options-menu');
        if (optMenu) {
            optMenu.classList.remove('hidden');
            optMenu.style.display = 'flex';
        }
        // Beállítjuk, hogy a Vissza gomb a Beállításokban tudja, hova kell visszatérni!
        window.openedFromPause = true; 
    });
}



// 4. KÓDEX MEGNYITÁSA PAUSE ALATT
const pauseCodexBtn = document.getElementById('pause-codex-btn');
if(pauseCodexBtn) {
    pauseCodexBtn.addEventListener('click', () => {
        archiveOpenedFrom = 'pauseMenu'; 
        pauseMenu.classList.add('hidden');
        const archMenu = document.getElementById('archive-menu');
        if (archMenu) {
            archMenu.classList.remove('hidden');
            archMenu.style.display = 'flex';
        }
        // JAVÍTÁS: Átváltunk az Áttekintés fülre és kirajzoljuk!
        document.querySelectorAll('.archive-tab-btn').forEach(b => b.classList.remove('active'));
        let loreBtn = document.querySelector('.archive-tab-btn[data-category="lore"]');
        if (loreBtn) loreBtn.classList.add('active');
        currentArchiveCategory = 'lore';
        if (typeof renderArchiveList === 'function') renderArchiveList();
    });
}

// ==========================================
// FEJLESZTŐI (DEV) MENÜ LOGIKA (BIZTONSÁGOS)
// ==========================================

// BIZTONSÁGOS AKTIVÁLÁS: Csak akkor fusson le, ha tényleg megnyomták a gombot, és az elem létezik!
document.addEventListener('keydown', (e) => {
    if (e.key === '0') {
        const devMenuEl = document.getElementById('dev-menu');
        if (devMenuEl) {
            if (devMenuEl.classList.contains('hidden')) {
                devMenuEl.classList.remove('hidden');
            } else {
                devMenuEl.classList.add('hidden');
            }
        }
    }
});

// A gombok is csak a teljes betöltés után aktívak!
document.addEventListener("DOMContentLoaded", () => {
    const devMenu = document.getElementById('dev-menu');
    const devClose = document.getElementById('dev-close');
    const devMoney = document.getElementById('dev-add-money');
    const devWave = document.getElementById('dev-wave-99');
    const devUnlock = document.getElementById('dev-unlock-all');
    const devGod = document.getElementById('dev-god-mode');

    // Bezáró gomb
    if (devClose && devMenu) {
        devClose.addEventListener('click', () => devMenu.classList.add('hidden'));
    }

   // 2. Pénz adása
    if (devMoney) {
        devMoney.addEventListener('click', () => {
            score += 10000;
            if(typeof updateShopButtons === 'function') updateShopButtons();
            if(typeof updateUI === 'function') updateUI();
            console.log("DEV: +10.000 CR");
            
            // --- VILLANÁS ---
            devMoney.style.background = "#00ffff"; devMoney.style.color = "#000";
            setTimeout(() => { devMoney.style.background = "rgba(0, 50, 50, 0.8)"; devMoney.style.color = "#00ffff"; }, 150);
        });
    }

    // 3. Ugrás a 99. Hullámra
    if (devWave) {
        devWave.addEventListener('click', () => {
            currentWave = 99;
            enemiesToSpawn = 30; // Brutális mennyiségű zombi
            if(typeof playerStats !== 'undefined') playerStats.wavesSurvived = 98; 
            console.log("DEV: Hullám beállítva 99-re!");
            
            // --- VILLANÁS ---
            devWave.style.background = "#00ffff"; devWave.style.color = "#000";
            setTimeout(() => { devWave.style.background = "rgba(0, 50, 50, 0.8)"; devWave.style.color = "#00ffff"; }, 150);
        });
    }

    // 4. Kódex (Archívum) teljes feloldása
    if (devUnlock) {
        devUnlock.addEventListener('click', () => {
            if(typeof playerStats !== 'undefined') {
                const enemies = ['normal', 'runner', 'tank', 'stalker', 'crawler', 'boss', 'alpha'];
                enemies.forEach(e => {
                    if(playerStats.kills[e]) {
                        playerStats.kills[e].body = 50;
                        playerStats.kills[e].head = 50;
                    }
                });
                playerStats.plantsDestroyed = 10;
                playerStats.wavesSurvived = 100;
                console.log("DEV: Minden adatbázis elem feloldva (Level 5)!");
                if (typeof renderArchiveList === 'function') renderArchiveList();
            }
            
            // --- VILLANÁS ---
            devUnlock.style.background = "#00ffff"; devUnlock.style.color = "#000";
            setTimeout(() => { devUnlock.style.background = "rgba(0, 50, 50, 0.8)"; devUnlock.style.color = "#00ffff"; }, 150);
        });
    }

   // 5. God Mode (Sérthetetlenség)
    if (devGod) {
        devGod.addEventListener('click', () => {
            if (typeof isGodMode !== 'undefined') {
                isGodMode = !isGodMode;
                devGod.innerText = isGodMode ? "GOD MODE: BE" : "GOD MODE: KI";
                
                // OmniCorp stílusú színezés váltáskor!
                devGod.style.background = isGodMode ? "#00ffff" : "rgba(50, 0, 0, 0.8)";
                devGod.style.color = isGodMode ? "#000" : "#ff5555";
                devGod.style.borderColor = isGodMode ? "#00ffff" : "#aa0000";
                
                console.log("DEV: God Mode " + (isGodMode ? "BE" : "KI"));
            } else {
                console.error("DEV HIBA: isGodMode változó nem található a state.js-ben!");
            }
        });
    }
});
