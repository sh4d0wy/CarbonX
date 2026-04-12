import { NextResponse } from "next/server"
import { fromUrl } from "geotiff"
import proj4 from "proj4"

type NdviRequestBody = {
  latitude?: number
  longitude?: number
  date?: string
  windowDays?: number
  areaMeters?: number
  maxCloudCoverage?: number
}

type StacSearchFeature = {
  id?: string
  properties?: {
    datetime?: string
  }
  assets?: Record<string, { href?: string }>
}

type StacSearchResponse = {
  features?: StacSearchFeature[]
}

const EARTH_SEARCH_API_URL = "https://earth-search.aws.element84.com/v1/search"

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function getBboxFromPoint(latitude: number, longitude: number, areaMeters: number) {
  const metersPerDegreeLat = 111_320
  const latDelta = areaMeters / metersPerDegreeLat
  const cosLat = Math.cos((latitude * Math.PI) / 180)
  const metersPerDegreeLon = Math.max(1, metersPerDegreeLat * Math.abs(cosLat))
  const lonDelta = areaMeters / metersPerDegreeLon

  return [
    longitude - lonDelta,
    latitude - latDelta,
    longitude + lonDelta,
    latitude + latDelta,
  ]
}

function getPixelWindowFromArea(
  x: number,
  y: number,
  areaMeters: number,
  xResolutionMeters: number,
  yResolutionMeters: number,
  width: number,
  height: number
) {
  const pixelRadiusX = Math.max(1, Math.round(areaMeters / xResolutionMeters))
  const pixelRadiusY = Math.max(1, Math.round(areaMeters / yResolutionMeters))

  const xMin = Math.max(0, x - pixelRadiusX)
  const yMin = Math.max(0, y - pixelRadiusY)
  const xMax = Math.min(width, x + pixelRadiusX + 1)
  const yMax = Math.min(height, y + pixelRadiusY + 1)

  return [xMin, yMin, xMax, yMax] as [number, number, number, number]
}

function epsgToProj4Def(epsg: number) {
  if (epsg === 4326) return "EPSG:4326"

  if (epsg >= 32601 && epsg <= 32660) {
    const zone = epsg - 32600
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`
  }

  if (epsg >= 32701 && epsg <= 32760) {
    const zone = epsg - 32700
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`
  }

  return null
}

function transformPointToImageCrs(
  longitude: number,
  latitude: number,
  image: { getGeoKeys: () => Record<string, any> | null }
) {
  const geoKeys = image.getGeoKeys() || {}
  const projectedEpsg = Number(geoKeys.ProjectedCSTypeGeoKey)
  const geographicEpsg = Number(geoKeys.GeographicTypeGeoKey)
  const epsg = Number.isFinite(projectedEpsg) ? projectedEpsg : (Number.isFinite(geographicEpsg) ? geographicEpsg : 4326)

  if (epsg === 4326) {
    return { x: longitude, y: latitude, epsg }
  }

  const projectionDef = epsgToProj4Def(epsg)
  if (!projectionDef) {
    throw new Error(`Unsupported raster projection EPSG:${epsg}`)
  }

  const [x, y] = proj4("EPSG:4326", projectionDef, [longitude, latitude])
  return { x, y, epsg }
}

function classifyNdvi(ndvi: number) {
  if (ndvi < 0) return "No vegetation / water"
  if (ndvi < 0.2) return "Very sparse vegetation"
  if (ndvi < 0.4) return "Sparse vegetation"
  if (ndvi < 0.6) return "Moderate vegetation"
  return "Dense healthy vegetation"
}

function getAssetHref(feature: StacSearchFeature, candidates: string[]) {
  const assets = feature.assets || {}
  for (const key of candidates) {
    const href = assets[key]?.href
    if (href) return href
  }
  return null
}

async function getLatestSentinelItem(
  latitude: number,
  longitude: number,
  fromIso: string,
  toIso: string,
  maxCloudCoverage: number
) {
  const searchBody = {
    collections: ["sentinel-2-l2a"],
    limit: 1,
    intersects: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    datetime: `${fromIso}/${toIso}`,
    query: {
      "eo:cloud_cover": {
        lte: maxCloudCoverage,
      },
    },
    sortby: [{ field: "properties.datetime", direction: "desc" }],
  }

  const response = await fetch(EARTH_SEARCH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(searchBody),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to query Earth Search API")
  }

  const json = (await response.json()) as StacSearchResponse
  const feature = json.features?.[0]
  if (!feature) return null

  return feature
}

