"use strict";

const form = document.getElementById("plan-form");
const button = form.querySelector("button");
const statusEl = document.getElementById("status");
const results = document.getElementById("results");

const GENERIC_ERROR = "Something went wrong. Please try again.";
const STREAK_KEY = "clean-air-streak";
const SECTION_TITLES = { indoor: "Indoor air quality hacks", alternatives: "Sustainable alternatives" };
const MODE_LABELS = {
  car: "car", motorbike: "motorbike", bus: "bus", metro: "metro", walk_or_cycle: "walking or cycling",
};

const slug = (category) => category.toLowerCase().replaceAll(" ", "-");
const isoDay = (daysAgo = 0) => new Date(Date.now() - daysAgo * 864e5).toLocaleDateString("en-CA");

// Everything is built with textContent, so nothing from the server is ever parsed as HTML.
function el(tag, text = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

function card(title, ...children) {
  const node = el("section", "", "card");
  node.append(el("h2", title), ...children);
  return node;
}

function list(items) {
  const ul = el("ul");
  ul.append(...items.map((item) => el("li", item)));
  return ul;
}

// The streak lives in this browser only; nothing is sent to the server.
function loadStreak() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY)) || { last: "", days: 0 };
  } catch {
    return { last: "", days: 0 };
  }
}

function currentStreak() {
  const { last, days } = loadStreak();
  return last === isoDay() || last === isoDay(1) ? days : 0;
}

function completeToday() {
  const { last, days } = loadStreak();
  if (last === isoDay()) return;
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ last: isoDay(), days: last === isoDay(1) ? days + 1 : 1 }));
  } catch { /* storage unavailable: the streak simply won't be saved */ }
}

function alertBox(text) {
  if (!text) return [];
  const box = el("p", text, "alert");
  box.setAttribute("role", "alert");
  return [box];
}

function airCard({ city, country, aqi, pm25, category }) {
  const node = card(`Air in ${[city, country].filter(Boolean).join(", ")}`,
    el("p", String(aqi), "number"),
    el("p", `US AQI: ${category}`, "verdict"),
    el("p", `PM2.5: ${pm25} µg/m³`));
  node.classList.add("air", `band-${slug(category)}`);
  return node;
}

function outlookCard({ hours, best, worst }) {
  const strip = el("ol", "", "strip");
  strip.setAttribute("aria-hidden", "true"); // the sentence below says the same thing in words
  strip.append(...hours.map((h) => {
    const cell = el("li", "", `band-${slug(h.category)}`);
    cell.title = `${h.label}: AQI ${h.aqi} (${h.category})`;
    return cell;
  }));
  return card("The next 24 hours", strip,
    el("p", `Best time to be outside: ${best.label} (AQI ${best.aqi}). Roughest: ${worst.label} (AQI ${worst.aqi}).`));
}

function impactCard({ mode, monthly_co2_kg: kg, switches }) {
  const lines = switches.map((s) => `Switching to ${MODE_LABELS[s.mode]} saves about ${s.saves_kg} kg CO₂ a month.`);
  return card("Your commute impact",
    el("p", `Commuting by ${MODE_LABELS[mode]} adds roughly ${kg} kg CO₂ a month.`),
    lines.length ? list(lines) : el("p", "You already use the cleanest option."));
}

function pledgeCard(items) {
  const message = el("p", "", "note");
  message.setAttribute("aria-live", "polite");
  const showStreak = () => { message.textContent = `Streak: ${currentStreak()} day(s). Tick every action to extend it.`; };
  const boxes = items.map((item) => {
    const box = Object.assign(document.createElement("input"), { type: "checkbox" });
    const label = el("label", "", "check");
    label.append(box, ` ${item}`);
    return { box, label };
  });
  for (const { box } of boxes) {
    box.addEventListener("change", () => {
      if (boxes.every((b) => b.box.checked)) completeToday();
      showStreak();
    });
  }
  showStreak();
  const node = card("Today's low-emission routine", ...boxes.map((b) => b.label), message);
  node.classList.add("pledge");
  return node;
}

function shareButton({ air, outlook, impact }) {
  const share = el("button", "Copy a summary to share");
  share.type = "button";
  share.addEventListener("click", async () => {
    const best = outlook ? ` Best time outside: ${outlook.best.label}.` : "";
    const text = `Air in ${air.city} right now: AQI ${air.aqi} (${air.category}).${best} My commute adds about ${impact.monthly_co2_kg} kg CO₂ a month. Checked with SmogSlayer.`;
    try {
      await navigator.clipboard.writeText(text);
      statusEl.textContent = "Summary copied.";
    } catch {
      statusEl.textContent = "Couldn't copy automatically. Please copy the details by hand.";
    }
  });
  return share;
}

function render(data) {
  const { air, alert: warning, outlook, impact, advice, disclaimer } = data;
  const lists = Object.entries(SECTION_TITLES).map(([key, title]) => card(title, list(advice[key])));
  results.replaceChildren(
    ...alertBox(warning), airCard(air), ...(outlook ? [outlookCard(outlook)] : []), impactCard(impact),
    pledgeCard(advice.routine), ...lists, shareButton(data), el("p", disclaimer, "note"));
  document.body.className = `band-${slug(air.category)}`; // tint the page like the sky
  results.focus();
}

function showError(message) {
  results.replaceChildren();
  document.body.className = "";
  statusEl.textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const body = {
    city: data.get("city"),
    commute_mode: data.get("commute_mode"),
    one_way_km: Number(data.get("one_way_km")),
    sensitive_group: data.has("sensitive_group"),
    has_purifier: data.has("has_purifier"),
    language: data.get("language"),
  };
  button.disabled = true;
  statusEl.textContent = "Checking the air in your city…";
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      render(payload);
      statusEl.textContent = "Your plan is ready.";
    } else {
      showError(payload.error || GENERIC_ERROR);
    }
  } catch {
    showError(GENERIC_ERROR);
  } finally {
    button.disabled = false;
  }
});
