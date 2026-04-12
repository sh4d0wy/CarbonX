"use client"

import type React from "react"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAccount, useReadContract } from "wagmi"
import { 
  useLandsByOwner,
  useListCarbonCredits,
  RegistrationStatus,
  formatEther
} from "@/hooks/useContract"
import { contractAddress, contractABI } from "@/utils/contractDetails"
import { Upload, FileText, CheckCircle2, Clock, XCircle, Loader2, Leaf, DollarSign, Coins } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { type Address } from "viem"

const LandRegionMap = dynamic(
  () => import("@/components/land-region-map").then((module) => module.LandRegionMap),
  { ssr: false }
)

type SelectedRegion = {
  lat: number
  lng: number
  radius: number
}

type SearchResult = {
  displayName: string
  lat: number
  lng: number
}

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    street?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
  }
}

function normalizeQuery(input: string) {
  return input
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function buildPhotonLabel(feature: PhotonFeature) {
  const props = feature.properties
  if (!props) return ""

  return [props.name, props.street, props.city, props.state, props.postcode, props.country]
    .filter(Boolean)
    .join(", ")
}

function dedupeSearchResults(items: SearchResult[]) {
  const seen = new Set<string>()
  const unique: SearchResult[] = []

  for (const item of items) {
    const key = `${item.displayName.toLowerCase()}|${item.lat.toFixed(6)}|${item.lng.toFixed(6)}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }

  return unique
}

export default function LandownerPage() {
  const { address, isConnected } = useAccount()
  const { data: landIds, isLoading: isLoadingLands, refetch } = useLandsByOwner(address)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [landArea, setLandArea] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [imageHash, setImageHash] = useState("")
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629])
  const [mapZoom, setMapZoom] = useState(5)
  const [mapRadius, setMapRadius] = useState(500)
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [skipNextSearch, setSkipNextSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [locationSearchMessage, setLocationSearchMessage] = useState("")

  useEffect(() => {
    if (!selectedRegion) return

    console.log("Selected region", {
      lat: selectedRegion.lat,
      lng: selectedRegion.lng,
      radius: selectedRegion.radius,
    })
  }, [selectedRegion])

  useEffect(() => {
    const searchText = location.trim()

    if (skipNextSearch) {
      setSkipNextSearch(false)
      return
    }

    if (searchText.length < 3) {
      setSearchResults([])
      setIsSearchingLocation(false)
      setLocationSearchMessage("")
      return
    }

    const controller = new AbortController()
    const debounceId = window.setTimeout(async () => {
      setIsSearchingLocation(true)
      setLocationSearchMessage("")

      try {
        const query = normalizeQuery(searchText)
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=1&dedupe=0&q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            headers: {
              "Accept-Language": "en",
            },
          }
        )

        if (!nominatimResponse.ok) {
          throw new Error("Failed to fetch location coordinates")
        }

        const nominatimData = (await nominatimResponse.json()) as NominatimResult[]

        const nominatimResults = nominatimData
          .map((item) => {
            const lat = Number.parseFloat(item.lat)
            const lng = Number.parseFloat(item.lon)

            if (Number.isNaN(lat) || Number.isNaN(lng)) return null

            return {
              displayName: item.display_name,
              lat,
              lng,
            }
          })
          .filter((item): item is SearchResult => item !== null)

        let combinedResults = [...nominatimResults]

        // Fallback provider helps when Nominatim misses very specific local addresses.
        if (combinedResults.length < 3) {
          const photonResponse = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=8`,
            { signal: controller.signal }
          )

          if (photonResponse.ok) {
            const photonJson = (await photonResponse.json()) as { features?: PhotonFeature[] }
            const photonResults = (photonJson.features || [])
              .map((feature) => {
                const coords = feature.geometry?.coordinates
                const label = buildPhotonLabel(feature)
                if (!coords || coords.length < 2 || !label) return null

                const lng = Number(coords[0])
                const lat = Number(coords[1])
                if (Number.isNaN(lat) || Number.isNaN(lng)) return null

                return {
                  displayName: label,
                  lat,
                  lng,
                }
              })
              .filter((item): item is SearchResult => item !== null)

            combinedResults = [...combinedResults, ...photonResults]
          }
        }

        const uniqueResults = dedupeSearchResults(combinedResults).slice(0, 8)
        setSearchResults(uniqueResults)

        if (!uniqueResults.length) {
          setLocationSearchMessage("No exact match found. Try adding city/state or clicking the map manually.")
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setSearchResults([])
          setLocationSearchMessage("Unable to search right now. Please try again or select from the map.")
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingLocation(false)
        }
      }
    }, 350)

    return () => {
      window.clearTimeout(debounceId)
      controller.abort()
    }
  }, [location, skipNextSearch])

  const handleSearchResultSelect = (result: SearchResult) => {
    setSkipNextSearch(true)
    setLocation(result.displayName)
    setSearchResults([])
    setLocationSearchMessage("")
    setMapCenter([result.lat, result.lng])
    setMapZoom(17)
    setSelectedRegion({ lat: result.lat, lng: result.lng, radius: mapRadius })
  }

  const handleMapClick = (lat: number, lng: number) => {
    setMapCenter([lat, lng])
    setMapZoom(17)
    setSelectedRegion({ lat, lng, radius: mapRadius })
  }

  const handleRadiusChange = (value: string) => {
    const parsedRadius = Number.parseInt(value, 10)
    if (Number.isNaN(parsedRadius) || parsedRadius <= 0) return

    setMapRadius(parsedRadius)
    setSelectedRegion((currentRegion) => {
      if (!currentRegion) return null
      return { ...currentRegion, radius: parsedRadius }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    try {
      const landAreaNum = parseInt(landArea)
      if (isNaN(landAreaNum) || landAreaNum <= 0) {
        throw new Error("Invalid land area")
      }

      const region = selectedRegion || { lat: mapCenter[0], lng: mapCenter[1], radius: mapRadius }
      setIsSubmitting(true)

      const ndviResponse = await fetch("/api/ndvi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: region.lat,
          longitude: region.lng,
          areaMeters: region.radius,
          date: new Date().toISOString().split("T")[0],
        }),
      })

      const ndviPayload = await ndviResponse.json()
      if (!ndviResponse.ok) {
        throw new Error(ndviPayload?.error || "NDVI API request failed")
      }

      console.log("NDVI API response", ndviPayload)
      console.log("Form submission payload", {
        landArea: landAreaNum,
        location,
        description,
        imageHash,
        selectedRegion: region,
      })

      alert("Submitted. Check browser console for NDVI API response.")
      setLandArea("")
      setLocation("")
      setDescription("")
      setImageHash("")
    } catch (error: any) {
      alert(`Error: ${error.message || "Submission failed"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const ids = (landIds as bigint[]) || []

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Landowner Portal</h1>
        <p className="text-muted-foreground text-lg">
          Register your land and list carbon credits for sale
        </p>
      </div>

      {!isConnected ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <Leaf className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">Connect your wallet to access the portal</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Register New Land</CardTitle>
              <CardDescription>Submit for agent verification</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="landArea">Land Area (hectares)</Label>
                  <Input
                    id="landArea"
                    type="number"
                    placeholder="e.g., 50"
                    value={landArea}
                    onChange={(e) => setLandArea(e.target.value)}
                    required
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Type a full address, locality, or landmark"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                  {isSearchingLocation ? (
                    <p className="text-xs text-muted-foreground">Searching matching addresses...</p>
                  ) : null}
                  {searchResults.length > 0 ? (
                    <div className="space-y-2 rounded-md border bg-muted/40 p-2">
                      <p className="text-xs font-medium text-muted-foreground">Select a matching address</p>
                      <div className="max-h-36 space-y-1 overflow-y-auto">
                        {searchResults.map((result, index) => (
                          <Button
                            key={`${result.lat}-${result.lng}-${index}`}
                            type="button"
                            variant="ghost"
                            className="h-auto w-full justify-start whitespace-normal px-2 py-1 text-left text-xs"
                            onClick={() => handleSearchResultSelect(result)}
                          >
                            {result.displayName}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {!isSearchingLocation && locationSearchMessage ? (
                    <p className="text-xs text-amber-700">{locationSearchMessage}</p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="radius">Region Radius (meters)</Label>
                    <span className="text-sm text-muted-foreground">{mapRadius} m</span>
                  </div>
                  <Input
                    id="radius"
                    type="number"
                    min="1"
                    value={mapRadius}
                    onChange={(e) => handleRadiusChange(e.target.value)}
                  />
                  <LandRegionMap center={mapCenter} zoom={mapZoom} region={selectedRegion} onMapClick={handleMapClick} />
                  <p className="text-xs text-muted-foreground">
                    Click the map to select the center of your region. Latitude, longitude, and radius are logged to the browser console.
                  </p>
                  {selectedRegion ? (
                    <p className="text-xs text-primary">
                      Selected: {selectedRegion.lat.toFixed(6)}, {selectedRegion.lng.toFixed(6)} | radius {selectedRegion.radius} m
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your land..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageHash">IPFS Hash (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="imageHash"
                      placeholder="IPFS hash for documents"
                      value={imageHash}
                      onChange={(e) => setImageHash(e.target.value)}
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit and Log NDVI"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Lands</h2>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoadingLands}>
                {isLoadingLands ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            {isLoadingLands ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </CardContent>
              </Card>
            ) : ids.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No lands registered yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ids.map((id) => (
                  <LandCard key={Number(id)} landId={Number(id)} ownerAddress={address!} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LandCard({ landId, ownerAddress }: { landId: number; ownerAddress: Address }) {
  const { data: landData, isLoading } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: 'getLandDetails',
    args: [BigInt(landId)],
  })

  const { data: userBalance } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: 'getCarbonCreditsBalance',
    args: [ownerAddress, BigInt(landId)],
  })

  const { listCarbonCredits, isPending: isListing } = useListCarbonCredits()
  const [showDialog, setShowDialog] = useState(false)
  const [credits, setCredits] = useState("")
  const [price, setPrice] = useState("")

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const land = landData as [string, bigint, string, string, string, bigint, bigint, number] | undefined
  if (!land) return null

  const status = Number(land[7])
  const location = land[2]
  const landArea = Number(land[1])
  const description = land[3]
  const carbonCredits = land[5]
  const pricePerCredit = land[6]
  const imageHashValue = land[4]
  const balance = userBalance ? Number(userBalance) : 0

  const handleList = async () => {
    try {
      const creditsNum = parseInt(credits)
      if (creditsNum > balance) throw new Error("Insufficient credits")
      await listCarbonCredits(landId, creditsNum, price)
      alert("Listing created!")
      setShowDialog(false)
      setCredits("")
      setPrice("")
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case RegistrationStatus.Approved: return <CheckCircle2 className="h-5 w-5 text-accent" />
      case RegistrationStatus.Pending: return <Clock className="h-5 w-5 text-muted-foreground" />
      case RegistrationStatus.Rejected: return <XCircle className="h-5 w-5 text-destructive" />
      default: return null
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case RegistrationStatus.Approved: return <Badge className="bg-accent text-accent-foreground">Approved</Badge>
      case RegistrationStatus.Pending: return <Badge variant="outline">Pending</Badge>
      case RegistrationStatus.Rejected: return <Badge variant="destructive">Rejected</Badge>
      default: return null
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <div>
                <h3 className="font-semibold">{location}</h3>
                <p className="text-sm text-muted-foreground">{landArea} ha • #{landId}</p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
          )}

          {status === RegistrationStatus.Approved && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Allocated</span>
                <span>{Number(carbonCredits).toLocaleString()} CC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  Your Balance
                </span>
                <span className="font-medium text-primary">{balance.toLocaleString()} CC</span>
              </div>
              {Number(pricePerCredit) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Suggested Price</span>
                  <span>{formatEther(pricePerCredit)} ETH</span>
                </div>
              )}
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  ✅ Auto-listed on marketplace when approved
                </p>
                {balance > 0 && (
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => setShowDialog(true)}>
                    <DollarSign className="h-4 w-4" />
                    Create Additional Listing
                  </Button>
                )}
              </div>
            </div>
          )}

          {status === RegistrationStatus.Pending && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-center text-muted-foreground">⏳ Awaiting verification</p>
            </div>
          )}

          {status === RegistrationStatus.Rejected && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-center text-destructive">❌ Rejected</p>
            </div>
          )}

          {imageHashValue && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="truncate">IPFS: {imageHashValue}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Additional Listing</DialogTitle>
            <DialogDescription>
              Create a new listing for {location}. Your credits were auto-listed when approved, but you can create additional listings at different prices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Available</span>
                <span className="font-medium text-primary">{balance} CC</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Credits to List</Label>
              <Input
                type="number"
                min="1"
                max={balance}
                placeholder={`Max: ${balance}`}
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Price per Credit (ETH)</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="e.g., 0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            {credits && price && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex justify-between">
                  <span>Potential Revenue</span>
                  <span className="font-bold text-primary">
                    {(parseFloat(credits) * parseFloat(price)).toFixed(6)} ETH
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleList} disabled={isListing || !credits || !price}>
              {isListing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
