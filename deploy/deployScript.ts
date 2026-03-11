import { readFileSync } from "fs";
import path from "path";
import { localnet } from "genlayer-js/chains";

export default async function main(client: any) {
  const filePath = path.resolve(process.cwd(), "contracts/jury_game.py");

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    await client.initializeConsensusSmartContract();

    const deployTransaction = await client.deployContract({
      code: contractCode,
      args: [],
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: deployTransaction,
      status: 5, // Status 5 is ACCEPTED in some versions, or we could pass "ACCEPTED" as any
      retries: 200,
    });

    if (
      receipt.status !== 5 &&
      receipt.status !== 6 &&
      receipt.statusName !== "ACCEPTED" &&
      receipt.statusName !== "FINALIZED"
    ) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }

    const deployedContractAddress =
      (client.chain as any).id === localnet.id
        ? receipt.data.contract_address
        : (receipt.txDataDecoded as any)?.contractAddress;

    console.log(`Contract deployed at address: ${deployedContractAddress}`);
  } catch (error) {
    throw new Error(`Error during deployment:, ${error}`);
  }
}
