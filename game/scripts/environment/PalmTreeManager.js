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

        // Begin loading sprite assets
        this.loadPalmSprites();
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
            
            // Cleanup trees behind viewport
            const viewportLeft = parallaxX - this.offscreenBuffer * 1.2;
            layer.trees = layer.trees.filter(tree => tree.x > viewportLeft);
        });
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
        
        // Draw sun in upper right area
        this.drawSun(ctx, w * 0.85, h * 0.12, 50);
        
        // Draw floating clouds with parallax
        this.drawClouds(ctx, camera, w, h, gameTime);
        
        // Distant mountains/hills silhouette with very slow parallax (0.1x)
        ctx.save();
        const mountainParallax = camera.x * 0.1;
        ctx.translate(-mountainParallax, 0);
        this.drawMountainSilhouettes(ctx, h * 0.45, h * 0.55, w, mountainParallax);
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
     * Draw sun in the sky
     */
    drawSun(ctx, x, y, radius) {
        ctx.save();
        
        // Draw sun glow
        const glowGradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2);
        glowGradient.addColorStop(0, 'rgba(255, 255, 150, 0.4)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 150, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw sun core
        const sunGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        sunGradient.addColorStop(0, '#ffff66');    // Bright yellow center
        sunGradient.addColorStop(0.7, '#ffdd44');  // Golden yellow
        sunGradient.addColorStop(1, '#ffbb33');    // Orange-yellow edge
        
        ctx.fillStyle = sunGradient;
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

            this.clouds.push({
                baseX,
                y,
                width,
                height,
                parallax,
                driftSpeed,
                blobs
            });
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
