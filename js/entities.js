// ==========================================
// 1. GLOBÁLIS ANYAGOK ÉS GEOMETRIÁK
// ==========================================
const texLoader = new THREE.TextureLoader();

// 1. A Textúra betöltése 
const puddleTex = texLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/102a0d507c37ef59b9aeb075e1b30110c95f3b3f/puddle.jpg'); 
puddleTex.wrapS = THREE.RepeatWrapping;
puddleTex.wrapT = THREE.RepeatWrapping;

// 2. Zöld pocsolya (Most már StandardMaterial, hogy kapjon fényt és világíthasson sárgán!)
const globalToxicMat = new THREE.MeshStandardMaterial({ 
    map: puddleTex, 
    color: 0x55ff55,     
    transparent: true, 
    opacity: 0.8, 
    depthWrite: false,
    roughness: 0.5,
    metalness: 0.1
});

// 3. Piros pocsolya a Mutáns Növényhez 
const globalRedToxicMat = new THREE.MeshBasicMaterial({ 
    map: puddleTex, 
    color: 0xff2222, // Vérvörös!    
    transparent: true, 
    opacity: 0.9, 
    depthWrite: false 
});

// 4. Hitbox anyag 
const globalHitboxMat = new THREE.MeshBasicMaterial({ 
    color: 0xff0000, 
    wireframe: false, 
    visible: false 
});

const globalBodyGeo = new THREE.BoxGeometry(1.0, 1.4, 1.0);
const globalHeadGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

