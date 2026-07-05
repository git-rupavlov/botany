const BULGARIAN_CATALOG_URL = "data/catalog/bulgaria-heritage-tomatoes.json?v=20260705-3";

function waitForDatasetForBulgarianLayer() {
  return new Promise((resolve) => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (typeof state !== "undefined" && state?.dataset?.entities?.length && state?.dataset?.metrics?.length) {
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

function ensureBulgarianSelectorCategory() {
  if (typeof BOTANICAL_SECTIONS === "undefined" || !Array.isArray(BOTANICAL_SECTIONS)) return;
  if (!BOTANICAL_SECTIONS.some((section) => section.id === "bulgarian")) {
    BOTANICAL_SECTIONS.splice(2, 0, {
      id: "bulgarian",
      label: "Български",
      description: "Български стабилни, дворни, стари и масови културни домати. Това е категория видове в селектора, не radar preset."
    });
  }
}

function textOf(entity) {
  return `${entity.id || ""} ${entity.name || ""} ${entity.latin || ""} ${entity.role || ""} ${entity.summary || ""}`.toLowerCase();
}

function isF1Entity(entity) {
  return textOf(entity).includes("f1");
}

function isBulgarianEntity(entity) {
  const text = textOf(entity);
  return [
    "розова мечта", "rozova", "розово сърце", "розов", "биволско", "момини", "гигант",
    "идеал", "рила", "трапезица", "наслада", "опал", "алено", "градински", "консервен",
    "bulgarian", "българ"
  ].some((word) => text.includes(word));
}

function applyBulgarianSection(entity) {
  if (isBulgarianEntity(entity) && !isF1Entity(entity)) {
    entity.section = "bulgarian";
    if (entity.profile) entity.profile.category = "Български";
  }
  return entity;
}

function normalizeBulgarianItem(item) {
  const facts = item.retailFacts || [];
  return {
    id: item.id,
    name: item.name,
    section: "bulgarian",
    originalSection: item.section,
    latin: item.latin,
    role: item.status || "Bulgarian heritage tomato",
    summary: facts.join("; "),
    fruitWeight: item.raw?.fruit_weight || "n/a",
    yieldPerPlant: item.raw?.yield_per_plant || "n/a",
    yieldPerSquareMeter: item.raw?.yield_per_square_meter || "n/a",
    sugarPer100g: item.raw?.sugar_content || "n/a",
    profile: {
      category: "Български",
      growthHabit: "български дворен, стар или масов културен тип",
      overview: `${item.name}: ${facts.join("; ")}.`,
      strengths: ["българска градинска/историческа стойност", "подходящ за собствено семесъбиране, ако е стабилна линия"],
      weaknesses: ["част от историческите данни са работни и трябва да се потвърдят с първични източници"],
      bestUse: ["градина", "собствени семена", "историческо сравнение", "салата/консервиране според типа"],
      tags: ["bulgarian", item.section || "heritage"]
    },
    scores: item.scores || {},
    raw: item.raw || {},
    evidence: { retail: 1, scientific: 1, note: "Working Bulgarian category pending primary sources." }
  };
}

async function loadBulgarianLayer() {
  const ready = await waitForDatasetForBulgarianLayer();
  if (!ready) return;

  ensureBulgarianSelectorCategory();
  state.dataset.entities.forEach(applyBulgarianSection);

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

  renderEntityControls();
  refreshComparisonViews();
  document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
}

loadBulgarianLayer();
