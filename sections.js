const CATALOG_URLS = [
  "data/catalog/semenaonline-tomatoes.json?v=20260705-3",
  "data/catalog/bulgaria-cultivated-tomatoes.json?v=20260705-2"
];

const BOTANICAL_SECTIONS = [
  { id: "wild", label: "Диви", description: "Реални диви видове или линии с ясно посочен див вид." },
  { id: "semi-wild", label: "Полу-Диви", description: "Дребноплодни, касисови или примитивни линии без сигурен чист див статус." },
  { id: "cultivated-stable", label: "Култивирани (стабилни)", description: "Утвърдени сортове и стабилни културни линии." },
  { id: "cultivated-f1", label: "Култивирани (хибрид F1)", description: "F1 хибриди." },
  { id: "cultivated-gmo", label: "Култивирани (ГМО)", description: "Няма добавени линии." },
  { id: "cultivated-crispr", label: "Култивирани (КРИСПР)", description: "Няма добавени линии." }
];

const SECTION_ORDER = BOTANICAL_SECTIONS.map((section) => section.id);
const SKIP_ITEM_IDS = new Set(["bio_rote_murmel_pimpinellifolium", "sweet_pea_pimpinellifolium_semenaonline", "vilma_semenaonline"]);

function sectionLabel(sectionId) {
  return BOTANICAL_SECTIONS.find((section) => section.id === sectionId)?.label || sectionId;
}

function sectionDescription(sectionId) {
  return BOTANICAL_SECTIONS.find((section) => section.id === sectionId)?.description || "";
}

function sectionRank(sectionId) {
  const index = SECTION_ORDER.indexOf(sectionId);
  return index === -1 ? 99 : index;
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

function classifyItem(item) {
  return classifyText(`${item.id || ""} ${item.name || ""} ${item.latin || ""} ${item.status || ""} ${item.section || ""}`);
}

function classifyEntity(entity) {
  return classifyText(`${entity.id || ""} ${entity.name || ""} ${entity.latin || ""} ${entity.role || ""} ${entity.profile?.category || ""}`);
}

function defaultScore(entity, metric) {
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
    if (scores[metric.id] === undefined || scores[metric.id] === null || Number.isNaN(scores[metric.id])) {
      scores[metric.id] = defaultScore(entity, metric);
    }
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

function keepCatalogItem(item) {
  if (SKIP_ITEM_IDS.has(item.id)) return false;
  if (item.aliasOf) return false;
  return true;
}

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

  [...groups.entries()]
    .sort(([left], [right]) => sectionRank(left) - sectionRank(right) || left.localeCompare(right))
    .forEach(([sectionId, entities]) => {
      const section = document.createElement("section");
      section.className = "entity-section";
      section.innerHTML = `
        <header class="entity-section-header">
          <div>
            <h3>${sectionLabel(sectionId)}</h3>
            <p>${sectionDescription(sectionId)}</p>
          </div>
          <button type="button" class="section-toggle">Toggle</button>
        </header>
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
