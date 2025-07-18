// script.js

// --- Global State Variables ---
let workoutHistory = []; // Stores all logged workouts, grouped by date
let totalWeightLifted = 0;
let totalPoints = 0;
let currentStreak = 0;
let badgesEarned = []; // Stores names of earned badges
let personalBests = {}; // Stores { exerciseName: { weight: X, reps: Y, points: Z } }

// --- Constants ---
// Base scaling factor for point calculation: sqrt(weight * reps * SCALING_FACTOR_BASE)
// Adjust this to make points more or less granular.
const SCALING_FACTOR_BASE = 0.1;

// Exercise Database
const EXERCISES = [
    { name: "Incline Bench (Machine)", baseline: 225, multiplier: 1.0, inversePoints: false },
    { name: "Tricep Machine", baseline: 150, multiplier: 1.2, inversePoints: false },
    { name: "Lateral Raise Machine", baseline: 80, multiplier: 1.5, inversePoints: false },
    { name: "Tricep Pushdown", baseline: 120, multiplier: 1.3, inversePoints: false },
    { name: "Pec Fly", baseline: 100, multiplier: 1.4, inversePoints: false },
    { name: "Shoulder Press Machine", baseline: 150, multiplier: 1.1, inversePoints: false },
    // Assisted Pull-Up: baseline represents the 'effective' bodyweight for point calculation.
    // Higher assist weight means less effective bodyweight, so fewer points.
    // The multiplier is for the 'difficulty' of an unassisted pull-up relative to other exercises.
    { name: "Assisted Pull-Up (with weight assist)", baseline: 150, multiplier: 1.8, inversePoints: true },
    { name: "Preacher Curl Machine", baseline: 100, multiplier: 1.3, inversePoints: false },
    { name: "Face Pull", baseline: 90, multiplier: 1.6, inversePoints: false },
    { name: "Bench-Assisted Bicep Curl", baseline: 60, multiplier: 1.7, inversePoints: false },
    { name: "Lat Pulldown", baseline: 120, multiplier: 1.1, inversePoints: false },
    { name: "Chest-Supported Row Machine", baseline: 130, multiplier: 1.2, inversePoints: false },
    { name: "Barbell Back Squat", baseline: 315, multiplier: 0.9, inversePoints: false },
    { name: "Leg Press", baseline: 400, multiplier: 0.8, inversePoints: false },
    { name: "Supine Hamstring Curl", baseline: 100, multiplier: 1.3, inversePoints: false },
    { name: "Seated Hamstring Curl", baseline: 110, multiplier: 1.2, inversePoints: false },
    { name: "Calf Press Machine", baseline: 250, multiplier: 1.0, inversePoints: false },
];

// Badge Definitions
const BADGES = [
    { name: "First Log", emoji: "🏁", description: "Logged your first workout!", unlockCondition: (stats) => stats.workoutHistory.length > 0 },
    { name: "Iron Rookie", emoji: "🛠️", description: "Lifted 100,000 lbs total!", unlockCondition: (stats) => stats.totalWeightLifted >= 100000 },
    { name: "Golden Titan", emoji: "🏆", description: "Lifted 1,000,000 lbs total!", unlockCondition: (stats) => stats.totalWeightLifted >= 1000000 },
    { name: "Daily Grind", emoji: "📅", description: "Achieved a 7-day workout streak!", unlockCondition: (stats) => stats.currentStreak >= 7 },
    { name: "Early Bird", emoji: "🌅", description: "Logged a workout before 6 AM!", unlockCondition: (stats) => {
        const today = getFormattedDate(new Date());
        const todayWorkouts = stats.workoutHistory.find(w => w.date === today);
        if (todayWorkouts) {
            for (const workout of todayWorkouts.workouts) {
                const workoutTime = new Date(workout.timestamp);
                if (workoutTime.getHours() < 6) return true;
            }
        }
        return false;
    }},
    { name: "Point Accumulator", emoji: "✨", description: "Earned 10,000 total points!", unlockCondition: (stats) => stats.totalPoints >= 10000 },
    { name: "Consistent Lifter", emoji: "💪", description: "Logged 50 individual workout entries!", unlockCondition: (stats) => {
        let totalEntries = 0;
        stats.workoutHistory.forEach(day => {
            totalEntries += day.workouts.length;
        });
        return totalEntries >= 50;
    }},
    { name: "Heavy Hitter", emoji: "🏋️", description: "Lifted 500 lbs in a single set!", unlockCondition: (stats) => {
        const today = getFormattedDate(new Date());
        const todayWorkouts = stats.workoutHistory.find(w => w.date === today);
        if (todayWorkouts) {
            for (const workout of todayWorkouts.workouts) {
                if (workout.totalWeightForSet >= 500) return true;
            }
        }
        return false;
    }},
    { name: "Full Body Master", emoji: "🧘", description: "Logged at least 5 different exercises in one day!", unlockCondition: (stats) => {
        const today = getFormattedDate(new Date());
        const todayWorkouts = stats.workoutHistory.find(w => w.date === today);
        if (todayWorkouts) {
            const uniqueExercises = new Set();
            todayWorkouts.workouts.forEach(w => uniqueExercises.add(w.exerciseName));
            return uniqueExercises.size >= 5;
        }
        return false;
    }},
];

