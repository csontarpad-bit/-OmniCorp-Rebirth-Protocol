var gameState = 'LOADING'; 
var highScore = 0;

var globalVolume = 1.0;
var globalBrightness = 1.0;
var mouseSensitivity = 0.003;

var isGodMode = false;

var playerHealth = 100;
var playerArmor = 0; 
var playerMedkits = 0; 
var maxMedkits = 3; 
var score = 0; 
var currentWave = 1;
var isWaveActive = false;
var enemiesToSpawn = 5;
var isReloading = false;
var bloodOpacity = 0;
var cameraShake = 0; 
// A "waveStartTime" környékére szúrd be ezeket:
var waveStartTime = 0;
var pauseStartTime = 0; 
var totalPausedTime = 0;   
var lastWaveBonus = 0;
var isShootingBtnPressed = false;
var autoShootTimer = 0;

// --- ÚJ: FEGYVEREK (Kiegészítve a 'level' és az 'image' tulajdonsággal) ---
var weapons = {
    pistol: { name: 'Pisztoly', level: 1, damage: 1, ammo: 10, reserve: 30, maxAmmo: 10, maxReserve: 30, pellets: 1, spread: 0, reloadTime: 1500, owned: true, auto: false, fireRate: 0, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/pisztoly.png" },
    shotgun: { name: 'Sörétes', level: 1, damage: 1.2, ammo: 0, reserve: 0, maxAmmo: 6, maxReserve: 24, pellets: 6, spread: 0.15, reloadTime: 2000, owned: false, auto: false, fireRate: 0, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/45abc3b3555b01cf93886d8560800ff7f3c5871c/sz%C3%B6r%C3%A9tes.png" },
    rifle: { name: 'Gépkarabély', level: 1, damage: 0.8, ammo: 0, reserve: 0, maxAmmo: 30, maxReserve: 90, pellets: 1, spread: 0.05, reloadTime: 1800, owned: false, auto: true, fireRate: 0.12, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/g%C3%A9gkarab%C3%A9ly.png" },
    super: { name: 'Szuper fegyver', level: 1, damage: 15, ammo: 0, reserve: 0, maxAmmo: 5, maxReserve: 15, pellets: 1, spread: 0, reloadTime: 2500, owned: false, auto: false, fireRate: 0, image: "https://raw.githubusercontent.com/csontarpad-bit/-OmniCorp-Rebirth-Protocol/df39681a8668bd04e80660051e5755ff31995ba7/revolver.png" }
};


// --- GLOBÁLIS LŐSZER UTÁNPÓTLÁS ÉS AUTOMATA TÁRAZÁS ---
window.giveGlobalAmmo = function() {
    for (let key in weapons) {
        let w = weapons[key];
        if (w.owned) {
            // 1. Tár (Clip) automatikus feltöltése a maxra!
            // Ha kevesebb lőszer volt a tárban, mint amennyi belefér, instant maxra rakjuk!
            if (w.ammo < w.maxAmmo) {
                w.ammo = w.maxAmmo;
            }

            // 2. Tartalék (Reserve) feltöltése +25%-kal
            let fillAmount = Math.ceil(w.maxReserve * 0.25);
            w.reserve = Math.min(w.maxReserve, w.reserve + fillAmount);
        }
    }
}

var currentWeaponId = 'pistol';

// --- ÚJ: KÉPESSÉGEK (Skills) RENDSZERE ---
var skills = {
    revive: { level: 0, maxLevel: 3, baseCost: 5000 },
    maxHealth: { level: 0, maxLevel: 5, baseCost: 1000 }, // Szintenként +20% HP
    speed: { level: 0, maxLevel: 5, baseCost: 1000 },     // Szintenként +20% Sebesség
    ammoLoot: { level: 0, maxLevel: 5, baseCost: 800 },   // Szintenként +20% Lőszer a dobozból
    healthLoot: { level: 0, maxLevel: 5, baseCost: 800 }, // Szintenként +20% Élet a medkitből
    freeze: { level: 0, maxLevel: 5, baseCost: 2000 }     // Szintenként +2 mp fagyasztás
};

var activeFreezeTimer = 0; // Hány másodpercig vannak lefagyva a zombik
var freezeCooldown = 0;    // Hány másodperc múlva használhatod újra

var currentDifficulty = 'medium';
var difficultySettings = {
    easy: { speed: 0.02, health: 2, damage: 0.2 },
    medium: { speed: 0.04, health: 3, damage: 0.4 },
    hard: { speed: 0.06, health: 4, damage: 0.8 }
};

var baseCamY = 1.6;
var velocityY = 0;
var gravity = 0.02;
var canJump = true;
var recoilPitch = 0;
var bobTime = 0;
var playerRadius = 0.5; 
var enemyRadius = 0.8; 
var damageCooldown = 0;
var invincibilityTimer = 0; // Éledés utáni sérthetetlenség

var moveX = 0, moveZ = 0, pitch = 0, yaw = 0;
var radarAngle = 0;

var enemies = [];
var enemyHitboxes = [];
var wallHitboxes = [];
var medkits = [];
var ammoBoxes = [];
var particles = [];
var radParticles = []; 
var toxicPuddles = []; 
var toxicTickTimer = 0; 

// --- ÚJ: HULLÁK ÉS POOLING TÖMBÖK ---
var deadBodies = []; // Ide kerülnek a földön fekvő hullák
var zombiePool = []; // Ide kerülnek a padlóba süllyedt, újrahasznosítható zombik

var scene, camera, renderer, clock, listener, muzzleFlash, playerLight;
var gunMixer, gunShootAction;
var zombieModel, zombieAnimations, ammoModel, healthModel;
var fastZombieModel, fastZombieAnimations;
var hiderZombieModel, hiderZombieAnimations;
var crawlerModel, crawlerAnimations;
var bossModel, bossAnimations;
var tankModel, tankAnimations;

var globalRaycaster = new THREE.Raycaster();

// --- ÚJ: OBJECT POOLS ---
var bloodPool = [];
var laserPool = [];

// --- ÚJ: MUTÁNS NÖVÉNY (FLESH BOMB) VÁLTOZÓK ---
var plantModel, plantAnimations;
var activePlants = []; 
var druggedTimer = 0;       // Meddig tart a drog hatás
var druggedTickTimer = 0;   // Másodperc számláló a sebzéshez