// ==========================================
// 2. SEGÉDFÜGGVÉNYEK
// ==========================================
function getSafeSpawnPosition(radius, minDist = 0) {
    let x, z; let isSafe = false; let attempts = 0;
    
    // Max 100 próbálkozás, hogy ne fagyjon ki a gép
    while (!isSafe && attempts < 100) { 
        // 42-es szorzó: Nem lógnak bele a külső falba
        x = (Math.random() - 0.5) * 42; 
        z = (Math.random() - 0.5) * 42; 
        
        let distToPlayer = Math.hypot(camera.position.x - x, camera.position.z - z);
        
        if (distToPlayer >= minDist) {
            if (typeof checkWallCollision === 'function') {
                // Láthatatlan erőtér az oszlopok körül spawnoláskor
                let safeRadius = radius * 3.5; 
                if (!checkWallCollision(x, z, safeRadius)) {
                    isSafe = true; 
                }
            } else {
                isSafe = true;
            }
        }
        attempts++;
    }
    
    // Ha 100 próbálkozás után sem talált helyet, lerakja a nullapontra
    return { x: x || 0, z: z || 0 };
}
// ==========================================
// 3. ELLENSÉGEK LÉTREHOZÁSA (SPAWN)
// ==========================================
function spawnEnemy(x, z, isBoss = false, forceType = null) { 
    if (!zombieModel || !fastZombieModel || !hiderZombieModel) return; // Biztonsági fék, ha még nem töltött be a pálya
    
    // --- Típus sorsolása ---
    let type = 'normal';
    
    if (forceType) {
        type = forceType; 
    } else {
        let rand = Math.random();
        if (isBoss) type = 'boss';
        else if (rand < 0.15) type = 'runner';
        else if (rand < 0.25) type = 'tank';
        else if (rand < 0.35) type = 'hider';
    }

    let baseModel = zombieModel;
    let anims = zombieAnimations;
    
    if (type === 'runner') { baseModel = fastZombieModel; anims = fastZombieAnimations; } 
    else if (type === 'hider') { baseModel = hiderZombieModel; anims = hiderZombieAnimations; } 
    else if (type === 'crawler') { baseModel = crawlerModel; anims = crawlerAnimations; } 
    else if (type === 'boss') { baseModel = bossModel; anims = bossAnimations; } 
    else if (type === 'tank') { baseModel = tankModel; anims = tankAnimations; }

    if (!baseModel) { baseModel = zombieModel; anims = zombieAnimations; }

    // ==========================================
    // --- ÚJ: OBJECT POOLING LOGIKA (ÚJRAHASZNOSÍTÁS) ---
    // ==========================================
    let mesh = null;
    let mixer = null;
    let isFromPool = false;
    
    // ÚJ VÁLTOZÓK A VISSZAOLVASÁSHOZ
    let savedBodyOffsetY = 0;
    let savedHeadOffsetY = 0;

    let poolIndex = zombiePool.findIndex(z => z.type === type);
    
    if (poolIndex > -1) {
        let pooledZombie = zombiePool.splice(poolIndex, 1)[0];
        mesh = pooledZombie.mesh;
        mixer = pooledZombie.mixer;
        savedBodyOffsetY = pooledZombie.bodyOffsetY; // ÚJ: Visszatöltjük a mentett adatot
        savedHeadOffsetY = pooledZombie.headOffsetY; // ÚJ: Visszatöltjük a mentett adatot
        isFromPool = true;
        
        mesh.visible = true;
        mesh.rotation.x = 0; 
        mesh.position.y = 0; 
        mixer.stopAllAction(); 
        
        mesh.traverse((child) => {
            if (child.isMesh) child.frustumCulled = false;
        });
    } else {
        // NINCS A POOLBAN! Létrehozunk egy újat.
        // Biztonsági fék: ha valamiért a baseModel nem létezik, megszakítjuk a folyamatot, hogy ne omoljon össze a játék!
        if (!baseModel) return; 
        
        mesh = THREE.SkeletonUtils.clone(baseModel);
        mixer = new THREE.AnimationMixer(mesh);
    }
    
    // Végső Biztonsági Fék: Ha még mindig üres a mesh, leállunk!
    if (!mesh) return; 
    // ==========================================

    // --- Statisztikák és Méret (Alapértékek) ---
    let scale = 1.5, hpMult = 1, speedMult = 1, opacity = 1, reward = 20;
    
    // --- Típus-specifikus módosítók ---
    if (type === 'runner') { 
        scale = 2.0; hpMult = 0.5; speedMult = 2.5; reward = 30; 
    } 
    else if (type === 'tank') { 
        scale = 1.5; hpMult = 4.0; speedMult = 0.6; reward = 100; 
    } 
    else if (type === 'boss') { 
        scale = 4.0; hpMult = 45.0; speedMult = 0.55; reward = 5000; 
    }
    else if (type === 'hider') { 
        scale = 0.02; hpMult = 0.8; speedMult = 1.3; opacity = 0.2; reward = 40; 
    }
    else if (type === 'crawler') { 
        scale = 0.005; hpMult = 0.1; speedMult = 4.0; reward = 5000; 
    }

    mesh.scale.set(scale, scale, scale); 
    mesh.position.set(x, 0, z);
    
    // --- Textúrák és Átlátszóság beállítása ---
    // FONTOS: Csak akkor állítjuk be az anyagokat, ha ÚJ a zombi! (Különben megtelik a memória anyag-klónokkal)
    if (!isFromPool) {
        mesh.traverse((child) => {
            if (child.isMesh) {
                child.frustumCulled = false;
                
                if (opacity < 1.0 || type === 'runner') {
                    if (Array.isArray(child.material)) child.material = child.material.map(m => m.clone());
                    else child.material = child.material.clone();
                }

                if (opacity < 1.0) {
                    let mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(m => { m.transparent = true; m.opacity = opacity; });
                }

                if (type === 'runner') {
                    let mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(m => {
                        if (m.color) m.color.setHex(0x222222);
                        if (m.emissive !== undefined) {
                            m.emissive.setHex(0x005500); 
                            if (typeof puddleTex !== 'undefined') m.emissiveMap = puddleTex;
                            m.emissiveIntensity = 0.3; 
                        }
                        if (m.roughness !== undefined) m.roughness = 0.8;
                        if (m.metalness !== undefined) m.metalness = 0.1;
                    });
                }
            }
        });
    }

  

    // --- ÚJ: CSONTOK MEGKERESÉSE A HITBOX SZINKRONIZÁLÁSHOZ ---
    let foundHeadBone = null;
    let foundSpineBone = null;

    mesh.traverse((child) => {
        if (child.isBone) {
            let bName = child.name.toLowerCase();
            if (bName.includes('head') || bName.includes('neck')) foundHeadBone = child;
            if (bName.includes('spine') || bName.includes('chest') || bName.includes('pelvis')) foundSpineBone = child;
        }
    });

    // Biztonsági tartalék, ha a modell nem tartalmaz elnevezett csontokat
    if (!foundHeadBone) foundHeadBone = mesh;
    if (!foundSpineBone) foundSpineBone = mesh;


    // ==========================================
    // HITBOX RENDSZER (KARCSÚ HENGEREK ÉS ELTOLÁSOK)
    // ==========================================
    
    // PUSKÁZÓ:
    // b = body (test), h = head (fej)
    // x = jobbra/balra tolás, y = fel/le tolás, z = előre/hátra tolás
    // w = szélesség, h = magasság, d = mélység

    // Alapértelmezett (Sima zombi)
    let bx = 0, by = 1.3, bz = 0; let bw = 0.7, bh = 1.9, bd = 0.7; 
    let hx = 0, hy = 2.5, hz = 0; let hw = 0.3, hh = 0.4, hd = 0.5; 

    if (type === 'tank') {
        bw = 1.2; bh = 2.5; bd = 1.2; 
        bx = 0; by = 1.4; bz = 0; // Test eltolás (Módosítsd a bz-t, ha előre-hátra kell tolni!)
        
        hw = 0.6; hh = 0.4; hd = 0.6; 
        hx = 0; hy = 2.6; hz = 0.4; // Fej eltolás (Módosítsd a hz-t, ha lóg a nyaka!)
    }
    else if (type === 'runner') {
        bw = 0.6; bh = 1.0; bd = 0.6; 
        bx = 0; by = 0.5; bz = 0;
        
        hw = 0.3; hh = 0.1; hd = 0.3; 
        hx = 0; hy = 0.9; hz = 0.4;
    } 
    else if (type === 'boss') {
        bw = 1.6; bh = 3.0; bd = 1.6; 
        bx = 0; by = 1.6; bz = 0;
        
        hw = 0.8; hh = 0.8; hd = 0.8; 
        hx = 0; hy = 3.4; hz = 0;
    } 
    else if (type === 'crawler') {
        bw = 1.0; bh = 0.8; bd = 1.0; 
        bx = 0; by = 0.2; bz = -0.8; 
        
        hw = 0.4; hh = 0.5; hd = 0.4; 
        hx = 0; hy = 0.5; hz = -0.8; 
    } 
    else if (type === 'hider') {
        bw = 0.7; bh = 1.0; bd = 0.7; 
        bx = 0; by = 0.5; bz = 0;
        
        hw = 0.4; hh = 0.4; hd = 0.4; 
        hx = 0; hy = 0.5; hz = 0.4;
    }

    // TEST Hitbox (Henger)
    const bodyRadius = bw / 2; 
    const bodyHitbox = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius, bodyRadius, bh, 8), globalHitboxMat);
    bodyHitbox.position.set(x + bx, by, z + bz); 
    bodyHitbox.userData = { type: 'body' };
    bodyHitbox.frustumCulled = false; 

    // FEJ Hitbox (Henger)
    const headRadius = hw / 2;
    const headHitbox = new THREE.Mesh(new THREE.CylinderGeometry(headRadius, headRadius, hh, 8), globalHitboxMat);
    headHitbox.position.set(x + hx, hy, z + hz); 
    headHitbox.userData = { type: 'head' };
    headHitbox.frustumCulled = false;

   // Hitboxok hozzáadása a VILÁGHOZ
    scene.add(bodyHitbox); 
    scene.add(headHitbox); 
    
    // FONTOS: Magát a zombit (mesh) csak akkor kell a pályához adni, ha ÚJ!
    if (!isFromPool) {
        scene.add(mesh);
    }
    
    enemyHitboxes.push(bodyHitbox, headHitbox); 
    

   // A 'mixer' már létezik feljebb, így itt már nem kell újra létrehozni!
    let runAction = null; let attackAction = null; let deathAction = null; 
    let hasDeathAnim = false; // <--- EZ HIÁNYZOTT!
    let comboActions = []; // <--- ÚJ: A Juggernaut kombó ütéseihez

    if (anims && anims.length > 0) {
        if (type === 'runner') {
            runAction = mixer.clipAction(anims.length > 9 ? anims[9] : anims[0]); 
            attackAction = mixer.clipAction(anims.length > 2 ? anims[2] : anims[0]);
            if (anims.length > 3) { deathAction = mixer.clipAction(anims[3]); hasDeathAnim = true; } // ÚJRA BERAKVA: hasDeathAnim = true
        } 
        else if (type === 'tank') {
            runAction = mixer.clipAction(anims.length > 21 ? anims[21] : anims[0]); 
            attackAction = mixer.clipAction(anims.length > 0 ? anims[0] : anims[0]); // Biztonsági alap
            
            // --- ÚJ: JUGGERNAUT KOMBÓ (Első 3 animáció betöltése) ---
            if (anims.length > 0) comboActions.push(mixer.clipAction(anims[0]));
            if (anims.length > 1) comboActions.push(mixer.clipAction(anims[1]));
            if (anims.length > 2) comboActions.push(mixer.clipAction(anims[2]));
            
            // Beállítjuk, hogy a kombó ütések ne loopoljanak, csak egyszer fussanak le!
            comboActions.forEach(action => {
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
            });

            if (anims.length > 11) { deathAction = mixer.clipAction(anims[11]); hasDeathAnim = true; } 
        }
        else if (type === 'boss') {
            runAction = mixer.clipAction(anims.length > 1 ? anims[1] : anims[0]); 
            attackAction = mixer.clipAction(anims.length > 0 ? anims[0] : anims[0]);
            if (anims.length > 2) { deathAction = mixer.clipAction(anims[2]); hasDeathAnim = true; }
        }
        else if (type === 'crawler') {
            runAction = mixer.clipAction(anims.length > 1 ? anims[1] : anims[0]); 
            if (anims.length > 2) { deathAction = mixer.clipAction(anims[2]); hasDeathAnim = true; }
        }
        else if (type === 'hider') {
            let walkClip = anims.find(a => a.name.toLowerCase().includes('fight') || a.name.toLowerCase().includes('idle')) || anims[0];
            runAction = mixer.clipAction(walkClip); 
            let dClip = anims.find(a => a.name.toLowerCase().includes('death') || a.name.toLowerCase().includes('die'));
            if (dClip) { deathAction = mixer.clipAction(dClip); hasDeathAnim = true; }
        }
        else {
            let walkClip = anims.find(a => a.name.toLowerCase().includes('walk')) || anims[0];
            runAction = mixer.clipAction(walkClip); 
            let dClip = anims.find(a => a.name.toLowerCase().includes('death') || a.name.toLowerCase().includes('die'));
            if (dClip) { deathAction = mixer.clipAction(dClip); hasDeathAnim = true; }
        }

        // --- 2. HALÁL ANIMÁCIÓ BEÁLLÍTÁSA (HA LÉTEZIK) ---
        if (hasDeathAnim && deathAction) {
            deathAction.setLoop(THREE.LoopOnce); 
            deathAction.clampWhenFinished = true; 
        }

        if(runAction) runAction.setLoop(THREE.LoopRepeat); 
        if(attackAction) attackAction.setLoop(THREE.LoopRepeat);
    }