// --- DOM Elements ---
const exerciseSelect = document.getElementById('exerciseSelect');
const setsInput = document.getElementById('setsInput');
const repsInput = document.getElementById('repsInput');
const weightInput = document.getElementById('weightInput');
const workoutForm = document.getElementById('workoutForm');
const totalPointsDisplay = document.getElementById('totalPointsDisplay');
const totalWeightDisplay = document.getElementById('totalWeightDisplay');
const streakDisplay = document.getElementById('streakDisplay');
const dailyPointsDisplay = document.getElementById('dailyPointsDisplay');
const dailyWeightDisplay = document.getElementById('dailyWeightDisplay');
const badgesDisplay = document.getElementById('badgesDisplay');
const workoutHistoryDisplay = document.getElementById('workoutHistoryDisplay');
const noHistoryMessage = document.getElementById('noHistoryMessage');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const dataTransferArea = document.getElementById('dataTransferArea');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const messageBoxCloseBtn = document.getElementById('messageBoxCloseBtn');


// --- Utility Functions ---

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 */
function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.classList.add('show');
}

/**
 * Hides the custom message box.
 */
function hideMessageBox() {
    messageBox.classList.remove('show');
}

/**
 * Formats a Date object into a 'YYYY-MM-DD' string.
 * @param {Date} date - The date object.
 * @returns {string} Formatted date string.
 */
function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculates points for a single set based on exercise, weight, and reps.
 * @param {number} weight - Weight lifted in lbs.
 * @param {number} reps - Number of repetitions.
 * @param {object} exercise - The exercise object from EXERCISES.
 * @returns {number} Calculated points.
 */
function calculatePoints(weight, reps, exercise) {
    let effectiveWeight = weight;
    if (exercise.inversePoints) {
        // For assisted pull-ups, higher assist weight means less effective bodyweight lifted.
        // Points are based on (baseline - assist_weight).
        // Ensure effectiveWeight is not negative.
        effectiveWeight = Math.max(0, exercise.baseline - weight);
    }

    // Points = sqrt(effective_weight * reps * exercise_multiplier * SCALING_FACTOR_BASE)
    const points = Math.sqrt(effectiveWeight * reps * exercise.multiplier * SCALING_FACTOR_BASE);
    return parseFloat(points.toFixed(2)); // Round to 2 decimal places
}

// --- LocalStorage Management ---

/**
 * Saves current state to LocalStorage.
 */
function saveData() {
    try {
        localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
        localStorage.setItem('totalWeightLifted', totalWeightLifted);
        localStorage.setItem('totalPoints', totalPoints);
        localStorage.setItem('currentStreak', currentStreak);
        localStorage.setItem('badgesEarned', JSON.stringify(badgesEarned));
        localStorage.setItem('personalBests', JSON.stringify(personalBests));
    } catch (e) {
        console.error("Error saving data to LocalStorage:", e);
        showMessageBox("Error saving data. Your browser might be in private mode or storage is full.");
    }
}

