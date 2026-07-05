const CATALOG_URLS = [
  "data/catalog/semenaonline-tomatoes.json?v=20260705-2",
  "data/catalog/bulgaria-cultivated-tomatoes.json?v=20260705-1"
];

function normalizeCatalogItem(item) {
  return {
    id: item.id,
    name: item.name,
    section: item.section,
    latin: item.latin,
    role: item.status || "catalog tomato item",
    summary: (item.retailFacts || []).join("; "),
    fruitWeight: item.raw?.fruit_weight || item.raw?.fruit_size || "n/a",
    yieldPerPlant: item.raw?.yield_per_plant || "n/a",
    yieldPerSquareMeter: item.raw?.yield_per_square_meter || "n/a",
    sugarPer100g: item.raw?.sugar_content || "n/a",
    sourceUrl: item.sourceUrl,
    aliasOf: item.aliasOf || null,
    profile: {
      category: item.status || "catalog",
      growthHabit: item.raw?.plant_height ? `reported height: ${item.raw.plant_height}` : "see source",
      overview: `${item.name}: ${(item.retailFacts || []).join("; ")}.`,
      strengths: buildStrengths(item),
      weaknesses: buildWeaknesses(item),
      bestUse: buildBestUse(item),
      tags: [item.section, item.status || "catalog"]
    },
    scores: item.scores || {},
    raw: item.raw || {},
    evidence: {
      retail: 2,
      scientific: item.latin?.includes("pimpinellifolium") ? 3 : 1,
      note: "Trait values are working estimates unless upgraded with GRIN, NARO, university or accession-level sources."
    }
  };
}

function buildStrengths(item) {
  const facts = item.retailFacts || [];
  const strengths = [];
  if (item.latin?.includes("pimpinellifolium")) strengths.push("истински див/касисов доматен тип с висока селекционна стойност");
  if (item.section?.includes("compact")) strengths.push("много подходящ за саксия и малък обем");
  if (item.section?.includes("salad-pink")) strengths.push("силен салатен вкус и едър плод");
  if (item.section?.includes("commercial")) strengths.push("по-стабилен комерсиален добив и пазарност");
  if (facts.some((fact) => fact.toLowerCase().includes("early") || fact.includes("ран"))) strengths.push("ранен тип");
  if (facts.some((fact) => fact.includes("productive") || fact.includes("плодонос") || fact.includes("150"))) strengths.push("добра продуктивност за размера си");
  if (strengths.length === 0) strengths.push("практически познат културен доматен тип");
  return strengths;
}

function buildWeaknesses(item) {
  const weaknesses = [];
  if (item.status?.includes("F1")) weaknesses.push("F1: не е стабилен избор за събиране на собствени семена");
  if (!item.latin?.includes("pimpinellifolium") && item.section?.includes("wild")) weaknesses.push("не е истински див вид, дори когато е в retail категория 'диви домати'");
  if (item.section?.includes("wild")) weaknesses.push("малките плодове са по-бавни за бране");
  if (item.section?.includes("salad-pink")) weaknesses.push("едрите розови типове често са по-чувствителни към напукване, болести и нестабилно поливане");
  if (weaknesses.length === 0) weaknesses.push("научните показатели трябва да се потвърдят с първични източници");
  return weaknesses;
}

function buildBestUse(item) {
  if (item.section?.includes("compact")) return ["балкон", "малка саксия", "перваз", "лесна поддръжка"];
  if (item.section?.includes("salad-pink")) return ["салата", "прясна консумация", "калем върху силна подложка", "вкусово сравнение"];
  if (item.section?.includes("commercial")) return ["оранжерия", "пазар", "стабилен добив", "контролирана агротехника"];
  if (item.section?.includes("red-table")) return ["градина", "прясна консумация", "консервиране", "общо производство"];
  if (item.latin?.includes("pimpinellifolium")) return ["подложка", "селекция", "многогодишен експеримент", "генетичен резерв"];
  return ["домашно отглеждане", "чери/коктейлна реколта", "сравнение с диви линии"];
}

function catalogSectionLabel(sectionId) {
  return state.catalogSections?.find((section) => section.id === sectionId)?.label || sectionId || "Други";
}

function catalogSectionDescription(sectionId) {
  return state.catalogSections?.find((section) => section.id === sectionId)?.description || "";
}

function sectionRank(sectionId) {
  const order = [
    "wild-currant-semenaonline",
    "compact-balcony-semenaonline",
    "bulgaria-salad-pink",
    "bulgaria-commercial-f1",
    "bulgaria-red-table-processing",
    "cultivated-reference"
  ];
  const index = order.indexOf(sectionId);
  return index === -1 ? 99 : index;
}

async function waitForBaseDataset() {
  for (let i = 0; i < 80; i += 1) {
    if (state?.dataset?.entities?.length) return true;
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
  state.catalogSections = catalogs.flatMap((catalog) => catalog.sections || []);

  state.dataset.entities.forEach((entity) => {
    if (!entity.section) entity.section = inferSection(entity);
  });

  const existingIds = new Set(state.dataset.entities.map((entity) => entity.id));
  const newEntities = catalogs
    .flatMap((catalog) => catalog.items || [])
    .filter((item) => !existingIds.has(item.id))
    .map(normalizeCatalogItem);

  state.dataset.entities.push(...newEntities);
  state.selectedEntityIds = state.dataset.entities.map((entity) => entity.id);

  renderEntityControls();
  refreshComparisonViews();
  document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
}

function inferSection(entity) {
  if (entity.id.includes("balconi") || entity.id.includes("venus") || entity.id.includes("vilma") || entity.id.includes("mini")) return "compact-balcony-semenaonline";
  if (entity.id.includes("sweet_pea") || entity.latin?.includes("pimpinellifolium")) return "wild-currant-semenaonline";
  if (entity.id.includes("rozova") || entity.id.includes("sartse") || entity.id.includes("gigant")) return "bulgaria-salad-pink";
  return "cultivated-reference";
}

renderEntityControls = function renderGroupedEntityControls() {
  const container = document.querySelector("#entityControls");
  if (!container || !state?.dataset?.entities) return;
  container.innerHTML = "";

  const groups = new Map();
  state.dataset.entities.forEach((entity) => {
    const section = entity.section || inferSection(entity);
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
            <h3>${catalogSectionLabel(sectionId)}</h3>
            <p>${catalogSectionDescription(sectionId)}</p>
          </div>
          <button type="button" class="section-toggle">Toggle</button>
        </header>
        <div class="entity-section-items"></div>
      `;

      const items = section.querySelector(".entity-section-items");
      entities.forEach((entity) => items.appendChild(makeEntityToggle(entity)));

      section.querySelector(".section-toggle").addEventListener("click", () => {
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
    <small>${entity.profile?.category || entity.status || "plant"}</small>
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
