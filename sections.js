const CATALOG_URLS = [
  "data/catalog/semenaonline-tomatoes.json?v=20260705-4",
  "data/catalog/bulgaria-cultivated-tomatoes.json?v=20260705-3"
];

const BOTANICAL_SECTIONS = [
  { id: "wild", label: "Диви", description: "Реални диви видове или линии с ясно посочен див вид." },
  { id: "semi-wild", label: "Полу-Диви", description: "Дребноплодни, касисови или примитивни линии без сигурен чист див статус." },
  { id: "cultivated-stable", label: "Култивирани (стабилни)", description: "Утвърдени сортове и стабилни културни линии." },
  { id: "cultivated-f1", label: "Култивирани (хибрид F1)", description: "F1 хибриди." },
  { id: "cultivated-gmo", label: "Култивирани (ГМО)", description: "Няма добавени линии." },
  { id: "cultivated-crispr", label: "Култивирани (КРИСПР)", description: "Няма добавени линии." }
];

const CONSUMER_METRICS = [
  { id: "availability", label: "Наличност", shortLabel: "Наличност", group: "Консуматор", timeline: false, note: "Колко лесно може да се намери като семена/разсад/плод в България или масовия пазар." },
  { id: "phytonutrient_profile", label: "Пълен профил вещества", shortLabel: "Профил вещества", group: "Консуматор", timeline: false, note: "Ширина на хранителния профил: витамини, минерали, каротеноиди, ликопен, антиоксиданти и други полезни вещества." },
  { id: "body_benefit_per_100g", label: "Полза за тялото / 100 g", shortLabel: "Полза / 100g", group: "Консуматор", timeline: false, note: "Оценка на полезността на 100 g плод на база плътност на полезни вещества. Работен индекс, не медицинско твърдение." }
];

const SECTION_ORDER = BOTANICAL_SECTIONS.map((section) => section.id);
const SKIP_ITEM_IDS = new Set(["bio_rote_murmel_pimpinellifolium", "sweet_pea_pimpinellifolium_semenaonline", "vilma_semenaonline"]);

function sectionLabel(sectionId) { return BOTANICAL_SECTIONS.find((section) => section.id === sectionId)?.label || sectionId; }
function sectionDescription(sectionId) { return BOTANICAL_SECTIONS.find((section) => section.id === sectionId)?.description || ""; }
function sectionRank(sectionId) { const index = SECTION_ORDER.indexOf(sectionId); return index === -1 ? 99 : index; }

function ensureConsumerMetrics() {
  const existing = new Set(state.dataset.metrics.map((metric) => metric.id));
  CONSUMER_METRICS.forEach((metric) => {
    if (!existing.has(metric.id)) state.dataset.metrics.push(metric);
  });
}

function classifyText(text) {
  const value = text.toLowerCase();
  if (value.includes("crispr")) return "cultivated-crispr";
  if (value.includes("gmo")) return "cultivated-gmo";
  if (value.includes("f1")) return "cultivated-f1";
  if (value.includes("solanum pimpinellifolium") || value.includes("див тип")) return "wild";
  if (value.includes("currant") || value.includes("micro") || value.includes("murmel") || value.includes("mirabelle") || value.includes("gold rush")) return "semi-wild";
  return "cultivated-stable";
}

function classifyItem(item) { return classifyText(`${item.id || ""} ${item.name || ""} ${item.latin || ""} ${item.status || ""} ${item.section || ""}`); }
function classifyEntity(entity) { return classifyText(`${entity.id || ""} ${entity.name || ""} ${entity.latin || ""} ${entity.role || ""} ${entity.profile?.category || ""}`); }

function hasText(entity, words) {
  const value = `${entity.id || ""} ${entity.name || ""} ${entity.latin || ""} ${entity.role || ""} ${entity.summary || ""}`.toLowerCase();
  return words.some((word) => value.includes(word));
}

function consumerScore(entity, metricId) {
  const section = entity.section || classifyEntity(entity);
  if (metricId === "availability") {
    if (section === "cultivated-stable") return 8;
    if (section === "cultivated-f1") return 7;
    if (section === "semi-wild") return 5;
    if (section === "wild") return 4;
    return 1;
  }
  if (metricId === "phytonutrient_profile") {
    if (hasText(entity, ["yellow", "orange", "жълт", "оранж"])) return 8;
    if (section === "wild" || section === "semi-wild") return 9;
    if (hasText(entity, ["cherry", "чери", "currant"])) return 8;
    return 7;
  }
  if (metricId === "body_benefit_per_100g") {
    if (section === "wild" || section === "semi-wild") return 9;
    if (hasText(entity, ["cherry", "чери", "yellow", "orange", "жълт", "оранж"])) return 8;
    return 7;
  }
  return null;
}

