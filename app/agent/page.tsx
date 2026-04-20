"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAccount } from "wagmi"
import { 
  useAdmin,
  useIsAgent,
  useNextLandId,
  useAgentLandDetails,
  useApproveLand,
  useRejectLand,
  useAddAgent,
  RegistrationStatus,
} from "@/hooks/useAgent"
import { FileText, MapPin, CheckCircle, XCircle, Loader2, Shield, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function AgentPage() {
  const { address, isConnected } = useAccount()
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

  const totalLands = nextLandId ? Number(nextLandId) : 0
  const landIds = Array.from({ length: totalLands }, (_, i) => i)

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

      {isAdmin && !isAgent && (
        <Card className="mb-8 border-amber-200 bg-amber-50/50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-900">
              You are the contract owner, but not the active agent. You can manage agent address, but approvals/rejections are disabled until this wallet is set as agent.
            </p>
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
          <LandGrid
            landIds={landIds}
            statusFilter={RegistrationStatus.Pending}
            onSelect={isAgent ? setSelectedLandId : undefined}
          />
        </TabsContent>

        <TabsContent value="approved">
          <LandGrid landIds={landIds} statusFilter={RegistrationStatus.Approved} />
        </TabsContent>

        <TabsContent value="rejected">
          <LandGrid landIds={landIds} statusFilter={RegistrationStatus.Rejected} />
        </TabsContent>
      </Tabs>

      {selectedLandId !== null && isAgent && (
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
  const { data: land, isLoading } = useAgentLandDetails(landId)

  if (isLoading) return null
  if (!land) return null

  const status = Number(land.status)
  if (status !== statusFilter) return null

  const owner = land.owner
  const landArea = Number(land.landArea)
  const location = land.location
  const description = land.description
  const imageHash = land.imageHash
  const carbonCredits = Number(land.carbonCredits) / 1e18

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
  const { data: land, isLoading } = useAgentLandDetails(landId)

  const { approveLand, isPending: isApproving } = useApproveLand()
  const { rejectLand, isPending: isRejecting } = useRejectLand()
  
  const [ndviBps, setNdviBps] = useState("5000")

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

  if (!land) return null

  const owner = land.owner
  const landArea = Number(land.landArea)
  const location = land.location
  const description = land.description
  const imageHash = land.imageHash

  const handleApprove = async () => {
    try {
      const ndvi = parseInt(ndviBps)
      if (isNaN(ndvi) || ndvi < 0 || ndvi > 10000) throw new Error("NDVI must be between 0 and 10000")
      
      await approveLand(landId, ndvi)
      alert(`Land #${landId} approved!\n\n✅ Credits calculated and minted to landowner.`)
      onClose()
    } catch (e: any) {
      const message =
        e?.shortMessage ||
        e?.cause?.shortMessage ||
        e?.message ||
        "Approval failed"
      alert(`Error: ${message}`)
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
            <div className="grid gap-4 sm:grid-cols-1">
              <div className="space-y-2">
                <Label>NDVI (basis points)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  placeholder="e.g., 5000"
                  value={ndviBps}
                  onChange={(e) => setNdviBps(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">0 = 0.0, 10000 = 1.0</p>
              </div>
            </div>
          </div>

          {ndviBps && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <p className="text-sm font-medium">Upon Approval:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Credits will be calculated using NDVI {ndviBps} bps</li>
                <li>✅ Tokens will be minted to landowner</li>
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
            disabled={isProcessing || !ndviBps}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Calculate & Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
