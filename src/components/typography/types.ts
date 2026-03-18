type Category = "display" | "handwriting" | "monospace" | "serif" | "sans-serif";
type Weight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
type FileWeight = Weight | `${Weight}italic`;

export type LocalFont = {
  type: "local";
  category: Category;
  family: string;
  weights: Weight[];
};

export type WebFont = {
  type: "web";
  category: Category;
  family: string;
  weights: Weight[];
  preview: string;
  files: Record<FileWeight, string>;
};
