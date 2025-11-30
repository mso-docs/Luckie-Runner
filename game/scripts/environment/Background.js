/**
 * Background - Handles infinitely scrolling backgrounds with parallax support
 */
class Background {
    constructor(imagePath, speed = 0.5, y = 0, infiniteScroll = false) {
        this.image = new Image();
        this.image.src = imagePath;
        this.speed = speed;
        this.y = y;
        this.x = 0;
        this.loaded = false;
        this.infiniteScroll = infiniteScroll;
        this.scrollOffset = 0;
        
        this.image.onload = () => {
            this.loaded = true;
            // Background loaded
        };
        
        this.image.onerror = () => {
            // Failed to load background - using fallback
        };
    }
    
    update(cameraX, deltaTime = 16) {
        if (this.infiniteScroll) {
            // Independent infinite scrolling - moves continuously regardless of camera
            this.scrollOffset += this.speed * (deltaTime / 16); // Normalize to 60fps
            this.scrollOffset %= this.image.width; // Wrap around
        } else {
            // Parallax scrolling - follows camera movement
            this.x = -cameraX * this.speed;
        }
    }
    
    render(ctx, camera) {
        if (!this.loaded) return;
        
        const screenY = this.y - camera.y;
        let offsetX;
        
        if (this.infiniteScroll) {
            // Use independent scroll offset for infinite scrolling
            offsetX = -this.scrollOffset;
        } else {
            // Use parallax offset
            offsetX = this.x % this.image.width;
        }
        
        // Calculate how many tiles we need to cover the screen
        const tilesNeeded = Math.ceil(ctx.canvas.width / this.image.width) + 2;
        
        // Draw repeating background tiles
        for (let i = -1; i < tilesNeeded; i++) {
            const drawX = offsetX + i * this.image.width;
            
            ctx.drawImage(
                this.image,
                drawX,
                screenY,
                this.image.width,
                this.image.height
            );
        }
    }
}

/**
 * ProceduralBackground - Creates procedural backgrounds using canvas drawing
 */
class ProceduralBackground {
    constructor(width, height, speed = 0.5, y = 0, renderFunction) {
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.y = y;
        this.x = 0;
        this.renderFunction = renderFunction;
        this.scrollOffset = 0;
        
        // Create a canvas for this background layer
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        
        // Generate the background once
        if (this.renderFunction) {
            this.renderFunction(this.ctx, width, height);
        }
        
        // Procedural background created
    }
    
    update(cameraX, deltaTime = 16) {
        // Parallax scrolling - follows camera movement
        this.x = -cameraX * this.speed;
    }
    
    render(ctx, camera) {
        const screenY = this.y - camera.y;
        const offsetX = this.x % this.width;
        
        // Calculate how many tiles we need to cover the screen
        const tilesNeeded = Math.ceil(ctx.canvas.width / this.width) + 2;
        
        // Draw repeating background tiles
        for (let i = -1; i < tilesNeeded; i++) {
            const drawX = offsetX + i * this.width;
            
            ctx.drawImage(
                this.canvas,
                drawX,
                screenY,
                this.width,
                this.height
            );
        }
    }
}

/**
 * Background generation functions for Pacific coast theme
 */
class BackgroundGenerators {
    /**
     * Create a sunset sky gradient background
     */
    static createSunsetSky(ctx, width, height) {
        // Vary the gradient colors slightly each time
        const hueShift = Math.random() * 30 - 15; // ±15 degree hue shift
        
        // Create gradient from orange sunset to pink/purple
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, BackgroundGenerators.adjustHue('#FFB347', hueShift));    // Light orange at top
        gradient.addColorStop(0.3, BackgroundGenerators.adjustHue('#FF7F50', hueShift));  // Coral
        gradient.addColorStop(0.6, BackgroundGenerators.adjustHue('#FF6B6B', hueShift));  // Light pink
        gradient.addColorStop(0.8, BackgroundGenerators.adjustHue('#DDA0DD', hueShift));  // Plum
        gradient.addColorStop(1, BackgroundGenerators.adjustHue('#9370DB', hueShift));    // Medium purple
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add some wispy clouds with random positions
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const cloudCount = 6 + Math.floor(Math.random() * 4); // 6-9 clouds
        