function defaultScore(entity, metric) {
  const special = consumerScore(entity, metric.id);
  if (special !== null) return special;

  const section = entity.section || classifyEntity(entity);
  const group = metric.group;
  if (section === "wild") {
    if (["Здраве", "Климат", "Почва", "Корени", "Селекция"].includes(group)) return 8;
    if (metric.id === "fruit_size" || metric.id === "harvest_ease") return 3;
    return 7;
  }
  if (section === "semi-wild") {
    if (["Здраве", "Климат"].includes(group)) return 7;
    if (group === "Корени") return 6;
    if (metric.id === "fruit_size") return 2;
    return 7;
  }
  if (section === "cultivated-f1") {
    if (["Добив", "Практичност"].includes(group)) return 8;
    if (group === "Селекция") return 3;
    return 6;
  }
  if (section === "cultivated-gmo" || section === "cultivated-crispr") return 0;
  if (metric.id === "flavor" || metric.id === "edible_value") return 8;
  if (metric.id === "rootstock_value") return 4;
  return 6;
}

function ensureScores(entity) {
  const scores = { ...(entity.scores || {}) };
  state.dataset.metrics.forEach((metric) => {
    if (scores[metric.id] === undefined || scores[metric.id] === null || Number.isNaN(scores[metric.id])) scores[metric.id] = defaultScore(entity, metric);
  });
  entity.scores = scores;
  return entity;
}

function normalizeCatalogItem(item) {
  const section = classifyItem(item);
  const facts = item.retailFacts || [];
  const entity = {
    id: item.id,
    name: item.name,
    section,
    originalSection: item.section,
    latin: item.latin,
    role: item.status || sectionLabel(section),
    summary: facts.join("; "),
    fruitWeight: item.raw?.fruit_weight || item.raw?.fruit_size || "n/a",
    yieldPerPlant: item.raw?.yield_per_plant || "n/a",
    yieldPerSquareMeter: item.raw?.yield_per_square_meter || "n/a",
    sugarPer100g: item.raw?.sugar_content || "n/a",
    sourceUrl: item.sourceUrl,
    profile: {
      category: sectionLabel(section),
      growthHabit: item.raw?.plant_height ? `reported height: ${item.raw.plant_height}` : sectionLabel(section),
      overview: `${item.name}: ${facts.join("; ")}.`,
      strengths: buildStrengths(item, section),
      weaknesses: buildWeaknesses(item, section),
      bestUse: buildBestUse(section),
      tags: [section, item.status || "catalog"]
    },
    scores: item.scores || {},
    raw: item.raw || {},
    evidence: { retail: 2, scientific: item.latin?.includes("pimpinellifolium") ? 3 : 1 }
  };
  return ensureScores(entity);
}

function buildStrengths(item, section) {
  const facts = item.retailFacts || [];
  const out = [];
  if (section === "wild") out.push("висока стойност за подложка и селекция");
  if (section === "semi-wild") out.push("дребноплоден тип с добра жизненост");
  if (section === "cultivated-stable") out.push("стабилен културен сорт/тип");
  if (section === "cultivated-f1") out.push("еднакво поведение и комерсиална стабилност");
  if (facts.some((fact) => fact.toLowerCase().includes("early") || fact.includes("ран"))) out.push("ранен тип");
  return out.length ? out : ["практически познат доматен тип"];
}

function buildWeaknesses(item, section) {
  const out = [];
  if (section === "cultivated-f1") out.push("не е стабилен за собствени семена");
  if (section === "semi-wild") out.push("не е сигурен чист див вид");
  if (section === "wild" || section === "semi-wild") out.push("дребният плод се бере по-бавно");
  if (section === "cultivated-stable") out.push("по-слаба стойност за подложка спрямо дивите видове");
  return out.length ? out : ["показателите искат потвърждение с първични източници"];
}

