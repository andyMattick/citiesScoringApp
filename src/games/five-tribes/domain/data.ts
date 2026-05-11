export interface Djinn {
  id: string;
  name: string;
  baseVp: number;
}

export const DJINNS: Djinn[] = [
  { id: 'al_amin',    name: 'Al-Amin',    baseVp: 5  },
  { id: 'anun_nak',   name: 'Anun-Nak',   baseVp: 8  },
  { id: 'baal',       name: "Ba'Al",      baseVp: 6  },
  { id: 'boaz',       name: 'Boaz',       baseVp: 6  },
  { id: 'bouraq',     name: 'Bouraq',     baseVp: 6  },
  { id: 'echidna',    name: 'Echidna',    baseVp: 4  },
  { id: 'enki',       name: 'Enki',       baseVp: 8  },
  { id: 'hagis',      name: 'Hagis',      baseVp: 10 },
  { id: 'haurvatat',  name: 'Haurvatat',  baseVp: 8  },
  { id: 'iamia',      name: 'Iamia',      baseVp: 10 },
  { id: 'ieta',       name: 'Ieta',       baseVp: 4  },
  { id: 'jbus',       name: 'Jbus',       baseVp: 8  },
  { id: 'jafaar',     name: 'Jafaar',     baseVp: 6  },
  { id: 'kandicha',   name: 'Kandicha',   baseVp: 6  },
  { id: 'kumarbi',    name: 'Kumarbi',    baseVp: 6  },
  { id: 'marid',      name: 'Marid',      baseVp: 6  },
  { id: 'monkir',     name: 'Monkir',     baseVp: 6  },
  { id: 'nekir',      name: 'Nekir',      baseVp: 6  },
  { id: 'shamhat',    name: 'Shamhat',    baseVp: 6  },
  { id: 'sibittis',   name: 'Sibittis',   baseVp: 4  },
  { id: 'sidar',      name: 'Sidar',      baseVp: 8  },
  { id: 'utug',       name: 'Utug',       baseVp: 4  },
];

export const DJINN_BY_ID: Record<string, Djinn> = Object.fromEntries(
  DJINNS.map((d) => [d.id, d])
);