async function getBandWindowValues(
  bandUrl: string,
  latitude: number,
  longitude: number,
  areaMeters: number
) {
  const tiff = await fromUrl(bandUrl)
  const image = await tiff.getImage()

  const width = image.getWidth()
  const height = image.getHeight()
  const [minX, minY, maxX, maxY] = image.getBoundingBox()
  const xResUnits = (maxX - minX) / width
  const yResUnits = (maxY - minY) / height

  const transformedPoint = transformPointToImageCrs(longitude, latitude, image)
  const xCoord = transformedPoint.x
  const yCoord = transformedPoint.y

  const xPixel = Math.floor(((xCoord - minX) / (maxX - minX)) * width)
  const yPixel = Math.floor(((maxY - yCoord) / (maxY - minY)) * height)

  if (xPixel < 0 || yPixel < 0 || xPixel >= width || yPixel >= height) {
    throw new Error(
      `Requested point is outside raster bounds (EPSG:${transformedPoint.epsg})`
    )
  }

  const xResolutionMeters = transformedPoint.epsg === 4326
    ? Math.abs(xResUnits) * 111_320 * Math.cos((latitude * Math.PI) / 180)
    : Math.abs(xResUnits)
  const yResolutionMeters = transformedPoint.epsg === 4326
    ? Math.abs(yResUnits) * 111_320
    : Math.abs(yResUnits)

  const window = getPixelWindowFromArea(
    xPixel,
    yPixel,
    areaMeters,
    xResolutionMeters,
    yResolutionMeters,
    width,
    height
  )

  const noData = Number(image.getGDALNoData())
  const raster = await image.readRasters({
    samples: [0],
    window,
    interleave: true,
  })

  const values: number[] = []
  for (let i = 0; i < raster.length; i += 1) {
    const value = Number(raster[i])
    if (!Number.isFinite(value)) continue
    if (Number.isFinite(noData) && value === noData) continue
    if (value <= 0) continue
    values.push(value)
  }

  return values
}

function mean(values: number[]) {
  if (!values.length) return null
  const sum = values.reduce((acc, value) => acc + value, 0)
  return sum / values.length
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NdviRequestBody

    const latitude = body.latitude
    const longitude = body.longitude
    const windowDays = Number.isInteger(body.windowDays) ? Number(body.windowDays) : 7
    const areaMeters = Number.isInteger(body.areaMeters) ? Number(body.areaMeters) : 30
    const maxCloudCoverage = Number.isInteger(body.maxCloudCoverage) ? Number(body.maxCloudCoverage) : 30

    if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Invalid latitude. Expected number in range [-90, 90]." }, { status: 400 })
    }

    if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid longitude. Expected number in range [-180, 180]." }, { status: 400 })
    }

    if (windowDays < 1 || windowDays > 30) {
      return NextResponse.json({ error: "windowDays must be between 1 and 30." }, { status: 400 })
    }

    if (areaMeters < 10 || areaMeters > 200) {
      return NextResponse.json({ error: "areaMeters must be between 10 and 200." }, { status: 400 })
    }

    if (maxCloudCoverage < 0 || maxCloudCoverage > 100) {
      return NextResponse.json({ error: "maxCloudCoverage must be between 0 and 100." }, { status: 400 })
    }

    const parsedDate = body.date ? new Date(body.date) : new Date()
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date. Use ISO format, e.g. 2026-04-12." }, { status: 400 })
    }

    const toDate = parsedDate
    const fromDate = new Date(toDate)
    fromDate.setUTCDate(fromDate.getUTCDate() - windowDays)

    const feature = await getLatestSentinelItem(
      latitude,
      longitude,
      fromDate.toISOString(),
      toDate.toISOString(),
      maxCloudCoverage
    )

    if (!feature) {
      return NextResponse.json(
        {
          error: "No Sentinel-2 imagery found for this location/date range.",
        },
        { status: 404 }
      )
    }

    const redUrl = getAssetHref(feature, ["red", "B04"])
    const nirUrl = getAssetHref(feature, ["nir", "B08"])

    if (!redUrl || !nirUrl) {
      return NextResponse.json(
        {
          error: "Required Sentinel-2 bands not found in STAC item.",
        },
        { status: 502 }
      )
    }

    const [redValues, nirValues] = await Promise.all([
      getBandWindowValues(redUrl, latitude, longitude, areaMeters),
      getBandWindowValues(nirUrl, latitude, longitude, areaMeters),
    ])

    const sampleCount = Math.min(redValues.length, nirValues.length)
    if (!sampleCount) {
      return NextResponse.json(
        {
          error: "No valid pixels found at this location.",
        },
        { status: 404 }
      )
    }

    const ndviSamples: number[] = []
    for (let i = 0; i < sampleCount; i += 1) {
      const red = redValues[i]
      const nir = nirValues[i]
      const denominator = nir + red
      if (denominator <= 0) continue
      ndviSamples.push((nir - red) / denominator)
    }

    const ndvi = mean(ndviSamples)
    if (ndvi === null || !Number.isFinite(ndvi)) {
      return NextResponse.json(
        {
          error: "NDVI data unavailable for the provided location/date range.",
        },
        { status: 404 }
      )
    }

    const bbox = getBboxFromPoint(latitude, longitude, areaMeters)

    return NextResponse.json(
      {
        latitude,
        longitude,
        ndvi: Number(ndvi.toFixed(4)),
        interpretation: classifyNdvi(ndvi),
        sampleCount: ndviSamples.length,
        bbox,
        timeRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        source: {
          provider: "Earth Search (Element84)",
          collection: "sentinel-2-l2a",
          itemId: feature.id || null,
          acquisitionDate: feature.properties?.datetime || null,
        },
        areaMeters,
        maxCloudCoverage,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to calculate NDVI.",
        detail: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
