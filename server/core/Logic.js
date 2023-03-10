var Chess = require('../model/bean/Chess.js')
var UnitTools = require('../tools/UnitTools.js')
var TunnelManager = require('../manager/TunnelManager.js')
var PlayerManager = require('../manager/PlayerManager.js')
var SettlementService = require('../service/SettlementService.js')
var Score = require('./Score.js')
var Robot = require('./Robot.js')
var Map = require('../tools/Map.js')
var schedule = require('node-schedule')
const { CHESS_TYPE, POS_TYPE, DIR_TYPE, GAME_STATE, OUT_MESSAGE, PLAYER_STATE, GAME_RESULT, DEFAULT_RATING } = require('../model/enums/constants.js')

class Logic {

    constructor (table, length) {
        this.tunnelManager = TunnelManager
        this.playerManager = PlayerManager
        this.settlementService = SettlementService
        this.table = table // 棋局
        this.length = length || 8 // 棋盘大小
        this.col = length // 棋盘长
        this.row = length // 棋盘宽
        this.chesses = [] // 棋盘落子与初始棋盘
        // 先将棋局铺满，以防内存问题
        for (let x = 0; x < this.col; x++) {
            this.chesses[x] = []
            for (let y = 0; y < this.row; y++) {
                this.chesses[x][y] = new Chess(CHESS_TYPE.EMPTY, x, y)
            }
        }
        // 在搞定初始棋盘落子
        this.chesses[this.col / 2 - 1][this.row / 2 - 1].type = CHESS_TYPE.BLACK
        this.chesses[this.col / 2 - 1][this.row / 2].type = CHESS_TYPE.WHITE
        this.chesses[this.col / 2][this.row / 2].type = CHESS_TYPE.BLACK
        this.chesses[this.col / 2][this.row / 2 - 1].type = CHESS_TYPE.WHITE
        this.turn = POS_TYPE.BLACK // 当前轮次
        this.score = new Score(table.tableId, table.custom)
        this.gameState = GAME_STATE.PREPARE // 这个以首次接入的玩家时间为准
        this.startTime = null // 这个以首次接入的玩家时间为准
        this.history = []
        this.turnTime = Date.now()
        this.turnTimeout = 30 * 1000
        this.robotChess = 0
        this.robotCount = new Map()
        this.robotCount.setKeyValue(POS_TYPE.BLACK, 0)
        this.robotCount.setKeyValue(POS_TYPE.WHITE, 0)
        this.robotMaxCount = 3
    }

    /**
     * 销毁
     */
    destroy () {
        this.tunnelManager = null
        this.playerManager = null
        this.settlementService = null
        this.table = null
        this.length = null
        this.col = null
        this.row = null
        this.chesses = null
        this.turn = null
        this.score = null
        this.gameState = null
        this.startTime = null // 这个以首次接入的玩家时间为准
        this.history = null
        this.turnTime = null
        this.turnTimeout = null
        this.robotChess = null
        this.robotCount = null
        this.robotMaxCount = null
        var self = this
        if (!UnitTools.isNullOrUndefined(self.schedule)) {
            self.schedule.cancel()
            self.schedule = null
        }
        if (!UnitTools.isNullOrUndefined(self.robotTimeout)) {
            clearTimeout(self.robotTimeout)
            self.robotTimeout = null
        }
    }

    /**
     * 获得棋局信息
     * @returns
     */
    getChessInfo () {
        var self = this
        return {'chesses': self.chesses, 'turn': self.turn, 'state': self.gameState, 'blackScore': self.score.getScore(POS_TYPE.BLACK), 'whiteScore': self.score.getScore(POS_TYPE.WHITE), 'col': self.col, 'row': self.row, 'startTime': self.startTime, 'history': self.history, 'timeLeft': self.getTimeLeft()}
    }

    /**
     * 获得回合剩余时间
     * @returns
     */
    getTimeLeft () {
        if (this.gameState === GAME_STATE.END || this.gameState === GAME_STATE.TIMEOUT_END || this.gameState === GAME_STATE.PREPARE) {
            return 0
        }
        return Date.now() - this.turnTime
    }