function buildBestUse(section) {
  if (section === "wild") return ["подложка", "селекция", "генетичен резерв", "многогодишен експеримент"];
  if (section === "semi-wild") return ["чери реколта", "селекция", "домашна устойчивост"];
  if (section === "cultivated-f1") return ["добив", "пазар", "оранжерия", "интензивно отглеждане"];
  if (section === "cultivated-stable") return ["градина", "салата", "консервиране", "собствени семена"];
  return ["само при конкретна доказана линия"];
}

function keepCatalogItem(item) { return !SKIP_ITEM_IDS.has(item.id) && !item.aliasOf; }

async function waitForBaseDataset() {
  for (let i = 0; i < 80; i += 1) {
    if (state?.dataset?.entities?.length && state?.dataset?.metrics?.length) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

async function loadCatalogs() {
  const catalogs = [];
  for (const url of CATALOG_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      catalogs.push(await response.json());
    } catch (error) {
      console.warn("Catalog failed to load", url, error);
    }
  }
  return catalogs;
}

async function loadCatalogLayer() {
  const ready = await waitForBaseDataset();
  if (!ready) return;

  ensureConsumerMetrics();
  const catalogs = await loadCatalogs();
  state.catalogs = catalogs;
  state.catalogSections = BOTANICAL_SECTIONS;

  state.dataset.entities.forEach((entity) => {
    entity.section = classifyEntity(entity);
    ensureScores(entity);
  });

  const existingIds = new Set(state.dataset.entities.map((entity) => entity.id));
  const newEntities = catalogs
    .flatMap((catalog) => catalog.items || [])
    .filter(keepCatalogItem)
    .filter((item) => !existingIds.has(item.id))
    .map(normalizeCatalogItem);

  state.dataset.entities.push(...newEntities);
  state.selectedEntityIds = state.dataset.entities.map((entity) => entity.id);

  renderRadarPresets();
  renderAxisControls();
  renderEntityControls();
  refreshComparisonViews();
  document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
}

renderEntityControls = function renderGroupedEntityControls() {
  const container = document.querySelector("#entityControls");
  if (!container || !state?.dataset?.entities) return;
  container.innerHTML = "";

  const groups = new Map();
  BOTANICAL_SECTIONS.forEach((section) => groups.set(section.id, []));
  state.dataset.entities.forEach((entity) => {
    const section = entity.section || classifyEntity(entity);
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(entity);
  });

  [...groups.entries()].sort(([left], [right]) => sectionRank(left) - sectionRank(right) || left.localeCompare(right)).forEach(([sectionId, entities]) => {
    const section = document.createElement("section");
    section.className = "entity-section";
    section.innerHTML = `
      <header class="entity-section-header"><div><h3>${sectionLabel(sectionId)}</h3><p>${sectionDescription(sectionId)}</p></div><button type="button" class="section-toggle">Toggle</button></header>
      <div class="entity-section-items"></div>
    `;
    const items = section.querySelector(".entity-section-items");
    if (entities.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Няма добавени видове в тази категория.";
      items.appendChild(empty);
    } else {
      entities.forEach((entity) => items.appendChild(makeEntityToggle(entity)));
    }
    section.querySelector(".section-toggle").addEventListener("click", () => {
      if (entities.length === 0) return;
      const ids = entities.map((entity) => entity.id);
      const allActive = ids.every((id) => state.selectedEntityIds.includes(id));
      const next = new Set(state.selectedEntityIds);
      ids.forEach((id) => allActive ? next.delete(id) : next.add(id));
      if (next.size === 0) ids.forEach((id) => next.add(id));
      state.selectedEntityIds = [...next];
      renderEntityControls();
      refreshComparisonViews();
    });
    container.appendChild(section);
  });
};

function makeEntityToggle(entity) {
  const isActive = state.selectedEntityIds.includes(entity.id);
  const label = document.createElement("label");
  label.className = `entity-toggle ${isActive ? "active" : ""}`;
  label.innerHTML = `
    <input type="checkbox" value="${entity.id}" ${isActive ? "checked" : ""} />
    <span>${entity.name}</span>
    <small>${sectionLabel(entity.section || classifyEntity(entity))}</small>
  `;
  label.querySelector("input").addEventListener("change", (event) => {
    const next = new Set(state.selectedEntityIds);
    if (event.target.checked) next.add(entity.id);
    else next.delete(entity.id);
    if (next.size === 0) {
      event.target.checked = true;
      return;
    }
    state.selectedEntityIds = [...next];
    renderEntityControls();
    refreshComparisonViews();
  });
  return label;
}

loadCatalogLayer();
