// ==========================================
// 1. THREE.JS ALAPOK ÉS KÖRNYEZET
// ==========================================
scene = new THREE.Scene();
scene.background = new THREE.Color(0x051a05); // Radioaktív zöldes fekete
scene.fog = new THREE.FogExp2(0x051a05, 0.035);

camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(0, 1.6, 0); // <-- JAVÍTÁS: Már a menüben is szemmagasságban lesz!
clock = new THREE.Clock();

renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.physicallyCorrectLights = true; // VISSZAÁLLÍTVA a régi, működő verzióra
document.body.appendChild(renderer.domElement);

// Fények
scene.add(new THREE.AmbientLight(0x55ff55, 0.3)); 
playerLight = new THREE.PointLight(0xaaffaa, 0.8, 20);
scene.add(playerLight);


const flashlight = new THREE.SpotLight(0xaaffaa, 20, 50, Math.PI / 6, 0.5);
camera.add(flashlight);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight.target);

muzzleFlash = new THREE.PointLight(0xffaa00, 0, 100);
muzzleFlash.position.set(0.8, -0.6, -3.0);
camera.add(muzzleFlash);
scene.add(camera);


// --- JAVÍTOTT: ARCBA FRÖCCSENŐ VÉR (Zöld vagy Piros) ---
window.splashVisorBlood = function(isPlayerBlood = false) {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;
    
    let dropCount = Math.floor(Math.random() * 4) + 3;
    
    for (let i = 0; i < dropCount; i++) {
        let drop = document.createElement('div');
        drop.className = 'visor-blood-splatter';
        
        // --- ÚJ: Ha a játékos sérül, rárakjuk a piros CSS osztályt! ---
        if (isPlayerBlood === true) {
            drop.classList.add('red');
        }
        
        let x = Math.random() * 90 + 5; 
        let y = Math.random() * 60 + 5; 
        let size = Math.random() * 25 + 15; 
        
        drop.style.left = `${x}vw`;
        drop.style.top = `${y}vh`;
        drop.style.width = `${size}px`;
        drop.style.height = `${size}px`;
        
        uiLayer.appendChild(drop);
        
        setTimeout(() => {
            if (drop.parentNode) drop.parentNode.removeChild(drop);
        }, 3000);
    }
};

// --- ANIMÁCIÓ LEJÁTSZÓ KÖZPONT (FINOM ÉS KEMÉNY ÁTMENETEKKEL) ---
function playFPSAnim(weaponId, animName, fadeDuration = 0.1) {
    let wp = loadedFPSModels[weaponId];
    if (!wp || !wp.actions[animName]) return null;

    let nextAction = wp.actions[animName];
    
    // KIVÉTEL A LÖVÉS és a SÖRÉTES TÖLTÉSE! Ezeket mindig azonnal újra kell indítani!
    if (wp.currentAction === nextAction && nextAction.isRunning()) {
        if (animName !== 'shoot' && !(weaponId === 'shotgun' && animName === 'reload')) {
            return nextAction; 
        }
    }

    nextAction.reset();

    if (wp.currentAction) {
        if (animName === 'shoot' || (weaponId === 'shotgun' && animName === 'reload')) {
            // Lövésnél és Sörétes töltésnél AZONNALI váltás van (nincs lágy átmenet, így nem akad meg!)
            wp.currentAction.stop(); 
        } else {
            // Minden másnál (elővétel, szuszogás) vajpuha átmenet marad
            nextAction.crossFadeFrom(wp.currentAction, fadeDuration, true);
        }
    }

    nextAction.play();
    wp.currentAction = nextAction; 

    return nextAction;
}

// --- ÚJ: KIKÉNYSZERÍTETT FEGYVERVÁLTÁS (Amikor kifogy a lőszer) ---
window.forceWeaponSwitch = function(targetWeaponId) {
    if (isWeaponBusy || currentWeaponId === targetWeaponId) return;
    
    isWeaponBusy = true;
    let hideAction = playFPSAnim(currentWeaponId, 'hide');
    let hideDuration = hideAction ? (hideAction._clip.duration * 1000) : 0;
    
    setTimeout(() => {
        isWeaponBusy = false;
        isReloading = false;
        const rt = document.getElementById('reload-text');
        if (rt) rt.classList.add('hidden');
        
        equipWeapon(targetWeaponId); // Előveszi a kést
        if (typeof updateUI === 'function') updateUI();
    }, hideDuration);
}

// --- FEGYVER ELŐVÉTELE (TAKE) ---
window.equipWeapon = function(weaponId) {
    if (isWeaponBusy) return; 
    
    let wData = loadedFPSModels[weaponId];
    if (!wData) return;

    if (currentWeaponMesh) currentWeaponMesh.visible = false;

    isWeaponBusy = true; 
    
    currentWeaponId = weaponId;
    currentWeaponMesh = wData.mesh;
    currentWeaponMesh.visible = true;

// --- JAVÍTÁS: Csak a Revolvernél van hang (A pörgetés), a többinél csendben veszi elő ---
    if (weaponId === 'super') {
        playSound('superClose');
} else if (weaponId === 'shotgun') {
        // --- JAVÍTÁS: A 0.6 átugorja a lövést, és pont a pumpánál kezdődik! ---
        setTimeout(() => { playSound('shotgunShoot', 0.6); }, 300);
    }

    // --- ÚJ: ALAP KOORDINÁTÁK MENTÉSE A RINGÓZÁSHOZ ---
    if (!wData.basePos) wData.basePos = currentWeaponMesh.position.clone();
    if (!wData.baseRot) wData.baseRot = currentWeaponMesh.rotation.clone();

    // Lejátsszuk a "Take" animációt
    let action = playFPSAnim(weaponId, 'take');
    
    if (action) {
        let duration = action._clip.duration * 1000;
        setTimeout(() => {
            isWeaponBusy = false;
            window.weaponIdleTimer = 1.0; 
        }, duration);
    } else {
        isWeaponBusy = false; 
    }
}

// ==========================================
// ESZKÖZ-FELISMERÉS ÉS HUD BEÁLLÍTÁS
// ==========================================
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Ha PC-n vagyunk, azonnal elrejtjük a mobil-specifikus gombokat a HUD-ról!
document.addEventListener("DOMContentLoaded", () => {
    if (!isMobile) {
        const switchBtn = document.getElementById('switch-weapon-btn');
        const shootBtn = document.getElementById('shoot-btn');
        const joyZoneL = document.getElementById('zone-left');
        const joyZoneR = document.getElementById('zone-right');
        const joyBase = document.getElementById('joy-base');
        
        if(switchBtn) switchBtn.classList.add('hidden');
        if(shootBtn) shootBtn.classList.add('hidden');
        if(joyZoneL) joyZoneL.style.pointerEvents = 'none'; // Kikapcsoljuk az érintést bal oldalon
        if(joyZoneR) joyZoneR.style.pointerEvents = 'none'; // Kikapcsoljuk az érintést jobb oldalon
        if(joyBase) joyBase.classList.add('hidden');
    }
});

// ==========================================
// OBJECT POOL INICIALIZÁLÁS (Betöltéskor)
// ==========================================

// 1. AAA Folyadékcsepp textúra generálása (Memóriában, letöltés nélkül!)
const dropCanvas = document.createElement('canvas');
dropCanvas.width = 32; dropCanvas.height = 32;
const dCtx = dropCanvas.getContext('2d');
const dGrad = dCtx.createRadialGradient(16, 16, 2, 16, 16, 16);
dGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');   // Tömör mag
dGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)'); // Lágy átmenet
dGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');     // Átlátszó szél
dCtx.fillStyle = dGrad;
dCtx.fillRect(0, 0, 32, 32);
const dropTexture = new THREE.CanvasTexture(dropCanvas);

for(let i = 0; i < 400; i++) { // JAVÍTÁS: 150 helyett 400, hogy bírja a folyamatos sugarat!
    // 3D Kockák helyett 2D Sprite-okat (lencséket) használunk, amik mindig a kamerába néznek!
    let mat = new THREE.SpriteMaterial({ 
        map: dropTexture, 
        color: 0xaa0000, // Sötét vérvörös
        transparent: true,
        opacity: 1.0,
        depthWrite: false, // Nem vágják le egymást csúnyán
        blending: THREE.NormalBlending
    });
    let p = new THREE.Sprite(mat);
    p.visible = false;
    scene.add(p);
    bloodPool.push({ mesh: p, active: false, vx: 0, vy: 0, vz: 0, life: 0 });
}

var activeSpurts = []; // ÚJ: A sugárban spriccelő vérhez

const poolLaserMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3 });
// 20 helyett legyen 60, hogy sose fogyjon ki a tár a memóriában!
for(let i = 0; i < 60; i++) { 
    let lGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    let l = new THREE.Line(lGeo, poolLaserMat);
    l.frustumCulled = false; // <--- EZ OLDJA MEG A PROBLÉMÁT! Sosem tűnik el indokolatlanul!
    l.visible = false;
    scene.add(l);
    laserPool.push({ mesh: l, active: false, life: 0 });
}

// ==========================================
// Radioaktív por (Részecskék) - FELÚJÍTVA!
// ==========================================
// 1. Létrehozunk egy ragyogó, kerek textúrát (külső kép nélkül, memóriában)
const particleCanvas = document.createElement('canvas');
particleCanvas.width = 32; particleCanvas.height = 32;
const pContext = particleCanvas.getContext('2d');
const gradient = pContext.createRadialGradient(16, 16, 0, 16, 16, 16);
gradient.addColorStop(0, 'rgba(200, 255, 200, 1)'); // Fehéres-zöld mag
gradient.addColorStop(0.4, 'rgba(0, 255, 0, 0.6)'); // Élénkzöld perem
gradient.addColorStop(1, 'rgba(0, 50, 0, 0)');      // Átlátszó szél
pContext.fillStyle = gradient;
pContext.fillRect(0, 0, 32, 32);
const particleTexture = new THREE.CanvasTexture(particleCanvas);

// 2. Részecskék legenerálása
const radGeo = new THREE.BufferGeometry();
const radVerts = [];
for (let i = 0; i < 400; i++) { // Kicsit több részecske
    radVerts.push((Math.random() - 0.5) * 50, Math.random() * 10, (Math.random() - 0.5) * 50);
}
radGeo.setAttribute('position', new THREE.Float32BufferAttribute(radVerts, 3));

// 3. Izzó, textúrázott anyag
const radMat = new THREE.PointsMaterial({ 
    color: 0x55ff55, 
    size: 0.3, // JAVÍTÁS: Megfeleztük a méretüket (0.6 -> 0.3)
    map: particleTexture, 
    transparent: true, 
    blending: THREE.AdditiveBlending, 
    depthWrite: false 
});

const radSystem = new THREE.Points(radGeo, radMat);
radSystem.renderOrder = 999; 
    
    scene.add(radSystem);

// ==========================================
// --- ÚJ: 3D TOXIKUS FÜST (VOLUMETRIC FOG) ---
// ==========================================
const fogParticleCount = 150; // Mennyi füstpamacs legyen a levegőben
const fogGeo = new THREE.BufferGeometry();
const fogVerts = [];
// Eltároljuk a részecskék forgási irányát és sebességét (később az animáláshoz kell)
const fogData = []; 

for (let i = 0; i < fogParticleCount; i++) {
    // Egy nagy, 40x40 méteres területen szórjuk szét őket a kamera magasságában (Y: 0-4 méter között)
    let x = (Math.random() - 0.5) * 40;
    let y = Math.random() * 4;
    let z = (Math.random() - 0.5) * 40;
    fogVerts.push(x, y, z);
    
    fogData.push({
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.02,
        vz: (Math.random() - 0.5) * 0.05,
    });
}
fogGeo.setAttribute('position', new THREE.Float32BufferAttribute(fogVerts, 3));

// Csinálunk egy nagyon lágy, elmosódott füst textúrát a memóriában (nem izzó pont, hanem felhő)
const fogCanvas = document.createElement('canvas');
fogCanvas.width = 128; fogCanvas.height = 128;
const fCtx = fogCanvas.getContext('2d');
const fGrad = fCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
fGrad.addColorStop(0, 'rgba(40, 255, 90, 0.4)');   // Zöldes közép
fGrad.addColorStop(0.5, 'rgba(20, 180, 60, 0.1)'); // Halványabb szélek
fGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');         // Átlátszó perem
fCtx.fillStyle = fGrad;
fCtx.fillRect(0, 0, 128, 128);
const fogTexture = new THREE.CanvasTexture(fogCanvas);

const fogMat = new THREE.PointsMaterial({
    size: 15.0, // ÓRIÁSI méretű felhők, amik egybeolvadnak!
    map: fogTexture,
    transparent: true,
    opacity: 0.0, // Alapból láthatatlan (A pocsolyák száma fogja növelni a sűrűséget!)
    depthWrite: false, // Nagyon fontos: hogy a füst mögötti tárgyak (fegyver, zombik) ne tűnjenek el hibásan!
    blending: THREE.AdditiveBlending // Szép, világítós mocsári gőz
});

const fogSystem = new THREE.Points(fogGeo, fogMat);
// Kiemeljük a falak fölé, hogy a falba lógó részek ne vágódjanak le olyan csúnyán
fogSystem.renderOrder = 1; 
scene.add(fogSystem);

// ==========================================
// 2. HANGRENDSZER ÉS AUDIO BETÖLTÉS
// ==========================================
listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();
const sounds = {};

function loadSound(name, url, volume = 1.0, isLoop = false) {
    const sound = new THREE.Audio(listener);
    audioLoader.load(url, (buffer) => {
        sound.setBuffer(buffer);
        sound.setVolume(volume);
        sound.setLoop(isLoop);
        sound.baseVolume = volume; // <--- JAVÍTÁS: Eltároljuk az eredeti hangerőt!
        sounds[name] = sound;
    });
}

