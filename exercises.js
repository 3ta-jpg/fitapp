// exercises.js

export const exercises = [
  { name: "Incline Bench (Machine)", baseline: 225, scale: 1.0 },
  { name: "Tricep Machine", baseline: 150, scale: 0.9 },
  { name: "Lateral Raise Machine", baseline: 80, scale: 0.8 },
  { name: "Tricep Pushdown", baseline: 120, scale: 0.85 },
  { name: "Pec Fly", baseline: 100, scale: 0.8 },
  { name: "Shoulder Press Machine", baseline: 150, scale: 0.95 },
  { name: "Assisted Pull-Up", baseline: 0, scale: -1.0 }, // special logic
  { name: "Preacher Curl Machine", baseline: 100, scale: 0.9 },
  { name: "Face Pull", baseline: 90, scale: 0.8 },
  { name: "Bench-Assisted Bicep Curl", baseline: 60, scale: 0.75 },
  { name: "Lat Pulldown", baseline: 120, scale: 1.0 },
  { name: "Chest-Supported Row Machine", baseline: 130, scale: 1.0 },
  { name: "Barbell Back Squat", baseline: 315, scale: 1.0 },
  { name: "Leg Press", baseline: 400, scale: 1.1 },
  { name: "Supine Hamstring Curl", baseline: 100, scale: 0.9 },
  { name: "Seated Hamstring Curl", baseline: 110, scale: 0.95 },
  { name: "Calf Press Machine", baseline: 250, scale: 0.85 },
];

export const badgeList = [
  { name: "First Log", emoji: "🏁", description: "Logged your first workout.", condition: data => data.totalLogs >= 1 },
  { name: "Iron Rookie", emoji: "🛠️", description: "Lifted 100,000 lbs total.", condition: data => data.totalWeight >= 100000 },
  { name: "Golden Titan", emoji: "🏆", description: "Lifted 1,000,000 lbs total.", condition: data => data.totalWeight >= 1000000 },
  { name: "Daily Grind", emoji: "📅", description: "7-day workout streak.", condition: data => data.streak >= 7 },
  { name: "Early Bird", emoji: "🌅", description: "Logged a workout before 6AM.", condition: data => data.lastLogHour < 6 },
];
