"use client"

import { useEffect } from "react"
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"

type Region = {
  lat: number
  lng: number
  radius: number
}

type LandRegionMapProps = {
  center: [number, number]
  zoom: number
  region: Region | null
  onMapClick: (lat: number, lng: number) => void
}

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom, { animate: true })
  }, [center, map, zoom])

  return null
}

function ClickToSelect({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

export function LandRegionMap({ center, zoom, region, onMapClick }: LandRegionMapProps) {
  return (
    <div className="overflow-hidden rounded-md border">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "340px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={center} zoom={zoom} />
        <ClickToSelect onMapClick={onMapClick} />

        {region ? (
          <>
            <CircleMarker
              center={[region.lat, region.lng]}
              radius={7}
              pathOptions={{ color: "#14532d", fillColor: "#22c55e", fillOpacity: 1, weight: 2 }}
            />
            <Circle
              center={[region.lat, region.lng]}
              radius={region.radius}
              pathOptions={{ color: "#1f8a53", fillColor: "#1f8a53", fillOpacity: 0.25 }}
            />
          </>
        ) : null}
      </MapContainer>
    </div>
  )
}
