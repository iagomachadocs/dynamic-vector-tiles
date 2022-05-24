import * as db from './database.js'

const table = {
  name: 'massa_dagua_ana',
  attrColumns: 'esp_cd as id, cod_sar',
  geometryColumn: 'geom',
  srid: 4326
}

export class VectorTilesController {
  async handle(req, res) {
    const { tile } = req

    const envelope = tileToEnvelope(tile)

    const queryString = envelopeToSQL(envelope, table)

    const pbf = (await db.query(queryString)).rows[0].mvt

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Content-type', 'application/vnd.mapbox-vector-tile')

    return res.send(pbf)
  }
}

/**
 * Calculate envelope in "Spherical Mercator" (https://epsg.io/3857)
 * @param tile Object with tile coordinates, format and zoom level
 */
function tileToEnvelope(tile) {
  // Width of world in EPSG:3857
  const worldMercMax = 20037508.3427892
  const worldMercMin = -1 * worldMercMax
  const worldMercSize = worldMercMax - worldMercMin

  // Width in tiles
  const worldTileSize = 2 ** tile.zoom
  // Tile width in EPSG:3857
  const tileMercSize = worldMercSize / worldTileSize
  // Calculate geographic bounds from tile coordinates
  // XYZ tile coordinates are in "image space" so origin is
  // top-left, not bottom right
  const envelope = {
    xmin: worldMercMin + tileMercSize * tile.x,
    xmax: worldMercMin + tileMercSize * (tile.x + 1),
    ymin: worldMercMax - tileMercSize * (tile.y + 1),
    ymax: worldMercMax - tileMercSize * tile.y
  }
  return envelope
}

/**
 * Generate SQL to materialize a query envelope in EPSG:3857.
 * Densify the edges a little so the envelope can be safely converted to other coordinate systems.
 */
function envelopeToBoundsSQL(envelope) {
  const DENSIFY_FACTOR = 4
  const segSize = (envelope.xmax - envelope.xmin)/DENSIFY_FACTOR
  return `ST_Segmentize(ST_MakeEnvelope(${envelope.xmin}, ${envelope.ymin}, ${envelope.xmax}, ${envelope.ymax}, 3857),${segSize})`
}

/**
 * Generate a SQL query to pull a tile worth of MVT data
 * from the table of interest.
 */
function envelopeToSQL(envelope, table) {
  const envelopeBoundsSql = envelopeToBoundsSQL(envelope)
  const sqlQuery = `
    WITH
      bounds AS (
        SELECT 
          ${envelopeBoundsSql} AS geom,
          ${envelopeBoundsSql}::box2d AS b2d
      ),
      mvtgeom AS (
        SELECT 
          ST_AsMVTGeom(ST_Transform(t.${table.geometryColumn}, 3857), bounds.b2d) AS geom,
          ${table.attrColumns}
        FROM ${table.name} t, bounds
        WHERE ST_Intersects(t.${table.geometryColumn}, ST_Transform(bounds.geom, ${table.srid}))
      )
      SELECT ST_AsMVT(mvtgeom.*) as mvt FROM mvtgeom
  `
  return sqlQuery
}