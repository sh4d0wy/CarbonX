"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAccount } from "wagmi"
import { useActiveSales } from "@/hooks/useActiveSales"
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
import { formatEther, parseEther } from "viem"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const { activeSales, isLoading } = useActiveSales()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("newest")

  // Filter and sort sales
  const filteredSales = activeSales.filter((sale) => {
    if (!sale) return false
    const seller = String(sale.seller || "").toLowerCase()
    return seller.includes(searchTerm.toLowerCase())
  });

  const sortedSales = [...filteredSales].sort((a, b) => {
    if (!a || !b) return 0;
    if (sortBy === "price-low") {
      return Number(a.priceWei) - Number(b.priceWei);
    } else if (sortBy === "price-high") {
      return Number(b.priceWei) - Number(a.priceWei);
    }
    return b.saleId - a.saleId; // newest first
  }).filter((sale) => sale !== null) as Sale[];

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      <section className="border-b bg-background">
        <div className="container mx-auto py-16 px-4 max-w-6xl">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold tracking-tight text-balance">Decentralized Carbon Credit Marketplace</h1>
            <p className="text-xl text-muted-foreground text-balance">
              Trade verified carbon credits directly on-chain. Support global reforestation and conservation efforts.
            </p>
            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-secondary">{activeSales.length}</p>
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
              placeholder="Search by seller address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading listings...</span>
          </div>
        )}

        {!isLoading && activeSales.length === 0 && (
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

        {!isLoading && activeSales.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedSales.map((sale) => (
              <SaleCard 
                key={sale.saleId} 
                sale={sale} 
                currentAddress={address} 
                isConnected={isConnected}
              />
            ))}
          </div>
        )}

        {!isConnected && !isLoading && (
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

interface Sale {
  id: bigint;
  seller: string;
  tokenAmount: bigint;
  priceWei: bigint;
  isActive: boolean;
  saleId: number;
}

function SaleCard({ 
  sale, 
  currentAddress,
  isConnected
}: { 
  sale: Sale
  currentAddress?: Address
  isConnected: boolean
}) {
  const [showDialog, setShowDialog] = useState(false)
  const [amount, setAmount] = useState("1")
  const { writeContract, isPending } = useWriteContract()
  const { data: hash } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const availableCredits = Number(sale.tokenAmount)
  const pricePerCreditEth = formatEther(sale.priceWei)
  const isOwnListing = currentAddress?.toLowerCase() === sale.seller.toLowerCase()

  const handlePurchase = async () => {
    const creditsNum = parseInt(amount);
    if (isNaN(creditsNum) || creditsNum <= 0 || creditsNum > availableCredits) {
      alert("Invalid amount");
      return;
    }

    const totalPrice = (parseFloat(pricePerCreditEth) * creditsNum).toString();

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: contractABI,
      functionName: "buyCredits",
      args: [BigInt(sale.saleId)],
      value: parseEther(totalPrice),
    });
  };

  return (
    <>
      <Card className="flex flex-col hover:shadow-xl transition-all">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <Badge variant="secondary" className="gap-1 bg-accent text-accent-foreground">
              <Leaf className="h-3 w-3" />
              Sale #{sale.saleId}
            </Badge>
            {isOwnListing && <Badge>Your Listing</Badge>}
          </div>
          <CardTitle className="text-xl">Carbon Credits</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Seller: {sale.seller.slice(0, 6)}...{sale.seller.slice(-4)}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credits Available</span>
              <span className="font-medium">{availableCredits / 1000000000000000000} CC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token ID</span>
              <span className="font-mono text-xs">{sale.id.toString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={sale.isActive ? "default" : "secondary"}>
                {sale.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{parseFloat(pricePerCreditEth).toFixed(6)}</span>
              <span className="text-muted-foreground text-sm">ETH / credit</span>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full gap-2"
            onClick={() => setShowDialog(true)}
            disabled={isOwnListing || !isConnected || !sale.isActive}
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
            <DialogDescription>Sale #{sale.saleId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Available</span>
                <span className="font-medium">{(availableCredits / 1000000000000000000).toLocaleString()} CC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Price per Credit</span>
                <span className="font-medium">{parseFloat(pricePerCreditEth).toFixed(6)} ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Seller</span>
                <span className="font-mono text-xs">{sale.seller.slice(0, 6)}...{sale.seller.slice(-4)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Credits to Purchase</Label>
              <Input
                type="number"
                min="1"
                max={availableCredits}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-between">
                <span>Total Cost</span>
                <span className="text-xl font-bold text-primary">
                  {(parseFloat(amount || "0") * parseFloat(pricePerCreditEth)).toFixed(6)} ETH
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handlePurchase} disabled={isPending || isConfirming}>
              {isPending || isConfirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
