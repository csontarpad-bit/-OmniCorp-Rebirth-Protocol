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
const poolBloodMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
const poolBloodGeo = new THREE.SphereGeometry(0.05, 4, 4);
for(let i = 0; i < 150; i++) { // 150 vérrészecske memóriában tartva
    let p = new THREE.Mesh(poolBloodGeo, poolBloodMat);
    p.visible = false;
    scene.add(p);
    bloodPool.push({ mesh: p, active: false, vx: 0, vy: 0, vz: 0, life: 0 });
}

const poolLaserMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3 });
// 20 helyett legyen 60, hogy sose fogyjon ki a tár a memóriában!
for(let i = 0; i < 60; i++) { 
    let lGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    let l = new THREE.Line(lGeo, poolLaserMat);
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
    size: 0.6, // Nagyobb részecskék
    map: particleTexture, 
    transparent: true, 
    blending: THREE.AdditiveBlending, // Gyönyörűen világítanak, ha fedik egymást
    depthWrite: false // Ne takarják ki a mögöttük lévő dolgokat hibásan
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
// 2. HANGRENDSZER
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
        sounds[name] = sound;
      
    });
}
loadSound('defibrillator', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/306cb8beb9956a05ffb3ea66d00923be4cb95b5c/Sound/shock.mp3', 1.0);
loadSound('cough', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/537e7833404c4f1d16355bce8db5451231f4797e/coughing.mp3', 1.0);
loadSound('pickup', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/610723d633422339cc4d1d3384fcc2a70a98f27a/pick%20up%20item.mp3', 1.0);
loadSound('whispers', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/610723d633422339cc4d1d3384fcc2a70a98f27a/whispers.mp3', 0.0, true); 
loadSound('loadingMusic', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/fea9f5d83283e004ddc56527e42e8d665ef93bc0/Loading%20Screen%20music.mp3', 0.5, true);
loadSound('cryoGas', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/5abe88d4b8b1dd33f0887daa25511297b89eecbd/cryo%20gas.mp3', 0.8);
loadSound('iceCrack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/46c22b763dcc098c3c6581afdfbccad22203c429/ice%20brake.mp3', 0.5); // Halkabbra vesszük, ez csak háttérzaj
loadSound('footstep', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/dd55e7027743a8ed1ec9aa2c9bd70895c3605773/foot%20%20step.mp3', 0.8);
loadSound('deathScream', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/dd55e7027743a8ed1ec9aa2c9bd70895c3605773/Death%20scream.mp3', 1.0);
loadSound('burst', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df6d333b9936fa81cffbce5c2bdb8891eaf9ee37/burst.mp3', 1.0);
loadSound('bossAttack', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/d992c4493c5e5a4fb0c3e9d8134bdc308aa5f46d/boss%20screem%20v2.mp3', 1.0,);
loadSound('cry', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/40bf509427fc680fb017d8e5c47594250ad9ae93/cry.mp3', 1.0);
loadSound('glitch', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/102a0d507c37ef59b9aeb075e1b30110c95f3b3f/noice02.mp3', 1.0);
loadSound('music', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/f162302b83992b9adfe75b1c3ade387a25e2478d/music.mp3', 0.3, true); 
loadSound('menuMusic', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/212958c21ddceb0db80820c1d91b06b7d9a5a950/main.m4a', 0.5, true); 
loadSound('ammo', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/ammo%20box.mp3', 1.0);
loadSound('shoot', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/gun%20shoot.mp3', 0.7);
loadSound('heal', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/heal.mp3', 1.0);
loadSound('hurt', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/me%20get%20hit.mp3', 1.0);
loadSound('reload', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/reload.mp3', 1.0);
loadSound('zombieHit', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/7bc7874a7ddc6802b16f0d3eafb82b2b4860e125/zombie%20get%20hit.mp3', 1.0);
loadSound('zombieDie', 'https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/1f5b9cfe04d0b19f99fdb0b263ba582b429f4f92/zombie%20die.mp3', 1.0);

window.unlockAudio = function() {
    if (listener.context.state === 'suspended') listener.context.resume();
    if (sounds['music'] && sounds['music'].buffer && !sounds['music'].isPlaying) sounds['music'].play();
}

window.playSound = function(name, offset = 0, fadeOutDuration = 0) {
    if (sounds[name] && sounds[name].buffer) {
        
        // HA FADE OUT KELL (Kizárólag akkor használjuk, amikor elhallgattatjuk a bosst)
        if (fadeOutDuration > 0 && sounds[name].isPlaying) {
            let gainNode = sounds[name].gain.gain;
            gainNode.cancelScheduledValues(listener.context.currentTime);
            gainNode.linearRampToValueAtTime(0.01, listener.context.currentTime + fadeOutDuration);
            setTimeout(() => { 
                if (sounds[name].isPlaying) {
                    sounds[name].stop();
                    gainNode.setValueAtTime(sounds[name].getVolume(), listener.context.currentTime); // Visszaállítjuk a hangerőt a kövi lejátszáshoz
                }
            }, fadeOutDuration * 1000);
            return;
        }

        // NORMÁL LEJÁTSZÁS (Fegyverek, Lépések, Boss indulása)
        if (sounds[name].isPlaying) sounds[name].stop();
        sounds[name].offset = offset;
        
        // Biztosítjuk, hogy normál hangerőn szólaljon meg (ha előtte le lett volna halkítva)
        sounds[name].gain.gain.setValueAtTime(sounds[name].getVolume(), listener.context.currentTime);
        sounds[name].play();
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

gltfLoader.load('https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/8c7271b0135d22428617169177fe45e31e6aecf7/ultrakill_alternate_revolver.glb', (gltf) => { 
    const gunMesh = gltf.scene; 
    gunMesh.scale.set(3, 3, 3); 
    gunMesh.position.set(0.8, -1.2, -1.5); 
    gunMesh.rotation.set(0, -Math.PI/2, 0); 
    camera.add(gunMesh); 
    if (gltf.animations.length > 0) { 
        gunMixer = new THREE.AnimationMixer(gunMesh); 
        gunShootAction = gunMixer.clipAction(gltf.animations[0]); 
        gunShootAction.setLoop(THREE.LoopOnce); 
        gunShootAction.clampWhenFinished = true; 
    } 
});

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

    // Alapértelmezetten 'green' (zöld)
    mesh.userData = { spawnWave: currentWave, state: 'green' };

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
            playSound('heal'); // Siker hang
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
// 4. LÖVÉS ÉS IRÁNYÍTÁS LOGIKA
// ==========================================

window.handleShoot = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (gameState !== 'PLAYING' || isReloading) return;
    
    let wpn = weapons[currentWeaponId];

    if (wpn.ammo <= 0) { 
        if (wpn.reserve > 0) { 
            startReloading(wpn); // <--- ÚJ: Csak meghívjuk az új függvényt!
        } 
        return; 
    }
    
    wpn.ammo--; 
    if (typeof updateUI === 'function') updateUI(); 
    playSound('shoot', 0.4);
    
    muzzleFlash.intensity = 8.0; 
    recoilPitch += 0.08 + (wpn.spread * 0.5); 
    if (gunShootAction) { gunShootAction.stop(); gunShootAction.play(); }

  
    
    const isSuper = currentWeaponId === 'super';
    
    for (let p = 0; p < wpn.pellets; p++) {
      // 1. GARANTÁLJUK, HOGY A KAMERA LÖVÉSKOR A LEGFRISSEBB ÁLLAPOTBAN VAN
        // (Figyelembe véve a visszarúgást és az egérmozgást!)
        camera.updateMatrixWorld(); 

        const spreadX = (Math.random() - 0.5) * wpn.spread;
        const spreadY = (Math.random() - 0.5) * wpn.spread;
        
        // 2. KIKÉNYSZERÍTJÜK A LÖVEDÉK PONTOS IRÁNYÁT A 3D TÉRBEN
        // Nem hagyatkozunk a "setFromCamera" beépített (néha lemaradó) funkciójára.
        // Helyette manuálisan, matematikai pontossággal kiszámoljuk a cső irányát.
        const rayDirection = new THREE.Vector3(spreadX, spreadY, -1);
        rayDirection.unproject(camera);
        rayDirection.sub(camera.position).normalize();

        // 3. A GLOBÁLIS RAYCASTER FRISSÍTÉSE
        globalRaycaster.set(camera.position, rayDirection);

        // 4. "GOLYÓ VASTAGSÁG" (Tolerance) - Bár a Mesh-eknél ritkán kell, biztos ami biztos:
        globalRaycaster.params.Mesh.threshold = 0.1; 

        // 5. ÜTKÖZÉSVIZSGÁLAT (Csak a látható / létező objektumokon)
        const intersects = globalRaycaster.intersectObjects(enemyHitboxes, false);
        const startPoint = new THREE.Vector3(0.5, -0.5, -1).applyMatrix4(camera.matrixWorld);
        let endPoint = (isSuper || intersects.length === 0) ? globalRaycaster.ray.at(50, new THREE.Vector3()) : intersects[0].point;
        
        // --- JAVÍTÁS: A LÉZER ÁTSZÚRÁSA ---
        // Ha találtunk valamit, a lézer végét kicsit megtoljuk előre, hogy "beleálljon" a testébe, és ne tűnjön el a felületen!
        if (intersects.length > 0 && !isSuper) {
            let pushDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
            endPoint.add(pushDirection.multiplyScalar(2.0)); // 2 méterrel átszúrja
        }

        
        // --- LÁTVÁNY ---
        if (isSuper) {
            // Vastag 3D lézerhenger a szuper fegyverhez
            const distance = startPoint.distanceTo(endPoint);
            const cylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, distance, 8);
            const cylinderMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
            const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
            cylinder.position.copy(startPoint).lerp(endPoint, 0.5);
            cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(endPoint, startPoint).normalize());
scene.add(cylinder);
            setTimeout(() => { scene.remove(cylinder); cylinderGeo.dispose(); cylinderMat.dispose(); }, 150);
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
                            
                            for (let i = 0; i < 15; i++) {
                                let p = bloodPool.find(part => !part.active);
                                if (p) {
                                    p.active = true; p.life = 1.0;
                                    p.mesh.position.copy(hit.point);
                                    p.mesh.scale.setScalar(1.5); 
                                    p.vx = (Math.random() - 0.5) * 0.2; 
                                    p.vy = Math.random() * 0.3 + 0.1;    
                                    p.vz = (Math.random() - 0.5) * 0.2; 
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
                    playSound('zombieHit');

               // --- ÚJ: A RESEARCH BOOST LEKÉRÉSE A DATABASE.JS-BŐL! ---
                    let researchBoost = typeof getDamageBoost === 'function' ? getDamageBoost(en.type === 'hider' ? 'stalker' : en.type) : 1.0;
                    
                    // Alapsebzés (fejlövés vagy test) * Pajzs szorzó (ha zöld/sárga tócsán áll) * KUTATÁSI BÓNUSZ (0-50% plusz!)
                    let baseDmg = isHeadshot ? wpn.damage * 3 : wpn.damage;
                    let dmg = (baseDmg * (en.shieldMult || 1.0)) * researchBoost; 
                    
                    if (en.shieldMult < 1.0 && typeof showShieldIcon === 'function') {
                        showShieldIcon(en.shieldType);
                    }
                    
                    en.health -= dmg;
                    score += isHeadshot ? 50 : 10;
                    if (typeof updateUI === 'function') updateUI();

if (en.health <= 0) {
                        playSound(en.type === 'crawler' ? 'cry' : 'zombieDie');
                        
                        // --- JAVÍTÁS: Ha a Boss meghalt, AZONNAL némítsuk el az ordítását! ---
                        if (en.type === 'boss' && sounds['bossAttack']) {
                            sounds['bossAttack'].stop();
                        }
                        // ----------------------------------------------------------------------
                        
                        let rewardAmmount = isHeadshot ? en.reward * 1.5 : en.reward;
                        score += rewardAmmount; 
                        
                        // --- JAVÍTÁS: A statType-ot IDEHOZTUK FELÜLRE, hogy mindenki lássa! ---
                        // (Mivel a 'hider'-t átneveztük 'stalker'-re a kódexben)
                        let statType = en.type === 'hider' ? 'stalker' : en.type;
                        
                        // --- KÓDEX STATISZTIKA NÖVELÉSE ---
                        if (typeof playerStats !== 'undefined' && playerStats.kills) {
                            playerStats.totalDataGathered += rewardAmmount; 
                            
                            if (playerStats.kills[statType]) {
                                if (isHeadshot) playerStats.kills[statType].head++;
                                else playerStats.kills[statType].body++;
                            }
                            
                            if (typeof savePlayerStats === 'function') savePlayerStats();
                        }
                        
                        // --- JAVÍTOTT DIREKTÍVA CHECK: LÖVÉS ---
                        if (typeof checkDirective === 'function') {
                            if (isHeadshot) checkDirective('kill_head', statType);
                            else checkDirective('kill_body', statType);
                            
                            // DIREKTÍVA CHECK: POCSOLYÁN LÖVÉS (Pajzs)
                            if (en.shieldType) checkDirective('puddle_kill', en.shieldType);
                        }

                        // JAVÍTÁS: Az 1. hullámtól azonnal feloldja a zöld pocsolyát is a kódexben!
                        if (playerStats.wavesSurvived === 0) {
                            playerStats.wavesSurvived = 1;
                            if (typeof savePlayerStats === 'function') savePlayerStats();
                        }

                        if (typeof createToxicPuddle === 'function') createToxicPuddle(en.mesh.position.x, en.mesh.position.z);
                    
                        
                        // VÉRFRÖCCS
                        for (let i = 0; i < 15; i++) {
                            let p = bloodPool.find(part => !part.active);
                            if (p) {
                                p.active = true; p.life = 1.0;
                                p.mesh.position.copy(hit.point);
                                p.mesh.scale.setScalar(1.0); 
                                p.vx = (Math.random() - 0.5) * 0.15; 
                                p.vy = Math.random() * 0.2 + 0.1;    
                                p.vz = (Math.random() - 0.5) * 0.15; 
                                p.mesh.visible = true;
                            }
                        }
                        
                     // ==========================================
                        // --- ÚJ: HULLA (CORPSE) LÉTREHOZÁSA ÉS ÁTMOZGATÁSA ---
                        // ==========================================
                        const radarContainer = document.getElementById('radar');
                        if (radarContainer && en.blip && en.blip.parentNode === radarContainer) {
                            radarContainer.removeChild(en.blip);
                        }
                        
                        // 1. HITBOXOK ELTÁVOLÍTÁSA (Át lehessen menni a hullán)
                        scene.remove(en.bodyHitbox);
                        scene.remove(en.headHitbox);
                        
                        let bIdx = enemyHitboxes.indexOf(en.bodyHitbox);
                        if (bIdx > -1) enemyHitboxes.splice(bIdx, 1);
                        let hIdx = enemyHitboxes.indexOf(en.headHitbox);
                        if (hIdx > -1) enemyHitboxes.splice(hIdx, 1);

                      
                      // 2. HALÁL ANIMÁCIÓ (VAGY FAGYASZTÁS) ERŐSZAKOS INDÍTÁSA
                        let animDuration = 0;
                        
                        // --- JAVÍTÁS: KIOLVASZTJUK A MIXERT, HOGY EL TUDJON ESNI! ---
                        if (en.mixer) en.mixer.timeScale = 1.0;

                        if (en.hasDeathAnim && en.deathAction) {
                            // Szigorú átváltás: leállítunk minden korábbi animációt!
                            en.mixer.stopAllAction();
                            
                            // Azonnal elindítjuk a halált!
                            en.deathAction.reset().play();
                            animDuration = en.deathAction._clip ? en.deathAction._clip.duration : 1.5;
                        } else {
                            // Nincs animáció: Azonnal megfagy a helyén (bábu mód)
                            en.mixer.stopAllAction();
                        }
                        
                        // 3. ÁTRAKÁS A HULLAZSÁKBA (Mentjük a hitbox eltolásokat a következő újraéledéshez!)
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
                        
                        // 4. MAGA A ZOMBI TÖRLÉSE AZ "ÉLŐK" LISTÁJÁBÓL
                        let enIdx = enemies.indexOf(en);
                        if (enIdx > -1) enemies.splice(enIdx, 1);
                        // ==========================================
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
    
    // --- ÚJ: SZÜNET GOMB (P) ---
    if (key === 'p' && gameState === 'PLAYING') {
        // Ha P-t nyomunk, kilépünk az egérzárkából.
        // Ez automatikusan meghívja a pointerlockchange eseményt, ami betölti a Szünet menüt!
        document.exitPointerLock(); 
    }
    
    // --- MANUÁLIS ÚJRATÖLTÉS ("R" GOMB) ---
    if (key === 'r' && gameState === 'PLAYING' && !isReloading) {
        let wpn = weapons[currentWeaponId];
        if (wpn.ammo < wpn.maxAmmo && wpn.reserve > 0) startReloading(wpn);
    }

// --- ÚJ: MEDKIT HASZNÁLATA ("H" GOMB) ---
    if (key === 'h' && gameState === 'PLAYING') {
        let maxHP = 100 + (skills.maxHealth.level * 20);
        if (playerMedkits > 0 && playerHealth < maxHP) {
            playerMedkits--; 
            let healAmount = 40 * (1 + (skills.healthLoot.level * 0.2));
            playerHealth = Math.min(maxHP, playerHealth + healAmount); 
            
            // FERTŐZÉS + DROG EFFEKT (MINDEN HASZNÁLATKOR!)
            playerInfection = Math.min(100, playerInfection + 5); 
            
            // JAVÍTÁS: Csak vizuális effektet adunk, nem indítjuk el a sebző druggedTimer-t!
            document.body.classList.add('drugged');
            setTimeout(() => {
                if (typeof druggedTimer !== 'undefined' && druggedTimer <= 0) {
                    document.body.classList.remove('drugged');
                }
            }, 1500);
            
            playSound('heal'); 
            const healFlash = document.getElementById('heal-flash');
            if (healFlash) { healFlash.style.opacity = 1; setTimeout(() => healFlash.style.opacity = 0, 300); }
            
            if (typeof updateUI === 'function') updateUI(); // AZONNALI FRISSÍTÉS
        }
    }
});


window.addEventListener('keyup', (e) => { let key = e.key.toLowerCase(); if (key in keys) keys[key] = false; });

// --- KÖZÖS ÚJRATÖLTŐ FÜGGVÉNY ---
function startReloading(wpn) {
    isReloading = true; 
    playSound('reload'); 
    document.getElementById('reload-text').classList.remove('hidden'); 
    
    setTimeout(() => { 
        // Kiszámoljuk, mennyi golyó hiányzik a tárból
        const load = Math.min(wpn.maxAmmo - wpn.ammo, wpn.reserve); 
        wpn.ammo += load; 
        wpn.reserve -= load; 
        
        isReloading = false; 
        if (typeof updateUI === 'function') updateUI(); 
        document.getElementById('reload-text').classList.add('hidden'); 
    }, wpn.reloadTime); 
}

setInterval(() => {
    if (gameState === 'PLAYING') {
        let kmX = 0, kmZ = 0;
        if (keys.w) kmZ = -1; 
        if (keys.s) kmZ = 1;  
        if (keys.a) kmX = -1; 
        if (keys.d) kmX = 1;  
        
        if (kmX !== 0 || kmZ !== 0) { moveX = kmX; moveZ = kmZ; } 
        else if (leftTouchId === null) { moveX = 0; moveZ = 0; }
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


// NÉZELŐDÉS
window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && gameState === 'PLAYING') {
        yaw -= (e.movementX || 0) * mouseSensitivity; // <--- Dinamikus érzékenység!
        pitch -= (e.movementY || 0) * mouseSensitivity; // <--- Dinamikus érzékenység!
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

// GOMBOK: LÖVÉS ÉS VÁLTÁS
window.addEventListener('mousedown', (e) => {
    if (gameState !== 'PLAYING' || document.pointerLockElement !== document.body) return;
    if (e.button === 0) {
        isShootingBtnPressed = true; 
        if(weapons[currentWeaponId].auto) autoShootTimer = weapons[currentWeaponId].fireRate;
        handleShoot(); 
    } else if (e.button === 2) {
        if (typeof handleWeaponSwitch === 'function') handleWeaponSwitch(e);
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) isShootingBtnPressed = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// --- BIZTONSÁGI VÉDELEM ÉS ESC (PAUSE) GOMB ELFOGÁSA ---
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== document.body) {
        isShootingBtnPressed = false; // Lövés leáll
        
        // HA JÁTÉK KÖZBEN NYOMUNK ESC-T (Nem a boltban vagyunk!), AKKOR SZÜNET!
        if (gameState === 'PLAYING') {
            pauseGame();
        }
    }
});

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
            
            // Ledobunk 4 lőszert és 4 medkitet
            if (typeof spawnMedkit === 'function') {
                for (let i = 0; i < 4; i++) spawnMedkit(getSafeSpawnPosition(0.5, 5).x, getSafeSpawnPosition(0.5, 5).z);
                for (let i = 0; i < 4; i++) spawnAmmoBox(getSafeSpawnPosition(0.4, 5).x, getSafeSpawnPosition(0.4, 5).z);
            }
            for(let i = 0; i < enemiesToSpawn; i++) {
                spawnEnemy(getSafeSpawnPosition(enemyRadius, 15).x, getSafeSpawnPosition(enemyRadius, 15).z, bossSpawning && i===0);
            }
            
            // --- ÚJ CRAWLER LOGIKA: A Rothadó (Sárga) pocsolyák vonzzák őket! ---
            // Megszámoljuk, hány rothadó tócsa van
            let yellowPuddles = toxicPuddles.filter(p => p.userData.state === 'yellow').length;
            let crawlerCount = 0;
            
            // Brutális büntetés, ha sok a rothadó hús a pályán!
            if (yellowPuddles >= 40) crawlerCount = 4;
            else if (yellowPuddles >= 25) crawlerCount = 2;
            else if (yellowPuddles >= 10) crawlerCount = 1;
            
            for(let c = 0; c < crawlerCount; c++) {
                spawnEnemy(getSafeSpawnPosition(enemyRadius, 15).x, getSafeSpawnPosition(enemyRadius, 15).z, false, 'crawler');
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
    weapons.rifle = { name: 'Gépkarabély', level: 1, damage: 0.8, ammo: 0, reserve: 0, maxAmmo: 30, maxReserve: 90, pellets: 1, spread: 0.05, reloadTime: 1800, owned: false, auto: true, fireRate: 0.12, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/g%C3%A9gkarab%C3%A9ly.png" };
    weapons.super = { name: 'Szuper fegyver', level: 1, damage: 15, ammo: 0, reserve: 0, maxAmmo: 5, maxReserve: 15, pellets: 1, spread: 0, reloadTime: 2500, owned: false, auto: false, fireRate: 0, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/revolver.png" };

    // 3. Túlélő felszerelés és Direktívák (Küldetések) nullázása
    playerMedkits = 0;
    playerArmor = 0;
    currentWeaponId = 'pistol';

// --- FAGYASZTÁS GOMB ÉS IDŐZÍTŐK ELREJTÉSE/NULLÁZÁSA ---
    activeFreezeTimer = 0;
    freezeCooldown = 0;
    const fBtnUI = document.getElementById('freeze-btn');
    if (fBtnUI) fBtnUI.classList.add('hidden');

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
        for (let i = 0; i < 4; i++) spawnMedkit(getSafeSpawnPosition(0.5, 5).x, getSafeSpawnPosition(0.5, 5).z);
        for (let i = 0; i < 4; i++) spawnAmmoBox(getSafeSpawnPosition(0.4, 5).x, getSafeSpawnPosition(0.4, 5).z);
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
        
        radSystem.rotation.y += delta * 0.05; // A por is lassan örvénylik
        renderer.render(scene, camera);
        return;
    }



    if (gameState !== 'PLAYING') { 
        renderer.render(scene, camera); return; 
    }

    if (typeof updateUI === 'function') updateUI();
    if (typeof updateDirectiveHUD === 'function') updateDirectiveHUD();

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
        
        // 1. MP-ENKÉNTI TICK (Játékos sebzése)
        if (toxicTickTimer >= 1.0) {
            toxicTickTimer = 0; 
            
            let playerDamage = 0;
            let px = camera.position.x;
            let pz = camera.position.z;
            
           // Megnézzük, milyen pocsolyán áll a játékos
            for (let p of toxicPuddles) {
                let distSq = Math.pow(px - p.position.x, 2) + Math.pow(pz - p.position.z, 2);
                if (distSq <= 1.2) {
                    if (p.userData.state === 'green') { playerDamage += 2; checkDirective('puddle_stand', 'green'); }
                    else if (p.userData.state === 'yellow') { playerDamage += 5; checkDirective('puddle_stand', 'yellow'); }
                    else if (p.userData.state === 'ready') { playerDamage += 10; checkDirective('puddle_stand', 'ready'); }
                }
            }
            
            if (playerDamage > 0) {
                // --- ÚJ: PÁNCÉL VÉD A SAVTÓL IS ---
                if (playerArmor > 0) {
                    if (playerArmor >= playerDamage) {
                        playerArmor -= playerDamage;
                        playerDamage = 0;
                    } else {
                        playerDamage -= playerArmor;
                        playerArmor = 0;
                    }
                }
             if (playerDamage > 0 && !isGodMode) playerHealth -= playerDamage; // <-- Védve!
                // ----------------------------------

                if (typeof updateUI === 'function') updateUI();
                playSound('hurt');
                
                const damageFlash = document.getElementById('damage-flash');
                if (damageFlash) { damageFlash.style.opacity = 0.5; setTimeout(() => damageFlash.style.opacity = 0, 200); }
                
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

// 2. FOLYAMATOS ZOMBI PAJZS SZÁMÍTÁS
        for (let en of enemies) {
            en.shieldMult = 1.0; 
            en.shieldType = null; // ÚJ: Eltároljuk, milyen pajzsa van
            
            for (let p of toxicPuddles) {
                let distSq = Math.pow(en.mesh.position.x - p.position.x, 2) + Math.pow(en.mesh.position.z - p.position.z, 2);
                if (distSq <= 1.5) { 
                    en.shieldType = p.userData.state; // Eltároljuk az állapotot!
                    
                    if (p.userData.state === 'green') en.shieldMult = 0.8;      
                    else if (p.userData.state === 'yellow') en.shieldMult = 0.5; 
                    else if (p.userData.state === 'ready') en.shieldMult = 0.2;  
                    break; 
                }
            }
        }
    }
    // --- TOXIKUS LOGIKA VÉGE ---

    if (damageCooldown > 0) damageCooldown -= delta;
    if (muzzleFlash.intensity > 0) muzzleFlash.intensity = Math.max(0, muzzleFlash.intensity - delta * 30);
    if (gunMixer) gunMixer.update(delta);
    
    const screenBlood = document.getElementById('screen-blood');
    if (screenBlood && parseFloat(screenBlood.style.opacity || 0) > 0) {
        screenBlood.style.opacity = Math.max(0, parseFloat(screenBlood.style.opacity) - delta * 0.4);
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

    playerLight.intensity = Math.random() < 0.1 ? Math.random() * 0.6 : 0.6 + Math.random() * 0.2;
    playerLight.position.copy(camera.position);

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
    camera.quaternion.setFromEuler(new THREE.Euler(pitch + recoilPitch, yaw, 0, 'YXZ'));
    
    let shakeX = 0, shakeY = 0;
    if (cameraShake > 0) {
        shakeX = (Math.random() - 0.5) * cameraShake; shakeY = (Math.random() - 0.5) * cameraShake;
        cameraShake -= delta;
    }
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); 
    forward.y = 0; 
    if (forward.lengthSq() > 0.001) forward.normalize(); else forward.set(0,0,-1);
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
    
  // Sebesség növelése a képesség alapján (+20% szintenként)
    let speedMult = 0.15 * (1 + (skills.speed.level * 0.2));
    let nextX = camera.position.x + forward.x*(moveZ*-speedMult) + right.x*(moveX*speedMult);
    let nextZ = camera.position.z + forward.z*(moveZ*-speedMult) + right.z*(moveX*speedMult);
    
    if (!checkWallCollision(nextX, camera.position.z, playerRadius)) camera.position.x = nextX;
    if (!checkWallCollision(camera.position.x, nextZ, playerRadius)) camera.position.z = nextZ;

    velocityY -= gravity; baseCamY += velocityY; 
    if (baseCamY < 1.6) { baseCamY = 1.6; velocityY = 0; }
    
// --- LÉPÉSHANGOK ÉS KAMERA RUGÓZÁS (BOBBING) ---
    const speed = Math.hypot(moveX, moveZ); 
    
    // Globális változó a lépés-időzítéshez (ha még nincs, létrehozzuk menet közben)
    if (typeof window.stepTimer === 'undefined') window.stepTimer = 0;

    if (speed > 0.05) { 
        bobTime += delta * 12; 
        currentBob = Math.sin(bobTime) * 0.06; 
        
        // Lépés ritmus számolása
        window.stepTimer += delta * (1 + (skills.speed.level * 0.2)); // Ha gyorsabb vagy, gyorsabban ketyeg!
        
        // Minden ~0.4 másodpercnyi futás után lépünk egyet
        if (window.stepTimer > 0.4) {
            playSound('footstep');
            window.stepTimer = 0;
            
            // Extrának egy pici port is kavarhatunk a lábunk alatt!
            for (let i = 0; i < 2; i++) {
                let p = bloodPool.find(part => !part.active);
                if (p) {
                    p.active = true; p.life = 0.5;
                    p.mesh.position.set(camera.position.x, 0, camera.position.z);
                    p.mesh.scale.setScalar(0.5); 
                    // Fekete/Szürke por szín
                    p.mesh.material.color.setHex(0x222222);
                    p.vx = (Math.random() - 0.5) * 0.1; 
                    p.vy = Math.random() * 0.1;    
                    p.vz = (Math.random() - 0.5) * 0.1; 
                    p.mesh.visible = true;
                }
            }
        }
    } 
    else { 
        currentBob += (0 - currentBob) * delta * 10; 
        window.stepTimer = 0.3; // Ha megállsz, azonnal lépj egyet, amint újraindulsz
    }
    
    // --- JAVÍTÁS: A rázkódás csak ideiglenes eltolás (rendereléshez), nem módosítja a fizikai pozíciót! ---
    let savedCamX = camera.position.x;
    camera.position.x += shakeX;
    camera.position.y = baseCamY + currentBob + shakeY;

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

        // Ha fagyasztás van, a zombi nem mozog és az animáció is megáll!
        if (activeFreezeTimer > 0) {
            if (en.mixer) en.mixer.timeScale = 0; 
            continue; 
        } else {
            if (en.mixer) { en.mixer.timeScale = 1; en.mixer.update(delta); }
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
            if (en.mixer) { en.mixer.timeScale = 2.0; en.mixer.update(delta); } 
            
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
       
// 1. Egyedi támadási távolság: A Boss-nak sokkal hosszabb a keze (8.0), a többinek marad a 3.0
        let attackRange = (en.type === 'boss') ? 8.0 : 3.0;
        
        // --- ÚJ LOGIKA: BOSS ÜVÖLTÉS ÉS PIHENŐ (COOLDOWN) IDŐZÍTŐ ---
        
        // Ha nem létezik a pihenő időzítő, hozzuk létre
        if (typeof en.attackRestTimer === 'undefined') en.attackRestTimer = 0;
        
        // Pihenés csökkentése (ha épp pihen)
        if (en.attackRestTimer > 0) {
            en.attackRestTimer -= delta;
        }

        // Ha a boss épp ordít, az időzítő csökken
        if (en.roarTimer > 0) {
            en.roarTimer -= delta;
            
            // Ha Boss, és épp ordít, folyamatosan lőjünk ki egy hanghullámot!
            if (en.type === 'boss') {
                if (typeof en.waveCooldown === 'undefined') en.waveCooldown = 0;
                en.waveCooldown -= delta;
                
                if (en.waveCooldown <= 0) {
                    spawnBossShockwave(en.mesh);
                    en.waveCooldown = 0.15; // 0.15 másodpercenként újabb lökéshullám (folyamatos áradat)!
                }
            }
            
            // FONTOS: Ha most ért véget az üvöltés (0 alá esett az idő), kezdjen el PIHENNI 1 másodpercig!
            if (en.roarTimer <= 0) {
                en.attackRestTimer = 1.0; 
            }
        }
        
        // ==========================================
        // TÁMADÁS INDÍTÁSA (Ha elég közel vagy ÉS NEM PIHEN ÉPPEN)
        // ==========================================
        if (distToPlayer <= attackRange && en.attackRestTimer <= 0 && invincibilityTimer <= 0) {
            
            // --- ÚJ: BOSS SZINKRONIZÁLT TÁMADÁS ---
            if (en.type === 'boss' && en.roarTimer <= 0) {
                en.roarTimer = 3.8; 
                en.waveCooldown = 0; 
                
                // Mielőtt elkezdi az üvöltést, UTOLJÁRA feléd fordul, aztán belefagy a pózba!
                en.mesh.lookAt(savedCamX, 0, camera.position.z);
                
                if (!sounds['bossAttack'] || !sounds['bossAttack'].isPlaying) {
                    playSound('bossAttack'); 
                }
            }

            // TÁMADÁS ANIMÁCIÓ BEKAPCSOLÁSA (Ha van)
            if (en.attackAction && en.currentAction !== en.attackAction) {
                en.runAction.fadeOut(0.2);
                en.attackAction.reset().fadeIn(0.2).play();
                en.currentAction = en.attackAction;
            }

           // ==========================================
            // --- ÚJ: TÖLCSÉR-SEBZÉS (CSAK ELŐLRE SEBEZ) ---
            // ==========================================
            let isInCone = true; // Alap zombiknál mindig igaz, ők körben sebeznek

            if (en.type === 'boss') {
                // Megnézzük a Boss előre mutató vektorát (amerre a teste néz)
                let bossForward = new THREE.Vector3(0, 0, 1).applyQuaternion(en.mesh.quaternion).normalize();
                
                // Kiszámoljuk a vektort, ami a Bosstól a játékos felé mutat
                let dirToPlayer = new THREE.Vector3().subVectors(camera.position, en.mesh.position).normalize();
                dirToPlayer.y = 0; // Síkban nézzük, a magasság most nem számít
                bossForward.y = 0;
                bossForward.normalize();

                // Kiszámoljuk a két vektor által bezárt szöget
                // A "dot product" egy számot ad -1 és 1 között. A 0.85 kb 30 fok eltérést jelent (összesen 60 fokos tölcsér).
                let dotProduct = bossForward.dot(dirToPlayer);

                // Ha a dotProduct kisebb, mint 0.85, akkor a játékos kívül esik a 90 fokos tölcséren!
                if (dotProduct < 0.85) {
                    isInCone = false; // Háta mögött / nagyon oldalt van!
                }
            }

            // CSAK AKKOR SEBEZ ÉS RÁZZA A KÉPERNYŐT, HA A TÖLCSÉREN BELÜL VAGY!
            if (isInCone) {
                
                // Sebzés kiosztása (Ha letelt a késleltetésed)
                if (damageCooldown <= 0) { 
                    damageCooldown = 1.0; 
                    cameraShake = 0.5; 
                    
                    if (en.type === 'boss') {
                        // Képernyő glitch CSAK ha el is talált a hanghullám!
                        const glitchOverlay = document.getElementById('glitch-overlay');
                        if (glitchOverlay) {
                            glitchOverlay.classList.remove('hidden');
                            glitchOverlay.classList.add('glitch-active');
                            setTimeout(() => {
                                glitchOverlay.classList.remove('glitch-active');
                                glitchOverlay.classList.add('hidden');
                            }, 500);
                        }
                    } else {
                        playSound('hurt'); 
                    }
                } 

                // Sebzés számolás (Páncél + Élet)
                const stats = difficultySettings[currentDifficulty];
                let rawDamage = stats.damage * en.damageMult; 

                if (playerArmor > 0) {
                    if (playerArmor >= rawDamage) {
                        playerArmor -= rawDamage; 
                        rawDamage = 0; 
                    } else {
                        rawDamage -= playerArmor; 
                        playerArmor = 0; 
                    }
                }
                if (rawDamage > 0 && !isGodMode) playerHealth -= rawDamage;

                checkDirective('take_damage', en.type);
                
                if (typeof updateUI === 'function') updateUI(); 
                const screenBlood = document.getElementById('screen-blood');
                if (screenBlood) screenBlood.style.opacity = 1.0;

                // Halál ellenőrzés
                if (playerHealth <= 0) {
                    if (skills.revive.level > 0 && gameState === 'PLAYING') {
                        skills.revive.level--;
                        playerHealth = 100 + (skills.maxHealth.level * 20); 
                        invincibilityTimer = 2.0; 

                        // --- ÚJ: FERTŐZÉS KIÉGETÉSE ÉS DROG MEGSZÜNTETÉSE ---
                        playerInfection = Math.max(0, playerInfection - 40); 
                        druggedTimer = 0; 
                        document.body.classList.remove('drugged', 'infected-mild', 'infected-medium', 'infected-severe');
                        // ---------------------------------------------------

                       playSound('defibrillator');
                        
                        const healFlash = document.getElementById('heal-flash');
                        if (healFlash) { healFlash.style.opacity = 1; setTimeout(() => healFlash.style.opacity = 0, 500); }
                        if (typeof updateUI === 'function') updateShopButtons(); 
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
            } // (Itt ér véget az "if (isInCone)" blokk!)
            // ==========================================

        } else {
         
            
// --- HA MESSZE VAGY TŐLE ---
            if (en.type === 'boss' && en.roarTimer > 0) {
                // A Boss itt nem csinál semmit, mert épp ordít
            } else {
                
                // ==========================================
                // ÚJ AI LOGIKA: MENEKÜLÉS (ZAVARZDOTTSÁG) ÚJRAÉLEDÉSKOR
                // ==========================================
                let targetPos = new THREE.Vector3(savedCamX, 0, camera.position.z);
                let enemyDir = new THREE.Vector3();
                
                if (invincibilityTimer > 0) {
                    // Ha a játékos épp újraéledt, a zombik megzavarodnak a szagtól!
                    // Kiszámoljuk az irányt a játékosTÓL elfelé
                    enemyDir.subVectors(en.mesh.position, targetPos).normalize();
                    // Opcionális: a zombik kicsit le is lassulnak a zavartság miatt
                    en.mesh.lookAt(en.mesh.position.x + enemyDir.x, 0, en.mesh.position.z + enemyDir.z);
                } else {
                    // Normál Támadás (Játékos FELÉ)
                    enemyDir.subVectors(targetPos, en.mesh.position).normalize();
                    en.mesh.lookAt(targetPos.x, 0, targetPos.z);
                }
                enemyDir.y = 0; 
                // ==========================================

                // FUTÁS ANIMÁCIÓ VISSZAKAPCSOLÁSA
                if (en.attackAction && en.currentAction !== en.runAction) {
                    en.attackAction.fadeOut(0.2);
                    en.runAction.reset().fadeIn(0.2).play();
                    en.currentAction = en.runAction;
                }
                
                let sep = new THREE.Vector3();
                for (let j = 0; j < enemies.length; j++) {
                    if (i !== j) {
                        let d = Math.hypot(en.mesh.position.x - enemies[j].mesh.position.x, en.mesh.position.z - enemies[j].mesh.position.z);
                        if (d < enemyRadius * 1.5 && d > 0.01) {
                            sep.add(new THREE.Vector3().subVectors(en.mesh.position, enemies[j].mesh.position).normalize().multiplyScalar((enemyRadius * 1.5 - d) * 0.05));
                        }
                    }
                }
                
                let mX = (enemyDir.x * en.speed) + sep.x; 
                let mZ = (enemyDir.z * en.speed) + sep.z;
                if (!checkWallCollision(en.mesh.position.x + mX, en.mesh.position.z, enemyRadius)) en.mesh.position.x += mX;
                if (!checkWallCollision(en.mesh.position.x, en.mesh.position.z + mZ, enemyRadius)) en.mesh.position.z += mZ;
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

// --- MEDKIT FELVÉTELE (CSAK A ZSEBBE MEGY!) ---
for (let i = medkits.length - 1; i >= 0; i--) { 
    const mk = medkits[i]; 
    mk.floatTime += 0.05; 
    mk.mesh.position.y = mk.startY + Math.sin(mk.floatTime) * 0.3; 
    
    if (Math.hypot(savedCamX - mk.mesh.position.x, camera.position.z - mk.mesh.position.z) < 1.5) { 
        
        // CSAK akkor vesszük fel, ha van hely a zsebünkben!
        if (playerMedkits < maxMedkits) {
            playerMedkits++;
            
            playSound('pickup'); // <--- AZ ÚJ HANG!
            
            // --- VIZUÁLIS KIÍRÁS ---
            const lootPopup = document.getElementById('loot-popup');
            if (lootPopup) {
                lootPopup.innerText = "+1 GEN-STAB BEGYŰJTVE";
                lootPopup.style.color = "#00ff00"; // Zöld szín a gyógyításnak
                lootPopup.style.textShadow = "0 0 10px #00ff00";
                
                // Animáció újraindítása (felugrik és eltűnik)
                lootPopup.style.transition = "none";
                lootPopup.style.opacity = 1;
                lootPopup.style.top = "60%";
                
                // Két tizedmásodperc múlva elindítjuk a felcsúszó, elhalványuló animációt
                setTimeout(() => {
                    lootPopup.style.transition = "opacity 1.5s, top 1.5s ease-out";
                    lootPopup.style.opacity = 0;
                    lootPopup.style.top = "50%";
                }, 50);
            }
            
            if (typeof updateUI === 'function') updateUI(); 
            scene.remove(mk.mesh); 
            medkits.splice(i, 1); 
        }
    }
}
    
 // --- LŐSZER FELVÉTELE ---
    for (let i = ammoBoxes.length - 1; i >= 0; i--) { 
        const ab = ammoBoxes[i]; 
        ab.floatTime += 0.05; 
        ab.mesh.position.y = ab.startY + Math.sin(ab.floatTime) * 0.2; 
        
        if (Math.hypot(savedCamX - ab.mesh.position.x, camera.position.z - ab.mesh.position.z) < 1.5) { 
            
            // ELENŐRZÉS: Van-e OLYAN fegyverünk, amibe még fér lőszer?
            let needsAmmo = false;
            for (let key in weapons) {
                if (weapons[key].owned && weapons[key].reserve < weapons[key].maxReserve) {
                    needsAmmo = true; break;
                }
            }

            // Ha tele van minden, BÉKÉN HAGYJUK a dobozt!
            if (needsAmmo) {
                playSound('pickup'); // <--- AZ ÚJ KUTATÓ/FELVEVŐ HANG
                
                const ammoFlash = document.getElementById('ammo-flash'); 
                if(ammoFlash) { ammoFlash.style.opacity = 1; setTimeout(() => ammoFlash.style.opacity = 0, 200); }
               
                // --- VIZUÁLIS KIÍRÁS (POP-UP) ---
                const lootPopup = document.getElementById('loot-popup');
                if (lootPopup) {
                    lootPopup.innerText = "+ LŐSZER BEGYŰJTVE";
                    lootPopup.style.color = "#ffcc00"; // Sárgás-narancs szín a lőszernek
                    lootPopup.style.textShadow = "0 0 10px #ffcc00";
                    
                    // Animáció újraindítása (felugrik és eltűnik)
                    lootPopup.style.transition = "none";
                    lootPopup.style.opacity = 1;
                    lootPopup.style.top = "60%";
                    
                    // Pici késleltetéssel elindítjuk a felcsúszó, elhalványuló animációt
                    setTimeout(() => {
                        lootPopup.style.transition = "opacity 1.5s, top 1.5s ease-out";
                        lootPopup.style.opacity = 0;
                        lootPopup.style.top = "50%";
                    }, 50);
                }

                if (typeof giveGlobalAmmo === 'function') giveGlobalAmmo();
    
                if (typeof updateUI === 'function') updateUI(); 
                scene.remove(ab.mesh); 
                ammoBoxes.splice(i, 1); 
            }
        } 
    }
    
// ==========================================
    // MUTÁNS NÖVÉNY (CSAPDA) LOGIKA
    // ==========================================
    for (let i = activePlants.length - 1; i >= 0; i--) {
        let plant = activePlants[i];
        if (plant.mixer) plant.mixer.update(delta); // Animáljuk a növényt

        // Ha a játékos 2.5 méteren belülre ér -> PUKKANÁS!
        let distToPlayer = Math.hypot(savedCamX - plant.x, camera.position.z - plant.z);
        if (distToPlayer < 2.5) {
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

            // AZONNALI SEBZÉS (-20 HP)
            playerHealth -= 20;
            
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

   // --- VÉR FRISSÍTÉSE ---
    for (let i = 0; i < bloodPool.length; i++) { 
        let p = bloodPool[i];
        if (p.active) {
            p.life -= delta * 1.5; 
            p.vy -= delta * 0.8; // Valósághűbb gravitáció
            
            p.mesh.position.x += p.vx; 
            p.mesh.position.y += p.vy; 
            p.mesh.position.z += p.vz; 
            
            // Padlóhoz érés (Ne essen át a pályán!)
            if (p.mesh.position.y <= 0.05) {
                p.mesh.position.y = 0.05; // Földön marad
                p.vx = 0; p.vy = 0; p.vz = 0; // Megáll
            }

            // Ahogy telik az idő, a vértócsa cseppjei összezsugorodnak
            if (p.life > 0) {
                p.mesh.scale.setScalar(Math.max(0.01, p.life));
            }

            // Ha lejárt az ideje, eltűnik a memóriába
            if (p.life <= 0) { 
                p.active = false; 
                p.mesh.visible = false; 
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