/**
 * Loads state from LocalStorage.
 */
function loadData() {
    try {
        workoutHistory = JSON.parse(localStorage.getItem('workoutHistory')) || [];
        totalWeightLifted = parseFloat(localStorage.getItem('totalWeightLifted')) || 0;
        totalPoints = parseFloat(localStorage.getItem('totalPoints')) || 0;
        currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
        badgesEarned = JSON.parse(localStorage.getItem('badgesEarned')) || [];
        personalBests = JSON.parse(localStorage.getItem('personalBests')) || {};
    } catch (e) {
        console.error("Error loading data from LocalStorage:", e);
        showMessageBox("Error loading saved data. Data might be corrupted. Resetting data.");
        resetData(); // Reset if corrupted
    }
}

/**
 * Resets all stored data.
 */
function resetData() {
    workoutHistory = [];
    totalWeightLifted = 0;
    totalPoints = 0;
    currentStreak = 0;
    badgesEarned = [];
    personalBests = {};
    saveData(); // Save the reset state
    updateUI();
    showMessageBox("All data has been reset.");
}

// --- UI Rendering Functions ---

/**
 * Populates the exercise dropdown.
 */
function populateExerciseDropdown() {
    exerciseSelect.innerHTML = ''; // Clear existing options
    EXERCISES.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise.name;
        option.textContent = exercise.name;
        exerciseSelect.appendChild(option);
    });
}

/**
 * Updates all UI elements with current state.
 */
function updateUI() {
    totalPointsDisplay.textContent = totalPoints.toFixed(2);
    totalWeightDisplay.textContent = totalWeightLifted.toFixed(2);
    streakDisplay.textContent = currentStreak;

    renderDailySummary();
    renderBadges();
    renderWorkoutHistory();
}

/**
 * Renders today's points and weight.
 */
function renderDailySummary() {
    const today = getFormattedDate(new Date());
    const todayWorkouts = workoutHistory.find(w => w.date === today);

    let dailyPoints = 0;
    let dailyWeight = 0;

    if (todayWorkouts) {
        todayWorkouts.workouts.forEach(workout => {
            dailyPoints += workout.pointsEarned;
            dailyWeight += workout.totalWeightForSet;
        });
    }
    dailyPointsDisplay.textContent = dailyPoints.toFixed(2);
    dailyWeightDisplay.textContent = dailyWeight.toFixed(2);
}

/**
 * Renders the badges display.
 */
function renderBadges() {
    badgesDisplay.innerHTML = ''; // Clear existing badges
    BADGES.forEach(badge => {
        const badgeItem = document.createElement('div');
        badgeItem.classList.add('badge-item');
        if (badgesEarned.includes(badge.name)) {
            badgeItem.classList.add('unlocked');
        }

        badgeItem.innerHTML = `
            <span class="badge-emoji">${badge.emoji}</span>
            <span class="font-bold">${badge.name}</span>
            <span class="text-xs text-gray-600">${badge.description}</span>
        `;
        badgesDisplay.appendChild(badgeItem);
    });
}

/**
 * Renders the workout history log.
 */