    /**
     * 换边
     */
    changeTurn () {
        if (this.gameState === GAME_STATE.END || this.gameState === GAME_STATE.TIMEOUT_END || this.gameState === GAME_STATE.PREPARE) {
            return
        }
        console.log(`Logic [changeTurn] =>` + this.turn)
        if (this.turn === POS_TYPE.BLACK) {
            this.turn = POS_TYPE.WHITE
        } else if (this.turn === POS_TYPE.WHITE) {
            this.turn = POS_TYPE.BLACK
        }
        this.turnTime = Date.now()
    }

    /**
     * 取下一次边
     * @returns {*}
     */
    getNextTurn () {
        if (this.gameState === GAME_STATE.END || this.gameState === GAME_STATE.TIMEOUT_END || this.gameState === GAME_STATE.PREPARE) {
            return null
        }
        if (this.turn === POS_TYPE.BLACK) {
            return POS_TYPE.WHITE
        } else if (this.turn === POS_TYPE.WHITE) {
            return POS_TYPE.BLACK
        }
        return null
    }

    /**
     * 开始游戏
     * 任何一方游戏开始，都视为整局游戏已经开始
     * @param pos
     */
    startGame (pos) {
        console.log(`Logic [startGame] =>` + pos)
        var self = this
        if (self.gameState === GAME_STATE.END || self.gameState === GAME_STATE.TIMEOUT_END) {
            self.tunnelManager.emit(OUT_MESSAGE.GameHasEnded, {}, self.playerManager.getPlayer(self.table.getPidWithPos(pos)).tunnelId)
            return
        }
        self.playerManager.updatePlayerState(self.table.getPidWithPos(pos), PLAYER_STATE.IN_GAME)
        self.tunnelManager.emit(OUT_MESSAGE.GameStart, {'roomId': self.table.tableId, 'pos': pos}, self.playerManager.getPlayer(self.table.getPidWithPos(pos)).tunnelId)
        if (self.gameState === GAME_STATE.PREPARE) {
            self.gameState = GAME_STATE.START
            var turnTimeOut = self.turnTimeout
            var robotChess = self.robotChess
            self.robotTimeout = setTimeout(self.forceFallChess, turnTimeOut, self, robotChess)
            self.schedule = schedule.scheduleJob('*/1 * * * * *', function () {
                self.table.eachPos(function (pos) {
                    var eachPlayer = self.playerManager.getPlayer(self.table.getPidWithPos(pos))
                    if (!UnitTools.isNullOrUndefined(eachPlayer) && !UnitTools.isNullOrUndefined(eachPlayer.tunnelId)) {
                        self.tunnelManager.emit(OUT_MESSAGE.TimeLeft, { 'timeLeft': self.getTimeLeft() }, eachPlayer.tunnelId)
                    }
                })
            })
            console.log(`game start successfully`)
        }
    }

    /**
     * 更新棋盘(注意区别于落子)
     * @param chess
     */
    update (chess) {
        var self = this
        self.chesses[chess.coor.x][chess.coor.y].type = chess.type
        self.history.push(chess)
    }

