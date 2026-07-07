const PEPPER_CATALOG_URL = "data/catalog/peppers-bulgaria-region.json?v=20260707-1";

const CROP_GROUPS = [
  {
    id: "tomato",
    label: "Домат",
    parent: "Зеленчуци",
    description: "Solanum lycopersicum и близки доматени линии. Да, технически плод, но в градината живее при зеленчуците, както човечеството живее с компромиси."
  },
  {
    id: "pepper",
    label: "Чушки",
    parent: "Зеленчуци",
    description: "Capsicum видове и сортови типове: сладки, люти, регионални и саксийни."
  }
];

const PEPPER_SECTIONS = [
  { id: "pepper-sweet", label: "Чушки / Сладки", description: "Сладки Capsicum annuum типове за прясна консумация, печене, пълнене, лютеница и консервиране." },
  { id: "pepper-hot", label: "Чушки / Люти", description: "Люти и полу-люти чушки, подходящи за нашия климат, саксии, сушене, туршии и подправки." },
  { id: "pepper-bulgarian", label: "Чушки / Български и регионални", description: "Български и балкански типове: капия, сиврия, шипка, рибки, чорбаджийска и близки дворни линии." },
  { id: "pepper-stable", label: "Чушки / Култивирани (стабилни)", description: "Стабилни сортови типове, подходящи за собствени семена при контролирано опрашване." },
  { id: "pepper-f1", label: "Чушки / Култивирани (хибрид F1)", description: "F1 хибриди. В текущия начален каталог няма добавени такива." }
];

const PEPPER_METRICS = [
  { id: "capsaicin_heat", label: "Лютивина / капсаицин", shortLabel: "Лютивина", group: "Чушки", timeline: false, note: "0-10 индекс за лютивина. Не е директно SHU, защото не сме лаборатория, колкото и да се правим." },
  { id: "roasting_value", label: "Стойност за печене", shortLabel: "Печене", group: "Чушки", timeline: false },
  { id: "stuffing_value", label: "Стойност за пълнене", shortLabel: "Пълнене", group: "Чушки", timeline: false },
  { id: "drying_value", label: "Стойност за сушене", shortLabel: "Сушене", group: "Чушки", timeline: false },
  { id: "pickle_value", label: "Стойност за туршия", shortLabel: "Туршия", group: "Чушки", timeline: false },
  { id: "pepper_regional_value", label: "Регионална стойност", shortLabel: "Регион", group: "Чушки", timeline: false }
];

