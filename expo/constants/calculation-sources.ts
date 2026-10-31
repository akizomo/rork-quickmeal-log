/**
 * 計算の根拠と出典 (App Store Guideline 1.4.1 対応, 2026-10-31)。
 *
 * `utils/goals.ts` の計算式と 1対1 で対応させる。式や係数を変えたら、
 * ここの出典と `locales/*.json` の `sources.sections.*.body` も同じ変更で直すこと。
 * 文献名は言語に依らないので、ここに原語のまま持つ (説明文だけ i18n)。
 */
export interface CalculationReference {
  /** 一覧の主見出し (著者・年など短く) */
  title: string;
  /** 掲載誌・発行元などの書誌情報 */
  detail: string;
  /** 外部リンク。教科書など URL が無いものは省略 */
  url?: string;
}

export type CalculationSectionKey = 'rmr' | 'tdee' | 'pace' | 'pfc' | 'activity' | 'bodyfat' | 'bmi' | 'food';

export interface CalculationSection {
  key: CalculationSectionKey;
  refs: CalculationReference[];
}

export const CALCULATION_SECTIONS: CalculationSection[] = [
  {
    // calcRMR / recommendGoal (Katch-McArdle 分岐)
    key: 'rmr',
    refs: [
      {
        title: 'Mifflin MD, et al. (1990)',
        detail: 'A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 51(2):241–247',
        url: 'https://doi.org/10.1093/ajcn/51.2.241',
      },
      {
        title: 'McArdle WD, Katch FI, Katch VL',
        detail: 'Exercise Physiology: Nutrition, Energy, and Human Performance. Lippincott Williams & Wilkins (Katch-McArdle equation)',
      },
    ],
  },
  {
    // ACTIVITY_LEVEL_OPTIONS.factor
    key: 'tdee',
    refs: [
      {
        title: 'FAO/WHO/UNU (2004)',
        detail: 'Human energy requirements. Report of a Joint FAO/WHO/UNU Expert Consultation',
        url: 'https://www.fao.org/4/y5686e/y5686e00.htm',
      },
      {
        title: '厚生労働省 (2025)',
        detail: '日本人の食事摂取基準（2025年版） エネルギー・身体活動レベル',
        url: 'https://www.mhlw.go.jp/stf/newpage_44138.html',
      },
    ],
  },
  {
    // computePlanOutcome / computeKcalDelta (PACE_OPTIONS) / recommendGoal の minKcal / CARRYOVER_HARD_FLOOR_KCAL
    key: 'pace',
    refs: [
      {
        title: 'Wishnofsky M. (1958)',
        detail: 'Caloric equivalents of gained or lost weight. Am J Clin Nutr. 6(5):542–546',
        url: 'https://doi.org/10.1093/ajcn/6.5.542',
      },
      {
        title: 'Hall KD. (2008)',
        detail: 'What is the required energy deficit per unit weight loss? Int J Obes. 32(3):573–576',
        url: 'https://doi.org/10.1038/sj.ijo.0803720',
      },
      {
        title: 'Helms ER, Aragon AA, Fitschen PJ. (2014)',
        detail: 'Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr. 11:20',
        url: 'https://doi.org/10.1186/1550-2783-11-20',
      },
      {
        title: 'Iraki J, et al. (2019)',
        detail: 'Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review. Sports. 7(7):154',
        url: 'https://doi.org/10.3390/sports7070154',
      },
      {
        title: 'NHLBI (1998)',
        detail: 'Clinical Guidelines on the Identification, Evaluation, and Treatment of Overweight and Obesity in Adults',
        url: 'https://www.ncbi.nlm.nih.gov/books/NBK2003/',
      },
    ],
  },
  {
    // computePfc / getAdjustedPfcForDate
    key: 'pfc',
    refs: [
      {
        title: 'Jäger R, et al. ISSN Position Stand (2017)',
        detail: 'Protein and exercise. J Int Soc Sports Nutr. 14:20',
        url: 'https://doi.org/10.1186/s12970-017-0177-8',
      },
      {
        title: '厚生労働省 (2025)',
        detail: '日本人の食事摂取基準（2025年版）',
        url: 'https://www.mhlw.go.jp/stf/newpage_44138.html',
      },
      {
        title: 'FAO (2003)',
        detail: 'Food energy – methods of analysis and conversion factors. FAO Food and Nutrition Paper 77',
        url: 'https://www.fao.org/4/y5022e/y5022e00.htm',
      },
    ],
  },
  {
    // EXERCISE_TYPES.met (2024 Compendium の値) / KCAL_PER_STEP_PER_KG / calcBaselineActiveKcal (TEF_FRACTION) / calcGoalAdditionKcal
    key: 'activity',
    refs: [
      {
        title: 'Herrmann SD, et al. (2024)',
        detail: '2024 Adult Compendium of Physical Activities: A third update of the energy costs of human activities. J Sport Health Sci. 13(1):6–12',
        url: 'https://doi.org/10.1016/j.jshs.2023.10.010',
      },
      {
        title: 'Adult Compendium of Physical Activities',
        detail: 'MET values (walking 17160, jogging 12020, bicycling 01010, resistance training 02054, yoga 02150, swimming 18310, HIIT 02210)',
        url: 'https://pacompendium.com/',
      },
      {
        title: 'Tudor-Locke C, et al. (2019)',
        detail: 'Walking cadence (steps/min) and intensity in 21–40 year olds: CADENCE-adults. Int J Behav Nutr Phys Act. 16:8',
        url: 'https://doi.org/10.1186/s12966-019-0769-6',
      },
      {
        title: 'Westerterp KR. (2004)',
        detail: 'Diet induced thermogenesis. Nutr Metab (Lond). 1:5',
        url: 'https://doi.org/10.1186/1743-7075-1-5',
      },
    ],
  },
  {
    // projectFatMassAtWeight (Forbes の式)、BF_*_PCT、constants/body-matrix.ts
    key: 'bodyfat',
    refs: [
      {
        title: 'Forbes GB. (2000)',
        detail: 'Body fat content influences the body composition response to nutrition and exercise. Ann N Y Acad Sci. 904:359–365',
        url: 'https://doi.org/10.1111/j.1749-6632.2000.tb06482.x',
      },
      {
        title: 'Hall KD. (2007)',
        detail: "Body fat and fat-free mass inter-relationships: Forbes's theory revisited. Br J Nutr. 97(6):1059–1063",
        url: 'https://doi.org/10.1017/S0007114507691946',
      },
      {
        title: 'American Council on Exercise',
        detail: 'ACE Personal Trainer Manual – body fat % classification (essential fat: men 2–5%, women 10–13%; obese: men 25%+, women 32%+)',
      },
      {
        title: 'Gallagher D, et al. (2000)',
        detail: 'Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr. 72(3):694–701',
        url: 'https://doi.org/10.1093/ajcn/72.3.694',
      },
    ],
  },
  {
    // BMI_UNDERWEIGHT / BMI_OVERWEIGHT (BMI_HARD_FLOOR はアプリ独自の安全線)
    key: 'bmi',
    refs: [
      {
        title: 'World Health Organization',
        detail: 'Obesity and overweight (fact sheet)',
        url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight',
      },
    ],
  },
  {
    // constants/reference/seibun-2023.json ほか食品DB
    key: 'food',
    refs: [
      {
        title: '文部科学省',
        detail: '日本食品標準成分表（八訂）増補2023年',
        url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html',
      },
      {
        title: 'USDA',
        detail: 'FoodData Central',
        url: 'https://fdc.nal.usda.gov/',
      },
    ],
  },
];
