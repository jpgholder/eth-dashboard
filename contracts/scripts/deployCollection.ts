import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("Collection");
  const contract = await factory.deploy(
    "a",
    "a",
    1,
    5,
    1000000000000,
    "ipfs://test"
  );
  await contract.deployed();
  console.log(contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
