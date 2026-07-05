function waitForRomaLayerDataset() {
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

function scoreRomaVF(metric) {
  const values = {
    disease_resistance: 7,
    fungal_resistance: 7,
    virus_resistance: 6,
    cracking_resistance: 8,
    drought_tolerance: 6,
    heat_tolerance: 7,
    cold_tolerance: 5,
    low_soil_fertility_tolerance: 6,
    sun_need_efficiency: 7,
    salinity_tolerance: 5,
    container_resilience: 6,
    compact_space_efficiency: 7,
    maintenance_ease: 8,
    root_power: 6,
    root_size: 6,
    root_regeneration: 6,
    plant_vigor: 7,
    plant_size: 5,
    pruning_recovery: 6,
    perennial_value: 5,
    yield_per_plant: 8,
    yield_per_square_meter: 8,
    yield_per_root_mass: 8,
    fruiting_duration: 6,
    fruit_count: 8,
    fruit_size: 5,
    harvest_ease: 9,
    edible_value: 8,
    sugar_content: 6,
    vitamin_c: 8,
    lycopene: 9,
    beta_carotene: 7,
    minerals: 7,
    antioxidants: 8,
    flavor: 7,
    market_value: 8,
    greenhouse_value: 7,
    rootstock_value: 4,
    breeding_value: 6,
    availability: 8,
    phytonutrient_profile: 7,
    body_benefit_per_100g: 8
  };
  return values[metric.id] ?? 6;
}

async function loadRomaVFLayer() {
  const ready = await waitForRomaLayerDataset();
  if (!ready) return;
  if (state.dataset.entities.some((entity) => entity.id === "roma_vf")) return;

  const romaVF = {
    id: "roma_vf",
    name: "Roma VF",
    section: "cultivated-stable",
    sections: ["cultivated-stable"],
    latin: "Solanum lycopersicum, Roma paste tomato with VF resistance background",
    role: "stable paste / processing tomato",
    summary: "Класически стабилен пастообразен/консервен домат. Детерминантен тип, месест плод, добър за сос, пюре, консервиране и сушене.",
    fruitWeight: "60-100 g",
    yieldPerPlant: "medium-high",
    yieldPerSquareMeter: "high under dense field planting",
    sugarPer100g: "medium",
    profile: {
      category: "Култивирани (стабилни)",
      growthHabit: "determinate / compact field paste tomato",
      overview: "Roma VF: стабилен пастообразен домат за сосове, пюре, консервиране и по-лесно бране.",
      strengths: ["месест плод с малко сок", "добър за консервиране", "компактен детерминантен растеж", "VF фон за устойчивост към verticillium/fusarium"],
      weaknesses: ["не е гурме салатен домат", "по-ниска вкусово-салатна стойност спрямо едри розови типове"],
      bestUse: ["сос", "пюре", "лютеница", "консервиране", "сушене", "гъсто засаждане"],
      tags: ["cultivated-stable", "processing", "paste", "roma"]
    },
    scores: {},
    raw: {
      fruit_color: "red",
      fruit_shape: "plum / paste",
      fruit_weight: "60-100 g",
      growth: "determinate",
      source_quality: "common cultivar knowledge, evidence 2/5"
    },
    evidence: { retail: 2, scientific: 1, note: "Working catalog entry. Needs cultivar-source validation." }
  };

  state.dataset.metrics.forEach((metric) => {
    romaVF.scores[metric.id] = scoreRomaVF(metric);
  });

  state.dataset.entities.push(romaVF);
  state.selectedEntityIds = state.dataset.entities.map((entity) => entity.id);

  renderEntityControls();
  refreshComparisonViews();
  document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
}

loadRomaVFLayer();
