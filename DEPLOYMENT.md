# Contract Deployment Record

## Sepolia Testnet Deployment

### Deployment Date: April 17, 2026

**CarbonCreditToken (ERC20)**
- Address: `0x...` (to be filled)
- Deployer: (your address)
- Transaction: (tx hash)

**CarbonCredit**
- Address: `0x...` (to be filled)
- Deployer: (your address)
- Token Address: `0x...`
- Agent Address: `0x...`
- Transaction: (tx hash)

### Key Changes in This Version
- ✅ Added `landId` to `CreditSale` struct
- ✅ Latitude/longitude scaled by 1,000,000 for precision
- ✅ `listCreditsForSale()` now requires `landId` as first parameter
- ✅ Land owner validation in `listCreditsForSale()`

### Test Results
- [ ] registerLand() works
- [ ] calculateCredits() works
- [ ] approveLand() works
- [ ] listCreditsForSale() with landId works
- [ ] Frontend integration complete

### Frontend Updates
After deployment, update these files with new addresses:
1. `/utils/contractDetails.ts` - Update `contractAddress`
2. Re-export ABI from Remix artifacts

### Testing Checklist
- [ ] Land registration with scaled coordinates
- [ ] Agent approval workflow
- [ ] Token minting on approval
- [ ] Credit listing with landId
- [ ] Cancel sale functionality
- [ ] Buy credits functionality