    /**
     * 落子
     * @param chess
     */
    fallChess (chess, isRobot) {
        console.log(`Logic [fallChess] =>`, {chess})
        var self = this
        var pos = chess.type === CHESS_TYPE.WHITE ? POS_TYPE.WHITE : POS_TYPE.BLACK
        if (self.gameState === GAME_STATE.PREPARE) {
            self.tunnelManager.emit(OUT_MESSAGE.GamePreparing, {}, self.playerManager.getPlayer(self.table.getPidWithPos(pos)).tunnelId)
            return
        }
        if (self.gameState === GAME_STATE.END || self.gameState === GAME_STATE.TIMEOUT_END) {
            self.tunnelManager.emit(OUT_MESSAGE.GameHasEnded, {}, self.playerManager.getPlayer(self.table.getPidWithPos(pos)).tunnelId)
            return
        }
        if (self.turn === POS_TYPE.BLACK && chess.type === CHESS_TYPE.WHITE) {
            console.error(`Logic [fallChess] turn&type error => turn:` + self.turn + ', type:' + chess.type)
            return
        }
        if (self.turn === POS_TYPE.WHITE && chess.type === CHESS_TYPE.BLACK) {
            console.error(`Logic [fallChess] turn&type error => turn:` + self.turn + ', type:' + chess.type)
            return
        }
        if (!isRobot) {
            self.robotCount.setKeyValue(pos, 0)
        }
        if (self.chesses[chess.coor.x][chess.coor.y].type === CHESS_TYPE.EMPTY) {
            self.robotChess ++
            self.update(chess)
            for (let dir = 1; dir <= self.length; dir++) {
                if (self.judgePass(self.turn, chess, dir)) {
                    self.changePass(chess, dir)
                }
            }
            self.updateScore()
            self.changeTurn()
            self.judgeWin(chess)
        } else {
            console.error(`Logic [fallChess] type error => type:` + self.chesses[chess.coor.x][chess.coor.y].type)
        }
    }

    /**
     * 超时落子
     */
    forceFallChess (logic, currentRobotChess) {
        var self = logic
        if (UnitTools.isNullOrUndefined(self)) {
            return
        }
        if (self.gameState === GAME_STATE.END || self.gameState === GAME_STATE.TIMEOUT_END || self.gameState === GAME_STATE.PREPARE) {
            return
        }
        console.log(`Logic [forceFallChess] =>`, {self})
        if (self.robotChess === currentRobotChess) {
            var type = self.turn === POS_TYPE.BLACK ? CHESS_TYPE.BLACK : CHESS_TYPE.WHITE
            var point = Robot.robot(self.convertRobotChessMap(self), self.convertRobotTurn(self), 1)
            self.fallChess(new Chess(type, point.x, point.y), true)
            var count = self.robotCount.getNotCreate(type)
            self.robotCount.setKeyValue(type, count + 1)
        }
    }

    /**
     * 转换机器人变 1.黑 2.白
     * @returns {number}
     */
    convertRobotTurn (self) {
        return self.turn === POS_TYPE.BLACK ? 1 : -1
    }

    /**
     * 转换成机器人可以识别的MAP
     * @returns {Array}
     */
    convertRobotChessMap (self) {
        var chessMap = []
        for (let x = 0; x < self.col; x++) {
            chessMap[x] = []
            for (let y = 0; y < self.row; y++) {
                switch (self.chesses[x][y].type) {
                    case CHESS_TYPE.BLACK :
                        chessMap[x][y] = 1
                        break
                    case CHESS_TYPE.WHITE :
                        chessMap[x][y] = -1
                        break
                    default :
                        chessMap[x][y] = 0
                        break
                }
            }
        }
        return chessMap
    }

    /**
     * 周围落子状况
     * @param chess 中心棋子
     * @param dir 方向
     * @returns {*}
     */
    nearChess (chess, dir) {
        switch (dir) {
            case DIR_TYPE.LEFT:// left
                if (chess.coor.x !== 0) {
                    return this.chesses[chess.coor.x - 1][chess.coor.y]
                }
                break
            case DIR_TYPE.LEFT_UP:// left up
                if (chess.coor.x !== 0 && chess.coor.y !== this.row - 1) {
                    return this.chesses[chess.coor.x - 1][chess.coor.y + 1]
                }
                break
            case DIR_TYPE.UP:// up
                if (chess.coor.y !== this.row - 1) {
                    return this.chesses[chess.coor.x][chess.coor.y + 1]
                }
                break
            case DIR_TYPE.RIGHT_UP:// right up
                if (chess.coor.x !== this.col - 1 && chess.coor.y !== this.row - 1) {
                    return this.chesses[chess.coor.x + 1][chess.coor.y + 1]
                }
                break
            case DIR_TYPE.RIGHT:// right
                if (chess.coor.x !== this.col - 1) {
                    return this.chesses[chess.coor.x + 1][chess.coor.y]
                }
                break
            case DIR_TYPE.RIGHT_DOWN:// right down
                if (chess.coor.x !== this.col - 1 && chess.coor.y !== 0) {
                    return this.chesses[chess.coor.x + 1][chess.coor.y - 1]
                }
                break
            case DIR_TYPE.DOWN:// down
                if (chess.coor.y !== 0) {
                    return this.chesses[chess.coor.x][chess.coor.y - 1]
                }
                break
            case DIR_TYPE.LEFT_DOWN:// left down
                if (chess.coor.x !== 0 && chess.coor.y !== 0) {
                    return this.chesses[chess.coor.x - 1][chess.coor.y - 1]
                }
                break

            default:
                break
        }
        return null
    }

