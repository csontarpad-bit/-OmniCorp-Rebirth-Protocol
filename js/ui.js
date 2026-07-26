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

// AZ ARCHÍVUM BEZÁRÁSA (OKOS GOMB)
const closeArchiveBtn = document.getElementById('close-archive-btn');
if (closeArchiveBtn) {
    closeArchiveBtn.addEventListener('click', () => {
        if (archiveMenu) {
            archiveMenu.classList.add('hidden');
            archiveMenu.style.display = 'none'; 
        }
        
        if (archiveOpenedFrom === 'mainMenu' && mainMenu) {
            mainMenu.classList.remove('hidden');
        } else if (archiveOpenedFrom === 'shopMenu' && shopMenu) {
            shopMenu.classList.remove('hidden');
        }
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
        // A lore-nak is átadjuk a saját statisztikáját!
        createArchiveButton(OmniCorpDatabase.lore.title, OmniCorpDatabase.lore.text, true, null, OmniCorpDatabase.lore.image, OmniCorpDatabase.lore.statInfo());
    } else {
        let dataArray = OmniCorpDatabase[currentArchiveCategory];
        if (dataArray) {
            dataArray.forEach(item => {
                let isUnlocked = item.checkUnlock ? item.checkUnlock() : true;
                // ÚJ: A 'statInfo' futtatása, ami visszaadja a szöveget a kill/level számokkal!
                let statText = item.statInfo ? item.statInfo() : null; 
                createArchiveButton(item.title, item.text, isUnlocked, item.requirementText, item.image, statText);
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

    // DIREKTÍVA FÜL MEGNYITÁSA
    tabDirectivesBtn.addEventListener('click', () => {
        resetShopTabs();
        tabDirectivesBtn.classList.add('active');
        shopDirectivesDiv.classList.remove('hidden');
        if (typeof renderDirectivesBoard === 'function') renderDirectivesBoard(); // Újrarajzolja a táblát!
    });
}

// --- BOLT MEGNYITÁSA ---
window.openShop = function() {
    gameState = 'SHOPPING'; 
    shopMenu.classList.remove('hidden');
    
    // Szép, zölden világító kiírás, ha kapott bónuszt!
    let bonusText = lastWaveBonus > 0 ? ` <span style="color:#00ff00; font-size:18px;">(+${lastWaveBonus} GYORSASÁGI BÓNUSZ)</span>` : '';
    shopPoints.innerHTML = `${score} CR ${bonusText}`;
    
    if(typeof updateShopButtons === 'function') updateShopButtons();
}

document.getElementById('close-shop-btn').addEventListener('click', () => {
    shopMenu.classList.add('hidden');
    gameState = 'PLAYING'; 
    
    // CSAK PC-n kérjük el az egeret, mobilon ez hibát dobna!
    if (window.innerWidth > 768) {
        try { document.body.requestPointerLock(); } catch(e){}
    }
    
    // ITT CSAK A VISSZASZÁMLÁLÓT INDÍTJUK EL! 
    // Az öregedés már a visszaszámláló BELSŐ logikájában fog lefutni!
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
        w.owned = true;
        w.reserve = w.maxReserve;
        // --- ÚJ: STATISZTIKA (Csak első vásárláskor oldja fel az Adatbázist) ---
        if (typeof playerStats !== 'undefined' && playerStats.weaponsBought) {
            playerStats.weaponsBought[wpnId] = true;
            if (typeof savePlayerStats === 'function') savePlayerStats();
        }
    } else {
        w.level++;
        // Bónuszok szintenként:
        if (w.level === 2) w.maxReserve = Math.floor(w.maxReserve * 1.5);
        if (w.level === 3) w.reloadTime = Math.floor(w.reloadTime * 0.75);
        if (w.level === 4) w.maxAmmo = Math.floor(w.maxAmmo * 1.5);
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


// --- GOMBOK FRISSÍTÉSE (OMNICORP DIZÁJN - INFÓKKAL) ---
window.updateShopButtons = function() {
    let bonusText = lastWaveBonus > 0 ? ` <span style="color:#00ff00; font-size:18px;">(+${lastWaveBonus} BÓNUSZ)</span>` : '';
    shopPoints.innerHTML = `${score} CR${bonusText}`;
    if(typeof updateUI === 'function') updateUI();

    function getBtnHTML(name, stat, price) {
        return `
            <div class="item-header">
                <span class="item-name">${name}</span>
            </div>
            <div class="item-stat">${stat}</div>
            <div class="item-price">${price}</div>
        `;
    }

    // 1. FEGYVEREK 
    const weaponsData = [
        { id: 'pistol', name: 'OMNICORP PISZTOLY', basePrice: 200 },
        { id: 'shotgun', name: 'SÖRÉTES PUSKA', basePrice: 500 },
        { id: 'rifle', name: 'GÉPKARABÉLY', basePrice: 1000 },
        { id: 'super', name: 'NEHÉZ REVOLVER', basePrice: 5000 }
    ];

    weaponsData.forEach(wData => {
        let btn = document.getElementById(`buy-${wData.id}`);
        if (!btn) return;
        let w = weapons[wData.id];
        
        // Szöveg generálása, hogy mit ad a következő szint!
        let nextLevelDesc = "";
        if (w.level === 1) nextLevelDesc = "+50% Tartalék Lőszer";
        else if (w.level === 2) nextLevelDesc = "-25% Újratöltési Idő";
        else if (w.level === 3) nextLevelDesc = "+50% Tárkapacitás";
        else if (w.level === 4) nextLevelDesc = "Páncéltörő (+100% Sebzés)";
        
        if (!w.owned) { 
            // Nincs feloldva
            btn.innerHTML = getBtnHTML(wData.name, "ÁLLAPOT: ZÁROLVA", `ENGEDÉLYEZÉS: ${wData.basePrice} CR`); 
            btn.disabled = score < wData.basePrice; 
        } else if (w.level < 5) { 
            // Fejlesztés
            let upgPrice = wData.basePrice * w.level;
            btn.innerHTML = getBtnHTML(
                wData.name, 
                `FEJLETTSÉG: LVL <span style="color:#fff;">${w.level}</span> ➔ <span style="color:#00ffff;">${w.level+1}</span><br><span style="color:#00ffff; font-size: 12px;">BÓNUSZ: ${nextLevelDesc}</span>`, 
                `KALIBRÁCIÓ: ${upgPrice} CR`
            ); 
            btn.disabled = score < upgPrice;
        } else { 
            // Max szint
            btn.innerHTML = getBtnHTML(wData.name, "ÁLLAPOT: MAX SZINT (LVL 5)", "---"); 
            btn.disabled = true; 
        }
        btn.onclick = () => upgradeWeapon(wData.id, wData.basePrice);
    });

    // 2. KÉPESSÉGEK (Augmentációk)
    const skillsData = [
        { id: 'maxHealth', name: 'KEVLÁR IMPLANT', desc: '+20% Max HP' },
        { id: 'speed', name: 'CYBER LÁB', desc: '+20% Sebesség' },
        { id: 'ammoLoot', name: 'LŐSZER ZSEB', desc: '+20% Max Tartalék' },
        { id: 'healthLoot', name: 'NANOBOTOK', desc: '+20% Gyógyulás' },
        { id: 'revive', name: 'ÚJRAÉLESZTŐ', desc: '+1 Extra Élet' },
        { id: 'freeze', name: 'KRIO-GRÁNÁT', desc: '+2 mp Fagyasztás' }
    ];

    skillsData.forEach(sData => {
        let btn = document.getElementById(`skill-${sData.id}`);
        if (!btn) return;
        let s = skills[sData.id];
        
        if (s.level < s.maxLevel) { 
            let upgPrice = s.baseCost * (s.level + 1);
            // Ha Újraélesztő szérumról van szó, akkor a "raktáron lévő darabot" mutatjuk a szint helyett!
            let levelText = sData.id === 'revive' ? `RAKTÁRON: <span style="color:#fff;">${s.level} DB</span>` : `FEJLETTSÉG: LVL <span style="color:#fff;">${s.level}</span> / ${s.maxLevel}`;
            
            btn.innerHTML = getBtnHTML(
                sData.name, 
                `${levelText}<br><span style="color:#00ffff; font-size: 12px;">HATÁS: ${sData.desc}</span>`, 
                `KALIBRÁCIÓ: ${upgPrice} CR`
            ); 
            btn.disabled = score < upgPrice;
        } else { 
            btn.innerHTML = getBtnHTML(sData.name, "ÁLLAPOT: MAX SZINT", "---"); 
            btn.disabled = true; 
        }
        btn.onclick = () => upgradeSkill(sData.id);
    });


    // 3. GYORSMŰVELETEK: Lőszer Utánpótlás
    const ammoBtn = document.getElementById('buy-ammo');
    if (ammoBtn) {
        ammoBtn.classList.add('btn-action'); 
        ammoBtn.innerHTML = getBtnHTML("LŐSZER UTÁNPÓTLÁS", "+25% Tartalék minden fegyverbe", "KÖLTSÉG: 50 CR");
        ammoBtn.disabled = score < 50;
        ammoBtn.onclick = () => {
            if (score >= 50) { score -= 50; if (typeof giveGlobalAmmo === 'function') giveGlobalAmmo(); updateShopButtons(); } 
            else flashMoneyError();
        };
    }

    // 4. ÚJ GYORSMŰVELET: Életerő Visszatöltés (Max HP-ra!)
    const healBtn = document.getElementById('buy-health');
    if (healBtn) {
        healBtn.classList.add('btn-heal'); 
        // Kiszámoljuk a jelenlegi Max HP-dat
        let maxHP = typeof skills !== 'undefined' ? 100 + (skills.maxHealth.level * 20) : 100;
        let missingHP = maxHP - playerHealth;
        let healCost = Math.ceil(missingHP * 2); // 2 CR / 1 HP arány!
        
        if (missingHP <= 0) {
            healBtn.innerHTML = getBtnHTML("GYÓGYÁSZATI PROTOKOLL", "Maximális egészségügyi állapot.", "KÖLTSÉG: 0 CR");
            healBtn.disabled = true;
        } else {
            healBtn.innerHTML = getBtnHTML(`GYÓGYÍTÁS (+${Math.floor(missingHP)} HP)`, "Sérülések helyreállítása (Max HP)", `KÖLTSÉG: ${healCost} CR`);
            // Csak akkor veheti meg, ha van rá pénze ÉS sérült!
            healBtn.disabled = (score < healCost);
        }
        
        healBtn.onclick = () => {
            if (missingHP > 0 && score >= healCost) {
                score -= healCost;
                playerHealth = maxHP; // Maxra tölt!
                if (typeof playSound === 'function') playSound('heal');
                
                // Zöld felvillanás
                const healFlash = document.getElementById('heal-flash');
                if (healFlash) { healFlash.style.opacity = 1; setTimeout(() => healFlash.style.opacity = 0, 300); }
                
                updateShopButtons(); 
            } else {
                flashMoneyError();
            }
        };
    }

    // 5. GYORSMŰVELETEK: Sterilizálás
    const puddleCountDisplay = document.getElementById('puddle-count');
    if (puddleCountDisplay) puddleCountDisplay.innerText = toxicPuddles.length;

    const cleanBtn = document.getElementById('buy-clean');

    if (cleanBtn) {
        cleanBtn.classList.add('btn-action'); 
        let amountToClean = Math.min(10, toxicPuddles.length); 
        let cost = amountToClean * 10; 
        
        if (toxicPuddles.length === 0) {
            cleanBtn.innerHTML = getBtnHTML("STERILIZÁLÁS PROTOKOLL", "A Szektor mentes minden biomasszától.", "KÖLTSÉG: 0 CR");
            cleanBtn.disabled = true;
        } else {
            // Szöveg javítva: Bármilyen pocsolyát takarít!
            cleanBtn.innerHTML = getBtnHTML(`STERILIZÁLÁS (${amountToClean} db)`, "Toxikus biomassza megsemmisítése a területen.", `KÖLTSÉG: ${cost} CR`);
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

// Alap UI frissítés (Lőszer, HP sáv a játékban)
window.updateUI = function() {
    let maxHP = 100 + (skills.maxHealth.level * 20);
    if(healthFill) healthFill.style.width = Math.max(0, (playerHealth / maxHP) * 100) + '%';
    if(healthFill) healthFill.style.backgroundColor = (playerHealth / maxHP) > 0.6 ? '#00ff00' : (playerHealth / maxHP) > 0.3 ? '#ffaa00' : '#ff0000';
    if(armorFill) armorFill.style.width = Math.max(0, playerArmor) + '%';
  
    
    // --- ÚJ: BÓNUSZ IDŐZÍTŐ KIJELZÉSE ---
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay && isWaveActive) {
        // Kiszámoljuk, mennyi idő van még hátra a bónuszból
        let waveDuration = clock.getElapsedTime() - waveStartTime;
        let parTime = enemiesToSpawn * 4; // Ahogy a kódban is volt: 4 másodperc per ellenfél
        let timeLeft = Math.max(0, parTime - waveDuration);
        
        // Másodpercek és tizedmásodpercek formázása
        let seconds = Math.floor(timeLeft);
        let millis = Math.floor((timeLeft - seconds) * 10);
        
        timerDisplay.innerText = `BÓNUSZ IDŐ: 0${seconds}:${millis}0`;
        
        // Színváltás feszültségkeltéshez
        if (timeLeft > parTime * 0.5) {
            timerDisplay.style.color = '#00ffff'; // Kék, ha van még bőven idő
            timerDisplay.style.textShadow = '0 0 8px rgba(0, 255, 255, 0.6)';
        } else if (timeLeft > 0) {
            timerDisplay.style.color = '#ffaa00'; // Sárga, ha fogyóban
            timerDisplay.style.textShadow = '0 0 8px rgba(255, 170, 0, 0.6)';
        } else {
            timerDisplay.innerText = `BÓNUSZ IDŐ: LEJÁRT`;
            timerDisplay.style.color = '#ff0000'; // Piros, ha lejárt
            timerDisplay.style.textShadow = '0 0 8px rgba(255, 0, 0, 0.6)';
        }
    } else if (timerDisplay && !isWaveActive) {
        timerDisplay.innerText = ``; // Boltban vagy szünetben elrejtjük
    }
    // ------------------------------------

    let w = weapons[currentWeaponId];
    if(ammoDisplay) ammoDisplay.innerText = `[ ${w.ammo} / ${w.reserve} ]`;
    if(weaponInfoDisplay) weaponInfoDisplay.innerText = w.name;
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
    gameState = 'MENU';
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
// VÁLLALATI DIREKTÍVÁK (SZERZŐDÉS RENDSZER)
// ==========================================
const directivesMenu = document.getElementById('directives-menu');
const dirContent = document.getElementById('dir-content');
let dirOpenedFrom = 'mainMenu';
let currentDirTier = 'info';

// Nyitás a Főmenüből
const openDirBtn = document.getElementById('open-directives-btn');
if (openDirBtn) {
    openDirBtn.addEventListener('click', () => {
        dirOpenedFrom = 'mainMenu';
        mainMenu.classList.add('hidden');
        directivesMenu.classList.remove('hidden');
        directivesMenu.style.display = 'flex';
        renderDirectivesTab('info');
    });
}

// Bezárás
const closeDirBtn = document.getElementById('close-directives-btn');
if (closeDirBtn) {
    closeDirBtn.addEventListener('click', () => {
        directivesMenu.classList.add('hidden');
        directivesMenu.style.display = 'none';
        if (dirOpenedFrom === 'mainMenu') mainMenu.classList.remove('hidden');
        else if (dirOpenedFrom === 'shopMenu') shopMenu.classList.remove('hidden');
    });
}

// Fül váltás logika
document.querySelectorAll('.dir-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.dir-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentDirTier = e.target.getAttribute('data-tier');
        renderDirectivesTab(currentDirTier);
    });
});

// A Lista Generálása
function renderDirectivesTab(tier) {
    dirContent.innerHTML = '';

    // 1. ÁTTEKINTÉS (LORE) FÜL PROFESSZIONÁLIS DÍZÁJNNAL ÉS KÉPPEL
    if (tier === 'info') {
        dirContent.innerHTML = `
            <div style="display: flex; gap: 20px;">
                <div style="flex: 1;">
                    <img src="https://raw.githubusercontent.com/csontarpad-bit/glb-t-r/5fcee7cf3f3f0e88f7fee28af836805a55f9490a/OmniCorp.jpeg" style="width: 100%; border: 2px solid #00ffff; box-shadow: 0 0 15px rgba(0,255,255,0.3); border-radius: 5px;">
                </div>
                <div style="flex: 2; color:#e0ffff; font-size:16px; line-height:1.6; font-family: 'Share Tech Mono', monospace;">
                    <h3 style="color:#00ffff; margin-bottom: 10px;">TEREPI ADATGYŰJTÉSI PROTOKOLL</h3>
                    Az OmniCorp Különleges Műveleti Osztálya üdvözli Önt. A szektor alapvető sterilizálása mellett kiemelt fontosságú a biológiai anomáliák terepi elemzése. A Vállalati Direktívák célja a kutatási adatok maximalizálása.<br><br>
                    A sikeres adatszerzésért a Cég extra Kredittel kompenzálja a Takarítókat. Egyszerre kizárólag EGY szerződés lehet aktív.<br><br>
                    <span style="color:#ff5555; font-weight: bold;">SZOLGÁLATI KÖZLEMÉNY:</span> Egy elfogadott Direktíva megszakítása a szerződés végleges érvénytelenítését vonja maga után. A magasabb Biztonsági Szintek (BÉTA, OMEGA) feloldása a sikeresen teljesített műveletek számához van kötve.
                </div>
            </div>
            
            <div style="margin-top: 30px; border: 1px solid #00ffff; padding: 15px; background: rgba(0,30,30,0.6); box-shadow: inset 0 0 10px rgba(0,255,255,0.1);">
                <h4 style="color:#fff; margin-bottom:10px;">JELENLEGI AKTÍV SZERZŐDÉS:</h4>
                <div id="active-dir-display"></div>
            </div>
        `;
        renderActiveDirectiveBox();
        return;
    }

   // 2. KÜLDETÉSEK LISTÁZÁSA ÉS SZIGORÚ ZÁROLÁS (ÉS KAPCSOLAT)
    let isTierUnlocked = true;
    let lockReason = "";

    // --- EZ A SOR HIÁNYZIK NÁLAD! ---
    let wave = typeof currentWave !== 'undefined' ? currentWave : 1;
    // --------------------------------

    // Béta Szint (Tier 2) Logika: Kell a 34. hullám ÉS 9 megcsinált küldetés!
    if (tier === 'tier2') {
        if (wave < 34 || playerStats.completedDirectives.length < 9) {
            isTierUnlocked = false; 
            lockReason = "ELÉGTELEN BIZTONSÁGI SZINT.<br>Szükséges: 34. Hullám elérése ÉS minimum 9 db Alfa szintű szerződés teljesítése.";
        }
    } 
    // Omega Szint (Tier 3) Logika: Kell a 67. hullám ÉS 20 megcsinált küldetés!
    else if (tier === 'tier3') {
        if (wave < 67 || playerStats.completedDirectives.length < 20) {
            isTierUnlocked = false; 
            lockReason = "ELÉGTELEN BIZTONSÁGI SZINT.<br>Szükséges: 67. Hullám elérése ÉS minimum 20 db Béta/Alfa szintű szerződés teljesítése.";
        }
    }

    if (!isTierUnlocked) {
        dirContent.innerHTML = `
            <div style="text-align: center; margin-top: 50px;">
                <span style="color:#f00; font-size: 24px; font-weight: bold; text-shadow: 0 0 10px #f00;">BELÉPÉS MEGTAGADVA</span><br><br>
                <span style="color:#f00;">EZ A SZINT JELENLEG TITKOSÍTVA VAN.</span><br><br>
                <span style="color:#aaa;">${lockReason}</span>
            </div>`;
        return;
    }

    // Ha fel van oldva, kilistázzuk az ÖSSZES küldetést abban a Tierben!
    let listHTML = `<div style="display:flex; flex-direction:column; gap:15px;">`;
    
    OmniCorpDirectives[tier].forEach(d => {
        let isCompleted = playerStats.completedDirectives.includes(d.id);
        let isAbandoned = playerStats.abandonedDirectives.includes(d.id);
        let isActive = (playerStats.activeDirective === d.id);

        let statusText = "";
        let bgColor = "rgba(30, 20, 0, 0.7)";
        let btnHTML = "";

      if (isCompleted) {
            statusText = `<span style="color:#00ff00; font-weight:bold; float:right;">[ TELJESÍTVE ]</span>`;
            bgColor = "rgba(0, 50, 50, 0.4)"; // Sötét türkiz
        } else if (isAbandoned) {
            statusText = `<span style="color:#ff5555; font-weight:bold; float:right;">[ TÖRÖLVE ]</span>`;
            bgColor = "rgba(50, 0, 0, 0.4)"; // Sötét piros
        } else if (isActive) {
            statusText = `<span style="color:#00ffff; font-weight:bold; float:right;">[ FOLYAMATBAN: ${playerStats.directiveProgress} / ${d.goal} ]</span>`;
            bgColor = "rgba(0, 60, 60, 0.8)"; // Erősebb cián
            btnHTML = `<button class="directive-action-btn directive-abandon-btn" onclick="abandonDirective()">SZERZŐDÉS FELADÁSA</button>`;
        } else {
            btnHTML = `<button class="directive-action-btn" onclick="acceptDirective('${d.id}')">ELFOGADÁSA</button>`;
        }

        listHTML += `
            <div class="directive-card" style="background: ${bgColor};">
                ${statusText}
                <h4>${d.title}</h4>
                <p>${d.desc}</p>
                <div class="reward">JUTALOM: ${d.reward} CR</div>
                ${btnHTML}
            </div>
        `;
    });

    listHTML += `</div>`;
    dirContent.innerHTML = listHTML;
}

// Az Áttekintés fülön lévő mini-kijelző
function renderActiveDirectiveBox() {
    let target = document.getElementById('active-dir-display');
    if (!target) return;

    if (!playerStats.activeDirective) {
        target.innerHTML = `<span style="color:#888;">Nincs aktív szerződés. Válasszon egyet a szintek fülön!</span>`;
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
            <div style="color:#ccc;">${activeData.desc}</div>
            <div style="color:#ffaa00; font-weight:bold; margin-top:5px;">ÁLLAPOT: ${playerStats.directiveProgress} / ${activeData.goal}</div>
        `;
    }
}

// Szerződés kezelő funkciók
window.acceptDirective = function(id) {
    if (playerStats.activeDirective) {
        alert("Már van egy aktív szerződésed! Fejezd be, vagy add fel előbb!");
        return;
    }
    playerStats.activeDirective = id;
    playerStats.directiveProgress = 0; 
    if (typeof savePlayerStats === 'function') savePlayerStats();
    renderDirectivesTab(currentDirTier); // Újrarajzoljuk a listát
}

// ==========================================
// SZERZŐDÉS FELADÁSA (MEGERŐSÍTÉSSEL)
// ==========================================

// Ezt hívja meg a piros gomb a kártyán
window.abandonDirective = function() {
    if (playerStats.activeDirective) {
        // NEM TÖRÖLJÜK AZONNAL! Megnyitjuk a figyelmeztető ablakot!
        document.getElementById('confirm-abandon-overlay').style.display = 'flex';
    }
}

// --- ÚJ GLOBÁLIS FÜGGVÉNYEK A PIROS ABLAK GOMBJAIHOZ ---

// Ha a játékos meggondolta magát (MÉGSE gomb)
window.cancelAbandon = function() {
    const overlay = document.getElementById('confirm-abandon-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Ha a játékos BIZTOSAN FELADJA (Piros Gomb)
window.executeAbandon = function() {
    // Ablak bezárása
    const overlay = document.getElementById('confirm-abandon-overlay');
    if (overlay) overlay.style.display = 'none';
    
    // Tényleges törlés a listából
    if (playerStats.activeDirective) {
        playerStats.abandonedDirectives.push(playerStats.activeDirective);
        playerStats.activeDirective = null;
        playerStats.directiveProgress = 0;
        
        if (typeof savePlayerStats === 'function') savePlayerStats();
        renderDirectivesTab(currentDirTier); // Újrarajzoljuk a listát
    }
}

// Végül: A Játékon belüli Terminálban, a "DIREKTÍVÁK" fülön a gombot cseréld le arra, hogy megnyissa ezt az ablakot!
const tabDirectivesIngameBtn = document.getElementById('tab-directives');
if (tabDirectivesIngameBtn) {
    tabDirectivesIngameBtn.addEventListener('click', () => {
        dirOpenedFrom = 'shopMenu';
        shopMenu.classList.add('hidden');
        directivesMenu.classList.remove('hidden');
        directivesMenu.style.display = 'flex';
        
        document.querySelectorAll('.dir-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.dir-tab-btn[data-tier="info"]').classList.add('active');
        currentDirTier = 'info';
        renderDirectivesTab('info');
    });
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
