import type { FontDefaults, FontFamily, FontStyle } from "./fonts.ts";

export const pageSize = {
  /**US-Letter: 8.5in x 11.0in (816px x 1056px) */
  US_Letter: {
    width: 816,
    height: 1056,
    description: "US-Letter: 8.5in x 11.0in (816px x 1056px)",
  },
  US_Legal: {
    width: 816,
    height: 1344,
    description: "US-Legal: 8.5in x 14.0in (816px x 1344px)",
  },
  US_Executive: {
    width: 696,
    height: 1008,
    description: "US-Executive: 7.25in x 10.5in (696px x 1008px)",
  },
  US_Ledger: {
    width: 1632,
    height: 1056,
    description: "US-Ledger: 17.0in x 11.0in (1632px x 1056px)",
  },
  US_Tabloid: {
    width: 1056,
    height: 1632,
    description: "US-Tabloid: 11.0in x 17.0in (1056px x 1632px)",
  },
  US_Government: {
    width: 768,
    height: 1056,
    description: "US-Government: 8.0in x 11.0in (768px x 1056px)",
  },
  US_Statement: {
    width: 528,
    height: 816,
    description: "US-Statement: 5.5in x 8.5in (528px x 816px)",
  },
  US_Folio: {
    width: 816,
    height: 1248,
    description: "US-Folio: 8.5in x 13.0in (816px x 1248px)",
  },
  A0: {
    width: 3179,
    height: 4494,
    description: "A0: 841mm x 1189mm (3179px x 4494px)",
  },
  A1: {
    width: 2245,
    height: 3179,
    description: "A1: 594mm x 841mm (2245px x 3179px)",
  },
  A2: {
    width: 1587,
    height: 2245,
    description: "A2: 420mm x 594mm (1587px x 2245px)",
  },
  A3: {
    width: 1123,
    height: 1587,
    description: "A3: 297mm x 420mm (1123px x 1587px)",
  },
  A4: {
    width: 794,
    height: 1123,
    description: "A4: 210mm x 297mm (794px x 1123px)",
  },
  A5: {
    width: 559,
    height: 794,
    description: "A5: 148mm x 210mm (559px x 794px)",
  },
  A6: {
    width: 397,
    height: 559,
    description: "A6: 105mm x 148mm (397px x 559px)",
  },
  A7: {
    width: 280,
    height: 397,
    description: "A7: 74mm x 105mm (280px x 397px)",
  },
  A8: {
    width: 197,
    height: 280,
    description: "A8: 52mm x 74mm (197px x 280px)",
  },
  A9: {
    width: 140,
    height: 197,
    description: "A9: 37mm x 52mm (140px x 197px)",
  },
  A10: {
    width: 98,
    height: 140,
    description: "A10: 26mm x 37mm (98px x 140px)",
  },
  B0: {
    width: 3780,
    height: 5344,
    description: "B0: 1000mm x 1414mm (3780px x 5344px)",
  },
  B1: {
    width: 2672,
    height: 3780,
    description: "B1: 707mm x 1000mm (2672px x 3780px)",
  },
  B2: {
    width: 1890,
    height: 2672,
    description: "B2: 500mm x 707mm (1890px x 2672px)",
  },
  B3: {
    width: 1334,
    height: 1890,
    description: "B3: 353mm x 500mm (1334px x 1890px)",
  },
  B4: {
    width: 945,
    height: 1334,
    description: "B4: 250mm x 353mm (945px x 1334px)",
  },
  B5: {
    width: 665,
    height: 945,
    description: "B5: 176mm x 250mm (665px x 945px)",
  },
  B6: {
    width: 472,
    height: 665,
    description: "B6: 125mm x 176mm (472px x 665px)",
  },
  B7: {
    width: 333,
    height: 472,
    description: "B7: 88mm x 125mm (333px x 472px)",
  },
  B8: {
    width: 234,
    height: 333,
    description: "B8: 62mm x 88mm (234px x 333px)",
  },
  B9: {
    width: 166,
    height: 234,
    description: "B9: 44mm x 62mm (166px x 234px)",
  },
  B10: {
    width: 117,
    height: 166,
    description: "B10: 31mm x 44mm (117px x 166px)",
  },
  C0: {
    width: 3466,
    height: 4902,
    description: "C0: 917mm x 1297mm (3466px x 4902px)",
  },
  C1: {
    width: 2449,
    height: 3466,
    description: "C1: 648mm x 917mm (2449px x 3466px)",
  },
  C2: {
    width: 1731,
    height: 2449,
    description: "C2: 458mm x 648mm (1731px x 2449px)",
  },
  C3: {
    width: 1225,
    height: 1731,
    description: "C3: 324mm x 458mm (1225px x 1731px)",
  },
  C4: {
    width: 866,
    height: 1225,
    description: "C4: 229mm x 324mm (866px x 1225px)",
  },
  C5: {
    width: 612,
    height: 866,
    description: "C5: 162mm x 229mm (612px x 866px)",
  },
  C6: {
    width: 431,
    height: 612,
    description: "C6: 114mm x 162mm (431px x 612px)",
  },
  C7: {
    width: 306,
    height: 431,
    description: "C7: 81mm x 114mm (306px x 431px)",
  },
  C8: {
    width: 215,
    height: 306,
    description: "C8: 57mm x 81mm (215px x 306px)",
  },
  C9: {
    width: 151,
    height: 215,
    description: "C9: 40mm x 57mm (151px x 215px)",
  },
  C10: {
    width: 106,
    height: 151,
    description: "C10: 28mm x 40mm (106px x 151px)",
  },
  id_1: {
    width: 324,
    height: 204,
    description: "id-1: 85.60mm x 53.98mm (324px x 204px)",
  },
  id_2: {
    width: 397,
    height: 280,
    description: "id-2: 105.0mm x 74.0mm (397px x 280px)",
  },
  id_3: {
    width: 472,
    height: 0,
    description: "id-3: 125.0mm x 88.0mm (472px x 0px)",
  },
  ansi_a: {
    width: 816,
    height: 1056,
    description: "ansi-a: 8.5in x 11.0in (816px x 1056px)",
  },
  ansi_b: {
    width: 1056,
    height: 1632,
    description: "ansi-b: 11.0in x 17.0in (1056px x 1632px)",
  },
  ansi_c: {
    width: 1632,
    height: 2112,
    description: "ansi-c: 17.0in x 22.0in (1632px x 2112px)",
  },
  ansi_d: {
    width: 2112,
    height: 3264,
    description: "ansi-d: 22.0in x 34.0in (2112px x 3264px)",
  },
  ansi_e: {
    width: 3264,
    height: 4224,
    description: "ansi-e: 34.0in x 44.0in (3264px x 4224px)",
  },
  arch_a: {
    width: 864,
    height: 1152,
    description: "arch-a: 9.0in x 12.0in (864px x 1152px)",
  },
  arch_b: {
    width: 1152,
    height: 1728,
    description: "arch-b: 12.0in x 18.0in (1152px x 1728px)",
  },
  arch_c: {
    width: 1728,
    height: 2304,
    description: "arch-c: 18.0in x 24.0in (1728px x 2304px)",
  },
  arch_d: {
    width: 2304,
    height: 3456,
    description: "arch-d: 24.0in x 36.0in (2304px x 3456px)",
  },
  arch_e1: {
    width: 2880,
    height: 4032,
    description: "arch-e1: 30.0in x 42.0in (2880px x 4032px)",
  },
  arch_e: {
    width: 3456,
    height: 4608,
    description: "arch-e: 36.0in x 48.0in (3456px x 4608px)",
  },
  imperial_folio: {
    width: 1440,
    height: 2112,
    description: "imperial-folio: 15.0in x 22.0in (1440px x 2112px)",
  },
  imperial_quarto: {
    width: 1056,
    height: 1440,
    description: "imperial-quarto: 11.0in x 15.0in (1056px x 1440px)",
  },
  imperial_octavo: {
    width: 720,
    height: 1056,
    description: "imperial-octavo: 7.5in x 11.0in (720px x 1056px)",
  },
  royal_folio: {
    width: 1200,
    height: 1920,
    description: "royal-folio: 12.5in x 20.0in (1200px x 1920px)",
  },
  royal_quarto: {
    width: 960,
    height: 1200,
    description: "royal-quarto: 10.0in x 12.5in (960px x 1200px)",
  },
  royal_octavo: {
    width: 600,
    height: 960,
    description: "royal-octavo: 6.25in x 10.0in (600px x 960px)",
  },
  crown_folio: {
    width: 960,
    height: 1440,
    description: "crown-folio: 10.0in x 15.0in (960px x 1440px)",
  },
  crown_quarto: {
    width: 720,
    height: 960,
    description: "crown-quarto: 7.5in x 10.0in (720px x 960px)",
  },
  crown_octavo: {
    width: 480,
    height: 720,
    description: "crown-octavo: 5.0in x 7.5in (480px x 720px)",
  },
  foolscap_folio: {
    width: 816,
    height: 1296,
    description: "foolscap-folio: 8.5in x 13.5in (816px x 1296px)",
  },
  foolscap_quarto: {
    width: 648,
    height: 816,
    description: "foolscap-quarto: 6.75in x 8.5in (648px x 816px)",
  },
  foolscap_octavo: {
    width: 408,
    height: 648,
    description: "foolscap-octavo: 4.25in x 6.75in (408px x 648px)",
  },
  medium_quarto: {
    width: 864,
    height: 1104,
    description: "medium-quarto: 9.0in x 11.5in (864px x 1104px)",
  },
  demy_quarto: {
    width: 840,
    height: 1080,
    description: "demy-quarto: 8.75in x 11.25in (840px x 1080px)",
  },
  demy_octavo: {
    width: 540,
    height: 840,
    description: "demy-octavo: 5.625in x 8.75in (540px x 840px)",
  },
} as const;