// --- ALAP RENDSZER ÉS ZENE ---
loadSound('music', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/f162302b83992b9adfe75b1c3ade387a25e2478d/music.mp3', 0.1, true); 
loadSound('menuMusic', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/212958c21ddceb0db80820c1d91b06b7d9a5a950/main.m4a', 0.5, true); 
loadSound('loadingMusic', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/fea9f5d83283e004ddc56527e42e8d665ef93bc0/Loading%20Screen%20music.mp3', 0.5, true);
loadSound('whispers', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/610723d633422339cc4d1d3384fcc2a70a98f27a/whispers.mp3', 0.0, true); 
loadSound('glitch', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/102a0d507c37ef59b9aeb075e1b30110c95f3b3f/noice02.mp3', 1.0);
loadSound('defibrillator', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/306cb8beb9956a05ffb3ea66d00923be4cb95b5c/Sound/shock.mp3', 1.0);

// --- ÚJ: JÁTÉKOS AKCIÓK ---
loadSound('playerStep', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/player%20foot%20step.mp3', 0.15); // <-- 0.4 helyett 0.15
loadSound('heavyBreathing', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/9c9e289dd7d9bc589b5f1014a8469bb8375929ea/Sound/heavy_breathing_8sec.mp3', 1.2); 
loadSound('cough', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/537e7833404c4f1d16355bce8db5451231f4797e/coughing.mp3', 1.0);
loadSound('hurt', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/me%20get%20hit.mp3', 1.0);
loadSound('deathScream', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/dd55e7027743a8ed1ec9aa2c9bd70895c3605773/Death%20scream.mp3', 1.0);
loadSound('looting', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/search%207%20sec.mp3', 1.0);
loadSound('pickup', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/610723d633422339cc4d1d3384fcc2a70a98f27a/pick%20up%20item.mp3', 1.0);
loadSound('genStab', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/gen%20stab%20use.mp3', 1.0);

// --- ÚJ: FEGYVEREK (LÖVÉS, TÖLTÉS, ÜRES) ---
loadSound('dryFire', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/dire%20fire.mp3', 1.0);
loadSound('holster', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/holster%20gun.mp3', 0.8);
loadSound('knifeHit', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/b211fb47b900f276a65e2667467386ef325d70ef/Sound/Knife%20hit.mp3', 1.0);

loadSound('pistolShoot', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/pistol%20shot.mp3', 0.7);
loadSound('pistolReload', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/reload%20pistol.mp3', 1.0);

loadSound('rifleShoot', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/gun%20shoot.mp3', 0.3); // SMG lövés marad az alap
loadSound('rifleReload', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/Reload%20smg.mp3', 0.8);

loadSound('shotgunShoot', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/shotgun%20fire%20and%20one%20pump.mp3', 1.0);
loadSound('shotgunReload', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/shotgun%20reload%20one%20bullet.mp3', 1.0);

loadSound('superShoot', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/single%20shot%20revolver.mp3', 1.0);
loadSound('superReload', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/reload%20a%20single%20bullet%20on%20revolver.mp3', 1.0);
loadSound('superClose', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/spin%20revolver.mp3', 1.0);
// Szeizmikus Rezonátor hangja (10mp csipogás + 7mp energia-sebzés)
loadSound('resonatorAudio', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/b0ce018a1c718cf2f2aaa1e32a46418028fd049e/Sound/Seismic%20Resonator.mp3', 1.0);
// --- ÚJ: Szörnyek szenvedése a Rezonátorban (5 sec) ---
loadSound('resonatorScream', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/35033a30a8ae1e549584d93357797b5f670778f6/Sound/resonator%20monster%20screem.mp3', 0.5);
// --- ÚJ: Rezonátor Szerelése (3 sec) és Élesítése ---
loadSound('resonatorInstall', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/ecee88afd568854963e855216ed1c82a9bececb9/Sound/install%20resonator.mp3', 1.0);
loadSound('resonatorPowerOn', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/f7d4dd2396d884b481e26201beeb38a1a8738590/Sound/rezonator%20power%20on.mp3', 1.0);

// --- ÚJ: TERMINÁL ÉS UI ---
loadSound('termOpen', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/open%20terminal.mp3', 1.0);
loadSound('termClose', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/close%20terminal.mp3', 1.0);
loadSound('purchase', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/purchse%20sound.mp3', 1.0);
loadSound('error', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/error.mp3', 1.0);
loadSound('questAccept', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/accept%20quest.mp3', 1.0);
loadSound('questComplete', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/completed%20quest.mp3', 1.0);

// --- ÚJ: ZOMBIK (Később kötjük rájuk!) ---
loadSound('zombieHit', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/zombie%20get%20hit.mp3', 1.0);
loadSound('burst', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df6d333b9936fa81cffbce5c2bdb8891eaf9ee37/burst.mp3', 1.0);
loadSound('cryoGas', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/5abe88d4b8b1dd33f0887daa25511297b89eecbd/cryo%20gas.mp3', 0.8);
loadSound('iceCrack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/46c22b763dcc098c3c6581afdfbccad22203c429/ice%20brake.mp3', 0.5);
loadSound('acidBurn', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/acid%20burning%201%20sec.mp3', 0.2); // <-- 1.0 helyett 0.4
loadSound('plantBite', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/bite%20sound.mp3', 1.0);

// Zombi Death/Attack/Idle/Step hangok betöltve, de majd a 2. fázisban használjuk őket!
loadSound('hostAttack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/host%20attack.mp3', 1.0);
loadSound('hostDeath', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/host%20death.mp3', 1.0);
loadSound('hostGrowl', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/host%20gowling.mp3', 1.0);
loadSound('hostStep', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/host%20footstep.mp3', 0.8);

loadSound('runnerAttack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/runner%20attack.mp3', 1.0);
loadSound('runnerDeath', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/runner%20death.mp3', 1.0);
loadSound('runnerGrowl', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/runner%20growling.mp3', 1.0);
loadSound('runnerStep', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/runner%20footstep.mp3', 0.8);

loadSound('tankAttack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/tank%20attack.mp3', 1.0);
loadSound('tankDeath', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/tank%20death.mp3', 1.0);
loadSound('tankGrowl', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/tank%20growling.mp3', 1.0);
loadSound('tankStep', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/tank%20footstep.mp3', 1.0);

loadSound('hiderAttack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/hider%20attack.mp3', 0.5);
loadSound('hiderStep', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/hider%20step.mp3', 0.05);

loadSound('crawlerDeath', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/crawler%20detah.mp3', 1.0);
loadSound('crawlerStep', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/crawler%20footstep%203%20sec.mp3', 0.8);

loadSound('bossAttack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/d992c4493c5e5a4fb0c3e9d8134bdc308aa5f46d/boss%20screem%20v2.mp3', 1.0);
loadSound('bossDeath', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/nexus%20node%20death.mp3', 1.0);
loadSound('bossGrowl', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/72f3fdbf963b4e0b53e98a3633e958164014a89e/Sound/nexus%20node%20growling.mp3', 1.0);

window.unlockAudio = function() {
    if (listener.context.state === 'suspended') listener.context.resume();
    if (sounds['music'] && sounds['music'].buffer && !sounds['music'].isPlaying) sounds['music'].play();
}

window.playSound = function(name, offset = 0, fadeOutDuration = 0, distance = null) {
    if (sounds[name] && sounds[name].buffer) {
        
        // FADE OUT (Boss ordításnál)
        if (fadeOutDuration > 0 && sounds[name].isPlaying) {
            let gainNode = sounds[name].gain.gain;
            gainNode.cancelScheduledValues(listener.context.currentTime);
            gainNode.linearRampToValueAtTime(0.01, listener.context.currentTime + fadeOutDuration);
            setTimeout(() => { 
                if (sounds[name].isPlaying) {
                    sounds[name].stop();
                    sounds[name].setVolume(sounds[name].baseVolume); // Visszaállítjuk az eredetit
                }
            }, fadeOutDuration * 1000);
            return;
        }

        // --- JAVÍTÁS: MINDIG AZ ALAPHANGERŐBŐL SZÁMOLUNK! ---
        let finalVolume = sounds[name].baseVolume;
        
        // --- ÚJ: LÉPCSŐZETES HALKULÁS 3 MÉTERENKÉNT (Max 15 méter) ---
        if (distance !== null) {
            if (distance > 15.0) return; // 15 méter felett NÉMA
            else if (distance > 12.0) finalVolume *= 0.1; // 12-15m: Épphogy hallható (10%)
            else if (distance > 9.0)  finalVolume *= 0.3; // 9-12m: Nagyon halk (30%)
            else if (distance > 6.0)  finalVolume *= 0.6; // 6-9m: Közepes (60%)
            else if (distance > 3.0)  finalVolume *= 0.8; // 3-6m: Kicsit halkabb (80%)
            // 0-3 méter között marad a 100% (finalVolume)
        }

        // --- PÁRHUZAMOS LEJÁTSZÁS (Overlapping) ---
        if (sounds[name].isPlaying && !sounds[name].getLoop()) {
            try {
                const tempSound = new THREE.Audio(listener);
                tempSound.setBuffer(sounds[name].buffer);
                tempSound.setVolume(finalVolume);
                tempSound.offset = offset;
                tempSound.play();
                
                // --- JAVÍTÁS: MEMÓRIA SZIVÁRGÁS MEGSZÜNTETÉSE ---
                // Kiszámoljuk a hang hosszát, és miután lejárt, töröljük a hangkártyáról!
                let duration = (sounds[name].buffer.duration * 1000) + 100; // Pici rátartás
                setTimeout(() => {
                    if (tempSound.isPlaying) tempSound.stop();
                    tempSound.disconnect(); // Lecsatlakoztatjuk a memóriából
                }, duration);
                
            } catch(e) {}
        } else {
            if (sounds[name].isPlaying) sounds[name].stop();
            sounds[name].offset = offset;
            sounds[name].setVolume(finalVolume); // Biztonságos Three.js hangerő állítás
            sounds[name].play();
        }
    }
}

window.playHitmarkerSound = function() {
    if (!listener.context) return;
    try {
        const now = listener.context.currentTime;
        const osc = listener.context.createOscillator();
        const gain = listener.context.createGain();
        osc.connect(gain); gain.connect(listener.context.destination);
        osc.type = 'triangle'; osc.frequency.setValueAtTime(2000, now); osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } catch(e) {}
}


// ==========================================
// 3. PÁLYA ÉS MODELLEK BETÖLTÉSE
// ==========================================
const textureLoader = new THREE.TextureLoader(); 
// VISSZAÁLLÍTVA A RÉGI MŰKÖDŐ BETÖLTÉSRE
const floorTex = textureLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/35c845f70c8ae3a8577562a70a9abac70baadcf1/Pictures/LVL3%20Floor.png'); 
floorTex.wrapS = THREE.RepeatWrapping; floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(10, 10); 
const wallTex = textureLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6ff430b224fb8cd358b83fade1e06710d708d094/1783431502863.png'); 
wallTex.wrapS = THREE.RepeatWrapping; wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(4, 1); 

const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.1 }); 
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.2 });

const arenaSize = 50, wallHeight = 4, wallThickness = 2;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(arenaSize, arenaSize), floorMat); 
floor.rotation.x = -Math.PI / 2; 
scene.add(floor);

function createWall(w, h, d, x, z) { 
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); 
    mesh.position.set(x, h / 2, z); 
    scene.add(mesh); 
    wallHitboxes.push(new THREE.Box3().setFromObject(mesh)); 
}

createWall(arenaSize + 4, wallHeight, 2, 0, -26); 
createWall(arenaSize + 4, wallHeight, 2, 0, 26); 
createWall(2, wallHeight, arenaSize, -26, 0); 
createWall(2, wallHeight, arenaSize, 26, 0);  

const pillars = [{x:-10,z:-10}, {x:10,z:-10}, {x:-10,z:10}, {x:10,z:10}];
pillars.forEach(p => createWall(4, wallHeight, 4, p.x, p.z));

window.checkWallCollision = function(x, z, r) { 
    const box = new THREE.Box3(new THREE.Vector3(x-r, 0, z-r), new THREE.Vector3(x+r, 2, z+r)); 
    for(let i=0; i<wallHitboxes.length; i++) { 
        if(box.intersectsBox(wallHitboxes[i])) return true; 
    } 
    return false; 
}

const gltfLoader = new THREE.GLTFLoader();

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/061e749b34c35aa535f6a41895cdeaebaa6f4d1c/flesh_bomb.glb', (gltf) => {
    plantModel = gltf.scene; 
    plantAnimations = gltf.animations; 
    plantModel.traverse((c) => { if(c.isMesh) c.frustumCulled = false; }); 
});

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6100b7a688723ad1b3a67403b99e8dbaf82fc040/three-head.glb', (gltf) => { 
    bossModel = gltf.scene; bossAnimations = gltf.animations; 
    bossModel.traverse((c) => { if(c.isMesh) c.frustumCulled = false; }); 
});

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7e6d7e06a66a6c9df5665f7df2a92cdfb14846d7/tankv2.glb', (gltf) => { 
    tankModel = gltf.scene; tankAnimations = gltf.animations; 
    tankModel.traverse((c) => { if(c.isMesh) c.frustumCulled = false; }); 
});

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/3530b5fab56eb32e0fe925babfef2db89bd2b1ac/crying_head_2.glb', (gltf) => { 
    crawlerModel = gltf.scene; 
    crawlerAnimations = gltf.animations; 
    crawlerModel.traverse((c) => { if(c.isMesh) c.frustumCulled = false; }); 
});

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/fdec8a5bc1e3f9c22360ed369f686eddf256695f/3DModels/Seismic%20Resonator.glb', (gltf) => {
    resonatorModel = gltf.scene;
    resonatorAnimations = gltf.animations;
    resonatorModel.traverse((c) => { if (c.isMesh) c.frustumCulled = false; });
    console.log("[KRONOS] Szeizmikus Rezonátor kalibrálva.");
});

// ==========================================
// --- ÚJ AAA FPS FEGYVER RENDSZER BETÖLTÉSE ---
// ==========================================

function loadFPSWeapon(id, url, scale, posOffset, rotOffset, animMap) {
    gltfLoader.load(url, (gltf) => {
        let gltfScene = gltf.scene;
        
        let wrapper = new THREE.Group();
        wrapper.add(gltfScene);

        wrapper.scale.set(scale, scale, scale);
        wrapper.position.set(posOffset.x, posOffset.y, posOffset.z); 
        wrapper.rotation.set(rotOffset.x, rotOffset.y, rotOffset.z);
        
        gltfScene.traverse((c) => { 
            if (c.isMesh) { 
                let nodeName = c.name.toLowerCase();
                if (nodeName.includes('pose') || nodeName.includes('controller') || nodeName.includes('text') || nodeName.includes('helper')) {
                    c.visible = false; 
                } else {
                    c.frustumCulled = false; 
                    c.castShadow = true; 
                }
            } 
        });
        
        wrapper.visible = false;
        camera.add(wrapper); 

        let mixer = new THREE.AnimationMixer(gltfScene);
        let actions = {};

        if (gltf.animations && gltf.animations.length > 0) {
            for (let animName in animMap) {
                let index = animMap[animName];
                let clip;

                if (Array.isArray(index)) {
                    let fps = 30; 
                    let startFrame = Math.round(index[0] * fps);
                    let endFrame = Math.round(index[1] * fps);
                    clip = THREE.AnimationUtils.subclip(gltf.animations[0], animName, startFrame, endFrame, fps);
                } else {
                    clip = gltf.animations[index];
                }

               if (clip) {
                    let action = mixer.clipAction(clip);
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true; 
                    
                    if (animName === 'watch') action.timeScale = 0.6; 
                    
                    // --- TÖKÉLETES SZINKRON A 0.08-as TŰZGYORSASÁGHOZ ---
                    if (id === 'rifle' && animName === 'shoot') {
                        action.timeScale = 2.5; // Ez garantálja, hogy sosem fagy meg a keze a lövések között!
                    }
                    
                    actions[animName] = action;
                }
            }
        }

        loadedFPSModels[id] = { mesh: wrapper, mixer: mixer, actions: actions, currentAction: null }; // <--- ÚJ: currentAction
        console.log(`[KRONOS] Fegyver kalibrálva: ${id}`);
        
        if (id === currentWeaponId) equipWeapon(currentWeaponId);
    });
}

// --- FEGYVEREK BETÖLTÉSE ---

// 1. PISZTOLY
loadFPSWeapon('pistol', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/54aa4e08f9a8991f952a06b845453bf31403aff8/3DModels/fps_pistol_animated.glb', 
    0.01, {x: 0.150, y: -0.300, z: -0.350}, {x: 0.000, y: 3.142, z: 0.000}, 
    { shoot: [7.47, 7.80], reload: [2.13, 4.35], hide: [4.35, 4.73], take: [4.73, 5.90], watch: [5.90, 6.80], bash: [6.80, 7.46] }
);

// 2. GÉPKARABÉLY (SMG)
loadFPSWeapon('rifle', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/54aa4e08f9a8991f952a06b845453bf31403aff8/3DModels/fps_animated_smg.glb', 
    0.01, {x: 0.200, y: -0.300, z: -0.050}, {x: 0.000, y: 3.142, z: 0.000}, 
    { shoot: [0, 0.20], reload: [0.20, 2.70], hide: [4.30, 4.65], take: [4.65, 5.91], watch: [5.91, 7.15], bash: [7.10, 7.80] }
);

// 3. NEHÉZ REVOLVER (SUPER)
loadFPSWeapon('super', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/54aa4e08f9a8991f952a06b845453bf31403aff8/3DModels/revolver_animated.glb', 
    0.01, {x: 0.250, y: -0.200, z: -0.350}, {x: 0.000, y: 3.042, z: 0.000}, 
    { shoot: [0, 0.45], reload: [0.45, 7.40], hide: [7.40, 7.80], take: [7.80, 8.95], watch: [8.95, 9.80], bash: [9.80, 10.66] }
);

// 4. SÖRÉTES PUSKA
loadFPSWeapon('shotgun', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/54aa4e08f9a8991f952a06b845453bf31403aff8/3DModels/shotgun_animated.glb', 
    0.01, {x: 0.200, y: -0.300, z: -0.050}, {x: 0.000, y: 3.142, z: 0.000}, 
    { shoot: [0, 0.40], pump: [0.36, 1.12], reloadStart: [1.12, 1.60], reload: [1.60, 2.60], reloadEnd: [2.60, 2.95], hide: [2.95, 3.35], take: [3.35, 4.30], watch: [4.30, 5.20], bash: [5.31, 6.00] }
);

// 5. KÉS (Erőből Szúrás - Power Hit!)
loadFPSWeapon('melee', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/54aa4e08f9a8991f952a06b845453bf31403aff8/3DModels/knife_animated.glb', 
    0.01, {x: 0.150, y: -0.300, z: -0.350}, {x: 0.000, y: 3.142, z: 0.000}, 
    { watch: [0, 1.33], charge: [3.40, 3.52], strike: [3.52, 4.14], hide: [4.15, 4.48], take: [4.48, 4.83] }
);

// 6. GEN-STAB
loadFPSWeapon('heal', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/e6a5236b367eedf148605c2f1e504e6a25bd98d4/3DModels/Gen-stab.glb', 
    1.0, {x: 0.000, y: -0.150, z: -0.100}, {x: 0.000, y: 3.142, z: 0.000}, 
    { inject: 0 }
);

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/main/zombie.glb', (gltf) => { 
    zombieModel = gltf.scene; 
    zombieAnimations = gltf.animations; 
    zombieModel.traverse((c) => { if(c.isMesh) c.frustumCulled = false; }); 
});

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/0214d22fe4ca2284df78cbf1eb8f820834651f9a/runerv2.glb', (gltf) => { 
    fastZombieModel = gltf.scene; 
    fastZombieAnimations = gltf.animations; 
    fastZombieModel.traverse((c) => { if(c.isMesh) c.frustumCulled = false; }); 
});

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/6aa130a4c148ae5e16855905c4a15b9978e974ee/hider%20zombie.glb', (gltf) => { 
    hiderZombieModel = gltf.scene; 
    hiderZombieAnimations = gltf.animations; 
    hiderZombieModel.traverse((c) => { if(c.isMesh) c.frustumCulled = false; }); 
});

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/db069dbbe97f2d9cd71985c37eb64dad31848434/ammo.glb', (gltf) => { ammoModel = gltf.scene; });
gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/db069dbbe97f2d9cd71985c37eb64dad31848434/health.glb', (gltf) => { healthModel = gltf.scene; });

function createToxicPuddle(x, z) {
    const baseRadius = 0.7 + Math.random() * 0.4;
    // 1. Felvisszük 32 szegmensre, hogy szép íves lehessen a széle
    const geo = new THREE.CircleGeometry(baseRadius, 32); 

    const posAttribute = geo.attributes.position;
    
    // Generálunk két véletlenszerű kezdőértéket, hogy minden pocsolya más alakú legyen
    const phase1 = Math.random() * Math.PI * 2;
    const phase2 = Math.random() * Math.PI * 2;

    for (let i = 1; i < posAttribute.count; i++) {
        let vx = posAttribute.getX(i);
        let vy = posAttribute.getY(i);

        // Kiszámoljuk az adott pont szögét a körön belül
        let angle = Math.atan2(vy, vx);

        // 2. ORGANIKUS FORMA: Szinusz hullámokkal lágyan torzítjuk
        // Ez 3 és 5 "hullámot" rak a kör köré, ami teljesen sima paca formát ad
        let distort = 1.0 
                    + 0.15 * Math.sin(angle * 3 + phase1) 
                    + 0.10 * Math.cos(angle * 5 + phase2);

        posAttribute.setX(i, vx * distort);
        posAttribute.setY(i, vy * distort);
    }
    
    geo.computeVertexNormals();

    // A LEGFONTOSABB SOR: globalToxicMat.clone()
    const mesh = new THREE.Mesh(geo, globalToxicMat.clone()); 
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI; 

    // --- JAVÍTÁS: A POCSOLYA PICIBŐL INDUL (LASSAN FOLYIK KI) ---
    mesh.scale.set(0.01, 0.01, 0.01);
    
    // Eltároljuk a "targetScale" változót, hogy tudjuk, meddig kell nőnie
    mesh.userData = { spawnWave: currentWave, state: 'green', targetScale: 1.0 };

    mesh.position.set(x, 0.02, z);
    scene.add(mesh);
    toxicPuddles.push(mesh);
    if (typeof updateToxicFog === 'function') updateToxicFog();
}

/// --- TOXIKUS KÖD SZÁMÍTÁSA ---
function updateToxicFog() {
    if (!scene.fog) return;

    let maxPuddles = 200; 
    let currentPuddles = Math.min(toxicPuddles.length, maxPuddles);
    
    // 1. A JÁTÉKMOTOR ALAP KÖDJE (Ami a távolságot takarja el)
    let fogDensity = 0.035 + (currentPuddles / maxPuddles) * 0.6;
    scene.fog.density = fogDensity;

   // --- ÚJ: A MI 3D FÜSTÜNK SŰRŰSÉGÉNEK NÖVELÉSE! ---
    if (typeof fogMat !== 'undefined') {
        fogMat.opacity = (currentPuddles / maxPuddles) * 0.6;
    }

    // ==========================================
    // JAVÍTÁS: HA AKTÍV A FAGYASZTÁS, NE SZÍNEZD VISSZA ZÖLDRE!
    // ==========================================
    if (typeof activeFreezeTimer !== 'undefined' && activeFreezeTimer > 0) {
        return; // Kilépünk a függvényből, hagyjuk kék/fehér állapotban a ködöt!
    }

    // 2. SZÍN: Sötét, klausztrofób mocsári zöld
    let baseG = 26;  
    let maxG = 40;
    let currentG = baseG + (currentPuddles / maxPuddles) * (maxG - baseG);
    
    scene.fog.color.setRGB(5 / 255, currentG / 255, 5 / 255);

    // 3. A világ hátterének szinkronizálása
    scene.background.copy(scene.fog.color);
}

// ==========================================
// DIREKTÍVA HUD FRISSÍTŐ FÜGGVÉNY
// ==========================================
window.updateDirectiveHUD = function() {
    const dirHud = document.getElementById('directive-hud');
    if (!dirHud) return;

    if (playerStats.activeDirective && gameState === 'PLAYING') {
        dirHud.classList.remove('hidden');
        
        let activeData = null;
        ['tier1', 'tier2', 'tier3'].forEach(tier => {
            let found = OmniCorpDirectives[tier].find(d => d.id === playerStats.activeDirective);
            if (found) activeData = found;
        });

        if (activeData) {
            document.getElementById('directive-title').innerText = activeData.title;
            const progDisplay = document.getElementById('directive-progress');
            
            if (playerStats.directiveProgress >= activeData.goal) {
                progDisplay.innerText = "TELJESÍTVE!";
                progDisplay.style.color = "#00ff00";
            } else {
                progDisplay.innerText = `${playerStats.directiveProgress} / ${activeData.goal}`;
                progDisplay.style.color = "#ffaa00";
            }
        }
    } else {
        dirHud.classList.add('hidden');
    }
}

// ==========================================
// VÁLLALATI DIREKTÍVÁK ÉRTÉKELÉSE (SZÁMOLÓ)
// ==========================================
window.checkDirective = function(actionType, targetType) {
    if (!playerStats.activeDirective) return; // Nincs aktív küldetés

    let activeData = null;
    ['tier1', 'tier2', 'tier3'].forEach(tier => {
        let f = OmniCorpDirectives[tier].find(d => d.id === playerStats.activeDirective);
        if (f) activeData = f;
    });

    if (!activeData) return;
    if (playerStats.directiveProgress >= activeData.goal) return; // Már kész van!

    // Ha a játékos cselekedete és a célpont megegyezik a feladattal:
    if (activeData.type === actionType && activeData.target === targetType) {
        playerStats.directiveProgress++;
        if (typeof savePlayerStats === 'function') savePlayerStats();
        if (typeof updateUI === 'function') updateUI();

        // --- HA MOST LETT KÉSZ: JUTALOM OSZTÁS! ---
        if (playerStats.directiveProgress >= activeData.goal) {
            playSound('questComplete'); // JAVÍTÁS: Küldetés teljesítve hang!
            score += activeData.reward; // Pénz hozzáadása!
            
            // Beírjuk a teljesített listába, hogy többé ne sorsolja ki
            playerStats.completedDirectives.push(playerStats.activeDirective);
            playerStats.activeDirective = null; // Levesszük az aktív státuszt
            playerStats.directiveProgress = 0;
            
            // Sárga felvillanás a képernyőn bónuszként
            const ammoFlash = document.getElementById('ammo-flash'); 
            if(ammoFlash) { ammoFlash.style.opacity = 0.8; setTimeout(() => ammoFlash.style.opacity = 0, 500); }
            
            if (typeof savePlayerStats === 'function') savePlayerStats();
            if (typeof updateUI === 'function') updateUI();
        }
    }
}

// ==========================================
// --- ÚJ: FEGYVER LÖKÉS (BASH / STUN) LOGIKA ---
// ==========================================
window.performWeaponBash = function() {
    if (gameState !== 'PLAYING' || (typeof isDeploying !== 'undefined' && isDeploying)) return;
    
    // Késsel (bal klikk a támadás) és Gen-Stabbal nem lehet lökni!
    if (currentWeaponId === 'melee' || currentWeaponId === 'heal') return; 

    // Ha épp lő vagy előveszi, nem lökhet. DE a töltést megszakíthatja vele!
    if (isWeaponBusy && !isReloading) return; 

    if (isReloading) {
        window.cancelReloadRequested = true;
    }

    isWeaponBusy = true;
    isReloading = false;
    document.getElementById('reload-text').classList.add('hidden');

    let action = playFPSAnim(currentWeaponId, 'bash');
    let totalDur = action ? (action._clip.duration * 1000) : 500;

    // --- IDŐZÍTÉS KISZÁMÍTÁSA A TE IDŐBÉLYEGEID ALAPJÁN ---
    let hitDelay = 200; // Alap: Pisztoly (7.00 - 6.80 = 0.2mp) és SMG (7.30 - 7.10 = 0.2mp)
    if (currentWeaponId === 'shotgun') hitDelay = 190; // Sörétes (5.50 - 5.31 = 0.19mp)
    if (currentWeaponId === 'super') hitDelay = 300;   // Revolver (10.10 - 9.80 = 0.3mp)

    // A csapás hangja (Suhintás a kés hangjával, de lövés nélkül!)
    setTimeout(() => { playSound('knifeHit', 0.0); }, hitDelay - 50);

    // --- A TALÁLAT ÉRZÉKELÉSE ---
    setTimeout(() => {
        globalRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = globalRaycaster.intersectObjects(enemyHitboxes, false);

        // Rövid távolság: 2.5 méter
        if (intersects.length > 0 && intersects[0].distance < 2.5) { 
            playSound('zombieHit'); // Tompa ütődés hang
            let hitObj = intersects[0].object;
            let en = enemies.find(e => e.bodyHitbox === hitObj || e.headHitbox === hitObj);

if (en) {
                    // STUN (Szédítés) alkalmazása zombi típusonként
                    if (en.type === 'boss') {
                        en.health -= 2; 
                    } else {
                        if (en.type === 'tank') en.stunTimer = 0.5; 
                        else if (en.type === 'runner') en.stunTimer = 1.5; 
                        else en.stunTimer = 2.5; 
                        
                        en.health -= 2; 
                    }
                    
                    // --- JAVÍTÁS: Üvegre csapódó vér a fegyver-ütésnél! ---
                    if (typeof splashVisorBlood === 'function') splashVisorBlood();

                    // ==========================================
                    // --- ÚJ: VÉRFRÖCCS FEGYVERÜTÉSNÉL (BASH) ---
                    // ==========================================
                    // Kiszámoljuk az ütés irányát a kamerától a találati pontig
                    let bashDir = new THREE.Vector3().subVectors(intersects[0].point, camera.position).normalize();
                    let bloodSide = new THREE.Vector3().crossVectors(bashDir, new THREE.Vector3(0, 1, 0)).normalize();
                    let sideMult = Math.random() > 0.5 ? 1 : -1;

                    // Tompa ütés (blunt force), így a vér erősen oldalra és srégen lefelé csapódik a puskatusól!
                    let sprayDx = bloodSide.x * 0.35 * sideMult + bashDir.x * 0.1;
                    let sprayDz = bloodSide.z * 0.35 * sideMult + bashDir.z * 0.1;
                    let sprayDy = -0.1; // Meredeken lefelé, kicsapódik a földre
                    
                    // 1. Kósza cseppek (Nagyobb erővel repülnek szét a tompa ütéstől)
                    for (let i = 0; i < 6; i++) {
                        let p = bloodPool.find(part => !part.active);
                        if (p) {
                            p.active = true; p.life = 0.8;
                            p.mesh.material.color.setHex(0x55ff55); 
                            p.mesh.material.opacity = 1.0; 
                            p.mesh.position.copy(intersects[0].point); 
                            p.mesh.scale.setScalar(0.15); 
                            p.vx = sprayDx * 0.8 + (Math.random() - 0.5) * 0.15; 
                            p.vy = sprayDy + (Math.random() - 0.5) * 0.15;    
                            p.vz = sprayDz * 0.8 + (Math.random() - 0.5) * 0.15; 
                            p.mesh.visible = true;
                        }
                    }

                    // 2. Rövid, vastag sugár a traumától
                    if (typeof activeSpurts !== 'undefined') {
                        activeSpurts.push({
                            pos: intersects[0].point.clone(),
                            timer: 0.2, // Rövidebb ideig spriccel, mint egy golyó ütötte seb!
                            dropTimer: 0,
                            dx: sprayDx, 
                            dy: sprayDy, 
                            dz: sprayDz  
                        });
                    }
                    // ==========================================

                    if (en.health <= 0) killZombie(en, false);
                }
        }
    }, hitDelay);

    // Visszaállás az alap animációra az ütés végén
    setTimeout(() => {
        isWeaponBusy = false;
        window.weaponIdleTimer = 1.0;
        playFPSAnim(currentWeaponId, 'watch');
    }, totalDur);
};

// ==========================================
// KÖZÖS ZOMBI HALÁL FÜGGVÉNY
// ==========================================
window.killZombie = function(en, isHeadshot) {
    // --- JAVÍTÁS: Ha a zombi épp a Rezonátorban sülve hal meg, elvágjuk a sikolyt! ---
    if (en.screamAudio && en.screamAudio.isPlaying) en.screamAudio.stop();
    
    // --- JAVÍTÁS: KÖZELHARCI HALÁLHANGOK TÁVOLSÁGGAL ---
    let distToDying = Math.hypot(camera.position.x - en.mesh.position.x, camera.position.z - en.mesh.position.z);
    if (en.type === 'normal') playSound('hostDeath', 0, 0, distToDying);
    else if (en.type === 'runner') playSound('runnerDeath', 0, 0, distToDying);
    else if (en.type === 'tank') playSound('tankDeath', 0, 0, distToDying);
    else if (en.type === 'crawler') playSound('crawlerDeath', 0, 0, distToDying);
    else if (en.type === 'boss') playSound('bossDeath', 0, 0, distToDying);
    else playSound('zombieDie', 0, 0, distToDying);

// --- JAVÍTÁS: Biztonságos hang-leállítás (Megakadályozza a Three.js kifagyását!) ---
    if (en.type === 'boss' && sounds['bossAttack'] && sounds['bossAttack'].isPlaying) {
        sounds['bossAttack'].stop();
    }
    
    let rewardAmmount = isHeadshot ? en.reward * 1.5 : en.reward;
    score += rewardAmmount; 
    
    let statType = en.type === 'hider' ? 'stalker' : en.type;
    if (typeof playerStats !== 'undefined' && playerStats.kills) {
        playerStats.totalDataGathered += rewardAmmount; 
        if (playerStats.kills[statType]) {
            if (isHeadshot) playerStats.kills[statType].head++;
            else playerStats.kills[statType].body++;
        }
        if (typeof savePlayerStats === 'function') savePlayerStats();
    }
    
    if (typeof checkDirective === 'function') {
        if (isHeadshot) checkDirective('kill_head', statType);
        else checkDirective('kill_body', statType);
        if (en.shieldType) checkDirective('puddle_kill', en.shieldType);
    }

    if (typeof createToxicPuddle === 'function') createToxicPuddle(en.mesh.position.x, en.mesh.position.z);
    
    const radarContainer = document.getElementById('radar');
    if (radarContainer && en.blip && en.blip.parentNode === radarContainer) radarContainer.removeChild(en.blip);
    
    scene.remove(en.bodyHitbox); scene.remove(en.headHitbox);
    let bIdx = enemyHitboxes.indexOf(en.bodyHitbox); if (bIdx > -1) enemyHitboxes.splice(bIdx, 1);
    let hIdx = enemyHitboxes.indexOf(en.headHitbox); if (hIdx > -1) enemyHitboxes.splice(hIdx, 1);

    let animDuration = 0;
    if (en.mixer) {
        en.mixer.timeScale = 1.0;
        en.mixer.stopAllAction();
    }
    if (en.hasDeathAnim && en.deathAction) {
        en.deathAction.reset().play();
        animDuration = en.deathAction._clip ? en.deathAction._clip.duration : 1.5;
    }
    
    deadBodies.push({
        mesh: en.mesh, mixer: en.mixer, hasDeathAnim: en.hasDeathAnim,
        bodyOffsetY: en.bodyOffsetY, headOffsetY: en.headOffsetY, 
        freezeTimer: animDuration + 0.1, frozen: false, sinking: false, type: en.type
    });
    
    let enIdx = enemies.indexOf(en);
    if (enIdx > -1) enemies.splice(enIdx, 1);
    if (typeof updateUI === 'function') updateUI();
}

 window.handleShoot = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (gameState !== 'PLAYING' || isReloading || (typeof isDeploying !== 'undefined' && isDeploying)) return;

    // --- ÚJ: HA FALNAK NYOMOD A FEGYVERT, NEM TUDOD ELSÜTNI! ---
    if (typeof window.isFacingWall !== 'undefined' && window.isFacingWall) return;

    // --- ÚJ: SPRINTELÉS KÖZBEN NINCS LÖVÉS ---
    let isMoving = (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1);
    if (isSprinting && !isExhausted && isMoving) return;

    // --- ÚJ: SÖRÉTES LÖVÉS KÉSLELTETÉS (1 MÁSODPERC) ---
    // Ezzel garantáljuk, hogy végigmenjen a pumpálás animáció, és ne lehessen spammelni!
    let now = clock.getElapsedTime();
    if (currentWeaponId === 'shotgun') {
        if (typeof window.shotgunNextFireTime !== 'undefined' && now < window.shotgunNextFireTime) {
            return; // Kilép, nem engedi elsütni a fegyvert, amíg le nem telt az 1 mp!
        }
        window.shotgunNextFireTime = now + 1.0; // Beállítja a következő lövés időpontját +1 mp-re
    }
    
    let wpn = weapons[currentWeaponId];

// --- ÚJ: MANUÁLIS TÁRAZÁS ÉS ÜRES KATTANÁS (DRY FIRE) ---
    if (wpn.ammo <= 0 && currentWeaponId !== 'melee') { 
        
        // JAVÍTÁS: Fél másodperces késleltetés a kattanásra, hogy az SMG ne darálja a hangot!
        let now = clock.getElapsedTime();
        if (typeof window.lastDryFireTime === 'undefined' || now - window.lastDryFireTime > 0.5) {
            playSound('dryFire'); 
            window.lastDryFireTime = now;
        }
        
        // Ha EGYÁLTALÁN nincs nálad egy darab lőszer sem, kényszerből előveszi a kést
        let hasAnyAmmo = false;
        for (let k in weapons) {
            if (k !== 'melee' && weapons[k].owned && (weapons[k].ammo > 0 || weapons[k].reserve > 0)) {
                hasAnyAmmo = true; break;
            }
        }
        if (!hasAnyAmmo) {
            // Pici várakozás, hogy a kattanás hallatszódjon az elrakás előtt
            setTimeout(() => {
                if (typeof forceWeaponSwitch === 'function') forceWeaponSwitch('melee');
            }, 300);
        }
        return; // Nem engedjük lőni, kilépünk!
    }
    
    // --- LŐSZER FOGYÁS ---
    if (currentWeaponId !== 'melee') {
        wpn.ammo--; 
// --- ÚJ: EGYEDI LÖVÉS HANGOK ---
        if (currentWeaponId === 'pistol') playSound('pistolShoot');
        else if (currentWeaponId === 'shotgun') playSound('shotgunShoot');
        else if (currentWeaponId === 'rifle') playSound('rifleShoot', 0.4); // <-- JAVÍTÁS: 0.4 mp beletekerés!
        else if (currentWeaponId === 'super') playSound('superShoot');
        
        // ÚJ: Ha ez volt az ABSZOLÚT UTOLSÓ golyó az egész inventory-dban, a lövés után rántsd elő a kést!
        if (wpn.ammo === 0 && wpn.reserve === 0) {
            let hasAnyAmmo = false;
            for (let k in weapons) {
                if (k !== 'melee' && weapons[k].owned && (weapons[k].ammo > 0 || weapons[k].reserve > 0)) {
                    hasAnyAmmo = true; break;
                }
            }
            if (!hasAnyAmmo) {
                setTimeout(() => {
                    if (typeof forceWeaponSwitch === 'function') forceWeaponSwitch('melee');
                }, 800); // Megvárjuk, amíg a fegyver visszarúg a lövéstől
            }
        }
    }
    
    if (typeof updateUI === 'function') updateUI(); 
    


    // --- KÜLÖNLEGES LOGIKA A KÉSHEZ (MELEE) ---
    if (currentWeaponId === 'melee') {
        // A kés animáció már elindult feljebb. Most várjuk a találatot!
        setTimeout(() => {
            globalRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = globalRaycaster.intersectObjects(enemyHitboxes, false);
            
            if (intersects.length > 0 && intersects[0].distance < 3.0) { 
                playSound('zombieHit'); 
                let hitObj = intersects[0].object;
                let en = enemies.find(e => e.bodyHitbox === hitObj || e.headHitbox === hitObj);
                
                if (en) {
                    let isHeadshot = (hitObj.userData.type === 'head');
                    en.health -= wpn.damage * (isHeadshot ? 3 : 1); 
                    showHitmarker(isHeadshot);
                    
                    const screenBlood = document.getElementById('screen-blood');
                    if (typeof updateUI === 'function') updateUI(); 
    // JAVÍTÁS: Zöld vér csapódik az arcodba az ütéstől!
    if (typeof splashVisorBlood === 'function') splashVisorBlood();

if (en.health <= 0) {
    killZombie(en, isHeadshot);
}
                }
            }
        }, 500); 
        
        return; // Itt kilépünk, hogy a késsel NE lőjjön lézert a kód!
    }



    // INNENTŐL LENT MINDEN MARAD A RÉGI A LÉZERES LÖVÉSHEZ! (mX, mY, mZ számolás)
    let wData = loadedFPSModels[currentWeaponId];
    let mX = wData ? wData.mesh.position.x : 0.2;
    let mY = wData ? wData.mesh.position.y + 0.08 : -0.2; // Picit feljebb emeljük a markolattól
    let mZ = wData ? wData.mesh.position.z - 0.7 : -1.0;  // Kitoljuk előre a cső végére
    
    // Torkolattűz beállítása az új helyre!
    muzzleFlash.position.set(mX, mY, mZ);
    muzzleFlash.intensity = 8.0; 
    recoilPitch += 0.08 + (wpn.spread * 0.5); 
    
// --- ÚJ FPS LÖVÉS ANIMÁCIÓ (PUMPÁLÁSSAL) ---
    if (!isWeaponBusy) {
        // Lövésnél kikapcsoljuk a lágy átmenetet (0.01 mp), hogy villámgyors, "ütős" legyen a rántás!
        let action = playFPSAnim(currentWeaponId, 'shoot', 0.01);
        if (action) {
            isWeaponBusy = true;
            
            // JAVÍTÁS: A valós időtartam! (Az eredeti hosszt elosztjuk a gyorsító szorzóval)
            let duration = (action._clip.duration / action.timeScale) * 1000;
            
            if (currentWeaponId === 'shotgun') {
                // SÖRÉTES: A lövés után AZONNAL lejátssza a pumpálást is!
                setTimeout(() => {
                    let pumpAction = playFPSAnim('shotgun', 'pump');
                    let pumpDur = pumpAction ? (pumpAction._clip.duration * 1000) : 760;
                    setTimeout(() => {
                        isWeaponBusy = false;
                        window.weaponIdleTimer = 1.0; 
                    }, pumpDur);
                }, duration);
            } else {
                // TÖBBI FEGYVER: Csak simán vár a lövés végéig
                setTimeout(() => {
                    isWeaponBusy = false;
                    window.weaponIdleTimer = 1.0; 
                }, duration);
            }
        }
    }
    
    const isSuper = currentWeaponId === 'super';
    
    for (let p = 0; p < wpn.pellets; p++) {
        camera.updateMatrixWorld(); 

        const spreadX = (Math.random() - 0.5) * wpn.spread;
        const spreadY = (Math.random() - 0.5) * wpn.spread;
        
        const rayDirection = new THREE.Vector3(spreadX, spreadY, -1);
        rayDirection.unproject(camera);
        rayDirection.sub(camera.position).normalize();

        globalRaycaster.set(camera.position, rayDirection);
        globalRaycaster.params.Mesh.threshold = 0.1; 

        const intersects = globalRaycaster.intersectObjects(enemyHitboxes, false);
        
        // --- ÚJ: A lövedék kiindulópontja most már a fegyvercső vége! ---
        const startPoint = new THREE.Vector3(mX, mY, mZ).applyMatrix4(camera.matrixWorld);

        let endPoint = (isSuper || intersects.length === 0) ? globalRaycaster.ray.at(50, new THREE.Vector3()) : intersects[0].point;
        
        // --- JAVÍTÁS: A LÉZER ÁTSZÚRÁSA ---
        // Ha találtunk valamit, a lézer végét kicsit megtoljuk előre, hogy "beleálljon" a testébe, és ne tűnjön el a felületen!
        if (intersects.length > 0 && !isSuper) {
            let pushDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
            endPoint.add(pushDirection.multiplyScalar(2.0)); // 2 méterrel átszúrja
        }

        // --- LÁTVÁNY ---
        if (isSuper) {
            // 1. A fő lézersugár (Villámgyors, vékony csík)
            const distance = startPoint.distanceTo(endPoint);
            const cylinderGeo = new THREE.CylinderGeometry(0.015, 0.015, distance, 4); 
            const cylinderMat = new THREE.MeshBasicMaterial({ 
                color: 0xe0ffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false 
            });
            const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
            cylinder.frustumCulled = false; 
            cylinder.position.copy(startPoint).lerp(endPoint, 0.5);
            cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(endPoint, startPoint).normalize());
            scene.add(cylinder);
            
            setTimeout(() => { scene.remove(cylinder); cylinderGeo.dispose(); cylinderMat.dispose(); }, 50);

            // --- ÚJ: HANGROBBANÁS (MACH-CONE) GYŰRŰK ---
            if (typeof window.sonicBooms === 'undefined') window.sonicBooms = [];
            
            let bulletDir = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
            let ringCount = Math.floor(distance / 2.0); // Minden 2 méteren hagy egy gyűrűt
            if (ringCount > 15) ringCount = 15; // Limitáljuk max 15-re, hogy ne akadjon be a játék
            
            // Késleltetve hozzuk létre őket, hogy meglegyen a "haladás" illúziója!
            for (let i = 1; i <= ringCount; i++) {
                setTimeout(() => {
                    let ringPos = new THREE.Vector3().copy(startPoint).add(bulletDir.clone().multiplyScalar(i * 2.0));
                    
                    let ringGeo = new THREE.RingGeometry(0.05, 0.15, 16);
                    let ringMat = new THREE.MeshBasicMaterial({ 
                        color: 0x00ffff, // Ciánkék izzás
                        transparent: true, 
                        opacity: 0.8, 
                        blending: THREE.AdditiveBlending,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    
                    let ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.copy(ringPos);
                    // A gyűrű pontosan merőleges a golyó haladási irányára
                    ring.lookAt(ringPos.clone().add(bulletDir)); 
                    scene.add(ring);
                    
                    window.sonicBooms.push({
                        mesh: ring,
                        life: 1.0 // 100% élet
                    });
                }, i * 15); // Minden gyűrű 15 milliszekundummal később pukkan, mint az előző!
            }
        } else {

 // --- LÉZER RAJZOLÁS POOLINGGAL ---
        if (!isSuper) {
            // Keresünk egy olyan lézert a memóriában, ami épp nem látható
            let laser = laserPool.find(l => !l.mesh.visible);
            if (laser) {
                // Frissítjük a két végpontját
                laser.mesh.geometry.setFromPoints([startPoint, endPoint]);
                // Megjelenítjük
                laser.mesh.visible = true;
                
                // Bombabiztos módszer az eltüntetésre 100ms múlva (Nem töröljük, csak elrejtjük!)
                setTimeout(() => { 
                    laser.mesh.visible = false; 
                }, 100);
            }
        }
        }
        
       // --- SEBZÉS ÉS MEMÓRIA JAVÍTÁS ---
        if (intersects.length > 0) { 
            let hitTargets = isSuper ? intersects : [intersects[0]];
            let damagedEnemies = new Set(); 
            
            for (let hit of hitTargets) {
                const hitObj = hit.object;
                
                // ==========================================
                // 1. HA A JÁTÉKOS EGY NÖVÉNYT TALÁLT EL:
                // ==========================================
               if (hitObj.userData.type === 'plant') {
                    const pIdx = activePlants.findIndex(p => p.hitbox === hitObj);
                    if (pIdx > -1) {
                        let plant = activePlants[pIdx];
                        
                        // ÚJ: Sebzés levonása a növénytől
                        plant.hp -= wpn.damage;
                        playSound('zombieHit'); // Undorító hang, ha belelőnek
                        
                        // Csak akkor pusztul el, ha elfogyott a HP-ja!
                        if (plant.hp <= 0) {
                            playSound('burst'); 
                            
                            // --- ÚJ: KÓDEX STATISZTIKA NÖVELÉSE ---
                            if (typeof playerStats !== 'undefined') {
                                playerStats.plantsDestroyed++;
                                if (typeof savePlayerStats === 'function') savePlayerStats();
                            }
                            
                           // VÉRFRÖCCS
                        for (let i = 0; i < 15; i++) {
                            let p = bloodPool.find(part => !part.active);
                            if (p) {
                                p.active = true; p.life = 1.0;
                                
                                // --- JAVÍTÁS: VISSZAÁLLÍTJUK A SZÍNT PIROSRA! ---
                                p.mesh.material.color.setHex(0xaa0000); 
                                p.mesh.material.opacity = 1.0; // Átlátszóság visszaállítása
                                
                                p.mesh.position.copy(hit.point);
                                p.mesh.scale.setScalar(0.15); // Kicsi, fröccsenő cseppek (Sprite-nál a 0.4 az pont jó)
                                // --- JAVÍTÁS: Felfelé spriccelő gejzír effekt! ---
                            p.vx = (Math.random() - 0.5) * 0.08; // Sokkal kisebb oldalirányú szórás
                            p.vy = Math.random() * 0.3 + 0.2;    // Nagy lökés FELFELÉ (0.2 - 0.5 közötti erővel)
                            p.vz = (Math.random() - 0.5) * 0.08;
                                p.mesh.visible = true;
                            }
                        }

                            scene.remove(plant.mesh);
                            scene.remove(plant.puddle);
                            scene.remove(plant.hitbox);
                            plant.puddle.geometry.dispose();
                            
                            let hIdx = enemyHitboxes.indexOf(plant.hitbox);
                            if (hIdx > -1) enemyHitboxes.splice(hIdx, 1);
                            activePlants.splice(pIdx, 1);
                        }
                    }
                    continue; 
                }

                // ==========================================
                // 2. HA A JÁTÉKOS EGY ZOMBIT TALÁLT EL:
                // ==========================================
                const en = enemies.find(e => e.bodyHitbox === hitObj || e.headHitbox === hitObj); 
                
                if (en && !damagedEnemies.has(en)) { 
                    damagedEnemies.add(en);
                    const isHeadshot = hitObj.userData.type === 'head';
                    
                    if (typeof showHitmarker === 'function') showHitmarker(isHeadshot); 
                    
                    let currentDist = Math.hypot(camera.position.x - en.mesh.position.x, camera.position.z - en.mesh.position.z);
                    playSound('zombieHit', 0, 0, currentDist);

                    let researchBoost = typeof getDamageBoost === 'function' ? getDamageBoost(en.type === 'hider' ? 'stalker' : en.type) : 1.0;
                    
                    let baseDmg = isHeadshot ? wpn.damage * 3 : wpn.damage;
                    let dmg = (baseDmg * (en.shieldMult || 1.0)) * researchBoost; 
                    
                    if (en.shieldMult < 1.0 && typeof showShieldIcon === 'function') {
                        showShieldIcon(en.shieldType);
                    }
                    
                    en.health -= dmg; 
                    score += isHeadshot ? 50 : 10;
    if (typeof updateUI === 'function') updateUI();

    // JAVÍTÁS: Csak akkor fröccsen az arcodba a vér, ha 4 MÉTEREN BELÜL lőtted le!
    if (typeof splashVisorBlood === 'function' && currentDist < 4.0) {
        splashVisorBlood();
    }
                    if (typeof updateUI === 'function') updateUI();

// --- JAVÍTOTT: LÁTVÁNYOS OLDALIRÁNYÚ VÉRSUGÁR ---
                    
                    // 1. Kiszámoljuk a golyó irányát
                    let bulletDir = new THREE.Vector3().subVectors(hit.point, camera.position).normalize();
                    
                    // 2. Kiszámolunk egy vektort, ami TÖKÉLETESEN OLDALRA mutat (kamerához képest)
                    let sideDir = new THREE.Vector3().crossVectors(bulletDir, new THREE.Vector3(0, 1, 0)).normalize();
                    
                    // 50% eséllyel balra, 50% eséllyel jobbra spriccel
                    let sideMult = Math.random() > 0.5 ? 1 : -1; 
                    
                    // Alapból erősen oldalra repül a vér! (0.3 sebességgel)
                    let sprayDx = sideDir.x * 0.3 * sideMult;
                    let sprayDz = sideDir.z * 0.3 * sideMult;
                    let sprayDy = 0;

                    // 3. Találati magasság vizsgálata a hitboxhoz képest
                    let relY = hit.point.y - hitObj.position.y;

                    // FELSŐ HARMAD (Nyak, Fej) -> Oldalra és magasra ível!
                    if (relY > 0.4) {
                        sprayDy = 0.2; 
                    } 
                    // ALSÓ HARMAD (Láb) -> Oldalra és meredeken a padlóra csapódik
                    else if (relY < -0.4) {
                        sprayDy = -0.15; 
                    } 
                    // KÖZÉPSŐ HARMAD (Mellkas, Has) -> Oldalra és finoman lefelé hajlik
                    else {
                        sprayDy = -0.05; 
                    }
                    
                    // A) Kósza cseppek (Robbanásszerű látvány a becsapódáskor)
                    for (let i = 0; i < 4; i++) {
                        let p = bloodPool.find(part => !part.active);
                        if (p) {
                            p.active = true; p.life = 0.8;
                            p.mesh.material.color.setHex(0x55ff55); 
                            p.mesh.material.opacity = 1.0; 
                            p.mesh.position.copy(hit.point);
                            p.mesh.scale.setScalar(0.15); 
                            // Ezek kicsit szétszóródnak a seb körül
                            p.vx = sprayDx * 0.5 + (Math.random() - 0.5) * 0.15; 
                            p.vy = sprayDy + (Math.random() - 0.5) * 0.2;    
                            p.vz = sprayDz * 0.5 + (Math.random() - 0.5) * 0.15; 
                            p.mesh.visible = true;
                        }
                    }

                    // B) Az igazi, vastag érsugár!
                    if (typeof activeSpurts !== 'undefined') {
                        activeSpurts.push({
                            pos: hit.point.clone(),
                            timer: 0.3, // 0.3 másodpercig tartó tiszta sugár
                            dropTimer: 0,
                            dx: sprayDx, 
                            dy: sprayDy, 
                            dz: sprayDz  
                        });
                    }

                    // HALÁL ELLENŐRZÉSE
                    if (en.health <= 0) {
                        
                        if (en.type === 'normal') playSound('hostDeath', 0, 0, currentDist);
                        else if (en.type === 'runner') playSound('runnerDeath', 0, 0, currentDist);
                        else if (en.type === 'tank') playSound('tankDeath', 0, 0, currentDist);
                        else if (en.type === 'crawler') playSound('crawlerDeath', 0, 0, currentDist);
                        else if (en.type === 'boss') playSound('bossDeath', 0, 0, currentDist);
                        else playSound('zombieDie', 0, 0, currentDist); 

                    // --- JAVÍTÁS: Biztonságos hang-leállítás ---
                        if (en.type === 'boss' && sounds['bossAttack'] && sounds['bossAttack'].isPlaying) {
                            sounds['bossAttack'].stop();
                        }
                        
                        let rewardAmmount = isHeadshot ? en.reward * 1.5 : en.reward;
                        score += rewardAmmount; 
                        
                        let statType = en.type === 'hider' ? 'stalker' : en.type;
                        
                        if (typeof playerStats !== 'undefined' && playerStats.kills) {
                            playerStats.totalDataGathered += rewardAmmount; 
                            
                            if (playerStats.kills[statType]) {
                                if (isHeadshot) playerStats.kills[statType].head++;
                                else playerStats.kills[statType].body++;
                            }
                            if (typeof savePlayerStats === 'function') savePlayerStats();
                        }
                        
                        if (typeof checkDirective === 'function') {
                            if (isHeadshot) checkDirective('kill_head', statType);
                            else checkDirective('kill_body', statType);
                            if (en.shieldType) checkDirective('puddle_kill', en.shieldType);
                        }

                        if (playerStats.wavesSurvived === 0) {
                            playerStats.wavesSurvived = 1;
                            if (typeof savePlayerStats === 'function') savePlayerStats();
                        }

                        if (typeof createToxicPuddle === 'function') createToxicPuddle(en.mesh.position.x, en.mesh.position.z);
                    
                        const radarContainer = document.getElementById('radar');
                        if (radarContainer && en.blip && en.blip.parentNode === radarContainer) {
                            radarContainer.removeChild(en.blip);
                        }
                        
                        scene.remove(en.bodyHitbox);
                        scene.remove(en.headHitbox);
                        
                        let bIdx = enemyHitboxes.indexOf(en.bodyHitbox);
                        if (bIdx > -1) enemyHitboxes.splice(bIdx, 1);
                        let hIdx = enemyHitboxes.indexOf(en.headHitbox);
                        if (hIdx > -1) enemyHitboxes.splice(hIdx, 1);

                        let animDuration = 0;
                        if (en.mixer) en.mixer.timeScale = 1.0;

                        if (en.hasDeathAnim && en.deathAction) {
                            en.mixer.stopAllAction();
                            en.deathAction.reset().play();
                            animDuration = en.deathAction._clip ? en.deathAction._clip.duration : 1.5;
                        } else {
                            en.mixer.stopAllAction();
                        }
                        
                        deadBodies.push({
                            mesh: en.mesh,
                            mixer: en.mixer,
                            hasDeathAnim: en.hasDeathAnim,
                            bodyOffsetY: en.bodyOffsetY, 
                            headOffsetY: en.headOffsetY, 
                            freezeTimer: animDuration + 0.1, 
                            frozen: false,     
                            sinking: false,    
                            type: en.type
                        });
                        
                        let enIdx = enemies.indexOf(en);
                        if (enIdx > -1) enemies.splice(enIdx, 1);
                    }
                }
            } 
        } 
    } 
} 

// ÚJ, FINOMÍTOTT ANALÓG MOBIL IRÁNYÍTÁS (Joystickkal)
const zoneLeft = document.getElementById('zone-left'), zoneRight = document.getElementById('zone-right');
const joyBase = document.getElementById('joy-base'), joyStick = document.getElementById('joy-stick');
let leftTouchId = null, rightTouchId = null, joyStartX = 0, joyStartY = 0, lastLookX = 0, lastLookY = 0;

zoneLeft.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    leftTouchId = e.changedTouches[0].identifier; 
    joyStartX = e.changedTouches[0].clientX; 
    joyStartY = e.changedTouches[0].clientY; 
    if(joyBase) {
        joyBase.classList.remove('hidden');
        joyBase.style.left = joyStartX + 'px';
        joyBase.style.top = joyStartY + 'px';
        if(joyStick) joyStick.style.transform = `translate(-50%, -50%)`;
    }
});

zoneLeft.addEventListener('touchmove', (e) => { 
    e.preventDefault(); 
    for (let touch of e.changedTouches) { 
        if (touch.identifier === leftTouchId) { 
            const dx = touch.clientX - joyStartX; 
            const dy = touch.clientY - joyStartY; 
            const angle = Math.atan2(dy, dx); 
            
            let distance = Math.min(Math.hypot(dx, dy), 40);
            let speedMultiplier = distance / 40; 
            
            moveX = Math.cos(angle) * speedMultiplier; 
            moveZ = Math.sin(angle) * speedMultiplier; 
            
            if(joyStick) {
                let stickX = Math.cos(angle) * distance;
                let stickY = Math.sin(angle) * distance;
                joyStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
            }
        } 
    } 
});

zoneLeft.addEventListener('touchend', (e) => { 
    if (e.changedTouches[0].identifier === leftTouchId) { 
        leftTouchId = null; moveX = moveZ = 0; 
        if(joyBase) joyBase.classList.add('hidden'); 
    } 
});

zoneRight.addEventListener('touchstart', (e) => { e.preventDefault(); rightTouchId = e.changedTouches[0].identifier; lastLookX = e.changedTouches[0].clientX; lastLookY = e.changedTouches[0].clientY; });
zoneRight.addEventListener('touchmove', (e) => { 
    e.preventDefault(); 
    for (let touch of e.changedTouches) { 
        if (touch.identifier === rightTouchId) { 
            yaw -= (touch.clientX - lastLookX) * 0.005; 
            pitch -= (touch.clientY - lastLookY) * 0.005; 
            pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch)); 
            lastLookX = touch.clientX; lastLookY = touch.clientY; 
        } 
    } 
});
zoneRight.addEventListener('touchend', (e) => { if (e.changedTouches[0].identifier === rightTouchId) rightTouchId = null; });


// ==========================================
// ÚJ, IGAZI PC-S FPS IRÁNYÍTÁS ÉS BIZTONSÁG
// ==========================================
const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => { 
    let key = e.key.toLowerCase(); 
    if (key in keys) keys[key] = true; 
    
    // --- LOPAKODÁS / INTERAKCIÓ ---
    if (key === 'e' && gameState === 'PLAYING') isLootingKey = true;
    if (key === 'c' && gameState === 'PLAYING') isCrouching = true;
    if (e.shiftKey && gameState === 'PLAYING' && !isCrouching) isSprinting = true;

 // --- SZÜNET GOMB (BACKSPACE ODA-VISSZA KAPCSOLÁS) ---
    if (key === 'backspace') {
        e.preventDefault(); // Megakadályozzuk a böngésző "vissza" funkcióját
        
        if (gameState === 'PLAYING') {
            document.exitPointerLock(); // Visszaadjuk az egeret
            pauseGame(); // Megállítjuk a játékot
        } 
        else if (gameState === 'PAUSED') {
            resumeGame(); // Folytatjuk a játékot (ez automatikusan visszaveszi az egeret és eltünteti a menüt!)
        }
    }
    
    // --- MANUÁLIS ÚJRATÖLTÉS ("R") ---
    // JAVÍTÁS: Ha falhoz nyomod a fegyvert (!window.isFacingWall), nem tudsz tárba nyúlni!
    if (key === 'r' && gameState === 'PLAYING' && !isReloading && !window.isFacingWall) {
        let wpn = weapons[currentWeaponId];
        if (wpn.ammo < wpn.maxAmmo && wpn.reserve > 0) startReloading(wpn);
    }

    // --- ÚJ: SZEIZMIKUS REZONÁTOR TELEPÍTÉSE ("G" GOMB) ---
    if (key === 'g' && gameState === 'PLAYING' && !isWeaponBusy && !isLootingActive) {
        if (typeof isDeploying === 'undefined') window.isDeploying = false;
        
        if (!window.isDeploying) {
            if (typeof playerResonators !== 'undefined' && playerResonators > 0) {
                isWeaponBusy = true; 
                window.isDeploying = true;
                window.deployTimer = 0;
                window.resonatorOpened = false; // ÚJ: Figyeljük, hogy kinyílt-e már!
                
                if (currentWeaponMesh) currentWeaponMesh.visible = false; 
                
                const deployUI = document.getElementById('deploy-progress-container');
                if (deployUI) deployUI.classList.remove('hidden');
                
                // JAVÍTÁS: Terminál hang helyett az új, 3 másodperces szerelő hang!
                playSound('resonatorInstall');

                // --- JAVÍTÁS: A MODELL AZONNAL MEGJELENIK A FÖLDÖN A LÁBAD ELŐTT! ---
                if (resonatorModel) {
                    window.deployMesh = THREE.SkeletonUtils.clone(resonatorModel);
                    
                    // 50%-kal nagyobb méret (3.0 helyett 4.5)
                    window.deployMesh.scale.set(4.5, 4.5, 4.5); 
                    
                    // --- JAVÍTÁS: 0.8 helyett 1.4 méterre tesszük le, hogy tényleg magad elé rakd, ne magad alá! ---
                    let fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    fwd.y = 0; fwd.normalize();
                    window.deployMesh.position.set(camera.position.x + fwd.x * 1.4, 0.05, camera.position.z + fwd.z * 1.4);
                    
                    window.deployMixer = new THREE.AnimationMixer(window.deployMesh);
                    scene.add(window.deployMesh);
                }
                
            } else {
                playSound('error');
                const ammoFlash = document.getElementById('ammo-flash'); 
                if(ammoFlash) { ammoFlash.style.opacity = 0.5; setTimeout(() => ammoFlash.style.opacity = 0, 200); }
            }
        }
    }

    // --- ÚJ: MEDKIT HASZNÁLATA ("Q" GOMB) ---
    if (key === 'q' && gameState === 'PLAYING' && !isWeaponBusy && !isLootingActive) {
        let maxHP = 100 + (skills.maxHealth.level * 20);
        if (playerMedkits > 0 && playerHealth < maxHP) {
            
            isWeaponBusy = true; 
            if (currentWeaponMesh) currentWeaponMesh.visible = false;
            
            let healData = loadedFPSModels['heal'];
            if (healData) {
                healData.mesh.visible = true;
                let action = playFPSAnim('heal', 'inject');
                let duration = action ? (action._clip.duration * 1000) : 5700;
                
// Hang indítása az animáció 2.2. másodpercében
                setTimeout(() => { 
                    
                    // 1. ÁTUGORJUK az első 1.3 másodperc csendet! (Offset: 1.3)
                    // Így azonnal a sziszegésnél (1:30) kezdődik a lejátszás.
                    playSound('genStab', 1.3); 
                    
                    // 2. LEÁLLÍTJUK a hangot 1.85 másodperc múlva (1850 ms).
                    // Mert a sziszegés pontosan eddig tart (3.15 - 1.30 = 1.85).
                    setTimeout(() => {
                        if (sounds['genStab'] && sounds['genStab'].isPlaying) {
                            sounds['genStab'].stop();
                        }
                    }, 1150); 
                    
                }, 3500);
                
                setTimeout(() => {
                    playerMedkits--; 
                    let healAmount = 40 * (1 + (skills.healthLoot.level * 0.2));
                    playerHealth = Math.min(maxHP, playerHealth + healAmount); 
                    
                    playerInfection = Math.min(100, playerInfection + 5); 
                    document.body.classList.add('drugged');
                    setTimeout(() => {
                        if (typeof druggedTimer !== 'undefined' && druggedTimer <= 0) {
                            document.body.classList.remove('drugged');
                        }
                    }, 1500);
                    
                    // (Innen töröltük ki a playSound('genStab')-ot!)
                    const healFlash = document.getElementById('heal-flash');
                    if (healFlash) { healFlash.style.opacity = 1; setTimeout(() => healFlash.style.opacity = 0, 300); }
                    if (typeof updateUI === 'function') updateUI(); 
                }, Math.max(0, duration - 500)); 

                setTimeout(() => {
                    healData.mesh.visible = false;
                    isWeaponBusy = false; 
                    equipWeapon(currentWeaponId); 
                }, duration);
            }
        }
    }

    // --- ÚJ: FAGYASZTÁS ("T" GOMB) ---
    if (key === 't' && gameState === 'PLAYING') {
        if (typeof triggerFreeze === 'function') triggerFreeze();
    }

    // --- ÚJ: FEGYVERVÁLTÁS SZÁMOKKAL (0-4) ---
    if (gameState === 'PLAYING' && !isWeaponBusy) {
        let requestedWeapon = null;
        if (key === '0') requestedWeapon = 'melee';
        if (key === '1') requestedWeapon = 'pistol';
        if (key === '2') requestedWeapon = 'shotgun';
        if (key === '3') requestedWeapon = 'rifle';
        if (key === '4') requestedWeapon = 'super';

        // Csak akkor váltunk, ha létezik, megvettük, és nem az van a kezünkben
        if (requestedWeapon && requestedWeapon !== currentWeaponId && weapons[requestedWeapon] && weapons[requestedWeapon].owned) {
            forceWeaponSwitch(requestedWeapon);
        }
    }
}); // Keydown vége

// A 'keyup' eseményen belül:
window.addEventListener('keyup', (e) => { 
    let key = e.key.toLowerCase(); 
    if (key in keys) keys[key] = false; 
    
    if (key === 'e') isLootingKey = false;
    if (key === 'c') isCrouching = false;
    if (e.key === 'Shift') isSprinting = false;
});

// --- KÖZÖS ÚJRATÖLTŐ FÜGGVÉNY (ANIMÁCIÓVAL ÉS SÖRÉTES/REVOLVER CIKLUSSAL) ---
window.cancelReloadRequested = false; 

function startReloading(wpn) {
    if (isWeaponBusy) return; 
    if (wpn.ammo >= wpn.maxAmmo || wpn.reserve <= 0) return; 
    
    isReloading = true; 
    isWeaponBusy = true; 
    window.cancelReloadRequested = false; 
    
    document.getElementById('reload-text').classList.remove('hidden'); 

    // ==========================================
    // 1. SÖRÉTES PUSKA TÖLTÉSE (PUMPÁLÁSSAL)
    // ==========================================
    if (currentWeaponId === 'shotgun') {
        let startAction = playFPSAnim('shotgun', 'reloadStart');
        let startDur = startAction ? (startAction._clip.duration * 1000) : 500;

        setTimeout(() => { reloadSingleShell(); }, startDur);

function reloadSingleShell() {
            // Ha megszakítják a töltést (lőni akar), azonnal átugrik a Pumpálásra!
            if (window.cancelReloadRequested || wpn.ammo >= wpn.maxAmmo || wpn.reserve <= 0 || !isReloading) {
                playShotgunPump();
                return;
            }
            
            let action = playFPSAnim('shotgun', 'reload'); 
            let animDuration = action ? (action._clip.duration * 1000) : 1000;
            
            // JAVÍTÁS: A hangot rögtön a mozdulat elején játsszuk le!
            playSound('shotgunReload'); 
            
            setTimeout(() => {
                if (!isReloading) return; 
                wpn.ammo++; wpn.reserve--;
                if (typeof updateUI === 'function') updateUI();
                reloadSingleShell();
            }, animDuration);
        }

// ÚJ: A töltés (vagy megszakítás) végén megpumpálja a fegyvert!
function playShotgunPump() {
            let pumpAction = playFPSAnim('shotgun', 'pump');
            let pumpDur = pumpAction ? (pumpAction._clip.duration * 1000) : 760;
            
            // --- JAVÍTÁS: Itt is 0.6-ra állítjuk, így nem lesz lövéshang! ---
            playSound('shotgunShoot', 0.6); 
            
            setTimeout(() => {
                isReloading = false; isWeaponBusy = false; 
                window.weaponIdleTimer = 1.0; 
                document.getElementById('reload-text').classList.add('hidden'); 
                playFPSAnim('shotgun', 'watch');
            }, pumpDur);
        }
    } 
    // ==========================================
    // 2. REVOLVER TÖLTÉSE (Pánik-megszakítással és bezárással)
    // ==========================================
    else if (currentWeaponId === 'super') {
        
        let action = playFPSAnim('super', 'reload');
        
        let bulletsToLoad = Math.min(wpn.maxAmmo - wpn.ammo, wpn.reserve);
        let timePerBullet = 5750 / 6.0; 
        let loadedBullets = 0;
        let requiredAnimTime = bulletsToLoad * timePerBullet;

        // Időzítő, ami folyamatosan potyogtatja a golyókat a tárba
        let reloadInterval = setInterval(() => {
            
            // --- HA MEGSZAKÍTJÁK A TÖLTÉST (Lőni akar a játékos) ---
            if (window.cancelReloadRequested || !isReloading) {
                clearInterval(reloadInterval);
                clearTimeout(finishTimeout); 
                
// MÁGIA: Odarugorjuk az animációt a tár bezárásához (5.75 mp)!
                if (action) {
                    action.time = 5.75; 
                    action.timeScale = 1.5; 
                }
                
                // JAVÍTÁS: Fél másodperc (500ms) késleltetés a pörgetés hangon!
                setTimeout(() => { playSound('superClose'); }, 500); 

                setTimeout(() => {
                    if (action) action.timeScale = 1.0; 
                    finishRevolverReload();
                }, 800);
                
                return;
            }
            
            // Normál golyó adagolás
            if (loadedBullets < bulletsToLoad && wpn.reserve > 0) {
                wpn.ammo++; wpn.reserve--; loadedBullets++;
                playSound('superReload'); // Golyó bepattintása egyenként
                if (typeof updateUI === 'function') updateUI();
            }
        }, timePerBullet);

// BEFEJEZŐ FÜGGVÉNY
        function finishRevolverReload() {
            isReloading = false; 
            isWeaponBusy = false; // Itt old fel a fegyver, most már kattinthat és lőhet a játékos!
            window.weaponIdleTimer = 1.0; 
            playFPSAnim('super', 'watch');
            
            if (typeof updateUI === 'function') updateUI(); 
            document.getElementById('reload-text').classList.add('hidden'); 
            // A playSound('superClose') INNEN TÖRÖLVE LETT, mert már előbb lejátszottuk a kódodban!
        }

// --- HA NORMÁLISAN, MEGSZAKÍTÁS NÉLKÜL VÉGET ÉR A TÖLTÉS ---
        let finishTimeout = setTimeout(() => { 
            if (isReloading) {
                clearInterval(reloadInterval);
                
                if (action) {
                    action.time = 5.75; 
                }
                
                // JAVÍTÁS: Itt is Fél másodperc (500ms) késleltetés!
                setTimeout(() => { playSound('superClose'); }, 500); 

                setTimeout(() => {
                    finishRevolverReload();
                }, 1200);
            }
        }, requiredAnimTime);
    }

// ==========================================
    // 3. NORMÁL FEGYVEREK (Pisztoly, Karabély - Nem megszakítható)
    // ==========================================
    else {
        if (currentWeaponId === 'pistol') {
            
            // --- JAVÍTÁS: Felgyorsítjuk a töltéshangot 35%-kal, hogy utolérje az animációt! ---
            // (Az 1.0 a normál sebesség. Ha a felhúzás még mindig késik, emeld fel 1.4-re vagy 1.45-re!)
            if (sounds['pistolReload']) sounds['pistolReload'].setPlaybackRate(1.70); 
            
            playSound('pistolReload');
            
            // --- JAVÍTÁS: Mivel a hang gyorsabb lett, hamarabb jön a felesleges lövéshang is a végén! ---
            // A 3000-et le kellett vinnünk kb. 2200-ra, hogy pontosan a lövés előtt vágja el.
            setTimeout(() => {
                if (sounds['pistolReload'] && sounds['pistolReload'].isPlaying) {
                    sounds['pistolReload'].stop();
                    // Biztonságképpen visszaállítjuk a sebességet a normál értékre
                    sounds['pistolReload'].setPlaybackRate(1.0); 
                }
            }, 2100); 

        } else {
            playSound('rifleReload');
        }
        
        let action = playFPSAnim(currentWeaponId, 'reload');
        let animDuration = action ? (action._clip.duration * 1000) : wpn.reloadTime;

        setTimeout(() => { 
            if (!isReloading) return; 
            
            const load = Math.min(wpn.maxAmmo - wpn.ammo, wpn.reserve); 
            wpn.ammo += load; 
            wpn.reserve -= load; 
            
            isReloading = false; 
            isWeaponBusy = false; 
            window.weaponIdleTimer = 1.0; 
            playFPSAnim(currentWeaponId, 'watch');

            if (typeof updateUI === 'function') updateUI(); 
            document.getElementById('reload-text').classList.add('hidden'); 
        }, animDuration); 
    }
}

// --- BIZTONSÁGOS MOZGÁS CIKLUS ---
setInterval(() => {
    if (gameState === 'PLAYING') {
        
        // --- JAVÍTÁS: TELEPÍTÉS KÖZBEN A JÁTÉKOS FÖLDBE GYÖKEREZIK ---
        if (typeof window.isDeploying !== 'undefined' && window.isDeploying) {
            moveX = 0; 
            moveZ = 0;
            return; // Megszakítjuk a ciklust, hiába nyomod a gombokat, nem fogsz mozogni!
        }
        
        let kmX = 0, kmZ = 0;
        
        // Csak akkor olvassuk a billentyűzetet, ha a játékos nincs lefagyva, vagy nem halott
        if (keys.w) kmZ = -1; 
        if (keys.s) kmZ = 1;  
        if (keys.a) kmX = -1; 
        if (keys.d) kmX = 1;
        
        // Kényszerített nullázás PC-n, ha épp nincs mobil-érintés!
        // Ez megoldja az egérrel való mozgás bugot.
        if (typeof leftTouchId !== 'undefined' && leftTouchId !== null) {
            // Ha épp nyomva tartják a mobilos joysticket, azt NE írjuk felül!
            // Hagyjuk, hogy a touchmove event kezelje a moveX és moveZ értékét.
        } else {
            // Ha NINCS mobil érintés, akkor kizárólag a billentyűzet diktál!
            moveX = kmX; 
            moveZ = kmZ;
        }
    } else {
        // Ha nem játszunk (pl. menüben vagyunk), AZONNAL állítsunk meg minden mozgást!
        moveX = 0;
        moveZ = 0;
    }
}, 16);

// EGÉR RÖGZÍTÉSE
document.body.addEventListener('click', (e) => {
    if (gameState === 'PLAYING' && document.pointerLockElement !== document.body) {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
            document.body.requestPointerLock();
        }
    }
});


// NÉZELŐDÉS ÉS LOOT LOCK (Kamera lezárása)
window.mouseDeltaX = 0;
window.mouseDeltaY = 0;

window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && gameState === 'PLAYING') {
        
        // --- JAVÍTÁS: Ha lootolunk VAGY telepítjük a gépet, az egér (kamera) zárolva van! ---
        if (isLootingActive || (typeof isDeploying !== 'undefined' && isDeploying)) return;

        yaw -= (e.movementX || 0) * mouseSensitivity; 
        pitch -= (e.movementY || 0) * mouseSensitivity; 
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
        
        window.mouseDeltaX = e.movementX || 0;
        window.mouseDeltaY = e.movementY || 0;
    }
});

window.meleeCooldown = 0; 
window.isChargingMelee = false; 
window.meleeChargeTime = 0;     

// GOMBOK: LÖVÉS, VÁLTÁS, KÉS-TÖLTÉS
window.addEventListener('mousedown', (e) => {
    if (gameState !== 'PLAYING' || document.pointerLockElement !== document.body) return;
    
    if (isReloading && (currentWeaponId === 'shotgun' || currentWeaponId === 'super')) {
        window.cancelReloadRequested = true; return; 
    }

    if (e.button === 0) {
        isShootingBtnPressed = true; 
        
        // --- ÚJ KÉS LOGIKA: HÁTRAHÚZÁS (CHARGE) ---
        if (currentWeaponId === 'melee') {
            // --- JAVÍTÁS: Ha kifáradtál (isExhausted), nem emelheted fel a kést! ---
            if (window.meleeCooldown > 0 || isWeaponBusy || playerStamina < 15 || isExhausted) {
                if (playerStamina < 15 || isExhausted) playSound('cough'); // Jelezze, hogy elfogyott a szusz
                return; 
            }
            
            isWeaponBusy = true; 
            window.isChargingMelee = true;
            window.meleeChargeTime = 0;
            
            // Elindítjuk az inak feszülését/lihegést! (8 mp-es hang)
            playSound('heavyBreathing');
            
            let action = playFPSAnim('melee', 'charge');
            if (action) action.timeScale = 1.0; 
            
        } else {
            if(weapons[currentWeaponId].auto) autoShootTimer = weapons[currentWeaponId].fireRate;
            handleShoot(); 
        }
} else if (e.button === 2) {
        // --- ÚJ: JOBB KLIKK = FEGYVER LÖKÉS (BASH) ---
        if (typeof performWeaponBash === 'function') performWeaponBash();
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        isShootingBtnPressed = false;
        
        // --- ÚJ KÉS LOGIKA: LECSAPÁS ---
        if (currentWeaponId === 'melee' && window.isChargingMelee) {
            window.isChargingMelee = false;
            
            // Leállítjuk a feszülő/lihegő hangot, ha lecsapott!
            if (sounds['heavyBreathing'] && sounds['heavyBreathing'].isPlaying) {
                sounds['heavyBreathing'].stop();
            }
            
            executeMeleeStrike(window.meleeChargeTime); 
        }
    }
});


// ==========================================
// A KÉS TÁMADÁS VÉGREHAJTÁSA (POWER HIT & SPRINT CHARGE)
// ==========================================
window.executeMeleeStrike = function(chargeTime) {
    let action = playFPSAnim('melee', 'strike');
    if (action) action.timeScale = 1.5; 
    let dur = action ? ((action._clip.duration / 1.5) * 1000) : 410; 
    
    // A sebzés maximuma továbbra is 2 másodpercnél van
    let effectiveCharge = Math.min(chargeTime, 2.0);
    let finalDamage = 0.5 + (effectiveCharge / 2.0) * 3.5;
    
    // --- ÚJ: SPRINT-SZÚRÁS BÓNUSZ (LENDÜLET ÉRZÉKELÉSE) ---
    // Megnézzük, hogy az ütés pillanatában fut-e a karakter (mozog + nyomja a shiftet)
    let isSprintStrike = (isSprinting && !isExhausted && (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1));
    
    if (isSprintStrike) {
        finalDamage *= 1.5; // +50% sebzés a rohamozás lendülete miatt!
    }

    // --- STAMINA FOGYÁS A LECSAPÁSKOR ---
    let strikeCost = 10 + (effectiveCharge * 10);
    if (isSprintStrike) strikeCost += 10; // Extra fáradtság a testsúllyal való lökésért
    playerStamina -= strikeCost;
    
    if (playerStamina <= 0) {
        playerStamina = 0;
        isExhausted = true;
        staminaCooldown = 3.0;
        playSound('cough');
    }

    setTimeout(() => {
        globalRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = globalRaycaster.intersectObjects(enemyHitboxes, false);
        
        let hitDistance = effectiveCharge > 1.0 ? 3.5 : 2.5;

        if (intersects.length > 0 && intersects[0].distance < hitDistance) { 
            playSound('zombieHit'); 
            let hitObj = intersects[0].object;
            let en = enemies.find(e => e.bodyHitbox === hitObj || e.headHitbox === hitObj);
            
            if (en) {
               // --- ÚJ: STUN HATÁS SPRINTELÉSNÉL (MÁR A BOSST IS BÉNÍTJA!) ---
                if (isSprintStrike) {
                    cameraShake = 0.5; // Még durvább beremegés a brutális becsapódástól!
                    
                    // Nincs több kivétel! A rohamozás mindenkit kibillent az egyensúlyából.
                    if (en.type === 'boss') en.stunTimer = 1.0; // A Boss is megakad 1 másodpercre!
                    else if (en.type === 'tank') en.stunTimer = 2.0; // A Tank 2 másodpercig tántorog
                    else if (en.type === 'runner') en.stunTimer = 3.0; // A Leaper 3 másodpercig szédül
                    else en.stunTimer = 5.0; // A sima zombik 5 másodpercig szinte lebénulnak
                }
                

                let isHeadshot = (hitObj.userData.type === 'head');
                en.health -= finalDamage * (isHeadshot ? 3 : 1); 
                showHitmarker(isHeadshot);
                
                // Üvegre csapódó vér
                if (typeof splashVisorBlood === 'function') splashVisorBlood();
                
                if (typeof updateUI === 'function') updateUI(); 

                if (en.health <= 0) killZombie(en, isHeadshot); 

                // --- LÁTVÁNYOS OLDAL-SPRÖCCSENÉS ---
                let slashDir = new THREE.Vector3().subVectors(intersects[0].point, camera.position).normalize();
                let bloodSide = new THREE.Vector3().crossVectors(slashDir, new THREE.Vector3(0,1,0)).normalize();
                let sideMult = Math.random() > 0.5 ? 1 : -1;

                let sprayDx = bloodSide.x * 0.4 * sideMult;
                let sprayDz = bloodSide.z * 0.4 * sideMult;
                let sprayDy = -0.05; 
                
                for (let i = 0; i < 5; i++) {
                    let p = bloodPool.find(part => !part.active);
                    if (p) {
                        p.active = true; p.life = 0.8;
                        p.mesh.material.color.setHex(0x55ff55); 
                        p.mesh.material.opacity = 1.0; 
                        p.mesh.position.copy(intersects[0].point); 
                        p.mesh.scale.setScalar(0.15); 
                        p.vx = sprayDx * 0.8 + (Math.random() - 0.5) * 0.1; 
                        p.vy = sprayDy + (Math.random() - 0.5) * 0.15;    
                        p.vz = sprayDz * 0.8 + (Math.random() - 0.5) * 0.1; 
                        p.mesh.visible = true;
                    }
                }

                if (typeof activeSpurts !== 'undefined') {
                    activeSpurts.push({
                        pos: intersects[0].point.clone(),
                        timer: 0.35, 
                        dropTimer: 0,
                        dx: sprayDx, 
                        dy: sprayDy, 
                        dz: sprayDz  
                    });
                }

            }
        } else {
            playSound('knifeHit', 0.0); 
        }
    }, 100); // Késleltetés a találatig

    setTimeout(() => {
        isWeaponBusy = false;
        window.weaponIdleTimer = 1.0;
        window.meleeCooldown = 0.5; 
        playFPSAnim('melee', 'watch');
    }, dur);
}

window.addEventListener('contextmenu', (e) => e.preventDefault());



// A Játék Megállítása
window.pauseGame = function() {
    gameState = 'PAUSED'; 
    pauseStartTime = clock.getElapsedTime(); // Feljegyezzük, mikor állítottuk meg!
    document.getElementById('pause-menu').classList.remove('hidden');
}

// A Játék Folytatása
window.resumeGame = function() {
    document.getElementById('pause-menu').classList.add('hidden');
    
    // Hozzáadjuk a szünetben töltött időt a teljes "lopott" időhöz!
    if (pauseStartTime > 0) {
        totalPausedTime += (clock.getElapsedTime() - pauseStartTime);
        pauseStartTime = 0;
    }
    
    gameState = 'PLAYING';
    try { document.body.requestPointerLock(); } catch(e){} 
}

// Mobil Szünet Gomb
const mobilePauseBtn = document.getElementById('mobile-pause-btn');
if(mobilePauseBtn) {
    mobilePauseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.exitPointerLock(); // Ez automatikusan meghívja a pauseGame() fenti eseményét!
        if(gameState === 'PLAYING') pauseGame(); // Biztonsági hívás mobilra
    });
}
window.addEventListener('blur', () => { isShootingBtnPressed = false; }); // Ha ablakot vált a játékos

const shootBtn = document.getElementById('shoot-btn');
if(shootBtn) {
    shootBtn.addEventListener('touchstart', (e) => { 
        e.preventDefault(); isShootingBtnPressed = true; 
        if(weapons[currentWeaponId].auto) autoShootTimer = weapons[currentWeaponId].fireRate;
        handleShoot(e); 
    });
    shootBtn.addEventListener('touchend', (e) => { e.preventDefault(); isShootingBtnPressed = false; });
    shootBtn.addEventListener('mousedown', () => { 
        isShootingBtnPressed = true; 
        if(weapons[currentWeaponId].auto) autoShootTimer = weapons[currentWeaponId].fireRate;
        handleShoot(); 
    });
    shootBtn.addEventListener('mouseup', () => { isShootingBtnPressed = false; });
    shootBtn.addEventListener('mouseleave', () => { isShootingBtnPressed = false; }); // JAVÍTÁS: Ha lehúzod róla az egeret, leáll
}

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// --- ÚJ: FAGYASZTÁS KÉPESSÉG AKTIVÁLÁSA ---
function triggerFreeze() {
    if (skills.freeze.level > 0 && freezeCooldown <= 0 && gameState === 'PLAYING') {
        activeFreezeTimer = skills.freeze.level * 2; // Szintenként 2 másodperc
        freezeCooldown = 30; // 30 mp újratöltés
        
        // --- ÚJ: HANGOK LEJÁTSZÁSA ---
        playSound('cryoGas'); 
        playSound('iceCrack');

        // --- ÚJ: VIZUÁLIS TEREM-EFFEKT (Látható gáz és jég) ---
        const iceOverlay = document.getElementById('ice-overlay');
        if(iceOverlay) iceOverlay.style.opacity = 1;
        
        // A 3D Füst és a Világ ködének megfestése azonnal jégkékre/fehérre!
        if (typeof fogMat !== 'undefined') {
            fogMat.color.setHex(0xaaaaee); // Halvány jégkék füst
            fogMat.opacity = 0.8; // Felcsapódik sűrűre a gőz!
        }
        if (scene.fog) {
            scene.fog.color.setHex(0x001133); // Fagyos, sötétkék mélység
            scene.background.copy(scene.fog.color);
        }

        const fBtn = document.getElementById('freeze-btn');
        if(fBtn) { fBtn.disabled = true; fBtn.innerText = `⏳ ${Math.ceil(freezeCooldown)}s`; }
    }
}

// Mobilos gomb kattintás (Védett verzió)
const freezeBtnEl = document.getElementById('freeze-btn');
if (freezeBtnEl) {
    freezeBtnEl.addEventListener('click', triggerFreeze);
    freezeBtnEl.addEventListener('touchstart', (e) => { e.preventDefault(); triggerFreeze(); });
}

// PC gomb (F betű)
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') triggerFreeze();
});



// Alapértelmezett jobbklikk menü (böngésző menü) letiltása
window.addEventListener('contextmenu', (e) => e.preventDefault());


// ==========================================
// 5. JÁTÉK CIKLUS ÉS FRISSÍTÉS
// ==========================================

// ==========================================
// ÚJ: ZOMBIK A PÁLYA SZÉLÉRŐL ÉRKEZNEK
// ==========================================
window.getEdgeSpawnPosition = function() {
    let edge = Math.floor(Math.random() * 4); // 0: Észak, 1: Dél, 2: Nyugat, 3: Kelet
    
    // A pálya 50x50 méteres. A külső falak +/- 26-nál vannak.
    // Letesszük őket +/- 24-re, így pont a sötétségből, a külső falak mellől indulnak meg!
    let randomOffset = (Math.random() - 0.5) * 46; // -23 és +23 közötti vonalon szórjuk szét őket
    
    if (edge === 0) return { x: randomOffset, z: -24 }; // Északi fal
    if (edge === 1) return { x: randomOffset, z: 24 };  // Déli fal
    if (edge === 2) return { x: -24, z: randomOffset }; // Nyugati fal
    return { x: 24, z: randomOffset };                  // Keleti fal
};

window.startWaveCountdown = function(isFirstWave = false) {
    if (window.waveTimeout) clearTimeout(window.waveTimeout);
    if (window.glitchShakeInterval) clearInterval(window.glitchShakeInterval);

    // 1. ITT NŐ MEG A HULLÁM SZÁMA! (Enélkül nem tud öregedni a tócsa!)
    if (!isFirstWave) {
        currentWave++; 
        enemiesToSpawn += 2; 
    }
    
    // ====================================================
    // 2. ÖREGEDÉS ÉS MUTÁCIÓ ELŐKÉSZÍTÉSE
    // Mivel a currentWave az előbb megnőtt, most már a jó életkort számolja ki!
    // ====================================================
    if (typeof evolvePuddles === 'function') evolvePuddles();
    if (typeof prepareMutations === 'function') prepareMutations();

    let bossSpawning = (currentWave % 5 === 0); 
    
    playSound('glitch');
    const glitchOverlay = document.getElementById('glitch-overlay');
    const waveDisplay = document.getElementById('wave-display');
    
    if (glitchOverlay) {
        glitchOverlay.classList.remove('hidden');
        glitchOverlay.classList.add('glitch-active');
    }
    
 // 1. A VÉSZJELZŐ BEKAPCSOLÁSA (Piros, Villogó, Dobozos)
    if (waveDisplay) {
        waveDisplay.classList.remove('normal-wave'); // Levesszük a sima stílust
        waveDisplay.innerText = "⚠️ TÉRBELI ANOMÁLIA ÉSZLELVE... ⚠️";
        waveDisplay.classList.remove('hidden');
    }

    window.glitchShakeInterval = setInterval(() => {
        cameraShake = 0.2;
    }, 100);

    window.waveTimeout = setTimeout(function checkGameState() {
        // Ha éppen PAUSE menüben vagy BOLTBAN vagyunk, NE induljon el a hullám!
        // Helyette elindítjuk újra a setTimeout-ot 1 másodperc múlva (Várakozunk).
        if (gameState !== 'PLAYING') {
            window.waveTimeout = setTimeout(checkGameState, 1000);
            return;
        }

        // HA JÁTSZUNK, BIZTONSÁGOSAN ELINDÍTJUK A HULLÁMOT:
        clearInterval(window.glitchShakeInterval); 
        
        if (glitchOverlay) {
            glitchOverlay.classList.remove('glitch-active');
            glitchOverlay.classList.add('hidden');
        }
        
        // 2. A NORMÁL HULLÁM KIÍRÁSA (Fehér/Kék, doboz nélkül, eltűnős)
        if (waveDisplay) {
            waveDisplay.innerText = `${currentWave}. HULLÁM`;
            waveDisplay.classList.add('normal-wave'); // Visszatesszük a sima stílust
            setTimeout(() => {
                waveDisplay.classList.add('hidden');
                waveDisplay.classList.remove('normal-wave'); // Kitakarítjuk utána
            }, 2000);
        }
        
        // --- ÚJ: PONTOSAN A ZOMBIK GENERÁLÁSAKOR KELNEK KI A NÖVÉNYEK ---
        if (typeof executeMutations === 'function') executeMutations();
        
        if (typeof spawnEnemy === 'function') {
            
// --- ÚJ: DOBZOK LERAKÁSA A HULLÁM ELEJÉN ---
            // Biztonságképpen letöröljük az esetleg megmaradt dobozokat az előző körből
            ammoBoxes.forEach(ab => { scene.remove(ab.mesh); }); ammoBoxes.length = 0;
            medkits.forEach(mk => { scene.remove(mk.mesh); }); medkits.length = 0;
            
            // JAVÍTÁS: A dobozok egyetlen pozíciót kapnak, így nem omlik össze az ütközésvizsgálat!
            if (typeof spawnMedkit === 'function') {
                for (let i = 0; i < 4; i++) {
                    let mPos = getSafeSpawnPosition(0.5, 5);
                    spawnMedkit(mPos.x, mPos.z);
                }
                for (let i = 0; i < 4; i++) {
                    let aPos = getSafeSpawnPosition(0.4, 5);
                    spawnAmmoBox(aPos.x, aPos.z);
                }
            }
            
            // --- ÚJ: ZOMBIK A PÁLYA SZÉLÉRŐL ÉRKEZNEK ---
            // Nincs több falba spawnolás, és garantáltan a sötétből jönnek!
            for(let i = 0; i < enemiesToSpawn; i++) {
                let ePos = getEdgeSpawnPosition();
                spawnEnemy(ePos.x, ePos.z, bossSpawning && i === 0);
            }
            
            // --- ÚJ CRAWLER LOGIKA: A Rothadó (Sárga) pocsolyák vonzzák őket! ---
            let yellowPuddles = toxicPuddles.filter(p => p.userData.state === 'yellow').length;
            let crawlerCount = 0;
            
            if (yellowPuddles >= 40) crawlerCount = 4;
            else if (yellowPuddles >= 25) crawlerCount = 2;
            else if (yellowPuddles >= 10) crawlerCount = 1;
            
            for(let c = 0; c < crawlerCount; c++) {
                let cPos = getEdgeSpawnPosition();
                spawnEnemy(cPos.x, cPos.z, false, 'crawler');
            }
        }
        
 isWaveActive = true; 
        waveStartTime = clock.getElapsedTime(); 
        totalPausedTime = 0; 
    }, 7000);
}

window.startGame = function() {
    // ÚJ: Kiegészítve a Crawler, Boss és Tank ellenőrzésével!
    if (!zombieModel || !ammoModel || !healthModel || !fastZombieModel || !hiderZombieModel || !crawlerModel || !bossModel || !tankModel) { 
        setTimeout(window.startGame, 500); 
        return; 
    }

    // =========================================================
    // --- ÚJ: TELJES "GYÁRI VISSZAÁLLÍTÁS" (TISZTA LAP) ---
    // =========================================================
    
    // 1. Képességek (Skillek) nullázása
    for (let sKey in skills) {
        skills[sKey].level = 0;
    }

    // 2. Fegyverek pontos alaphelyzetbe állítása (Visszaáll a sebzés és elvesznek a megvett fegyverek)
    weapons.pistol = { name: 'Pisztoly', level: 1, damage: 1, ammo: 10, reserve: 30, maxAmmo: 10, maxReserve: 30, pellets: 1, spread: 0, reloadTime: 1500, owned: true, auto: false, fireRate: 0, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/pisztoly.png" };
    weapons.shotgun = { name: 'Sörétes', level: 1, damage: 1.2, ammo: 0, reserve: 0, maxAmmo: 6, maxReserve: 24, pellets: 6, spread: 0.15, reloadTime: 2000, owned: false, auto: false, fireRate: 0, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/sz%C3%B6r%C3%A9tes.png" };
    weapons.rifle = { name: 'Gépkarabély', level: 1, damage: 0.8, ammo: 0, reserve: 0, maxAmmo: 30, maxReserve: 90, pellets: 1, spread: 0.05, reloadTime: 1800, owned: false, auto: true, fireRate: 0.08, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/g%C3%A9gkarab%C3%A9ly.png" };
    weapons.super = { name: 'Szuper fegyver', level: 1, damage: 15, ammo: 0, reserve: 0, maxAmmo: 6, maxReserve: 18, pellets: 1, spread: 0, reloadTime: 2500, owned: false, auto: false, fireRate: 0, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/revolver.png" };

// 3. Túlélő felszerelés és Direktívák (Küldetések) nullázása
    playerMedkits = 0;
    playerArmor = 0;
    playerResonators = 0; // <--- ÚJ: ITT NULLÁZZUK KI AZ ÚJ JÁTÉKNÁL!
    currentWeaponId = 'pistol';

// --- FAGYASZTÁS GOMB ÉS IDŐZÍTŐK ELREJTÉSE/NULLÁZÁSA ---
    activeFreezeTimer = 0;
    freezeCooldown = 0;
    const fBtnUI = document.getElementById('freeze-btn');
    if (fBtnUI) fBtnUI.classList.add('hidden');

    // JAVÍTÁS: Új játéknál garantáltan nincs bolt-büntetés!
    shopLockedForNextWave = false;

    if (typeof playerStats !== 'undefined') {
        playerStats.activeDirective = null;
        playerStats.directiveProgress = 0;
        playerStats.completedDirectives = []; 
        playerStats.abandonedDirectives = [];
        playerStats.weaponsBought = { shotgun: false, rifle: false, super: false };
        playerStats.skillsBought = 0;
    }
    // =========================================================

    // --- A HIBA JAVÍTÁSA: Azonnal leállítjuk a hullámot, hogy ne nyíljon ki a bolt! ---
    isWaveActive = false; 

    // Háttérfolyamatok és effektek leállítása
    if (window.waveTimeout) clearTimeout(window.waveTimeout);
    if (window.glitchShakeInterval) clearInterval(window.glitchShakeInterval);
    
    // Minden felugró ablak kényszerített bezárása
    const glitchOverlay = document.getElementById('glitch-overlay');
    if (glitchOverlay) {
        glitchOverlay.classList.remove('glitch-active');
        glitchOverlay.classList.add('hidden');
    }
    const waveDisplay = document.getElementById('wave-display');
    if (waveDisplay) waveDisplay.classList.add('hidden');
    
    const shopMenu = document.getElementById('shop-menu');
    if (shopMenu) shopMenu.classList.add('hidden');
    // -------------------------------------------------------------
    
    // Zene beállítása
    if (sounds['menuMusic'] && sounds['menuMusic'].isPlaying) sounds['menuMusic'].stop();
    if (sounds['music'] && sounds['music'].buffer && !sounds['music'].isPlaying) sounds['music'].play();
    
    gameState = 'PLAYING'; 
    playerHealth = 100; // Mert a skillek nullázódtak, a max 100 lesz!
    playerArmor = 0; 
    score = 0; 
    
    // --- FERTŐZÉS ÉS DROG LENULLÁZÁSA INDÍTÁSKOR ---
    playerInfection = 0;
    druggedTimer = 0;
    document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
    if (typeof sounds !== 'undefined' && sounds['whispers'] && sounds['whispers'].isPlaying) {
        sounds['whispers'].stop();
    }
    // --------------------------------------------------
    
    currentWave = 1; 
    enemiesToSpawn = 5; 
    currentWeaponId = 'pistol'; // VISSZAÁLL 1-RE!
    weapons.pistol.ammo = weapons.pistol.maxAmmo; 
    weapons.pistol.reserve = weapons.pistol.maxReserve;

    // --- ÚJ: A FEGYVER TÉNYLEGES KÉZBEADÁSA INDÍTÁSKOR ---
    if (typeof equipWeapon === 'function') equipWeapon(currentWeaponId);
    
    if (typeof updateUI === 'function') updateUI(); 
    camera.position.set(0, 1.6, 0);
    
    const radarContainer = document.getElementById('radar');
    
    // Zombik teljes törlése a pályáról és a memóriából
    for (let i = 0; i < enemies.length; i++) {
        // Biztos ami biztos, eltávolítjuk a 3D térből
        scene.remove(enemies[i].mesh); 
        
        // Felszabadítjuk a memóriát
        enemies[i].mesh.traverse((child) => {
            if (child.isMesh && child.geometry) child.geometry.dispose();
        });
        
        // Levesszük a radarról
        if (radarContainer && enemies[i].blip && enemies[i].blip.parentNode) {
            radarContainer.removeChild(enemies[i].blip); 
        }
    }
// Tömbök nullázása
    enemies.length = 0; 
    enemyHitboxes.length = 0; 
    
    // 1. HULLÁK ÉS A POOL TÖRLÉSE
    deadBodies.forEach(db => { 
        scene.remove(db.mesh); 
        db.mesh.traverse(c => { if(c.isMesh && c.geometry) c.geometry.dispose(); }); 
    });
    deadBodies.length = 0;

    zombiePool.forEach(pz => { 
        scene.remove(pz.mesh); 
        pz.mesh.traverse(c => { if(c.isMesh && c.geometry) c.geometry.dispose(); }); 
    });
    zombiePool.length = 0;

    // 2. POCSOLYÁK TÖRLÉSE ÉS KÖD NULLÁZÁSA
    toxicPuddles.forEach(p => { scene.remove(p); p.geometry.dispose(); });
    toxicPuddles.length = 0;
    pendingMutations = []; // Ezt is kiürítjük, nehogy kikeljen egy szellem-növény!
    if (typeof updateToxicFog === 'function') updateToxicFog(); // Visszaállítjuk a ködöt 0 pocsolyához (Teljesen tiszta levegő)

    // 3. MUTÁNS NÖVÉNYEK TÖRLÉSE (Ezt felejtettük el korábban!)
    activePlants.forEach(plant => {
        scene.remove(plant.mesh);
        scene.remove(plant.puddle);
        scene.remove(plant.hitbox);
        if(plant.puddle.geometry) plant.puddle.geometry.dispose();
    });
    activePlants.length = 0;
    
    // 4. LOOT DOBOZOK TÖRLÉSE
    medkits.forEach(mk => { scene.remove(mk.mesh); }); 
    medkits.length = 0; 
    
    ammoBoxes.forEach(ab => { scene.remove(ab.mesh); }); 
    ammoBoxes.length = 0;
    
    // Újra kezdjük a meccset
    if(typeof spawnMedkit === 'function') {
        for (let i = 0; i < 4; i++) {
            let mPos = getSafeSpawnPosition(0.5, 5);
            spawnMedkit(mPos.x, mPos.z);
        }
        for (let i = 0; i < 4; i++) {
            let aPos = getSafeSpawnPosition(0.4, 5);
            spawnAmmoBox(aPos.x, aPos.z);
        }
    }
    
    // Indítjuk az 1. hullámot a 7 másodperces glitch-el
    startWaveCountdown(true);
}

let currentBob = 0;

// ==========================================
// --- ÚJ: BOSS SPÓRA-ÜVÖLTÉS (BIOMASSZA FÜST) EFFEKT ---
// ==========================================
function spawnBossShockwave(bossMesh) {
    // Ha még nem létezik a köd-textúránk (bár már legeneráltuk feljebb), biztonsági fék
    if (typeof fogTexture === 'undefined') return;

    // Kiszámoljuk az irányt a játékos felé a szörny fejétől
    let startPos = bossMesh.position.clone();
    startPos.y += 2.5; // A fej (száj) magassága
    
    // A célpont a kamera, de egy kicsit lejjebb (a mellkasod felé), hogy betöltse a képernyőt

    // Mindig pontosan abba az irányba lőjük, amerre a Boss teste éppen áll!
    const forwardDir = new THREE.Vector3(0, 0, 1);
    // Átvesszük a Boss forgását (quaternion), így a vektor előre mutat a szörny szemszögéből!
    forwardDir.applyQuaternion(bossMesh.quaternion).normalize();

    // Létrehozunk egyedi anyagot minden "köpésnek", hogy a halványodást (opacity) külön tudjuk kezelni!
    // FONTOS: Vöröses-Narancssárga szín a kritikus anomália jelzésére!
    const puffMat = new THREE.SpriteMaterial({
        map: fogTexture,
        color: 0xff3300,       // Erős, izzó vörös-narancs
        transparent: true,
        opacity: 0.8,          // Masszív kezdő sűrűség
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

// Egyszerre 8 füstpamacsot lő ki egy "adagban", így sokkal sűrűbb lesz a sugár!
    for (let j = 0; j < 8; j++) {
        const puff = new THREE.Sprite(puffMat.clone()); // Klónozzuk a mat-ot, hogy egyedileg halványuljon
        
        // Pici szórás (hogy felhő formája legyen, ne egy vonalban jöjjenek)
        let spreadX = (Math.random() - 0.5) * 1.5;
        let spreadY = (Math.random() - 0.5) * 1.5;
        
        puff.position.set(startPos.x + spreadX, startPos.y + spreadY, startPos.z);
        
        // Kezdőméret: már a szájánál is hatalmas (2-3 méter átmérőjű)
        let initialScale = Math.random() * 2.0 + 2.0; 
        puff.scale.set(initialScale, initialScale, 1);
        
        scene.add(puff);

        shockwaves.push({ 
            mesh: puff, 
            life: 1.0, 
            direction: forwardDir,
            speed: Math.random() * 5.0 + 15.0, // Nagyon gyorsan repülnek az arcodba
            growth: Math.random() * 8.0 + 5.0,  // Folyamatosan dagadnak repülés közben
            rotSpeed: (Math.random() - 0.5) * 5.0 // Forognak, ahogy szállnak
        });
    }
}

function animate() {
    requestAnimationFrame(animate); 
    const delta = clock.getDelta();
    
// Ha menüben vagyunk, a kamera lassan körbeforog a pályán
    if (gameState === 'MENU') {
        yaw -= delta * 0.15; // Lassú, balra tartó forgás
        
        // ÚJ: Finom filmes lebegés és enyhe lefelé nézés
        camera.position.y = 1.6 + Math.sin(clock.getElapsedTime() * 0.8) * 0.15; 
        camera.quaternion.setFromEuler(new THREE.Euler(-0.05, yaw, 0, 'YXZ')); 
        
        if (typeof radSystem !== 'undefined') {
            radSystem.rotation.y += delta * 0.05; // A por is lassan örvénylik
        }
        renderer.render(scene, camera);
        return;
    }

    if (gameState !== 'PLAYING') { 
        renderer.render(scene, camera); return; 
    }

    // ==========================================
    // UI OPTIMALIZÁLÁS (Csak 10x másodpercenként frissítünk HTML-t)
    // ==========================================
    if (typeof window.uiTimer === 'undefined') window.uiTimer = 0;
    window.uiTimer += delta;
    if (window.uiTimer > 0.1) { // 0.1 másodperc = 100ms
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateDirectiveHUD === 'function') updateDirectiveHUD();
        window.uiTimer = 0;
    }
    // ==========================================

    // JAVÍTOTT Automata tüzelés logikája
    let wpn = weapons[currentWeaponId];
    if (autoShootTimer > 0) autoShootTimer -= delta;
    if (isShootingBtnPressed && wpn.auto && autoShootTimer <= 0) {
        handleShoot();
        autoShootTimer = wpn.fireRate;
    }

// --- ÚJ: FEJLETT TOXIKUS POCSOLYA LOGIKA (Sebzés és Pajzs) ---
    if (typeof toxicTickTimer !== 'undefined') {
        toxicTickTimer += delta;
        
        // --- JAVÍTÁS: FOLYAMATOS SAV SEBZÉS (0.2 mp-ként olvad le az élet) ---
        if (typeof window.toxicEffectTimer === 'undefined') window.toxicEffectTimer = 0;
        window.toxicEffectTimer -= delta;

        // 5-ször frissítünk másodpercenként (0.2 mp)
        if (toxicTickTimer >= 0.2) {
            toxicTickTimer = 0; 
            
            let playerDamage = 0;
            let worstPuddleState = null; 
            
            let px = camera.position.x;
            let pz = camera.position.z;
            
            // Megnézzük, milyen pocsolyán áll a játékos
            for (let p of toxicPuddles) {
                let distSq = Math.pow(px - p.position.x, 2) + Math.pow(pz - p.position.z, 2);
                if (distSq <= 1.2) {
                    if (p.userData.state === 'green') { 
                        playerDamage += 0.4; // 2 HP / 5 tick
                        if (!worstPuddleState) worstPuddleState = 'green';
                    }
                    else if (p.userData.state === 'yellow') { 
                        playerDamage += 1.0; // 5 HP / 5 tick
                        if (worstPuddleState !== 'ready') worstPuddleState = 'yellow';
                    }
                    else if (p.userData.state === 'ready') { 
                        playerDamage += 2.0; // 10 HP / 5 tick
                        worstPuddleState = 'ready'; 
                    }
                }
            }
            
            if (playerDamage > 0) {
                // Páncél véd a savtól is
                if (playerArmor > 0) {
                    if (playerArmor >= playerDamage) { playerArmor -= playerDamage; playerDamage = 0; } 
                    else { playerDamage -= playerArmor; playerArmor = 0; }
                }
                
                if (playerDamage > 0 && !isGodMode) playerHealth -= playerDamage; 
                
                if (typeof updateUI === 'function') updateUI();
                
                // Folyamatos apró reszketés a marástól
                cameraShake = Math.max(cameraShake, 0.05); 
                
                const acidOverlay = document.getElementById('acid-overlay');
                if (acidOverlay && worstPuddleState) {
                    
                    acidOverlay.classList.remove('acid-green', 'acid-yellow', 'acid-red');
                    if (worstPuddleState === 'green') acidOverlay.classList.add('acid-green');
                    else if (worstPuddleState === 'yellow') acidOverlay.classList.add('acid-yellow');
                    else if (worstPuddleState === 'ready') acidOverlay.classList.add('acid-red');

                    acidOverlay.style.opacity = 1;
                    acidOverlay.classList.add('acid-burn-active');
                    
                    // Óvatosan levesszük, ha kilépsz (folyamatosan fenntartjuk amíg benne állsz)
                    if (window.acidClearTimeout) clearTimeout(window.acidClearTimeout);
                    window.acidClearTimeout = setTimeout(() => { 
                        acidOverlay.style.opacity = 0; 
                        acidOverlay.classList.remove('acid-burn-active'); 
                    }, 300);
                }

                // --- HANGOK ÉS KÜLDETÉSEK (Ezek maradnak 1 másodperces ritmusban!) ---
                if (window.toxicEffectTimer <= 0) {
                    window.toxicEffectTimer = 1.0; // Visszaállítjuk az 1 mp-s számlálót
                    
                    playSound('hurt');
                    playSound('acidBurn'); 
                    
                    if (worstPuddleState === 'green') checkDirective('puddle_stand', 'green');
                    else if (worstPuddleState === 'yellow') checkDirective('puddle_stand', 'yellow');
                    else if (worstPuddleState === 'ready') checkDirective('puddle_stand', 'ready');
                }

                if (playerHealth <= 0 && gameState === 'PLAYING') {
                    if (skills.revive.level > 0) {
                        skills.revive.level--;
                        playerHealth = 100 + (skills.maxHealth.level * 20);
                        invincibilityTimer = 2.0;

                         // --- ÚJ: FERTŐZÉS KIÉGETÉSE ÉS DROG MEGSZÜNTETÉSE ---
                        playerInfection = Math.max(0, playerInfection - 40); 
                        druggedTimer = 0; 
                        document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                        // ---------------------------------------------------

                        playSound('defibrillator');
                        if (typeof updateShopButtons === 'function') updateShopButtons();
                   } else {
                        playSound('deathScream');
                      
                        gameState = 'GAMEOVER'; 
                        document.exitPointerLock(); 

                // --- ÚJ TAKARÍTÁS HALÁLKOR ---
                        document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                        playerInfection = 0; // Nullázzuk a fertőzést
                        if (typeof sounds !== 'undefined' && sounds['whispers'] && sounds['whispers'].isPlaying) {
                        sounds['whispers'].stop(); // Leállítjuk a suttogást
                        }
                // -----------------------------

                        
                        
                        document.getElementById('final-score').innerText = `ADAT: ${score} CR`; 
                        document.getElementById('final-wave').innerText = `TÚLÉLT ITERÁCIÓ: ${currentWave}`; 
                        
                        // --- ÚJ: TISZTA LAP (MENTÉS TÖRLÉSE) ---
                        if (typeof localStorage !== 'undefined') {
                            localStorage.removeItem('OmniCorpStats');
                        }
                        // Memória nullázása is
                        if (typeof playerStats !== 'undefined') {
                            playerStats.plantsDestroyed = 0;
                            playerStats.wavesSurvived = 0;
                            playerStats.totalDataGathered = 0;
                            playerStats.skillsBought = 0;
                            playerStats.activeDirective = null;
                            playerStats.directiveProgress = 0;
                            playerStats.completedDirectives = [];
                            playerStats.abandonedDirectives = [];
                            // Zombi statisztikák nullázása
                            for (let key in playerStats.kills) {
                                playerStats.kills[key] = { body: 0, head: 0 };
                            }
                            // Fegyverek nullázása
                            for (let wKey in weapons) {
                                if (wKey !== 'pistol') weapons[wKey].owned = false;
                                weapons[wKey].level = 1;
                            }
                            // Skillek nullázása
                            for (let sKey in skills) {
                                skills[sKey].level = 0;
                            }
                        }
                        
                        document.getElementById('game-over').classList.remove('hidden');
                    }
                }
            }
        } // Tick vége


// --- ÚJ: FERTŐZÉS (NEXUS SYNC) LOGIKA ---
    if (playerInfection > 0) {
        
        // 1. Állandó vizuális filter beállítása
        document.body.classList.remove('infected-mild', 'infected-medium', 'infected-severe');
        if (playerInfection > 75) document.body.classList.add('infected-severe');
        else if (playerInfection > 50) document.body.classList.add('infected-medium');
        else if (playerInfection > 25) document.body.classList.add('infected-mild');

        // 2. Véletlenszerű Ideg-rángások (Glitch Spasms)
        // Minél magasabb a fertőzés, annál gyakrabban rángatózik a kamera
        if (playerInfection >= 30 && druggedTimer <= 0) {
            infectionSpasmTimer -= delta;
            
            if (infectionSpasmTimer <= 0) {
                // Rángás aktiválása!
                playSound('cough');
                cameraShake = 0.3 * (playerInfection / 100); // Rángás erőssége a fertőzéstől függ
                
                const glitchOverlay = document.getElementById('glitch-overlay');
                if (glitchOverlay) {
                    glitchOverlay.classList.remove('hidden');
                    glitchOverlay.classList.add('glitch-active');
                    setTimeout(() => {
                        glitchOverlay.classList.remove('glitch-active');
                        glitchOverlay.classList.add('hidden');
                    }, 200 + Math.random() * 300); // 0.2 - 0.5 mp-ig tartó glitch
                }

                // Következő rángás kiszámolása (Ha 100% a fertőzés, 2-5 mp-enként jön!)
                let spasmFrequency = 15 - (playerInfection / 10); // 30%-nál ~12 mp, 100%-nál ~5 mp
                infectionSpasmTimer = spasmFrequency + (Math.random() * 5); 
            }
        }
        
        // Opcionális: Ha eléri a 100%-ot, minimális DoT (Damage over Time) sebzést is kaphat!
        if (playerInfection >= 100) {
            if (typeof toxicTickTimer !== 'undefined' && toxicTickTimer >= 1.0) {
                if (!isGodMode) playerHealth -= 1; // Lassú elvérzés, ha teljesen átvette az uralmat
            }
        }
    }

// ==========================================
    // ZOMBI PAJZS OPTIMALIZÁLÁS (Csak 250ms-enként ellenőrizzük)
    // ==========================================
    if (typeof window.shieldTimer === 'undefined') window.shieldTimer = 0;
    window.shieldTimer += delta;

    if (window.shieldTimer > 0.25) { // 4-szer egy másodpercben
        window.shieldTimer = 0; // Nullázzuk az időzítőt
        
        for (let en of enemies) {
            en.shieldMult = 1.0; 
            en.shieldType = null; 
            
            for (let p of toxicPuddles) {
                let distSq = Math.pow(en.mesh.position.x - p.position.x, 2) + Math.pow(en.mesh.position.z - p.position.z, 2);
                if (distSq <= 1.5) { 
                    en.shieldType = p.userData.state; 
                    
                    if (p.userData.state === 'green') en.shieldMult = 0.8;      
                    else if (p.userData.state === 'yellow') en.shieldMult = 0.5; 
                    else if (p.userData.state === 'ready') en.shieldMult = 0.2;  
                    break; 
                }
            }
        }
    }
    }
    // --- TOXIKUS LOGIKA VÉGE ---

    // ==========================================
    // --- ÚJ: SZEIZMIKUS REZONÁTOR MŰKÖDÉSE ---
    // ==========================================
    if (typeof activeResonators !== 'undefined') {
        for (let i = activeResonators.length - 1; i >= 0; i--) {
            let res = activeResonators[i];
            
            if (res.mixer) res.mixer.update(delta);
            
            // --- JAVÍTÁS: TÉRBELI HANG FRISSÍTÉSE (Ahogy távolodsz, úgy halkul!) ---
            if (res.sound && res.sound.isPlaying) {
                let distToPlayer = Math.hypot(camera.position.x - res.mesh.position.x, camera.position.z - res.mesh.position.z);
                let maxDist = 20.0; // 20 méter után már nem hallod
                let vol = 0;
                if (distToPlayer < maxDist) {
                    let ratio = Math.max(0, 1.0 - (distToPlayer / maxDist));
                    vol = (sounds['resonatorAudio'].baseVolume || 1.0) * Math.pow(ratio, 2);
                }
                res.sound.setVolume(vol);
            }
            
            // 1. FÁZIS: VONZÁS (10 másodperc pittyegés)
            if (res.state === 'lure') {
                res.timer -= delta;
                
                // Színváltás és villogás! (10-6 mp: Zöld, 6-3 mp: Sárga, 3-0 mp: Piros)
                if (res.timer > 6) {
                    res.light.color.setHex(0x00ff00);
                } else if (res.timer > 3) {
                    res.light.color.setHex(0xffff00);
                    res.light.intensity = Math.sin(res.timer * 10) > 0 ? 3.0 : 1.0; // Sárga villogás
                } else {
                    res.light.color.setHex(0xff0000);
                    res.light.intensity = Math.sin(res.timer * 25) > 0 ? 4.0 : 0.5; // Gyors piros villogás
                }
                
                // Idő lejárt: Indul a detonáció!
                if (res.timer <= 0) {
                    res.state = 'detonate';
                    res.light.color.setHex(0x00ffff); // Ciánkék energiavihar
                    res.light.intensity = 6.0;
                    cameraShake = 0.5; // Kezdeti lökés a kamerán
                }
            } 
            // 2. FÁZIS: ENERGIA-VIHAR (7 másodperc)
            else if (res.state === 'detonate') {
                res.blastTimer -= delta;
                res.light.intensity = 6.0 + Math.random() * 4.0; // Vadul pulzáló energia
                
                // Energia-gyűrűk és Sebzés 0.3 másodpercenként
                res.pulseTimer -= delta;
                if (res.pulseTimer <= 0) {
                    res.pulseTimer = 0.3; 
                    
// --- JAVÍTÁS: Látványos, vastag pulzáló gyűrűk! ---
                    // Ha a tömb nem létezik, létrehozzuk (Így az első letételnél is lesz gyűrű!)
                    if (typeof window.sonicBooms === 'undefined') window.sonicBooms = [];
                    
                    let ringGeo = new THREE.RingGeometry(0.1, 1.5, 32); 
                    let ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
                    let ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.copy(res.mesh.position);
                    ring.position.y += 0.5; 
                    ring.rotation.x = -Math.PI / 2; 
                    scene.add(ring);
                    
                    window.sonicBooms.push({ mesh: ring, life: 1.0, isGroundWave: true, radius: 0.1, maxRadius: 5.0 }); 
                    
                    
                    let powerMult = 1.0 + ((currentWave - 1) * 0.04); 
                    
                    for (let e = enemies.length - 1; e >= 0; e--) {
                        let en = enemies[e];
                        let distToRes = Math.hypot(res.mesh.position.x - en.mesh.position.x, res.mesh.position.z - en.mesh.position.z);
                        
                        // --- JAVÍTÁS: Csak 5 méteren belül sebez! ---
                        if (distToRes <= 5.0) {
                            // --- JAVÍTÁS: Nagyon pici sebzés, hogy kb. 5-6 másodpercig éljenek a viharban! ---
                            let tickDmg = 0.2;
                            if (en.type === 'boss') tickDmg = 0.5;
                            else if (en.type === 'tank') tickDmg = 0.8;
                            else if (en.type === 'runner' || en.type === 'crawler') tickDmg = 0.15;
                            
                            en.health -= tickDmg * powerMult; 
                            en.stunTimer = 0.4; // A vihar folyamatosan megbénítja őket
                            
                            // ==========================================
                            // --- JAVÍTOTT: SZENVEDÉS HANGJA (Dinamikus Távolsággal) ---
                            // ==========================================
                            // 1. Ha a zombinak még nincs saját sikoly-lejátszója, adunk neki egyet!
                            if (typeof en.screamAudio === 'undefined') {
                                en.screamAudio = new THREE.Audio(listener);
                                if (sounds['resonatorScream'] && sounds['resonatorScream'].buffer) {
                                    en.screamAudio.setBuffer(sounds['resonatorScream'].buffer);
                                    en.screamAudio.setLoop(true); // Folyamatosan ordít, amíg sül!
                                    en.screamAudio.play();
                                }
                            }

                            // 2. Minden egyes képkockán frissítjük a hangerőt a távolságodhoz képest!
                            if (en.screamAudio && en.screamAudio.isPlaying) {
                                let distToPlayerForScream = Math.hypot(camera.position.x - en.mesh.position.x, camera.position.z - en.mesh.position.z);
                                let vol = 0;
                                if (distToPlayerForScream < 25.0) { // 25m után süket
                                    let ratio = Math.max(0, 1.0 - (distToPlayerForScream / 25.0));
                                    vol = (sounds['resonatorScream'].baseVolume || 0.5) * Math.pow(ratio, 2);
                                }
                                en.screamAudio.setVolume(vol);
                            }

                            // ==========================================
                            // --- JAVÍTOTT LÁTVÁNY: FOLYAMATOS GÖMÖLYGŐ GŐZ ---
                            // ==========================================
                            
                            // 1. Zöld vér (Ugyanúgy folyik le)
                            for (let j = 0; j < 2; j++) {
                                let p = bloodPool.find(part => !part.active);
                                if (p) {
                                    p.active = true; p.life = 0.5;
                                    p.mesh.material.color.setHex(0x55ff55); 
                                    p.mesh.material.opacity = 1.0; 
                                    p.mesh.position.set(en.mesh.position.x + (Math.random()-0.5)*0.5, 1.0 + Math.random(), en.mesh.position.z + (Math.random()-0.5)*0.5); 
                                    p.mesh.scale.setScalar(0.2); 
                                    p.vx = (Math.random() - 0.5) * 0.2; 
                                    p.vy = Math.random() * 0.3;    
                                    p.vz = (Math.random() - 0.5) * 0.2; 
                                    p.mesh.visible = true;
                                }
                            }

                            // 2. Kékes-fehér Izzó Gőz (Lágy, folyamatos aura)
                            for (let j = 0; j < 5; j++) { // Több részecske a folyamatossághoz
                                let p = bloodPool.find(part => !part.active);
                                if (p) {
                                    p.active = true; 
                                    p.life = 0.8; // JAVÍTÁS: Tovább marad a levegőben (folytonosabb hatás)
                                    p.mesh.material.color.setHex(0x00ffff); 
                                    p.mesh.material.opacity = 0.5; // JAVÍTÁS: Halványabb, "ködösebb" áttetszőség
                                    p.mesh.material.blending = THREE.AdditiveBlending; 
                                    
                                    // Szélesebb körben fedi be a testet
                                    p.mesh.position.set(en.mesh.position.x + (Math.random()-0.5)*1.2, 0.2 + Math.random()*1.5, en.mesh.position.z + (Math.random()-0.5)*1.2); 
                                    
                                    p.mesh.scale.setScalar(0.8); // JAVÍTÁS: Sokkal nagyobb pamacsok
                                    
                                    // JAVÍTÁS: Lassan lebeg minden irányba, nincs "rakéta" kilövés!
                                    p.vx = (Math.random() - 0.5) * 0.05; 
                                    p.vy = Math.random() * 0.05 + 0.02; // Nagyon lassan emelkedik 
                                    p.vz = (Math.random() - 0.5) * 0.05; 
                                    p.mesh.visible = true;
                                }
                            }

                            if (en.health <= 0) {
                                killZombie(en, false);
                            }
                        }
                    }
                    
                    // --- POCSOLYÁK ELPÁROLOGTATÁSA (Max 5 méter) ---
                    for (let p = toxicPuddles.length - 1; p >= 0; p--) {
                        let pud = toxicPuddles[p];
                        let distToPud = Math.hypot(res.mesh.position.x - pud.position.x, res.mesh.position.z - pud.position.z);
                        if (distToPud <= 5.0) {
                            scene.remove(pud);
                            pud.geometry.dispose();
                            toxicPuddles.splice(p, 1);
                        }
                    }
                    if (typeof updateToxicFog === 'function') updateToxicFog();
                } // Ide záródik a 0.3 mp-es pulseTimer ciklus!
                
                // --- JAVÍTOTT: VÉGE A VIHARNAK (HANG LEÁLL, GÉP ELSZENESEDIK) ---
                if (res.blastTimer <= 0) {
                    // Biztonsági hang leállítás (így garantáltan vége a hangnak a viharral együtt!)
                    if (res.sound && res.sound.isPlaying) res.sound.stop(); 
                    
                    scene.remove(res.light); // Csak a fényt vesszük el
                    
                    // A modell elszenesedik és a pályán marad!
                    res.mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material = child.material.clone();
                            child.material.color.setHex(0x222222); // Fekete, égett fém szín
                            if (child.material.emissive) child.material.emissive.setHex(0x000000); // Többé nem világít
                        }
                    });
                    
                    activeResonators.splice(i, 1); // Kikerül az aktív gépek közül
                }
            } 
        }
    }

    // ==========================================
    // --- ÚJ: POCSOLYÁK LASSÚ KIFOLYÁSA (TERJEDÉS) ---
    // ==========================================
    for (let i = 0; i < toxicPuddles.length; i++) {
        let p = toxicPuddles[i];
        
        // Ha van cél-mérete, és még nem érte el azt
        if (p.userData.targetScale && p.scale.x < p.userData.targetScale) {
            
            // A delta * 0.25 azt jelenti, hogy kb. 4 másodperc alatt éri el a teljes méretét!
            // (Lassan, szaftosan folyik ki)
            let newScale = p.scale.x + (delta * 0.25); 
            
            if (newScale > p.userData.targetScale) {
                newScale = p.userData.targetScale; // Megállítjuk, ha kész
            }
            p.scale.set(newScale, newScale, newScale);
        }
    }

    if (damageCooldown > 0) damageCooldown -= delta;
    if (muzzleFlash.intensity > 0) muzzleFlash.intensity = Math.max(0, muzzleFlash.intensity - delta * 30);
    // --- FPS FEGYVER ANIMÁCIÓK FRISSÍTÉSE ---
    for (let key in loadedFPSModels) {
        if (loadedFPSModels[key].mixer) {
            loadedFPSModels[key].mixer.update(delta);
        }
    }
    
    // ==========================================
    // --- ÚJ: VÉLETLENSZERŰ IDLE (SZUSZOGÁS) ANIMÁCIÓ ---
    // ==========================================
    if (!isWeaponBusy) {
        if (typeof window.weaponIdleTimer === 'undefined') window.weaponIdleTimer = 2.0;
        
        window.weaponIdleTimer -= delta; // Visszaszámlálás
        
        if (window.weaponIdleTimer <= 0) {
            let action = playFPSAnim(currentWeaponId, 'watch');
            
            // Kiszámoljuk, mikor szuszogjon legközelebb
            let animLen = action ? (action._clip.duration / action.timeScale) : 1.0;
            window.weaponIdleTimer = animLen + 2.0 + (Math.random() * 2.0); // Animáció hossza + 2-4 mp szünet
        }
    }


    
 // --- ÚJ: A 3D FÜST KAVARGÁSA ---
    if (typeof fogSystem !== 'undefined' && fogMat.opacity > 0) {
        const fogPos = fogSystem.geometry.attributes.position.array;
        for (let i = 0; i < fogParticleCount; i++) {
            let idx = i * 3;
            
            // Mozgatás az előre elmentett véletlenszerű irányokba
            fogPos[idx] += fogData[i].vx;     // X tengely
            fogPos[idx + 1] += fogData[i].vy; // Y tengely
            fogPos[idx + 2] += fogData[i].vz; // Z tengely
            
            // Ha a füstpamacs kimegy a 40 méteres dobozból, visszadobjuk a túloldalra!
            // Így sosem fogy el körülötted a gőz, mindig visszakerül (Végtelenítő trükk)
            let limit = 20.0;
            if (fogPos[idx] > camera.position.x + limit) fogPos[idx] -= limit * 2;
            if (fogPos[idx] < camera.position.x - limit) fogPos[idx] += limit * 2;
            
            if (fogPos[idx + 2] > camera.position.z + limit) fogPos[idx + 2] -= limit * 2;
            if (fogPos[idx + 2] < camera.position.z - limit) fogPos[idx + 2] += limit * 2;
            
            // Felfelé és lefelé mozgás korlátozása
            if (fogPos[idx + 1] > 5.0) fogPos[idx + 1] = 0;
            if (fogPos[idx + 1] < 0) fogPos[idx + 1] = 5.0;
        }
        fogSystem.geometry.attributes.position.needsUpdate = true;
    }

    // --- SUTTOGÁS HANGEREJÉNEK KEZELÉSE ---
if (sounds['whispers'] && sounds['whispers'].buffer) {
    // Ha még nem szól, elindítjuk (de a hangereje a fertőzéstől függ)
    if (!sounds['whispers'].isPlaying) sounds['whispers'].play();
    
    // Kiszámoljuk a hangerőt: 0% fertőzés = 0.0 hangerő, 100% fertőzés = 1.0 hangerő
    let whisperVolume = playerInfection / 100;
    
    // Csak 10% felett kezdődjön el halkan, hogy legyen egy kis alapzaj mentessége
    if (playerInfection < 10) whisperVolume = 0; 
    
    sounds['whispers'].setVolume(whisperVolume);
}

// ==========================================
    // MUTÁLÓDÓ POCSOLYÁK ANIMÁCIÓJA (PULZÁLÁS & VÖRÖSÖDÉS)
    // ==========================================
    if (typeof pendingMutations !== 'undefined' && pendingMutations.length > 0) {
        // A clock adja a pulzálás ütemét (gyors szívverés szerű)
        let pulseTime = clock.getElapsedTime() * 8; 
        // Létrehozunk egy vörös színt, amihez közeledni fognak
        let targetColor = new THREE.Color(0xff0000); 

        for (let mut of pendingMutations) {
            for (let p of mut.puddles) {
                // 1. PULZÁLÁS (Kicsinyítés - Nagyítás)
                // Alapból 1-es méretűek, ezt ugráltatjuk 0.8 és 1.2 között
                let pulseScale = 1.0 + Math.sin(pulseTime) * 0.2;
                p.scale.set(pulseScale, pulseScale, pulseScale);
                
                // 2. SZÍNVÁLTÁS
                // Szép lassan, ahogy telik az idő, a zöld színüket átkeverjük pirosra
                if (p.material && p.material.color) {
                    p.material.color.lerp(targetColor, delta * 0.5);
                }
            }
        }
    }

// ==========================================
    // --- ÚJ: SISAK / VÁLL-LÁMPA FIZIKA (HORROR EFFEKT) ---
    // ==========================================
    
    // 1. A lámpa lomhasága (Mouse Lag) - FINOMÍTVA
    if (typeof window.mouseDeltaX === 'undefined') window.mouseDeltaX = 0;
    if (typeof window.mouseDeltaY === 'undefined') window.mouseDeltaY = 0;
    
    // A 0.004-et lejjebb vettük 0.0015-re (Finomabb, elegánsabb lemaradás)
    let lightTargetX = -(window.mouseDeltaX * 0.0015); 
    let lightTargetY = -(window.mouseDeltaY * 0.0015);
    
    // 2. Lélegzés és Lépés szinkron - FINOMÍTVA
    if (typeof window.breathTime === 'undefined') window.breathTime = 0;
    
    let currentSpeed = Math.hypot(moveX, moveZ);
    
    if (currentSpeed > 0.05) {
        // A kilengéseket levettük, hogy életszerű legyen, de ne ugráljon zavaróan
        lightTargetX += Math.cos(bobTime) * 0.08;   // 0.20-ról 0.08-ra
        lightTargetY += Math.abs(Math.sin(bobTime)) * 0.12; // 0.25-ről 0.12-re
    } else {
        // Álló helyzetben: Lélegzetvétel
        let lampBreath = isExhausted ? 0.08 : 0.02; // Kisebb, életszerűbb emelkedés
        lightTargetY += Math.sin(window.breathTime) * lampBreath;
        lightTargetX += Math.cos(window.breathTime * 0.5) * (lampBreath * 0.5);
    }
    
    // 3. Fény csóva simítása (Lágy átmenet)
    flashlight.target.position.x = THREE.MathUtils.lerp(flashlight.target.position.x, lightTargetX * 4, delta * 8);
    flashlight.target.position.y = THREE.MathUtils.lerp(flashlight.target.position.y, lightTargetY * 4, delta * 8);
    flashlight.target.position.z = -5; // Fix távolságra világít előre
    
    // 4. Horror Villódzás (Pislákolás)
    playerLight.position.copy(camera.position);
    
    if (playerInfection > 60 || cameraShake > 0.4) {
        // Erősen pislákol
        flashlight.intensity = Math.random() > 0.5 ? 5 : 20;
        playerLight.intensity = Math.random() > 0.5 ? 0.2 : 0.8;
    } else {
        // Ritka, "hibás érintkezés" villanás (1% eséllyel pislant egyet)
        if (Math.random() < 0.01) {
            flashlight.intensity = 5;
            playerLight.intensity = 0.2;
        } else {
            // Stabil fény
            flashlight.intensity = THREE.MathUtils.lerp(flashlight.intensity, 20, delta * 10);
            playerLight.intensity = THREE.MathUtils.lerp(playerLight.intensity, 0.8, delta * 10);
        }
    }

    radarAngle -= delta * 3.5; 
    let displayAngle = radarAngle % (Math.PI * 2); 
    if (displayAngle < 0) displayAngle += Math.PI * 2;
    const radarScanner = document.querySelector('.radar-scanner');
    if (radarScanner) radarScanner.style.transform = `translate(0, -50%) rotate(${displayAngle}rad)`;

    // Bolt nyitása és EGÉR VISSZAADÁSA
    // A hullám véget ér, ha már csak a menekülő szörnyek élnek (vagy senki)
    if (isWaveActive && enemies.filter(e => e.type !== 'crawler').length === 0) {
        isWaveActive = false; 

        // ==========================================
        // --- ÚJ: HULLÁK ELSÜLLYESZTÉSE A HULLÁM VÉGÉN ---
        // ==========================================
        for (let i = 0; i < deadBodies.length; i++) {
            deadBodies[i].sinking = true; 
        }

        // JAVÍTÁS ITT IS: Levonjuk a szünetidőt a bónuszból!
        let waveDuration = (clock.getElapsedTime() - waveStartTime) - totalPausedTime;
        let parTime = enemiesToSpawn * 4;
        lastWaveBonus = 0;
        if (waveDuration < parTime) {
            let savedSeconds = Math.floor(parTime - waveDuration);
            lastWaveBonus = savedSeconds * 10;
            score += lastWaveBonus;
            if (typeof updateUI === 'function') updateUI();
        }
        document.exitPointerLock(); // <-- Visszaadjuk az egeret a bolthoz!
        if (typeof openShop === 'function') openShop(); 

   if (isWaveActive && enemies.filter(e => e.type !== 'crawler').length === 0) {
        isWaveActive = false; 
        
// --- JAVÍTOTT: KÓDEX STATISZTIKA NÖVELÉSE (BODY / HEAD SZÉTVÁLASZTVA!) ---
                        if (typeof playerStats !== 'undefined') {
                            playerStats.totalDataGathered += rewardAmmount; 
                            
                            // Mivel a 'hider'-t átneveztük 'stalker'-re a kódexben!
                            let statType = en.type === 'hider' ? 'stalker' : en.type;
                            
                            if (playerStats.kills[statType]) {
                                if (isHeadshot) playerStats.kills[statType].head++;
                                else playerStats.kills[statType].body++;
                            }
                            
                            if (typeof savePlayerStats === 'function') savePlayerStats();
                        }
        
        let waveDuration = clock.getElapsedTime() - waveStartTime;
        let parTime = enemiesToSpawn * 4; 
        lastWaveBonus = 0;
        if (waveDuration < parTime) {
            let savedSeconds = Math.floor(parTime - waveDuration);
            lastWaveBonus = savedSeconds * 10;
            score += lastWaveBonus;
            if (typeof updateUI === 'function') updateUI();
        }

        // --- ÚJ TAKARÍTÁS: A túlélő Crawlerek (Loot Goblinok) eltüntetése ---
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (enemies[i].type === 'crawler') {
                let survivor = enemies[i];
                
                // 3D modell és hitbox eltávolítása a térből
                scene.remove(survivor.mesh);
                let bIdx = enemyHitboxes.indexOf(survivor.bodyHitbox);
                if (bIdx > -1) enemyHitboxes.splice(bIdx, 1);
                let hIdx = enemyHitboxes.indexOf(survivor.headHitbox);
                if (hIdx > -1) enemyHitboxes.splice(hIdx, 1);
                
                // Pötty törlése a radarról
                if (survivor.blip && survivor.blip.parentNode) {
                    survivor.blip.parentNode.removeChild(survivor.blip);
                }
                
                // Törlés a logikai tömbből
                enemies.splice(i, 1);
            }
        }
        // --------------------------------------------------------------------

        document.exitPointerLock(); 
        if (typeof openShop === 'function') openShop(); 
    }
    }

    // Kamera Rázkódás, Visszarúgás és Lépkedés
    if (isNaN(pitch)) pitch = 0; if (isNaN(yaw)) yaw = 0;
    recoilPitch = Math.max(0, recoilPitch - delta * 1.5);
    
    // --- ÚJ: SPRINT MEGÁLLÁS KILENGÉS (Kamera bólogatás) ---
    let stopWobblePitch = 0;
    if (typeof window.sprintStopWobble !== 'undefined' && window.sprintStopWobble > 0) {
        window.sprintStopWobble -= delta * 3.0; // Picit gyorsabban cseng le
        if (window.sprintStopWobble < 0) window.sprintStopWobble = 0;
        
        // JAVÍTÁS: Kisebb és finomabb bólintás (0.06 helyett 0.025)
        stopWobblePitch = Math.sin(window.sprintStopWobble * Math.PI) * 0.025; 
    }

    // Alkalmazzuk a dőlést (pitch) a bicsaklással együtt!
    camera.quaternion.setFromEuler(new THREE.Euler(pitch + recoilPitch + stopWobblePitch, yaw, roll, 'YXZ'));
    
    let shakeX = 0, shakeY = 0;
    if (cameraShake > 0) {
        shakeX = (Math.random() - 0.5) * cameraShake; shakeY = (Math.random() - 0.5) * cameraShake;
        cameraShake -= delta;
    }
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); 
    forward.y = 0; 
    if (forward.lengthSq() > 0.001) forward.normalize(); else forward.set(0,0,-1);
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
    
    // ==========================================
    // --- KÉS TÖLTÉS (POWER HIT) SZÁMLÁLÓ ÉS EFFEKT ---
    // ==========================================
    if (window.isChargingMelee) {
        window.meleeChargeTime += delta;
        
        // Maximalizáljuk 2.0 másodpercnél!
        if (window.meleeChargeTime > 2.0) {
            window.meleeChargeTime = 2.0;
        }

        // Ha elérte a maximumot (2 másodperc), a karakter keze "remegni" kezd az erőlködéstől!
        if (window.meleeChargeTime === 2.0) {
            cameraShake = 0.03; // Finom feszültség-remegés a képernyőn!
        }
    }

// ==========================================
    // --- ÚJ: STAMINA (KIFÁRADÁS) LOGIKA ÉS FOV ---
    // ==========================================
    let speedMult = 0.08 * (1 + (skills.speed.level * 0.2)); // Alap sebesség
    
    // Visszaszámlálók
    if (staminaCooldown > 0) staminaCooldown -= delta;

    // Ha próbál sprintelni (és nem guggol, és mozog is valamelyik irányba)
    let isMoving = (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1);
    
    // --- 1. DINAMIKUS FOV (Sebességérzet ÉS Csőlátás) ---
    let targetFOV = 75; // Alap látószög

    if (isSprinting && isMoving && !isCrouching && !isExhausted && staminaCooldown <= 0) {
        // Futás: Fogy a stamina
        playerStamina -= delta * 25.0; 
        speedMult *= 2.2; 
        targetFOV = 85; // Sprint kinyitja
        
        // Ha teljesen elfogyott a levegő: KIFULLADÁS
        if (playerStamina <= 0) {
            playerStamina = 0; isExhausted = true; staminaCooldown = 3.0;
            playSound('cough'); 
        }
    } 
    else {
        // --- JAVÍTÁS: Ha tölti a kést, NEM regenerálódik a Stamina! ---
        if (playerStamina < 100 && !window.isChargingMelee) { 
            playerStamina += delta * 15.0; 
            if (playerStamina >= 100) { playerStamina = 100; isExhausted = false; }
        }
        if (isExhausted) speedMult *= 0.6; 
    }

    // --- ÚJ: CSŐLÁTÁS (TUNNEL VISION) A KÉSNÉL ---
    if (window.isChargingMelee) {
        // Ahogy múlik az idő, a látószög 75-ről lemegy egészen 55 fokra (Ráközelít a célra)
        targetFOV = 75 - Math.min(window.meleeChargeTime * 10, 20);
    }

    // FOV Lágy átmenete és frissítése a kamerán
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, delta * 5.0);
    camera.updateProjectionMatrix(); // Ezt kötelező meghívni, ha a fov változik!

    // ==========================================
    // --- KÉS TÖLTÉS (POWER HIT) SZÁMLÁLÓ ÉS STAMINA LIMIT ---
    // ==========================================
    if (window.isChargingMelee) {
        window.meleeChargeTime += delta;
        
        // Tartás közben is folyamatosan (kicsit) fogy a stamina (5 Stamina másodpercenként)
        playerStamina -= delta * 5.0;

        // HA ELFOGY A STAMINA -> KÉNYSZERÍTETT LEÁLLÁS (Nincs ütés)
        if (playerStamina <= 0) {
            window.isChargingMelee = false;
            
            // Hang leállítása
            if (sounds['heavyBreathing'] && sounds['heavyBreathing'].isPlaying) {
                sounds['heavyBreathing'].stop();
            }

            // Kifulladás garantálása
            playerStamina = 0;
            isExhausted = true;
            staminaCooldown = 3.0;
            playSound('cough');

            // --- LÁGY VISSZAENGEDÉS ---
            playFPSAnim('melee', 'watch', 1.0);

            // A fegyver (kéz) zárolva marad erre az 1 másodpercre
            setTimeout(() => {
                isWeaponBusy = false;
                window.meleeCooldown = 0.5; // Picit kell várnia, mielőtt újra próbálkozhat
            }, 1000);
            
        } 
        // HA MÉG TARTJA ÉS BÍRJA SZUSSZAL
        else {
            if (window.meleeChargeTime >= 2.0) {
                cameraShake = 0.02; // Finom feszültség-remegés a képernyőn a 2. másodperc után folyamatosan!
            }
        }
    }

   // --- 2. KAMERA DŐLÉS (Strafe Tilt + Lépés Dőlés) ---
    let targetRoll = 0;
    if (isMoving && !isLootingActive) {
        // Oldalazás miatti dőlés
        if (keys.a) targetRoll = 0.02;  
        if (keys.d) targetRoll = -0.02; 
        if (isSprinting) targetRoll *= 1.5; 
        
        // --- ÚJ: Szinkronizált lépés-dőlés! ---
        // Ahogy lépegetsz, a karakter teste finoman dülöngél balra-jobbra a bobTime alapján
        targetRoll += Math.cos(bobTime) * (isSprinting ? 0.015 : 0.008);
    }
    roll = THREE.MathUtils.lerp(roll, targetRoll, delta * 8.0);

// --- GUGGOLÁS / LOOTOLÁS / TELEPÍTÉS LASSÍTÁS ---
    let isCurrentlyDeploying = (typeof isDeploying !== 'undefined' && isDeploying);
    if (isCrouching || isLootingActive || isCurrentlyDeploying) {
        speedMult *= 0.4; 
    }

    // ==========================================
    // --- ÚJ: TEHETETLENSÉG (LENDÜLET ÉS CSÚSZÁS) ---
    // ==========================================
    if (typeof window.playerVelX === 'undefined') window.playerVelX = 0;
    if (typeof window.playerVelZ === 'undefined') window.playerVelZ = 0;
    if (typeof window.wasSprinting === 'undefined') window.wasSprinting = false;

    let targetVx = moveX * speedMult;
    let targetVz = moveZ * speedMult;

    // Súrlódás (Tapadás). Minél kisebb a szám, annál jobban csúszik!
    let friction = 12.0; // Alap: Reszponzív, gyors megállás sétából
    
    // Vizsgáljuk, hogy futott-e az imént
    let isCurrentlySprinting = (isSprinting && isMoving && !isExhausted && staminaCooldown <= 0);

    if (isCurrentlySprinting) {
        window.wasSprinting = true;
    } else if (window.wasSprinting) {
        // PONT MOST ÁLLT MEG A SPRINTBŐL! (Elengedte a Shift-et vagy a gombokat)
        window.wasSprinting = false;
        window.sprintStopWobble = 1.0; // Kamera bicsaklás (bólogatás) indítása!
    }

    // Ha elengedted az iránygombokat (megállás), bekapcsol a csúszás!
    if (moveX === 0 && moveZ === 0) {
        // Ha épp a sprintből álltál meg, 3.0 (nagyon csúszik), ha sima sétából, 6.0 (kicsit csúszik)
        friction = (window.sprintStopWobble > 0) ? 3.0 : 6.0; 
    }

    // Sebesség (Velocity) finomítása a tehetetlenséggel
    window.playerVelX = THREE.MathUtils.lerp(window.playerVelX, targetVx, delta * friction);
    window.playerVelZ = THREE.MathUtils.lerp(window.playerVelZ, targetVz, delta * friction);

// Kamera magasság eltolása
    if (typeof window.crouchOffset === 'undefined') window.crouchOffset = 0;
    
    // --- JAVÍTÁS: Telepítés (isCurrentlyDeploying) közben a kamera is lecsúszik guggoló magasságba! ---
    // A változót már feljebb deklaráltuk, így itt csak simán felhasználjuk:
    let targetOffset = (isCrouching || isLootingActive || isCurrentlyDeploying) ? -0.7 : 0; 
    
    window.crouchOffset = THREE.MathUtils.lerp(window.crouchOffset, targetOffset, delta * 8.0);

    // Alkalmazzuk az új LENDÜLETES sebességet a pozícióra (moveX/Z helyett playerVelX/Z)!
    let nextX = camera.position.x + forward.x*(-window.playerVelZ) + right.x*(window.playerVelX);
    let nextZ = camera.position.z + forward.z*(-window.playerVelZ) + right.z*(window.playerVelX);
   
    if (!checkWallCollision(nextX, camera.position.z, playerRadius)) camera.position.x = nextX;
    if (!checkWallCollision(camera.position.x, nextZ, playerRadius)) camera.position.z = nextZ;

    velocityY -= gravity; baseCamY += velocityY; 
    if (baseCamY < 1.6) { baseCamY = 1.6; velocityY = 0; }
    
// --- LÉPÉSHANGOK ÉS KAMERA RUGÓZÁS (BOBBING) TÖKÉLETES SZINKRON ---
    // A ringózás sebességét most már a TÉNYLEGES csúszási sebességből számoljuk!
    let effX = window.playerVelX / speedMult; if (isNaN(effX)) effX = 0;
    let effZ = window.playerVelZ / speedMult; if (isNaN(effZ)) effZ = 0;
    const speed = Math.min(1.0, Math.hypot(effX, effZ)); 

    if (speed > 0.05) { 
        let bobSpeedMult = 1.0;
        // Mivel az alapséta lassabb lett, a sprint animációnak jobban fel kell pörögnie
        if (isSprinting && !isExhausted) bobSpeedMult = 1.8;     
        else if (isExhausted) bobSpeedMult = 0.6;                
        else if (isCrouching || isLootingActive) bobSpeedMult = 0.5; 
        
        // Elmentjük a régi fázist, hogy tudjuk, mikor léptünk egyet
        let prevBobPhase = bobTime % Math.PI;
        bobTime += delta * 7.0 * bobSpeedMult * (1 + (skills.speed.level * 0.2)); 
        let currentBobPhase = bobTime % Math.PI;

        // --- JAVÍTÁS: NINCS TÖBB UGRÁS MEGÁLLÁSKOR! ---
        // A ringózás magasságát megszorozzuk a csúszás sebességével.
        // Így ahogy lelassulsz a csúszás végén, a kamera finoman simul vissza a magasságába!
        let bobAmplitude = 0.06 * Math.min(1.0, speed * 2.0);
        currentBob = -Math.abs(Math.sin(bobTime)) * bobAmplitude; 
        
        // --- TÖKÉLETES HANG SZINKRON ---
        // Ha a fázis átfordul (véget ér egy lépés és a láb földet ér), CSATTAN a hang!
        if (currentBobPhase < prevBobPhase) {
            playSound('playerStep'); 
            
            
// Pici por kavarása a láb alatt
            for (let i = 0; i < 3; i++) { 
                let p = bloodPool.find(part => !part.active);
                if (p) {
                    p.active = true; p.life = 0.6;
                    p.mesh.position.set(camera.position.x + (Math.random()-0.5)*0.5, 0.1, camera.position.z + (Math.random()-0.5)*0.5);
                    
                    // --- JAVÍTÁS: Kisebb por (0.6 helyett 0.3) ---
                    p.mesh.scale.setScalar(0.3);
                    
                    p.mesh.material.color.setHex(0x889988); 
                    p.vx = (Math.random() - 0.5) * 0.1; 
                    
                    // --- JAVÍTÁS: Alig emelkedik fel a földről (nem repül az arcodba!) ---
                    p.vy = Math.random() * 0.05 + 0.02;    
                    
                    p.vz = (Math.random() - 0.5) * 0.1; 
                    p.mesh.visible = true;
                }
            }
        }
    } 
    else { 
        // Visszaállás nyugalmi állapotba
        currentBob = THREE.MathUtils.lerp(currentBob, 0, delta * 10); 
    }
    
    // Rázkódás és a kamera végső pozíciója
    let savedCamX = camera.position.x;
    camera.position.x += shakeX;
    camera.position.y = baseCamY + window.crouchOffset + currentBob + shakeY;

    // ==========================================
    // --- ÚJ: FEGYVER DŐLÉS, SZINKRON BOB ÉS FAL-VISSZAHÚZÁS ---
    // ==========================================
    if (currentWeaponMesh && loadedFPSModels[currentWeaponId].basePos) {
        let wData = loadedFPSModels[currentWeaponId];
        
        // 1. Egér rántás csillapítása (Sway)
        if (typeof window.mouseDeltaX === 'undefined') window.mouseDeltaX = 0;
        if (typeof window.mouseDeltaY === 'undefined') window.mouseDeltaY = 0;
        window.mouseDeltaX = THREE.MathUtils.lerp(window.mouseDeltaX, 0, delta * 15);
        window.mouseDeltaY = THREE.MathUtils.lerp(window.mouseDeltaY, 0, delta * 15);

        if (typeof window.meleeCooldown === 'undefined') window.meleeCooldown = 0;
if (window.meleeCooldown > 0) window.meleeCooldown -= delta;

        let swayX = window.mouseDeltaY * 0.0005; // Fel-le
        let swayY = window.mouseDeltaX * 0.0005; // Jobbra-balra

       // 2. TÖKÉLETESEN SZINKRONIZÁLT KÉZ RINGÓZÁS ÉS LÉLEGZÉS
        if (typeof window.breathTime === 'undefined') window.breathTime = 0;
        
        // A lélegzés sebessége (kifulladva sokkal szaporább!)
        let breathSpeed = isExhausted ? 5.0 : 1.5; 
        window.breathTime += delta * breathSpeed;

        let weaponBobX = 0;
        let weaponBobY = 0;
        
        if (speed > 0.05) { 
            // --- MOZGÁS KÖZBEN: Lépés ringózás ---
            weaponBobX = Math.cos(bobTime) * 0.015; 
            weaponBobY = Math.abs(Math.sin(bobTime)) * 0.02; 
            
            if (isSprinting && !isExhausted) {
                weaponBobX *= 2.0;
                weaponBobY *= 2.0;
            } else if (isExhausted || isCrouching || isLootingActive) {
                weaponBobX *= 0.5; weaponBobY *= 0.5;
            }
        } else {
            // --- ÁLLÓ HELYZETBEN: Lélegzés (Idle Sway) ---
            // Kifulladva mélyebbeket lélegzik (jobban mozog a fegyver le-fel)
            let breathIntensity = isExhausted ? 0.01 : 0.003;
            
            // Finom fel-le mozgás a tüdő tágulása miatt
            weaponBobY = Math.sin(window.breathTime) * breathIntensity; 
            
            // Nagyon minimális, lassú oldalirányú billegés, hogy ne legyen gépies
            weaponBobX = Math.cos(window.breathTime * 0.5) * (breathIntensity * 0.4); 
        }

        // ==========================================
        // 3. TARKOV STÍLUSÚ FAL-VISSZAHÚZÁS (Wall-Collision)
        // ==========================================
        let wallPullbackZ = 0;  // Mennyire nyomja a mellkasához a fegyvert
        let wallPullbackRotX = 0; // Mennyire emeli fel a csövét
        
        window.isFacingWall = false; // Alapból nem blokkolunk semmit!

        // Csak a fegyvereknél számoljuk
        if (currentWeaponId !== 'heal') {
            let camPos = camera.position.clone();
            let rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            rayDir.y = 0; rayDir.normalize();
            
            let wallRay = new THREE.Ray(camPos, rayDir);
            let closestDist = Infinity;

            for (let i = 0; i < wallHitboxes.length; i++) {
                let intersect = wallRay.intersectBox(wallHitboxes[i], new THREE.Vector3());
                if (intersect) {
                    let dist = camPos.distanceTo(intersect);
                    if (dist < closestDist) closestDist = dist;
                }
            }

            // Ha 1.2 méternél közelebb van a fal
            if (closestDist < 1.2) {
                let intensity = 1.0 - (closestDist / 1.2); 
                wallPullbackZ = intensity * 0.5;   
                wallPullbackRotX = intensity * 1.2; 
                
                // --- ÚJ: HA TÚL KÖZEL VAGY (Kevesebb, mint 0.9m), BLOKKOLJUK A FEGYVERT! ---
                // (A késelésnél nem blokkoljuk, mert falat lehet szúrni, csak a lőfegyvereket!)
                if (closestDist < 0.9 && currentWeaponId !== 'melee') {
                    window.isFacingWall = true;
                }
            }
        }

// --- ÚJ: SPRINTELÉS ALATTI FEGYVER LEENGEDÉS ---
        let sprintRotX = 0, sprintRotY = 0, sprintRotZ = 0, sprintPosY = 0;
        
        // Ha futunk (és nem vagyunk kifulladva, és a Gen-Stab sincs a kézben)
        if (isSprinting && !isExhausted && speed > 0.05 && currentWeaponId !== 'heal') {
            // Taktikai Sprint tartás (A fegyvert jól láthatóan, srégen keresztbe maga előtt tartja)
            sprintRotX = -0.2;  // Csak picit dönti lefelé a csövet (a -0.6 miatt tűnt el korábban)
            sprintRotY = 0.6;   // Jól befordítja keresztbe a mellkasa elé
            sprintRotZ = 0.3;   // Enyhén megdönti az oldalára (mint a profi katonák)
            sprintPosY = -0.05; // Csak egy hajszálnyit engedi lejjebb, hogy végig a képernyőn maradjon!
        }

// 4. ALKALMAZÁK (Az Alapértékekhez adjuk a Sway, a Bob, a Fal-ütközés ÉS a Sprint értékeket)
        currentWeaponMesh.rotation.x = THREE.MathUtils.lerp(currentWeaponMesh.rotation.x, wData.baseRot.x - swayX + wallPullbackRotX + sprintRotX, delta * 10);
        currentWeaponMesh.rotation.y = THREE.MathUtils.lerp(currentWeaponMesh.rotation.y, wData.baseRot.y - swayY + sprintRotY, delta * 10);
        // Hozzáadtuk a Z forgatást is a sprint miatt!
        currentWeaponMesh.rotation.z = THREE.MathUtils.lerp(currentWeaponMesh.rotation.z, wData.baseRot.z + sprintRotZ, delta * 10);
        
        currentWeaponMesh.position.x = THREE.MathUtils.lerp(currentWeaponMesh.position.x, wData.basePos.x + weaponBobX, delta * 10);
        currentWeaponMesh.position.z = THREE.MathUtils.lerp(currentWeaponMesh.position.z, wData.basePos.z + wallPullbackZ, delta * 10);
        currentWeaponMesh.position.y = THREE.MathUtils.lerp(currentWeaponMesh.position.y, wData.basePos.y - weaponBobY + sprintPosY, delta * 10);
    }

// --- FAGYASZTÁS COOLDOWN ÉS TEREM EFFEKTEK ---
    if (activeFreezeTimer > 0) {
        let prevTimer = activeFreezeTimer; // Eltároljuk, hogy tudjuk, most járt-e le
        activeFreezeTimer -= delta;
        
        // EBBEN A PILLANATBAN JÁRT LE A FAGYASZTÁS!
        if (activeFreezeTimer <= 0 && prevTimer > 0) {
            
            // 1. Képernyő jég levétele
            const iceOverlay = document.getElementById('ice-overlay');
            if(iceOverlay) iceOverlay.style.opacity = 0;
            
            // 2. Hangok kikapcsolása! (A Three.js Audio stop parancsa)
            if (sounds['cryoGas'] && sounds['cryoGas'].isPlaying) sounds['cryoGas'].stop();
            if (sounds['iceCrack'] && sounds['iceCrack'].isPlaying) sounds['iceCrack'].stop();
            
            // 3. Füst és Köd színek visszaállítása alaphelyzetbe
            if (typeof fogMat !== 'undefined') fogMat.color.setHex(0xffffff); // Vissza az alap fehér/zöld színezésre
            if (typeof updateToxicFog === 'function') updateToxicFog(); // A te saját függvényed helyreteszi a sűrűséget és a színt!
        }
    }

    if (freezeCooldown > 0) {
        freezeCooldown -= delta;
        const fBtn = document.getElementById('freeze-btn');
        if (fBtn && activeFreezeTimer <= 0) {
            fBtn.innerText = freezeCooldown > 0 ? `⏳ ${Math.ceil(freezeCooldown)}s` : `❄️ CRYO-PURGE`;
            if (freezeCooldown <= 0) fBtn.disabled = false;
        }
    }
    
    // --- Sérthetetlenség (Revive után) ---
    if (invincibilityTimer > 0) invincibilityTimer -= delta;


    // ==========================================
    // --- ÚJ: SZEIZMIKUS REZONÁTOR TELEPÍTÉSE (3 SEC) ---
    // ==========================================
    if (typeof isDeploying !== 'undefined' && isDeploying) {
        window.deployTimer += delta;
        
        // --- JAVÍTÁS: Szekvenciális (Egymásra épülő) animáció ---
        // A kamera CSAK a 0.5. másodperc után kezd rásiklani a gépre! 
        // Így az első fél másodpercben csak leguggolsz és magad elé rakod.
        if (window.deployMesh && window.deployTimer > 0.5) {
            let deployPos = window.deployMesh.position.clone();
            deployPos.y += 0.2; // Kicsit a gép fölé nézünk
            
            let targetMatrix = new THREE.Matrix4().lookAt(camera.position, deployPos, new THREE.Vector3(0, 1, 0));
            let targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMatrix);
            
            // Finoman, automatikusan rásiklik a kamerával az eszközre (Picit lassítva, hogy kényelmes legyen)
            camera.quaternion.slerp(targetQuat, delta * 4.0);
            
            // Szinkronizáljuk az egeret, hogy ne ugorjon vissza a végén
            let euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
            yaw = euler.y;
            pitch = euler.x;
        }
        
        if (window.deployMixer) window.deployMixer.update(delta);

        const deployBar = document.getElementById('deploy-progress-bar');
        if (deployBar) deployBar.style.width = Math.min(100, (window.deployTimer / 3.0) * 100) + '%';
        
        // --- JAVÍTÁS: Kinyílás ÉS Élesítő hang (2.5 másodpercnél egy időben!) ---
        if (window.deployTimer >= 2.5 && !window.resonatorOpened) {
            window.resonatorOpened = true;
            
            playSound('resonatorPowerOn'); // A csipogás a nyitással egyszerre indul!
            
            if (window.deployMixer && resonatorAnimations && resonatorAnimations.length > 0) {
                let action = window.deployMixer.clipAction(resonatorAnimations[0]);
                action.setLoop(THREE.LoopOnce); 
                action.clampWhenFinished = true; 
                action.play();
            }
        }
        
        // HA LETELT A 3 MÁSODPERC -> Fény és Fő hang bekapcsolása
        if (window.deployTimer >= 3.0) {
            window.isDeploying = false;
            playerResonators--;
            if (typeof updateUI === 'function') updateUI();
            
            const deployUI = document.getElementById('deploy-progress-container');
            if (deployUI) deployUI.classList.add('hidden');
            
            isWeaponBusy = false;
            equipWeapon(currentWeaponId); 
            
            if (window.deployMesh) {
                let resLight = new THREE.PointLight(0x00ff00, 2.0, 15); 
                resLight.position.set(window.deployMesh.position.x, 0.5, window.deployMesh.position.z);
                scene.add(resLight);
                
                let resSound = new THREE.Audio(listener);
                if (sounds['resonatorAudio'] && sounds['resonatorAudio'].buffer) {
                    resSound.setBuffer(sounds['resonatorAudio'].buffer);
                    resSound.setVolume(sounds['resonatorAudio'].baseVolume || 1.0);
                    resSound.play();
                }
                
                if (typeof activeResonators === 'undefined') window.activeResonators = [];
                activeResonators.push({
                    mesh: window.deployMesh,
                    mixer: window.deployMixer,
                    light: resLight,
                    sound: resSound, 
                    state: 'lure',   
                    timer: 10.0,     
                    blastTimer: 5.0, 
                    pulseTimer: 0    
                });
            }
        }
    }

    // --- Zombik AI ---
    for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i]; 
        
        en.lifeTime -= delta;
        if (en.lifeTime <= 0) {
            // Letelt az idő, a szörny elmenekült! Töröljük nyom nélkül.
                        scene.remove(en.mesh); 
            scene.remove(en.bodyHitbox); // ÚJ SOR
            scene.remove(en.headHitbox); // ÚJ SOR 
            let bIdx = enemyHitboxes.indexOf(en.bodyHitbox);
            if (bIdx > -1) enemyHitboxes.splice(bIdx, 1); 
            let hIdx = enemyHitboxes.indexOf(en.headHitbox);
            if (hIdx > -1) enemyHitboxes.splice(hIdx, 1);
            if (en.blip && en.blip.parentNode) en.blip.parentNode.removeChild(en.blip);
            
            enemies.splice(i, 1);
            i--; // Visszaléptetjük az indexet, mivel töröltünk egyet a tömbből
            continue; 
        }

        // ==========================================
        // ANIMÁCIÓK FRISSÍTÉSE ÉS SEBESSÉG SZINKRONIZÁLÁSA
        // ==========================================
        if (typeof en.stunTimer === 'undefined') en.stunTimer = 0;
        
        if (activeFreezeTimer > 0) {
            // Fagyasztva: Az animáció teljesen megáll
            if (en.mixer) en.mixer.timeScale = 0; 
            continue; 
        } 
        // --- ÚJ: HA MEGÜTÖTTÉK ÉS SZÉDÜL ---
        else if (en.stunTimer > 0) {
            en.stunTimer -= delta;
            if (en.mixer) {
                en.mixer.timeScale = 0.1; 
                en.mixer.update(delta);
            }
            continue; 
        }
        else {
            // --- JAVÍTÁS: Ha nincs szédülve (kijött a viharból vagy vége a viharnak), elhallgat! ---
            if (en.screamAudio && en.screamAudio.isPlaying) en.screamAudio.stop();

            // ALAP ESET: A zombi mozog, az animáció fut
            if (en.mixer) { 
                let speedMultiplier = 1.0 + Math.min(((currentWave - 1) * 0.035), 0.35);
                
                // --- EGYEDI ANIMÁCIÓS SEBESSÉGEK TÍPUSONKÉNT ---
                if (en.type === 'crawler') {
                    // A kapálózó kis szörny maradhat a dupla sebességen
                    en.mixer.timeScale = 2.0 * speedMultiplier; 
                    
                } else if (en.type === 'normal') {
                    // VERDANT HOST (Sima zombi):
                    // Kérted, hogy a végén gyorsabb legyen az animációja.
                    // Adunk neki egy fix +20% (1.2) bázis gyorsítást, hogy lendületesebb legyen.
                    en.mixer.timeScale = 1.2 * speedMultiplier; 
                    
                } else if (en.type === 'boss') {
                    // NEXUS-NODE (Boss):
                    // Kérted, hogy lassabb, nehézkesebb legyen az animációja a végén is.
                    // Leosztjuk a sebességét, hogy nagy, lomha hústoronynak tűnjön (-30% lassítás)
                    en.mixer.timeScale = 0.7 * speedMultiplier; 
                    
                } else {
                    // MINDEN MÁS (Runner, Tank, Stalker):
                    // Ők maradnak a sztenderd sebességnél, ha azokat jónak láttad!
                    en.mixer.timeScale = 1.0 * speedMultiplier; 
                }
                
                en.mixer.update(delta); 
            }
        }

      // --- PROFESSZIONÁLIS CSONT KÖVETÉS (IRÁNYÉK-KORREKCIÓVAL!) ---
        let bonePos = new THREE.Vector3();
        let tempOffset = new THREE.Vector3(); // Ezt a segédvektort fogjuk elforgatni!

        // 1. TEST követése
        if (en.spineBone) {
            en.spineBone.getWorldPosition(bonePos);
            // Kiszámoljuk az eltolást a zombi SAJÁT forgása alapján!
            tempOffset.set(en.bx, 0, en.bz).applyQuaternion(en.mesh.quaternion);

            en.bodyHitbox.position.x = bonePos.x + tempOffset.x;
            en.bodyHitbox.position.y = bonePos.y + en.bodyOffsetY;
            en.bodyHitbox.position.z = bonePos.z + tempOffset.z;
        } else {
            tempOffset.set(en.bx, 0, en.bz).applyQuaternion(en.mesh.quaternion);
            en.bodyHitbox.position.x = en.mesh.position.x + tempOffset.x;
            en.bodyHitbox.position.y = en.bodyOffsetY;
            en.bodyHitbox.position.z = en.mesh.position.z + tempOffset.z;
        }

        // 2. FEJ követése
        if (en.headBone) {
            en.headBone.getWorldPosition(bonePos);
            tempOffset.set(en.hx, 0, en.hz).applyQuaternion(en.mesh.quaternion);

            en.headHitbox.position.x = bonePos.x + tempOffset.x;
            en.headHitbox.position.y = bonePos.y + en.headOffsetY;
            en.headHitbox.position.z = bonePos.z + tempOffset.z;
        } else {
            tempOffset.set(en.hx, 0, en.hz).applyQuaternion(en.mesh.quaternion);
            en.headHitbox.position.x = en.mesh.position.x + tempOffset.x;
            en.headHitbox.position.y = en.headOffsetY;
            en.headHitbox.position.z = en.mesh.position.z + tempOffset.z;
        }
        // --------------------------------------------------------
 

        const distToPlayer = Math.hypot(savedCamX - en.mesh.position.x, camera.position.z - en.mesh.position.z);
 
       // --- ÚJ: MENEKÜLŐ (CRAWLER) LOGIKA (PATTOGÓ/KAOTIKUS) ---
        if (en.type === 'crawler') {
         
            
            // Ha még nincs saját iránya (velocity), adunk neki egy random irányt
            if (!en.velocity) {
                let angle = Math.random() * Math.PI * 2;
                en.velocity = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            }

            // Kiszámítjuk, hova lépne
            let mX = en.velocity.x * en.speed;
            let mZ = en.velocity.z * en.speed;

            // FONTOS: Visszapattanás a falakról (Biliárd logika)
            let hitWallX = checkWallCollision(en.mesh.position.x + mX, en.mesh.position.z, enemyRadius);
            let hitWallZ = checkWallCollision(en.mesh.position.x, en.mesh.position.z + mZ, enemyRadius);

            if (hitWallX) {
                en.velocity.x *= -1; // Visszapattan X tengelyen
                mX = en.velocity.x * en.speed;
            }
            if (hitWallZ) {
                en.velocity.z *= -1; // Visszapattan Z tengelyen
                mZ = en.velocity.z * en.speed;
            }

            // A játékos is elijeszti (Ha túl közel mész, megváltoztatja az irányát)
            if (distToPlayer < 8.0) {
                // Menekülés a játékos elől, de lágyan belekeverve a jelenlegi irányába
                let flee = new THREE.Vector3().subVectors(en.mesh.position, new THREE.Vector3(savedCamX, 0, camera.position.z)).normalize();
                en.velocity.lerp(flee, 0.05).normalize(); 
            }

            // Mozgás alkalmazása
            en.mesh.position.x += mX;
            en.mesh.position.z += mZ;

            // A fej forgatása a mozgás irányába (hogy ne oldalazva fusson)
            en.mesh.lookAt(en.mesh.position.x + en.velocity.x, 0, en.mesh.position.z + en.velocity.z);

            // Radar frissítése kékkel
            if (en.blip) {
                const localPos = en.mesh.position.clone(); camera.worldToLocal(localPos);
                en.blip.style.left = (50 + localPos.x * 1.2) + '%'; en.blip.style.top = (50 + localPos.z * 1.2) + '%';
                en.blip.style.backgroundColor = '#00ffff'; 
                en.blip.style.boxShadow = '0 0 8px #00ffff'; // Kicsit világítson a radaron
                en.blip.classList.add('visible');
            }
            continue; // Kihagyja a normál zombi támadást
        }
       
// 1. Egyedi támadási távolság (Lejjebb vettük, hogy ne sebezzenek méterekről!)
        let attackRange = (en.type === 'boss') ? 8.0 : (en.type === 'tank' ? 3.5 : 2.0);
        
        // Ha nem létezik a pihenő időzítő, hozzuk létre
        if (typeof en.attackRestTimer === 'undefined') en.attackRestTimer = 0;
        
        // Pihenés csökkentése (ha épp pihen)
        if (en.attackRestTimer > 0) {
            en.attackRestTimer -= delta;
        }

        // Ha a boss épp ordít, az időzítő csökken
        if (en.roarTimer > 0) {
            en.roarTimer -= delta;
            
            if (en.type === 'boss') {
                if (typeof en.waveCooldown === 'undefined') en.waveCooldown = 0;
                en.waveCooldown -= delta;
                
                // Látvány: Füstpamacsok kilövése
                if (en.waveCooldown <= 0) {
                    spawnBossShockwave(en.mesh);
                    en.waveCooldown = 0.15; 
                }

                // ==========================================
                // ÚJ: BOSS FOLYAMATOS TÖLCSÉR SEBZÉSE
                // ==========================================
                let currentDist = Math.hypot(savedCamX - en.mesh.position.x, camera.position.z - en.mesh.position.z);
                
                // 8.0 a Boss lőtávja. Ha benne vagy a hatósugárban:
                if (currentDist <= 8.0 && invincibilityTimer <= 0) {
                    let bossForward = new THREE.Vector3(0, 0, 1).applyQuaternion(en.mesh.quaternion).normalize();
                    let dirToPlayer = new THREE.Vector3().subVectors(camera.position, en.mesh.position).normalize();
                    dirToPlayer.y = 0; bossForward.y = 0; bossForward.normalize();
                    
                    // Ha a tölcséren (60 fok) belül vagy
                    if (bossForward.dot(dirToPlayer) >= 0.85) {
                        
                        if (typeof en.bossDamageTick === 'undefined') en.bossDamageTick = 0;
                        en.bossDamageTick -= delta;
                        
                        // 0.2 másodpercenként kapod a sebzést (Folyamatos HP olvadás)
                        if (en.bossDamageTick <= 0) {
                            en.bossDamageTick = 0.2;
                            
                            const stats = difficultySettings[currentDifficulty];
                            // Mivel sűrűn sebez (másodpercenként 5x), a szorzó kisebb (8 a Tank 50-éhez képest), 
                            // hogy ne insta-kill legyen, de gyorsan leolvassza a HP-t.
                            let rawDamage = stats.damage * en.damageMult * 8; 
                            
                            // Páncél és Élet levonása
                            if (playerArmor > 0) {
                                if (playerArmor >= rawDamage) { playerArmor -= rawDamage; rawDamage = 0; } 
                                else { rawDamage -= playerArmor; playerArmor = 0; }
                            }
                            if (rawDamage > 0 && !isGodMode) playerHealth -= rawDamage;

                            checkDirective('take_damage', en.type);
                            if (typeof updateUI === 'function') updateUI(); 

                              // --- JAVÍTÁS: Itt a Játékos vérzik, tehát PIROS vért kérünk! (true) ---
                            if (typeof splashVisorBlood === 'function') splashVisorBlood(true);
    
                              const screenBlood = document.getElementById('screen-blood');
                              if (screenBlood) screenBlood.style.opacity = 1.0;
                            
                              cameraShake = 0.3; // Kisebb, de folyamatos rázkódás a gáztól
                            
                            // Glitch effekt a gáztól
                            const glitchOverlay = document.getElementById('glitch-overlay');
                            if (glitchOverlay) {
                                glitchOverlay.classList.remove('hidden');
                                glitchOverlay.classList.add('glitch-active');
                                setTimeout(() => { glitchOverlay.classList.remove('glitch-active'); glitchOverlay.classList.add('hidden'); }, 150);
                            }

                            // HALÁL ELLENŐRZÉSE
                            if (playerHealth <= 0) {
                                if (skills.revive.level > 0 && gameState === 'PLAYING') {
                                    skills.revive.level--;
                                    playerHealth = 100 + (skills.maxHealth.level * 20); 
                                    invincibilityTimer = 2.0; 
                                    playerInfection = Math.max(0, playerInfection - 40); 
                                    druggedTimer = 0; 
                                    document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                                    playSound('defibrillator');
                                    const healFlash = document.getElementById('heal-flash');
                                    if (healFlash) { healFlash.style.opacity = 1; setTimeout(() => healFlash.style.opacity = 0, 500); }
                                    if (typeof updateShopButtons === 'function') updateShopButtons(); 
                                } else {
                                    playSound('deathScream');
                                    gameState = 'GAMEOVER'; 
                                    document.exitPointerLock(); 
                                    document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                                    playerInfection = 0; 
                                    if (typeof sounds !== 'undefined' && sounds['whispers'] && sounds['whispers'].isPlaying) sounds['whispers'].stop();
                                    document.getElementById('final-score').innerText = `ADAT: ${score} CR`; 
                                    document.getElementById('final-wave').innerText = `TÚLÉLT ITERÁCIÓ: ${currentWave}`; 
                                    if (typeof localStorage !== 'undefined') localStorage.removeItem('OmniCorpStats');
                                    document.getElementById('game-over').classList.remove('hidden');
                                }
                            }
                        }
                    }
                }
            }
            if (en.roarTimer <= 0) en.attackRestTimer = 1.0; 
        }

        // ==========================================
        // IDŐZÍTETT TÁMADÁS (TANK ÉS SIMA ZOMBIK)
        // ==========================================
        
        // A) HA ÉPPEN FOLYAMATBAN VAN EGY TÁMADÓ MOZDULAT
        if (en.isAttacking) {
            en.attackAnimTimer -= delta;

            // BECSAPÓDÁS PILLANATA: Amikor az animáció lecsapó fázisához ér
            if (en.attackAnimTimer <= en.hitFrameTime && !en.hasDealtDamage) {
                en.hasDealtDamage = true;

                // TÁVOLSÁG ÚJRA-ELLENŐRZÉSE
                let currentDist = Math.hypot(savedCamX - en.mesh.position.x, camera.position.z - en.mesh.position.z);
                
                // --- ÚJ: TÁMADÁS HANGJA A BECSAPÓDÁS PILLANATÁBAN (TÁVOLSÁGGAL!) ---
                // Még akkor is hallod a suhintást/ütést, ha elhajoltál!
                if (en.type === 'normal') playSound('hostAttack', 0, 0, currentDist);
                else if (en.type === 'runner') playSound('runnerAttack', 0, 0, currentDist);
                else if (en.type === 'tank') playSound('tankAttack', 0, 0, currentDist);
                else if (en.type === 'hider') playSound('hiderAttack', 0, 0, currentDist);

                // FONTOS: A Boss sebzését feljebb intéztük a roarTimer-ben, itt csak a többiek ütnek!
                if (en.type !== 'boss') {
                    
                    // Ha nem hajoltál el, és a lőtávon belül vagy:
                    if (currentDist <= attackRange && invincibilityTimer <= 0) {
                        
                        let isInCone = true; 
                        
                        // TÖLCSÉR (CONE) ELLENŐRZÉS A TANK SZÁMÁRA
                        if (en.type === 'tank') {
                            let enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(en.mesh.quaternion).normalize();
                            let dirToPlayer = new THREE.Vector3().subVectors(camera.position, en.mesh.position).normalize();
                            dirToPlayer.y = 0; enemyForward.y = 0; enemyForward.normalize();
                            
                            // Tank tölcsére 120 fok (0.5)
                            if (enemyForward.dot(dirToPlayer) < 0.5) {
                                isInCone = false;
                            }
                        }

                        if (isInCone) {
                            if (damageCooldown <= 0) { 
                                damageCooldown = 0.3; // 0.3 másodperc a kombó ütések miatt
                                cameraShake = (en.type === 'tank') ? 0.6 : 0.4; 
                                playSound('hurt'); 
                            } 

                            // --- KAMERA ELMOZDULÁS (KOPONYA-TRAUMA) A JUGGERNAUT ÜTÉSEINÉL ---
                            const stats = difficultySettings[currentDifficulty];
                            let baseDamageMultiplier = 50; 
                            let rawDamage = stats.damage * en.damageMult * baseDamageMultiplier; 

                            if (en.type === 'tank') {
                                if (en.comboStep === 0) {
                                    yaw -= 0.15; pitch += 0.05; 
                                } else if (en.comboStep === 1) {
                                    yaw += 0.15; pitch += 0.05; 
                                } else if (en.comboStep === 2) {
                                    rawDamage *= 1.5;  
                                    pitch -= 0.3;      
                                    cameraShake = 1.0; 
                                    druggedTimer = Math.max(druggedTimer, 1.5); 
                                    document.body.classList.add('drugged');
                                }
                            }

                            // Páncél és Élet levonása
                            if (playerArmor > 0) {
                                if (playerArmor >= rawDamage) { playerArmor -= rawDamage; rawDamage = 0; } 
                                else { rawDamage -= playerArmor; playerArmor = 0; }
                            }
                            if (rawDamage > 0 && !isGodMode) playerHealth -= rawDamage;

                            checkDirective('take_damage', en.type);
                            if (typeof updateUI === 'function') updateUI(); 

                             // --- JAVÍTÁS: Itt a Játékos vérzik, tehát PIROS vért kérünk! (true) ---
                             if (typeof splashVisorBlood === 'function') splashVisorBlood(true);
    
                             const screenBlood = document.getElementById('screen-blood');
                              if (screenBlood) screenBlood.style.opacity = 1.0;
   
    

                            // HALÁL ELLENŐRZÉSE
                            if (playerHealth <= 0) {
                                if (skills.revive.level > 0 && gameState === 'PLAYING') {
                                    skills.revive.level--;
                                    playerHealth = 100 + (skills.maxHealth.level * 20); 
                                    invincibilityTimer = 2.0; 
                                    playerInfection = Math.max(0, playerInfection - 40); 
                                    druggedTimer = 0; 
                                    document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                                    playSound('defibrillator');
                                    const healFlash = document.getElementById('heal-flash');
                                    if (healFlash) { healFlash.style.opacity = 1; setTimeout(() => healFlash.style.opacity = 0, 500); }
                                    if (typeof updateShopButtons === 'function') updateShopButtons(); 
                                } else {
                                    playSound('deathScream');
                                    gameState = 'GAMEOVER'; 
                                    document.exitPointerLock(); 
                                    document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                                    playerInfection = 0; 
                                    if (typeof sounds !== 'undefined' && sounds['whispers'] && sounds['whispers'].isPlaying) sounds['whispers'].stop();
                                    document.getElementById('final-score').innerText = `ADAT: ${score} CR`; 
                                    document.getElementById('final-wave').innerText = `TÚLÉLT ITERÁCIÓ: ${currentWave}`; 
                                    if (typeof localStorage !== 'undefined') localStorage.removeItem('OmniCorpStats');
                                    document.getElementById('game-over').classList.remove('hidden');
                                }
                            }
                        }
                    } else {
                        // SIKERES ELHAJOLÁS! Kiléptél a távolságból, amíg lendítette a kezét.
                        if (en.type === 'tank') playSound('knifeHit', 0.0); // Levegőt hasító hang, jelezve hogy melléd ütött
                    }
                } // <--- IDE ZÁR BE AZ "if (en.type !== 'boss')" !
            }

            // HA VÉGET ÉRT AZ ÜTÉS ANIMÁCIÓ (Jöhet a kombó kövi része)
            if (en.attackAnimTimer <= 0) {
                en.isAttacking = false;
                
                if (en.type === 'tank' && en.comboActions && en.comboActions.length > 0) {
                    en.comboStep++; // Lépés a következő kombó animációra
                    
                    if (en.comboStep >= en.comboActions.length) {
                        en.comboStep = 0; // Vége a kombónak
                        en.attackRestTimer = 1.5; // Kifáradt, hosszú pihenő
                    } else {
                        en.attackRestTimer = 0.2; // Rövid szünet (0.2mp) két ütés között!
                    }
                } else {
                    en.attackRestTimer = 1.0; // Többiek alap pihenője a suhintás után
                }
            }
        }
        
        // B) HA NEM TÁMAD ÉPPEN, DE BEÉRTÉL A TÁVOLSÁGBA (Támadás Indítása)
        else if (distToPlayer <= attackRange && en.attackRestTimer <= 0 && invincibilityTimer <= 0 && (!en.roarTimer || en.roarTimer <= 0)) {
            
            if (en.type === 'boss') {
                en.roarTimer = 3.8; en.waveCooldown = 0; 
                en.mesh.lookAt(savedCamX, 0, camera.position.z);
                if (!sounds['bossAttack'] || !sounds['bossAttack'].isPlaying) playSound('bossAttack'); 
            }

            // Állapot beállítása
            en.isAttacking = true;
            en.hasDealtDamage = false;

            let animToPlay = en.attackAction;
            let animDuration = 1.0;

            // --- JUGGERNAUT KOMBÓ KIVÁLASZTÁSA ---
            if (en.type === 'tank' && en.comboActions && en.comboActions.length > 0) {
                animToPlay = en.comboActions[en.comboStep];
            }

            // Időzítők beállítása a kiválasztott animáció hossza alapján
            if (animToPlay && animToPlay._clip) {
                animDuration = animToPlay._clip.duration;
            }
            en.attackAnimTimer = animDuration;
            
            // HIT FRAME: A sebzés az animáció 50%-ánál történik (amikor a pörölyként lecsapó kéz leér)
            en.hitFrameTime = animDuration * 0.5; 

// ANIMÁCIÓ LEJÁTSZÁSA
            if (animToPlay && en.currentAction !== animToPlay) {
                en.runAction.fadeOut(0.2);
                if (en.type === 'tank' && en.comboActions) en.comboActions.forEach(a => a.stop());
                
                animToPlay.reset().fadeIn(0.2).play();
                en.currentAction = animToPlay;
                
            }

            // --- ÚJ: TÁMADÁS HANGJAI (Lecsapáskor) ---
                if (en.type === 'normal') playSound('hostAttack');
                else if (en.type === 'runner') playSound('runnerAttack');
                else if (en.type === 'tank') playSound('tankAttack');
                else if (en.type === 'hider') playSound('hiderAttack');
                // A Boss itt nem kap hangot, mert ő már a RoarTimer-nél ordít!

        } 
        
        // C) MOZGÁS ÉS AI KÖVETÉS
        else {
            
            // Ha a Juggernaut elkezdett egy kombót, de te elszaladtál messzire, felejtse el!
            if (en.type === 'tank' && distToPlayer > attackRange * 1.5) {
                en.comboStep = 0; 
            }

            if (en.type === 'boss' && en.roarTimer > 0) {
                // A Boss itt nem csinál semmit, mert épp ordít
            } else {
                

                
           // ==========================================
                // ÚJ AI LOGIKA: MENEKÜLÉS VAGY OKOS TÁMADÁS
                // ==========================================
let targetPos = new THREE.Vector3(savedCamX, 0, camera.position.z);
                let enemyDir = new THREE.Vector3();
                
                let isLured = false;
                let activeLureDist = Infinity;
                let luredResonator = null;

                // --- ÚJ: CSALÉTEK (REZONÁTOR) KERESÉSE (Max 25m) ---
                if (typeof activeResonators !== 'undefined') {
                    for (let r of activeResonators) {
                        if (r.state === 'lure') {
                            let d = Math.hypot(en.mesh.position.x - r.mesh.position.x, en.mesh.position.z - r.mesh.position.z);
                            if (d < 25.0 && d < activeLureDist) {
                                activeLureDist = d;
                                targetPos.copy(r.mesh.position);
                                isLured = true;
                                luredResonator = r;
                            }
                        }
                    }
                }

               // --- JAVÍTOTT: HA ODAÉRT A GÉPHEZ (Csalétek) ---
                if (isLured) {
                    
                    // 1. A BOSS VÁLASZA (Távolságból, üvöltéssel támadja meg a gépet!)
                    if (en.type === 'boss') {
                        if (activeLureDist <= 8.0) {
                            en.mesh.lookAt(targetPos.x, 0, targetPos.z); // Ránéz a gépre
                            
                            // Ha tud támadni, felüvölt és elpusztítja!
                            if (!en.roarTimer || en.roarTimer <= 0) {
                                en.roarTimer = 3.8;
                                en.waveCooldown = 0;
                                playSound('bossAttack');
                                
                                // --- JAVÍTÁS: BOSS ANIMÁCIÓJÁNAK LEJÁTSZÁSA ---
                                if (en.attackAction && en.currentAction !== en.attackAction) {
                                    en.runAction.fadeOut(0.2);
                                    en.attackAction.reset().fadeIn(0.2).play();
                                    en.currentAction = en.attackAction;
                                }
                                
                                // Gép megsemmisítése
                                scene.remove(luredResonator.mesh);
                                if (luredResonator.light) scene.remove(luredResonator.light);
                                
                                // HANG AZONNALI ELNÉMÍTÁSA
                                if (luredResonator.sound && luredResonator.sound.isPlaying) {
                                    luredResonator.sound.stop();
                                }
                                
                                let rIdx = activeResonators.indexOf(luredResonator);
                                if (rIdx > -1) activeResonators.splice(rIdx, 1);
                                playSound('error'); // Recsegés hang, ahogy szétzúzza
                            }
                            continue; // Nem mozog tovább, amíg a gép hatósugarában van
                        }
                        // Ha messzebb van, mint 8 méter, akkor tovább sétál felé
                    }
                    // 2. A SIMA ZOMBIK VÁLASZA (Közel mennek és bambán ütik)
                    else {
                        if (activeLureDist <= 1.5) {
                            if (en.attackAction && en.currentAction !== en.attackAction) {
                                en.runAction.fadeOut(0.2);
                                en.attackAction.reset().fadeIn(0.2).play();
                                en.currentAction = en.attackAction;
                            }
                            en.mesh.lookAt(targetPos.x, 0, targetPos.z);
                            continue; // Nem mozog tovább
                        }
                    }
                }
                
                // Alap viselkedés (Ha nincs csalétek, vagy újjáéledtél)
                if (invincibilityTimer > 0 && !isLured) {
                    // --- 1. MENEKÜLÉS (Ha a játékos épp újjáéledt) ---
                    enemyDir.subVectors(en.mesh.position, targetPos).normalize();
                    let targetAngle = Math.atan2(enemyDir.x, enemyDir.z); 
                    let targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
                    en.mesh.quaternion.slerp(targetQuat, delta * 5.0); 
                    
                } else {
                    // --- 2. OKOS TÁMADÁS (Navigációval) ---
                    
                    // Létrehozzuk a zombi saját "gondolkodás" időzítőjét, ha még nincs
                    if (typeof en.aiThinkTimer === 'undefined') en.aiThinkTimer = 0;
                    en.aiThinkTimer -= delta; // Visszaszámlálás

                    // Csak fél másodpercenként kérdezünk rá az útvonalra (CPU kímélés)
                    if (en.aiThinkTimer <= 0) {
                        // Kikérjük a legjobb irányt a külső fájlból!
                        if (typeof AINavigation !== 'undefined') {
                            en.lastCalculatedDir = AINavigation.getBestDirection(en, targetPos);
                        } else {
                            // Biztonsági tartalék, ha a külső fájl nem töltött be
                            en.lastCalculatedDir = new THREE.Vector3().subVectors(targetPos, en.mesh.position).normalize();
                        }
                        en.aiThinkTimer = 0.5; // 500ms pihenő a következő gondolkodásig
                    }
                    
                    // Biztonsági fék: ha valamiért üres lenne az irány
                    if (!en.lastCalculatedDir || en.lastCalculatedDir.length() === 0) {
                        en.lastCalculatedDir = new THREE.Vector3().subVectors(targetPos, en.mesh.position).normalize();
                    }

                    // A zombi felveszi a kiszámolt irányt
                    enemyDir.copy(en.lastCalculatedDir);
                    
                    // BIZTONSÁGOS FORDULÁS (Csak az Y-tengely, azaz a gerince körül)
                    let targetAngle = Math.atan2(enemyDir.x, enemyDir.z); 
                    let targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
                    
                    // Lágy, "filmes" befordulás a cél felé
                    en.mesh.quaternion.slerp(targetQuat, delta * 5.0); 
                }
                
                // Garantáljuk, hogy a zombi ne akarjon felrepülni vagy a földbe süllyedni
                enemyDir.y = 0; 
                if (enemyDir.lengthSq() > 0) enemyDir.normalize();

// --- 3. FUTÁS ANIMÁCIÓ VISSZAKAPCSOLÁSA ---
                if (en.currentAction !== en.runAction) {
                    if (en.type === 'tank' && en.comboActions) en.comboActions.forEach(a => a.fadeOut(0.2));
                    else if (en.attackAction) en.attackAction.fadeOut(0.2);
                    
                    en.runAction.reset().fadeIn(0.2).play();
                    en.currentAction = en.runAction;
                }
                
                // --- 4. SZEPARÁCIÓ (Egymás eltolása) ---
                // Megakadályozza, hogy a zombik egyetlen modellbe olvadjanak össze
                let sep = new THREE.Vector3();
                for (let j = 0; j < enemies.length; j++) {
                    if (i !== j) {
                        let d = Math.hypot(en.mesh.position.x - enemies[j].mesh.position.x, en.mesh.position.z - enemies[j].mesh.position.z);
                        if (d < enemyRadius * 1.5 && d > 0.01) {
                            sep.add(new THREE.Vector3().subVectors(en.mesh.position, enemies[j].mesh.position).normalize().multiplyScalar((enemyRadius * 1.5 - d) * 0.05));
                        }
                    }
                }
                
                // --- 5. TÉNYLEGES MOZGÁS A TÉRBEN ---
                // Összeadjuk a haladási irányt és a taszítást
                let mX = (enemyDir.x * en.speed) + sep.x; 
                let mZ = (enemyDir.z * en.speed) + sep.z;
                
                // Fal-ütközés vizsgálata, mielőtt lépne
                if (!checkWallCollision(en.mesh.position.x + mX, en.mesh.position.z, enemyRadius)) {
                    en.mesh.position.x += mX;
                }
                if (!checkWallCollision(en.mesh.position.x, en.mesh.position.z + mZ, enemyRadius)) {
                    en.mesh.position.z += mZ;
                }
                // ==========================================
            }
        }

        // ==========================================
        // --- JAVÍTOTT: LÉPÉSHANGOK ÉS HÖRGÉSEK (15 MÉTERIG) ---
        // ==========================================
        
        if (activeFreezeTimer <= 0 && en.lifeTime > 0) {
            let distToPlayer = Math.hypot(savedCamX - en.mesh.position.x, camera.position.z - en.mesh.position.z);
            
            // Csak akkor foglalkozunk a hangokkal, ha 15 méteren belül van!
            if (distToPlayer <= 15.0) {
                
                // 1. LÉPÉSHANGOK
                if (typeof en.footstepTimer === 'undefined') en.footstepTimer = 0;
                en.footstepTimer -= delta;
                
                if (en.footstepTimer <= 0) {
                    en.footstepTimer = (en.type === 'runner' || en.type === 'crawler') ? 0.35 : (en.type === 'tank' || en.type === 'boss' ? 0.8 : 0.6);
                    
                    if (en.type === 'normal') playSound('hostStep', 0, 0, distToPlayer);
                    else if (en.type === 'runner') playSound('runnerStep', 0, 0, distToPlayer);
                    else if (en.type === 'tank') playSound('tankStep', 0, 0, distToPlayer);
                    else if (en.type === 'hider') playSound('hiderStep', 0, 0, distToPlayer);
                    else if (en.type === 'crawler') playSound('crawlerStep', 0, 0, distToPlayer);
                    else if (en.type === 'boss') playSound('tankStep', 0, 0, distToPlayer); // A Boss megkapja a döngő lépést
                }

                // 2. HÖRGÉSEK A SÖTÉTBŐL
                if (typeof en.growlTimer === 'undefined') en.growlTimer = Math.random() * 5.0 + 2.0;
                en.growlTimer -= delta;
                
                if (en.growlTimer <= 0) {
                    en.growlTimer = Math.random() * 4.0 + 4.0; 
                    
                    if (en.type === 'normal') playSound('hostGrowl', 0, 0, distToPlayer);
                    else if (en.type === 'runner') playSound('runnerGrowl', 0, 0, distToPlayer);
                    else if (en.type === 'tank') playSound('tankGrowl', 0, 0, distToPlayer);
                    else if (en.type === 'boss') playSound('bossGrowl', 0, 0, distToPlayer);
                }
            }
        }

        if (en.blip) {
            const localPos = en.mesh.position.clone(); camera.worldToLocal(localPos);
            en.blip.style.left = (50 + localPos.x * 1.2) + '%'; en.blip.style.top = (50 + localPos.z * 1.2) + '%';
            
            let targetAngle = Math.atan2(localPos.z, localPos.x); if (targetAngle < 0) targetAngle += Math.PI * 2;
            let diff = Math.abs(targetAngle - displayAngle); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < 0.3) en.blip.classList.add('visible'); else en.blip.classList.remove('visible');
        }
    }

// ==========================================
    // --- JAVÍTOTT: IMMERZÍV LOOTOLÁS LOGIKA (Guggolással) ---
    // ==========================================
    const promptUI = document.getElementById('loot-interaction-prompt');
    const progressUI = document.getElementById('loot-progress-container');
    const progressBar = document.getElementById('loot-progress-bar');

    // 1. Ha ÉPPEN lootolunk (már elkezdtük nyomni a gombot)
    if (isLootingActive && activeLootTarget) {
        
        // Elrejtjük az [E] feliratot, mutatjuk a csíkot
        if (promptUI) promptUI.classList.add('hidden');
        if (progressUI) progressUI.classList.remove('hidden');
        
        // ÚJ: Kamera ráirányítása a táskára (Target Lock)
            let lootPos = activeLootTarget.position.clone();
            // A magasságot egy picit megemeljük, hogy ne a doboz alját nézze
            lootPos.y += 0.2; 

            // Kiszámoljuk a szöget a kamerától a loot felé
            let targetMatrix = new THREE.Matrix4().lookAt(camera.position, lootPos, new THREE.Vector3(0,1,0));
            let targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMatrix);
            
            // Finoman, automatikusan rásiklik a kamerával a táskára!
            camera.quaternion.slerp(targetQuat, delta * 5.0);
            
            // FONTOS: Mivel módosítottuk a kamera quaternion-ját, frissítenünk kell a pitch/yaw értékeket is, 
            // különben ha vége a lootolásnak, "visszaugrik" a régi irányba!
            let euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
            yaw = euler.y;
            pitch = euler.x;

        // Csík töltése
        currentLootProgress += delta * 0.65; 
        if (progressBar) progressBar.style.width = (currentLootProgress * 100) + '%';

        // Ha a játékos felengedi az E gombot, MEGSZAKAD A FOLYAMAT!
if (!isLootingKey) {
            isLootingActive = false;
            activeLootTarget = null;
            currentLootProgress = 0;
            if (progressUI) progressUI.classList.add('hidden');
            if (sounds['looting'] && sounds['looting'].isPlaying) sounds['looting'].stop(); // ÚJ: Leállítjuk a hangot, ha megszakítja!
        }

// HA SIKERESEN KINYITOTTA (Betelt a csík)
        else if (currentLootProgress >= 1.0) {
            
            // --- JAVÍTÁS: Azonnal elnémítjuk a 7 másodperces kutatás hangot! ---
            if (sounds['looting'] && sounds['looting'].isPlaying) {
                sounds['looting'].stop();
            }

            playSound('pickup'); 
            
            if (activeLootTarget.userData.type === 'medkit') {
                if (playerMedkits < maxMedkits) {
                    playerMedkits++;
                    showLootPopup("+1 GEN-STAB BEGYŰJTVE", "#00ff00");
                } else {
                    showLootPopup("INJEKCIÓS REKESZ TELE!", "#ff0000");
                }
            }
            else if (activeLootTarget.userData.type === 'ammo') {
                if (typeof giveGlobalAmmo === 'function') giveGlobalAmmo();
                showLootPopup("+ LŐSZER BEGYŰJTVE", "#ffcc00");
                const ammoFlash = document.getElementById('ammo-flash'); 
                if(ammoFlash) { ammoFlash.style.opacity = 1; setTimeout(() => ammoFlash.style.opacity = 0, 200); }
            }

            // Törlés a pályáról
            scene.remove(activeLootTarget);
            let lIdx = lootItems.indexOf(activeLootTarget);
            if (lIdx > -1) lootItems.splice(lIdx, 1);
            if (typeof updateUI === 'function') updateUI();

            // Visszaállítás alaphelyzetbe
            isLootingActive = false;
            activeLootTarget = null;
            currentLootProgress = 0;
            isLootingKey = false; // Kényszerítjük, hogy újra fel kelljen engednie
            if (progressUI) progressUI.classList.add('hidden');
        }
    } 
    // 2. Ha NEM lootolunk éppen (Keresünk valamit a Raycasterrel)
    else {
        globalRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const lootHits = globalRaycaster.intersectObjects(lootItems, true);

        let hitObject = null;

        if (lootHits.length > 0 && lootHits[0].distance < 3.0) {
            let obj = lootHits[0].object;
            while (obj.parent && !obj.userData.isLoot) obj = obj.parent;
            if (obj.userData.isLoot) hitObject = obj;
        }

        if (hitObject) {
            // Látunk valamit!
            if (promptUI) promptUI.classList.remove('hidden');
            
            // Ha MOST nyomta le az E betűt
            if (isLootingKey) {
                isLootingActive = true;
                activeLootTarget = hitObject; 
                currentLootProgress = 0;
                playSound('looting'); // ÚJ: Táska kutatása hang indul!
            }
        } else {
            // Semmit nem nézünk
            if (promptUI) promptUI.classList.add('hidden');
            if (progressUI) progressUI.classList.add('hidden');
        }
    }

    // Segédfüggvény a popup kiírásához (Ez maradt a régi)
    function showLootPopup(text, color) {
        const popup = document.getElementById('loot-popup');
        if (popup) {
            popup.innerText = text;
            popup.style.color = color;
            popup.style.textShadow = `0 0 10px ${color}`;
            popup.style.transition = "none";
            popup.style.opacity = 1;
            popup.style.top = "60%";
            
            setTimeout(() => {
                popup.style.transition = "opacity 1.5s, top 1.5s ease-out";
                popup.style.opacity = 0;
                popup.style.top = "50%";
            }, 50);
        }
    }
    // ==========================================
    
// ==========================================
    // MUTÁNS NÖVÉNY (CSAPDA) LOGIKA
    // ==========================================
    for (let i = activePlants.length - 1; i >= 0; i--) {
        let plant = activePlants[i];
        if (plant.mixer) plant.mixer.update(delta); // Animáljuk a növényt

// Ha a játékos nagyon közel (1.2 méterre) ér -> PUKKANÁS!
        let distToPlayer = Math.hypot(savedCamX - plant.x, camera.position.z - plant.z);
        if (distToPlayer < 1.2) {
            playSound('burst');
            
          // Növény eltüntetése
            scene.remove(plant.mesh);
            scene.remove(plant.puddle);
            plant.puddle.geometry.dispose();
            activePlants.splice(i, 1);

            // ==========================================
            // --- AZONNALI SEBZÉS (PÁNCÉLLAL VÉDVE) ---
            let explosionDamage = 20;
            if (playerArmor > 0) {
                if (playerArmor >= explosionDamage) {
                    playerArmor -= explosionDamage;
                    explosionDamage = 0;
                } else {
                    explosionDamage -= playerArmor;
                    playerArmor = 0;
                }
            }
            if (explosionDamage > 0 && !isGodMode) playerHealth -= explosionDamage;
            // ==========================================

            // AZONNALI SEBZÉS (-20 HP) ÉS FERTŐZÉS (NEXUS SYNC) NÖVELÉSE
            playerHealth -= 20;
            if (typeof playerInfection !== 'undefined') {
                playerInfection = Math.min(100, playerInfection + 15); // +15% azonnali fertőzés a tüdőbe!
            }
            
            // Lila villanás a képernyőn
            const damageFlash = document.getElementById('damage-flash');
            if (damageFlash) { 
                damageFlash.style.backgroundColor = 'rgba(150, 0, 255, 0.4)'; 
                damageFlash.style.opacity = 1; 
                setTimeout(() => { 
                    damageFlash.style.opacity = 0; 
                    damageFlash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'; // Visszaállítjuk pirosra
                }, 300); 
            }

            // DROG EFFEKT BEKAPCSOLÁSA (5 másodperc)
            druggedTimer = 5.0; 
            document.body.classList.add('drugged'); // Rádobjuk az animációt a teljes játékra!
            
            if (typeof updateUI === 'function') updateUI();
        }
    }

    // --- FOLYAMATOS DROG-SEBZÉS (DoT) ---
    if (druggedTimer > 0) {
        druggedTimer -= delta;
        druggedTickTimer += delta;
        
        // Másodpercenként -2 HP a méregtől
        if (druggedTickTimer >= 1.0) {
            druggedTickTimer = 0;
            if (!isGodMode) playerHealth -= 2;
            playSound('hurt'); 
            if (typeof updateUI === 'function') updateUI();
        }

        // Halál ellenőrzés
        if (playerHealth <= 0 && gameState === 'PLAYING') {
            if (skills.revive.level > 0) {
                skills.revive.level--;
                playerHealth = 100 + (skills.maxHealth.level * 20);
                invincibilityTimer = 2.0;

                // --- ÚJ: FERTŐZÉS KIÉGETÉSE ÉS DROG MEGSZÜNTETÉSE ---
                        playerInfection = Math.max(0, playerInfection - 40); 
                        druggedTimer = 0; 
                        document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                        // ---------------------------------------------------

                playSound('defibrillator');
                if (typeof updateShopButtons === 'function') updateShopButtons();
            } else {
                gameState = 'GAMEOVER'; 
                document.exitPointerLock(); 

            // --- ÚJ TAKARÍTÁS HALÁLKOR ---
                document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                playerInfection = 0; // Nullázzuk a fertőzést
                if (typeof sounds !== 'undefined' && sounds['whispers'] && sounds['whispers'].isPlaying) {
                sounds['whispers'].stop(); // Leállítjuk a suttogást
                }
            // -----------------------------
                document.getElementById('final-score').innerText = `PÉNZ: ${score}`; 
                document.getElementById('final-wave').innerText = `TÚLÉLT HULLÁMOK: ${currentWave}`; 
                document.getElementById('game-over').classList.remove('hidden');
            }
        }

        // Ha lejárt a hatás, kikapcsoljuk a lila szédülést
        if (druggedTimer <= 0) {
 document.body.classList.remove('drugged');
        }
    }

 // ==========================================
    // --- ÚJ: HULLÁK (DEAD BODIES) KEZELÉSE ÉS FAGYASZTÁSA ---
    // ==========================================
    for (let i = deadBodies.length - 1; i >= 0; i--) {
        let corpse = deadBodies[i];
        
        // 1. Amíg nem fagyott meg, lejátszuk az animációt (ha van)
        if (!corpse.frozen) {
            corpse.freezeTimer -= delta;
            
            // Ha még van ideje (mert van animációja), akkor számoljuk
            if (corpse.freezeTimer > 0 && corpse.mixer) {
                corpse.mixer.update(delta);
            }
            

           // Ha letelt az idő, LEFAGYASZTJUK A CSONTVÁZAT
            if (corpse.freezeTimer <= 0) {
                corpse.frozen = true;
                // Csak akkor kapcsoljuk be a láthatóság-kímélést, ha tényleg fekszik a földön!
                // Az álló "bábuknál" kikapcsolva hagyjuk, hogy ne tűnjenek el, ha felnézel.
                if (corpse.hasDeathAnim) {
                    corpse.mesh.traverse((child) => {
                        if (child.isMesh) child.frustumCulled = true;
                    });
                }
            }
        }

        // 2. HA SÜLLYED A PADLÓBA (Hullám végén történik)
        if (corpse.sinking) {
            corpse.mesh.position.y -= delta * 0.8; // Szép lassan besüllyed
            
            // Ha teljesen eltűnt a föld alatt (-2 méter)
            if (corpse.mesh.position.y < -2.0) {
                corpse.mesh.visible = false;
                zombiePool.push(corpse); // ÁTRAKJUK A POOL-ba újrahasznosításra!
                deadBodies.splice(i, 1);
            }
        }
    }
    // ==========================================

    // ==========================================
    // --- ÚJ: VÉR SUGÁR (ARTERIAL SPRAY) RENDSZER ---
    // ==========================================
    if (typeof activeSpurts !== 'undefined') {
        for (let i = activeSpurts.length - 1; i >= 0; i--) {
            let spurt = activeSpurts[i];
            spurt.timer -= delta;
            spurt.dropTimer -= delta;

// Folyadéksugár létrehozása (Sokkal sűrűbben indítjuk, hogy összefolyjon a vonal!)
            while (spurt.dropTimer <= 0) {
                spurt.dropTimer += 0.005; // 0.015 helyett 0.005 -> 3x sűrűbb sugár!
                
                let p = bloodPool.find(part => !part.active);
                if (p) {
                    p.active = true; p.life = 0.6; // Kicsit gyorsabban halványul el a levegőben
                    p.mesh.material.color.setHex(0x55ff55);
                    p.mesh.material.opacity = 1.0;
                    p.mesh.position.copy(spurt.pos);
                    p.mesh.scale.setScalar(0.18); 
                    
                    // Szinte nulla szórás, tökéletesen követik a kiszámolt irányt!
                    p.vx = spurt.dx + (Math.random() - 0.5) * 0.03; 
                    p.vy = spurt.dy + (Math.random() - 0.5) * 0.03;       
                    p.vz = spurt.dz + (Math.random() - 0.5) * 0.03; 
                    p.mesh.visible = true;
                }
            }

            // Ha letelt a vérzés ideje (pl. 0.3 másodperc), lezárjuk a sugarat
            if (spurt.timer <= 0) {
                activeSpurts.splice(i, 1);
            }
        }
    }

// ==========================================
    // --- ÚJ: HANGROBBANÁS GYŰRŰK ANIMÁLÁSA ---
    // ==========================================
    if (typeof window.sonicBooms !== 'undefined') {
        for (let i = window.sonicBooms.length - 1; i >= 0; i--) {
            let boom = window.sonicBooms[i];
            
            if (boom.isGroundWave) {
                // JAVÍTÁS: Lassabb, "hullámzóbb" terjedés (45 helyett 15)
                boom.radius += delta * 15.0; 
                boom.mesh.scale.setScalar(boom.radius);
                
                // Halványulás
                boom.life = 1.0 - (boom.radius / boom.maxRadius);
                boom.mesh.material.opacity = Math.max(0, boom.life * 0.8);
                
                // Ha elérte a 15 métert, töröljük! Tovább nem megy.
                if (boom.radius >= boom.maxRadius || boom.life <= 0) {
                    scene.remove(boom.mesh);
                    boom.mesh.geometry.dispose();
                    boom.mesh.material.dispose();
                    window.sonicBooms.splice(i, 1);
                }
            } else {
                // Eredeti revolvergolyó Mach-gyűrűk (Ezek maradnak, ahogy voltak)
                boom.life -= delta * 4.0; 
                boom.mesh.scale.addScalar(delta * 20.0);
                boom.mesh.material.opacity = Math.max(0, boom.life);

                if (boom.life <= 0) {
                    scene.remove(boom.mesh);
                    boom.mesh.geometry.dispose();
                    boom.mesh.material.dispose();
                    window.sonicBooms.splice(i, 1);
                }
            }
        }
    }

// --- AAA VÉR ÉS POR RÉSZECSKÉK FRISSÍTÉSE ---
    for (let i = 0; i < bloodPool.length; i++) { 
        let p = bloodPool[i];
        if (p.active) {
            p.life -= delta * 1.5; 
            
            // --- JAVÍTÁS: GRAVITÁCIÓ CSAK A VÉRRE, A GŐZRE NEM! ---
            // Megnézzük, hogy az adott részecske épp világít-e (vagyis gőz-e)
            let isSteam = (p.mesh.material.blending === THREE.AdditiveBlending);
            
            if (isSteam) {
                // A gőz lassan tágul (gomolyog), ahogy száll felfelé
                p.mesh.scale.addScalar(delta * 0.4);
            } else {
                // A vérre és a porra hat a gravitáció!
                p.vy -= delta * 0.8; 
            }
            
            p.mesh.position.x += p.vx; 
            p.mesh.position.y += p.vy; 
            p.mesh.position.z += p.vz; 
            
            // Padlóhoz érés (Csak a vérnél és a pornál)
            if (p.mesh.position.y <= 0.05 && !isSteam) {
                p.mesh.position.y = 0.05 + (Math.random() * 0.02); 
                p.vx = 0; p.vy = 0; p.vz = 0; 
                // Amikor földet ér a csepp, vizuálisan "elkenődik", laposabb lesz
                p.mesh.scale.y = p.mesh.scale.x * 0.3; 
            }

            // Lágy elhalványulás (A gőz eleve átlátszóbb, a vér meg tömör)
            if (p.life > 0) {
                if (isSteam) {
                    p.mesh.material.opacity = Math.max(0, p.life * 0.6); // Halvány köd
                } else {
                    p.mesh.material.opacity = Math.max(0, p.life); // Tömör vér
                }
            }

            // Ha teljesen elhalványult, visszakerül a memóriába
            if (p.life <= 0) { 
                p.active = false; 
                p.mesh.visible = false; 
                p.mesh.material.blending = THREE.NormalBlending; // Visszaállítjuk alapra
                p.mesh.scale.y = p.mesh.scale.x; // Visszaállítjuk a lapításból is!
            }
        }
    }

   // ==========================================
    // --- ÚJ: BOSS SPÓRA-ÜVÖLTÉS ANIMÁLÁSA ---
    // ==========================================
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        let sw = shockwaves[i];
        
        sw.life -= delta * 1.2; // Kb. 0.8 másodperc alatt oszlik el
        
        // 1. Tágulás (A füst folyamatosan hatalmasra nő az arcodba)
        let currentScale = sw.mesh.scale.x + (sw.growth * delta);
        sw.mesh.scale.set(currentScale, currentScale, 1);
        
        // 2. Repülés a játékos felé
        sw.mesh.position.add(sw.direction.clone().multiplyScalar(sw.speed * delta));
        
        // 3. Forgás (A SpriteMaterial-nál így kell forgatni!)
        sw.mesh.material.rotation += sw.rotSpeed * delta;
        
        // 4. Halványulás (Fade Out)
        sw.mesh.material.opacity = Math.max(0, sw.life * 0.8);

        // Ha eloszlott, töröljük a memóriából
        if (sw.life <= 0) {
            scene.remove(sw.mesh);
            sw.mesh.material.dispose();
            shockwaves.splice(i, 1);
        }
    }

   // ==========================================
    // --- RÉSZECSKÉK ÉS FÜST ANIMÁLÁSA (3D) ---
    // ==========================================
    
    // 1. A Kicsi Radioaktív Por (radSystem) mozgatása
    if (typeof radSystem !== 'undefined') {
        const positions = radSystem.geometry.attributes.position.array;
        const time = clock.getElapsedTime();
        for (let i = 0; i < positions.length; i += 3) { 
            positions[i + 1] += delta * 0.3; // Lassú emelkedés (Y tengely)
            positions[i] += Math.sin(time * 1.5 + positions[i+1]) * delta * 0.5; // Hullámzás (X)
            positions[i + 2] += Math.cos(time * 1.5 + positions[i+1]) * delta * 0.5; // Hullámzás (Z)
            
            // Ha túl magasra szállt, kezdje újra lentről
            if (positions[i + 1] > 10) positions[i + 1] = 0.2;
        }
        radSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Az Óriási Kavargó Füst (fogSystem) mozgatása
    if (typeof fogSystem !== 'undefined' && fogMat.opacity > 0) {
        const fogPos = fogSystem.geometry.attributes.position.array;
        for (let i = 0; i < fogParticleCount; i++) {
            let idx = i * 3;
            
            // Mozgatás az előre elmentett véletlenszerű irányokba
            fogPos[idx] += fogData[i].vx;     // X tengely
            fogPos[idx + 1] += fogData[i].vy; // Y tengely
            fogPos[idx + 2] += fogData[i].vz; // Z tengely
            
            // Ha a füstpamacs kimegy a 40 méteres dobozból, visszadobjuk a túloldalra!
            // Így sosem fogy el körülötted a gőz, mindig visszakerül
            let limit = 20.0;
            if (fogPos[idx] > camera.position.x + limit) fogPos[idx] -= limit * 2;
            if (fogPos[idx] < camera.position.x - limit) fogPos[idx] += limit * 2;
            
            if (fogPos[idx + 2] > camera.position.z + limit) fogPos[idx + 2] -= limit * 2;
            if (fogPos[idx + 2] < camera.position.z - limit) fogPos[idx + 2] += limit * 2;
            
            // Felfelé és lefelé mozgás korlátozása (Hogy a föld felett kavarogjon)
            if (fogPos[idx + 1] > 5.0) fogPos[idx + 1] = 0;
            if (fogPos[idx + 1] < 0) fogPos[idx + 1] = 5.0;
        }
        fogSystem.geometry.attributes.position.needsUpdate = true;
    }
    // ==========================================

    // (Eredeti render sor)
    renderer.render(scene, camera);
    
    // VISSZAÁLLÍTJUK A KORÁBBI X POZÍCIÓT (így nem sodródunk bele a falba)
    camera.position.x = savedCamX;
}



// ==========================================
// TÖLTŐKÉPERNYŐ ÉS TERMINÁL LOGIKA (CINEMATIC)
// ==========================================
const terminalLogs = [
    { text: "[SYS] Hálózat ellenőrzése...", color: "#00aaaa" },
    { text: "[KRONOS] Telemetriai mag betöltése...", color: "#00aaaa" },
    { text: "[SYS] Geotermikus mag: STABIL. Energiaellátás: 100%.", color: "#00aaaa" },
    { text: "[BIO] Verdant szennyezettség mérése... 2%... 14%... 94%!", color: "#ff5555" },
    { text: "[SYS] FIGYELMEZTETÉS: Kritikus biológiai incidens észlelve!", color: "#ff0000" },
    { text: "[KRONOS] Karantén protokoll: AKTÍV. Szektorok lezárva.", color: "#ff0000" },
    { text: ">>> EXTERNAL OVERRIDE ACCEPTED. PORT: 99.", color: "#ffaa00" },
    { text: "[GALLAGHER] ECHO, hallasz engem? A gomba áttörte a karantént...", color: "#ffaa00" },
    { text: "[KRONOS] ECHO-001 biológiai hardver felébresztése...", color: "#00ffff" },
    { text: "[ECHO-001] Neurális szinapszisok kalibrálása...", color: "#00ffff" },
    { text: "[GALLAGHER] Siess! Lent rekedtem az Irányítóban. Ments meg minket...", color: "#ffaa00" },
    { text: "[WEAPON] Kinetikus rendszerek: ONLINE.", color: "#00ff00" },
    { text: "[KRONOS] Hozzáférés engedélyezve.", color: "#00ffff" }
];

let currentLogIndex = 0;
// Egy változó a töltőképernyő zenéjének
let loadingMusic = null;

function typeTerminalLog() {
    const logBox = document.getElementById('loading-logs-container');
    const bgBad = document.getElementById('bg-bad');
    const liquid = document.getElementById('radioactive-liquid');
    const percentText = document.getElementById('loading-percentage');

    if (!logBox) return;

    if (currentLogIndex < terminalLogs.length) {
        let log = terminalLogs[currentLogIndex];
        
        let newDiv = document.createElement('div');
        newDiv.style.color = log.color;
        newDiv.style.fontWeight = log.color === "#ffaa00" ? "bold" : "normal";
        newDiv.style.marginBottom = "5px";
        logBox.appendChild(newDiv);
        
        let charIndex = 0;
        
        let typeInterval = setInterval(() => {
            newDiv.innerHTML += log.text.charAt(charIndex);
            charIndex++;
            logBox.scrollTop = logBox.scrollHeight;

            // Extra finomság: Írógép hang minden betűnél (ha akarod)
            // if (typeof playSound === 'function') playSound('ammo', 0, 0); // Olyan kattogós
            
            if (charIndex >= log.text.length) {
                clearInterval(typeInterval);
                currentLogIndex++;
                
                let progressRatio = currentLogIndex / terminalLogs.length;
                if(bgBad) bgBad.style.opacity = progressRatio; 

                let fakeProgress = Math.floor(progressRatio * 90); 
                if(liquid) liquid.style.width = fakeProgress + '%';
                if(percentText) percentText.innerText = fakeProgress + '%';
                
                let delay = log.color === "#ffaa00" ? 1200 : 400; 
                setTimeout(typeTerminalLog, delay);
            }
        }, 20); 
    } 
    else {
        let checkModels = setInterval(() => {
            if (zombieModel && fastZombieModel && hiderZombieModel && ammoModel && healthModel) {
                clearInterval(checkModels);
                
                if(liquid) liquid.style.width = '100%';
                if(percentText) percentText.innerText = '100%';
                
                setTimeout(() => {
                    document.getElementById('loading-logs-container').style.opacity = '0';
                    document.getElementById('loading-progress-area').style.opacity = '0';
                    
                    const btn = document.getElementById('loading-continue-btn');
                    btn.classList.remove('hidden');
                    setTimeout(() => { btn.style.opacity = '1'; }, 50);

                }, 1000); 
            }
        }, 500);
    }
}

/// 1. LÉPÉS: KATTINTÁS AZ EPILEPSZIA ABLAKON (A játék legelső pillanata!)
document.getElementById('epilepsy-accept-btn').addEventListener('click', () => {
    // Hangrendszer feloldása! Ez a legfontosabb.
    if (typeof listener !== 'undefined' && listener.context.state === 'suspended') {
        listener.context.resume();
    }

    const epiScreen = document.getElementById('epilepsy-screen');
    
    // Epilepszia eltűnik (Mivel felette volt, most előtűnik a Loading Screen alóla!)
    if (epiScreen) {
        epiScreen.style.opacity = '0';
        epiScreen.style.transition = 'opacity 0.5s';
        setTimeout(() => epiScreen.style.display = 'none', 500);
    }

    // TÖLTŐKÉPERNYŐ ZENE ELINDÍTÁSA (A Three.js biztonságos módszerével!)
    // Pici késleltetéssel indítjuk, hogy a böngésző biztosan feloldja az audiót
    setTimeout(() => {
        if (typeof sounds !== 'undefined' && sounds['loadingMusic'] && sounds['loadingMusic'].buffer) {
            sounds['loadingMusic'].play();
        }
    }, 200);

    // Elindul a terminál szövege
    setTimeout(typeTerminalLog, 1000);
});

// --- EZ A FÜGGVÉNY HIÁNYZOTT: FŐMENÜ MEGJELENÍTÉSE ---
window.showMainMenu = function() {
    const introScreen = document.getElementById('intro-video-screen');
    const mainMenu = document.getElementById('main-menu');

    // 1. Videó képernyő eltüntetése
    if (introScreen) {
        introScreen.classList.add('hidden');
        // Biztos ami biztos, megállítjuk a videót, ha a háttérben ragadna
        const introVideo = document.getElementById('intro-video');
        if (introVideo) introVideo.pause();
    }
    
    // 2. Főmenü megnyitása
    if (mainMenu) mainMenu.classList.remove('hidden');
    gameState = 'MENU'; 
    
    // 3. Főmenü zene elindítása
    if (typeof sounds !== 'undefined' && sounds['menuMusic'] && sounds['menuMusic'].buffer && !sounds['menuMusic'].isPlaying) {
        sounds['menuMusic'].play();
    }
}
// ----------------------------------------------------

// 2. LÉPÉS: KATTINTÁS A PULZÁLÓ OMNICORP LOGÓRA
document.getElementById('loading-continue-btn').addEventListener('click', () => {
    
    // Töltőképernyő eltüntetése
    const ls = document.getElementById('loading-screen');
    if (ls) {
        ls.style.opacity = '0'; 
        setTimeout(() => ls.style.display = 'none', 1000);
    }
    
    // Töltőképernyő zene leállítása!
    if (typeof sounds !== 'undefined' && sounds['loadingMusic'] && sounds['loadingMusic'].isPlaying) {
        sounds['loadingMusic'].stop();
    }

    // JAVÍTÁS: Frissen megkeressük a videót és a képernyőjét!
    const introScreen = document.getElementById('intro-video-screen');
    const introVideo = document.getElementById('intro-video');

    // Intro videó elindítása
    if (introVideo && introVideo.getAttribute('src') !== "" && introVideo.getAttribute('src') !== null) {
        if (introScreen) introScreen.classList.remove('hidden');
        introVideo.volume = 1.0; 
        introVideo.play().catch(e => {
            console.warn("Videó lejátszás hiba:", e);
            if (typeof showMainMenu === 'function') showMainMenu();
        });
        introVideo.onended = () => {
            if (typeof showMainMenu === 'function') showMainMenu();
        };
    } else {
        if (typeof showMainMenu === 'function') showMainMenu();
    }
});

// 3. LÉPÉS: INTRO SKIP GOMB
const skipBtn = document.getElementById('skip-intro-btn');
if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // JAVÍTÁS: Frissen megkeressük a videót!
        const introVideo = document.getElementById('intro-video');
        
        if (introVideo) {
            introVideo.pause(); 
            introVideo.currentTime = 0; 
        }
        if (typeof showMainMenu === 'function') showMainMenu(); 
    });
}



// Játékciklus Indítása
animate();



// ==========================================
// DEV TOOL: FEGYVER KALIBRÁLÓ (Később kitörölheted)
// Használat játék közben (PC): 
// Nyilak: X és Z tengely (Előre-hátra, Jobbra-balra tologatás)
// PageUp / PageDown: Y tengely (Fel-le tologatás)
// M és N gombok: Forgatás (Y tengely)
// ==========================================
window.addEventListener('keydown', (e) => {
    if (!currentWeaponMesh || gameState !== 'PLAYING') return;
    
    let step = 0.05; // Finom lépték
    let rotStep = 0.1;
    
    if (e.key === 'ArrowUp') currentWeaponMesh.position.z -= step;
    if (e.key === 'ArrowDown') currentWeaponMesh.position.z += step;
    if (e.key === 'ArrowLeft') currentWeaponMesh.position.x -= step;
    if (e.key === 'ArrowRight') currentWeaponMesh.position.x += step;
    if (e.key === 'PageUp') currentWeaponMesh.position.y += step;
    if (e.key === 'PageDown') currentWeaponMesh.position.y -= step;
    
    if (e.key === 'm') currentWeaponMesh.rotation.y += rotStep;
    if (e.key === 'n') currentWeaponMesh.rotation.y -= rotStep;
    
    // Növelés / Kicsinyítés (K és L gombok)
    if (e.key === 'k') currentWeaponMesh.scale.multiplyScalar(1.1);
    if (e.key === 'l') currentWeaponMesh.scale.multiplyScalar(0.9);

    // Kiírjuk a konzolra az aktuális, tökéletes értékeket!
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','m','n','k','l'].includes(e.key)) {
        console.log(`--- TÖKÉLETES BEÁLLÍTÁSOK EHHZ: ${currentWeaponId} ---`);
        console.log(`Scale: ${currentWeaponMesh.scale.x.toFixed(3)}`);
        console.log(`posOffset: {x: ${currentWeaponMesh.position.x.toFixed(3)}, y: ${currentWeaponMesh.position.y.toFixed(3)}, z: ${currentWeaponMesh.position.z.toFixed(3)}}`);
        console.log(`rotOffset: {x: ${currentWeaponMesh.rotation.x.toFixed(3)}, y: ${currentWeaponMesh.rotation.y.toFixed(3)}, z: ${currentWeaponMesh.rotation.z.toFixed(3)}}`);
    }
});
