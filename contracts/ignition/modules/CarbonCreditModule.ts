import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CarbonCreditModule = buildModule("CarbonCreditModule", (m) => {
  const deployer = m.getAccount(0);
  const agent = m.getParameter("agent", deployer);

  const carbonCreditToken = m.contract("CarbonCreditToken");
  const carbonCredit = m.contract("CarbonCredit", [carbonCreditToken, agent]);

  // Allow CarbonCredit contract to mint approved credits to land owners.
  m.call(carbonCreditToken, "setMinter", [carbonCredit]);

  return {
    carbonCreditToken,
    carbonCredit,
  };
});

export default CarbonCreditModule;
