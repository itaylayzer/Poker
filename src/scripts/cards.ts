// credits and all are found in line 63 and below.
// @coder-1t45 property!
import { findAllMatchingValues, findLongestSequence } from "./functions";

const _CONST_SHAPE_STEP = 100;
const _CONST_VALUE_MAX = 13;
const _CONST_SHAPE_COUNT = 4;

export const cardsBrain = function (nSortedCards: number[], objDuplicates: Map<string, number[]>) {
    if (nSortedCards.length < 5 || nSortedCards.length > 7) throw Error(`cards isnt in fixed length ${nSortedCards.length}`);
    function listhasgetfalse(str: string) {
        const list = objDuplicates.get(str);
        if (list) return list;
        return false;
    }
    return {
        onePair() {
            return listhasgetfalse("2");
        },
        twoPair() {
            const best = findAllMatchingValues(nSortedCards, (a) => a % _CONST_SHAPE_STEP);

            if (best.length > 3) {
                best.sort((a, b) => (b % _CONST_SHAPE_STEP) - (a % _CONST_SHAPE_STEP));
                return best.slice(0, 4);
            }
            return false;
        },
        threeOfAKind() {
            return listhasgetfalse("3");
        },
        straight(): boolean | number[] {
            const best = findLongestSequence(nSortedCards, (a, b) => a % _CONST_SHAPE_STEP === (b % _CONST_SHAPE_STEP) - 1);
            if (best.length > 4) return best;
            return false;
        },
        flush() {
            // all shapes are identical
            const arr = [...nSortedCards].sort((a, b) => {
                const valueDiffrent = (a % _CONST_SHAPE_STEP) - (b % _CONST_SHAPE_STEP);
                const shapeDiffrent = Math.round(a / _CONST_SHAPE_STEP) - Math.round(b / _CONST_SHAPE_STEP);

                return shapeDiffrent ? shapeDiffrent : valueDiffrent;
            });
            const best = findLongestSequence(arr, (a, b) => Math.round(a / _CONST_SHAPE_STEP) === Math.round(b / _CONST_SHAPE_STEP));
            console.warn("\t inside cards.ts flush", best, arr);
            if (best.length > 4) return best;
            return false;
        },
        fullHouse() {
            const two = this.twoPair();
            const three = this.threeOfAKind();
            if (typeof two == "boolean" || typeof three == "boolean") return false;
            return two.concat(...three);
        },
        fourOfaKind() {
            return listhasgetfalse("4");
        },
        straightFlush() {
            const best = findLongestSequence(
                nSortedCards,
                (a, b) =>
                    a % _CONST_SHAPE_STEP === (b % _CONST_SHAPE_STEP) - 1 && Math.round(a / _CONST_SHAPE_STEP) == Math.round(b / _CONST_SHAPE_STEP)
            );
            if (best.length > 4) return best;
            return false;
        },
        royaleFlush() {
            const straightflush = this.straightFlush();
            if (straightflush === false) return false;
            straightflush.sort((a, b) => a - b);
            return straightflush[0] % _CONST_SHAPE_STEP === 10 && straightflush[straightflush.length - 1] % _CONST_SHAPE_STEP === 13;
        },
    };
};

/**
 *
*  # Poker Algorithm
 * #### Cards / Hands Algorithm
 * @author Itay Layzerovich
 * ### Defenitions
 * ```js
const states = {
        highCard: 0,
        onePair: 1,
        twoPair: 2,
        threeOfAKind: 3,
        straight: 4,
        flush: 5,
        fullHouse: 6,
        fourOfaKind: 7,
        straightFlush: 8,
        royaleFlush: 9,
};
const shapes = {
        hearts: 0,
        diamonds: 1,
        clubs: 2,
        spades: 3,
};

 * ```
 * Card Definition:
 * each number is defined by 2 values: the shape, and the number.
 * the shape is the first digit, the rest are the number.
 * @example
 * 104 card's shape is 1 and value is 4 ==> Four Diamonds
 * 1 card's shape is 0 and value is 1 ==> Ace Hearts
 * 313 is the maximum card and its shape is 3 and value is 13 ==> King Spades
 * Module: PokerAlgorithm
 *
 * Provides functionality for managing and analyzing decks of cards.
 *
 * @module PokerAlgorithm
 */