function renderWorkoutHistory() {
    workoutHistoryDisplay.innerHTML = ''; // Clear existing history
    if (workoutHistory.length === 0) {
        noHistoryMessage.style.display = 'block';
        return;
    } else {
        noHistoryMessage.style.display = 'none';
    }

    // Sort history by date, newest first
    const sortedHistory = [...workoutHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedHistory.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('workout-log-item');
        dayDiv.innerHTML = `
            <h3 class="text-xl font-semibold mb-2">${day.date}</h3>
            <ul></ul>
        `;
        const ul = dayDiv.querySelector('ul');

        // Sort workouts within the day by timestamp, newest first
        const sortedDayWorkouts = [...day.workouts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedDayWorkouts.forEach(workout => {
            const listItem = document.createElement('li');
            const time = new Date(workout.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            listItem.innerHTML = `
                <strong>${time} - ${workout.exerciseName}:</strong> ${workout.sets} sets of ${workout.reps} reps at ${workout.weight} lbs.
                (Points: ${workout.pointsEarned.toFixed(2)}, Total Weight: ${workout.totalWeightForSet.toFixed(2)} lbs)
            `;
            ul.appendChild(listItem);
        });
        workoutHistoryDisplay.appendChild(dayDiv);
    });
}

// --- Gamification Logic ---

/**
 * Updates the daily streak based on workout history.
 */
function updateDailyStreak() {
    if (workoutHistory.length === 0) {
        currentStreak = 0;
        return;
    }

    let streak = 0;
    let lastWorkoutDate = null;
    let currentDate = new Date();

    // Sort workout history by date in ascending order
    const sortedHistory = [...workoutHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const workoutDay = new Date(sortedHistory[i].date);
        workoutDay.setHours(0, 0, 0, 0); // Normalize to start of day

        if (i === sortedHistory.length - 1) {
            // Check if the most recent workout was today or yesterday
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            if (workoutDay.getTime() === today.getTime()) {
                streak = 1;
                lastWorkoutDate = today;
            } else if (workoutDay.getTime() === yesterday.getTime()) {
                streak = 1;
                lastWorkoutDate = yesterday;
            } else {
                streak = 0; // No workout today or yesterday, streak broken
                break;
            }
        } else {
            // Check if current workout day is exactly one day before the last counted workout day
            const expectedPreviousDay = new Date(lastWorkoutDate);
            expectedPreviousDay.setDate(lastWorkoutDate.getDate() - 1);
            expectedPreviousDay.setHours(0, 0, 0, 0);

            if (workoutDay.getTime() === expectedPreviousDay.getTime()) {
                streak++;
                lastWorkoutDate = workoutDay;
            } else if (workoutDay.getTime() < expectedPreviousDay.getTime()) {
                // Gap found, streak broken
                break;
            }
            // If workoutDay is the same as lastWorkoutDate (multiple workouts on same day), continue
        }
    }
    currentStreak = streak;
}


/**
 * Checks for and unlocks badges.
 */
function checkBadges() {
    const currentStats = {
        workoutHistory: workoutHistory,
        totalWeightLifted: totalWeightLifted,
        totalPoints: totalPoints,
        currentStreak: currentStreak,
        badgesEarned: badgesEarned,
        personalBests: personalBests
    };

    BADGES.forEach(badge => {
        if (!badgesEarned.includes(badge.name)) {
            if (badge.unlockCondition(currentStats)) {
                badgesEarned.push(badge.name);
                showMessageBox(`🎉 New Badge Unlocked! 🎉\n${badge.emoji} ${badge.name}: ${badge.description}`);
            }
        }
    });
    saveData(); // Save after potentially unlocking new badges
    renderBadges(); // Re-render badges to show new ones
}

// --- Event Handlers ---

/**
 * Handles workout form submission.
 * @param {Event} event - The form submit event.
 */
function handleWorkoutSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    const exerciseName = exerciseSelect.value;
    const sets = parseInt(setsInput.value);
    const reps = parseInt(repsInput.value);
    const weight = parseFloat(weightInput.value);

    if (isNaN(sets) || sets <= 0 || isNaN(reps) || reps <= 0 || isNaN(weight) || weight < 0) {
        showMessageBox("Please enter valid positive numbers for Sets, Reps, and Weight (or 0 for assisted pull-up weight).");
        return;
    }

    const selectedExercise = EXERCISES.find(ex => ex.name === exerciseName);
    if (!selectedExercise) {
        showMessageBox("Selected exercise not found.");
        return;
    }

    const timestamp = new Date().toISOString();
    const today = getFormattedDate(new Date());

    let dailyWorkoutEntry = workoutHistory.find(w => w.date === today);
    if (!dailyWorkoutEntry) {
        dailyWorkoutEntry = { date: today, workouts: [] };
        workoutHistory.push(dailyWorkoutEntry);
    }

    let totalPointsForWorkout = 0;
    let totalWeightForWorkout = 0;

    for (let i = 0; i < sets; i++) {
        const pointsForSet = calculatePoints(weight, reps, selectedExercise);
        const totalWeightForSet = weight * reps;

        totalPointsForWorkout += pointsForSet;
        totalWeightForWorkout += totalWeightForSet;

        // Update personal bests
        if (!personalBests[exerciseName] || pointsForSet > personalBests[exerciseName].points) {
            personalBests[exerciseName] = {
                weight: weight,
                reps: reps,
                points: pointsForSet,
                timestamp: timestamp
            };
        }
    }

    const workoutData = {
        timestamp: timestamp,
        exerciseName: exerciseName,
        sets: sets,
        reps: reps,
        weight: weight,
        pointsEarned: totalPointsForWorkout, // Total points for all sets of this exercise
        totalWeightForSet: totalWeightForWorkout // Total weight lifted for all sets of this exercise
    };

    dailyWorkoutEntry.workouts.push(workoutData);

    totalPoints += totalPointsForWorkout;
    totalWeightLifted += totalWeightForWorkout;

    updateDailyStreak(); // Update streak after logging a workout
    saveData();
    updateUI();
    checkBadges();

    // Clear form inputs
    setsInput.value = 3;
    repsInput.value = 10;
    weightInput.value = 100;
}

