export type ImageInput = { base64: string; mime?: string };
export type Msg =
  | { type: 'text'; text: string }
  | { type: 'image_base64'; data: string; mime?: string };
