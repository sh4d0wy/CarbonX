"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useConnection, useReadContract } from "wagmi"
import { 
  useAdmin,
  useIsAgent,
  useNextLandId,
  useApproveLand,
  useRejectLand,
  useAddAgent,
  RegistrationStatus,
  type LandDetails
} from "@/hooks/useContract"
import { contractAddress, contractABI } from "@/utils/contractDetails"
import { FileText, MapPin, CheckCircle, XCircle, Loader2, Shield, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { type Address } from "viem"

export default function AgentPage() {
  const { address, isConnected } = useConnection()
  const { data: adminAddress } = useAdmin()
  const { data: isAgentData } = useIsAgent(address)
  const { data: nextLandId, refetch: refetchNextLandId } = useNextLandId()
  const { addAgent, isPending: isAddingAgent } = useAddAgent()
  
  const isAdmin = adminAddress && address 
    ? (adminAddress as string).toLowerCase() === address.toLowerCase() 
    : false
  const isAgent = isAgentData as boolean ?? false

  const [newAgentAddress, setNewAgentAddress] = useState("")
  const [selectedLandId, setSelectedLandId] = useState<number | null>(null)

  const handleAddAgent = async () => {
    if (!newAgentAddress) return
    try {
      await addAgent(newAgentAddress)
      alert("Agent added successfully!")
      setNewAgentAddress("")
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">Connect your wallet</p>
              <p className="text-muted-foreground">Only authorized agents can verify submissions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAgent && !isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-lg font-medium">Access Denied</p>
              <p className="text-muted-foreground">
                {formatAddress(address || "")} is not authorized
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalLands = nextLandId ? Number(nextLandId) - 1 : 0
  const landIds = Array.from({ length: totalLands }, (_, i) => i + 1)

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold tracking-tight">Agent Dashboard</h1>
          {isAdmin && <Badge className="bg-primary">Admin</Badge>}
          {isAgent && !isAdmin && <Badge variant="outline">Agent</Badge>}
        </div>
        <p className="text-muted-foreground text-lg">Review and approve land submissions</p>
      </div>

      {isAdmin && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Panel
            </CardTitle>
            <CardDescription>Manage agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Agent address (0x...)"
                value={newAgentAddress}
                onChange={(e) => setNewAgentAddress(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddAgent} disabled={isAddingAgent || !newAgentAddress}>
                {isAddingAgent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => refetchNextLandId()}>
            Refresh
          </Button>
        </div>

        <TabsContent value="pending">
          <LandGrid landIds={landIds} statusFilter={RegistrationStatus.Pending} onSelect={setSelectedLandId} />
        </TabsContent>

        <TabsContent value="approved">
          <LandGrid landIds={landIds} statusFilter={RegistrationStatus.Approved} />
        </TabsContent>

        <TabsContent value="rejected">
          <LandGrid landIds={landIds} statusFilter={RegistrationStatus.Rejected} />
        </TabsContent>
      </Tabs>

      {selectedLandId !== null && (
        <ReviewDialog landId={selectedLandId} onClose={() => setSelectedLandId(null)} />
      )}
    </div>
  )
}

function LandGrid({ 
  landIds, 
  statusFilter, 
  onSelect 
}: { 
  landIds: number[]
  statusFilter: number
  onSelect?: (id: number) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {landIds.map((id) => (
        <LandCard key={id} landId={id} statusFilter={statusFilter} onSelect={onSelect} />
      ))}
    </div>
  )
}

function LandCard({ 
  landId, 
  statusFilter,
  onSelect 
}: { 
  landId: number
  statusFilter: number
  onSelect?: (id: number) => void
}) {
  const { data: landData, isLoading } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: 'getLandDetails',
    args: [BigInt(landId)],
  })

  if (isLoading) return null

  const land = landData as [string, bigint, string, string, string, bigint, bigint, number] | undefined
  if (!land) return null

  const status = Number(land[7])
  if (status !== statusFilter) return null

  const owner = land[0]
  const landArea = Number(land[1])
  const location = land[2]
  const description = land[3]
  const imageHash = land[4]
  const carbonCredits = Number(land[5])

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const estimatedCredits = landArea * 15

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(landId)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{location}</CardTitle>
            <CardDescription>{formatAddress(owner)}</CardDescription>
          </div>
          {status === RegistrationStatus.Pending && <Badge variant="outline">New</Badge>}
          {status === RegistrationStatus.Approved && <Badge className="bg-accent text-accent-foreground">Approved</Badge>}
          {status === RegistrationStatus.Rejected && <Badge variant="destructive">Rejected</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{landArea} hectares</span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        {imageHash && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">IPFS: {imageHash.slice(0, 20)}...</span>
          </div>
        )}
        <div className="pt-2 border-t">
          {status === RegistrationStatus.Pending ? (
            <p className="text-sm font-medium">
              Est. Credits: <span className="text-primary">{estimatedCredits.toLocaleString()} CC</span>
            </p>
          ) : (
            <p className="text-sm font-medium">
              Credits: <span className="text-primary">{carbonCredits.toLocaleString()} CC</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewDialog({ landId, onClose }: { landId: number; onClose: () => void }) {
  const { data: landData, isLoading } = useReadContract({
    address: contractAddress as Address,
    abi: contractABI,
    functionName: 'getLandDetails',
    args: [BigInt(landId)],
  })

  const { approveLand, isPending: isApproving } = useApproveLand()
  const { rejectLand, isPending: isRejecting } = useRejectLand()
  
  const [carbonCredits, setCarbonCredits] = useState("")
  const [pricePerCredit, setPricePerCredit] = useState("")

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const land = landData as [string, bigint, string, string, string, bigint, bigint, number] | undefined
  if (!land) return null

  const owner = land[0]
  const landArea = Number(land[1])
  const location = land[2]
  const description = land[3]
  const imageHash = land[4]
  const estimatedCredits = landArea * 15

  const handleApprove = async () => {
    try {
      const credits = parseInt(carbonCredits)
      if (isNaN(credits) || credits <= 0) throw new Error("Invalid credits")
      if (!pricePerCredit || parseFloat(pricePerCredit) <= 0) throw new Error("Invalid price")
      
      await approveLand(landId, credits, pricePerCredit)
      alert(`Land #${landId} approved!\n\n✅ ${credits} carbon credits minted to landowner\n✅ Listing automatically created on marketplace at ${pricePerCredit} ETH per credit`)
      onClose()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  const handleReject = async () => {
    try {
      await rejectLand(landId)
      alert(`Land #${landId} rejected.`)
      onClose()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  const isProcessing = isApproving || isRejecting

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>Approve or reject this land registration</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Land ID</p>
              <p className="font-mono">#{landId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Owner</p>
              <p className="font-mono text-sm break-all">{owner}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Area</p>
              <p>{landArea} hectares</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p>{location}</p>
            </div>
          </div>

          {description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{description}</p>
            </div>
          )}

          {imageHash && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">IPFS Hash</p>
              <p className="font-mono text-xs bg-muted p-2 rounded break-all">{imageHash}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Approval Details</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Carbon Credits</Label>
                <Input
                  type="number"
                  placeholder={`Suggested: ${estimatedCredits}`}
                  value={carbonCredits}
                  onChange={(e) => setCarbonCredits(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">~{estimatedCredits} CC recommended</p>
              </div>
              <div className="space-y-2">
                <Label>Price per Credit (ETH)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="e.g., 0.01"
                  value={pricePerCredit}
                  onChange={(e) => setPricePerCredit(e.target.value)}
                />
              </div>
            </div>
          </div>

          {carbonCredits && pricePerCredit && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <p className="text-sm font-medium">Upon Approval:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ {parseInt(carbonCredits).toLocaleString()} credits minted to landowner</li>
                <li>✅ Listing auto-created at {pricePerCredit} ETH/credit</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            className="text-destructive"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isProcessing || !carbonCredits || !pricePerCredit}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Approve & Mint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
