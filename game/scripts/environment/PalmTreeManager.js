/**
 * PalmTreeManager - Stylized parallax palm tree background system
 * Multiple depth layers with different scroll speeds, colors, and spacing
 */
class PalmTreeManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        
        // Parallax layer configuration (back to front) - pixel art beach style
        this.layers = [
            {
                name: 'distant_mountains',
                scrollSpeed: 0.15,
                spacing: 1050,
                heightRange: [100, 140],
                brightness: 0.5,
                saturation: 0.6,
                alpha: 1,
                groundY: null,
                trees: []
            },
            {
                name: 'mid_background',
                scrollSpeed: 0.35,
                spacing: 820,
                heightRange: [150, 190],
                brightness: 0.65,
                saturation: 0.75,
                alpha: 1,
                groundY: null,
                trees: []
            },
            {
                name: 'near_midground',
                scrollSpeed: 0.6,
                spacing: 650,
                heightRange: [200, 260],
                brightness: 0.75,
                saturation: 0.9,
                alpha: 1,
                groundY: null,
                trees: []
            },
            {
                name: 'foreground',
                scrollSpeed: 0.85,
                spacing: 520,
                heightRange: [280, 350],
                brightness: 1,
                saturation: 1,
                alpha: 1,
                groundY: null,
                trees: []
            }
        ];
        
        this.lastGeneratedX = 0;
        this.enabled = true;
        this.clouds = []; // persistent cloud field
        this.offscreenBuffer = 900; // keep trees well offscreen to avoid pop-in

        // Palm sprite variants (loaded once)
        this.palmSpritePaths = [
            { key: 'palm', src: 'art/bg/palms/palm.png' },
            { key: 'tall', src: 'art/bg/palms/tall-palm.png' },
            { key: 'tall2', src: 'art/bg/palms/tall-palm-2.png' },
            { key: 'tall3', src: 'art/bg/palms/palm-3.png' }
        ];
        this.palmSprites = [];
        this.palmSpritesReady = false;
        this.spriteLoadAttempted = false;

        // Cloud sprites
        this.cloudSpritePaths = [
            { key: 'c1', src: 'art/bg/sky/clouds/cloud1.png' },
            { key: 'c2', src: 'art/bg/sky/clouds/cloud2.png' },
            { key: 'c3', src: 'art/bg/sky/clouds/cloud3.png' },
            { key: 'c4', src: 'art/bg/sky/clouds/cloud4.png' },
            { key: 'c5', src: 'art/bg/sky/clouds/cloud5.png' },
            { key: 'c6', src: 'art/bg/sky/clouds/cloud6.png' },
            { key: 'c7', src: 'art/bg/sky/clouds/cloud7.png' },
            { key: 'c8', src: 'art/bg/sky/clouds/cloud8.png' },
            { key: 'c9', src: 'art/bg/sky/clouds/cloud9.png' },
            { key: 'c10', src: 'art/bg/sky/clouds/cloud10.png' },
            { key: 'c11', src: 'art/bg/sky/clouds/cloud11.png' },
            { key: 'c12', src: 'art/bg/sky/clouds/cloud12.png' },
            { key: 'c13', src: 'art/bg/sky/clouds/cloud13.png' },
            { key: 'c14', src: 'art/bg/sky/clouds/cloud14.png' }
        ];
        this.cloudSprites = [];
        this.cloudSpritesReady = false;
        this.cloudSpriteLoadAttempted = false;

        // Bush sprites (drawn in front of palms, behind platforms)
        this.bushSpritePaths = [
            { key: 'bush1', src: 'art/bg/bushes/bush1.png' },
            { key: 'bush2', src: 'art/bg/bushes/bush2.png' },
            { key: 'bush3', src: 'art/bg/bushes/bush3.png' },
            { key: 'bush4', src: 'art/bg/bushes/bush4.png' },
            { key: 'bush5', src: 'art/bg/bushes/bush5.png' },
            { key: 'bush6', src: 'art/bg/bushes/bush6.png' },
            { key: 'bush7', src: 'art/bg/bushes/bush7.png' },
            { key: 'bush8', src: 'art/bg/bushes/bush8.png' },
            { key: 'bush9', src: 'art/bg/bushes/bush9.png' },
            { key: 'bush10', src: 'art/bg/bushes/bush10.png' },
            { key: 'bush11', src: 'art/bg/bushes/bush11.png' },
            { key: 'bush12', src: 'art/bg/bushes/bush12.png' },
            { key: 'bush13', src: 'art/bg/bushes/bush13.png' },
            { key: 'bush14', src: 'art/bg/bushes/bush14.png' },
            { key: 'bush15', src: 'art/bg/bushes/bush15.png' },
            { key: 'bush16', src: 'art/bg/bushes/bush16.png' },
            { key: 'bush17', src: 'art/bg/bushes/bush17.png' },
            { key: 'bush18', src: 'art/bg/bushes/bush18.png' },
            { key: 'bush19', src: 'art/bg/bushes/bush19.png' },
            { key: 'bush20', src: 'art/bg/bushes/bush20.png' },
            { key: 'bush21', src: 'art/bg/bushes/bush21.png' },
            { key: 'bush22', src: 'art/bg/bushes/bush22.png' },
            { key: 'bush23', src: 'art/bg/bushes/bush23.png' },
            { key: 'bush24', src: 'art/bg/bushes/bush24.png' },
            { key: 'bush25', src: 'art/bg/bushes/bush25.png' },
            { key: 'bush26', src: 'art/bg/bushes/bush26.png' },
            { key: 'bush27', src: 'art/bg/bushes/bush27.png' },
            { key: 'bush28', src: 'art/bg/bushes/bush28.png' },
            { key: 'bush29', src: 'art/bg/bushes/bush29.png' },
            { key: 'bush30', src: 'art/bg/bushes/bush30.png' },
            { key: 'bush31', src: 'art/bg/bushes/bush31.png' },
            { key: 'bush32', src: 'art/bg/bushes/bush32.png' },
            { key: 'bush33', src: 'art/bg/bushes/bush33.png' },
            { key: 'bush34', src: 'art/bg/bushes/bush34.png' },
            { key: 'bush35', src: 'art/bg/bushes/bush35.png' },
            { key: 'bush36', src: 'art/bg/bushes/bush36.png' }
        ];
        this.bushSprites = [];
        this.bushSpritesReady = false;
        this.bushSpriteLoadAttempted = false;
        this.bushes = [];
        this.bushLayer = {
            scrollSpeed: 0.78, // slightly closer than palms
            spacing: 280,
            y: null
        };

        // Sand texture
        this.sandTexture = { src: 'art/bg/ground/sand.png', img: null, ready: false, loading: false };

        // Mountain texture
        this.mountainTexture = null;
        this.mountainTextureReady = false;
        this.mountainTextureLoading = false;

        // Sky body textures (sun/moon)
        this.skyBodyTextures = {
            sun: { src: 'art/bg/sky/sun-moon/sun.png', img: null, ready: false, loading: false },
            moon: { src: 'art/bg/sky/sun-moon/moon.png', img: null, ready: false, loading: false }
        };
    }
    
    /**
     * Load palm sprite variants once
     */
    loadPalmSprites() {
        if (this.spriteLoadAttempted) return;
        this.spriteLoadAttempted = true;

        const pending = [];
        let loaded = 0;

        const finalize = () => {
            if (loaded < this.palmSpritePaths.length) return;
            // Keep only successfully loaded sprites
            this.palmSprites = pending.filter(entry => {
                const img = entry.img;
                return img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
            });
            // Fallback: if none loaded, keep whatever we tried so we at least attempt draws
            if (this.palmSprites.length === 0) {
                this.palmSprites = pending;
            }
            this.palmSpritesReady = this.palmSprites.length > 0;
        };

        this.palmSpritePaths.forEach(entry => {
            const img = new Image();
            img.onload = () => { loaded += 1; finalize(); };
            img.onerror = () => { loaded += 1; finalize(); };
            img.src = entry.src;
            pending.push({ key: entry.key, img });
        });
    }

    /**
     * Resolve which sky body to draw based on the current theme.
     */
    getSkyBodyFromTheme() {
        const themeId = this.game?.currentTheme;
        const registry = this.game?.worldBuilder?.themeRegistry;
        const theme = (registry && typeof registry.get === 'function') ? registry.get(themeId) : null;
        return (theme && theme.skyBody) ? theme.skyBody : 'sun';
    }

    /**
     * Get a loaded sky texture, triggering load if needed.
     */
    getSkyBodyTexture(body = 'sun') {
        this.loadSkyBodyTextures();
        const entry = this.skyBodyTextures[body];
        if (entry && entry.ready && entry.img && entry.img.complete && entry.img.naturalWidth > 0 && entry.img.naturalHeight > 0) {
            return entry.img;
        }
        return null;
    }

    /**
     * Get a sprite image for a given tree
     */
    getSpriteForTree(tree) {
        if (!this.palmSpritesReady || this.palmSprites.length === 0) return null;
        const sprite = this.palmSprites.find(s => s.key === tree.spriteKey) || this.palmSprites[0];
        return sprite?.img || null;
    }

    /**
     * Pick a random sprite key for a new tree
     */
    getRandomSpriteKey() {
        const keys = this.palmSpritePaths.map(p => p.key);
        if (keys.length === 0) return null;
        const idx = Math.floor(Math.random() * keys.length);
        return keys[idx];
    }
    
    /**
     * Initialize the palm tree system
     */
    initialize() {
        const canvasHeight = this.game.canvas.height;
        
        // Set ground levels for each layer - all on sand/beach area (below 70%)
        // Water ends at 70%, sand starts at 70%
        this.layers[0].groundY = canvasHeight * 0.72; // Distant - just on beach horizon
        this.layers[1].groundY = canvasHeight * 0.78; // Mid - on beach
        this.layers[2].groundY = canvasHeight * 0.88; // Near - on beach
        this.layers[3].groundY = canvasHeight - 60;   // Foreground - at ground level
        
        // Generate initial trees for each layer
        this.layers.forEach(layer => {
            layer.trees = [];
            this.generateLayerTrees(layer, -500, 2000);
        });

        // Build new cloud field
        this.generateCloudField(this.game.canvas.width, this.game.canvas.height);

        // Build bush field in front of palms (behind platforms)
        this.generateBushField(this.game.canvas.width, this.game.canvas.height);

        // Begin loading sprite assets
        this.loadPalmSprites();
        this.loadCloudSprites();
        this.loadBushSprites();
        this.loadSandTexture();
        this.loadMountainTexture();
        this.loadSkyBodyTextures();
    }
    
    /**
     * Update palm tree generation and cleanup for all layers
     */
    update(cameraX, canvasWidth) {
        if (!this.enabled) return;
        
        this.layers.forEach(layer => {
            const parallaxX = cameraX * layer.scrollSpeed;
            const viewportRight = parallaxX + canvasWidth + this.offscreenBuffer;
            
            // Generate new trees ahead
            const lastTreeX = layer.trees.length > 0 
                ? Math.max(...layer.trees.map(t => t.x))
                : -this.offscreenBuffer;
            
            if (viewportRight > lastTreeX) {
                this.generateLayerTrees(layer, lastTreeX, viewportRight + this.offscreenBuffer);
            }
        });

        // Update bush generation
        const bushParallaxX = cameraX * this.bushLayer.scrollSpeed;
        const bushViewportRight = bushParallaxX + canvasWidth + this.offscreenBuffer;
        const lastBushX = this.bushes.length > 0
            ? Math.max(...this.bushes.map(b => b.x))
            : -this.offscreenBuffer;
        if (bushViewportRight > lastBushX) {
            this.generateBushes(lastBushX, bushViewportRight + this.offscreenBuffer);
        }
    }
    
    /**
     * Generate trees for a specific layer in a range
     */
    generateLayerTrees(layer, startX, endX) {
        let currentX = startX + layer.spacing;
        
        while (currentX < endX) {
            const height = layer.heightRange[0] + 
                         Math.random() * (layer.heightRange[1] - layer.heightRange[0]);
            
            layer.trees.push({
                x: currentX,
                height: height,
                lean: (Math.random() - 0.5) * 0.15,
                swayPhase: Math.random() * Math.PI * 2,
                spriteKey: this.getRandomSpriteKey()
            });
            
            currentX += layer.spacing + Math.random() * 160 - 80; // Add wider variation while keeping average spacing
        }
    }
    
    /**
     * Render all palm tree layers with parallax scrolling
     */
    render(ctx, camera, gameTime) {
        if (!this.enabled) return;
        
        // Draw sky gradient and background elements (pass camera and gameTime for parallax and animation)
        this.drawSkyGradient(ctx, camera, gameTime);
        
        // Draw each layer from back to front
        this.layers.forEach(layer => {
            const parallaxOffset = camera.x * layer.scrollSpeed;
            
            layer.trees.forEach(tree => {
                const screenX = tree.x - parallaxOffset;
                
                // Only render visible trees
                if (screenX > -this.offscreenBuffer && screenX < ctx.canvas.width + this.offscreenBuffer) {
                    this.drawPalmTree(ctx, screenX, layer.groundY, tree.height, tree.lean, layer, tree);
                }
            });
        });

        // Bush layer (closer than palms, behind platforms)
        this.renderBushes(ctx, camera);
    }
    
    /**
     * Draw detailed pixel-art beach scene matching reference images
     */
    drawSkyGradient(ctx, camera, gameTime) {
        const h = ctx.canvas.height;
        const w = ctx.canvas.width;
        
        // Sky gradient - vibrant blue like reference image 1 (static, no parallax)
        const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.55);
        skyGradient.addColorStop(0, '#4da6ff');    // Bright sky blue at top
        skyGradient.addColorStop(0.5, '#6bb8ff');  // Mid blue
        skyGradient.addColorStop(1, '#a8d8ff');    // Lighter blue near horizon
        
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, w, h * 0.55);
        
        // Draw sky body (sun/moon) in upper right area
        this.drawSkyBody(ctx, w * 0.85, h * 0.12, 50);
        
        // Draw floating clouds with parallax
        this.drawClouds(ctx, camera, w, h, gameTime);
        
        // Distant mountains/hills silhouette with very slow parallax (0.1x)
        ctx.save();
        const mountainParallax = camera.x * 0.1;
        ctx.translate(-mountainParallax, 0);
        this.drawMountainLayer(ctx, h * 0.55, w, h);
        ctx.restore();
        
        // Ocean water - turquoise blue gradient (static background)
        const oceanGradient = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.7);
        oceanGradient.addColorStop(0, '#4db8e8');   // Turquoise at horizon
        oceanGradient.addColorStop(0.5, '#3da8d8'); // Medium blue
        oceanGradient.addColorStop(1, '#2d98c8');   // Deeper blue
        
        ctx.fillStyle = oceanGradient;
        ctx.fillRect(0, h * 0.55, w, h * 0.15);
        
        // Add ocean waves texture (with slight parallax and time-based animation)
        this.drawOceanWaves(ctx, h * 0.55, h * 0.7, camera, gameTime);
        
        // Beach sand gradient - warm golden tones extending to water edge
        const sandGradient = ctx.createLinearGradient(0, h * 0.68, 0, h);
        sandGradient.addColorStop(0, '#f0e4b5');   // Lightest sand at water edge
        sandGradient.addColorStop(0.15, '#f4d89f'); // Light golden sand
        sandGradient.addColorStop(0.5, '#e8c878');  // Medium sand
        sandGradient.addColorStop(1, '#d8b868');    // Warm sand at bottom
        
        ctx.fillStyle = sandGradient;
        ctx.fillRect(0, h * 0.68, w, h * 0.32);

        // Overlay sand texture for detail
        this.drawSandTexture(ctx, h * 0.68, h, camera);
    }

    /**
     * Ensure the coastal mountain texture is loaded once.
     */
    loadMountainTexture() {
        if (this.mountainTextureLoading || this.mountainTextureReady) return;
        this.mountainTextureLoading = true;

        const img = new Image();
        img.onload = () => {
            this.mountainTextureReady = true;
            this.mountainTextureLoading = false;
        };
        img.onerror = () => {
            this.mountainTextureReady = false;
            this.mountainTextureLoading = false;
        };
        img.src = 'art/bg/mountains/coastal-mountains.png';
        this.mountainTexture = img;
    }

    /**
     * Load sun/moon textures once.
     */
    loadSkyBodyTextures() {
        Object.keys(this.skyBodyTextures).forEach(key => {
            const entry = this.skyBodyTextures[key];
            if (!entry || entry.loading || entry.ready) return;
            entry.loading = true;
            const img = new Image();
            img.onload = () => { entry.ready = true; entry.loading = false; };
            img.onerror = () => { entry.ready = false; entry.loading = false; };
            img.src = entry.src;
            entry.img = img;
        });
    }

    /**
     * Load sand texture once.
     */
    loadSandTexture() {
        const entry = this.sandTexture;
        if (!entry || entry.loading || entry.ready) return;
        entry.loading = true;
        const img = new Image();
        img.onload = () => { entry.ready = true; entry.loading = false; };
        img.onerror = () => { entry.ready = false; entry.loading = false; };
        img.src = entry.src;
        entry.img = img;
    }

    /**
     * Load cloud sprite variants once so clouds can pick random textures.
     */
    loadCloudSprites() {
        if (this.cloudSpriteLoadAttempted) return;
        this.cloudSpriteLoadAttempted = true;
        const pending = [];
        let loaded = 0;

        const finalize = () => {
            if (loaded < this.cloudSpritePaths.length) return;
        this.cloudSprites = pending.filter(entry => entry.img && entry.img.complete && entry.img.naturalWidth > 0 && entry.img.naturalHeight > 0);
        if (this.cloudSprites.length === 0) {
            this.cloudSprites = pending;
        }
        this.cloudSpritesReady = this.cloudSprites.length > 0;
    };

    this.cloudSpritePaths.forEach(entry => {
        const img = new Image();
        img.onload = () => { loaded += 1; finalize(); };
        img.onerror = () => { loaded += 1; finalize(); };
        img.src = entry.src;
        pending.push({ key: entry.key, img });
    });
}

    /**
     * Load bush sprite variants once so we can place them along the sand.
     */
    loadBushSprites() {
        if (this.bushSpriteLoadAttempted) return;
        this.bushSpriteLoadAttempted = true;
        const pending = [];
        let loaded = 0;

        const finalize = () => {
            if (loaded < this.bushSpritePaths.length) return;
            this.bushSprites = pending.filter(entry => entry.img && entry.img.complete && entry.img.naturalWidth > 0 && entry.img.naturalHeight > 0);
            if (this.bushSprites.length === 0) {
                this.bushSprites = pending;
            }
            this.bushSpritesReady = this.bushSprites.length > 0;
        };

        this.bushSpritePaths.forEach(entry => {
            const img = new Image();
            img.onload = () => { loaded += 1; finalize(); };
            img.onerror = () => { loaded += 1; finalize(); };
            img.src = entry.src;
            pending.push({ key: entry.key, img });
        });
    }

    /**
     * Pick a random cloud sprite image.
     */
    getRandomCloudSprite() {
        if (!this.cloudSpritesReady || this.cloudSprites.length === 0) return null;
        const idx = Math.floor(Math.random() * this.cloudSprites.length);
        return this.cloudSprites[idx]?.img || null;
    }

    /**
     * Draw the mountain layer using the coastal-mountains tile, falling back to silhouettes if not ready.
     */
    drawMountainLayer(ctx, baseY, canvasWidth, canvasHeight) {
        if (!this.mountainTextureReady || !this.mountainTexture || !this.mountainTexture.complete) {
            // Ensure load is kicked off even if render hits first.
            this.loadMountainTexture();
            this.drawMountainSilhouettes(ctx, canvasHeight * 0.45, baseY, canvasWidth, 0);
            return;
        }

        const img = this.mountainTexture;
        const naturalWidth = img.naturalWidth || img.width || 1;
        const naturalHeight = img.naturalHeight || img.height || 1;

        // Scale to occupy the same band as the old silhouettes.
        const targetHeight = canvasHeight * 0.22;
        const scale = targetHeight / naturalHeight;
        const targetWidth = naturalWidth * scale;

        // Overlap tiles slightly to hide seams from subpixel scaling.
        const tileWidth = Math.ceil(targetWidth);
        const overlap = 2;
        const step = tileWidth - overlap;

        // Draw wide enough to cover parallax translation.
        const startX = -500;
        const extendedWidth = canvasWidth + 1000;
        const tiles = Math.ceil((extendedWidth + overlap) / step) + 2;

        for (let i = -1; i < tiles; i++) {
            const drawX = startX + i * step;
            ctx.drawImage(img, drawX, baseY - targetHeight, tileWidth, targetHeight);
        }
    }
    
    /**
     * Draw stylized mountain silhouettes in background
     */
    drawMountainSilhouettes(ctx, startY, endY, canvasWidth, parallaxOffset) {
        ctx.fillStyle = '#5a8c7a';
        
        // Draw wider to cover parallax scrolling
        const extendedWidth = canvasWidth + 1000;
        const mountainHeight = 80;
        const peaks = 6;
        const peakSpacing = extendedWidth / peaks;
        
        ctx.beginPath();
        ctx.moveTo(-500, endY);
        
        // Create consistent mountain peaks (not random per frame)
        for (let i = 0; i <= peaks; i++) {
            const x = -500 + (peakSpacing * i);
            // Use deterministic height based on position
            const heightFactor = Math.sin(i * 0.8) * 0.5 + 0.5;
            const peakY = startY - (mountainHeight * heightFactor);
            
            if (i > 0) {
                const prevX = -500 + (peakSpacing * (i - 1));
                ctx.quadraticCurveTo(
                    prevX + peakSpacing * 0.5,
                    startY,
                    x,
                    peakY
                );
            } else {
                ctx.lineTo(x, peakY);
            }
        }
        
        ctx.lineTo(extendedWidth, endY);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Draw stylized ocean wave patterns
     */
    drawOceanWaves(ctx, startY, endY, camera, gameTime) {
        const w = ctx.canvas.width;
        const waveHeight = 8;
        const time = gameTime * 0.0005; // Slow animation speed
        const waveParallax = camera.x * 0.05; // Very subtle wave movement
        const timeOffset = time * 40; // Move waves horizontally over time
        
        // Light foam waves
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        for (let row = 0; row < 3; row++) {
            ctx.beginPath();
            const baseY = startY + (endY - startY) * (row / 3);
            const verticalWave = Math.sin(time * 2 + row * 0.5) * 2; // Vertical sway
            const y = baseY + waveHeight + verticalWave;
            
            // Extend wave pattern for scrolling
            for (let x = -100; x < w + 100; x += 40) {
                const offsetX = x - (waveParallax % 40) - (timeOffset % 40);
                ctx.moveTo(offsetX, y);
                ctx.quadraticCurveTo(offsetX + 10, y - waveHeight, offsetX + 20, y);
                ctx.quadraticCurveTo(offsetX + 30, y + waveHeight, offsetX + 40, y);
            }
            ctx.stroke();
        }
    }

    /**
     * Draw tiled sand texture over the beach area.
     */
    drawSandTexture(ctx, startY, endY, camera) {
        this.loadSandTexture();
        const entry = this.sandTexture;
        if (!entry || !entry.ready || !entry.img || !entry.img.complete || entry.img.naturalWidth === 0) {
            return; // fallback to gradient only
        }

        const img = entry.img;
        const tileW = img.naturalWidth || img.width || 128;
        const tileH = img.naturalHeight || img.height || 128;
        const targetH = Math.min(tileH, (endY - startY) * 0.7);
        const scale = targetH / tileH;
        const drawW = tileW * scale;
        const drawH = tileH * scale;

        const parallax = camera.x * 0.2;
        const offsetX = -parallax % drawW;

        for (let y = startY; y < endY + drawH; y += drawH) {
            for (let x = offsetX - drawW; x < ctx.canvas.width + drawW; x += drawW) {
                ctx.drawImage(img, x, y, drawW, drawH);
            }
        }
    }
    
    /**
     * Draw the configured sky body (sun by default, moon when theme asks)
     */
    drawSkyBody(ctx, x, y, radius) {
        ctx.save();

        const skyBody = this.getSkyBodyFromTheme();
        const texture = this.getSkyBodyTexture(skyBody);
        const size = radius * 2.2; // Slightly larger than the old drawn sun
        const isMoon = skyBody === 'moon';

        // Glow/halo behind the sprite
        const glowRadius = radius * (isMoon ? 2.4 : 2.8);
        const glowGradient = ctx.createRadialGradient(x, y, glowRadius * 0.35, x, y, glowRadius);
        if (isMoon) {
            glowGradient.addColorStop(0, 'rgba(210, 225, 255, 0.35)');
            glowGradient.addColorStop(0.6, 'rgba(190, 210, 245, 0.2)');
            glowGradient.addColorStop(1, 'rgba(180, 200, 235, 0)');
        } else {
            glowGradient.addColorStop(0, 'rgba(255, 245, 180, 0.45)');
            glowGradient.addColorStop(0.6, 'rgba(255, 225, 140, 0.25)');
            glowGradient.addColorStop(1, 'rgba(255, 210, 120, 0)');
        }
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        if (texture) {
            // Center the sprite on x/y
            ctx.drawImage(texture, x - size / 2, y - size / 2, size, size);
            ctx.restore();
            return;
        }
        
        // Fallback: draw stylized sun/moon core
        const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        if (isMoon) {
            coreGradient.addColorStop(0, '#f5f7ff');   // Pale moon center
            coreGradient.addColorStop(0.7, '#d9e2ff'); // Cool edge
            coreGradient.addColorStop(1, '#b3c2ff');   // Dim outer edge
        } else {
            coreGradient.addColorStop(0, '#ffff66');    // Bright yellow center
            coreGradient.addColorStop(0.7, '#ffdd44');  // Golden yellow
            coreGradient.addColorStop(1, '#ffbb33');    // Orange-yellow edge
        }
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Generate a persistent cloud field so shapes don't flicker frame to frame
     */
    generateCloudField(canvasWidth = 1600, canvasHeight = 900) {
        this.clouds = [];
        const count = 8;
        const span = canvasWidth + 800;
        const baseYMin = canvasHeight * 0.10;
        const baseYMax = canvasHeight * 0.30;
        const minSpacing = 140; // soften clumping by keeping clouds apart

        const generated = [];
        for (let i = 0; i < count; i++) {
            const width = 110 + Math.random() * 70;
            const height = width * 0.3;
            const baseX = -400 + Math.random() * span;
            const y = baseYMin + Math.random() * (baseYMax - baseYMin);
            const parallax = 0.01 + Math.random() * 0.015; // very slow parallax
            const driftSpeed = 3 + Math.random() * 2; // px/sec rightward

            // Precompute blob layout for consistent shapes
            const blobs = [];
            const blobCount = 4 + Math.floor(Math.random() * 3);
            for (let b = 0; b < blobCount; b++) {
                const offsetX = (Math.random() * 0.9 - 0.45) * width;
                const offsetY = (Math.random() * 0.5 - 0.25) * height;
                const radius = width * (0.18 + Math.random() * 0.12);
                blobs.push({ x: offsetX, y: offsetY, r: radius });
            }

            generated.push({
                baseX,
                y,
                width,
                height,
                parallax,
                driftSpeed,
                blobs,
                sprite: this.getRandomCloudSprite()
            });
        }

        // Sort and enforce spacing to avoid obvious clumping while keeping count.
        generated.sort((a, b) => a.baseX - b.baseX);
        for (let i = 1; i < generated.length; i++) {
            const prev = generated[i - 1];
            const cur = generated[i];
            const requiredGap = Math.max(minSpacing, (prev.width + cur.width) * 0.6);
            if (cur.baseX - prev.baseX < requiredGap) {
                cur.baseX = prev.baseX + requiredGap;
            }
        }

        this.clouds = generated;
    }

    /**
     * Generate a lush bush field that sits in front of palms but behind platforms.
     */
    generateBushField(canvasWidth = 1600, canvasHeight = 900) {
        this.bushes = [];
        // Position bushes along the sand, slightly above ground line
        // Overlap the ground platform a bit so bushes feel embedded
        this.bushLayer.y = canvasHeight - 45;
        const spacing = this.bushLayer.spacing;
        const startX = -600;
        const endX = canvasWidth + 1200;
        this.generateBushes(startX, endX);
    }

    /**
     * Generate additional bushes in a range.
     */
    generateBushes(startX, endX) {
        let currentX = startX + this.bushLayer.spacing;
        const minSpacing = 25; // never closer than 25px

        while (currentX < endX) {
            const sprite = this.getRandomBushSprite();
            const naturalWidth = sprite?.naturalWidth || sprite?.width || 160;
            const naturalHeight = sprite?.naturalHeight || sprite?.height || 90;
            const targetHeight = 60 + Math.random() * 40; // 60-100px tall
            const scale = targetHeight / naturalHeight;
            const height = naturalHeight * scale;
            const width = naturalWidth * scale;

            this.bushes.push({
                x: currentX + (Math.random() * 60 - 30),
                width,
                height,
                sprite,
                scale
            });

            const gap = spacing => spacing + Math.random() * 110 - 40;
            currentX += Math.max(minSpacing, gap(this.bushLayer.spacing));
        }
    }
    
    /**
     * Draw clouds with parallax scrolling
     */
    drawClouds(ctx, camera, canvasWidth, canvasHeight, gameTime) {
        ctx.save();

        // Rebuild if missing (defensive for dynamic canvas sizes)
        if (this.clouds.length === 0) {
            this.generateCloudField(canvasWidth, canvasHeight);
        }

        const wrapSpan = canvasWidth + 800;

        this.clouds.forEach(cloud => {
            const drift = (gameTime / 1000) * cloud.driftSpeed; // always move right
            const parallaxOffset = camera.x * cloud.parallax;

            let screenX = cloud.baseX + drift - parallaxOffset;
            screenX = ((screenX + wrapSpan) % wrapSpan) - 400;

            if (!cloud.sprite && this.cloudSpritesReady) {
                cloud.sprite = this.getRandomCloudSprite();
            }

            if (screenX > -cloud.width && screenX < canvasWidth + cloud.width) {
                this.drawCloud(ctx, screenX, cloud.y, cloud);
            }
        });

        ctx.restore();
    }
    
    /**
     * Draw a single fluffy cloud
     */
    drawCloud(ctx, x, y, cloud) {
        ctx.save();
        const sprite = (cloud && this.cloudSpritesReady) ? cloud.sprite : null;

        if (sprite && sprite.complete && sprite.naturalWidth > 0 && sprite.naturalHeight > 0) {
            // Scale sprite to the procedural cloud's size to preserve spacing/density.
            ctx.drawImage(sprite, x - cloud.width * 0.5, y - cloud.height * 0.5, cloud.width, cloud.height);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';

            // Draw precomputed blobs for a stable fluffy shape
            cloud.blobs.forEach(blob => {
                ctx.beginPath();
                ctx.arc(
                    x + blob.x,
                    y + blob.y,
                    blob.r,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });
        }
        
        ctx.restore();
    }

    /**
     * Get a random bush sprite.
     */
    getRandomBushSprite() {
        this.loadBushSprites();
        if (!this.bushSpritesReady || this.bushSprites.length === 0) return null;
        const idx = Math.floor(Math.random() * this.bushSprites.length);
        return this.bushSprites[idx]?.img || null;
    }

    /**
     * Render bushes with parallax in front of palms.
     */
    renderBushes(ctx, camera) {
        if (!this.bushes.length) return;
        const parallaxOffset = camera.x * this.bushLayer.scrollSpeed;

        this.bushes.forEach(bush => {
            const screenX = bush.x - parallaxOffset;
            if (screenX > -this.offscreenBuffer && screenX < ctx.canvas.width + this.offscreenBuffer) {
                this.drawBush(ctx, screenX, this.bushLayer.y, bush);
            }
        });
    }

    /**
     * Draw a single bush sprite.
     */
    drawBush(ctx, x, groundY, bush) {
        const sprite = bush.sprite || this.getRandomBushSprite();
        if (!sprite) return;

        const height = bush.height;
        const width = bush.width;
        const drawX = x - width / 2;
        const drawY = groundY - height;

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(sprite, drawX, drawY, width, height);
        ctx.restore();
    }
    
    /**
     * Draw a single stylized palm tree
     */
    drawPalmTree(ctx, x, groundY, height, lean, layer, tree) {
        const sprite = this.getSpriteForTree(tree);
        if (!sprite) return;

        const naturalHeight = sprite.naturalHeight || sprite.height || 1;
        const naturalWidth = sprite.naturalWidth || sprite.width || 1;
        const scale = height / naturalHeight;
        const drawWidth = naturalWidth * scale;
        const drawHeight = height;

        // Offset lean subtly to keep bases on the ground
        const leanOffset = (lean || 0) * height * 0.3;
        const drawX = x + leanOffset - drawWidth / 2;
        const drawY = groundY - drawHeight;

        ctx.save();
        ctx.globalAlpha *= layer.alpha ?? 1;
        ctx.filter = `brightness(${layer.brightness ?? 1}) saturate(${layer.saturation ?? 1})`;
        ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
    }
    
    /**
     * Reset the palm tree system
     */
    reset() {
        this.layers.forEach(layer => {
            layer.trees = [];
        });
        this.bushes = [];
        this.initialize();
    }
    
    /**
     * Enable or disable palm tree system
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.layers.forEach(layer => layer.trees = []);
        } else {
            this.initialize();
        }
    }
    
    /**
     * Check if system is enabled
     */
    isEnabled() {
        return this.enabled;
    }
}
