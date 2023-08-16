let seed;

const word_list = [
    "red spruce",
    "recluse",
    "reduce",
    "effuse",
    "abstruse",
    "coiffeuse",
    "vamoose",
    "footloose",
    "produce",
    "mousse",
    "obtuse",
    "induce",
    "diffuse",
    "disuse",
    "hair mousse",
    "merveilleuse",
    "pamplemousse",
    "on the loose",
    "verjuice",
    "burnoose"
]

function getDaySeed() {
    const currentDate = new Date();
    const utcTimeStamp = Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
        currentDate.getUTCHours(), 0, 0, 0
    );
    // Convert to EST by adding 5 hours (UTC-5) and handle any daylight saving time changes.
    const estTimeStamp = utcTimeStamp - 5;

    // Use the timestamp as the seed for simplicity.
    seed = estTimeStamp % 107190995;
    console.log(seed)
    return seed;
}

function generateRandomNumber(seed) {
    // The LCG parameters (using common values)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    // Update the seed with the LCG algorithm
    const new_val = (a * seed + c) % m;
    return new_val;
}

// Get the day seed and generate the random number on page load.
window.addEventListener("load", () => {
    const currentDaySeed = getDaySeed();
    const randomNumber = generateRandomNumber(currentDaySeed);
    const word = word_list[randomNumber % word_list.length]
    console.log(randomNumber)
    document.getElementById('randomWordDisplay').textContent = word;
});

//   // Example usage:
//   const currentDaySeed = getDaySeed();
//   const randomNumber = generateRandomNumber(currentDaySeed);
//   console.log(randomNumber);
