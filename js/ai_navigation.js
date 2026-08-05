// ==========================================
// OMNICORP AI NAVIGÁCIÓS RENDSZER (PRO)
// Sűrű háló (81 pont), Távolságszűrés és Időzített AI
// ==========================================

const AINavigation = {
    waypoints: [],
    debugMode: false, // Zöld gömbök be/ki
    debugMeshes: [],

    init: function() {
        this.waypoints = [];
        
        // --- EXTRA SŰRŰ HÁLÓ (Labirintus mód) ---
        // -20-tól +20-ig, minden 5 méteren lesz egy pont (9x9 = 81 pont)
        for (let x = -20; x <= 20; x += 5) {
            for (let z = -20; z <= 20; z += 5) {
                // Az oszlopokat kivonjuk: a 10 és -10 koordináták metszéspontjait
                if ((Math.abs(x) === 10 && Math.abs(z) === 10) || 
                    (Math.abs(x) === 10 && Math.abs(z) === 5) || 
                    (Math.abs(x) === 5 && Math.abs(z) === 10)) {
                    // Kiterjesztettük a tiltott zónát az oszlopok körül, hogy ne lógjon be a falba a pont
                    continue; 
                }
                this.waypoints.push(new THREE.Vector3(x, 0, z));
            }
        }
        
        console.log(`[KRONOS] AI Navigáció: ${this.waypoints.length} csomópont kalibrálva.`);
        setTimeout(() => this.drawDebug(), 1000); 
    },

    drawDebug: function() {
        if (!this.debugMode || typeof scene === 'undefined') return;
        
        const geo = new THREE.SphereGeometry(0.3, 8, 8); // Kisebb gömbök, hogy ne takarjanak ki mindent
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.3 });
        
        for (let wp of this.waypoints) {
            let mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(wp);
            mesh.position.y = 1.0; 
            scene.add(mesh);
            this.debugMeshes.push(mesh);
        }
    },

    hasLineOfSight: function(startPos, endPos, padding = 0.8) {
        let dir = new THREE.Vector3().subVectors(endPos, startPos);
        let dist = dir.length();
        dir.normalize();
        
        let steps = Math.floor(dist / 0.5); 
        for (let i = 1; i <= steps; i++) {
            let checkX = startPos.x + dir.x * (i * 0.5);
            let checkZ = startPos.z + dir.z * (i * 0.5);
            if (typeof checkWallCollision === 'function' && checkWallCollision(checkX, checkZ, padding)) {
                return false; 
            }
        }
        return true; 
    },

    getBestDirection: function(enemy, playerPos) {
        let dir = new THREE.Vector3();
        let enemyPos = enemy.mesh.position;

        // FÁZIS 1: Ha tisztán lát, azonnal a játékos felé fordul
        if (this.hasLineOfSight(enemyPos, playerPos, 0.5)) {
            enemy.currentWaypoint = null;
            return dir.subVectors(playerPos, enemyPos).normalize();
        }

        // FÁZIS 2: Ha már van kiválasztott célpontja a memóriájában
        if (enemy.currentWaypoint) {
            let distToWP = enemyPos.distanceTo(enemy.currentWaypoint);
            
            // Ha kb. 2 méterre van, "odaértnek" tekintjük, elengedi
            if (distToWP < 2.0 || !this.hasLineOfSight(enemyPos, enemy.currentWaypoint, 0.2)) {
                enemy.currentWaypoint = null;
            } else {
                return dir.subVectors(enemy.currentWaypoint, enemyPos).normalize();
            }
        }

        // FÁZIS 3: Célpont keresése (OPTIMALIZÁLVA!)
        let bestDist = Infinity;
        let bestTarget = null;

        for (let wp of this.waypoints) {
            
            // OPTIMALIZÁCIÓ 1: Távolság szűrés (Spatial Hashing alap)
            // Csak azokkal a pontokkal foglalkozunk, amik maximum 15 méterre vannak a zombitól.
            // A túl messzi pontokra a CPU el sem indítja a Raycast (Látóvonal) vizsgálatot!
            let distFromEnemy = wp.distanceTo(enemyPos);
            if (distFromEnemy > 15.0 || distFromEnemy < 1.5) continue; 

            // Látja-e a zombi az adott (közeli) pontot tisztán?
            if (this.hasLineOfSight(enemyPos, wp, 0.2)) { 
                
                let distToPlayer = wp.distanceTo(playerPos);
                
                // Még mindig közelebb kell vinnie a játékoshoz
                if (this.hasLineOfSight(wp, playerPos, 0.2)) {
                    distToPlayer -= 5.0; // Bónusz pont, ha a sarokból már látni a játékost
                }
                
                if (distToPlayer < bestDist) {
                    bestDist = distToPlayer;
                    bestTarget = wp;
                }
            }
        }

        if (bestTarget) {
            enemy.currentWaypoint = bestTarget;
            return dir.subVectors(bestTarget, enemyPos).normalize();
        }

        return dir.subVectors(playerPos, enemyPos).normalize();
    }
};

// Automatikus inicializálás, amikor a fájl betölt
window.addEventListener('load', () => {
    AINavigation.init();
});