// --- ANIMÁCIÓK BIZTONSÁGOS INDÍTÁSA / VISSZAÁLLÍTÁSA ---
    if (runAction) {
        if (isFromPool) {
            mixer.stopAllAction(); 
            runAction.reset().fadeIn(0.1).play(); 
            
            let enIdx = enemies.findIndex(e => e.mesh === mesh);
            if (enIdx > -1) {
                enemies[enIdx].currentAction = runAction;
            }
        } else {
            runAction.play();
        }

        // --- ÚJ: DESZINKRONIZÁLÁS (Kórus-effektus megszüntetése) ---
        // Ha van klip (animáció) hossz, egy véletlenszerű pontjára ugorjunk,
        // így minden zombi más fázisában tart a lépésnek, amikor meglátod őket!
        if (runAction._clip) {
            runAction.time = Math.random() * runAction._clip.duration;
        }
    }
    
    const radarContainer = document.getElementById('radar');
    const blip = document.createElement('div'); 
    blip.className = 'radar-blip'; 
    if (radarContainer) radarContainer.appendChild(blip);
    
    mesh.updateMatrixWorld(true);

    let bodyOffsetY = by; 
    let headOffsetY = hy;

    // FONTOS: Ha a zombi a Pool-ból jött, NEM számoljuk újra a csontokat (mert torz pózban vannak).
    // Helyette felhasználjuk a halálakor elmentett, tökéletes értékeket!
    if (isFromPool) {
        bodyOffsetY = savedBodyOffsetY;
        headOffsetY = savedHeadOffsetY;
    } else {
        // Csak teljesen új zombinál számoljuk ki a csontok alapján!
        if (foundSpineBone) {
            let tempPos = new THREE.Vector3();
            foundSpineBone.getWorldPosition(tempPos);
            bodyOffsetY = by - tempPos.y; 
        }
        if (foundHeadBone) {
            let tempPos = new THREE.Vector3();
            foundHeadBone.getWorldPosition(tempPos);
            headOffsetY = hy - tempPos.y;
        }
    }

