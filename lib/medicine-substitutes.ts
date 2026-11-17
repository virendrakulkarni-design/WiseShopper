// lib/medicine-substitutes.ts
// Knowledge base & lookup utility for Indian branded medicines and their low-cost generic / Jan Aushadhi equivalents

export interface GenericSubstitute {
  brandName: string;
  genericSalt: string;
  dosage: string;
  brandedPrice: number;
  genericPrice: number;
  savingsPct: number;
  janAushadhiName: string;
  usage: string;
  manufacturer: string;
  prescriptionRequired: boolean;
}

export const POPULAR_MEDICINE_SUBSTITUTES: GenericSubstitute[] = [
  {
    brandName: "Syndopa CR",
    genericSalt: "Levodopa (200mg) + Carbidopa (50mg) CR",
    dosage: "Controlled Release (10 Tablets)",
    brandedPrice: 285,
    genericPrice: 95,
    savingsPct: 67,
    janAushadhiName: "Levodopa + Carbidopa CR Tablets IP 200/50mg",
    usage: "Parkinson's Disease symptoms, muscle tremors, stiffness",
    manufacturer: "Sun Pharma",
    prescriptionRequired: true,
  },
  {
    brandName: "Syndopa Plus",
    genericSalt: "Levodopa (100mg) + Carbidopa (25mg)",
    dosage: "10 Tablets",
    brandedPrice: 115,
    genericPrice: 42,
    savingsPct: 63,
    janAushadhiName: "Levodopa + Carbidopa Tablets IP 100/25mg",
    usage: "Parkinson's Disease and motor fluctuations",
    manufacturer: "Sun Pharma",
    prescriptionRequired: true,
  },
  {
    brandName: "Dolo 650",
    genericSalt: "Paracetamol (Acetaminophen)",
    dosage: "650 mg (15 Tablets)",
    brandedPrice: 34,
    genericPrice: 10,
    savingsPct: 71,
    janAushadhiName: "Paracetamol Tablets IP 650mg",
    usage: "Fever, Body ache, Mild to moderate pain",
    manufacturer: "Micro Labs Ltd",
    prescriptionRequired: false,
  },
  {
    brandName: "Calpol 650",
    genericSalt: "Paracetamol",
    dosage: "650 mg (15 Tablets)",
    brandedPrice: 32,
    genericPrice: 10,
    savingsPct: 69,
    janAushadhiName: "Paracetamol Tablets IP 650mg",
    usage: "Fever and pain relief",
    manufacturer: "GSK India",
    prescriptionRequired: false,
  },
  {
    brandName: "Augmentin 625 Duo",
    genericSalt: "Amoxicillin (500mg) + Clavulanic Acid (125mg)",
    dosage: "625 mg (10 Tablets)",
    brandedPrice: 204,
    genericPrice: 55,
    savingsPct: 73,
    janAushadhiName: "Amoxicillin & Potassium Clavulanate Tablets IP 625mg",
    usage: "Bacterial infections (respiratory, ear, skin, dental)",
    manufacturer: "GSK Pharmaceuticals",
    prescriptionRequired: true,
  },
  {
    brandName: "Pan 40",
    genericSalt: "Pantoprazole Gastro-resistant",
    dosage: "40 mg (15 Tablets)",
    brandedPrice: 155,
    genericPrice: 28,
    savingsPct: 82,
    janAushadhiName: "Pantoprazole Gastro-Resistant Tablets IP 40mg",
    usage: "Acidity, Heartburn, GERD & Gastric Ulcers",
    manufacturer: "Alkem Laboratories",
    prescriptionRequired: true,
  },
  {
    brandName: "Pantocid 40",
    genericSalt: "Pantoprazole",
    dosage: "40 mg (15 Tablets)",
    brandedPrice: 160,
    genericPrice: 28,
    savingsPct: 83,
    janAushadhiName: "Pantoprazole Gastro-Resistant Tablets IP 40mg",
    usage: "Acid reflux and stomach ulcers",
    manufacturer: "Sun Pharma",
    prescriptionRequired: true,
  },
  {
    brandName: "Combiflam",
    genericSalt: "Ibuprofen (400mg) + Paracetamol (325mg)",
    dosage: "Strip of 20 Tablets",
    brandedPrice: 48,
    genericPrice: 15,
    savingsPct: 69,
    janAushadhiName: "Ibuprofen & Paracetamol Tablets IP",
    usage: "Severe headache, toothache, muscle & joint pain",
    manufacturer: "Sanofi India",
    prescriptionRequired: false,
  },
  {
    brandName: "Allegra 120",
    genericSalt: "Fexofenadine Hydrochloride",
    dosage: "120 mg (10 Tablets)",
    brandedPrice: 218,
    genericPrice: 42,
    savingsPct: 81,
    janAushadhiName: "Fexofenadine Hydrochloride Tablets IP 120mg",
    usage: "Allergies, Running nose, Sneezing, Hives",
    manufacturer: "Sanofi India",
    prescriptionRequired: true,
  },
  {
    brandName: "Shelcal 500",
    genericSalt: "Calcium Carbonate (1250mg eq. to 500mg elemental Ca) + Vitamin D3 (250 IU)",
    dosage: "15 Tablets",
    brandedPrice: 131,
    genericPrice: 35,
    savingsPct: 73,
    janAushadhiName: "Calcium and Vitamin D3 Tablets IP",
    usage: "Calcium deficiency, Bone & Joint strength, Osteoporosis",
    manufacturer: "Torrent Pharma",
    prescriptionRequired: false,
  },
  {
    brandName: "Becosules Z",
    genericSalt: "Vitamin B-Complex with Vitamin C & Zinc",
    dosage: "Strip of 20 Capsules",
    brandedPrice: 54,
    genericPrice: 18,
    savingsPct: 67,
    janAushadhiName: "Vitamin B-Complex with Zinc Capsules",
    usage: "Mouth ulcers, Immunity, Vitamin B deficiency",
    manufacturer: "Pfizer Ltd",
    prescriptionRequired: false,
  },
  {
    brandName: "Telma 40",
    genericSalt: "Telmisartan",
    dosage: "40 mg (30 Tablets)",
    brandedPrice: 245,
    genericPrice: 45,
    savingsPct: 82,
    janAushadhiName: "Telmisartan Tablets IP 40mg",
    usage: "High Blood Pressure (Hypertension) & Heart attack prevention",
    manufacturer: "Glenmark Pharmaceuticals",
    prescriptionRequired: true,
  },
  {
    brandName: "Glycomet 500 SR",
    genericSalt: "Metformin Hydrochloride Sustained Release",
    dosage: "500 mg (20 Tablets)",
    brandedPrice: 48,
    genericPrice: 12,
    savingsPct: 75,
    janAushadhiName: "Metformin Hydrochloride Prolonged Release Tablets IP 500mg",
    usage: "Type 2 Diabetes Mellitus blood sugar control",
    manufacturer: "USV Ltd",
    prescriptionRequired: true,
  },
  {
    brandName: "Atorva 10",
    genericSalt: "Atorvastatin",
    dosage: "10 mg (15 Tablets)",
    brandedPrice: 110,
    genericPrice: 22,
    savingsPct: 80,
    janAushadhiName: "Atorvastatin Tablets IP 10mg",
    usage: "Cholesterol lowering & Cardiovascular protection",
    manufacturer: "Zydus Cadila",
    prescriptionRequired: true,
  },
  {
    brandName: "Volini Gel",
    genericSalt: "Diclofenac Diethylamine + Virgin Linseed Oil + Methyl Salicylate + Menthol",
    dosage: "50 g Tube",
    brandedPrice: 165,
    genericPrice: 45,
    savingsPct: 73,
    janAushadhiName: "Diclofenac, Linseed Oil, Methyl Salicylate & Menthol Gel",
    usage: "Fast relief from backache, sprain, joint pain",
    manufacturer: "Sun Pharma",
    prescriptionRequired: false,
  },
];

