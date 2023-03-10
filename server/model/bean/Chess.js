class Coor {

    constructor (x, y) {
        this.x = x
        this.y = y
    }

}

class Chess {

    constructor (type, x, y) {
        this.type = type
        this.coor = new Coor(x, y)
    }

    getType () {
        return this.type
    }

    getCoor () {
        return this.coor
    }

}

module.exports = Chess
