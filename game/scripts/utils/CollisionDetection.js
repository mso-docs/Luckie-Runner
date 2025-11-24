/**
 * CollisionDetection - Utility class for handling collision detection
 * between different game entities
 */
class CollisionDetection {
    /**
     * Check if two rectangles are colliding (AABB collision)
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if colliding
     */
    static rectangleCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    /**
     * Check if two circles are colliding
     * @param {Object} circle1 - First circle {x, y, radius}
     * @param {Object} circle2 - Second circle {x, y, radius}
     * @returns {boolean} True if colliding
     */
    static circleCollision(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < circle1.radius + circle2.radius;
    }

    /**
     * Check if a point is inside a rectangle
     * @param {Object} point - Point {x, y}
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} True if point is inside rectangle
     */
    static pointInRectangle(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }

    /**
     * Get collision bounds for an entity
     * @param {Entity} entity - Game entity
     * @returns {Object} Collision bounds {x, y, width, height}
     */
    static getCollisionBounds(entity) {
        return {
            x: entity.x + (entity.collisionOffset?.x || 0),
            y: entity.y + (entity.collisionOffset?.y || 0),
            width: entity.collisionWidth || entity.width,
            height: entity.collisionHeight || entity.height
        };
    }

    /**
     * Check collision between two entities
     * @param {Entity} entity1 - First entity
     * @param {Entity} entity2 - Second entity
     * @returns {boolean} True if colliding
     */
    static entityCollision(entity1, entity2) {
        const bounds1 = this.getCollisionBounds(entity1);
        const bounds2 = this.getCollisionBounds(entity2);
        return this.rectangleCollision(bounds1, bounds2);
    }

    /**
     * Check if entity is on ground/platform
     * @param {Entity} entity - Entity to check
     * @param {Array} platforms - Array of platform objects
     * @returns {Object|null} Platform entity is standing on, or null
     */
    static checkGroundCollision(entity, platforms) {
        const entityBounds = this.getCollisionBounds(entity);
        const entityBottom = entityBounds.y + entityBounds.height;
        
        for (let platform of platforms) {
            const platformBounds = this.getCollisionBounds(platform);
            
            // Check if entity is above platform and overlapping horizontally
            if (entityBounds.x < platformBounds.x + platformBounds.width &&
                entityBounds.x + entityBounds.width > platformBounds.x &&
                entityBottom >= platformBounds.y &&
                entityBottom <= platformBounds.y + 10) { // 10px tolerance
                return platform;
            }
        }
        return null;
    }

    /**
     * Check collision with walls/solid objects
     * @param {Entity} entity - Entity to check
     * @param {Array} walls - Array of wall/solid objects
     * @returns {Object} Collision information {left, right, top, bottom}
     */
    static checkWallCollisions(entity, walls) {
        const collision = {
            left: false,
            right: false,
            top: false,
            bottom: false
        };

        const entityBounds = this.getCollisionBounds(entity);

        for (let wall of walls) {
            const wallBounds = this.getCollisionBounds(wall);
            
            if (this.rectangleCollision(entityBounds, wallBounds)) {
                // Determine collision direction based on overlap
                const overlapX = Math.min(
                    entityBounds.x + entityBounds.width - wallBounds.x,
                    wallBounds.x + wallBounds.width - entityBounds.x
                );
                const overlapY = Math.min(
                    entityBounds.y + entityBounds.height - wallBounds.y,
                    wallBounds.y + wallBounds.height - entityBounds.y
                );

                if (overlapX < overlapY) {
                    // Horizontal collision
                    if (entityBounds.x < wallBounds.x) {
                        collision.right = true;
                    } else {
                        collision.left = true;
                    }
                } else {
                    // Vertical collision
                    if (entityBounds.y < wallBounds.y) {
                        collision.bottom = true;
                    } else {
                        collision.top = true;
                    }
                }
            }
        }

        return collision;
    }

    /**
     * Calculate distance between two entities
     * @param {Entity} entity1 - First entity
     * @param {Entity} entity2 - Second entity
     * @returns {number} Distance between entities
     */
    static getDistance(entity1, entity2) {
        const dx = (entity1.x + entity1.width / 2) - (entity2.x + entity2.width / 2);
        const dy = (entity1.y + entity1.height / 2) - (entity2.y + entity2.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get angle between two entities (in radians)
     * @param {Entity} from - Source entity
     * @param {Entity} to - Target entity
     * @returns {number} Angle in radians
     */
    static getAngleBetween(from, to) {
        const dx = (to.x + to.width / 2) - (from.x + from.width / 2);
        const dy = (to.y + to.height / 2) - (from.y + from.height / 2);
        return Math.atan2(dy, dx);
    }
}