export interface PagesConfig {
  /**
   * Page Size
   * @default "A4"
   *
   * pageSize options:
   * - US_Letter (8.5in x 11.0in)
   * - US_Executive (7.25in x 10.5in)
   * - US_Ledger (17.0in x 11.0in)
   * - US_Tabloid (11.0in x 17.0in)
   * - US_Government (8.0in x 11.0in)
   * - US_Statement (5.5in x 8.5in)
   * - US_Folio (8.5in x 13.0in)
   * - A0 (841mm x 1189mm)
   * - A1 (594mm x 841mm)
   * - A2 (420mm x 594mm)
   * - A3 (297mm x 420mm)
   * - A4 (210mm x 297mm)
   * - A5 (148mm x 210mm)
   * - A6 (105mm x 148mm)
   * - A7 (74mm x 105mm)
   * - A8 (52mm x 74mm)
   * - A9 (37mm x 52mm)
   * - A10 (26mm x 37mm)
   * - B0 (1000mm x 1414mm)
   * - B1 (707mm x 1000mm)
   * - B2 (500mm x 707mm)
   * - B3 (353mm x 500mm)
   * - B4 (250mm x 353mm)
   * - B5 (176mm x 250mm)
   * - B6 (125mm x 176mm)
   * - B7 (88mm x 125mm)
   * - B8 (62mm x 88mm)
   * - B9 (44mm x 62mm)
   * - B10 (31mm x 44mm)
   * - C0 (917mm x 1297mm)
   * - C1 (648mm x 917mm)
   * - C2 (458mm x 648mm)
   * - C3 (324mm x 458mm)
   * - C4 (229mm x 324mm)
   * - C5 (162mm x 229mm)
   * - C6 (114mm x 162mm)
   * - C7 (81mm x 114mm)
   * - C8 (57mm x 81mm)
   * - C9 (40mm x 57mm)
   * - C10 (28mm x 40mm)
   * - id_1 (85.60mm x 53.98mm)
   * - id_2 (105.0mm x 74.0mm)
   * - id_3 (125.0mm x 88.0mm)
   * - ansi_a (8.5in x 11.0in)
   * - ansi_b (11.0in x 17.0in)
   * - ansi_c (17.0in x 22.0in)
   * - ansi_d (22.0in x 34.0in)
   * - ansi_e (34.0in x 44.0in)
   * - arch_a (9.0in x 12.0in)
   * - arch_b (12.0in x 18.0in)
   * - arch_c (18.0in x 24.0in)
   * - arch_d (24.0in x 36.0in)
   * - arch_e1 (30.0in x 42.0in)
   * - arch_e (36.0in x 48.0in)
   * - imperial_folio (15.0in x 22.0in)
   * - imperial_quarto (11.0in x 15.0in)
   * - imperial_octavo (7.5in x 11.0in)
   * - royal_folio (12.5in x 20.0in)
   * - royal_quarto (10.0in x 12.5in)
   * - royal_octavo (6.25in x 10.0in)
   * - crown_folio (10.0in x 15.0in)
   * - crown_quarto (7.5in x 10.0in)
   * - crown_octavo (5.0in x 7.5in)
   * - foolscap_folio (8.5in x 13.5in)
   * - foolscap_quarto (6.75in x 8.5in)
   * - foolscap_octavo (4.25in x 6.75in)
   * - medium_quarto (9.0in x 11.5in)
   * - demy_quarto (8.75in x 11.25in)
   * - demy_octavo (5.625in x 8.75in)
   */
  pageSize?: PageSize;
  /**
   * Page Orientation
   * @default "portrait"
   * Options: "portrait" | "landscape"
   * - portrait: height is greater than width
   * - landscape: width is greater than height
   */
  orientation?: "portrait" | "landscape";

  fontDefaults?: FontDefaults;
}

export type PageSize = keyof typeof pageSize;