    /**
     * 是否同一边
     * @param pos
     * @param type
     * @returns {boolean}
     */
    isSameStand (pos, type) {
        if (UnitTools.isNullOrUndefined(pos) || UnitTools.isNullOrUndefined(type)) {
            return false
        }
        if (pos === POS_TYPE.WHITE && type === CHESS_TYPE.WHITE) {
            return true
        }
        if (pos === POS_TYPE.BLACK && type === CHESS_TYPE.BLACK) {
            return true
        }
        return false
    }

    /**
     * 是否不同一边
     * @param pos
     * @param type
     * @returns {boolean}
     */
    isOppStand (pos, type) {
        if (UnitTools.isNullOrUndefined(pos) || UnitTools.isNullOrUndefined(type)) {
            return false
        }
        if (pos === POS_TYPE.WHITE && type === CHESS_TYPE.BLACK) {
            return true
        }
        if (pos === POS_TYPE.BLACK && type === CHESS_TYPE.WHITE) {
            return true
        }
        return false
    }

    /**
     * 判断是否翻转
     * @param pos
     * @param chess
     * @param dir
     * @returns {boolean}
     */
    judgePass (pos, chess, dir) {
        var self = this
        let tempChess = self.nearChess(chess, dir)
        if (tempChess === null) {
            return false
        }
        while (self.isOppStand(tempChess.type, pos)) {
            tempChess = self.nearChess(tempChess, dir)
            if (tempChess === null) {
                return false
            }
            if (self.isSameStand(tempChess.type, pos)) {
                return true
            }
        }
        return false
    }

    /**
     * 翻转
     * @param chess
     * @param dir
     */
    changePass (chess, dir) {
        var self = this
        let tempChess = self.nearChess(chess, dir)
        while (self.isOppStand(tempChess.type, self.turn)) {
            tempChess.type = chess.type
            tempChess = self.nearChess(tempChess, dir)
        }
    }

    /**
     * 判断是否有可落子的地方
     * @param stand
     * @returns {boolean}
     */
    judgeMoveAble (stand) {
        let tryChess = null
        var self = this
        for (let x = 0; x < self.col; x++) {
            for (let y = 0; y < self.row; y++) {
                tryChess = self.chesses[x][y]
                if (tryChess.type === CHESS_TYPE.EMPTY) {
                    for (let dir = 1; dir <= self.length; dir++) {
                        if (self.judgePass(stand, tryChess, dir)) {
                            return true
                        }
                    }
                }
            }
        }
        return false
    }

    /**
     * 使双方都离开房间
     */
    clearRoom () {
        var self = this
        let openIds = []
        self.table.eachPos(function (pos) {
            openIds.push(self.table.getPidWithPos(pos))
        })
        for (let i in openIds) {
            self.table.outRoom(openIds[i])
        }
    }