// ==========================================
    // --- ÚJ: HULLÁM ALAPÚ NEHEZEDÉS ÉS KORLÁTOZÁS ---
    // ==========================================
    const baseStats = difficultySettings[currentDifficulty];
    
    // 1. Életerő és Sebzés szorzója (Ez a végtelenségig nőhet, +4% / hullám)
    let powerMultiplier = 1.0 + ((currentWave - 1) * 0.04);
    
    // 2. Sebesség szorzó (MAXIMALIZÁLVA)
    // A sebességük maximum 35%-kal (+0.35) nőhet meg az 1. hullámhoz képest!
    let speedMultiplier = 1.0 + Math.min(((currentWave - 1) * 0.035), 0.35);

    // FONTOS: Mivel a damageMult (sebzésszorzó) itt még nincs kiszámolva, előre definiáljuk:
    let finalDamageMult = (type === 'boss' ? 3 : type === 'tank' ? 2 : 1) * powerMultiplier;

    // ITT KERÜL BELE A ZOMBI A TÖMBBE! Ezelőtt a sor előtt sehol nem szerepelhet 'en.'
    enemies.push({ 
        type: type,
        mesh: mesh, 
        bodyHitbox: bodyHitbox, 
        headHitbox: headHitbox, 
        headBone: foundHeadBone,   
        spineBone: foundSpineBone, 
        bx: bx, bz: bz, hx: hx, hz: hz, 
        bodyOffsetY: bodyOffsetY, 
        headOffsetY: headOffsetY, 
        
        roarTimer: 0,
        animSpeedOffset: (Math.random() * 0.15) - 0.075, // ÚJ: +/- 7.5% véletlen sebességeltolás az animációra!
        frozen: false,

        // Szétválasztott szorzók használata
        health: (baseStats.health * hpMult) * powerMultiplier, 
        damageMult: finalDamageMult, 
        speed: (baseStats.speed * speedMult) * speedMultiplier, 
        
        reward: reward, 
        mixer: mixer, 
        blip: blip,
        runAction: runAction, 
        attackAction: attackAction, 

        // --- ÚJ: COMBO ÉS IDŐZÍTŐ VÁLTOZÓK (BIZTONSÁGI ALAPÉRTÉKEKKEL) ---
        comboActions: typeof comboActions !== 'undefined' ? comboActions : [], 
        comboStep: 0,               
        isAttacking: false,         
        attackAnimTimer: 0,         
        hitFrameTime: 0,            
        hasDealtDamage: false,      
        // ------------------------------------

        deathAction: deathAction, 
        hasDeathAnim: hasDeathAnim, 
        roarTimer: 0,
        frozen: false, 
        currentAction: runAction,
        lifeTime: (type === 'crawler') ? 12.0 : Infinity
    });
} 


