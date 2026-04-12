"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAccount, useReadContract } from "wagmi"
import { 
  useActiveListings,
  usePurchaseCarbonCredits,
  type ListingDetails,
  type LandDetails,
  formatEther,
  RegistrationStatus
} from "@/hooks/useContract"
import { contractAddress, contractABI } from "@/utils/contractDetails"
import { MapPin, Leaf, TrendingUp, ShoppingCart, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { type Address } from "viem"

type CarbonCreditListing = ListingDetails & {
  landDetails?: LandDetails
}

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const { data: activeListingIds, isLoading: isLoadingIds, error, refetch } = useActiveListings()
  const { purchaseCarbonCredits, isPending: isPurchasing } = usePurchaseCarbonCredits()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [listings, setListings] = useState<CarbonCreditListing[]>([])
  const [selectedListing, setSelectedListing] = useState<CarbonCreditListing | null>(null)
  const [purchaseAmount, setPurchaseAmount] = useState("1")
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!activeListingIds || (activeListingIds as bigint[]).length === 0) {
        setListings([])
        return
      }
      
      setIsLoadingDetails(true)
      const ids = activeListingIds as bigint[]
      const fetchedListings: CarbonCreditListing[] = []
      
      for (const id of ids) {
        try {
          const listingRes = await fetch(`/api/listing/${id}`)
          fetchedListings.push({
            id: Number(id),
            landId: BigInt(0),
            seller: '',
            creditsAvailable: BigInt(0),
            pricePerCredit: BigInt(0),
            active: true,
          })
        } catch (e) {
          console.error(e)
        }
      }
      
      setListings(fetchedListings)
      setIsLoadingDetails(false)
    }
    
    if (activeListingIds) {
      const ids = activeListingIds as bigint[]
      setListings(ids.map(id => ({
        id: Number(id),
        landId: BigInt(0),
        seller: '',
        creditsAvailable: BigInt(0),
        pricePerCredit: BigInt(0),
        active: true,
      })))
    }
  }, [activeListingIds])

  const handlePurchase = async () => {
    if (!selectedListing || !isConnected) return

    try {
      const credits = parseInt(purchaseAmount)
      const pricePerCredit = formatEther(selectedListing.pricePerCredit)
      const totalPrice = (parseFloat(pricePerCredit) * credits).toString()
      
      await purchaseCarbonCredits(selectedListing.id, credits, totalPrice)
      
      alert(`Successfully purchased ${credits} carbon credits!`)
      setSelectedListing(null)
      setPurchaseAmount("1")
      refetch()
    } catch (error: any) {
      alert(`Error: ${error.message || "Transaction failed"}`)
    }
  }

  const isLoading = isLoadingIds || isLoadingDetails
  const listingCount = (activeListingIds as bigint[])?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="border-b bg-background">
        <div className="container mx-auto py-16 px-4 max-w-6xl">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold tracking-tight text-balance">Decentralized Carbon Credit Marketplace</h1>
            <p className="text-xl text-muted-foreground text-balance">
              Trade verified carbon credits directly on-chain. Support global reforestation and conservation efforts.
            </p>
            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-secondary">{listingCount}</p>
                <p className="text-sm text-muted-foreground">Active Listings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto py-12 px-4 max-w-7xl">
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading listings...</span>
          </div>
        )}

        {!isLoading && listingCount === 0 && (
          <Card className="mb-8">
            <CardContent className="py-12">
              <div className="text-center space-y-2">
                <Leaf className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">No carbon credits available</p>
                <p className="text-muted-foreground">
                  Check back later or register your land to sell credits
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && listingCount > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(activeListingIds as bigint[]).map((id) => (
              <ListingCard key={Number(id)} listingId={Number(id)} currentAddress={address} />
            ))}
          </div>
        )}

        {!isConnected && (
          <Card className="mt-8">
            <CardContent className="py-8">
              <div className="text-center space-y-2">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">Connect your wallet to start trading</p>
                <p className="text-muted-foreground">Purchase carbon credits and support environmental conservation</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

function ListingCard({ listingId, currentAddress }: { listingId: number; currentAddress?: Address }) {
  const { data: listingData, isLoading: isLoadingListing } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: 'getListingDetails',
    args: [BigInt(listingId)],
  })

  const listing = listingData as [bigint, string, bigint, bigint, boolean] | undefined
  const landId = listing ? Number(listing[0]) : undefined

  const { data: landData, isLoading: isLoadingLand } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: 'getLandDetails',
    args: landId !== undefined ? [BigInt(landId)] : undefined,
    query: { enabled: landId !== undefined },
  })

  const land = landData as [string, bigint, string, string, string, bigint, bigint, number] | undefined

  const { purchaseCarbonCredits, isPending } = usePurchaseCarbonCredits()
  const [showDialog, setShowDialog] = useState(false)
  const [amount, setAmount] = useState("1")

  if (isLoadingListing || isLoadingLand) {
    return (
      <Card className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </Card>
    )
  }

  if (!listing || !listing[4]) return null

  const seller = listing[1]
  const creditsAvailable = listing[2]
  const pricePerCredit = listing[3]
  const location = land?.[2] || `Land #${landId}`
  const landArea = land ? Number(land[1]) : 0
  const description = land?.[3]

  const isOwnListing = currentAddress?.toLowerCase() === seller.toLowerCase()

  const handlePurchase = async () => {
    try {
      const credits = parseInt(amount)
      const totalPrice = (parseFloat(formatEther(pricePerCredit)) * credits).toString()
      await purchaseCarbonCredits(listingId, credits, totalPrice)
      alert(`Successfully purchased ${credits} credits!`)
      setShowDialog(false)
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  return (
    <>
      <Card className="flex flex-col hover:shadow-xl transition-all">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <Badge variant="secondary" className="gap-1 bg-accent text-accent-foreground">
              <Leaf className="h-3 w-3" />
              Verified
            </Badge>
            <span className="text-xs text-muted-foreground">#{listingId}</span>
          </div>
          <CardTitle className="text-xl">{location}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {landArea} hectares
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <span className="font-medium">{Number(creditsAvailable).toLocaleString()} CC</span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{parseFloat(formatEther(pricePerCredit)).toFixed(6)}</span>
              <span className="text-muted-foreground text-sm">ETH / credit</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Seller: {seller.slice(0, 6)}...{seller.slice(-4)}
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full gap-2"
            onClick={() => setShowDialog(true)}
            disabled={isOwnListing || !currentAddress}
          >
            <ShoppingCart className="h-4 w-4" />
            {isOwnListing ? "Your Listing" : "Buy Credits"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Carbon Credits</DialogTitle>
            <DialogDescription>Buy from {location}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Available</span>
                <span className="font-medium">{Number(creditsAvailable).toLocaleString()} CC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Price</span>
                <span className="font-medium">{parseFloat(formatEther(pricePerCredit)).toFixed(6)} ETH</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Credits to Purchase</Label>
              <Input
                type="number"
                min="1"
                max={Number(creditsAvailable)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="text-xl font-bold text-primary">
                  {(parseFloat(amount || "0") * parseFloat(formatEther(pricePerCredit))).toFixed(6)} ETH
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handlePurchase} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