    /**
     * 判断落子状态以及胜负
     */
    async judgeWin (chess) {
        console.log(`Logic [judgeWin] =>`, {chess})
        if (this.gameState === GAME_STATE.END || this.gameState === GAME_STATE.TIMEOUT_END) {
            return
        }
        var self = this
        var type = self.turn === POS_TYPE.BLACK ? CHESS_TYPE.BLACK : CHESS_TYPE.WHITE
        var robotCount = self.robotCount.getNotCreate(type)
        var userOpenId = null
        var user = null
        var userRating = null
        var opponentOpenId = null
        var opponent = null
        var opponentRating = null
        var ratingResult = null
        if (robotCount > self.robotMaxCount) {
            console.log(type + ' is disconnect for too long, lose')
            self.gameState = GAME_STATE.TIMEOUT_END
            userOpenId = self.table.getPidWithPos(self.turn)
            user = self.playerManager.getPlayer(userOpenId)
            userRating = UnitTools.isNullOrUndefined(user.rating) ? DEFAULT_RATING : user.rating
            opponentOpenId = self.table.getPidWithPos(self.turn === POS_TYPE.BLACK ? POS_TYPE.WHITE : POS_TYPE.BLACK)
            opponent = self.playerManager.getPlayer(opponentOpenId)
            opponentRating = UnitTools.isNullOrUndefined(opponent.rating) ? DEFAULT_RATING : opponent.rating
            ratingResult = self.settlementService.doSettlement(userOpenId, userRating,
                opponentOpenId, opponentRating, GAME_RESULT.LOSS)
            self.playerManager.updatePlayerScore(userOpenId, ratingResult.userRating)
            self.playerManager.updatePlayerScore(opponentOpenId, ratingResult.opponentRating)

            self.table.eachPos(function (pos) {
                // 将玩家状态设为结算，结算状态必须等到玩家主动HTTP请求成功后才能释放
                self.playerManager.updatePlayerState(self.table.getPidWithPos(pos), PLAYER_STATE.SETTLEMENT)
            })
            self.table.eachPos(function (pos) {
                self.tunnelManager.emit(OUT_MESSAGE.FallChess, {'turn': self.turn, 'chess': chess, 'state': self.gameState, 'blackScore': self.score.getScore(POS_TYPE.BLACK), 'whiteScore': self.score.getScore(POS_TYPE.WHITE)}, self.playerManager.getPlayer(self.table.getPidWithPos(pos)).tunnelId)
            })
            self.clearRoom()
            return
        }
        let selfMoveAble = this.judgeMoveAble(self.turn)
        let oppoMoveAble = this.judgeMoveAble(self.getNextTurn())
        let turnTimeOut = self.turnTimeout
        let robotChess = self.robotChess
        if (selfMoveAble) {
            console.log('selfMoveAble')
            setTimeout(self.forceFallChess, turnTimeOut, self, robotChess)
        } else if (!selfMoveAble && oppoMoveAble) {
            console.log('can not move next turn')
            self.changeTurn()
            setTimeout(self.forceFallChess, turnTimeOut, self, robotChess)
        } else if (!selfMoveAble && !oppoMoveAble) {
            console.log('both can not move someone win')
            self.gameState = GAME_STATE.END
            userOpenId = self.table.getPidWithPos(self.turn)
            user = self.playerManager.getPlayer(userOpenId)
            userRating = UnitTools.isNullOrUndefined(user.rating) ? DEFAULT_RATING : user.rating
            opponentOpenId = self.table.getPidWithPos(self.turn === POS_TYPE.BLACK ? POS_TYPE.WHITE : POS_TYPE.BLACK)
            opponent = self.playerManager.getPlayer(opponentOpenId)
            opponentRating = UnitTools.isNullOrUndefined(opponent.rating) ? DEFAULT_RATING : opponent.rating
            var gameResult = null
            if (self.score.getScore(self.turn) > self.score.getScore(self.turn === POS_TYPE.BLACK ? POS_TYPE.WHITE : POS_TYPE.BLACK)) {
                gameResult = GAME_RESULT.WIN
            } else if (self.score.getScore(self.turn) < self.score.getScore(self.turn === POS_TYPE.BLACK ? POS_TYPE.WHITE : POS_TYPE.BLACK)) {
                gameResult = GAME_RESULT.LOSS
            } else {
                gameResult = GAME_RESULT.DRAW
            }
            ratingResult = await self.settlementService.doSettlement(userOpenId, userRating,
                opponentOpenId, opponentRating, gameResult)
            self.playerManager.updatePlayerScore(userOpenId, ratingResult.userRating)
            self.playerManager.updatePlayerScore(opponentOpenId, ratingResult.opponentRating)

            self.table.eachPos(function (pos) {
                // 将玩家状态设为结算，结算状态必须等到玩家主动HTTP请求成功后才能释放
                self.playerManager.updatePlayerState(self.table.getPidWithPos(pos), PLAYER_STATE.SETTLEMENT)
            })
        }
        self.table.eachPos(function (pos) {
            self.tunnelManager.emit(OUT_MESSAGE.FallChess, {'turn': self.turn, 'chess': chess, 'state': self.gameState, 'blackScore': self.score.getScore(POS_TYPE.BLACK), 'whiteScore': self.score.getScore(POS_TYPE.WHITE)}, self.playerManager.getPlayer(self.table.getPidWithPos(pos)).tunnelId)
        })
        if (this.gameState === GAME_STATE.END || this.gameState === GAME_STATE.TIMEOUT_END) {
            self.clearRoom()
        }
    }

