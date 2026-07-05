const BULGARIAN_CATALOG_URL = "data/catalog/bulgaria-heritage-tomatoes.json?v=20260705-1";

const BULGARIAN_METRICS = [
  { id: "bulgarian_heritage_value", label: "Българска наследствена стойност", shortLabel: "Българско", group: "Български", timeline: false, note: "Историческа, местна и културна стойност за български градини." },
  { id: "socialist_mass_value", label: "Масовост през Соца", shortLabel: "Соц масовост", group: "Български", timeline: false, note: "Колко добре пасва на масови сортове/типове от периода на централизирано производство и консервиране." },
  { id: "household_garden_value", label: "Дворна градинска стойност", shortLabel: "Двор", group: "Български", timeline: false, note: "Стойност за хорските градини, дворни линии, собствени семена и домашни буркани." },
  { id: "seed_saving_value", label: "Стойност за собствени семена", shortLabel: "Семена", group: "Български", timeline: false, note: "По-високо при стабилни сортове и местни линии, ниско при F1." },
  { id: "local_adaptation", label: "Локална адаптация", shortLabel: "Адаптация", group: "Български", timeline: false, note: "Практическа пригодност към български дворни/полски условия." }
];

function waitForDatasetForBulgarianLayer() {
  return new Promise((resolve) => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.state?.dataset?.entities?.length && window.state?.dataset?.metrics?.length) {
        clearInterval(timer);
        resolve(true);
      }
      if (tries > 100) {
        clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

function ensureBulgarianMetrics() {
  const existing = new Set(state.dataset.metrics.map((metric) => metric.id));
  BULGARIAN_METRICS.forEach((metric) => {
    if (!existing.has(metric.id)) state.dataset.metrics.push(metric);
  });
}

function textOf(entity) {
  return `${entity.id || ""} ${entity.name || ""} ${entity.latin || ""} ${entity.role || ""} ${entity.summary || ""}`.toLowerCase();
}

function isF1Entity(entity) {
  return textOf(entity).includes("f1");
}

function isOldBulgarianName(entity) {
  const text = textOf(entity);
  return ["идеал", "рила", "трапезица", "наслада", "опал", "розово сърце", "биволско", "розов гигант", "момини", "стара розова", "червен градински", "консервен"].some((word) => text.includes(word));
}

function isPinkGardenType(entity) {
  const text = textOf(entity);
  return ["розов", "pink", "сърце", "биволско", "гигант", "момини"].some((word) => text.includes(word));
}

function bulgarianMetricScore(entity, metricId) {
  if (isF1Entity(entity)) {
    if (metricId === "seed_saving_value") return 2;
    if (metricId === "socialist_mass_value") return 4;
    if (metricId === "bulgarian_heritage_value") return 4;
    if (metricId === "household_garden_value") return 5;
    if (metricId === "local_adaptation") return 6;
  }

  if (isOldBulgarianName(entity)) {
    if (metricId === "bulgarian_heritage_value") return 9;
    if (metricId === "household_garden_value") return 9;
    if (metricId === "seed_saving_value") return 8;
    if (metricId === "local_adaptation") return 8;
    if (metricId === "socialist_mass_value") return isPinkGardenType(entity) ? 5 : 8;
  }

  if (isPinkGardenType(entity)) {
    if (metricId === "bulgarian_heritage_value") return 8;
    if (metricId === "household_garden_value") return 8;
    if (metricId === "seed_saving_value") return 7;
    if (metricId === "local_adaptation") return 7;
    if (metricId === "socialist_mass_value") return 4;
  }

  if ((entity.section || "").includes("wild")) {
    if (metricId === "seed_saving_value") return 8;
    if (metricId === "local_adaptation") return 6;
    return 3;
  }

  const fallback = {
    bulgarian_heritage_value: 5,
    socialist_mass_value: 5,
    household_garden_value: 6,
    seed_saving_value: 7,
    local_adaptation: 6
  };
  return fallback[metricId] ?? 5;
}

function ensureBulgarianScores(entity) {
  entity.scores = entity.scores || {};
  BULGARIAN_METRICS.forEach((metric) => {
    if (entity.scores[metric.id] === undefined || entity.scores[metric.id] === null) {
      entity.scores[metric.id] = bulgarianMetricScore(entity, metric.id);
    }
  });
  return entity;
}

function normalizeBulgarianItem(item) {
  const facts = item.retailFacts || [];
  const entity = {
    id: item.id,
    name: item.name,
    section: "cultivated-stable",
    originalSection: item.section,
    latin: item.latin,
    role: item.status || "Bulgarian heritage tomato",
    summary: facts.join("; "),
    fruitWeight: item.raw?.fruit_weight || "n/a",
    yieldPerPlant: item.raw?.yield_per_plant || "n/a",
    yieldPerSquareMeter: item.raw?.yield_per_square_meter || "n/a",
    sugarPer100g: item.raw?.sugar_content || "n/a",
    profile: {
      category: "Култивирани (стабилни)",
      growthHabit: "български дворен/исторически културен тип",
      overview: `${item.name}: ${facts.join("; ")}.`,
      strengths: ["българска градинска/историческа стойност", "подходящ за сравнение със съвременни F1 и диви линии"],
      weaknesses: ["част от данните са работни и трябва да се потвърдят с първични източници"],
      bestUse: ["градина", "собствени семена", "историческо сравнение", "салата/консервиране според типа"],
      tags: ["bulgarian", item.section || "heritage"]
    },
    scores: item.scores || {},
    raw: item.raw || {},
    evidence: { retail: 1, scientific: 1, note: "Working historical layer pending Bulgarian primary sources." }
  };
  return ensureBulgarianScores(entity);
}

async function loadBulgarianLayer() {
  const ready = await waitForDatasetForBulgarianLayer();
  if (!ready) return;

  ensureBulgarianMetrics();
  state.dataset.entities.forEach(ensureBulgarianScores);

  try {
    const response = await fetch(BULGARIAN_CATALOG_URL, { cache: "no-store" });
    const catalog = await response.json();
    const existingIds = new Set(state.dataset.entities.map((entity) => entity.id));
    const newEntities = (catalog.items || [])
      .filter((item) => !existingIds.has(item.id))
      .map(normalizeBulgarianItem);
    state.dataset.entities.push(...newEntities);
    state.selectedEntityIds = state.dataset.entities.map((entity) => entity.id);
  } catch (error) {
    console.warn("Bulgarian layer catalog failed", error);
  }

  renderRadarPresets();
  renderAxisControls();
  renderEntityControls();
  refreshComparisonViews();
  document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
}

loadBulgarianLayer();
