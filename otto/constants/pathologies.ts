import { PathologyOverlay, PathologyType, AssessmentCase } from "@/types";

export const PATHOLOGY_OVERLAYS: PathologyOverlay[] = [
  {
    id: "serous_effusion",
    label: "Serous Effusion",
    description:
      "Clear, straw-coloured fluid behind the TM. The membrane appears amber/yellow with visible air-fluid levels. Mobility is reduced on pneumatic otoscopy.",
    color: "rgba(218, 165, 32, 0.35)",
    opacity: 0.35,
    enabled: false,
  },
  {
    id: "mucoid_effusion",
    label: "Mucoid Effusion (Glue Ear)",
    description:
      "Thick, viscous fluid behind the TM giving a dull, opaque grey/blue appearance. The TM is retracted with prominent malleolar folds. Most common cause of conductive hearing loss in children.",
    color: "rgba(100, 120, 160, 0.4)",
    opacity: 0.4,
    enabled: false,
  },
  {
    id: "hemotympanum",
    label: "Hemotympanum",
    description:
      "Blood behind the TM appearing dark blue/purple. Often seen after temporal bone fracture or barotrauma. The TM itself is usually intact.",
    color: "rgba(120, 20, 40, 0.4)",
    opacity: 0.4,
    enabled: false,
  },
  {
    id: "acute_otitis_media",
    label: "Acute Otitis Media",
    description:
      "Bulging, erythematous TM with loss of normal landmarks. The membrane appears red and opaque with possible purulent effusion visible. Patient presents with otalgia and fever.",
    color: "rgba(220, 50, 50, 0.3)",
    opacity: 0.3,
    enabled: false,
  },
  {
    id: "tm_retraction",
    label: "TM Retraction",
    description:
      "The TM is drawn medially due to negative middle ear pressure. The malleus handle appears shortened and more horizontal. Retraction pockets may form, particularly in the pars flaccida.",
    color: "rgba(80, 80, 80, 0.2)",
    opacity: 0.2,
    enabled: false,
  },
  {
    id: "tm_bulging",
    label: "TM Bulging",
    description:
      "The TM is displaced laterally by positive pressure or fluid in the middle ear. Normal landmarks are obscured. Often seen with acute infection or effusion under tension.",
    color: "rgba(255, 180, 50, 0.25)",
    opacity: 0.25,
    enabled: false,
  },
];

export const PATHOLOGY_INFO: Record<
  PathologyType,
  { label: string; description: string }
> = {
  normal: {
    label: "Normal TM",
    description:
      "Pearly grey, translucent membrane with visible cone of light at 5 o'clock (right ear) or 7 o'clock (left ear). The malleus handle and umbo are clearly visible. The pars flaccida and pars tensa are intact.",
  },
  serous_effusion: {
    label: "Serous Effusion",
    description:
      "Clear fluid behind an intact TM. Air-fluid levels or bubbles may be visible. The TM has an amber discolouration.",
  },
  mucoid_effusion: {
    label: "Mucoid Effusion",
    description:
      "Thick glue-like fluid causing a dull, grey/blue TM. Retraction with prominent malleolar folds. Most common in children aged 2-7.",
  },
  hemotympanum: {
    label: "Hemotympanum",
    description:
      "Blood behind the TM. Dark blue/purple appearance. Associated with trauma, particularly temporal bone fractures.",
  },
  acute_otitis_media: {
    label: "Acute Otitis Media",
    description:
      "Bulging erythematous TM with purulent middle ear effusion. Loss of normal landmarks. Patient typically has otalgia, fever, and irritability.",
  },
  tm_retraction: {
    label: "TM Retraction",
    description:
      "Medial displacement of the TM from Eustachian tube dysfunction. Malleus handle appears foreshortened. Watch for retraction pockets.",
  },
  tm_bulging: {
    label: "TM Bulging",
    description:
      "Lateral displacement of the TM from positive middle ear pressure. Obscured landmarks. May indicate acute infection.",
  },
  tm_perforation: {
    label: "TM Perforation",
    description:
      "A defect or hole in the tympanic membrane. May be central or marginal. Middle ear mucosa may be visible through the perforation.",
  },
  cholesteatoma: {
    label: "Cholesteatoma",
    description:
      "Abnormal keratinising squamous epithelium in the middle ear. Appears as a white, pearly mass, often in the pars flaccida. Requires surgical management.",
  },
  tympanostomy_tube: {
    label: "Tympanostomy Tube",
    description:
      "A ventilation tube (grommet) placed through the TM. The flanges should be visible sitting flush with the membrane. Allows middle ear ventilation.",
  },
};

export const EFFUSION_COLORS: Record<string, string> = {
  serous: "rgba(218, 165, 32, 0.35)",
  mucoid: "rgba(100, 120, 160, 0.45)",
  hemotympanum: "rgba(120, 20, 40, 0.4)",
  glue: "rgba(140, 130, 80, 0.5)",
};

export const ASSESSMENT_CASES: AssessmentCase[] = [
  {
    id: "case_1",
    pathology: "normal",
    options: [
      { id: "normal", label: "Normal TM" },
      { id: "serous_effusion", label: "Serous Effusion" },
      { id: "tm_retraction", label: "TM Retraction" },
      { id: "acute_otitis_media", label: "Acute Otitis Media" },
    ],
    description: "Examine the tympanic membrane and select the most likely diagnosis.",
  },
  {
    id: "case_2",
    pathology: "serous_effusion",
    options: [
      { id: "normal", label: "Normal TM" },
      { id: "serous_effusion", label: "Serous Effusion" },
      { id: "mucoid_effusion", label: "Mucoid Effusion" },
      { id: "hemotympanum", label: "Hemotympanum" },
    ],
    description: "Note the colour and translucency of the membrane. Any fluid levels visible?",
  },
  {
    id: "case_3",
    pathology: "mucoid_effusion",
    options: [
      { id: "serous_effusion", label: "Serous Effusion" },
      { id: "mucoid_effusion", label: "Mucoid Effusion" },
      { id: "tm_retraction", label: "TM Retraction" },
      { id: "cholesteatoma", label: "Cholesteatoma" },
    ],
    description: "This child presents with hearing difficulties. What do you see?",
  },
  {
    id: "case_4",
    pathology: "acute_otitis_media",
    options: [
      { id: "acute_otitis_media", label: "Acute Otitis Media" },
      { id: "tm_bulging", label: "TM Bulging" },
      { id: "hemotympanum", label: "Hemotympanum" },
      { id: "normal", label: "Normal TM" },
    ],
    description: "The patient has ear pain and fever. Examine the TM.",
  },
  {
    id: "case_5",
    pathology: "hemotympanum",
    options: [
      { id: "acute_otitis_media", label: "Acute Otitis Media" },
      { id: "hemotympanum", label: "Hemotympanum" },
      { id: "mucoid_effusion", label: "Mucoid Effusion" },
      { id: "cholesteatoma", label: "Cholesteatoma" },
    ],
    description: "This patient presented after head trauma. What is the otoscopic finding?",
  },
  {
    id: "case_6",
    pathology: "tm_retraction",
    options: [
      { id: "normal", label: "Normal TM" },
      { id: "tm_retraction", label: "TM Retraction" },
      { id: "tm_perforation", label: "TM Perforation" },
      { id: "serous_effusion", label: "Serous Effusion" },
    ],
    description: "Note the position and shape of the malleus handle. What do you observe?",
  },
];