    /**
     * 投降
     */
    async surrender (openId) {
        var self = this
        console.log('player surrender')
        self.gameState = GAME_STATE.END
        var userOpenId = openId
        var opponentOpenId = null
        var table = self.table
        table.eachPos(function (pos) {
            if (table.getPidWithPos(pos) !== userOpenId) {
                opponentOpenId = table.getPidWithPos(pos)
            }
        })
        var user = self.playerManager.getPlayer(userOpenId)
        var userRating = UnitTools.isNullOrUndefined(user.rating) ? DEFAULT_RATING : user.rating
        var opponent = self.playerManager.getPlayer(opponentOpenId)
        var opponentRating = UnitTools.isNullOrUndefined(opponent.rating) ? DEFAULT_RATING : opponent.rating
        var gameResult = GAME_RESULT.LOSS
        var ratingResult = await self.settlementService.doSettlement(userOpenId, userRating,
            opponentOpenId, opponentRating, gameResult)
        self.playerManager.updatePlayerScore(userOpenId, ratingResult.userRating)
        self.playerManager.updatePlayerScore(opponentOpenId, ratingResult.opponentRating)

        self.table.eachPos(function (pos) {
            // 将玩家状态设为结算，结算状态必须等到玩家主动HTTP请求成功后才能释放
            self.playerManager.updatePlayerState(self.table.getPidWithPos(pos), PLAYER_STATE.SETTLEMENT)
        })
        self.table.eachPos(function (pos) {
            self.tunnelManager.emit(OUT_MESSAGE.FallChess, {'turn': self.turn, 'state': self.gameState, 'blackScore': self.score.getScore(POS_TYPE.BLACK), 'whiteScore': self.score.getScore(POS_TYPE.WHITE)}, self.playerManager.getPlayer(self.table.getPidWithPos(pos)).tunnelId)
        })
        self.clearRoom()
    }

    /**
     * 落子统计
     * @returns {[null,null]}
     */
    getChessCount () {
        console.log(`Logic [getChessCount]`)
        let blackChess = 0
        let whiteChess = 0
        for (let x = 0; x < this.chesses.length; x++) {
            for (let y = 0; y < this.chesses[x].length; y++) {
                if (this.chesses[x][y].type === CHESS_TYPE.BLACK) {
                    blackChess++
                } else if (this.chesses[x][y].type === CHESS_TYPE.WHITE) {
                    whiteChess++
                }
            }
        }
        return [blackChess, whiteChess]
    }

    /**
     * 更新得分
     */
    updateScore () {
        console.log(`Logic [updateScore]`)
        let chessCount = this.getChessCount()
        let blackChess = chessCount[0]
        let whiteChess = chessCount[1]
        console.log(`Logic [updateScore], whiteChess, blackChess =>`, {whiteChess, blackChess})
        this.score.setScore(POS_TYPE.BLACK, blackChess)
        this.score.setScore(POS_TYPE.WHITE, whiteChess)
    }

}

module.exports = Logic