export default {
    /**
     * Generates a deck of cards based on the specified quantity.
     *
     * @function
     * @name packet
     * @memberof module:PokerAlgorithm
     *
     * @param {number} [n=1] - The number of card packets to generate.
     * @returns {object} An object with methods to interact with the generated card packet.
     * @property {function} next - Retrieves the next card from the packet.
     * @property {function} reset - Resets the card packet to its original state.
     */

    packet: () => {
        let crdSet: Set<number> = new Set();

        for (let cshape = 0; cshape < _CONST_SHAPE_COUNT; cshape++) {
            for (let cvalue = 0; cvalue < _CONST_VALUE_MAX; cvalue++) {
                crdSet.add(cshape * _CONST_SHAPE_STEP + cvalue + 1);
            }
        }
        console.warn(crdSet);

        const shuffleArray = (array: number[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Ensure that the same value is not swapped multiple times in a row
                if (i !== j) {
                    [array[i], array[j]] = [array[j], array[i]];
                }
            }
        };

        return {
            /**
             *
             * @returns Retrieves the next card from the packet.
             */
            next() {
                const array = Array.from(crdSet.values());
                shuffleArray(array);
                const nxt = array.pop()!;
                crdSet = new Set(array);
                return nxt;
            },
            /**
             * Resets the packet.
             */
            reset() {
                crdSet = new Set();

                for (let cshape = 0; cshape < _CONST_SHAPE_COUNT; cshape++) {
                    for (let cvalue = 0; cvalue < _CONST_VALUE_MAX; cvalue++) {
                        crdSet.add(cshape * _CONST_SHAPE_STEP + cvalue + 1);
                    }
                }
            },
            all: Array.from(crdSet),
        };
    },
    /**
     * Analyzes a set of cards and determines the current state of the hand.
     *
     * @function
     * @name state
     * @memberof module:PokerAlgorithm
     *
     * @param {number[]} nCards - The array of cards to analyze.
     * @returns {object} An object containing the state information:
     *  - stateId: The identifier of the current hand state.
     *  - cards: An array of cards associated with the current state.
     *  - stateScore: A numerical score representing the state value.
     */
    state: (nCards: number[]): { stateId: number; cards: number[]; stateScore: number } => {
        // 101 is 1 spades
        const cardsArr: number[] = [...nCards];
        cardsArr.sort((crdFirst, crdSecond) => {
            const valueDiffrent = (crdFirst % _CONST_SHAPE_STEP) - (crdSecond % _CONST_SHAPE_STEP);
            const shapeDiffrent = Math.round(crdFirst / _CONST_SHAPE_STEP) - Math.round(crdSecond / _CONST_SHAPE_STEP);

            return valueDiffrent ? valueDiffrent : shapeDiffrent;
        });

        const objDuplicates = new Map(
            cardsArr.map((v) => {
                const searchCardsArr = cardsArr.filter((vsearch) => vsearch % _CONST_SHAPE_STEP === v % _CONST_SHAPE_STEP);
                return [searchCardsArr.length.toString(), searchCardsArr];
            })
        );
        // console.log("objDuplicates", objDuplicates);
        const brain = cardsBrain(cardsArr, objDuplicates);

        const statesArr = [
            [cardsArr[cardsArr.length - 1]], //highCard      : 0
            brain.onePair(), //onePair       : 1
            brain.twoPair(), //twoPair       : 2
            brain.threeOfAKind(), //threeOfAKind  : 3
            brain.straight(), //straight      : 4
            brain.flush(), //flush         : 5
            brain.fullHouse(), //fullHouse     : 6
            brain.fourOfaKind(), //fourOfaKind   : 7
            brain.straightFlush(), //straightFlush : 8
            brain.royaleFlush(), //royaleFlush   : 9
        ];
        const stateId = statesArr.map((val) => !(typeof val == "boolean")).lastIndexOf(true);

        let retValue = 0;
        let retCards: number[] = [];

        const stateValue = statesArr[stateId];
        if (Array.isArray(stateValue)) retCards = retCards.concat(stateValue);
        switch (stateId) {
            case 0: // highCard: 0,
            case 1: {
                // onePair: 1,
                retValue = retCards[0] % _CONST_SHAPE_STEP;
                break;
            }
            case 2: // twoPair: 2,
            case 3: // threeOfAKind: 3,
            // assuming for cases 2 and 3 that we only pair the max card and not the rest!  TODO: a problem for later?
            case 4: // straight: 4,
            case 5: // flush: 5,
            case 6: // fullHouse: 6,
            case 7: // fourOfaKind: 7,
            case 8: {
                // straightFlush: 8,
                const arr = retCards.sort((a, b) => (a % _CONST_SHAPE_STEP) - (b % _CONST_SHAPE_STEP));
                retValue = arr[arr.length - 1];
                break;
            }
            // case 9: // royaleFlush: 9,
            //     break; in that case left the retValue to be 0
        }
        return {
            stateId: stateId,
            cards: retCards,
            stateScore: retValue,
        };
    },
};
