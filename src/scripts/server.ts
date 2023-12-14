import { Server, Socket, io } from "../classess/socket.io";
import CardsAPI, { cardsBrain } from "./cards";
import { ActionList } from "./game";
interface Player {
    socket: Socket;
    name: string;
    id: string;
    roundCoins: number;
    balance: number;
    c1: number;
    c2: number;
    order: number;
    ready: boolean;
}

export default function run(options?: { uri?: string; onOpen?: (id: string, thisobj: Server) => void }) {
    const clients = new Map<string, Player>();
    const ordered = new Set<string>();
    let roundSet = new Set<string>();
    let turnBalance: number = 0;
    let gameStarted: boolean = false;
    let current: number = 0;
    let boardCards: number[] | undefined = undefined;
    /**
     * state map defenitions\
     *   0     : going to round   \
     *   1     : fourth           \
     *   2     : end-fifth    \
     */
    let state: number = 0;
    const packet = CardsAPI.packet();

    let round = 0;
    const sockets = {
        all: (event_name: string, args?: any) => {
            for (const s of clients.values()) {
                s.socket.emit(event_name, args);
            }
        },
        except: (id: string, event_name: string, args?: any) => {
            for (const [_id, _socket] of clients.entries()) {
                if (_id !== id) _socket.socket.emit(event_name, args);
            }
        },
    };

    function EqualRoundMoney(num: number) {
        const lastPlayers = Array.from(clients.values()).filter((v) => roundSet.has(v.id) && v.balance > 0);
        return lastPlayers.filter((v) => v.roundCoins === num).length == lastPlayers.length;
    }
    function calculateScore(args: { c1: number; c2: number }): number {
        if (boardCards === undefined) throw Error("board cards are undefined");
        const state = CardsAPI.state([args.c1, args.c2, ...boardCards]);
        return state.stateId * 100 + state.stateScore;
    }
    function initRound() {
        packet.reset();
        current = 0;
        boardCards = [];
        for (let i = 0; i < 5; i++) boardCards.push(packet.next());
        if (cardsBrain(boardCards, new Map()).twoPair() !== false) return initRound();
        // console.log("[server]", "boardcards", boardCards);
        for (const xplayer of clients.values()) {
            xplayer.c1 = packet.next();
            xplayer.c2 = packet.next();

            xplayer.socket.emit("st", {
                b: boardCards,
                c1: xplayer.c1,
                c2: xplayer.c2,
            });
        }
        roundSet = new Set(ordered);
        const id = clients.get(Array.from(roundSet)[current % roundSet.size])?.id;
        id ? sockets.all("act", { m: 0, id: id }) : 0;

        state = 0;
    }
    function checkWin() {
        const sumMoney = Array.from(clients.values())
            .filter((v) => roundSet.has(v.id))
            .map((v) => v.roundCoins)
            .reduce((a, b) => a + b);

        const playersCards: {
            [key: string]: {
                c1: number;
                c2: number;
            };
        } = Object.fromEntries(
            Array.from(clients.values())
                .filter((v) => roundSet.has(v.id))
                .map((v) => [v.id, { c1: v.c1, c2: v.c2 }])
        );

        const playerScores: {
            [key: string]: number;
        } = Object.fromEntries(Array.from(Object.entries(playersCards)).map((v) => [v[0], calculateScore(v[1])]));

        const winnerId = Object.keys(playerScores).reduce((a, b) => (playerScores[a] > playerScores[b] ? a : b));
        const winnerPlayer = clients.get(winnerId);
        if (winnerPlayer) {
            winnerPlayer.balance += sumMoney;
            sockets.all("bl", { id: winnerId, b: winnerPlayer.balance, c: 0, s: 0 });
        }

        for (const player of clients.values()) {
            player.roundCoins = 0;
        }
        // console.log("socket.all(win)");
        sockets.all("win", playerScores);
        setTimeout(() => {
            round++;
            initRound(); //set timout of a 5 seconds, later it will the player judge
        }, 1 * 1000);
    }
    function nextPlayerAct() {
        turnBalance = 0;
        ++state;
        current = 0;
        sockets.all("nxt");
        const id = clients.get(Array.from(roundSet)[(current + roundSet.size + roundSet.size) % roundSet.size])?.id;
        id ? sockets.all("act", { m: 0, id: id }) : 0;
    }
    function actionDo(args: boolean | number, player: Player, lastMoney: number) {
        let oldRoundCoin = player.roundCoins;
        if (typeof args === "boolean") {
            if (args) {
                // Call case
                // get last player
                // console.log("%c[server]", "color:red", "call");
                player.roundCoins = lastMoney;
            } else {
                // Fold case
                // console.log("%c[server]", "color:red", "fold");
                roundSet.delete(player.id);
                current--;
            }
        } else {
            // Raise case
            // console.log("%c[server]", "color:red", "raise");
            player.roundCoins = lastMoney + args;
        }
        player.balance -= player.roundCoins - oldRoundCoin;
        if (player.balance < 0) {
            player.roundCoins += -player.balance;
            player.balance = 0;
        }
    }
    function finishedTurn(player: Player) {
        const alteastOnePlayerHaveBalance = Array.from(clients.values()).filter((v) => v.balance > 0 && roundSet.has(v.id)).length;
        // console.log(
        //     "Array.from(clients.values()).filter((v) => v.balance > 0 && roundSet.has(v.id)).length",
        //     Array.from(clients.values()).filter((v) => v.balance > 0 && roundSet.has(v.id)).length,
        //     alteastOnePlayerHaveBalance
        // );
        if (
            // if someone atleast have balance
            alteastOnePlayerHaveBalance > 1 &&
            // and the size is beyond 1
            roundSet.size > 1 && // and
            // current < size or current >= roundset.size and money not equals
            (current < roundSet.size || (current >= roundSet.size && !EqualRoundMoney(player.roundCoins)))
        ) {
            // Ask another player
            let nxt_player_id = Array.from(roundSet)[(current + roundSet.size) % roundSet.size];
            let nxt_player_p = clients.get(nxt_player_id);
            while (nxt_player_p === undefined || nxt_player_p.balance === 0) {
                nxt_player_id = Array.from(roundSet)[(++current + roundSet.size) % roundSet.size];
                nxt_player_p = clients.get(nxt_player_id);
            }

            nxt_player_p ? sockets.all("act", { m: player.roundCoins - nxt_player_p.roundCoins, id: nxt_player_p.id }) : 0;
        } else {
            // Continue to next
            if (state >= 2 || ((alteastOnePlayerHaveBalance <= 1 || roundSet.size === 1) && ordered.size !== 1)) {
                // End Round
                function movingNext() {
                    setTimeout(() => {
                        if (state >= 2) {
                            checkWin();

                            return;
                        }
                        ++state;
                        current = 0;
                        sockets.all("nxt");
                        movingNext();
                    }, 1000);
                }
                movingNext();
            } else {
                // End Turn
                turnBalance = player.roundCoins;
                nextPlayerAct();
            }
        }
    }
    const xserver = new Server(
        (socket) => {
            // console.log("new socket connection", gameStarted ? 1 : ordered.size >= 8 ? 2 : 0);
            // joinable
            socket.on("jnbl", () => {
                socket.emit("jnbl", gameStarted ? 1 : ordered.size >= 8 ? 2 : 0);
            });
            // console.log("pass emitting");
            let player: Player;
            socket.on("n", (name: string) => {
                // console.log(name);
                player = {
                    id: socket.id,
                    socket,
                    roundCoins: 0,
                    c1: 0,
                    c2: 0,
                    ready: false,
                    balance: 1000,
                    name: name,
                    order: clients.size,
                };
                const oldp = Object.fromEntries(Array.from(clients.values()).map((player) => [player.id, { n: player.name, o: player.order }]));
                socket.emit("i", {
                    op: oldp,
                });
                clients.set(socket.id, player);
                ordered.add(socket.id);
                sockets.except(socket.id, "n-p", { id: socket.id, n: name, o: player.order });
            });
            socket.on("r", () => {
                gameStarted = true;
                player.ready = true;
                if (Array.from(clients.values()).filter((v) => v.ready).length === clients.size) {
                    round = 0;
                    initRound();
                }
            });
            socket.on("act", (args: boolean | number) => {
                // console.log("%c[server]", "color:red", "current", current);
                const lastMoney = clients.get(Array.from(roundSet)[(current - 1 + roundSet.size) % roundSet.size])?.roundCoins ?? player.roundCoins;
                actionDo(args, player, lastMoney);
                ++current;

                // send the player his balance
                sockets.all("bl", {
                    id: socket.id,
                    b: player.balance,
                    c: player.roundCoins - turnBalance,
                    s: Array.from(clients.values())
                        .map((v) => v.roundCoins)
                        .reduce((a, b) => a + b),
                });
                // see whats next for the game
                finishedTurn(player);
                // console.log("%c[server]", "color:red", "current after", current);
            });
            socket.on("mse", (args: { x: number; y: number }) => {
                sockets.except(socket.id, "mse", { ...args, id: socket.id });
            });
            socket.on("disconnect", () => {
                ordered.delete(socket.id);
                clients.delete(socket.id);
                sockets.except(socket.id, "p-d", socket.id);
            });
        },
        {
            id: options ? (options.uri ? options.uri : undefined) : undefined,
            OnOpen: options ? (options.onOpen ? options.onOpen : undefined) : undefined,
        }
    );

    return {
        functions: {
            init: () => {
                initRound();
            },
            next: () => {
                sockets.all("nxt");
            },
            close: () => {
                xserver.stop();
            },
            code: () => {
                xserver.Code;
            },
        },
    } as ActionList;
}

export function ios(uri: string): Promise<{ socket: Socket; server: ActionList | undefined }> {
    return new Promise<{ socket: Socket; server: ActionList | undefined }>((resolve) => {
        io(uri, 1000)
            .then((sock) => {
                resolve({ socket: sock, server: undefined });
            })
            .catch(() => {
                const xactions = run({
                    uri,
                    onOpen(_uri) {
                        if (_uri !== uri) {
                            alert("Uri is diffrent");
                            console.log("_uri", _uri, "uri", uri);
                        }
                        io(_uri).then((sock) => {
                            resolve({ socket: sock, server: xactions });
                        });
                    },
                });
            });
    });
}
