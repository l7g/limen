declare module "shapefile" {
  export function read(
    shp: string,
    dbf?: string,
  ): Promise<GeoJSON.FeatureCollection>;
}

declare module "mapshaper" {
  interface ApplyCommandsOutput {
    [filename: string]: Buffer | string;
  }
  function applyCommands(
    commands: string,
    input?: Record<string, unknown>,
  ): Promise<ApplyCommandsOutput>;
  export { applyCommands };
  const _default: { applyCommands: typeof applyCommands };
  export default _default;
}