// ==========================================
// 4. TÁRGYAK (LOOT) LÉTREHOZÁSA (A FÖLDÖN FEKSZENEK!)
// ==========================================
function spawnMedkit(x, z) {
    if (!healthModel) return; 
    const mesh = THREE.SkeletonUtils.clone(healthModel); 
    // Letesszük a földre (Y = 0.2), és esetleg picit megdöntjük, mintha ledobták volna
    mesh.position.set(x, 0.2, z); 
    mesh.rotation.x = Math.random() * 0.2;
    mesh.rotation.z = Math.random() * 0.2;
    mesh.scale.set(0.6, 0.6, 0.6); 
    
    mesh.traverse((c) => {
        if (c.isMesh && c.material) {
            c.material = c.material.clone();
            c.material.emissive = new THREE.Color(0x00aaff); 
            c.material.emissiveIntensity = 0.3; // Halványabb, mint eddig
        }
    });

    // Fontos adatokat teszünk a Mesh-be, hogy a Raycaster felismerje!
    mesh.userData = { isLoot: true, type: 'medkit' };
    
    scene.add(mesh);
    lootItems.push(mesh); // Betesszük a közös loot tömbbe!
}

function spawnAmmoBox(x, z) {
    if (!ammoModel) return; 
    const mesh = THREE.SkeletonUtils.clone(ammoModel); 
    mesh.position.set(x, 0.2, z); 
    mesh.rotation.y = Math.random() * Math.PI; // Random irányba néz
    mesh.scale.set(1.8, 1.8, 1.8); 
    
    mesh.traverse((c) => {
        if (c.isMesh && c.material) {
            c.material = c.material.clone();
            c.material.emissive = new THREE.Color(0xffcc00); 
            c.material.emissiveIntensity = 0.1;
        }
    });

    mesh.userData = { isLoot: true, type: 'ammo' };

    scene.add(mesh);
    lootItems.push(mesh); // Betesszük a közös loot tömbbe!
}