        for (let i = 0; i < cloudCount; i++) {
            const x = (i * width / cloudCount) + Math.random() * 100 - 50;
            const y = height * (0.1 + Math.random() * 0.4); // Random height in upper portion
            const cloudWidth = 60 + Math.random() * 60;
            const cloudHeight = 15 + Math.random() * 20;
            
            BackgroundGenerators.drawCloud(ctx, x, y, cloudWidth, cloudHeight);
        }
    }
    
    /**
     * Create an ocean layer with waves
     */
    static createOcean(ctx, width, height) {
        // Ocean gradient with slight color variation
        const blueShift = Math.random() * 20 - 10;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, BackgroundGenerators.adjustHue('#4682B4', blueShift));    // Steel blue
        gradient.addColorStop(0.5, BackgroundGenerators.adjustHue('#5F9EA0', blueShift));  // Cadet blue
        gradient.addColorStop(1, BackgroundGenerators.adjustHue('#2F4F4F', blueShift));    // Dark slate gray
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add wave patterns with random characteristics
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        const waveCount = 3 + Math.floor(Math.random() * 2); // 3-4 wave layers
        
        for (let wave = 0; wave < waveCount; wave++) {
            ctx.beginPath();
            const waveY = height * (0.1 + wave * 0.25 + Math.random() * 0.1);
            const amplitude = 10 + Math.random() * 15 - wave * 2;
            const frequency = 0.015 + Math.random() * 0.01 + wave * 0.005;
            const phase = Math.random() * Math.PI * 2; // Random phase offset
            
            for (let x = 0; x <= width; x += 5) {
                const y = waveY + Math.sin(x * frequency + phase) * amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
    
    /**
     * Create rolling hills silhouette
     */
    static createHills(ctx, width, height) {
        // Vary hill colors slightly
        const greenShift = Math.random() * 30 - 15;
        const hillColor = BackgroundGenerators.adjustHue('#228B22', greenShift);
        
        ctx.fillStyle = hillColor;
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        // Generate rolling hills with random characteristics
        const hillSeed = Math.random() * 1000;
        const frequency1 = 0.003 + Math.random() * 0.004;
        const frequency2 = 0.008 + Math.random() * 0.006;
        const amplitude1 = height * (0.15 + Math.random() * 0.15);
        const amplitude2 = height * (0.05 + Math.random() * 0.1);
        
        for (let x = 0; x <= width; x += 10) {
            const hillHeight = height * 0.6 + 
                Math.sin((x + hillSeed) * frequency1) * amplitude1 + 
                Math.sin((x + hillSeed * 2) * frequency2) * amplitude2;
            ctx.lineTo(x, hillHeight);
        }
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        
        // Add some darker shading for depth
        const shadingColor = BackgroundGenerators.adjustHue('#006400', greenShift);
        const shadingGradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
        
        // Convert RGB to RGBA with transparency
        const shadingRgba = shadingColor.replace('rgb(', 'rgba(').replace(')', ', 0)');
        const shadingSemiRgba = shadingColor.replace('rgb(', 'rgba(').replace(')', ', 0.4)');
        
        shadingGradient.addColorStop(0, shadingRgba); // Transparent
        shadingGradient.addColorStop(1, shadingSemiRgba); // Semi-transparent
        
        ctx.fillStyle = shadingGradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        for (let x = 0; x <= width; x += 10) {
            const hillHeight = height * 0.6 + 
                Math.sin((x + hillSeed) * frequency1) * amplitude1 + 
                Math.sin((x + hillSeed * 2) * frequency2) * amplitude2;
            ctx.lineTo(x, hillHeight);
        }
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Create palm trees layer with procedural variation
     */
    static createPalmTrees(ctx, width, height) {
        // Starting palm tree generation
        
        // Fill background with transparent color first
        ctx.clearRect(0, 0, width, height);
        
        // Create a subtle atmospheric gradient for depth
        const atmosGradient = ctx.createLinearGradient(0, 0, 0, height);
        atmosGradient.addColorStop(0, 'rgba(255, 215, 0, 0.1)'); // Slight golden tint at top
        atmosGradient.addColorStop(1, 'rgba(139, 115, 85, 0.05)'); // Earthy tone at bottom
        ctx.fillStyle = atmosGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Variable spacing for natural distribution
        const baseSpacing = 100;
        const spacingVariation = 60;
        let currentX = 50; // Start with some offset
        
        const trees = [];
        
        // Generate tree positions with natural clustering
        while (currentX < width - 50) {
            const spacing = baseSpacing + (Math.random() - 0.5) * spacingVariation;
            currentX += spacing;
            
            // Sometimes create small clusters
            if (Math.random() < 0.3) { // 30% chance for cluster
                const clusterSize = 2 + Math.floor(Math.random() * 2); // 2-3 trees
                for (let j = 0; j < clusterSize; j++) {
                    trees.push({
                        x: currentX + j * (20 + Math.random() * 20),
                        distance: Math.random() // 0=front, 1=back (for layering)
                    });
                }
                currentX += clusterSize * 30;
            } else {
                trees.push({
                    x: currentX + Math.random() * 30 - 15,
                    distance: Math.random()
                });
            }
        }
        
        // Sort by distance (back to front) for proper layering
        trees.sort((a, b) => b.distance - a.distance);
        
        // Creating palm trees with layered depth
        
        trees.forEach((tree, i) => {
            // Vary tree characteristics based on distance
            const depthFactor = 0.7 + tree.distance * 0.3; // Trees further back are smaller
            const treeHeight = (180 + Math.random() * 120) * depthFactor;
            const lean = (Math.random() - 0.5) * 0.2;
            const alpha = 0.7 + tree.distance * 0.3; // Further trees are more faded
            
            // Position tree base at ground level
            const treeGroundY = height - 15;
            
            BackgroundGenerators.drawPalmTree(ctx, tree.x, treeGroundY, treeHeight, lean, alpha);
        });
        
        // Layered palm tree generation complete
    }
    
    /**
     * Adjust hue of a hex color
     */
    static adjustHue(hexColor, hueShift) {
        // Convert hex to HSL, adjust hue, convert back
        const rgb = BackgroundGenerators.hexToRgb(hexColor);
        if (!rgb) return hexColor;
        
        const hsl = BackgroundGenerators.rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl[0] = (hsl[0] + hueShift) % 360;
        if (hsl[0] < 0) hsl[0] += 360;
        
        const newRgb = BackgroundGenerators.hslToRgb(hsl[0], hsl[1], hsl[2]);
        return `rgb(${Math.round(newRgb[0])}, ${Math.round(newRgb[1])}, ${Math.round(newRgb[2])})`;
    }
    
    /**
     * Convert hex color to RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    /**
     * Convert RGB to HSL
     */
    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return [h * 360, s, l];
    }
    
    /**
     * Convert HSL to RGB
     */
    static hslToRgb(h, s, l) {
        h /= 360;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c/2;
        let r, g, b;
        
        if (h < 1/6) { r = c; g = x; b = 0; }
        else if (h < 2/6) { r = x; g = c; b = 0; }
        else if (h < 3/6) { r = 0; g = c; b = x; }
        else if (h < 4/6) { r = 0; g = x; b = c; }
        else if (h < 5/6) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }
    
    /**
     * Helper function to draw a cloud
     */
    static drawCloud(ctx, x, y, width, height) {
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.random() * 0.3; // Variable opacity
        
        // Draw multiple circles to create a cloud shape
        const circles = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < circles; i++) {
            const circleX = x + (i * width / circles) - width / 2 + (Math.random() - 0.5) * 20;
            const circleY = y + Math.sin(i) * height * 0.3 + (Math.random() - 0.5) * 10;
            const radius = width / circles + Math.random() * 15;
            
            ctx.beginPath();
            ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Helper function to draw a palm tree
     */
    static drawPalmTree(ctx, x, groundY, height, lean = 0, alpha = 1.0) {
        // Drawing palm tree
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Draw trunk with slight curve based on lean
        ctx.fillStyle = '#8B4513';  // Saddle brown
        const trunkWidth = 10 + Math.random() * 6; // Varied trunk width
        const segments = Math.floor(height / 12); // Smooth trunk segments
        
        for (let i = 0; i < segments; i++) {
            const segmentHeight = height / segments;
            const progress = i / segments;
            const currentX = x + lean * progress * 30;
            const currentY = groundY - i * segmentHeight;
            
            // Natural trunk tapering with slight bulge at base
            const baseBulge = i < segments * 0.1 ? 1.2 : 1.0;
            const currentWidth = trunkWidth * (1 - progress * 0.35) * baseBulge;
            
            // Add slight width variation for natural appearance
            const widthNoise = 1 + Math.sin(progress * Math.PI * 6) * 0.08;
            
            ctx.fillRect(
                currentX - (currentWidth * widthNoise)/2, 
                currentY - segmentHeight, 
                currentWidth * widthNoise, 
                segmentHeight
            );
        }
        
        // Add trunk texture with better detail
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        const textureSpacing = 15 + Math.random() * 8;
        
        for (let i = 0; i < height; i += textureSpacing) {
            const segmentProgress = i / height;
            const segmentX = x + lean * segmentProgress * 30;
            const currentWidth = trunkWidth * (1 - segmentProgress * 0.35);
            
            // Vary line opacity for more natural texture
            ctx.globalAlpha = alpha * (0.6 + Math.random() * 0.4);
            
            ctx.beginPath();
            ctx.moveTo(segmentX - currentWidth/2, groundY - i);
            ctx.lineTo(segmentX + currentWidth/2, groundY - i);
            ctx.stroke();
        }
        
        // Reset alpha for fronds
        ctx.globalAlpha = alpha;
        
        // Draw palm fronds with enhanced detail
        const frondCount = 8 + Math.floor(Math.random() * 4);
        ctx.strokeStyle = '#228B22';  // Forest green
        ctx.lineWidth = 4 + Math.random() * 2;
        ctx.lineCap = 'round';
        
        const treeTopX = x + lean * 30;
        const treeTopY = groundY - height;
        
        // Drawing fronds
        
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2 + Math.random() * 0.3;
            const frondLength = Math.max(60, height * 0.4 + Math.random() * 50);
            const droop = 0.05 + Math.random() * 0.2;
            
            const endX = treeTopX + Math.cos(angle) * frondLength;
            const endY = treeTopY + Math.sin(angle) * frondLength * droop;
            
            // Vary frond alpha slightly for depth
            ctx.globalAlpha = alpha * (0.8 + Math.random() * 0.2);
            
            // Draw main frond stem
            ctx.beginPath();
            ctx.moveTo(treeTopX, treeTopY);
            ctx.quadraticCurveTo(
                treeTopX + Math.cos(angle) * frondLength * 0.6,
                treeTopY + Math.sin(angle) * frondLength * 0.1,
                endX,
                endY
            );
            ctx.stroke();
            
            // Add frond leaflets for detail
            ctx.lineWidth = 2;
            const leafCount = Math.floor(frondLength / 15);
            
            for (let j = 0; j < leafCount; j++) {
                const leafProgress = (j + 1) / (leafCount + 1);
                const leafX = treeTopX + Math.cos(angle) * frondLength * leafProgress * 0.6;
                const leafY = treeTopY + Math.sin(angle) * frondLength * leafProgress * 0.1;
                
                const leafAngle = angle + (Math.random() - 0.5) * 0.6;
                const leafLength = 8 + Math.random() * 8;
                
                // Vary leaf alpha for more natural look
                ctx.globalAlpha = alpha * (0.6 + Math.random() * 0.4);
                
                ctx.beginPath();
                ctx.moveTo(leafX, leafY);
                ctx.lineTo(
                    leafX + Math.cos(leafAngle) * leafLength,
                    leafY + Math.sin(leafAngle) * leafLength
                );
                ctx.stroke();
                
                // Draw opposite side leaf
                ctx.beginPath();
                ctx.moveTo(leafX, leafY);
                ctx.lineTo(
                    leafX + Math.cos(leafAngle + Math.PI) * leafLength * 0.8,
                    leafY + Math.sin(leafAngle + Math.PI) * leafLength * 0.8
                );
                ctx.stroke();
            }
            
            // Reset line width for next frond
            ctx.lineWidth = 4 + Math.random() * 2;
        }
        
        ctx.restore();
        // Completed drawing palm tree
    }
}

/**
 * StylizedPlatform - Creates stylized platform graphics
 */
class StylizedPlatform {
    static defaultGroundTexture = 'art/bg/tiles/ground-plane.png';
    static townGroundTexture = 'art/bg/tiles/beach-cobble.png';
    static floatingTexture = 'art/bg/tiles/platform.png';
    static textureCache = {};
    static texturesPreloaded = false;

    static renderPlatform(ctx, platform, camera, game = null) {
        StylizedPlatform.preloadDefaults();
        const screenX = platform.x - camera.x;
        const screenY = platform.y - camera.y;

        // Only render if on screen
        if (screenX + platform.width >= 0 && screenX <= ctx.canvas.width &&
            screenY + platform.height >= 0 && screenY <= ctx.canvas.height) {

            if (platform.type === 'ground') {
                StylizedPlatform.drawGroundPlatform(ctx, screenX, screenY, platform.width, platform.height, game, platform.x);
            } else {
                StylizedPlatform.drawFloatingPlatform(ctx, screenX, screenY, platform.width, platform.height);
            }
        }
    }

    static preloadDefaults() {
        if (StylizedPlatform.texturesPreloaded) return;
        StylizedPlatform.getTexture(StylizedPlatform.defaultGroundTexture);
        StylizedPlatform.getTexture(StylizedPlatform.townGroundTexture);
        StylizedPlatform.getTexture(StylizedPlatform.floatingTexture);
        StylizedPlatform.texturesPreloaded = true;
    }

    static getGroundTexture(game = null, worldX = 0) {
        // Pick town override if inside a town region; otherwise use default
        let texturePath = StylizedPlatform.defaultGroundTexture;
        const townManager = game?.townManager;
        if (townManager && typeof townManager.getTownForPosition === 'function') {
            const town = townManager.getTownForPosition(game.currentLevelId, worldX);
            if (town) {
                texturePath = StylizedPlatform.townGroundTexture;
            }
        }
        return StylizedPlatform.getTexture(texturePath);
    }

    static getTexture(path) {
        if (!path) return null;
        if (StylizedPlatform.textureCache[path]) return StylizedPlatform.textureCache[path];
        const img = new Image();
        img.src = path;
        img.onload = () => { img._ready = true; };
        img.onerror = () => { img._failed = true; };
        StylizedPlatform.textureCache[path] = img;
        return img;
    }

    static drawTexturedPlatform(ctx, x, y, width, height, texture) {
        if (!texture || texture._failed) return false;
        if (!texture.complete && !texture.naturalWidth) return false;
        const scale = height / texture.height;
        const tileW = texture.width * scale;
        const tileH = height;
        const overlap = 1; // avoid hairline gaps from fractional widths
        ctx.imageSmoothingEnabled = false;
        for (let drawX = x; drawX < x + width; drawX += tileW) {
            const remaining = Math.min(tileW + overlap, x + width - drawX);
            ctx.drawImage(
                texture,
                0, 0,
                texture.width, texture.height,
                drawX, y,
                remaining, tileH
            );
        }
        return true;
    }

    static drawGroundPlatform(ctx, x, y, width, height, game = null, worldX = 0) {
        const texture = StylizedPlatform.getGroundTexture(game, worldX + width / 2);
        if (!StylizedPlatform.drawTexturedPlatform(ctx, x, y, width, height, texture)) {
            // Fallback procedural paint if texture not ready
            const groundGradient = ctx.createLinearGradient(0, y, 0, y + height);
            groundGradient.addColorStop(0, '#DEB887');  // Burlywood
            groundGradient.addColorStop(0.3, '#CD853F'); // Peru
            groundGradient.addColorStop(1, '#8B7355');   // Dark tan

            ctx.fillStyle = groundGradient;
            ctx.fillRect(x, y, width, height);

            ctx.fillStyle = '#9ACD32';  // Yellow green
            ctx.fillRect(x, y, width, 4);

            ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
            for (let i = 0; i < width; i += 20) {
                ctx.fillRect(x + i, y + height * 0.7, 2, height * 0.3);
            }

            ctx.strokeStyle = '#32CD32';  // Lime green
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + width, y);
            ctx.stroke();
        }
    }
    
    static drawFloatingPlatform(ctx, x, y, width, height) {
        const tex = StylizedPlatform.getTexture(StylizedPlatform.floatingTexture);
        const ready = tex && !tex._failed && (tex.complete || tex._ready || tex.naturalWidth);
        if (ready) {
            StylizedPlatform.drawTexturedPlatform(ctx, x, y, width, height, tex);
            return;
        }
        // If texture is still loading or failed, skip drawing rather than showing the wrong art
    }
}
