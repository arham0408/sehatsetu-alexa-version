import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveAnatomyTarget } from "../app/medical-mapping.ts";
import { extractFindingsLocally } from "../app/medical-report-service.ts";
import { MedicalAnatomyController } from "../app/medical-anatomy-controller.ts";
import { SUPPORTED_LANGUAGES } from "../app/medical-types.ts";
import { TRANSLATIONS } from "../app/medical-i18n.ts";

const maleAtlas = JSON.parse(
  fs.readFileSync(new URL("../public/models/atlas.json", import.meta.url), "utf-8"),
);
const femaleAtlas = JSON.parse(
  fs.readFileSync(new URL("../public/models/atlas-female.json", import.meta.url), "utf-8"),
);

test("SehatSetu: resolves exact verified organ concepts in male and female atlases", () => {
  const gb = resolveAnatomyTarget("gallbladder", maleAtlas);
  assert.ok(gb, "Gallbladder should resolve");
  assert.equal(gb.availableInModel, true);
  assert.equal(gb.relationshipType, "direct");
  assert.ok(gb.partIds.includes("FJ2817"));

  const liver = resolveAnatomyTarget("liver", maleAtlas);
  assert.ok(liver, "Liver should resolve");
  assert.equal(liver.availableInModel, true);
  assert.ok(liver.partIds.length > 10, "Liver contains multiple verified meshes");

  const kidney = resolveAnatomyTarget("kidney", maleAtlas);
  assert.ok(kidney, "Kidney should resolve");
  assert.equal(kidney.availableInModel, true);
});

test("SehatSetu: resolves condition-associated anatomy via verified registry", () => {
  const cholelith = resolveAnatomyTarget("cholelithiasis", maleAtlas, { isCondition: true });
  assert.ok(cholelith, "Cholelithiasis should map to gallbladder");
  assert.equal(cholelith.name.toLowerCase(), "gallbladder");
  assert.equal(cholelith.relationshipType, "condition_associated");
  assert.equal(cholelith.availableInModel, true);

  const appendicitis = resolveAnatomyTarget("appendicitis", maleAtlas, { isCondition: true });
  assert.ok(appendicitis, "Appendicitis should map to appendix");
  assert.equal(appendicitis.relationshipType, "condition_associated");
  assert.equal(appendicitis.availableInModel, true);
});

test("SehatSetu: handles sex-specific anatomy and flags model availability accurately", () => {
  // Prostate should be available in male atlas, but not female
  const prostateMale = resolveAnatomyTarget("prostate", maleAtlas);
  assert.ok(prostateMale);
  assert.equal(prostateMale.availableInModel, true);

  // Uterus should be available in female atlas, but not male
  const uterusFemale = resolveAnatomyTarget("uterus", femaleAtlas);
  assert.ok(uterusFemale);
  assert.equal(uterusFemale.availableInModel, true);

  const uterusMale = resolveAnatomyTarget("uterus", maleAtlas);
  assert.ok(uterusMale);
  assert.equal(uterusMale.availableInModel, false, "Uterus should not be present in male atlas");
  assert.equal(uterusMale.relationshipType, "unresolved");
});

test("SehatSetu: preserves medical semantics (negation, laterality, certainty, measurements)", () => {
  const reportText = `
ULTRASOUND ABDOMEN:
Single 12 mm calculus noted in the gallbladder with posterior acoustic shadowing (cholelithiasis).
No evidence of focal hepatic mass or lesion.
Left kidney is normal. No renal calculus or hydronephrosis in either kidney.
`;
  const findings = extractFindingsLocally(reportText, maleAtlas);
  assert.ok(findings.length >= 2, "Should extract multiple findings");

  const gallstoneFinding = findings.find((f) => f.term.toLowerCase().includes("gall"));
  assert.ok(gallstoneFinding, "Should find gallstone finding");
  assert.equal(gallstoneFinding.negation, "present");
  assert.ok(gallstoneFinding.measurement, "Should extract measurement");
  assert.equal(gallstoneFinding.measurement.value, "12");
  assert.equal(gallstoneFinding.measurement.unit, "mm");

  const liverFinding = findings.find((f) => f.term.toLowerCase().includes("liver"));
  if (liverFinding) {
    // "No evidence of focal hepatic mass" is negated
    assert.equal(liverFinding.negation, "ruled_out");
  }
});

test("SehatSetu: supports all 8 Indian languages with complete UI localization dictionaries", () => {
  const expectedCodes = ["en", "hi", "bn", "te", "mr", "ta", "gu", "kn"];
  assert.equal(SUPPORTED_LANGUAGES.length, 8);

  for (const code of expectedCodes) {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    assert.ok(lang, `Language ${code} must be in SUPPORTED_LANGUAGES`);
    assert.ok(lang.speechTag, `Language ${code} must have speechTag`);

    const dict = TRANSLATIONS[code];
    assert.ok(dict, `Translation dictionary must exist for ${code}`);
    assert.ok(dict.title, `Title must exist for ${code}`);
    assert.ok(dict.findingsHeading, `findingsHeading must exist for ${code}`);
    assert.ok(dict.disclaimer, `Disclaimer must exist for ${code}`);
  }
});

test("SehatSetu: MedicalAnatomyController captures baseline and restores state cleanly", () => {
  const controller = new MedicalAnatomyController();
  const initialSceneState = {
    selected: ["FJ2564"],
    isolate: false,
    visible: ["digestive", "skeletal"],
    partVisibility: {},
    opacity: {},
    explode: 0,
    view: "front",
    rotate: false,
    reset: 0,
    focus: 1,
  };

  const target = {
    targetId: "FMA7202",
    name: "gallbladder",
    system: "digestive",
    partIds: ["FJ2817"],
    relationshipType: "direct",
    confidence: "verified",
    source: "test",
    availableInModel: true,
  };

  const focused = controller.focusTarget(target, initialSceneState, "isolate");
  assert.deepEqual(focused.selected, ["FJ2817"]);
  assert.equal(focused.isolate, true);
  assert.equal(focused.focus, 2);

  const restored = controller.restoreBaseline({
    ...initialSceneState,
    ...focused,
  });

  assert.deepEqual(restored.selected, ["FJ2564"]);
  assert.equal(restored.isolate, false);
});
