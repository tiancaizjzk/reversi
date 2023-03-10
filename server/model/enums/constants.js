module.exports = {

    PLAYER_STATE: {
        IN_HALL: 'IN_HALL',
        MATCHING: 'MATCHING',
        GAME_PREPARE: 'GAME_PREPARE',
        MATCH_SUCCESS: 'MATCH_SUCCESS',
        IN_GAME: 'IN_GAME',
        SETTLEMENT: 'SETTLEMENT'
    },

    MATCH_STATE: {
        MATCHING: 'MATCHING',
        FREE: 'FREE'
    },

    CLEAR_STATE: {
        CLEARING: 'CLEARING',
        FREE: 'FREE'
    },

    ON_MESSAGE: {
        Match: 'Match',
        CancelMatch: 'CancelMatch',
        Close: 'Close',
        FallChess: 'FallChess',
        StartGame: 'StartGame',
        StartRoomGame: 'StartRoomGame',
        Friend: 'Friend',
        JoinGame: 'JoinGame',
        QuitRoom: 'QuitRoom'
    },

    OUT_MESSAGE: {
        MatchStart: 'MatchStart',
        MatchError: 'MatchError',
        MatchSuccess: 'MatchSuccess',
        MatchTimeout: 'MatchTimeout',
        CancelMatchSuccess: 'CancelMatchSuccess',
        CancelMatchError: 'CancelMatchError',
        FallChess: 'FallChess',
        GamePreparing: 'GamePreparing',
        GameHasStarted: 'GameHasStarted',
        GameHasEnded: 'GameHasEnded',
        GameStart: 'GameStart',
        RoomError: 'RoomError',
        RoomCreated: 'RoomCreated',
        JoinRoomError: 'JoinRoomError',
        JoinRoomSuccess: 'JoinRoomSuccess',
        SomeoneJoinRoom: 'SomeoneJoinRoom',
        SomeoneQuitRoom: 'SomeoneQuitRoom',
        QuitRoomSuccess: 'QuitRoomSuccess',
        QuitRoomError: 'QuitRoomError',
        StartRoomGameError: 'StartRoomGameError',
        StartRoomGameSuccess: 'StartRoomGameSuccess',
        TimeLeft: 'TimeLeft'
    },

    CHESS_TYPE: {
        BLACK: 0,
        WHITE: 1,
        EMPTY: -1
    },

    POS_TYPE: {
        BLACK: 0,
        WHITE: 1
    },

    DIR_TYPE: {
        LEFT: 1,
        LEFT_UP: 2,
        UP: 3,
        RIGHT_UP: 4,
        RIGHT: 5,
        RIGHT_DOWN: 6,
        DOWN: 7,
        LEFT_DOWN: 8
    },

    GAME_STATE: {
        PREPARE: -1, // 准备中
        START: 1, // 已经开始
        END: 0, // 结束
        TIMEOUT_END: -2 // 由于断线而结束比赛
    },

    GAME_RESULT: {
        WIN: 3, // 胜
        LOSS: 0, // 负
        DRAW: 1 // 平
    },

    DEFAULT_RATING: 1000,

    COIN_DELTA: 100,

    ITEMS: {
        headFrames: [
            {
                itemId: 1,
                price: 100
            },
            {
                itemId: 2,
                price: 200
            }
        ],
        chesses: [
            {
                itemId: 1,
                price: 1000
            },
            {
                itemId: 2,
                price: 1000
            },
            {
                itemId: 3,
                price: 2000
            },
            {
                itemId: 4,
                price: 2000
            }
        ],
        boards: [
            {
                itemId: 1,
                price: 1000
            },
            {
                itemId: 2,
                price: 200
            }
        ]
    },

    DEFAULT_HEAD_FRAMES: [
        {
            itemId: 1,
            isActive: false
        },
        {
            itemId: 2,
            isActive: false
        }
    ],

    DEFAULT_CHESSES: [
        {
            itemId: 1,
            isActive: false
        },
        {
            itemId: 2,
            isActive: false
        },
        {
            itemId: 3,
            isActive: false
        },
        {
            itemId: 4,
            isActive: false
        }
    ],

    DEFAULT_BOARDS: [
        {
            itemId: 1,
            isActive: false
        }
    ]
}
