/**
 * Clamps a value between a minimum and maximum value.
 *
 * @param {number} x - The value to clamp.
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @returns {number} The clamped value.
 *
 * @example
 * const result = clamp(8, 2, 5);
 * console.log(result); // Output: 5
 */
export function clamp(x: number, min: number, max: number) {
    return Math.min(max, Math.max(min, x));
}

/**
 * Finds the longest sequence of values in an array based on a comparison function.
 *
 * @param {T[]} arr - The array to analyze.
 * @param {(a: T, b: T) => boolean} compareFn - The comparison function to determine sequence continuity.
 * @returns {T[]} The longest sequence found in the input array.
 *
 * @example
 * const array1 = [0, 1, 4, 5, 6, 7];
 * const result1 = findLongestSequence(array1, (a, b) => a === b - 1);
 * console.log(result1); // Output: [4, 5, 6, 7]
 *
 * const array2 = [0, 0, 1, 1, 1, 1, 1, 4, 4];
 * const result2 = findLongestSequence(array2, (a, b) => a === b);
 * console.log(result2); // Output: [1, 1, 1, 1, 1]
 *
 * const array3 = [0, 2, 4, 5, 6, 7];
 * const result3 = findLongestSequence(array3, (a, b) => false);
 * console.log(result3); // Output: []
 */
export function findLongestSequence<T>(arr: T[], compareFn: (a: T, b: T) => boolean): T[] {
    let longestSequence: T[] = [];
    let currentSequence: T[] = [];

    for (let i = 0; i < arr.length; i++) {
        if (i === 0 || compareFn(arr[i], arr[i - 1])) {
            // Continue the current sequence
            currentSequence.push(arr[i]);
        } else {
            // Start a new sequence
            currentSequence = [arr[i]];
        }

        // Update the longest sequence if needed
        if (currentSequence.length > longestSequence.length) {
            longestSequence = currentSequence;
        }
    }

    return longestSequence;
}
/**
 * Finds all non-consecutive matching values in an array based on a custom manipulation function.
 *
 * @function
 * @name findAllMatchingValues
 * @template T - The type of elements in the array.
 *
 * @param {T[]} arr - The array to search for matching values.
 * @param {(a: T) => T} manipulationFn - A custom function to manipulate each element before comparison.
 * @returns {T[]} An array containing all non-consecutive matching values found in the input array.
 */
export function findAllMatchingValues<T>(arr: T[], manipulationFn: (a: T) => T): T[] {
    return arr.filter((value) => {
        const searchArray = arr.filter((second) => manipulationFn(second) === manipulationFn(value));
        return searchArray.length > 1;
    });
}

/**
 * Removes duplicate elements from an array based on a custom manipulation function.
 *
 * @function
 * @name removeDuplicates
 * @template T - The type of elements in the array.
 *
 * @param {T[]} arr - The array containing elements with potential duplicates.
 * @param {(a: T) => T} manipulationFn - A custom function to manipulate each element before comparison.
 * @returns {T[]} An array containing unique elements after applying the manipulation function.
 *
 * @example
 * const inputArray = [2, 102, 3, 4, 5, 105];
 * const resultArray = removeDuplicates(inputArray, (a) => a % 100);
 * console.log(resultArray); // Output: [2, 102, 5, 105]
 */
export function removeDuplicates<T>(arr: T[], manipulationFn: (a: T) => T): T[] {
    const uniqueElements: T[] = [];

    for (const currentElement of arr) {
        // Map the manipulated values of existing elements
        const mappedManipulatedValues = uniqueElements.map((uniqueElement) => manipulationFn(uniqueElement));

        // Check if the manipulated value of the current element is already present
        if (!mappedManipulatedValues.includes(manipulationFn(currentElement))) {
            uniqueElements.push(currentElement);
        }
    }

    return uniqueElements;
}