export function findGenericSubstitute(query: string): GenericSubstitute | null {
  if (!query) return null;
  const lq = query.toLowerCase().trim();

  // Exact or keyword match
  for (const med of POPULAR_MEDICINE_SUBSTITUTES) {
    const brandLower = med.brandName.toLowerCase();
    const saltLower = med.genericSalt.toLowerCase();

    if (
      lq.includes(brandLower) ||
      brandLower.includes(lq) ||
      brandLower.split(" ")[0] === lq.split(" ")[0] ||
      saltLower.includes(lq)
    ) {
      return med;
    }
  }

  // Broad keyword checks for common medications
  if (lq.includes("paracetamol") || lq.includes("crocin") || lq.includes("fever")) {
    return POPULAR_MEDICINE_SUBSTITUTES[0]; // Dolo / Paracetamol
  }
  if (lq.includes("pantop") || lq.includes("acidity") || lq.includes("gas tablet")) {
    return POPULAR_MEDICINE_SUBSTITUTES[3]; // Pan 40
  }
  if (lq.includes("calcium") || lq.includes("bone")) {
    return POPULAR_MEDICINE_SUBSTITUTES[7]; // Shelcal
  }
  if (lq.includes("b complex") || lq.includes("mouth ulcer")) {
    return POPULAR_MEDICINE_SUBSTITUTES[8]; // Becosules
  }

  return null;
}