// ==========================================
// 5. MUTÁNS NÖVÉNY (FLESH BOMB) RENDSZER
// ==========================================

function spawnPlant(x, z) {
    if (!plantModel) return;
    
    // 1. Nagy Piros Pocsolya a növény alá
    const geo = new THREE.CircleGeometry(1.5, 32); 
    const puddle = new THREE.Mesh(geo, globalRedToxicMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.025, z); 
    scene.add(puddle);

    // 2. Maga a Növény modell
    const mesh = THREE.SkeletonUtils.clone(plantModel);
    mesh.position.set(x, 0, z);
    mesh.scale.set(1.5, 1.5, 1.5); 
    scene.add(mesh);

    // 3. ÚJ: HITBOX (LŐHETŐVÉ TESSZÜK!)
    // Egy henger, ami pont akkora, mint a növény
    const plantHitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 8), globalHitboxMat);
    plantHitbox.position.set(x, 0.75, z); // Felhúzzuk a földről
    plantHitbox.userData = { type: 'plant' }; // Megjelöljük, hogy ez egy növény!
    plantHitbox.frustumCulled = false;
    scene.add(plantHitbox);
    enemyHitboxes.push(plantHitbox); // Beletesszük a zombik közé, hogy a célkereszt érzékelje!

    // 4. Élő, lüktető animáció elindítása
    const mixer = new THREE.AnimationMixer(mesh);
    if (plantAnimations && plantAnimations.length > 0) {
        let action = mixer.clipAction(plantAnimations[0]);
        action.setLoop(THREE.LoopRepeat);
        action.play();
    }


   // Hozzáadás az aktív listához (100 HP-val!)
    activePlants.push({ mesh: mesh, puddle: puddle, hitbox: plantHitbox, mixer: mixer, x: x, z: z, hp: 100 });
}



