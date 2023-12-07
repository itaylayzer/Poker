import { Server, Socket, io } from "../classess/socket.io";
import CardsAPI, { cardsBrain } from "./cards";
import { ActionList } from "./game";
interface Player {
    socket: Socket;
    id: string;
    roundCoins: number;
    c1: number;
    c2: number;
    ready: boolean;
}

export default function run(options?: { uri?: string; onOpen?: (id: string, thisobj: Server) => void }) {
    const clients = new Map<string, Player>();
    const ordered = new Set<string>();
    let roundSet = new Set<string>();
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
        return Array.from(clients.values()).filter((v) => v.roundCoins === num && roundSet.has(v.id)).length == roundSet.size;
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
        console.log("[server]", "boardcards", boardCards);
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
        clients.get(Array.from(roundSet)[current % roundSet.size])?.socket.emit("act");

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

        const xdata = { scores: playerScores, money: sumMoney };
        sockets.all("win", xdata);
        setTimeout(() => {
            initRound(); //set timout of a 5 seconds, later it will the player judge
            round++;
        }, 0 * 1000);
    }
    function nextPlayerAct() {
        ++state;
        current = 0;
        sockets.all("nxt");
        clients.get(Array.from(roundSet)[(current + roundSet.size + roundSet.size) % roundSet.size])?.socket.emit("act");
    }
    function actionDo(args: boolean | number, player: Player, lastMoney: number) {
        if (args === true) {
            // Call case
            // get last player

            player.roundCoins = lastMoney;
        } else if (args === false) {
            // Fold case
            roundSet.delete(player.id);
            current--;
        } else {
            // Raise case
            // console.log("lastMoney", lastMoney, "args", args); FIXME: check it
            player.roundCoins = lastMoney + args;
        }
    }
    function finishedTurn(player: Player) {
        if (
            (current < roundSet.size && EqualRoundMoney(player.roundCoins)) ||
            (current >= roundSet.size && !EqualRoundMoney(player.roundCoins) && roundSet.size > 1)
        ) {
            // Ask another player
            clients.get(Array.from(roundSet)[(current + roundSet.size) % roundSet.size])?.socket.emit("act");
        } else {
            // Continue to next
            if (state >= 2 || (roundSet.size === 1 && ordered.size !== 1)) {
                // win
                checkWin();
            } else {
                nextPlayerAct();
            }
        }
    }
    const xserver = new Server(
        (socket) => {
            // joinable
            socket.emit("jnbl", gameStarted ? 1 : ordered.size >= 4 ? 2 : 0);

            let player: Player;
            socket.on("n", () => {
                player = {
                    id: socket.id,
                    socket,
                    roundCoins: 0,
                    c1: 0,
                    c2: 0,
                    ready: false,
                };
                socket.emit("i", {
                    c1: player.c1,
                    c2: player.c2,
                    op: Array.from(clients.keys()),
                });
                clients.set(socket.id, player);
                ordered.add(socket.id);
                sockets.except(socket.id, "n-p", socket.id);
            });
            socket.on("r", () => {
                gameStarted = true;
                player.ready = true;
                if (Array.from(clients.values()).filter((v) => v.ready).length === clients.size) {
                    initRound();
                    round = 0;
                }
            });
            socket.on("act", (args: boolean | number) => {
                const lastMoney = clients.get(Array.from(roundSet)[(current - 1 + roundSet.size) % roundSet.size])?.roundCoins ?? player.roundCoins;
                actionDo(args, player, lastMoney);
                ++current;

                // see whats next for the game
                finishedTurn(player);
            });
            socket.on("mse", (args: { x: number; y: number }) => {
                sockets.except(socket.id, "mse", { ...args, id: socket.id });
            });
            socket.on("disconnect", () => {
                ordered.delete(socket.id);
                sockets.except(socket.id, "p-d", socket.id);
            });
        },
        {
            id: options ? (options.uri ? options.uri : undefined) : undefined,
            OnOpen: options ? (options.onOpen ? options.onOpen : undefined) : undefined,
        }
    );

    return {
        init: () => {
            initRound();
        },
        next: () => {
            sockets.all("nxt");
        },
        close: () => {
            xserver.stop();
        },
    } as ActionList;
}

export function ios(uri: string): Promise<{ socket: Socket; server: ActionList | undefined }> {
    return new Promise<{ socket: Socket; server: ActionList | undefined }>((resolve) => {
        io(uri, 500)
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
