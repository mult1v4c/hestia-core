// js/grid/virtualGrid.js

export class VirtualGrid {
    constructor(cols, rows, apps) {
        this.cols = cols;
        this.rows = rows;
        this.matrix = this.buildMatrix(apps);
    }

    buildMatrix(apps) {
        const m = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));

        for (const app of apps) {
            for (let r = 0; r < app.rows; r++) {
                for (let c = 0; c < app.cols; c++) {
                    const y = app.y + r - 1;
                    const x = app.x + c - 1;
                    if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) {
                        m[y][x] = app.id;
                    }
                }
            }
        }
        return m;
    }

    /**
     * Check if a specific area is empty.
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number|Array} excludeId - ID(s) to ignore (pretend they aren't there)
     */
    isAreaFree(x, y, w, h, excludeId = null) {
        const excludes = Array.isArray(excludeId) ? excludeId : [excludeId];

        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const targetY = y + r - 1;
                const targetX = x + c - 1;

                // Bounds check
                if (targetY >= this.rows || targetX >= this.cols || targetY < 0 || targetX < 0) return false;

                const cell = this.matrix[targetY][targetX];

                // If cell is occupied AND the occupant is NOT in our exclude list -> Collision
                if (cell !== null && !excludes.includes(cell)) {
                    return false;
                }
            }
        }
        return true;
    }

    getAppAt(x, y) {
        if (x < 1 || y < 1 || x > this.cols || y > this.rows) return null;
        return this.matrix[y - 1][x - 1];
    }
}