/**
 * Handles exporting data to JSON.
 */
function handleExportData() {
    const dataToExport = {
        workoutHistory,
        totalWeightLifted,
        totalPoints,
        currentStreak,
        badgesEarned,
        personalBests
    };
    dataTransferArea.value = JSON.stringify(dataToExport, null, 2);
    dataTransferArea.classList.remove('hidden');
    dataTransferArea.select(); // Select the text for easy copying
    showMessageBox("Data copied to the text area. Copy it to a safe place!");
}

/**
 * Handles importing data from JSON.
 */
function handleImportData() {
    dataTransferArea.classList.toggle('hidden');
    if (!dataTransferArea.classList.contains('hidden')) {
        dataTransferArea.value = ''; // Clear for pasting
        dataTransferArea.placeholder = "Paste your JSON data here and click 'Import Data' again.";
        showMessageBox("Paste your JSON data into the text area and click 'Import Data' again.");
    } else {
        const jsonString = dataTransferArea.value;
        if (jsonString) {
            try {
                const importedData = JSON.parse(jsonString);
                // Basic validation for imported data structure
                if (importedData.workoutHistory && Array.isArray(importedData.workoutHistory) &&
                    typeof importedData.totalWeightLifted === 'number' &&
                    typeof importedData.totalPoints === 'number' &&
                    typeof importedData.currentStreak === 'number' &&
                    importedData.badgesEarned && Array.isArray(importedData.badgesEarned) &&
                    importedData.personalBests && typeof importedData.personalBests === 'object') {

                    workoutHistory = importedData.workoutHistory;
                    totalWeightLifted = importedData.totalWeightLifted;
                    totalPoints = importedData.totalPoints;
                    currentStreak = importedData.currentStreak;
                    badgesEarned = importedData.badgesEarned;
                    personalBests = importedData.personalBests;

                    saveData(); // Save imported data
                    updateUI();
                    checkBadges(); // Re-check badges in case new conditions are met
                    showMessageBox("Data imported successfully!");
                } else {
                    showMessageBox("Invalid JSON data structure. Please ensure it matches the expected format.");
                }
            } catch (e) {
                console.error("Error parsing imported JSON:", e);
                showMessageBox("Invalid JSON data. Please check the format.");
            }
        } else {
            showMessageBox("No data to import. Paste JSON into the text area first.");
        }
    }
}


// --- Initialization ---

/**
 * Initializes the application.
 */
function initApp() {
    populateExerciseDropdown();
    loadData();
    updateDailyStreak(); // Calculate streak on load
    updateUI();
    checkBadges(); // Check badges on load for any newly met conditions

    // Event Listeners
    workoutForm.addEventListener('submit', handleWorkoutSubmit);
    exportDataBtn.addEventListener('click', handleExportData);
    importDataBtn.addEventListener('click', handleImportData);
    messageBoxCloseBtn.addEventListener('click', hideMessageBox);
}

// Run initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
