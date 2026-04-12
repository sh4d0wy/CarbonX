// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./CarbonCreditToken.sol";

/// @title CarbonCredit
/// @notice Registers land, calculates tokenized credits from NDVI, supports agent approval, and runs a token escrow marketplace.
contract CarbonCredit {
    uint256 private constant NDVI_BPS_SCALE = 10_000;

    enum ListingStatus {
        Pending,
        Approved,
        Rejected
    }

    struct LandEntry {
        uint256 id;
        int256 latitude;
        int256 longitude;
        uint256 radiusMeters;
        uint256 areaSqMeters;
        address owner;
        string documentIpfsHash;
        ListingStatus status;
        uint256 ndviBps;
        uint256 calculatedCredits;
        bool creditsCalculated;
        bool creditsMinted;
    }

    struct CreditSale {
        uint256 id;
        address seller;
        uint256 tokenAmount;
        uint256 priceWei;
        bool isActive;
    }

    CarbonCreditToken public immutable creditToken;
    address public owner;
    address public agent;

    uint256 public nextLandEntryId;
    uint256 public nextSaleId;

    bool private _locked;

    mapping(uint256 => LandEntry) public landEntries;
    mapping(uint256 => CreditSale) public sales;

    event AgentUpdated(address indexed oldAgent, address indexed newAgent);

    event LandRegistered(
        uint256 indexed entryId,
        address indexed landOwner,
        int256 latitude,
        int256 longitude,
        uint256 radiusMeters,
        uint256 areaSqMeters,
        string documentIpfsHash
    );

    event CreditsCalculated(uint256 indexed entryId, uint256 ndviBps, uint256 creditsToMint);
    event LandApproved(uint256 indexed entryId, address indexed owner, uint256 mintedAmount);
    event LandRejected(uint256 indexed entryId);

    event CreditsListed(uint256 indexed saleId, address indexed seller, uint256 tokenAmount, uint256 priceWei);
    event CreditsDelisted(uint256 indexed saleId);
    event CreditsPurchased(
        uint256 indexed saleId,
        address indexed buyer,
        address indexed seller,
        uint256 tokenAmount,
        uint256 priceWei
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "CarbonCredit: not owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "CarbonCredit: not agent");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "CarbonCredit: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address tokenAddress, address agentAddress) {
        require(tokenAddress != address(0), "CarbonCredit: token is zero");
        require(agentAddress != address(0), "CarbonCredit: agent is zero");

        owner = msg.sender;
        creditToken = CarbonCreditToken(tokenAddress);
        agent = agentAddress;
    }

    function setAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "CarbonCredit: agent is zero");
        emit AgentUpdated(agent, newAgent);
        agent = newAgent;
    }

    function registerLand(
        int256 latitude,
        int256 longitude,
        uint256 radiusMeters,
        uint256 areaSqMeters,
        address walletAddress,
        string calldata documentIpfsHash
    ) external returns (uint256 entryId) {
        require(areaSqMeters > 0, "CarbonCredit: area must be > 0");
        require(radiusMeters > 0, "CarbonCredit: radius must be > 0");
        require(walletAddress != address(0), "CarbonCredit: wallet is zero");
        require(bytes(documentIpfsHash).length > 0, "CarbonCredit: ipfs hash required");

        entryId = nextLandEntryId++;
        LandEntry storage entry = landEntries[entryId];
        entry.id = entryId;
        entry.latitude = latitude;
        entry.longitude = longitude;
        entry.radiusMeters = radiusMeters;
        entry.areaSqMeters = areaSqMeters;
        entry.owner = walletAddress;
        entry.documentIpfsHash = documentIpfsHash;
        entry.status = ListingStatus.Pending;

        emit LandRegistered(
            entryId,
            walletAddress,
            latitude,
            longitude,
            radiusMeters,
            areaSqMeters,
            documentIpfsHash
        );
    }

    /// @notice Calculates credits = area * ndvi * 10, where ndvi is provided in basis points (10000 = 1.0).
    function calculateCredits(uint256 entryId, uint256 ndviBps) external onlyAgent returns (uint256 creditsToMint) {
        LandEntry storage entry = landEntries[entryId];
        require(entry.owner != address(0), "CarbonCredit: entry not found");
        require(entry.status == ListingStatus.Pending, "CarbonCredit: entry not pending");
        require(!entry.creditsMinted, "CarbonCredit: already minted");
        require(ndviBps <= NDVI_BPS_SCALE, "CarbonCredit: ndvi above 1.0");

        // Convert whole-credit formula into 18-decimal token units.
        creditsToMint = (entry.areaSqMeters * ndviBps * 10 * 1e18) / NDVI_BPS_SCALE;
        require(creditsToMint > 0, "CarbonCredit: credits are zero");

        entry.ndviBps = ndviBps;
        entry.calculatedCredits = creditsToMint;
        entry.creditsCalculated = true;

        emit CreditsCalculated(entryId, ndviBps, creditsToMint);
    }

    function approveLand(uint256 entryId) external onlyAgent {
        LandEntry storage entry = landEntries[entryId];
        require(entry.owner != address(0), "CarbonCredit: entry not found");
        require(entry.status == ListingStatus.Pending, "CarbonCredit: entry not pending");
        require(entry.creditsCalculated, "CarbonCredit: credits not calculated");
        require(!entry.creditsMinted, "CarbonCredit: already minted");

        entry.status = ListingStatus.Approved;
        entry.creditsMinted = true;

        bool minted = creditToken.mint(entry.owner, entry.calculatedCredits);
        require(minted, "CarbonCredit: mint failed");

        emit LandApproved(entryId, entry.owner, entry.calculatedCredits);
    }

    function rejectLand(uint256 entryId) external onlyAgent {
        LandEntry storage entry = landEntries[entryId];
        require(entry.owner != address(0), "CarbonCredit: entry not found");
        require(entry.status == ListingStatus.Pending, "CarbonCredit: entry not pending");

        entry.status = ListingStatus.Rejected;
        emit LandRejected(entryId);
    }

    /// @notice Seller escrows tokenAmount in this contract until purchase or cancel.
    function listCreditsForSale(uint256 tokenAmount, uint256 priceWei)
        external
        nonReentrant
        returns (uint256 saleId)
    {
        require(tokenAmount > 0, "CarbonCredit: token amount is zero");
        require(priceWei > 0, "CarbonCredit: price is zero");

        bool transferred = creditToken.transferFrom(msg.sender, address(this), tokenAmount);
        require(transferred, "CarbonCredit: escrow transfer failed");

        saleId = nextSaleId++;
        sales[saleId] = CreditSale({
            id: saleId,
            seller: msg.sender,
            tokenAmount: tokenAmount,
            priceWei: priceWei,
            isActive: true
        });

        emit CreditsListed(saleId, msg.sender, tokenAmount, priceWei);
    }

    function cancelSale(uint256 saleId) external nonReentrant {
        CreditSale storage sale = sales[saleId];
        require(sale.isActive, "CarbonCredit: sale inactive");
        require(sale.seller == msg.sender, "CarbonCredit: not seller");

        sale.isActive = false;

        bool returned = creditToken.transfer(sale.seller, sale.tokenAmount);
        require(returned, "CarbonCredit: return transfer failed");

        emit CreditsDelisted(saleId);
    }

    /// @notice Buyer pays ETH; seller receives ETH; buyer receives escrowed credits.
    function buyCredits(uint256 saleId) external payable nonReentrant {
        CreditSale storage sale = sales[saleId];
        require(sale.isActive, "CarbonCredit: sale inactive");
        require(msg.value == sale.priceWei, "CarbonCredit: wrong ETH amount");

        sale.isActive = false;

        (bool paidSeller,) = payable(sale.seller).call{value: msg.value}("");
        require(paidSeller, "CarbonCredit: seller payment failed");

        bool delivered = creditToken.transfer(msg.sender, sale.tokenAmount);
        require(delivered, "CarbonCredit: token delivery failed");

        emit CreditsPurchased(saleId, msg.sender, sale.seller, sale.tokenAmount, sale.priceWei);
    }
}