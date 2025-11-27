class Sign extends Entity {
    constructor(x, y, spriteSrc) {
        super(x, y, 40, 52);
        this.sprite = new Image();
        this.sprite.src = spriteSrc || 'art/items/sign.png';
        this.spriteLoaded = false;
        this.sprite.onload = () => { this.spriteLoaded = true; };
    }

  render(ctx, camera) {
    super.render(ctx, camera);
  }
}

if (typeof module !== 'undefined') {
    module.exports = Sign;
}
