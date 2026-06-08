export type Tea = {
  id: string;
  name: string;
  hanzi: string;
  region: string;
  province: string;
  type: string;
  famousArea: string;
  process: string[];
  brands: {
    name: string;
    url: string;
  }[];
  brew: {
    temperature: string;
    time: string;
    ratio: string;
    tips: string;
  };
  notes: string[];
  summary: string;
};