function waitForCropLayerDataset() {
  return new Promise((resolve) => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (typeof state !== "undefined" && state?.dataset?.entities?.length && state?.dataset?.metrics?.length) {
        clearInterval(timer);
        resolve(true);
      }
      if (tries > 120) {
        clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

function ensurePepperSections() {
  if (typeof BOTANICAL_SECTIONS === "undefined" || !Array.isArray(BOTANICAL_SECTIONS)) return;
  PEPPER_SECTIONS.forEach((section) => {
    if (!BOTANICAL_SECTIONS.some((existing) => existing.id === section.id)) BOTANICAL_SECTIONS.push(section);
  });
  if (typeof SECTION_ORDER !== "undefined" && Array.isArray(SECTION_ORDER)) {
    PEPPER_SECTIONS.forEach((section) => {
      if (!SECTION_ORDER.includes(section.id)) SECTION_ORDER.push(section.id);
    });
  }
}

function ensurePepperMetrics() {
  const existing = new Set(state.dataset.metrics.map((metric) => metric.id));
  PEPPER_METRICS.forEach((metric) => {
    if (!existing.has(metric.id)) state.dataset.metrics.push(metric);
  });
}

function pepperText(entity) {
  return `${entity.id || ""} ${entity.name || ""} ${entity.latin || ""} ${entity.role || ""} ${entity.summary || ""}`.toLowerCase();
}

function inferCrop(entity) {
  const text = pepperText(entity);
  if (entity.crop) return entity.crop;
  if (text.includes("capsicum") || text.includes("чушка") || text.includes("пипер") || text.includes("pepper") || text.includes("jalape") || text.includes("cayenne")) return "pepper";
  return "tomato";
}

function addCategory(entity, sectionId) {
  const sections = new Set(entity.sections || []);
  if (entity.section) sections.add(entity.section);
  sections.add(sectionId);
  entity.sections = [...sections];
  return entity;
}

function applyCropDefaults(entity) {
  entity.crop = inferCrop(entity);
  if (!entity.sections) entity.sections = entity.section ? [entity.section] : [];
  if (entity.crop === "pepper") {
    const text = pepperText(entity);
    if (!entity.section || entity.section === "cultivated-stable") entity.section = text.includes("f1") ? "pepper-f1" : "pepper-stable";
    addCategory(entity, entity.section);
    if (text.includes("лют") || text.includes("hot") || text.includes("cayenne") || text.includes("jalape") || text.includes("piri") || text.includes("shipka") || text.includes("ribki") || text.includes("чорбадж")) addCategory(entity, "pepper-hot");
    else addCategory(entity, "pepper-sweet");
    if (["kurtovska", "sivriya", "shipka", "ribki", "chorbad", "byal", "kapia", "камба", "долма", "чорбад", "шипка", "рибки", "сиврия", "капия", "бял"].some((word) => text.includes(word))) addCategory(entity, "pepper-bulgarian");
  } else {
    entity.crop = "tomato";
  }
  return entity;
}

function pepperMetricScore(entity, metricId) {
  const text = pepperText(entity);
  const hot = getEntitySections(entity).includes("pepper-hot") || text.includes("hot") || text.includes("лют") || text.includes("cayenne") || text.includes("jalape") || text.includes("piri");
  const kapia = text.includes("капи") || text.includes("kapia") || text.includes("kurtovska");
  const stuffing = text.includes("камба") || text.includes("dolma") || text.includes("stuff") || text.includes("california") || text.includes("bell");
  if (metricId === "capsaicin_heat") return hot ? (text.includes("piri") || text.includes("cayenne") || text.includes("рибки") ? 9 : 6) : 0;
  if (metricId === "roasting_value") return kapia ? 10 : hot ? 4 : 7;
  if (metricId === "stuffing_value") return stuffing ? 10 : kapia ? 6 : hot ? 3 : 6;
  if (metricId === "drying_value") return hot ? 9 : kapia ? 6 : 5;
  if (metricId === "pickle_value") return hot ? 9 : stuffing ? 7 : 8;
  if (metricId === "pepper_regional_value") return getEntitySections(entity).includes("pepper-bulgarian") ? 10 : 6;
  return null;
}

function ensurePepperScores(entity) {
  if (entity.crop !== "pepper") return entity;
  entity.scores = entity.scores || {};
  state.dataset.metrics.forEach((metric) => {
    if (entity.scores[metric.id] === undefined || entity.scores[metric.id] === null) {
      const pepperSpecial = pepperMetricScore(entity, metric.id);
      if (pepperSpecial !== null) entity.scores[metric.id] = pepperSpecial;
      else if (metric.id === "lycopene") entity.scores[metric.id] = 3;
      else if (metric.id === "vitamin_c") entity.scores[metric.id] = 10;
      else if (metric.id === "rootstock_value") entity.scores[metric.id] = 2;
      else if (metric.id === "breeding_value") entity.scores[metric.id] = 6;
      else entity.scores[metric.id] = entity.scores[metric.id] ?? 6;
    }
  });
  return entity;
}

function normalizePepperItem(item) {
  const facts = item.retailFacts || [];
  const section = item.section || "pepper-stable";
  const entity = {
    id: item.id,
    name: item.name,
    crop: "pepper",
    section,
    sections: [section],
    latin: item.latin,
    role: item.status || "pepper cultivar/type",
    summary: facts.join("; "),
    fruitWeight: item.raw?.fruit_weight || "n/a",
    yieldPerPlant: item.raw?.yield_per_plant || "n/a",
    yieldPerSquareMeter: item.raw?.yield_per_square_meter || "n/a",
    sugarPer100g: item.raw?.sugar_content || "n/a",
    profile: {
      category: sectionLabel(section),
      growthHabit: "Capsicum pepper type for regional garden use",
      overview: `${item.name}: ${facts.join("; ")}.`,
      strengths: ["подходяща за България и сходен климат", "добър кандидат за сравнение със сладки/люти типове"],
      weaknesses: ["работен каталог, нуждае се от сортова и източникова валидация"],
      bestUse: buildPepperUses(item),
      tags: ["pepper", section, item.status || "catalog"]
    },
    scores: item.scores || {},
    raw: item.raw || {},
    evidence: { retail: 2, scientific: 1, note: "Pepper working catalog pending primary cultivar sources." }
  };
  applyCropDefaults(entity);
  ensurePepperScores(entity);
  return entity;
}

function buildPepperUses(item) {
  const text = `${item.name || ""} ${(item.retailFacts || []).join(" ")}`.toLowerCase();
  const uses = [];
  if (text.includes("печ") || text.includes("kapia") || text.includes("капи")) uses.push("печене");
  if (text.includes("лют") || text.includes("hot") || text.includes("cayenne") || text.includes("jalape")) uses.push("люто / подправка");
  if (text.includes("турш") || text.includes("pickle")) uses.push("туршия");
  if (text.includes("пълн") || text.includes("stuff") || text.includes("dolma")) uses.push("пълнене");
  if (text.includes("суш") || text.includes("dry")) uses.push("сушене");
  return uses.length ? uses : ["градина", "прясна консумация", "готвене"];
}

function renderCropControls() {
  const selector = document.querySelector("#selector");
  if (!selector) return;
  let container = document.querySelector("#cropControls");
  if (!container) {
    container = document.createElement("div");
    container.id = "cropControls";
    container.className = "crop-controls";
    selector.insertBefore(container, document.querySelector("#entityControls"));
  }
  container.innerHTML = `<strong>Зеленчуци</strong>`;
  CROP_GROUPS.forEach((crop) => {
    const active = state.selectedCrop === crop.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `crop-button ${active ? "active" : ""}`;
    button.textContent = crop.label;
    button.title = crop.description;
    button.addEventListener("click", () => {
      state.selectedCrop = crop.id;
      const visible = state.dataset.entities.filter((entity) => (entity.crop || inferCrop(entity)) === crop.id);
      state.selectedEntityIds = visible.map((entity) => entity.id);
      renderCropControls();
      renderEntityControls();
      refreshComparisonViews();
    });
    container.appendChild(button);
  });
}

function wrapEntityControlsForCrop() {
  const baseRender = renderEntityControls;
  renderEntityControls = function renderCropAwareEntityControls() {
    const selectedCrop = state.selectedCrop || "tomato";
    const previousEntities = state.dataset.entities;
    state.dataset.entities = previousEntities.filter((entity) => (entity.crop || inferCrop(entity)) === selectedCrop);
    baseRender();
    state.dataset.entities = previousEntities;
    renderCropControls();
  };
}

async function loadCropLayer() {
  const ready = await waitForCropLayerDataset();
  if (!ready) return;

  state.selectedCrop = state.selectedCrop || "tomato";
  ensurePepperSections();
  ensurePepperMetrics();
  state.dataset.entities.forEach((entity) => {
    applyCropDefaults(entity);
    ensurePepperScores(entity);
  });

  try {
    const response = await fetch(PEPPER_CATALOG_URL, { cache: "no-store" });
    const catalog = await response.json();
    const existingIds = new Set(state.dataset.entities.map((entity) => entity.id));
    const peppers = (catalog.items || [])
      .filter((item) => !existingIds.has(item.id))
      .map(normalizePepperItem);
    state.dataset.entities.push(...peppers);
  } catch (error) {
    console.warn("Pepper catalog failed", error);
  }

  if (!state.cropLayerWrapped) {
    wrapEntityControlsForCrop();
    state.cropLayerWrapped = true;
  }

  const visible = state.dataset.entities.filter((entity) => (entity.crop || inferCrop(entity)) === state.selectedCrop);
  state.selectedEntityIds = visible.map((entity) => entity.id);
  renderCropControls();
  renderEntityControls();
  renderRadarPresets();
  renderAxisControls();
  refreshComparisonViews();
  document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
}

loadCropLayer();
