/** Common dental and medical procedure codes for PA requests */
export interface ProcedureCode {
  code: string
  display: string
  system: string
  category: "dental" | "medical" | "imaging"
}

export const COMMON_PROCEDURES: ProcedureCode[] = [
  // Dental (CDT)
  { code: "D2740", display: "Crown — porcelain/ceramic substrate", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D2750", display: "Crown — porcelain fused to high noble metal", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D2751", display: "Crown — porcelain fused to predominantly base metal", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D6010", display: "Surgical placement of implant body — endosteal", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D6058", display: "Abutment supported porcelain/ceramic crown", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D6240", display: "Pontic — porcelain fused to high noble metal", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D7140", display: "Extraction, erupted tooth or exposed root", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D7210", display: "Extraction, surgical — erupted tooth", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D7240", display: "Extraction, impacted tooth — completely bony", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D7241", display: "Extraction, impacted tooth — completely bony with complications", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D8080", display: "Comprehensive orthodontic treatment — adolescent", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D8090", display: "Comprehensive orthodontic treatment — adult", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D9222", display: "Deep sedation/general anesthesia — first 15 min", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D9223", display: "Deep sedation/general anesthesia — each additional 15 min", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D4341", display: "Periodontal scaling and root planing — 4+ teeth per quadrant", system: "http://www.ada.org/cdt", category: "dental" },
  { code: "D4342", display: "Periodontal scaling and root planing — 1-3 teeth per quadrant", system: "http://www.ada.org/cdt", category: "dental" },

  // Medical (CPT)
  { code: "27447", display: "Total knee arthroplasty", system: "http://www.ama-assn.org/go/cpt", category: "medical" },
  { code: "27130", display: "Total hip arthroplasty", system: "http://www.ama-assn.org/go/cpt", category: "medical" },
  { code: "29881", display: "Arthroscopy, knee, surgical — with meniscectomy", system: "http://www.ama-assn.org/go/cpt", category: "medical" },
  { code: "99213", display: "Office visit — established patient, moderate complexity", system: "http://www.ama-assn.org/go/cpt", category: "medical" },
  { code: "99214", display: "Office visit — established patient, moderate-high complexity", system: "http://www.ama-assn.org/go/cpt", category: "medical" },

  // Imaging
  { code: "70553", display: "MRI brain with and without contrast", system: "http://www.ama-assn.org/go/cpt", category: "imaging" },
  { code: "72148", display: "MRI lumbar spine without contrast", system: "http://www.ama-assn.org/go/cpt", category: "imaging" },
  { code: "74177", display: "CT abdomen and pelvis with contrast", system: "http://www.ama-assn.org/go/cpt", category: "imaging" },
]
