var Map = require('../tools/Map.js')
const { POS_TYPE } = require('../model/enums/constants.js')

class Score {

    constructor (tableId, custom) {
        this.tableId = tableId
        this.custom = custom
        this.scoreInfo = new Map()
        this.scoreInfo.setKeyValue(POS_TYPE.BLACK, 0)
        this.scoreInfo.setKeyValue(POS_TYPE.WHITE, 0)
    }

    /**
     * 设置分数
     * @param type
     * @param score
     */
    setScore (type, score) {
        if (type === POS_TYPE.BLACK || type === POS_TYPE.WHITE) {
            if (score >= 0) {
                this.scoreInfo.setKeyValue(type, score)
            }
        }
    }

    /**
     * 取得分数
     * @param type
     * @returns {*}
     */
    getScore (type) {
        if (type === POS_TYPE.BLACK || type === POS_TYPE.WHITE) {
            return this.scoreInfo.getNotCreate(type)
        }
        return null
    }

    /**
     * 取得所有分数
     * @returns {Map|HancedMap}
     */
    getAllScore () {
        return this.scoreInfo
    }

}

module.exports = Score
