try {
  RADAR_PRESETS.consumer = {
    label: "Консуматор",
    axes: [
      "availability",
      "edible_value",
      "flavor",
      "sugar_content",
      "vitamin_c",
      "lycopene",
      "beta_carotene",
      "antioxidants",
      "minerals",
      "phytonutrient_profile",
      "body_benefit_per_100g",
      "harvest_ease",
      "market_value",
      "container_resilience"
    ]
  };
} catch (error) {
  console.warn("Consumer preset not installed", error);
}
