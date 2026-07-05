const CATALOG_URL = "data/catalog/semenaonline-tomatoes.json?v=20260705-1";

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
      note: "Retail source supplies morphology/availability. Scientific trait values need GRIN/NARO/university accession-level validation. Humanity invented source hierarchy so we may as well use it."
    }
  };
}

function buildStrengths(item) {
  const facts = item.retailFacts || [];
  const strengths = [];
  if (item.latin?.includes("pimpinellifolium")) strengths.push("истински див/касисов доматен тип с висока селекционна стойност");
  if (item.section?.includes("compact")) strengths.push("много подходящ за саксия и малък обем");
  if (facts.some((fact) => fact.toLowerCase().includes("early") || fact.includes("ран"))) strengths.push("ранен тип");
  if (facts.some((fact) => fact.includes("productive") || fact.includes("плодонос") || fact.includes("150"))) strengths.push("добра продуктивност за размера си");
  if (strengths.length === 0) strengths.push("описан от търговеца като подходящ за домашно отглеждане");
  return strengths;
}

function buildWeaknesses(item) {
  const weaknesses = [];
  if (item.status?.includes("F1")) weaknesses.push("F1: не е стабилен избор за събиране на собствени семена");
  if (!item.latin?.includes("pimpinellifolium")) weaknesses.push("не е истински див вид, въпреки че може да е в retail категория 'диви домати'");
  if (item.section?.includes("wild")) weaknesses.push("малките плодове са по-бавни за бране");
  if (weaknesses.length === 0) weaknesses.push("научните показатели трябва да се потвърдят с първични източници");
  return weaknesses;
}

function buildBestUse(item) {
  if (item.section?.includes("compact")) return ["балкон", "малка саксия", "перваз", "лесна поддръжка"];
  if (item.latin?.includes("pimpinellifolium")) return ["подложка", "селекция", "многогодишен експеримент", "генетичен резерв"];
  return ["домашно отглеждане", "чери/коктейлна реколта", "сравнение с диви линии"];
}

function catalogSectionLabel(sectionId) {
  return state.catalog?.sections?.find((section) => section.id === sectionId)?.label || sectionId || "Други";
}

function catalogSectionDescription(sectionId) {
  return state.catalog?.sections?.find((section) => section.id === sectionId)?.description || "";
}

function sectionRank(sectionId) {
  const order = ["wild-currant-semenaonline", "compact-balcony-semenaonline", "cultivated-reference"];
  const index = order.indexOf(sectionId);
  return index === -1 ? 99 : index;
}

async function loadCatalogLayer() {
  try {
    const response = await fetch(CATALOG_URL, { cache: "no-store" });
    const catalog = await response.json();
    state.catalog = catalog;

    const existingIds = new Set(state.dataset.entities.map((entity) => entity.id));
    const newEntities = catalog.items
      .filter((item) => !existingIds.has(item.id))
      .map(normalizeCatalogItem);

    state.dataset.entities.forEach((entity) => {
      if (!entity.section) entity.section = inferSection(entity);
    });

    state.dataset.entities.push(...newEntities);
    state.selectedEntityIds = state.dataset.entities.map((entity) => entity.id);

    renderEntityControls();
    refreshComparisonViews();
    document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
  } catch (error) {
    console.warn("Catalog layer failed to load", error);
  }
}

function inferSection(entity) {
  if (entity.id.includes("balconi") || entity.id.includes("venus") || entity.id.includes("vilma")) return "compact-balcony-semenaonline";
  if (entity.id.includes("sweet_pea") || entity.latin?.includes("pimpinellifolium")) return "wild-currant-semenaonline";
  return "cultivated-reference";
}

renderEntityControls = function renderGroupedEntityControls() {
  const container = document.querySelector("#entityControls");
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

window.addEventListener("load", loadCatalogLayer);
