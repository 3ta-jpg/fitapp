// script.js

// --- Initialization ---
const form = document.getElementById("workoutForm");
const select = document.getElementById("exerciseSelect");
const logList = document.getElementById("logList");
const badgeListEl = document.getElementById("badgeList");
const feedback = document.getElementById("workoutFeedback");

let state = {
  totalPoints: 0,
  totalWeight: 0,
  streak: 0,
  lastDate: null,
  badges: [],
  history: {},
  totalLogs: 0,
  lastLogHour: null
};

function loadState() {
  const saved = localStorage.getItem("fitnessApp");
  if (saved) state = JSON.parse(saved);
}

function saveState() {
  localStorage.setItem("fitnessApp", JSON.stringify(state));
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

// --- Populate Exercises ---
function populateExercises() {
  exercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.name;
    opt.textContent = ex.name;
    select.appendChild(opt);
  });
}

// --- Calculate Points ---
function calculatePoints(exercise, reps, weight, sets) {
  const ex = exercises.find(e => e.name === exercise);
  if (!ex) return 0;

  const totalReps = reps * sets;
  let volume = weight * totalReps;

  if (ex.name === "Assisted Pull-Up") {
    volume = totalReps * (200 - weight); // inverse: less assist = more work
  }

  return Math.round(Math.sqrt(volume * Math.abs(ex.scale)));
}

// --- Badge Checking ---
function checkBadges() {
  badgeList.forEach(b => {
    if (!state.badges.includes(b.name) && b.condition(state)) {
      state.badges.push(b.name);
    }
  });
}

// --- Render Functions ---
function renderLog() {
  const day = todayKey();
  const logs = state.history[day] || [];
  logList.innerHTML = "";
  logs.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.exercise}: ${item.sets}×${item.reps} @ ${item.weight} lbs → ${item.points} pts`;
    logList.appendChild(li);
  });
}

function renderBadges() {
  badgeListEl.innerHTML = "";
  state.badges.forEach(name => {
    const badge = badgeList.find(b => b.name === name);
    if (badge) {
      const li = document.createElement("li");
      li.textContent = `${badge.emoji} ${badge.name} — ${badge.description}`;
      badgeListEl.appendChild(li);
    }
  });
}

function updateSummary() {
  document.getElementById("totalPoints").textContent = state.totalPoints;
  document.getElementById("totalWeight").textContent = state.totalWeight;
  document.getElementById("streak").textContent = state.streak;
}

// --- Handle Workout Logging ---
form.addEventListener("submit", e => {
  e.preventDefault();

  const exercise = select.value;
  const sets = parseInt(document.getElementById("sets").value);
  const reps = parseInt(document.getElementById("reps").value);
  const weight = parseInt(document.getElementById("weight").value);

  const points = calculatePoints(exercise, reps, weight, sets);
  const lifted = weight * reps * sets;
  const day = todayKey();
  const now = new Date();

  if (!state.history[day]) state.history[day] = [];
  state.history[day].push({ exercise, sets, reps, weight, points });

  state.totalPoints += points;
  state.totalWeight += lifted;
  state.totalLogs++;
  state.lastLogHour = now.getHours();

  if (state.lastDate !== day) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (state.lastDate === yesterday.toISOString().split("T")[0]) {
      state.streak++;
    } else {
      state.streak = 1;
    }
    state.lastDate = day;
  }

  checkBadges();
  saveState();
  renderLog();
  renderBadges();
  updateSummary();

  feedback.textContent = `+${points} pts earned!`;
});

// --- Export / Import ---
document.getElementById("exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fitness-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importDataPrompt").addEventListener("click", () => {
  const json = prompt("Paste your exported JSON data here:");
  try {
    const parsed = JSON.parse(json);
    state = parsed;
    saveState();
    renderLog();
    renderBadges();
    updateSummary();
    alert("Data imported!");
  } catch (err) {
    alert("Invalid JSON data.");
  }
});

// --- Startup ---
loadState();
populateExercises();
renderLog();
renderBadges();
updateSummary();