// --- ÚJ: POCSOLYÁK ÖREGEDÉSE ÉS ANYAGCSERÉJE (ROTHADÓ SZÍNEK) ---
window.evolvePuddles = function() {
    for (let p of toxicPuddles) {
        let age = currentWave - p.userData.spawnWave;
        
        if (age >= 5 && p.userData.state !== 'ready') {
            p.userData.state = 'ready';
            
            if (p.material) {
                // Sötét, alvadt vér szín
                p.material.color.setHex(0x990000); 
                if (p.material.emissive !== undefined) {
                    p.material.emissive.setHex(0x550000); // Halvány vörös derengés
                    p.material.emissiveIntensity = 0.5; // Kisebb fényerő, hogy a textúra (puddle.jpg) látszódjon!
                }
                p.material.needsUpdate = true;
            }
        } 
        else if (age >= 3 && age < 5 && p.userData.state === 'green') {
            p.userData.state = 'yellow';
            
            if (p.material) {
                // Sötét, beteges, mustáros/barnás sárga (Rothadó szín)
                p.material.color.setHex(0xaa8800); 
                if (p.material.emissive !== undefined) {
                    p.material.emissive.setHex(0x554400); // Nagyon halvány zöldes-barna derengés
                    p.material.emissiveIntensity = 0.4; // Épphogy csak átszínezze a zöldet, ne világítson!
                }
                p.material.needsUpdate = true;
            }
        }
    }
}

// --- ÚJ VÁLTOZÓ A VÁRAKOZÓ MUTÁNSOKNAK ---
var pendingMutations = [];

// 1. FÁZIS: A Bolt bezárásakor lefutó ellenőrzés
window.prepareMutations = function() {
    pendingMutations = [];
    
    // ÚJ LOGIKA: Csak a 6. hullámba lépő (ready) pocsolyák mutálódhatnak!
    let availablePuddles = toxicPuddles.filter(p => p.userData.state === 'ready');
    let i = 0;
    
    while (i < availablePuddles.length) {
        let p1 = availablePuddles[i];
        let cluster = [p1];
        
        for (let j = 0; j < availablePuddles.length; j++) {
            if (i === j) continue;
            let p2 = availablePuddles[j];
            let distSq = Math.pow(p1.position.x - p2.position.x, 2) + Math.pow(p1.position.z - p2.position.z, 2);
            if (distSq < 6.25) { 
                cluster.push(p2);
            }
        }

        if (cluster.length >= 5) {
            let usedPuddles = cluster.slice(0, 5);
            let cx = 0, cz = 0;
            for (let p of usedPuddles) { cx += p.position.x; cz += p.position.z; }
            cx /= usedPuddles.length; cz /= usedPuddles.length;

            pendingMutations.push({ cx: cx, cz: cz, puddles: usedPuddles });
            availablePuddles = availablePuddles.filter(p => !usedPuddles.includes(p));
            i = 0; 
        } else {
            i++; 
        }
    }
}

// 2. FÁZIS: Amikor megjelennek a zombik (A Növények tényleges kikelése)
window.executeMutations = function() {
    for (let mut of pendingMutations) {
        // 1. Töröljük a pályáról az előkészített, lüktető pocsolyákat
        for (let p of mut.puddles) {
            // Megkeressük a fő tömbben és kitöröljük
            let idx = toxicPuddles.indexOf(p);
            if (idx > -1) toxicPuddles.splice(idx, 1);
            
            scene.remove(p);
            // Visszaállítjuk a színét, ha esetleg újrahasznosítjuk (pooling)
            if (p.material.color) p.material.color.setHex(0x55ff55);
            p.geometry.dispose();
        }
        
        // 2. Ledobjuk a Növényt a kiszámolt helyre
        spawnPlant(mut.cx, mut.cz);
    }
    
    // Töröljük a várakozó listát
    pendingMutations = [];
    
    // Frissítjük a ködöt, mert kevesebb lett a pocsolya
    if (typeof updateToxicFog === 'function') updateToxicFog();
}
