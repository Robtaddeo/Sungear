/**
 * @author Dennis McDaid
 */

const DataReader = require('../../data/dataReader');
const SunGear = require('../sungear');


function AnchorDisplay(anchor) {
    this.anchor = anchor;       /** {Anchor} */
    this.highlight = false;
    this.select = false;
    this.showLongDesc = false;  /** True to show long anchor description, false for short */
    this.scale = 1;             /** {double} */
    this.textScale = 1;         /** {double} Scale for text size */
    this.angle = NaN;          /** {double} */

    var s = DataReader.trimAll(this.anchor.name.split(AnchorDisplay.NAME_SEPARATOR));
    this.shortDesc = s[0];      /** {String} Short anchor text for default display */
    this.longDesc = (s.length > 1) ? s[1] : this.shortDesc; /** @type String Long anchor text to display on rollover */
    this.vessels = [];          /** {Vector<VesselDisplay>} */
    this.shape = null;          /** {Shape} */
    this.position = null;       /** {Point2D.Double} */
    this.shit = true;
}

AnchorDisplay.NAME_SEPARATOR = ";";

AnchorDisplay.prototype = {
    constructor : AnchorDisplay,

    cleanup : function() {
        this.anchor.cleanup();
    },
    /** @param s {Number} */
    setScale : function(s) {
        this.scale = s;
        if(!isNaN(this.angle)) {
            this.setAngle(this.angle);
        }
    },
    /** @param s {double} */
    setTextScale : function(s) {
        this.textScale = s;
    },
    /**
     * @param theta {Number}
     */
    setAngle : function(theta) {
        this.angle = theta;
        this.position = {
            x: SunGear.R_CIRCLE * Math.cos(theta),
            y: SunGear.R_CIRCLE * Math.sin(theta)
        };
    },
    /** @return {double} */
    getAngle : function() {
        return this.angle;
    },
    /** @param b {boolean} */
    setHighlight : function(b) {
        this.highlight = b;
    },
    /** @return {boolean} */
    getHighlight : function() {
        return this.highlight;
    },
    /** @param b {boolean} */
    highlightVessels : function(b) {
        for (var i = 0; i < this.vessels.length; i++) {
            this.vessels[i].setHighlight(b);
        }
    },
    /** @param b {boolean} */
    setSelect : function(b) {
        this.select = b;
    },
    /**
     * @returns {boolean}
     */
    getSelect : function() {
        return this.select;
    },
    /** @param b of type boolean */
    setShowLongDesc : function(b) {
        this.showLongDesc = b;
    },
    /**
     * @returns {boolean}
     */
    isShowLongDesc : function() {
        return this.showLongDesc;
    },
    draw : function(p5, drawT) {
        var tx = drawT.x;
        var ty = drawT.y;
        var tm = Math.min(tx, ty);
        var scale = drawT.scale / 192.91666666666669;
        var off = 34*scale;

        p5.push();
        p5.textSize(18);
        p5.textAlign(p5.CENTER);
        p5.textFont("Helvetica");
        p5.noStroke();

        var l = this.showLongDesc ? this.longDesc : this.shortDesc;

        p5.translate(tx, ty);
        p5.rotate(this.angle);
        p5.translate(off + tm/1.3, 0);
        p5.rotate(this.angle < Math.PI ? -Math.PI/2.0 : Math.PI/2.0);
        p5.translate(-0.5, 7*scale);
        // var myVector = p5.createVector(tx, ty);
        // // myVector.rotate(this.angle);
        // myVector.x += off + tm/1.3;

        var getRotation = rotate(tx, ty, 0, 0, this.angle);

        if (this.shit) {
            this.shit = false;
            console.log(l);
            console.log(getRotation[0] + (off + tm/1.3));
            console.log(getRotation[1]);
        }

        if (p5.dist(p5.mouseX, p5.mouseY, getRotation[0], getRotation[1]) < scale*7*18) {
            if (p5.mouseIsPressed) {
                p5.fill(SunGear.C_SELECT);
                this.select = true;
                this.highlight = false;

            } else {
                p5.fill(SunGear.C_HIGHLIGHT);
                this.highlight = true;
                this.select = false;
            }
        } else {
            p5.fill(SunGear.C_PLAIN);
            this.select = false;
            this.highlight = false;
        }
        // p5.fill(this.select ? SunGear.C_SELECT : (this.highlight ? SunGear.C_HIGHLIGHT : SunGear.C_PLAIN));
        p5.text(l, 0, 0);
        p5.pop();
        // TODO: Continue implementation.
    },
    /**
     * @param p of type Point2D.Double
     * @returns {boolean}
     */
    contains : function(p) {
        if (this.shape === null) {
            return false;
        } else {
            var distX = p.x - this.shape.x;
            var distY = p.y - this.shape.y;
            var dist = Math.sqrt((distX*distX) + (distY*distY));
            return (dist < this.shape.w / 2);
        }
    },
    /**
     * @param a {AnchorDisplay}
     * @returns {boolean}
     */
    compareTo : function(a) {
        return this.anchor.compareTo(a.anchor);
    }
};

function rotate(cx, cy, x, y, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}

module.exports = AnchorDisplay;