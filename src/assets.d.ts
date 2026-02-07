declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

export type AssetModule = string;

// Provide named exports from the assets barrel for TypeScript module resolution
declare module '../assets' {
  export const redorLogo: string;
  export const clinicLogo: string;
  export const clinicMap: string;
  export const xrayClinic: string;
}
